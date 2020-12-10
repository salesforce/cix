/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {CLIError, ServerError} from '../../common/index.js';
import AbstractRemoteCommand from './AbstractRemoteCommand.js';
import log from 'winston';

export default class Pipelines extends AbstractRemoteCommand {
  /**
   * @class
   *
   * @description Pipelines Command.
   */
  constructor() {
    super('pipelines');
  }

  /**
   * @function module:cli.Pipelines#registerOptions
   * @description Registers the command's options with Commander.
   *
   * @param {object} program - A reference to the Commander program.
   *
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerOptions(program) {
    program.option('--get-alias <pipeline-alias>', 'Gets the pipeline for an alias.');
    program.option('--set-alias <pipeline-alias>', 'Sets the alias to a pipeline (--pipeline-id required).');
    program.option('--pipeline-id <pipeline-id>', 'ID for setting alias.');
    program.option('--pipeline-alias <pipeline-alias>', 'Alias for checking status.');
    program.option('--status', 'Displays the status of a pipeline (--pipeline-id optional).');
    return super.registerOptions(program);
  }

  /**
   * @function module:cli.Pipelines#registerDescription
   * @description Registers the command's description with Commander.
   *
   * @param {object} program - A reference to the Commander program.
   *
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerDescription(program) {
    return program.description('Lists information about pipelines.');
  }

  /**
   * @function module:cli.Pipelines#action
   * @description Runs the Exec sub command.
   *
   * @param {object} options - map of options set on command line
   *
   * @returns {undefined}
   */
  async action(options) {
    // Count how many mutually exclusive options we have.
    const optionCount = ((options.getAlias) ? 1 : 0) + ((options.setAlias) ? 1 : 0) + ((options.status) ? 1 : 0);
    if (optionCount > 1) {
      throw new CLIError('--get-alias, --set-alias and --status are mutually exclusive.');
    }
    const pipelineApi = await this.getPipelineApi(options);

    if (options.getAlias) {
      const pipeline = await pipelineApi.getPipelineForAlias({pipelineAlias: options.getAlias});
      log.info(`${options.getAlias} -> ${pipeline.obj.id}`);
    } else if (options.setAlias) {
      if (options.pipelineId) {
        await pipelineApi.setAliasForPipeline({pipelineAlias: options.setAlias, pipelineId: options.pipelineId});
      } else {
        throw new CLIError('When setting an alias, you must also provide a --pipeline-id <id>.');
      }
    } else if (options.status) {
      let status;
      if (options.pipelineId) {
        status = await pipelineApi.getPipelineStatus({pipelineId: options.pipelineId});
      } else {
        let alias;
        if (options.pipelineAlias) {
          alias = options.pipelineAlias;
        } else {
          log.warn('--pipeline-id not supplied using "latest" alias.');
          alias = 'latest';
        }
        let pipeline;
        try {
          pipeline = await pipelineApi.getPipelineForAlias({pipelineAlias: alias});
        } catch (error) {
          log.debug(error);
          throw new ServerError('No pipelines exist on the server.');
        }
        status = await pipelineApi.getPipelineStatus({pipelineId: pipeline.obj.id});
      }
      log.info(`Pipeline Status: ${JSON.stringify(status.obj.status)}`);
    } else {
      // List pipelines with aliases shown
      const list = await pipelineApi.getPipelineList();
      log.info('List of pipelines:');
      for (const pipelineId of list.obj) {
        log.info(`  - ${pipelineId}`);
        const aliases = await pipelineApi.getAliasesForPipeline({pipelineId: pipelineId});
        for (const alias of aliases.obj) {
          log.info(`    - alias: ${alias}`);
        }
      }
    }
  }
}
