/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {PROTOCOLS, getProtocol} from './Protocols.js';
import AbstractLoader from './AbstractLoader.js';
import Path from 'path';
import {ValidateError} from '../Errors.js';
import axios from 'axios';
import https from 'https';
import log from 'winston';

export default class HTTPLoader extends AbstractLoader {
  constructor() {
    super([PROTOCOLS.HTTP, PROTOCOLS.HTTPS]);
  }

  relativePath(path, environment, definition) {
    const targetProtocol = getProtocol(definition.src);

    if (targetProtocol === PROTOCOLS.DEFAULT) {
      const url = new URL(path);

      url.pathname = Path.normalize(`${Path.dirname(url.pathname)}/${definition.src}`);
      return url.href;
    } else {
      return definition.src;
    }
  }

  async fetch(path, environment) {
    const headers = {
      'User-Agent': 'CIX',
    };

    let token = environment.getEnvironmentVariable('__IMPORT_YAML_DEFINITION__.http_authorization_token') ||
                environment.getEnvironmentVariable('HTTP_AUTHORIZATION_TOKEN');

    if (token && token.value) {
      token = environment.replace$$Values(token.value);
    } else {
      token = undefined;
    }

    if (token) {
      headers['Authorization'] = `token ${token}`;
      log.debug(`Fetching ${path} with authorization tokens.`);
    } else {
      log.debug(`Fetching ${path} without authorization tokens.`);
    }

    try {
      const resp = await axios({
        'method': 'GET',
        'url': path,
        'headers': headers,
        'httpsAgent': new https.Agent({
          rejectUnauthorized: false,
        }),
      });
      return resp.data;
    } catch (error) {
      log.error(`${error}`);
      throw new ValidateError(`Unable to import HTTPS path ${path}`);
    }
  }
}
