/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {ExecutionError, _} from '../common/index.js';
import PipelineService from './PipelineService.js';
import log from 'winston';

/**
 * @class
 *
 * @description Services all engine environment calls.
 */
class EnvironmentService {
  /**
   * @function module:engine.EnvironmentService#getPipeline
   * @description Validates pipeline exists and returns it.
   *
   * @param {string} pipelineId - The pipeline to retrieve.
   * @returns {object} A reference to the requested Pipeline.
   */
  getPipeline(pipelineId) {
    return PipelineService.getPipeline(pipelineId);
  }

  /**
   * @function module:engine.EnvironmentService#setEnvironmentVar
   * @description Adds/Replaces an environment variable to a pipeline.
   *
   * @param {string} pipelineId - The pipeline to add to.
   * @param {object} environmentVar - A representation of the environment variable.
   */
  setEnvironmentVar(pipelineId, environmentVar) {
    // validation of additional options
    if (_.isNil(environmentVar)) {
      log.silly('Cannot set environment variable, parameter required.');
      throw new ExecutionError('The environmentVar parameter is required.', 400);
    }
    if (_.isNil(environmentVar.name) || _.isNil(environmentVar.value)) {
      log.silly('Cannot set environment variable, parameter is malformed".');
      throw new ExecutionError('The environmentVar parameter is malformed.', 400);
    }

    log.debug(`Adding environment variable ${environmentVar.name} for Pipeline ${pipelineId}`);
    this.getPipeline(pipelineId).getEnvironment().addEnvironmentVariable(environmentVar);
  }

  /**
   * @function module:engine.EnvironmentService#getEnvironmentVar
   * @description Gets an environment variable from a pipeline.
   *
   * @param {string} pipelineId - The pipeline to fetch from.
   * @param {string} name - The name of the environment variable to fetch.
   * @returns {object} A representation of the environment variable.
   */
  getEnvironmentVar(pipelineId, name) {
    if (_.isNil(name)) {
      log.silly('Cannot get environment variable, parameter required.');
      throw new ExecutionError('The name parameter is required.', 400);
    }
    log.debug(`Getting environment variable ${name} for Pipeline ${pipelineId}`);
    const environment = this.getPipeline(pipelineId).getEnvironment();
    return JSON.parse(environment.redactSecrets(JSON.stringify(environment.getEnvironmentVariable(name))));
  }

  /**
   * @function module:engine.EnvironmentService#listEnvironmentVar
   * @description Lists the environment variables for a given pipeline.
   *
   * @param {string} pipelineId - The pipeline to fetch the list from.
   * @returns {Array} A list of environment variable names.
   */
  listEnvironmentVar(pipelineId) {
    log.debug(`Getting all environment variables for Pipeline ${pipelineId}`);
    return this.getPipeline(pipelineId).getEnvironment().listEnvironmentVariables();
  }
}

// make EnvironmentService a singleton
const instance = new EnvironmentService();

Object.freeze(instance);

export {instance as default};
