/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import Pipeline from './pipeline/Pipeline.js';
import Validate from './validate/Validate.js';

/**
 * @class
 * @description Services all engine calls.
 */
class ValidateService {
  /**
   * @function module:engine.ValidateService#validatePipelineSchema
   * @description Validates and loads a yaml.
   * @async
   * @param {object} definition - A object representation of a pipeline.
   * @returns {Array} List of errors.
   */
  validatePipelineSchema(definition) {
    return Validate.validatePipelineSchema(definition);
  }

  /**
   * @function module:engine.ValidateService#validatePluginSchema
   * @description Validates and loads a plugin yaml.
   * @async
   * @param {object} definition - A object representation of a plugin.
   * @returns {Array} List of errors.
   */
  validatePluginSchema(definition) {
    return Validate.validatePluginSchema(definition);
  }

  /**
   * @function module:engine.ValidateService#validatePipeline
   * @description Validates and loads a yaml.
   * @async
   * @param {object} pipelineSpec - All parameters are sent in this object.
   * @returns {object} The validated/loaded YAML Pipeline.
   */
  async validatePipeline(pipelineSpec) {
    const pipeline = new Pipeline(pipelineSpec);
    await pipeline.loadAndValidate();
  }
}

// make ValidateService a singleton
const instance = new ValidateService();

Object.freeze(instance);

export {instance as default};
