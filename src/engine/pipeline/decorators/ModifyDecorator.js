/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {_} from '../../../common/index.js';

export default (payload, pipelineNode, promiseProvider) => {
  modifyStep(payload, pipelineNode.getEnvironment());

  return promiseProvider;
};

/**
 * Returns a step with additional properties provided by cli
 *
 * @function module:cix-yaml.Payload#getPayloadPromise
 * @param {object} payload - json Object to add properties to
 * @param {object} environment - object of environment variables
 *
 * @returns {object} json Object representation of a payload
 */
export function modifyStep(payload, environment) {
  if (payload.arguments) {
    payload.arguments = _.map(payload.arguments, (arg) => environment.replace$$Values(arg));
  }

  // load the environment variables and secrets into the environment of the payload
  if (_.isNil(payload.environment)) {
    payload.environment = [];
  }

  payload.environment = _.map(payload.environment, (env) => {
    let replacementValue = environment.replace$$Values(env.value);

    if (env.value && typeof env.value === 'string' && env.value.includes('$$') && env.value === replacementValue) {
      replacementValue = environment.replace$$Values(env.default);
    }

    return {name: env.name, value: replacementValue};
  });

  if (payload.hostname) {
    payload.hostname = environment.replace$$Values(payload.hostname);
  }

  // load the environment variables and secrets into image/retry/loop/timeout values of payload
  if (payload.image) {
    payload.image = environment.replace$$Values(payload.image);
  }

  if (payload.loop) {
    payload.loop = environment.replace$$Values(payload.loop);
  }

  if (payload.ports) {
    payload.ports = _.map(payload.ports, (port) => environment.replace$$Values(port));
  }

  if (payload.retry) {
    payload.retry.iterations = environment.replace$$Values(payload.retry.iterations);
    payload.retry.backoff = environment.replace$$Values(payload.retry.backoff);
  }

  if (payload.timeout) {
    payload.timeout = environment.replace$$Values(payload.timeout);
  }

  payload.volumes = _.map(payload.volumes, (volume) => environment.replace$$Values(volume));

  return payload;
}
