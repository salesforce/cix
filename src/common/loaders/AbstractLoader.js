/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {ExecutionError} from '../Errors.js';

export default class AbstractLoader {
  constructor(protocols) {
    this.protocols = protocols;
  }

  getProtocols() {
    return this.protocols;
  }
  // eslint-disable-next-line no-unused-vars
  relativePath(path, environment, definition) {
    throw new ExecutionError('Not Implemented.');
  }

  // eslint-disable-next-line no-unused-vars
  fetch(path, environment, httpAuthToken) {
    throw new ExecutionError('Not Implemented.');
  }
}
