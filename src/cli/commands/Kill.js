/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import AbstractRemoteCommand from './AbstractRemoteCommand.js';
import {Logger} from '../../common/index.js';

export default class Kill extends AbstractRemoteCommand {
  /**
   * @class
   * @description Kill Command.
   */
  constructor() {
    super('kill');
  }

  /**
   * @function module:cli.Kill#registerDescription
   * @description Registers the command's description with Commander.
   * @param {object} program - A reference to the Commander program.
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerDescription(program) {
    return program.description('Kills a running pipeline.');
  }

  /**
   * @function module:cli.Kill#action
   * @description Runs the Exec sub command.
   * @param {object} options - map of options set on command line
   */
  async action(options) {
    const pipelineApi = await this.getPipelineApi(options);
    Logger.info('Kill: killing pipeline....');
    await pipelineApi.killPipeline();
  }
}
