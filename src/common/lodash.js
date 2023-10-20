/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {CIXError, ValidateError} from './Errors.js';
import {fetch, relativePath} from './loaders/index.js';
import {Logger} from './index.js';
import _ from 'lodash';
import yaml from 'js-yaml';

/**
 * @namespace lodash
 */
_.map({
  /**
   * @function module:common.lodash#check
   * @param {boolean} value value to check
   * @param {string} message message
   */
  check(value, message) {
    if (value !== true) {
      throw new CIXError(message || 'Value is not true!');
    }
  },

  isNumeric(value) {
    return !_.isNaN(value);
  },

  /**
   * @function module:common.lodash#emptyToNull
   * @param {string} value value to check
   * @returns {string} value or null if value is empty
   */
  emptyToNull(value) {
    const trimmed = _.trim(value);

    return _.isEmpty(trimmed) ? null : trimmed;
  },

  /**
   * @function module:common.lodash#getOnlyElement
   * @param {Array} collection collection to get the first element of
   * @returns {object} first element of the array
   * @throws {Error} If collection is not an array and doesn't only have a single element
   */
  getOnlyElement(collection) {
    if (!_.isArray(collection)) {
      throw new CIXError('Collection has to be an array!');
    }

    const size = _.size(collection);

    if (size === 1) {
      return _.first(collection);
    } else if (size === 0) {
      throw new CIXError('Empty collection, while expecting one element!');
    } else {
      throw new CIXError('Expecting one element, got more!');
    }
  },

  /**
   * @function module:common.lodash#getUniqueDuplicates
   * @param {Array} collection collection to get all unique duplicates
   * @returns {Array} array of unique objects in the collection
   */
  getUniqueDuplicates(collection) {
    return _.uniq(_.filter(collection, (val, i, iter) => _.includes(iter, val, i + 1)));
  },

  /**
   * @function module:common.lodash#relativePath
   * @param {string} path - path being accessed
   * @param {object} environment - representation of the environment passed
   * @param {object} definition - representation of the pipeline
   * @returns {string} relative path
   */
  relativePath(path, environment, definition) {
    return relativePath(path, environment, definition);
  },

  // eslint-disable-next-line no-unused-vars
  /**
   * @function module:common.lodash#fetch
   * @param {string} path - path being accessed
   * @param {object} environment - representation of the environment passed
   * @param {string} httpAuthToken - (optional) provides authentication for fetch
   * @returns {object} yaml
   */
  fetch(path, environment, httpAuthToken) {
    return fetch(path, environment, httpAuthToken);
  },

  /**
   * @function module:common.Loader#loadYamlOrJson
   * @param {string} input - relative or absolute path
   * @param {string} optionalEncoding - optional encoding by which to read the yaml file, defaults to 'utf-8'
   * @returns {object|undefined} the json representation of the yaml
   */
  loadYamlOrJson(input, optionalEncoding) {
    const encoding = optionalEncoding || 'utf-8';
    try {
      return yaml.load(input, encoding);
    } catch (error) {
      Logger.warn(`${error}`);
      throw new ValidateError('Failed to parse YAML/JSON.');
    }
  },

  /**
   * Returns a string of random characters consisting if 0-9, A-Z, a-z.
   * @function module:common.lodash#randomString
   * @param {number} len - desired length of the string
   * @returns {string} the random string
   */
  randomString(len) {
    let s = '';

    const randomChar = function() {
      const n = _.random(61);

      if (n < 10) {
        return n;
      } else if (n < 36) {
        return String.fromCharCode('A'.charCodeAt(0) + n - 10);
      } else {
        return String.fromCharCode('a'.charCodeAt(0) + n - 36);
      }
    };

    while (len--) {
      s += randomChar();
    }

    return s;
  },
}, (value, key) => {
  _.mixin({
    [key]: value,
  });
});

export default _;
