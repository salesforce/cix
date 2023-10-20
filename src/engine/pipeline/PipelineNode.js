/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/**
 * @namespace PipelineNode
 */
export default class PipelineNode {
  constructor(definition, parentNode) {
    if (this.constructor === PipelineNode) {
      throw new TypeError('Cannot construct Abstract PipelineNode directly');
    }
    if (this.start === PipelineNode.prototype.start) {
      throw new TypeError('Must override PipelineNode:start()');
    }
    this.parentNode = parentNode;
    this.definition = definition;
    this.errors = [];
    this.name = definition.name || '';
  }

  /**
   * @function module:engine.PipelineNode#getName
   * @description Gets the name of the pipeline node.
   * @returns {string} The name of the node.
   */
  getName() {
    return `${this.name}`;
  }

  /**
   * @function module:engine.PipelineNode#getParent
   * @description Gets the parent of the pipeline item.
   * @returns {object} A reference to the parent.
   */
  getParent() {
    return this.parentNode;
  }

  /**
   * @function module:engine.PipelineNode#getPipeline
   * @description Gets a pipeline reference.
   * @returns {object} A reference to the pipeline.
   */
  getPipeline() {
    let node = this.parentNode;
    while (true) {
      // This function walks the node chain to the highest most node - the pipeline node
      if (!node.getParent) {
        break;
      }
      node = node.getParent();
    }
    return node;
  }

  /**
   * @function module:engine.PipelineNode#getType
   * @description Gets the type of the pipeline.
   * @returns {string} The type of pipeline.
   */
  getType() {
    return this.type;
  }

  /**
   * @function module:engine.PipelineNode#getDescendants
   * @description Returns a list of steps that can be iterated through.
   * @param {boolean} includeSelf - includes itself in the result.
   * @returns {Array} The list of descendants and current node.
   */
  getDescendants(includeSelf = false) {
    const list = [];
    if (this.getType() === 'Steps') {
      if (includeSelf) {
        list.push(this);
      }
      this.descendants.forEach((descendant) => list.push(...descendant.getDescendants(true)));
    } else {
      // Step type
      list.push(this);
    }
    return list;
  }

  /**
   * @function module:engine.PipelineNode#getErrors
   * @description Returns the errors associated with this pipeline's individual steps.
   * @returns {Array} An array of strings representing any errors found in the payload.
   */
  getErrors() {
    return this.errors;
  }

  /**
   * @function module:engine.PipelineNode#getEnvironment
   * @description Returns a reference to the environment object.
   * @returns {object} A reference to the environment object.
   */
  getEnvironment() {
    return this.getPipeline().getEnvironment();
  }

  /**
   * @function module:engine.PipelineNode#getExpectedEnvironment
   * @description Returns an array of keys representing env the step expects.
   * @returns {Array} Keys of the environment variables the step can use.
   */
  getExpectedEnvironment() {
    if (this.definition && this.definition.environment) {
      const expected = [];
      this.definition.environment.forEach((envEntry) => {
        expected.push(envEntry.name);
      });
      return expected;
    }
  }

  /**
   * @function module:engine.PipelineNode#getExec
   * @description Sets a new execution runtime.
   * @returns {object} The execution runtime.
   */
  getExec() {
    return this.getPipeline().getExec();
  }

  /**
   * @function module:engine.PipelineNode#getWorkspacePath
   * @description Gets the workspace path for the pipeline.
   * @returns {string} A string representation of the workspace path.
   */
  getWorkspacePath() {
    return this.getPipeline().getWorkspacePath();
  }

  /**
   * @function module:engine.PipelineNode#getRegistries
   * @description Gets the registry information defined for the pipeline.
   * @returns {object} An object representation of the registries.
   */
  getRegistries() {
    return this.getPipeline().getRegistries();
  }

  /**
   * @function module:engine.Step#start
   * @description Starts a step.
   * @async
   */
  async start() {
    throw new TypeError('Cannot call abstract method PipelineItem:start().');
  }
}
