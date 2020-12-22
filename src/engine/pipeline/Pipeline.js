/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {ExecutionError, NodeProvider, ValidateError, _} from '../../common/index.js';
import Environment from '../environment/Environment.js';
import ExecFactory from '../runtime/ExecFactory.js';
import PipelineImporter from './PipelineImporter.js';
import PluginService from '../PluginService.js';
import Step from './Step.js';
import Steps from './Steps.js';
import ValidateService from '../ValidateService.js';
import events from 'events';
import log from 'winston';
import os from 'os';
import path from 'path';
import stream from 'stream';
import {v4 as uuidv4} from 'uuid';

// Static constant for Pipeline Class, so that you can use Pipeline.STATUS.ready
const STATUS = {
  // Pipeline is ready to start.
  'ready': 'ready',
  // Pipeline is preloaded and ready to start.
  'loaded': 'loaded',
  // Pipeline is setting up.
  'initializing': 'initializing',
  // Pipeline is currently running.
  'running': 'running',
  // Pipeline is paused, new steps will not start.
  'paused': 'paused',
  // Pipeline failed, new steps will not start.
  'failed': 'failed',
  // Pipeline was skipped as part of chained pipeline sequence.
  'skipped': 'skipped',
  // Pipeline has succeeded.
  'successful': 'successful',
};

/**
 * @namespace Pipeline
 */
export default class Pipeline {
  /**
   * @function module:engine.Pipeline#constructor
   * @param {object} pipelineSpec - options for pipeline construction.
   */
  constructor(pipelineSpec) {
    if (_.isNil(pipelineSpec)) {
      throw new ValidateError('Must pass in a new Pipeline object.', 400);
    }
    this.nextPipeline = null;
    this.status = Pipeline.STATUS.ready;

    // Seed our environment object
    this.environment = new Environment(pipelineSpec.environment);

    // Attach plugins
    this.plugins = [];
    if (pipelineSpec.plugins) {
      for (const pluginIndex in pipelineSpec.plugins) {
        this.plugins.push(PluginService.getPlugin(pipelineSpec.plugins[pluginIndex].id));
      }
    }

    // Pipeline will get loaded JIT (see this.loadAndValidate())
    if (pipelineSpec.yamlPath && pipelineSpec.rawPipeline) {
      throw new ValidateError('Cannot use yamlPath and rawPipeline parameters together.', 400);
    } else if (pipelineSpec.yamlPath) {
      this.yamlPath = pipelineSpec.yamlPath;
    } else if (pipelineSpec.rawPipeline) {
      this.rawPipeline = pipelineSpec.rawPipeline;
    } else {
      throw new ValidateError('Either the yamlPath or rawPipeline parameters are required.', 400);
    }

    // Configure workspace
    this.workspacePath = this.resolveWorkspace(pipelineSpec.workspace);

    // Create an ID
    this.id = uuidv4();
    log.debug(`Generated ID for pipeline: ${this.id}`);
    this.environment.addEnvironmentVariable({name: 'CIX_EXECUTION_ID', value: this.id, type: 'internal'});

    // Set Hostname
    if (!this.environment.getEnvironmentVariable('CIX_HOSTNAME')) {
      this.environment.addEnvironmentVariable({name: 'CIX_HOSTNAME', value: os.hostname(), type: 'internal'});
    }

    // set Type
    if (!_.isNil(pipelineSpec.type)) {
      this.setType(pipelineSpec.type);
    }

    // We do not run 'init' and create the docker network until start()
    this.exec = new ExecFactory().getExec(NodeProvider.getProcess().env.CIX_ENGINE || 'docker');

    // Setup status event emitter (used for un pausing steps)
    this.statusEmitter = new events.EventEmitter();
  }


  /**
   * @function module:engine.Pipeline#resolveWorkspace
   * @description Creates a new Pipeline.
   *
   * @param {string} workspace - path of the workspace.
   * @returns {string} fully qualified
   */
  resolveWorkspace(workspace) {
    if (workspace) {
      workspace = path.resolve(workspace);
      log.debug(`Workspace supplied: ${workspace}`);
    } else {
      workspace = NodeProvider.getProcess().cwd();
      log.debug(`Workspace not supplied. Using current working directory: ${workspace}`);
    }

    const fs = NodeProvider.getFs();
    if (!fs.existsSync(workspace)) {
      throw new ValidateError(`Workspace does not exist: ${workspace}.`);
    }

    try {
      fs.accessSync(workspace, fs.constants.W_OK);
    } catch (error) {
      log.debug(`${error}`);
      log.warn(`Workspace is not writable: ${workspace}`);
    }

    return workspace;
  }

