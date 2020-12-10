/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {ExecutionError, Provider, _} from '../../common/index.js';
import Pipeline from './Pipeline.js';
import PipelineNode from './PipelineNode.js';
import StepDecorators from './decorators/StepDecorators.js';
import log from 'winston';

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
    this.modifyDefinition();
    this.validateDefinition();
    this.status = Step.STATUS.ready;
  }

  /**
   * @function module:engine.Step#getStatus
   * @description Returns the status of the Step.
   *
   * @returns {string} The status of the Step.
   */
  getStatus() {
    return this.status;
  }

  /**
   * @function module:engine.Step#setStatus
   * @description Sets the status of the Step.
   *
   * @param {string} status - The status of the Step.
   */
  setStatus(status) {
    if (!_.includes(_.keys(Step.STATUS), status)) {
      throw new ExecutionError(`'${status}' is not a valid status for a Step.`);
    }
    log.silly(`Changing ${this.getName()} status to '${status}'.`);
    this.status = status;
  }

  /**
   * @function module:engine.Step#start
   * @description Starts a step.
   *
   * @async
   */
  async start() {
    log.debug(`Preparing step '${this.definition.name}'`);
    if (this.definition.name.includes('.')) {
      log.warn(`Step name '${this.definition.name}' contains the period (.) character which can interfere with hostname lookups.`);
    }

    while (this.getPipeline().getStatus() === Pipeline.STATUS.paused) {
      log.info('Pipeline is paused, waiting for status to change...');
      await this.getPipeline().awaitStatusChange();
    }

    let promiseProvider = Provider.fromFunction(async () => {
      await this.getExec().runStep(this.definition);
    });

    try {
      StepDecorators.map((decorator) => {
        promiseProvider = decorator(this.definition, this, promiseProvider);
      });
      if (this.status === Step.STATUS.skipped) { // allow for skipped runs to remain so
        log.info(`Skipping step '${this.definition.name}'`);
      } else {
        log.info(`Starting step '${this.definition.name}'`);
        this.setStatus(Step.STATUS.running);
        await promiseProvider.get();
        log.info(`Successfully completed step '${this.definition.name}'`);
        this.setStatus(Step.STATUS.successful);
      }
    } catch (error) {
      log.warn(`Failed on executing step '${this.definition.name}': ${error}`);
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
        log.info(`Pausing pipeline after running step '${this.definition.name}'.`);
        this.getPipeline().pause();
      }
    }
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
  }

  /**
   * @function module:engine.Steps#modifyDefinition
   * @description Adds additional step attributes.
   */
  modifyDefinition() {
    const DEFAULT_WORKSPACE_MOUNT = '/cix/src';

    // ensure names which are numbers now strings
    this.definition.name = `${this.definition.name}`;

    // set the workspace path to attach to /cix/src in the image (should be mounted first)
    this.definition.volumes = _.concat(`${this.getWorkspacePath()}:${DEFAULT_WORKSPACE_MOUNT}`, this.definition.volumes || []);

    if (_.isNil(this.definition['working-dir'])) {
      this.definition['working-dir'] = DEFAULT_WORKSPACE_MOUNT;
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
   *
   * @returns {object} A dictionary of statuses.
   */
  static get STATUS() {
    return STATUS;
  }
}
