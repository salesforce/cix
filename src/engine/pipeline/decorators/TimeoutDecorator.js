/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {ExecutionError, Provider, _} from '../../../common/index.js';

export default (payload, pipelineNode, promiseProvider) => {
  if (!_.isNil(payload.timeout)) {
    _.check(_.isNumeric(payload.timeout), `On Step ${payload.name} timeout has to be an integer.`);

    return Provider.fromFunction(() => {
      return new Promise(async (resolve, reject) => {
        setTimeout(() => {
          reject(new ExecutionError(`Step ${payload.name || 'NoName'} timed out after ${payload.timeout} seconds`));
        }, _.toInteger(payload.timeout) * 1000);
        try {
          const result = await promiseProvider.get();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  return promiseProvider;
};