  /**
   * @function module:engine.Pipeline#STATUS
   * @description Status static constant.
   *
   * @returns {object} A dictionary of statuses.
   */
  static get STATUS() {
    return STATUS;
  }

  /**
   * @function module:engine.Pipeline#isActive
   * @description Indicates if a pipeline is in a state that may need cleanup.
   *
   * @returns {boolean} The boolean stating if it is active or not.
   */
  isActive() {
    if (this.getStatus() === Pipeline.STATUS.initializing ||
        this.getStatus() === Pipeline.STATUS.running ||
        this.getStatus() === Pipeline.STATUS.paused) {
      return true;
    }
    return false;
  }

  /**
   * @function module:engine.Pipeline#isTerminal
   * @description Indicates if a pipeline has finished running.
   *
   * @returns {boolean} The boolean stating if it is finished or not.
   */
  isTerminal() {
    if (this.getStatus() === Pipeline.STATUS.failed ||
        this.getStatus() === Pipeline.STATUS.skipped ||
        this.getStatus() === Pipeline.STATUS.successful) {
      return true;
    }
    return false;
  }

  /**
   * @function module:engine.Pipeline#isStartable
   * @description Indicates if a pipeline can be started.
   *
   * @returns {boolean} The boolean stating if pipeline can be started.
   */
  isStartable() {
    if (this.getStatus() === Pipeline.STATUS.ready ||
        this.getStatus() === Pipeline.STATUS.loaded) {
      return true;
    }
    return false;
  }

  /**
   * @function module:engine.Pipeline#generateLogStream
   * @description Generates a log stream for remote client requests.
   *
   * @returns {stream} The log stream.
   */
  generateLogStream() {
    // Cleanup after any old log streams...
    this.destroyLogStream();

    // transform the docker and winston object streams into a string stream, also deals with back pressure
    this.logStream = new stream.Transform({
      writableObjectMode: true,
      transform(chunk, _encoding, callback) {
        chunk.message = chunk.message.toString('utf8');
        // prevent any back pressure, if the readable buffer goes over the max -16K for warnings, it starts skipping messages.
        if (this.readableLength < this.readableHighWaterMark) {
          this.push(JSON.stringify(chunk) + '\n');
        } else {
          // send a warning if we still have room to do so.
          if (!this.warningSent) {
            this.push(JSON.stringify({'level': 'warn', 'message': 'Not able to keep up with server log streaming, having to drop packets....'}));
            this.warningSent = true;
            // wait 1000 milliseconds before allowing this to be sent again...
            setTimeout(() => {
              this.warningSent = false;
            }, 1000);
          }
        }
        callback();
      },
    });
    // hook into the global winston CIX log stream, track it so we can remove it later
    // Note: this means if we're running more than one pipeline concurrently, you'll get logs from both
    this.winstonStream = new log.transports.Stream({
      stream: this.logStream,
    });
    log.add(this.winstonStream);
    return this.logStream;
  }

  /**
   * @function module:engine.Pipeline#generateLogStream
   * @description Returns a reference to the pipelines log stream.
   *
   * @returns {stream} The log stream.
   */
  getLogStream() {
    if (this.logStream) {
      return this.logStream;
    } else {
      return null;
    }
  }

  /**
   * @function module:engine.Pipeline#generateLogStream
   * @description Destroys the log stream if one exists
   */
  destroyLogStream() {
    if (!_.isNil(this.winstonStream)) {
      log.remove(this.winstonStream);
      this.winstonStream = null;
    }
    if (!_.isNil(this.logStream)) {
      this.logStream.destroy();
      this.logStream = null;
    }
  }

  /**
   * @function module:engine.Pipeline#getLength
   * @description Returns the number of individual steps in the pipeline.
   *
   * @returns {number} The number of steps in the pipeline.
   */
  getLength() {
    return this.getStepList().length;
  }

  /**
   * @function module:engine.Pipeline#getStepList
   * @description Returns a list of steps that can be iterated through.
   *
   * @returns {Array} The list of Step references.
   */
  getStepList() {
    return this.getPipelineNodeList().filter((node) => node.getType() !== 'Steps');
  }

  /**
   * @function module:engine.Pipeline#getStepsList
   * @description Returns a list of step groups that can be iterated through
   *
   * @returns {Array} The list of Steps references.
   */
  getStepsList() {
    return this.getPipelineNodeList().filter((node) => node.getType() === 'Steps');
  }

