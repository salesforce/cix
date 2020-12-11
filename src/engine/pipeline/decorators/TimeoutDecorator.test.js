/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global  describe, expect */
import {Provider} from '../../../common/index.js';
import TimeoutDecorator from './TimeoutDecorator.js';

describe('TimeoutDecorator tests:', () => {
  let timeout;

  beforeEach(() => {
    jest.clearAllMocks();
    timeout = TimeoutDecorator;
  });

  test('Function provided does not timeout if it completes before timeout provided.', async () => {
    const payload = {'timeout': '1'}; // 1 second timeout
    const timeoutFunc = () => {
      return new Promise((resolve) => setTimeout(() => {
        resolve('promise completed!');
      }, 20)); // will resolve after 20 milliseconds
    };
    const promiseProvider = new Provider.fromFunction(timeoutFunc);

    const response = timeout(payload, undefined, promiseProvider).get();
    await expect(response).resolves.toEqual('promise completed!');
  });

  test('Function provided times out if it does not complete before timeout provided.', async () => {
    const payload = {'timeout': '1'}; // 1 second timeout
    const timeoutFunc = () => {
      return new Promise((resolve) => setTimeout(() => {
        resolve('promise completed!');
      }, 2000)); // will resolve after 2 seconds
    };
    const promiseProvider = new Provider.fromFunction(timeoutFunc);

    const response = timeout(payload, undefined, promiseProvider).get();
    await expect(response).rejects.toEqual(new Error('Step NoName timed out after 1 seconds'));
  });
});
