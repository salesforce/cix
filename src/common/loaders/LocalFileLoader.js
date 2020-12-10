/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {PROTOCOLS, getProtocol} from './Protocols.js';
import AbstractLoader from './AbstractLoader.js';
import NodeProvider from '../NodeProvider.js';
import Path from 'path';
import {ValidateError} from '../Errors.js';
import log from 'winston';


export default class LocalFileLoader extends AbstractLoader {
  constructor() {
    super([PROTOCOLS.DEFAULT]);
  }

  relativePath(path, environment, definition) {
    const targetProtocol = getProtocol(definition.src);

    if (targetProtocol === PROTOCOLS.DEFAULT) {
      return Path.normalize(`${Path.dirname(path)}/${definition.src}`);
    } else {
      return LOADERS[targetProtocol].relativePath(path, environment, definition);
    }
  }

  // eslint-disable-next-line no-unused-vars
  fetch(path, environment) {
    try {
      return NodeProvider.getFs().readFileSync(path);
    } catch (error) {
      log.debug(`${error}`);
      throw new ValidateError(`Failed to load file: ${path}`);
    }
  }
}