  /**
   * @function module:engine.Pipeline#getRemainingSteps
   * @description Returns a list of steps that have not yet run.
   *
   * @returns {Array} The list of Step references.
   */
  getRemainingSteps() {
    return this.getStepList().filter((node) => node.getStatus() === Step.STATUS.ready);
  }

  /**
   * @function module:engine.Pipeline#getPipelineNodeList
   * @description Returns a list of step groups and steps that can be iterated through
   *
   * @returns {Array}  The list of PipelineNode references.
   */
  getPipelineNodeList() {
    return this.getPipelineTreeRoot().getDescendants(true);
  }

  /**
   * @function module:engine.Pipeline#getPlugins
   * @description Returns a list of plugins enabled on this pipeline.
   *
   * @returns {Array}  The list of plugins for this pipeline.
   */
  getPlugins() {
    return this.plugins;
  }

  /**
   * @function module:engine.Pipeline#getErrors
   * @description Returns the errors associated with this pipeline's individual steps.
   *
   * @returns {Array} An array of strings representing any errors found in the payload.
   */
  getErrors() {
    return _.reduce(this.getStepList(), (errors, step) => _.concat(errors, step.getErrors()), []);
  }

  /**
   * @function module:engine.Pipeline#getEnvironment
   * @description Returns a reference to the environment object.
   *
   * @returns {object} A reference to the environment object.
   */
  getEnvironment() {
    return this.environment;
  }

  /**
   * @function module:engine.Pipeline#awaitStatusChange
   * @description Allows the caller to wait for a pipeline status change.
   *
   * @param {Array} statuses - (optional) status to be notified on.
   * @returns {Promise} A promise which will resolve once status is set.
   */
  async awaitStatusChange(statuses) {
    if (this.isTerminal()) {
      return;
    }
    // Used a Promise here as the event listener needs a callback.
    return new Promise((resolve) => {
      this.statusEmitter.on('status', (status) => {
        if (_.isEmpty(statuses) || _.includes(statuses, status)) {
          resolve(status);
        }
      });
    });
  }

  /**
   * @function module:engine.Pipeline#getStatus
   * @description Returns the status of the pipeline.
   *
   * @returns {string} The status of the pipeline.
   */
  getStatus() {
    return this.status;
  }


  /**
   * @function module:engine.Pipeline#setStatus
   * @description Sets the status of the pipeline.
   *
   * @param {string} status - The status of the pipeline.
   */
  setStatus(status) {
    if (!_.includes(_.keys(Pipeline.STATUS), status)) {
      throw new ExecutionError(`'${status}' is not a valid status for a pipeline.`);
    }
    log.silly(`Changing ${this.getId()} status to '${status}'.`);
    if (this.status != status) {
      this.status = status;
      this.statusEmitter.emit('status', status);
    }
  }

  /**
   * @function module:engine.Pipeline#setNextPipeline
   * @description Sets the next pipeline to call after this one completes.
   *
   * @param {object} nextPipeline - A reference to the next pipeline.
   */
  setNextPipeline(nextPipeline) {
    log.debug(`Linking pipeline ${this.getId()} -> ${nextPipeline.getShortId()}`);
    this.nextPipeline = nextPipeline;
  }


  /**
   * @function module:engine.Pipeline#getNextPipeline
   * @description Gets the next pipeline to call after this one completes.
   *
   * @returns {object} A reference to the next pipeline.
   */
  getNextPipeline() {
    return this.nextPipeline;
  }

  /**
   * @function module:engine.Pipeline#getType
   * @description Returns the type of the pipeline.
   *
   * @returns {string} The type of pipeline.
   */
  getType() {
    return this.type;
  }

  /**
   * @function module:engine.Pipeline#setType
   * @description Sets the type of the pipeline.
   *
   * @param {string} type - The type of pipeline.
   */
  setType(type) {
    this.type = type;
  }

  /**
   * @function module:engine.Pipeline#getExec
   * @description Gets the execution runtime.
   *
   * @returns {object} The execution runtime.
   */
  getExec() {
    return this.exec;
  }

  /**
   * @function module:engine.Pipeline#getWorkspacePath
   * @description Gets the workspace path for the pipeline.
   *
   * @returns {string} A string representation of the workspace path.
   */
  getWorkspacePath() {
    return this.workspacePath;
  }

  /**
   * @function module:engine.Pipeline#getRegistries
   * @description Gets the registry information defined for the pipeline.
   *
   * @returns {object} An object representation of the registries.
   */
  getRegistries() {
    return this.registries;
  }

  /**
   * @function module:engine.Pipeline#getId
   * @description Gets the ID of the pipeline.
   *
   * @returns {string} An ID.
   */
  getId() {
    return this.id;
  }

