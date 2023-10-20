/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {ExecutionError, Logger, Provider, ValidateError, _} from '../../common/index.js';
import Pipeline from './Pipeline.js';
import PipelineNode from './PipelineNode.js';
import StepDecorators from './decorators/StepDecorators.js';
import Steps from './Steps.js';

// Static constant for Step Status
const STATUS = {
  // Step is ready to start.
  'ready': 'ready',
  // Step is in progress
  'running': 'running',
  // Step has failed
  'failed': 'failed',
  // Step has succeeded
  'successful': 'successful',
  // Step has been skipped
  'skipped': 'skipped',
};


/**
 * @namespace Step
 */
export default class Step extends PipelineNode {
  constructor(definition, parentItem) {
    super(definition, parentItem);
    this.type = 'Step';
    this.originalDefinition = _.cloneDeep(definition);
    this.modifyDefinition();
    this.validateDefinition();
    this.status = Step.STATUS.ready;
  }

  /**
   * @function module:engine.Step#getStatus
   * @description Returns the status of the Step.
   * @returns {string} The status of the Step.
   */
  getStatus() {
    return this.status;
  }

  /**
   * @function module:engine.Step#setStatus
   * @description Sets the status of the Step.
   * @param {string} status - The status of the Step.
   */
  setStatus(status) {
    if (!_.includes(_.keys(Step.STATUS), status)) {
      throw new ExecutionError(`'${status}' is not a valid status for a Step.`);
    }
    Logger.silly(`Changing ${this.getName()} status to '${status}'.`, this.getPipeline().getId());
    this.status = status;
  }

  /**
   * @function module:engine.Step#start
   * @description Starts a step.
   * @async
   */
  async start() {
    // Substitute $$ for for-each and loop
    if (!_.isNil(this.definition['loop']) && String(this.definition['loop']).includes('$$')) {
      this.definition['loop'] = this.getEnvironment().replace$$Values(this.definition['loop']);
      if (this.definition['loop'].includes('$$')) {
        Logger.debug(`Step ${this.definition.name} has un-substituted loop, skipping...`, this.getPipeline().getId());
        return;
      }
    }
    if (!_.isNil(this.definition['for-each']) && String(this.definition['for-each']).includes('$$')) {
      this.definition['for-each'] = this.getEnvironment().replace$$Values(this.definition['for-each']);
      if (this.definition['for-each'].includes('$$')) {
        Logger.debug(`Step ${this.definition.name} has un-substituted for-each, skipping...`, this.getPipeline().getId());
        return;
      }
    }

    if (!_.isNil(this.definition['loop']) || !_.isNil(this.definition['for-each']) ) {
      await this.loopingStart();
    } else {
      await this.regularStart();
    }
  }

  /**
   * @function module.engine.Steps#regularStart
   * @description Transforms step into a steps for looping
   * @async
   */
  async regularStart() {
    Logger.debug(`Preparing step ${this.definition.name}`, this.getPipeline().getId());
    if (this.definition.name.includes('.')) {
      Logger.warn(`Step name '${this.definition.name}' contains the period (.) character which can interfere with hostname lookups.`, this.getPipeline().getId());
    }

    while (this.getPipeline().getStatus() === Pipeline.STATUS.paused) {
      Logger.info('Pipeline is paused, waiting for status to change...', this.getPipeline().getId());
      await this.getPipeline().awaitStatusChange();
    }

    let promiseProvider = Provider.fromFunction(async () => {
      await this.getExec().runStep(_.cloneDeep(this.definition));
    });

    try {
      StepDecorators.map((decorator) => {
        promiseProvider = decorator(this.definition, this, promiseProvider);
      });
      if (this.status === Step.STATUS.skipped) { // allow for skipped runs to remain so
        Logger.info(`Skipping step ${this.definition.name}`, this.getPipeline().getId());
      } else {
        Logger.info(`Starting step ${this.definition.name}`, this.getPipeline().getId());
        this.setStatus(Step.STATUS.running);
        await promiseProvider.get();
        Logger.info(`Successfully completed step ${this.definition.name}`, this.getPipeline().getId());
        this.setStatus(Step.STATUS.successful);
      }
    } catch (error) {
      Logger.warn(`Failed while executing step ${this.definition.name}`, this.getPipeline().getId());
      this.setStatus(Step.STATUS.failed);
      _.each(this.getPipeline().getRemainingSteps(), (step) => { // set all remaining steps to `skipped` if a step fails
        if (step.getStatus() === Step.STATUS.ready) {
          step.setStatus(Step.STATUS.skipped);
        }
      });
      throw error;
    } finally {
      // pause on the execution of the next step
      if (this.getPipeline().getBreakpoint() == this.definition.name) {
        Logger.info(`Pausing pipeline after running step ${this.definition.name}.`, this.getPipeline().getId());
        this.getPipeline().pause();
      }
    }
  }


