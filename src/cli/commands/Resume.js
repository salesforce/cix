/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import AbstractRemoteCommand from './AbstractRemoteCommand.js';
import {CLIError} from '../../common/index.js';
import log from 'winston';

export default class Resume extends AbstractRemoteCommand {
  /**
   * @class
   *
   * @description Resume Command.
   */
  constructor() {
    super('resume');
  }

  /**
   * @function module:cli.Resume#registerOptions
   * @description Registers the command's options with Commander.
   *
   * @param {object} program - A reference to the Commander program.
   *
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerOptions(program) {
    program.option('--pipeline-id <pipeline-id>', 'Pipeline ID to resume (default: "latest" alias)');
    program.option('--pipeline-alias <pipeline-alias>', 'Pipeline Alias to resume. (default: "latest" alias)');
    program.option('--to <step>', 'Run to step name, then pause before the next step.');
    program.option('--next', 'Run one step, then pause.');
    program.option('--no-remote-logs', 'Disables streaming logs from Server.', false);
    return program = super.registerOptions(program);
  }

  /**
   * @function module:cli.Resume#registerDescription
   * @description Registers the command's description with Commander.
   *
   * @param {object} program - A reference to the Commander program.
   *
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerDescription(program) {
    return program.description('Continues a paused Pipeline on a CIX Server.');
  }

  /**
   * @function module:cli.Resume#action
   * @description Runs the Exec sub command.
   *
   * @param {object} options - map of options set on command line
   *
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

    let pipelineId;
    if (options.pipelineId) {
      pipelineId = options.pipelineId;
    } else if (options.pipelineAlias) {
      const resp = await pipelineApi.getPipelineForAlias({pipelineAlias: options.pipelineAlias});
      pipelineId = resp.body.id;
    } else {
      log.info('No pipeline ID or alias provided, using "latest" alias.');
      const resp = await pipelineApi.getPipelineForAlias({pipelineAlias: 'latest'});
      pipelineId = resp.body.id;
    }

    if (options.next) {
      log.info('Resume: running pipeline to next step.');
      if (options.remoteLogs) {
        await pipelineApi.nextPipelineStep({pipelineId: pipelineId}, this.logStreamingFetch());
      } else {
        await pipelineApi.nextPipelineStep({remoteLogs: false, pipelineId: pipelineId});
      }
    } else if (options.to) {
      log.info(`Resume: running pipeline to (and including) step named '${options.to}'.`);
      if (options.remoteLogs) {
        await pipelineApi.resumePipeline({step: options.to, pipelineId: pipelineId}, this.logStreamingFetch());
      } else {
        await pipelineApi.resumePipeline({step: options.to, remoteLogs: false, pipelineId: pipelineId});
      }
    } else {
      log.info('Resume: running pipeline to completion.');
      if (options.remoteLogs) {
        await pipelineApi.resumePipeline({pipelineId: pipelineId}, this.logStreamingFetch());
      } else {
        await pipelineApi.resumePipeline({remoteLogs: false, pipelineId: pipelineId});
      }
    }
    await this.checkStatusPostRun(pipelineId);
  }
}