  /**
   * @function module:engine.Pipeline#getShortId
   * @description Gets a shortened ID of the pipeline.
   *
   * @returns {string} An truncated 5 character ID.
   */
  getShortId() {
    return this.getId().substring(-1, 8);
  }

  /**
   * @function module:engine.Pipeline#getBreakpoint
   * @description Gets the current breakpoint or null if one is not set.
   *
   * @returns {string} name of the breakpoint
   */
  getBreakpoint() {
    return this.breakpoint || null;
  }

  /**
   * @function module:engine.Pipeline#setBreakpoint
   * @description Sets a step breakpoint to pause on.
   *
   * @param {string} breakpoint - the step which to pause on.
   */
  setBreakpoint(breakpoint) {
    log.debug(`Setting a step breakpoint on ${this.getShortId()} to ${breakpoint}.`);
    this.breakpoint = `${breakpoint}`;
  }

  /**
   * @function module:engine.Pipeline#clearBreakpoint
   * @description Clears the breakpoint.
   */
  clearBreakpoint() {
    log.silly('Clearing breakpoint.');
    this.breakpoint = null;
  }


  /**
   * @function module:engine.Pipeline#getPipelineTreeRoot
   * @description returns the root Steps node of the pipeline tree.
   *
   * @returns {Steps} - the root Steps object.
   */
  getPipelineTreeRoot() {
    if (this.getStatus === Pipeline.STATUS.ready) {
      throw new ExecutionError('Pipeline not loaded yet.', 500);
    }
    if (_.isNil(this.getPipelineTreeRoot || !(this.getPipelineTreeRoot instanceof Steps))) {
      throw new ExecutionError('This pipeline was not correctly loaded.', 500);
    }
    return this.pipelineTreeRoot;
  }

  /**
   * @function module:engine.Pipeline#describeSequence
   * @description Returns a object/json representation of the step sequence.
   *
   * @returns {object} The sequence.
   */
  async describeSequence() {
    await this.loadAndValidate();

    const expectedEnvironment = new Set(); // Ensures uniqueness of keys in subsequent array

    // Used a recursive function to iterate through the steps
    const sequence = (function recursiveReduce(node) {
      // Accumulate the expected environment keys for the entire pipeline
      if (node.getExpectedEnvironment()) {
        node.getExpectedEnvironment().forEach((item) => expectedEnvironment.add(item));
      }
      if (node.getType() === 'Steps') {
        const steps = {
          name: node.getName(),
          steps: _.map(node.descendants, recursiveReduce),
        };
        if (node.isParallel()) { // only include if true
          steps.parallel = node.isParallel();
        }
        return steps;
      } else if (node.getType() === 'Step') {
        return {
          name: node.getName(),
          status: node.getStatus(),
        };
      }
    })(this.getPipelineTreeRoot()); // Start with the pipeline root node
    if (expectedEnvironment.size > 0) {
      sequence.environment_keys = [...expectedEnvironment];
    }
    return sequence;
  }

  /**
   * @function module:engine.Pipeline#load
   * @description Loads a pipeline from http or disk just in time.
   * @async
   */
  async loadAndValidate() {
    if (this.getStatus() === Pipeline.STATUS.ready) {
      log.debug(`Loading pipeline ${this.getShortId()}.`);
      let importer;

      if (!_.isEmpty(this.getPlugins())) {
        log.debug('Plugins installed, running all preprocessors.');
        let pipelineDefinition;
        if (this.yamlPath) {
          pipelineDefinition = await _.fetch(this.yamlPath);
        } else {
          pipelineDefinition = this.rawPipeline;
        }
        pipelineDefinition = pipelineDefinition.toString();
        for (const plugin of this.getPlugins()) {
          log.silly(`Pipeline definition before preprocessor ${plugin.getId()}:\n${pipelineDefinition}`);
          pipelineDefinition = await plugin.runPreprocessor(this.getExec(), pipelineDefinition);
          log.silly(`Pipeline definition after preprocessor ${plugin.getId()}:\n${pipelineDefinition}`);
        }
        pipelineDefinition = _.loadYamlOrJson(pipelineDefinition);
        importer = new PipelineImporter({rawPipeline: pipelineDefinition, environment: this.environment});
      } else if (this.yamlPath) {
        log.debug(`Creating Pipeline with yaml: ${this.yamlPath}`);
        importer = new PipelineImporter({path: this.yamlPath, environment: this.environment});
      } else {
        log.debug(`Creating Pipeline with JSON input: ${JSON.stringify(this.rawPipeline)}`);
        importer = new PipelineImporter({rawPipeline: this.rawPipeline, environment: this.environment});
      }

      // load the pipeline
      const definition = await importer.load();
      let errors = ValidateService.validatePipelineSchema(definition);
      this.registries = definition.registry;
      this.pipelineTreeRoot = new Steps({name: 'root', pipeline: definition.pipeline}, this);

      errors = _.concat(errors, this.getErrors());
      if (!_.isEmpty(errors)) {
        _.forEach(errors, (error) => {
          if (error.message) {
            log.warn(`Error validating pipeline schema: ${error.message}: ${(error.params) ? JSON.stringify(error.params) : ''} at ${error.dataPath}`);
          } else {
            log.warn(`${JSON.stringify(error)}`);
          }
        });
        this.setStatus(Pipeline.STATUS.failed);
        throw new ValidateError('Found errors loading and validating pipeline.');
      }
      this.setStatus(STATUS.loaded);
    } else {
      log.silly(`Pipeline ${this.getShortId()} was previously loaded, using that.`);
    }
  }

