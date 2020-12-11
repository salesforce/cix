/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {NodeProvider, _} from '../../common/index.js';
import {PipelineService, PluginService, ValidateService} from '../../engine/index.js';
import ConfigImporter from '../config/ConfigImporter.js';
import {Server} from '../../server/index.js';
import commander from 'commander';
import log from 'winston';
import path from 'path';

export default class AbstractCommand {
  /**
   * @class
   *
   * @description Abstract Command Class.
   *
   * @param {string} name - name of the concrete class.
   */
  constructor(name) {
    if (this.constructor === AbstractCommand) {
      throw new TypeError('Cannot construct abstract class.');
    }

    if (name) {
      this.name = name;
    } else {
      throw new Error('Must provide name to AbstractCommand constructor.');
    }

    if (this.action === AbstractCommand.prototype.action) {
      throw new TypeError('Please implement abstract method action.');
    }
  }

  /**
   * @function module:cli.AbstractCommand#registerProgram
   * @description Registers the command's name with Commander.
   *
   * @param {object} program - A reference to the Commander program.
   *
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerProgram(program) {
    return program.command(this.name);
  }

  /**
   * @function module:cli.AbstractCommand#registerOptions
   * @description Registers the command's options with Commander.
   *
   * @param {object} program - A reference to the Commander program.
   *
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerOptions(program) {
    return program;
  }

  /**
   * @function module:cli.AbstractCommand#registerDescription
   * @description Registers the command's description with Commander.
   *
   * @param {object} program - A reference to the Commander program.
   *
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerDescription(program) {
    return program;
  }

  /**
   * @function module:cli.AbstractCommand#register
   * @description Registers the command with Commander.
   *
   * @returns {undefined}
   */
  register() {
    let commandBuilder = new commander.Command();
    commandBuilder = this.registerProgram(commandBuilder);
    commandBuilder = this.registerOptions(commandBuilder);
    commandBuilder = this.registerDescription(commandBuilder);
    commandBuilder.action(this.action.bind(this));
    return commandBuilder;
  }

  /**
   * @function module:cli.AbstractCommand#action
   * @description The command's action.
   *
   * @returns {undefined}
   */
  action() {
    // Stubbed Implementation
  }

  /**
   * @function module:cli.AbstractCommand#getPipelineService
   * @description Provides the PipelineService reference for easier testability.
   *
   * @returns {PipelineService} PipelineService reference
   */
  getPipelineService() {
    return PipelineService;
  }

  /**
   * @function module:cli.AbstractCommand#getValidateService
   * @description Provides the ValidateService reference for easier testability.
   *
   * @returns {ValidateService} ValidateService reference
   */
  getValidateService() {
    return ValidateService;
  }

  /**
   * @function module:cli.AbstractCommand#getPluginService
   * @description Provides the PluginService reference for easier testability.
   *
   * @returns {PipelineService} PipelineService reference
   */
  getPluginService() {
    return PluginService;
  }

  /**
   * @function module:cli.AbstractCommand#initServer
   * @description Starts the pipeline in a server.
   *
   * @param {object} options - map of options set on command line
   *
   * @returns {undefined}
   */
  initServer(options) {
    return new Server(options.port || 10030);
  }

  /**
   * @function module:cli.AbstractCommand#collectValues
   * @description Using this method one can collect a series of values into a list
   *
   * @param {string} value - value to be added to the list
   * @param {object} accumulator - existing values
   *
   * @returns {object} updated values
   */
  collectValues(value, accumulator = []) {
    accumulator.push(value);

    return accumulator;
  }

  /**
   * @function module:cli.AbstractCommand#collectKeyValue
   * @description Using this function one can collect a series of entries with key/value pairs
   * @example
   *     cix -e var1=Foo -e var2=Bar # Accumulates to {'var1=foo', 'var2=bar'}
   *     cix -e ENV1 -e ENV2 # Accumulates to {'ENV1=foo', 'ENV2=bar'}, if they exist in the process ENV
   *
   * @param {string} input - key or key/value pair to be added to the list
   * @param {object} accumulator - existing key/value pairs
   *
   * @returns {object} updated key/value accumulator object
   */
  collectKeyValue(input, accumulator = {}) {
    const index = _.indexOf(input, '=');
    let key;
    let value;

    if (index > 0) {
      // support KEY=VALUE passing
      key = input.slice(0, index);
      value = input.slice(index + 1);
    } else {
      // support environment passthrough
      key = input;
      value = _.get(process.env, input);
    }

    // undefined values will cause a downstream warning for users
    // and will not end up in the env map
    accumulator[key] = value;

    return accumulator;
  }

