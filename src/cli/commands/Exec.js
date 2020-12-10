/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import Load from './Load.js';

export default class Exec extends Load {
  /**
   * @class
   *
   * @description Exec command.
   */
  constructor() {
    super('exec');
  }

  /**
   * @function module:cli.Exec#registerOptions
   * @description Registers the command's options with Commander.
   *
   * @param {object} program - A reference to the Commander program.
   *
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerOptions(program) {
    program = super.registerOptions(program);
    program.option('--remote', 'CIX will execute against a remote CIX Server.');
    return program.option('--no-remote-logs', 'Disables streaming logs from Server.', false);
  }

  /**
   * @function module:cli.Exec#registerDescription
   * @description Registers the command's description with Commander.
   *
   * @param {object} program - A reference to the Commander program.
   *
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerDescription(program) {
    return program.description('Executes a pipeline.');
  }

  /**
   * @function module:cli.Install#action
   * @description Runs the Exec sub command.
   *
   * @param {object} options - map of options set on command line
   *
   * @returns {undefined}
   */
  async action(options) {
    // initialize server if exec is running locally
    if (!options.remote) {
      this.initServer(options);
    }

    // Runs Load.action();
    const pipelineId = await super.action(options);

    if (options.remote) {
      const pipelineApi = await this.getPipelineApi(options);
      if (options.remoteLogs) {
        await pipelineApi.startPipeline({pipelineId: pipelineId}, this.logStreamingFetch());
      } else {
        await pipelineApi.startPipeline({pipelineId: pipelineId, remoteLogs: false});
      }
      await this.checkStatusPostRun(pipelineId);
    } else {
      await this.getPipelineService().startPipeline(pipelineId);
    }
  }
}
