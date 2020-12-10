/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import HTTPLoader from './HTTPLoader.js';
import LocalFileLoader from './LocalFileLoader.js';
import _ from 'lodash';
import {getProtocol} from './Protocols.js';

/**
 * @function module:common.Loader#relativePath
 *
 * @param {string} path - path being accessed
 * @param {object} environment - representation of the environment passed
 * @param {object} definition - representation of the pipeline
 *
 * @returns {string} relative path
 */
export function relativePath(path, environment, definition) {
  return LOADERS[getProtocol(path)].relativePath(path, environment, definition);
}

// eslint-disable-next-line no-unused-vars
/**
 * @function module:common.Loader#fetch
 *
 * @param {string} path - path being accessed
 * @param {object} environment - representation of the environment passed
 *
 * @returns {object} yaml
 */
export function fetch(path, environment) {
  return LOADERS[getProtocol(path)].fetch(path, environment);
}

const LOADERS = {};

_.map([new LocalFileLoader(), new HTTPLoader()], (loader) => {
  _.map(loader.getProtocols(), (protocol) => {
    LOADERS[protocol] = loader;
  });
});
