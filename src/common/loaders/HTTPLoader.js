/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {PROTOCOLS, getProtocol} from './Protocols.js';
import AbstractLoader from './AbstractLoader.js';
import {ExecutionError} from '../Errors.js';
import {Logger} from '../index.js';
import Path from 'path';
import axios from 'axios';
import https from 'https';

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

  async fetch(path, environment, httpAuthToken) {
    const headers = {
      'User-Agent': 'CIX',
    };

    const envHttpAuthToken = environment.getEnvironmentVariable('HTTP_AUTHORIZATION_TOKEN');

    // warn if user supplies both YAML based and environment based tokens
    if (httpAuthToken && envHttpAuthToken && envHttpAuthToken.value) {
      Logger.warn('Both the secret HTTP_AUTHORIZATION_TOKEN and the YAML attribute http-authorization-token were supplied.');
      Logger.warn('Using the YAML attribute http-authorization-token as the auth token.');
    }

    // httpAuthToken (from YAML) has precedence over envHttpAuthToken (from environment)
    if (httpAuthToken) {
      headers['Authorization'] = `token ${environment.replace$$Values(httpAuthToken)}`;
      Logger.debug(`Fetching ${path} with authorization token set in the YAML.`);
    } else if (envHttpAuthToken && envHttpAuthToken.value) {
      headers['Authorization'] = `token ${environment.replace$$Values(envHttpAuthToken.value)}`;
      Logger.debug(`Fetching ${path} with authorization token set in the Environment.`);
    } else {
      Logger.warn(`Fetching ${path} without authorization tokens.`);
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
      Logger.error(`${error}`);
      throw new ExecutionError(`Unable to import HTTPS path ${path}`);
    }
  }
}
