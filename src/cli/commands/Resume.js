/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {CLIError, Logger} from '../../common/index.js';
import AbstractRemoteCommand from './AbstractRemoteCommand.js';

export default class Resume extends AbstractRemoteCommand {
  /**
   * @class
   * @description Resume Command.
   */
  constructor() {
    super('resume');
  }

  /**
   * @function module:cli.Resume#registerOptions
   * @description Registers the command's options with Commander.
   * @param {object} program - A reference to the Commander program.
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerOptions(program) {
    program.option('--pipeline-id <pipeline-id>', 'Pipeline ID to resume (default: "latest" alias)');
    program.option('--pipeline-alias <pipeline-alias>', 'Pipeline Alias to resume. (default: "latest" alias)');
    program.option('--to <step>', 'Run to step name, then pause before the next step.');
    program.option('--next', 'Run one step, then pause.');
    program.option('--non-blocking', 'Disables the blocking wait until a remote execution is complete.');
    // options starting with --no are inverted by commander, thus the default here is really false
    program.option('--no-remote-logs', 'Disables streaming logs from Server.', true);
    return program = super.registerOptions(program);
  }

  /**
   * @function module:cli.Resume#registerDescription
   * @description Registers the command's description with Commander.
   * @param {object} program - A reference to the Commander program.
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerDescription(program) {
    return program.description('Continues a paused Pipeline on a CIX Server.');
  }

  /**
   * @function module:cli.Resume#action
   * @description Runs the Exec sub command.
   * @param {object} options - map of options set on command line
   * @returns {undefined}
   */
  async action(options) {
    if (options.next && options.to) {
      throw new CLIError('--next and --to are mutually exclusive.');
    }
    if (options.pipelineAlias && options.pipelineId) {
      throw new CLIError('--pipelineAlias and --pipelineId are mutually exclusive.');
    }
    const pipelineApi = await this.getPipelineApi(options);

    const postBody = {};
    if (options.nonBlocking) {
      postBody['blocking'] = false;
    } else {
      postBody['blocking'] = true;
    }

    if (options.pipelineId) {
      postBody['pipelineId'] = options.pipelineId;
    } else if (options.pipelineAlias) {
      const resp = await pipelineApi.getPipelineForAlias({pipelineAlias: options.pipelineAlias});
      postBody['pipelineId'] = resp.body.id;
    } else {
      Logger.info('No pipeline ID or alias provided, using "latest" alias.');
      const resp = await pipelineApi.getPipelineForAlias({pipelineAlias: 'latest'});
      postBody['pipelineId'] = resp.body.id;
    }

    if (options.next) {
      Logger.info('Resume: running pipeline to next step.');
      if (options.remoteLogs) {
        await pipelineApi.nextPipelineStep(postBody, this.logStreamingFetch());
      } else {
        postBody['remoteLogs'] = false;
        await pipelineApi.nextPipelineStep(postBody);
      }
    } else if (options.to) {
      Logger.info(`Resume: running pipeline to (and including) step named '${options.to}'.`);
      postBody['step'] = options.to;
      if (options.remoteLogs) {
        await pipelineApi.resumePipeline(postBody, this.logStreamingFetch());
      } else {
        postBody['remoteLogs'] = false;
        await pipelineApi.resumePipeline(postBody);
      }
    } else {
      Logger.info('Resume: running pipeline to completion.');
      if (options.remoteLogs) {
        await pipelineApi.resumePipeline(postBody, this.logStreamingFetch());
      } else {
        postBody['remoteLogs'] = false;
        await pipelineApi.resumePipeline(postBody);
      }
    }
    if (postBody['blocking']) {
      await this.checkStatusPostRun(postBody['pipelineId'], true);
    }
  }
}
