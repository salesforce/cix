/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {CIXError, CLIError, ExecutionError, Logger, NodeProvider, ServerError, ValidateError, _} from '../common/index.js';
import {program as commander} from 'commander';
import commands from './commands/index.js';
import dirname from './dirname.cjs';
import fs from 'fs';
import path from 'path';

// import.meta.url jest workaround... Fix once Jest supports ES Modules: https://github.com/facebook/jest/issues/9430
const {__dirname} = dirname;

export class Application {
  /**
   * @class
   * @description CIX CLI.
   * @param {object} config - configuration options; aka., package.json
   * @param {Array} args - list of arguments for CIX execution
   * @see {@link https://www.npmjs.com/package/commander|commander}
   */
  constructor(config, args) {
    this._config = config;
    this._args = args;
    this.stdin = '';
    this.insecureSecretWarned = false;
    this.program = new commander.Command();
  }

  /**
   * @function module:cli.Application#getProgram
   * @description Returns the commander object for better testability.
   * @returns {commander.Command} commander object
   */
  getProgram() {
    return this.program;
  }

  /**
   * @function module:cli.Application#validateWrapperScript
   * @description Check the shell wrapper script's version is not out of date.
   * @returns {undefined}
   */
  validateWrapperScript() {
    const callingVersion = NodeProvider.getProcess().env.CIX_WRAPPER_VERSION || '0';
    const script = this.getWrapperScript();

    let expectedVersion;

    if (script.split('\n')[1].startsWith('CIX_WRAPPER_VERSION')) {
      expectedVersion = script.split('\n')[1].split('=')[1];
    } else {
      Logger.debug('Strange, the shell wrapper script\'s expected version cannot be determined.');
      expectedVersion = 0;
    }

    if (_.toInteger(callingVersion) < expectedVersion) {
      Logger.warn('The shell wrapper script used to call cix is out of date. Run \'cix install | sudo sh\' to update it.');
    } else if (_.toInteger(callingVersion) > expectedVersion) {
      Logger.warn('The shell wrapper script used to call cix is newer than this image. If you experience unexpected errors run \'cix install | sudo sh\' to downgrade it.');
    }
  }

  /**
   * @function  module:cli.Application#getWrapperScript
   * @description returns the contents of the wrapper script.
   * @returns {string} the wrapper script as a string.
   */
  getWrapperScript() {
    return fs.readFileSync(path.join(__dirname, '../../scripts', 'cix.sh'), 'utf8');
  }

  /**
   * @function  module:cli.Application#executeSubCommands
   * @description executes commands with error handling.
   * @returns {undefined}
   */
  async executeSubCommands() {
    let exitCode = 0;
    try {
      await this.getProgram().parseAsync(this._args);
    } catch (error) {
      if (error instanceof CLIError) {
        Logger.error(`${error.message}`);
        exitCode = 1;
      } else if (error instanceof ValidateError) {
        Logger.error(`${error.message}`);
        exitCode = 2;
      } else if (error instanceof ExecutionError) {
        Logger.error(`${error.message}`);
        exitCode = 3;
      } else if (error instanceof ServerError) {
        Logger.error(`${error.message}`);
        exitCode = 4;
      } else if (error instanceof CIXError) {
        Logger.error(`${error.message}`);
        exitCode = 5;
      } else {
        // Catch swagger-client errors here
        if (error.response && error.response.obj && error.response.obj.message) {
          Logger.debug(`Client Error: ${error.response.url} ${error.response.obj.status}`);
          Logger.error(`${error.response.obj.message}`);
          exitCode = 6;
        } else {
          Logger.error(`Caught unexpected error: ${error.name}`);
          exitCode = 100;
        }
      }

      if (error.stack) {
        Logger.debug(`${error.stack}`);
      }
    } finally {
      Logger.debug('Exiting with status ' + exitCode);
      NodeProvider.getProcess().exit(exitCode);
    }
  }

  /**
   * @function module:cli.Application#execute
   * @description Processes the request leveraging {@link https://www.npmjs.com/package/commander|commander}
   * @returns {undefined}
   */
  execute() {
    this.getProgram().name('cix');
    this.getProgram().version(this._config.version, '-v, --version');

    // Register all sub-commands
    _.each(commands, (command) => {
      this.getProgram().addCommand(command.register());
    });

    // Handle the deprecated Docker usage where the cix command was part of the docker run arguments.
    if (this._args[2] === 'cix') {
      this._args.splice(2, 1);
    }

    if (this._args[2] !== 'install') {
      this.validateWrapperScript();
      Logger.info(`This is CIX version ${this._config.version} ${NodeProvider.getProcess().env.CIX_WRAPPER_IMAGE ? '(from ' + NodeProvider.getProcess().env.CIX_WRAPPER_IMAGE + ')' : ''}`);
    }

    this.executeSubCommands();

    // Get list of names from commander and join them with a regex OR, then remove first OR with a substr
    const listOfCommandsRegEx = _.reduce(this.getProgram().commands, (accumulator, command) =>
      accumulator + '|' + command._name, '').substr(1);

    if (!new RegExp(listOfCommandsRegEx).test(this._args[2])) {
      this.getProgram().outputHelp();
      NodeProvider.getProcess().exit(1);
    }
  }
}

export default Application;
