/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {Provider, _} from '../../../common/index.js';
import log from 'winston';


export default (payload, pipelineNode, promiseProvider) => {
  if (!_.isNil(payload.retry)) {
    _.check(_.isNumeric(payload.retry.iterations), `On Step ${payload.name} retry requires iterations field to be set.`);
    _.check(_.isNumeric(payload.retry.backoff), `On Step ${payload.name} retry requires backoff field to be set.`);

    const iterations = _.toInteger(payload.retry.iterations);
    const backoff = _.toInteger(payload.retry.backoff);

    return Provider.fromFunction(async () => {
      for (let i = 0; i < iterations; i++) {
        try {
          await promiseProvider.get();
          break;
        } catch (error) {
          log.warn(`Iteration ${i + 1}/${iterations} for ${payload.name} failed.`);
          log.debug(`${error}`);
          if ((i + 1) !== iterations) {
            await new Promise((resolve) => setTimeout(resolve, backoff * 1000));
          } else {
            throw error;
          }
        }
      }
    });
  } else {
    return promiseProvider;
  }
};
