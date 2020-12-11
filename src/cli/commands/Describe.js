/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import AbstractRemoteCommand from './AbstractRemoteCommand.js';
import {CIXError} from '../../common/index.js';
import fs from 'fs';
import log from 'winston';

export default class Describe extends AbstractRemoteCommand {
  /**
   * @class
   *
   * @description Describe Command.
   */
  constructor() {
    super('describe');
  }

  /**
   * @function module:cli.Describe#registerOptions
   * @description Registers the command's options with Commander.
   *
   * @param {object} program - A reference to the Commander program.
   *
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerOptions(program) {
    program.option('--pipeline-id <pipeline-id>', 'Pipeline ID to resume (default: "latest" alias)');
    program.option('--pipeline-alias <pipeline-alias>', 'Pipeline Alias to resume. (default: "latest" alias)');
    program.option('--file <location>', 'Write the Pipeline steps to a file.');
    program.option('--stdout', 'Write the Pipeline steps to standard output.');
    program.option('--stderr', 'Write the Pipeline steps to standard error.');
    return program = super.registerOptions(program);
  }

  /**
   * @function module:cli.Describe#registerDescription
   * @description Registers the command's description with Commander.
   *
   * @param {object} program - A reference to the Commander program.
   *
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerDescription(program) {
    return program.description('Displays the sequence of the steps.');
  }

  /**
   * @function module:cli.Describe#writeSequenceToFile
   * @description Writes the step sequence as JSON to a file.
   *
   * @param {object} path - A path the the file to save.
   * @param {object} sequence - The JSON content to write.
   */
  writeSequenceToFile(path, sequence) {
    fs.writeFileSync(path, sequence);
  }

  /**
   * @function module:cli.Describe#action
   * @description Runs the Exec sub command.
   *
   * @param {object} options - map of options set on command line
   *
   * @returns {undefined}
   */
  async action(options) {
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
      const resp = await pipelineApi.getPipelineForAlias({pipelineAlias: 'latest'});
      pipelineId = resp.body.id;
    }

    const sequence = await pipelineApi.getPipelineSequence({pipelineId: pipelineId});
    const sequenceString = JSON.stringify(sequence.obj, null, 2);


    if (options.stdout) {
      console.log(sequenceString);
    } else if (options.stderr) {
      console.error(sequenceString);
    } else if (options.file) {
      log.info(`Writing description to '${options.file}'`);
      try {
        this.writeSequenceToFile(options.file, sequenceString);
      } catch (error) {
        if (error.stack.includes('ENOENT')) {
          throw new CIXError(`Cannot write to path '${options.file}'`);
        }
        if (error.stack.includes('EPERM')) {
          throw new CIXError(`Permission denied writing to '${options.file}'`);
        }
        throw error;
      }
    } else {
      log.info(`Sequence: \n${sequenceString}`);
    }
  }
}