  /**
   * @function module.engine.Steps#loopingStart
   * @description Transforms step into a steps for looping
   * @async
   */
  async loopingStart() {
    const isLoop = !_.isNil(this.definition['loop']);
    const isForEach = !_.isNil(this.definition['for-each']);

    if ( isLoop && isForEach ) {
      throw new ValidateError('Cannot use both for-each and loop within the same step.');
    }
    let loopCount = 0;
    let listOfElements = [];
    let counterVariableName;
    let elementVariableName;

    if (isLoop) {
      // traditional loop with or without counter
      loopCount = _.toInteger(this.definition.loop);
    } else {
      // for-each style loop with element variable
      if (_.isArray(this.definition['for-each'])) {
        listOfElements = this.definition['for-each'];
      } else if (this.definition['for-each'].includes(',')) {
        listOfElements = this.definition['for-each'].split(',');
      } else if (!_.isEmpty(this.definition['for-each'])) {
        // single element list, convert to array
        listOfElements = [this.definition['for-each']];
      } else {
        // empty element list, return
        return;
      }
      // remove empty elements
      listOfElements = listOfElements.filter((element) => !_.isEmpty(element));
      loopCount = listOfElements.length;
      if (_.isNil(this.definition['element-variable'])) {
        throw new ValidateError('for-each must include an element-variable definition.');
      }
      elementVariableName = this.definition['element-variable'];
    }

    // counter-variable can be used with either type of loop
    if (!_.isNil(this.definition['counter-variable'])) {
      counterVariableName = this.definition['counter-variable'];
    }

    // build new step definition that we'll use within the loop
    const newStepsDefinition = {
      name: this.originalDefinition.name,
      parallel: this.originalDefinition.parallel,
      when: this.originalDefinition.when,
      pipeline: [],
    };

    // When we loop, we convert the Step into a Steps
    for (let i = 0; i < loopCount; i++) {
      const newStep = {
        step: _.cloneDeep(this.originalDefinition),
      };

      newStep.step.environment = _.cloneDeep(this.originalDefinition.environment);
      if (_.isNil(newStep.step.environment)) {
        newStep.step.environment = [];
      }
      if (isForEach) {
        newStep.step.environment.push({'name': elementVariableName, 'value': listOfElements[i]});
      }
      if (!_.isNil(counterVariableName)) {
        newStep.step.environment.push({'name': counterVariableName, 'value': i + 1});
      }
      // Delete these the looping from the new step so we don't recurse
      delete newStep.step['loop'];
      delete newStep.step['for-each'];
      delete newStep.step['parallel'];
      delete newStep.step['when'];
      newStep.step['name'] = `${newStep.step['name']}-${i + 1}`;
      newStepsDefinition.pipeline.push(newStep);
    }

    const newSteps = new Steps(newStepsDefinition, this.getParent());
    this.getParent().updateDecentant(this, newSteps);
    await newSteps.start();
  }

