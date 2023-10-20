/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import fs from 'fs';
class NodeProvider {
  /**
   * @function module:common.NodeProvider#readScript
   * @description Provides process object for easier testability.
   * @returns {process} process object.
   */
  getProcess() {
    return process;
  }

  /**
   * @function module:cix-common.NodeProvider#readScript
   * @description Provides process object for easier testability.
   * @returns {process} process object.
   */
  getFs() {
    return fs;
  }
}

export default new NodeProvider();
