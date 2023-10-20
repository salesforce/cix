/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import AbstractCommand from './AbstractCommand.js';

export default class Server extends AbstractCommand {
  /**
   * @class
   * @description Server Command.
   */
  constructor() {
    super('server');
  }

  /**
   * @function module:cli.Server#registerOptions
   * @description Registers the command's options with Commander.
   * @param {object} program - A reference to the Commander program.
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerOptions(program) {
    program.option('-c, --configfile <path>', 'Specify a cix configuration file to load.');
    program.option('-d, --detach', 'Shell command only: detach the server container from the console.');
    program.option('-l, --logging <mode>', 'Specify container output logging mode: console, file (single file), or files (separate files for each step))');
    program.option('-L, --logname <name>', 'Specify a custom name for the CIX application log file.');
    program.option('-p, --logging-path <path>', 'Path where logs created by the \'files\' logging mode will be stored. (default: "logs")');
    program.option('--port <port>', 'CIX Server Port', '10030');
    program.option('-w, --workspace <path>', 'Specify the workspace path.  Default path is the current working directory.');
    return super.registerOptions(program);
  }

  /**
   * @function module:cli.Server#registerDescription
   * @description Registers the command's description with Commander.
   * @param {object} program - A reference to the Commander program.
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerDescription(program) {
    return program.description('Starts a local CIX server.');
  }

  /**
   * @function module:cli.Server#action
   * @description Starts the Server.
   * @param {object} options - map of options set on command line
   * @returns {undefined}
   */
  async action(options) {
    this.loadCixConfig(options);
    this.configureLogger(options);
    const server = this.initServer(options);
    // Wait until Control-C
    await server.block();
  }
}
