/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import Load from './Load.js';

export default class Exec extends Load {
  /**
   * @class
   * @description Exec command.
   */
  constructor() {
    super('exec');
  }

  /**
   * @function module:cli.Exec#registerOptions
   * @description Registers the command's options with Commander.
   * @param {object} program - A reference to the Commander program.
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerOptions(program) {
    program = super.registerOptions(program);
    program.option('--remote', 'CIX will execute against a remote CIX Server.');
    program.option('--non-blocking', 'Disables the blocking wait until a remote execution is complete.');
    // options starting with --no are inverted by commander, thus the default here is really false
    return program.option('--no-remote-logs', 'Disables streaming logs from Server.', true);
  }

  /**
   * @function module:cli.Exec#registerDescription
   * @description Registers the command's description with Commander.
   * @param {object} program - A reference to the Commander program.
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerDescription(program) {
    return program.description('Executes a pipeline.');
  }

  /**
   * @function module:cli.Install#action
   * @description Runs the Exec sub command.
   * @param {object} options - map of options set on command line
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
      const postBody = {
        pipelineId: pipelineId,
      };
      if (options.nonBlocking) {
        postBody['blocking'] = false;
      } else {
        postBody['blocking'] = true;
      }
      if (options.remoteLogs) {
        await pipelineApi.startPipeline(postBody, this.logStreamingFetch());
      } else {
        postBody['remoteLogs'] = false;
        await pipelineApi.startPipeline(postBody);
      }
      if (postBody['blocking']) {
        await this.checkStatusPostRun(pipelineId, true);
      }
    } else {
      await this.getPipelineService().startPipeline(pipelineId);
      await this.checkStatusPostRun(pipelineId, false);
    }
  }
}
