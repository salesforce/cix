/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {Provider, _} from '../../../common/index.js';
import log from 'winston';

export default (payload, pipelineNode, promiseProvider) => {
  if (!_.isNil(payload.loop)) {
    _.check(_.isNumeric(payload.loop), `On Step ${payload.name} loop has to be an integer.`);
    const loop = _.toInteger(payload.loop);

    return Provider.fromFunction(async () => {
      for (let i = 0; i < loop; i++) {
        log.info(`Iteration ${i + 1}/${loop} of ${payload.name}.`);
        await promiseProvider.get();
      }
    });
  }

  return promiseProvider;
};
