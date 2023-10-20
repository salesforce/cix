/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global  describe, expect */
import ContinueOnFailDecorator from './ContinueOnFailDecorator.js';
import {Provider} from '../../../common/index.js';

describe('ConditionDecorator:', () => {
  let continueOnFail;

  beforeEach(() => {
    jest.clearAllMocks();
    continueOnFail = ContinueOnFailDecorator;
  });

  test('Step will skip continue-on-fail logic if not set.', () => {
    const payload = {
      'name': 'test',
    };
    const promiseProvider = 'test';

    const response = continueOnFail(payload, undefined, promiseProvider);
    expect(response).toEqual(promiseProvider);
  });

  test('Step will skip continue-on-fail logic if set to false.', () => {
    const payload = {
      'name': 'test',
      'continue-on-fail': false,
    };
    const promiseProvider = 'test';

    const response = continueOnFail(payload, undefined, promiseProvider);
    expect(response).toEqual(promiseProvider);
  });

  test('Step will continue-on-fail if no failure.', () => {
    const payload = {
      'name': 'test',
      'continue-on-fail': true,
    };

    const testFunc = jest.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolve();
      });
    });

    continueOnFail(payload, undefined, new Provider.fromFunction(testFunc)).get();
    expect(testFunc.mock.calls.length).toEqual(1);
  });

  test('Step will continue-on-fail if failure.', () => {
    const payload = {
      'name': 'test',
      'continue-on-fail': true,
    };

    const testFunc = jest.fn().mockImplementation(() => {
      return new Promise((resolve, reject) => {
        reject(new Error('Some Error'));
      });
    });

    continueOnFail(payload, undefined, new Provider.fromFunction(testFunc)).get();
    expect(testFunc.mock.calls.length).toEqual(1);
  });
});
