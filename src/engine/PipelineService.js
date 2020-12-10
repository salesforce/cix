/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {ExecutionError, NodeProvider, _} from '../common/index.js';
import Pipeline from './pipeline/Pipeline.js';
import log from 'winston';

/**
 * @class
 *
 * @description Services all engine pipeline calls.
 */
class PipelineService {
  constructor() {
    this.pipelines = {};
    this.aliases = {};
  }

  /**
   * @function module:engine.PipelineService#addPipeline
   * @description Creates a new Pipeline.
   *
   * @async
   * @param {object} pipelineSpec - All parameters are sent in this object.
   * @returns {object} An object response containing the ID of the pipeline.
   */
  addPipeline(pipelineSpec) {
    const pipeline = new Pipeline(pipelineSpec);

    const pipelineId = pipeline.getId();
    log.debug(`Adding new pipeline to CIX: ${pipelineId}`);

    this.pipelines[pipelineId] = pipeline;

    log.silly(`Returning new Pipeline with ID: ${pipelineId}`);

    log.silly(`Setting latest pipeline ${pipelineId} to latest`);
    this.setAliasForPipeline('latest', pipelineId);

    if (pipelineSpec.pipelineAlias) {
      this.setAliasForPipeline(pipelineSpec.pipelineAlias, pipelineId);
    }

    return {id: pipelineId};
  }

  /**
   * @function module:engine.PipelineService#getPipeline
   * @description Validates pipeline exists and returns it.
   *
   * @param {string} pipelineId - The pipeline to retrieve.
   * @returns {object} A reference to the requested Pipeline.
   */
  getPipeline(pipelineId) {
    if (_.isNil(pipelineId)) {
      throw new ExecutionError('No pipelineId parameter(s) provided.', 400);
    }
    if (!(pipelineId in this.pipelines)) {
      throw new ExecutionError(`Pipeline ${pipelineId} doesn't exist.`, 404);
    }
    return this.pipelines[pipelineId];
  }

  /**
   * @function module:engine.PipelineService#getAliasList
   * @description Gets a list of aliases that exist.
   *
   * @returns {Array} List of alias names.
   */
  getAliasList() {
    log.silly('Getting list of aliases.');
    return Object.keys(this.aliases);
  }

  /**
   * @function module:engine.PipelineService#getAliasesForPipeline
   * @description Returns aliases for a given pipeline id.
   *
   * @param {string} pipelineId - The pipeline id to lookup.
   * @returns {Array} The list of corresponding aliases.
   */
  getAliasesForPipeline(pipelineId) {
    log.silly(`Getting list of alias for pipeline ${pipelineId}.`);
    // Check to see if pipeline exists
    this.getPipeline(pipelineId);

    const pipelineList = [];
    for (const alias in this.aliases) {
      if (pipelineId === this.aliases[alias]) {
        pipelineList.push(alias);
      }
    }
    return pipelineList;
  }

  /**
   * @function module:engine.PipelineService#getPipelineForAlias
   * @description Returns the pipeline id for a given alias.
   *
   * @param {string} pipelineAlias - The alias to lookup.
   * @returns {string} The id of the pipeline.
   */
  getPipelineForAlias(pipelineAlias) {
    log.silly(`Getting pipelineId for alias ${pipelineAlias}.`);
    if (_.isNil(pipelineAlias)) {
      throw new ExecutionError('No pipelineAlias parameter(s) provided.', 400);
    }
    if (!(pipelineAlias in this.aliases)) {
      throw new ExecutionError(`Pipeline alias "${pipelineAlias}" doesn't exist.`, 404);
    }
    return this.aliases[pipelineAlias];
  }

  /**
   * @function module:engine.PipelineService#setAliasForPipeline
   * @description Create a new pipeline alias or updates existing.
   *
   * @param {string} pipelineAlias - The alias to create or update.
   * @param {string} pipelineId - The ID of the pipeline to set alias to.
   */
  setAliasForPipeline(pipelineAlias, pipelineId) {
    log.silly(`Setting alias ${pipelineAlias} for pipeline ${pipelineId}.`);
    // Check to see if pipeline exists
    this.getPipeline(pipelineId);
    if (pipelineAlias in this.aliases) {
      log.info(`Overwriting existing alias ${pipelineAlias} that was pointed to ${this.aliases[pipelineAlias]}.`);
    }
    this.aliases[pipelineAlias] = pipelineId;
  }

  /**
   * @function module:engine.PipelineService#getPipelineSequence
   * @description Gets a definition of a pipeline.
   *
   * @param {string} pipelineId - The ID of the pipeline to get.
   * @returns {object} A representation of the Pipeline.
   */
  async getPipelineSequence(pipelineId) {
    log.debug(`Getting pipeline ${pipelineId}`);
    const pipeline = this.getPipeline(pipelineId);
    return await pipeline.describeSequence();
  }

  /**
   * @function module:engine.PipelineService#getPipelineList
   * @description Gets a list of pipeline IDs that exist.
   *
   * @returns {Array} List of pipeline ids.
   */
  getPipelineList() {
    log.silly('Getting list of pipeline IDs.');
    return Object.keys(this.pipelines);
  }

