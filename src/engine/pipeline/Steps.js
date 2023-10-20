/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {Logger, Provider, _} from '../../common/index.js';
import Pipeline from './Pipeline.js';
import PipelineNode from './PipelineNode.js';
import Step from './Step.js';
import StepsDecorators from './decorators/StepsDecorators.js';
/**
 * @namespace Steps
 */
export default class Steps extends PipelineNode {
  /**
   * @class module:engine.Steps#constructor
   * @description Steps Constructor.
   * @param {object} definition - JSON representation of the Step group.
   * @param {string} parentItem - A reference to it's parent.
   */
  constructor(definition, parentItem) {
    super(definition, parentItem);
    this.type = 'Steps';
    this.descendants = [];
    Logger.silly(`Steps: RAW payload: ${JSON.stringify(definition, ' ', 2)}`, this.getPipeline().getId());
    if (definition.parallel) {
      this.parallel = definition.parallel;
    } else {
      this.parallel = false;
    }

    if (definition.name) {
      this.name = definition.name;
    } else {
      this.name = '';
    }

    _.forEach(definition.pipeline, (item) => {
      if (item.steps) {
        Logger.silly(`Steps: Pushing new Steps item: ${JSON.stringify(item.steps, ' ', 2)}`, this.getPipeline().getId());
        this.descendants.push(new Steps(item.steps, this));
      } else if (item.step !== undefined) {
        Logger.silly(`Steps: Pushing new Step item: ${JSON.stringify(item.step, ' ', 2)}`, this.getPipeline().getId());
        this.descendants.push(new Step(item.step, this));
      }
    });
  }

  updateDecentant(oldChild, newChild) {
    const index = this.descendants.indexOf(oldChild);

    if (index !== -1) {
      this.descendants[index] = newChild;
    }
  }

  /**
   * @function module:engine.Steps#isParallel
   * @description Returns the parallel property.
   * @returns {boolean} Whether the Steps descendants will run in parallel.
   */
  isParallel() {
    return this.parallel;
  }

  /**
   * @function module:engine.Steps#setStatus
   * @description Sets the status of all Step type descendants
   * @param {string} status - The status of the Step.
   */
  setStatus(status) {
    _.each(this.descendants, (node) => {
      node.setStatus(status);
    });
  }

  /**
   * @function module:engine.Steps#start
   * @description Starts a step grouping.
   * @async
   */
  async start() {
    while (this.getPipeline().getStatus() === Pipeline.STATUS.paused) {
      Logger.info('Pipeline is paused, waiting for status to change...', this.getPipeline().getId());
      await this.getPipeline().awaitStatusChange();
    }

    if (this.descendants && !_.isEmpty(this.descendants)) {
      let promiseProvider = Provider.fromFunction(async () => {
        if (this.parallel) {
          const currentBreakpoint = this.getPipeline().getBreakpoint();
          const descendants = this.descendants;
          if (_.find(descendants, {'name': currentBreakpoint})) {
            // Changing breakpoint scope to be the entire step.
            Logger.warn(`Target step ${this.getPipeline().getBreakpoint()} is within a parallel group. Running all grouped steps.`, this.getPipeline().getId());
            this.getPipeline().setBreakpoint(this.name);
          }
          const finished = [];
          for (let i = 0; i < this.descendants.length; i++) {
            finished[i] = this.descendants[i].start();
          }
          for (let i = 0; i < this.descendants.length; i++) {
            await finished[i];
          }
        } else {
          for (let i = 0; i < this.descendants.length; i++) {
            await this.descendants[i].start();
          }
        }
      });

      try {
        StepsDecorators.map((decorator) => {
          promiseProvider = decorator(this.definition, this, promiseProvider);
        });
        if (!_.isEmpty(this.name)) {
          Logger.info(`Starting ${this.parallel ? 'parallel' : 'serial'} step group ${this.name}`, this.getPipeline().getId());
        }
        await promiseProvider.get();
        if (!_.isEmpty(this.name)) {
          Logger.info(`Successfully completed step group ${this.definition.name}`, this.getPipeline().getId());
        }
      } catch (error) {
        if (!_.isEmpty(this.name)) {
          Logger.warn(`Failed while executing step group ${this.definition.name}`, this.getPipeline().getId());
        }
        throw error;
      }
      // pause on the execution of the next step
      if (this.getPipeline().getBreakpoint() == this.definition.name) {
        Logger.info(`Pausing pipeline after running steps ${this.definition.name}.`, this.getPipeline().getId());
        this.getPipeline().pause();
      }
      Logger.debug(`Step group ${this.name} is complete`, this.getPipeline().getId());
    }
  }
}
