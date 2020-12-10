/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global  describe, expect */
import ConditionDecorator from './ConditionDecorator.js';
import Environment from '../../environment/Environment.js';
import {Provider} from '../../../common/index.js';

describe('ConditionDecorator:', () => {
  let condition;

  beforeEach(() => {
    jest.clearAllMocks();
    condition = ConditionDecorator;
  });

  test('Returns provided promiseProvider on EQ isValid.', () => {
    const payload = {
      'when': [
        {
          'operator': 'EQ',
          'value': 'foo',
          'other': 'foo',
        },
      ],
    };
    const parentNode = {'getEnvironment': () => new Environment()};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).toEqual(promiseProvider);
  });

  test('Returns SimpleProvider Promise.resolve() on EQ !isValid.', () => {
    const payload = {
      'when': [
        {
          'operator': 'EQ',
          'value': 'foo',
          'other': 'bar',
        },
      ],
    };
    const parentNode = {'getEnvironment': () => new Environment(), 'getType': () => 'Step', 'setStatus': () => undefined};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).toBeInstanceOf(Provider.SimpleProvider);
    expect(response).not.toEqual(promiseProvider);
  });

  test('Returns provided promiseProvider on EQ isValid with environment substitution.', () => {
    const payload = {
      'when': [
        {
          'operator': 'EQ',
          'value': '$$foo',
          'other': 'bar',
        },
      ],
    };
    const environment = new Environment();
    environment.addEnvironmentVariable({'name': 'foo', 'value': 'bar'});
    const parentNode = {'getEnvironment': () => environment};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).toEqual(promiseProvider);
  });

  test('Returns provided promiseProvider on EXISTS isValid.', () => {
    const payload = {
      'when': [
        {
          'operator': 'EXISTS',
          'value': 'foo',
          'values': [
            {'value': 'foo'},
            {'value': 'bar'},
          ],
        },
      ],
    };
    const parentNode = {'getEnvironment': () => new Environment()};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).toEqual(promiseProvider);
  });

  test('Returns SimpleProvider Promise.resolve() on EXISTS !isValid.', () => {
    const payload = {
      'when': [
        {
          'operator': 'EXISTS',
          'value': 'foo',
          'values': [
            {'value': 'bar'},
            {'value': 'baz'},
          ],
        },
      ],
    };
    const parentNode = {'getEnvironment': () => new Environment(), 'getType': () => 'Step', 'setStatus': () => undefined};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).toBeInstanceOf(Provider.SimpleProvider);
    expect(response).not.toEqual(promiseProvider);
  });

  test('Returns provided promiseProvider on OR isValid.', () => {
    const payload = {
      'when': [
        {
          'operator': 'OR',
          'conditions': [
            {
              'operator': 'EQ', // will succeed
              'value': 'foo',
              'other': 'foo',
            },
            {
              'operator': 'EQ', // will fail
              'value': 'foo',
              'other': 'bar',
            },
          ],
        },
      ],
    };
    const parentNode = {'getEnvironment': () => new Environment()};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).toEqual(promiseProvider);
  });

  test('Returns SimpleProvider Promise.resolve() on OR !isValid.', () => {
    const payload = {
      'when': [
        {
          'operator': 'OR',
          'conditions': [
            {
              'operator': 'EQ', // will fail
              'value': 'foo',
              'other': 'bar',
            },
            {
              'operator': 'EQ', // will fail
              'value': 'foo',
              'other': 'bar',
            },
          ],
        },
      ],
    };
    const parentNode = {'getEnvironment': () => new Environment(), 'getType': () => 'Step', 'setStatus': () => undefined};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).toBeInstanceOf(Provider.SimpleProvider);
    expect(response).not.toEqual(promiseProvider);
  });

  test('Returns SimpleProvider Promise.resolve() on OR !isValid due to missing conditions operator.', () => {
    const payload = {
      'when': [
        {
          'operator': 'OR',
          'conditions': [
            {
              'operator': 'TEST', // does not exist as operator
            },
          ],
        },
      ],
    };
    const parentNode = {'getEnvironment': () => new Environment(), 'getType': () => 'Step', 'setStatus': () => undefined};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).toBeInstanceOf(Provider.SimpleProvider);
    expect(response).not.toEqual(promiseProvider);
  });
});