  /**
   * @function module:cli.AbstractCommand#collectKeyValueAndWarn
   * @description Using this function one can collect a series of entries with values and warn users to use different method
   * @example
   *     cix -e var1=Foo -e var2=Bar # Leads to E: ['var1=Foo', 'var2=Bar']
   *
   * @param {string} value - value to be added to the list
   * @param {object} accumulator - existing values
   *
   * @returns {object} updated values
   */
  collectKeyValueAndWarn(value, accumulator = {}) {
    if (!this.insecureSecretWarned) { // only warn once per invocation
      log.warn('Passing secrets with -s is not secure, please use --secret-stdin or --secrets-stdin');
    }

    this.insecureSecretWarned = true;
    return this.collectKeyValue(value, accumulator);
  }

  /**
   * @function module:cli.AbstractCommand#loadCixConfig
   * @description Reads .cixconfig files from disk and sets options appropriately
   *
   * @param {object} options - map of options set on command line
   *
   * @returns {undefined}
   */
  loadCixConfig(options) {
    const configImporter = new ConfigImporter();
    configImporter.load(options.configfile);
    configImporter.updateOptions(options);
  }

  /**
   * @function module:cli.AbstractCommand#validateOptions
   * @description Check command line YAML parameters.
   *
   * @param {object} options - map of options set on command line
   *
   * @returns {undefined}
   */
  validateOptions(options) {
    if (_.isNil(options.yaml) || _.isEmpty(options.yaml)) {
      log.info('No pipeline YAML file specified, using cix.yaml');
      options.yaml = ['cix.yaml'];
    }
  }

  /**
   * @function module:cli.AbstractCommand#configureLogger
   * @description Generates a logger class for the execution.
   *
   * @param {object} options - Map of options set on command line.
   *
   * @returns {undefined}
   */
  configureLogger(options) {
    // enable logging to files
    if (!_.isNil(options.logging) && options.logging === 'files') {
      // handle default here for loggingPath, in order to allow loadCixConfig to override it
      this.enableFileLogging(options.loggingPath || 'logs');
    }
  }

  /**
   * @function module:cli.AbstractCommand#enableFileLogging
   * @description Starts the pipeline in a server.
   *
   * @param {object} loggingPath - path to log cix-execution to
   *
   * @returns {undefined}
   */
  enableFileLogging(loggingPath) {
    log.info('Switching over to file logging.');
    log.add(
      new log.transports.File({
        level: (NodeProvider.getProcess().env.LOG_LEVEL || 'info').toLowerCase(),
        filename: path.join(loggingPath, 'cix-execution.log'),
        silent: NodeProvider.getProcess().argv.includes('--silent'), // silent for utests
        format: log.format.combine(
          log.format.timestamp({format: 'YYYY-MM-DDTHH:mm:ssZ'}),
          log.format((info) => {
            info.level = info.level.toUpperCase();
            return info;
          })(),
          log.format.align(),
          log.format.printf((info) => `${info.timestamp}  ${info.level} ${info.message}`),
        ),
      }),
    );
    // used for future container logging
    log.fileLogging = {enabled: true, path: loggingPath};
  }

  /**
   * @function module:cli.Application#generateListOfPipelines
   * @description Generates a list of pipelines to execute.
   *
   * @param {object} options - Map of options set on command line.
   *
   * @returns {undefined}
   */
  generateListOfPipelines(options) {
    const pipelineList = [];

    if (options.setup) {
      pipelineList.push({yaml: options.setup});
    }

    _.forEach(options.yaml.splice(','), (value) => {
      pipelineList.push({yaml: value});
    });

    if (options.teardown) {
      pipelineList.push({yaml: options.teardown, type: 'teardown'});
    }

    return pipelineList;
  }

  /**
   * @function module:cli.AbstractCommand#generateEnvironmentList
   * @description Generates a engine compatible map of environment variables.
   *
   * @param {object} options - Map of options set on command line.
   *
   * @returns {undefined}
   */
  generateEnvironmentList(options) {
    const environmentList = [];

    _.forEach(options.env, (value, name) => {
      if (_.isNil(name) || _.isNil(value)) {
        log.warn('This environment variable is invalid, skipping it: name: ' + name + ' value: ' + value);
      } else {
        environmentList.push({name: name, value: value, type: 'environment'});
      }
    });
    _.forEach(options.secret, (value, name) => {
      if (_.isNil(name) || _.isNil(value)) {
        log.warn('This environment variable is invalid, skipping it: name: ' + name + ' value: ' + value);
      } else {
        environmentList.push({name: name, value: value, type: 'secret'});
      }
    });

    return environmentList;
  }
}
