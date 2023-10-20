/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import AbstractCommand from './AbstractCommand.js';
import {CLIError} from '../../common/index.js';

export default class Update extends AbstractCommand {
  /**
   * @class
   * @description Update Command.
   */
  constructor() {
    super('update');
  }

  /**
   * @function module:cli.Update#registerDescription
   * @description Registers the command's description with Commander.
   * @param {object} program - A reference to the Commander program.
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerDescription(program) {
    return program.description('Shell command only: updates the CIX docker image from the registry.');
  }

  /**
   * @function module:cli.Update#action
   * @description Runs the install sub command.
   * @returns {undefined}
   */
  action() {
    throw new CLIError('Update is only valid with the cix shell command, i.e. run \'cix update\'.');
  }
}