  /**
   * @function module:engine.PipelineService#linkPipeline
   * @description Chains one pipeline to another.
   *
   * @async
   * @param {string} pipelineId - The pipeline to chain to.
   * @param {string} nextPipelineId - The pipeline to run next.
   */
  async linkPipeline(pipelineId, nextPipelineId) {
    log.debug(`Setting ${nextPipelineId} as next pipeline after ${pipelineId}`);
    this.getPipeline(pipelineId).setNextPipeline(this.getPipeline(nextPipelineId));
  }

  /**
   * @function module:engine.PipelineService#startPipeline
   * @description Starts a pipeline and it's chained pipelines.
   *
   * @async
   * @param {string} pipelineId - The pipeline to start.
   */
  async startPipeline(pipelineId) {
    let pipeline = this.getPipeline(pipelineId);
    let terminalState = false; let terminalPipelineId;

    do {
      log.info(`Starting Pipeline: ${pipeline.getId()}`);

      if (!terminalState || pipeline.getType() === 'teardown') {
        await pipeline.start();

        if (pipeline.getStatus() === 'failed') {
          terminalState = true;
          terminalPipelineId = pipeline.getShortId();
        }
      } else {
        pipeline.setStatus(Pipeline.STATUS.skipped);
      }

      pipeline = pipeline.getNextPipeline();
    } while (pipeline);

    if (terminalState) {
      throw new ExecutionError(`Pipeline '${terminalPipelineId}' failed.`);
    }
  }

  /**
   * @function module:engine.PipelineService#pausePipeline
   * @description Pauses a pipeline and it's chained pipelines.
   *
   * @async
   * @param {string} pipelineId - The pipeline to pause.
   */
  async pausePipeline(pipelineId) {
    await this.getPipeline(pipelineId).pause();
  }

  /**
   * @function module:engine.PipelineService#resumePipeline
   * @description Continues a pipeline that is paused or not started.
   *
   * @async
   * @param {string} pipelineId - The pipeline to move forward one step.
   * @param {string} step (optional) - A step name to run to and pause on.
   */
  async resumePipeline(pipelineId, step) {
    if (!this.getPipeline(pipelineId).isTerminal()) {
      this.getPipeline(pipelineId).resume(step);
      await this.getPipeline(pipelineId).awaitStatusChange(
        [Pipeline.STATUS.paused, Pipeline.STATUS.failed, Pipeline.STATUS.skipped, Pipeline.STATUS.successful],
      );
    } else {
      throw new ExecutionError('Pipeline: This pipeline is already finished.', 400);
    }
  }

  /**
   * @function module:engine.PipelineService#killPipeline
   * @description Kills a pipeline and it's chained pipelines.
   *
   * @async
   * @param {string} pipelineId - The pipeline to kill.
   */
  async killPipeline(pipelineId) {
    await this.getPipeline(pipelineId).kill();
  }

  /**
   * @function module:engine.PipelineService#nextStepInPipeline
   * @description Moves a pipeline forward one step.
   *
   * @async
   * @param {string} pipelineId - The pipeline to move forward one step.
   */
  async nextStepInPipeline(pipelineId) {
    if (!this.getPipeline(pipelineId).isTerminal()) {
      this.getPipeline(pipelineId).nextStep();
      await this.getPipeline(pipelineId).awaitStatusChange(
        [Pipeline.STATUS.paused, Pipeline.STATUS.failed, Pipeline.STATUS.skipped, Pipeline.STATUS.successful],
      );
    } else {
      throw new ExecutionError('Pipeline: This pipeline is already finished.', 400);
    }
  }
}

// make PipelineService a singleton
const instance = new PipelineService();

Object.freeze(instance);

export {instance as default};

// handle signals
const signals = {
  'SIGINT': 2,
  'SIGTERM': 15,
};

/**
 * @function module:engine.PipelineService#shutdown
 * @description Shuts down the CIX process and kills all pipelines
 *
 * @param {string} signal - string representation of signal type
 * @param {number} value - number representation of signal type
 */
async function shutdown(signal, value) {
  // Prints out this message every 3 seconds while we shut things down.
  (function printWait() {
    log.warn(`Received ${signal} shutting down CIX, please wait...`);
    setTimeout(printWait, 3000);
  })();
  // Will force a process quit after 15seconds
  setTimeout(() => {
    log.error('Was not able to cleanly shutdown...');
    log.error('It is highly recommended you run a \'docker system prune\' to cleanup any orphaned resources.');
    NodeProvider.getProcess().exit(100 + value);
  }, 15000);

  const pipelines = instance.getPipelineList();
  for (let i = 0; i < pipelines.length; i++) {
    await instance.killPipeline(pipelines[i]);
  }
  NodeProvider.getProcess().exit(100 + value);
}

_.each(_.keys(signals), function(signal) {
  NodeProvider.getProcess().on(signal, async function() {
    await shutdown(signal, signals[signal]);
  });
});
