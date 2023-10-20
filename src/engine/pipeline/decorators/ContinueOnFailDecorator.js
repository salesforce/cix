/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {Logger, Provider, _} from '../../../common/index.js';


export default (payload, pipelineNode, promiseProvider) => {
  if (!_.isNil(payload['continue-on-fail']) && payload['continue-on-fail'] === true) {
    return Provider.fromFunction(async () => {
      try {
        await promiseProvider.get();
      } catch (error) {
        Logger.warn(`Step '${payload.name}' failed, but it is continue-on-fail.`, pipelineNode?.getPipeline?.().getId());
        Logger.debug(`${error}`, pipelineNode?.getPipeline?.().getId());
      }
    });
  } else {
    return promiseProvider;
  }
};
