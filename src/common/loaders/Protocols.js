/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import _ from 'lodash';

export const PROTOCOLS = {
  DEFAULT: 'default',
  HTTP: 'http:', // These values map to urlParserLax and URL protocols
  HTTPS: 'https:', // These values map to urlParserLax and URL protocols
};

/**
 * @function module:common.Loader#getProtocol
 *
 * @param {string} path - url being accessed
 *
 * @returns {string} Representation of the protocol being used
 */
export function getProtocol(path) {
  const lowerCasePath = path.toLowerCase();

  if (_.startsWith(lowerCasePath, 'https:')) {
    return PROTOCOLS.HTTPS;
  } else if (_.startsWith(lowerCasePath, 'http:')) {
    return PROTOCOLS.HTTP;
  } else {
    return PROTOCOLS.DEFAULT;
  }
}
