/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {environmentSchema, importSchema, masterSchema, pipelineSchema, pluginSchema, preprocessorSchema, registrySchema, stepSchema, stepsSchema, whenSchema} from './JsonSchemas.js';
import Ajv from 'ajv';

/**
 * @class Validate
 */
class Validate {
  /**
   * @function module:engine.Validate#validatePipelineSchema
   * @param {string} json - json Object to validate
   *
   * @returns {Array} validation errors
   */
  validatePipelineSchema(json) {
    const ajv = new Ajv({
      schemas: [masterSchema, environmentSchema, importSchema, pipelineSchema, registrySchema, stepSchema, stepsSchema, whenSchema],
      allErrors: true,
    });
    const validate = ajv.getSchema('master.json');

    validate(json);

    return validate.errors || [];
  }

  /**
   * @function module:engine.Validate#validatePipelineSchema
   * @param {string} json - json Object to validate
   *
   * @returns {Array} validation errors
   */
  validatePluginSchema(json) {
    const ajv = new Ajv({
      schemas: [pluginSchema, preprocessorSchema],
      allErrors: true,
    });
    const validate = ajv.getSchema('plugin.json');

    validate(json);

    return validate.errors || [];
  }
}

// make Validate a singleton
const instance = new Validate();

Object.freeze(instance);

export {instance as default};

