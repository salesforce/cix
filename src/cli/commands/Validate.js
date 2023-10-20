/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import AbstractRemoteCommand from './AbstractRemoteCommand.js';
import {Logger} from '../../common/index.js';

export default class Validate extends AbstractRemoteCommand {
  /**
   * @class
   * @description Validate Command.
   */
  constructor() {
    super('validate');
  }

  /**
   * @function module:cli.Validate#registerOptions
   * @description Registers the command's options with Commander.
   * @param {object} program - A reference to the Commander program.
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerOptions(program) {
    program.option('-e, --env <mapping>', 'Specify environment variable.  Mapping should be in the form of KEY (value taken from environment) or KEY=VALUE.', this.collectKeyValue);
    program.option('-s, --secret <mapping>', 'Specify a secret (insecure). Mapping should be in the form of KEY (secret taken from environment) or KEY=SECRET.', this.collectKeyValue);
    program.option('-w, --workspace <path>', 'Specify the workspace path.  Default path is the current working directory.');
    program.option('-y, --yaml <path>', 'Path to pipeline definition YAML file. May be repeated.', this.collectValues.bind(this));
    program.option('--setup <path>', 'Path to setup pipeline YAML file.');
    program.option('--teardown <path>', 'Path to teardown pipeline YAML file.');
    program.option('--remote', 'CIX will execute against a remote CIX Server.');
    return super.registerOptions(program);
  }

  /**
   * @function module:cli.Validate#registerDescription
   * @description Registers the command's description with Commander.
   * @param {object} program - A reference to the Commander program.
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerDescription(program) {
    return program.description('Validate your YAML files without executing');
  }

  /**
   * @function module:cli.Validate#action
   * @description Runs the install sub command.
   * @param {object} options - map of options set on command line
   * @returns {undefined}
   */
  async action(options) {
    this.validateOptions(options);

    const pipelineList = this.generateListOfPipelines(options);

    Logger.silly(`Validating pipelines: ${JSON.stringify(pipelineList)}`);
    for (let i = 0; i < pipelineList.length; i++) {
      Logger.silly(`Validating Pipeline ${i + 1} of ${pipelineList.length}: ${JSON.stringify(pipelineList[i])}`);
      const pipelineSpec = {};

      pipelineSpec.yamlPath = pipelineList[i].yaml;
      pipelineSpec.environment = this.generateEnvironmentList(options);

      if (options.workspace) {
        pipelineSpec.workspace = options.workspace;
      }

      if (options.remote) {
        const validateApi = await this.getValidateApi(options);
        await validateApi.validate({pipelineSpec: pipelineSpec});
      } else {
        await this.getValidateService().validatePipeline(pipelineSpec);
      }
    }
  }
}