  /**
   * @function module:engine.Pipeline#start
   * @description Starts the pipeline.
   *
   * @async
   */
  async start() {
    try {
      await this.loadAndValidate();
      log.debug('Creating new container executor.');
      this.setStatus(Pipeline.STATUS.initializing);
      await this.getExec().init(this);
      this.setStatus(Pipeline.STATUS.running);
      await this.getPipelineTreeRoot().start();
      log.debug(`Pipeline ${this.getId()} successful.`);
      this.setStatus(Pipeline.STATUS.successful);
    } catch (error) {
      log.error(`Pipeline ${this.getId()} failed: ${error}`);
      if (error && error.stack) {
        log.debug(`${error.stack}`);
      }
      this.setStatus(Pipeline.STATUS.failed);
    } finally {
      log.debug('Tearing down container executor.');
      await this.cleanup();
    }
  }

  /**
   * @function module:engine.Pipeline#pause
   * @description Pauses the pipeline.
   *
   * @async
   */
  async pause() {
    log.debug('Pausing pipeline.');
    this.setStatus(Pipeline.STATUS.paused);
  }

  /**
   * @function module:engine.PipelineService#resumePipeline
   * @description Continues a pipeline that is paused or not started.
   *
   * @async
   * @param {string} [step] - A step name to run to and pause on.
   */
  async resume(step) {
    if (!this.isTerminal()) {
      try {
        await this.loadAndValidate();
      } catch (err) {
        this.setStatus(Pipeline.STATUS.failed);
        throw err;
      }

      if (step) {
        this.setBreakpoint(step);
        if (step == this.getStepList().pop().name) {
          log.debug(`Step '${step}' was the last step, running entire pipeline.`);
          this.clearBreakpoint();
        } else if (step == this.getStepsList().pop().name &&
                   this.getStepsList().pop().getDescendants().pop() === this.getStepList().pop()) {
          log.debug(`Steps '${step}' was the last step, running entire pipeline.`);
          this.clearBreakpoint();
        }
      } else {
        this.clearBreakpoint();
      }
      if (this.isStartable()) {
        await this.start();
      } else {
        this.setStatus(Pipeline.STATUS.running);
      }
    } else {
      throw new ExecutionError('This pipeline is already finished.', 400);
    }
  }

  /**
   * @function module:engine.Pipeline#cleanup
   * @description Cleans up log stream and docker.
   *
   * @async
   */
  async cleanup() {
    this.destroyLogStream();
    if (this.getExec()) {
      await this.getExec().tearDown();
    }
  }


  /**
   * @function module:engine.Pipeline#kill
   * @description Kills the pipeline and runs teardown.
   *
   * @async
   */
  async kill() {
    if (this.isActive()) {
      log.info(`Killing pipeline ${this.getId()} as it is in the state '${this.getStatus()}'.`);
      this.setStatus(Pipeline.STATUS.paused); // paused while we tear it down
      await this.cleanup();
      this.setStatus(Pipeline.STATUS.skipped);
    } else {
      log.silly(`Not killing pipeline ${this.getId()} as it is in the state '${this.getStatus()}'.`);
    }
  }

  /**
   * @function module:engine.Pipeline#nextStep
   * @description Continues pipeline to next step.
   *
   * @async
   */
  async nextStep() {
    if (!this.isTerminal()) {
      await this.loadAndValidate();
      // The step list is in-order
      const remainingSteps = this.getRemainingSteps();
      if (remainingSteps.length > 0) {
        await this.resume(remainingSteps[0].name);
      }
    } else {
      throw new ExecutionError('Pipeline: This pipeline is already finished.', 400);
    }
  }
}
