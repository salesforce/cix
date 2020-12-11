/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {CIXError} from './Errors.js';

export class Provider {
  get() {
    throw new CIXError('Not Implemented');
  }
}

export class SimpleProvider {
  constructor(obj) {
    this.obj = obj;
  }

  get() {
    return this.obj;
  }
}

export class ProviderFromFunction {
  constructor(func) {
    this.func = func;
  }

  get() {
    return this.func();
  }
}

/**
 * @function module:common.Provider#fromFunction
 *
 * @param {Function} func - function to create Provider for
 *
 * @returns {Function} provider
 */
export function fromFunction(func) {
  return new ProviderFromFunction(func);
}

/**
 * @function module:common.Provider#fromObject
 *
 * @param {object} obj - object to create Provider for
 *
 * @returns {Function} provider
 */
export function fromObject(obj) {
  return new SimpleProvider(obj);
}

/**
 * @function module:common.Provider#get
 *
 * @param {object} obj - object to get
 *
 * @returns {object} object
 */
export function get(obj) {
  if (obj instanceof Provider) {
    return obj.get();
  } else {
    return obj;
  }
}