  /**
   * @function module:engine.Step#validateDefinition
   */
  validateDefinition() {
    this.errors = [];

    // validate competing step properties are not set
    if (this.definition.retry && this.definition.loop) {
      this.errors.push(`Yaml: step retry and loop cannot be set on the same step: ${this.definition.name}`);
    }

    // validate retry values
    if (this.definition.retry) {
      if (this.definition.retry.iterations <= 1) {
        this.errors.push(`Yaml: step retry iterations value must be greater than 1 (actual value: ${this.definition.retry.iterations}): ${this.definition.name}`);
      }
      if (this.definition.retry.backoff < 0) {
        this.errors.push(`Yaml: step retry backoff value (in seconds) must be greater than or equal to 0 (actual value: ${this.definition.retry.backoff}): ${this.definition.name}`);
      }
    }

    // validate loop value
    if (this.definition.loop <= 1) {
      this.errors.push(`Yaml: step loop value must be greater than 1 (actual value: ${this.definition.loop}): ${this.definition.name}`);
    }

    // validate no two mount points are using the same location
    if (this.definition.volumes) {
      const volumes = [];

      // ensure the volume definition is in the correct format
      _.forEach(this.definition.volumes, (volume) => {
        const split = _.split(volume, ':');

        // if there are two colons /tmp:/tmp:ro, ensure last segment is ro
        // ensure there is between one and two colons
        if ((split.length === 3 && split[2] !== 'ro') || !(split.length >= 2 && split.length <= 3)) {
          this.errors.push(`Yaml: volumes must be in src:dest(:ro - optionally) format (actual value: ${volume}): ${this.definition.name}`);
        }

        // if mount point is provided, add it to the list of volumes to check for duplicates
        if (split.length >= 2) {
          volumes.push(split[1]);
        }
      });

      // find duplicate volume mount points and throw an error if there are any
      const duplicateMountPoints = _.getUniqueDuplicates(volumes);

      if (duplicateMountPoints.length > 0) {
        this.errors.push(`Yaml: the following mount points are not unique for step ${this.definition.name}: ${duplicateMountPoints}`);
      }
    }

    if (!_.isNil(this.definition.commands) && !_.isNil(this.definition.arguments)) {
      this.errors.push(`Yaml: step contains both 'arguments' and 'commands' properties: ${this.definition.name}`);
    }

    if (this.definition['pull-policy']) {
      if (this.definition['pull-policy'] !== 'Default' &&
          this.definition['pull-policy'] !== 'Always' &&
          this.definition['pull-policy'] !== 'IfNotPresent' &&
          this.definition['pull-policy'] !== 'Never') {
        this.errors.push(`Yaml: step contains invalid pull-policy '${this.definition['pull-policy']}' (allowed: Default, Always, IfNotPresent, Never): ${this.definition.name}`);
      }
    }

    if (this.definition['commands-output']) {
      if (this.definition['commands-output'] !== 'echo' &&
          this.definition['commands-output'] !== 'minimal' &&
          this.definition['commands-output'] !== 'timestamp') {
        this.errors.push(`Yaml: step contains invalid commands-output '${this.definition['commands-output']}' (allowed: minimal, echo, timestamp)`);
      }
    }
  }

  /**
   * @function module:engine.Steps#modifyDefinition
   * @description Adds additional step attributes.
   */
  modifyDefinition() {
    const DEFAULT_WORKSPACE_MOUNT = '/cix/src';

    // ensure names are strings
    this.definition.name = `${this.definition.name}`;

    if (_.isNil(this.definition['workspace-mount-point'])) {
      this.definition['workspace-mount-point'] = DEFAULT_WORKSPACE_MOUNT;
    }

    // set the workspace path to attach to /cix/src in the image (should be mounted first)
    this.definition.volumes = _.concat(`${this.getWorkspacePath()}:${this.definition['workspace-mount-point']}`, this.definition.volumes || []);

    if (_.isNil(this.definition['working-dir'])) {
      this.definition['working-dir'] = this.definition['workspace-mount-point'];
    }

    if (this.getRegistries()) {
      this.definition.registry = {};

      let registryHost;

      // Map new and old style Registry entries to a consistent internal format, and replace $$ variables.
      _.forEach(this.getRegistries(), (value, key) => {
        if (value.host) {
          registryHost = this.getEnvironment().replace$$Values(value.host.name);

          if (value.host.name.includes('$$') && value.host.name === registryHost) {
            registryHost = value.host.default;
          }
        } else {
          registryHost = key;
        }

        const retry = {
          iterations: 1,
          backoff: 120,
        };

        if (value.retry) {
          retry.iterations = _.toInteger(this.getEnvironment().replace$$Values(value.retry.iterations || retry.iterations));
          retry.backoff = _.toInteger(this.getEnvironment().replace$$Values(value.retry.backoff || retry.backoff));
        }

        this.definition.registry[key] = {
          host: {name: registryHost},
          username: this.getEnvironment().replace$$Values(value.username),
          password: this.getEnvironment().replace$$Values(value.password),
          retry: retry,
        };
      });
    }
  }

  /**
   * @function module:engine.Step#STATUS
   * @description Allow access to STATUS statically
   * @returns {object} A dictionary of statuses.
   */
  static get STATUS() {
    return STATUS;
  }
}
