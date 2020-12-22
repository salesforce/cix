/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {PluginError, _} from '../../common/index.js';
import ValidateService from '../ValidateService.js';
import log from 'winston';
import {v4 as uuidv4} from 'uuid';

/**
 * @class Plugin
 */
export default class Plugin {
  /**
   * @function module:engine.Plugin#constructor
   * @param {object} pluginSpec - options for plugin construction.
   */
  constructor(pluginSpec) {
    // Create an ID
    this.id = uuidv4();
    log.debug(`Generated ID for plugin: ${this.id}`);
    if (pluginSpec && pluginSpec.pluginPath) {
      this.path = pluginSpec.pluginPath;
    } else {
      throw new PluginError('Must provide pluginPath.', 400);
    }
  }

  /**
   * @function module:engine.Plugin#loadAndValidate
   * @description Loads and validates the plugin definition.
   * @async
   */
  async loadAndValidate() {
    let definition = await _.fetch(this.path, this.environment);
    definition = _.loadYamlOrJson(definition);
    const errors = ValidateService.validatePluginSchema(definition);
    if (definition.preprocessor) {
      this.preprocessor = definition.preprocessor;
    }
    if (!_.isEmpty(errors)) {
      _.forEach(errors, (error) => {
        if (error.message) {
          log.warn(`Error validating plugin schema: ${error.message}: ${(error.params) ? JSON.stringify(error.params) : ''} at ${error.dataPath}`);
        } else {
          log.warn(`${JSON.stringify(error)}`);
        }
      });
      throw new PluginError('Found errors loading and validating plugin.');
    }
  }

  /**
   * @function module:engine.Plugin#getId
   * @description Returns the id of the Plugin.
   * @returns {string} id of the Plugin.
   */
  getId() {
    return this.id;
  }

  /**
   * @function module:engine.Plugin#runPreprocessor
   * @description Runs a preprocessor if one is defined.
   * @param {object} exec - execution runtime for containers.
   * @param {object} pipelineDefinition - the pipeline definition.
   * @returns {object} valid CIX pipeline.
   */
  async runPreprocessor(exec, pipelineDefinition) {
    if (this.preprocessor) {
      log.info(`Running preprocessor ${this.preprocessor.image} for plugin ${this.getId()}`);
      const result = await exec.runPreprocessor(this.preprocessor.image, pipelineDefinition);

      if (result.status == 0) {
        pipelineDefinition = result.output;
      } else {
        log.error(`The preprocessor has returned a non-zero exit code (${result.status}):\n${result.output}`);
        throw new PluginError(`The preprocessor has returned a non-zero exit code (${result.status}).`);
      }
    } else {
      log.debug(`Skipping preprocessor for plugin ${this.getId()}.`);
    }
    return pipelineDefinition;
  }
}
