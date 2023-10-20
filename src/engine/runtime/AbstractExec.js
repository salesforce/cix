/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* eslint-disable */
export default class AbstractExec {
  constructor() {
    if (this.constructor === AbstractExec) {
      throw new TypeError('Cannot construct abstract class.');
    }

    if (this.init === AbstractExec.prototype.init) {
      throw new TypeError('Please implement abstract method init.');
    }

    if (this.runStep === AbstractExec.prototype.runStep) {
      throw new TypeError('Please implement abstract method runStep.');
    }

    if (this.tearDown === AbstractExec.prototype.tearDown) {
      throw new TypeError('Please implement abstract method tearDown.');
    }
  }

  /**
   * Runs a preprocessor. Init is not required.
   *
   * @async
   *
   * @param {string} image - image name to use as preprocessor
   * @param {string} input - input to the preprocessor (format unknown, non-validated)
   *
   * @returns {string} output from the preprocessor, a valid cix yaml/json
   */
  runPreprocessor(image, input) {
    throw new TypeError('Do not call abstract method init.');
  }

  /**
   * Create the container manager.
   *
   * @async
   *
   * @param {object} pipeline - pipeline objects
   */
  init(pipeline) {
    throw new TypeError('Do not call abstract method init.');
  }

  /**
   * Run a pipeline step (i.e., container).
   *
   * @async
   *
   * @param {object} stepDefinition - a step
   */
  runStep(stepDefinition) {
    throw new TypeError('Do not call abstract method runStep.');
  }

  /**
   * Tear down the container manager.
   *
   * @async
   */
  tearDown() {
    throw new TypeError('Do not call abstract method tearDown.');
  }
}
