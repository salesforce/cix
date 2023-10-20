/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global  describe, expect */
import {Provider} from '../../../common/index.js';
import RetryDecorator from './RetryDecorator.js';

describe('RetryDecorator tests:', () => {
  let retry;

  beforeEach(() => {
    jest.clearAllMocks();
    retry = RetryDecorator;
  });

  test('Retry works as expected if no iterations fail.', async () => {
    const payload = {'retry': {'iterations': 2, 'backoff': 1}}; // 2 iterations, 1 second backoff
    const timeoutFunc = jest.fn().mockImplementation(() => {
      return new Promise((resolve) => setTimeout(() => {
        resolve('promise completed!');
      }, 20)); // will resolve after 20 milliseconds
    });
    const promiseProvider = new Provider.fromFunction(timeoutFunc);

    await retry(payload, undefined, promiseProvider).get();
    expect(timeoutFunc.mock.calls.length).toEqual(1);
  });

  test('Retry works as expected all iterations fail.', async () => {
    const payload = {'retry': {'iterations': 2, 'backoff': 1}}; // 2 iterations, 1 second backoff
    const timeoutFunc = jest.fn().mockImplementation(() => {
      return new Promise((resolve, reject) => setTimeout(() => {
        reject(new Error('Promise rejected!'));
      }, 20)); // will reject after 20 milliseconds
    });
    const promiseProvider = new Provider.fromFunction(timeoutFunc);
    let errorCaught = false;

    try {
      await retry(payload, undefined, promiseProvider).get();
    } catch (error) {
      errorCaught = true;
    }
    expect(errorCaught).toEqual(true);
    expect(timeoutFunc.mock.calls.length).toEqual(2);
  });
});
