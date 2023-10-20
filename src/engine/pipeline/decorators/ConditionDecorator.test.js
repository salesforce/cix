/*
* Copyright (c) 2022, salesforce.com, inc.
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

  test('Returns provided promiseProvider on AND isValid.', () => {
    const payload = {
      'when': [
        {
          'operator': 'AND',
          'conditions': [
            {
              'operator': 'EQ', // will succeed
              'value': 'foo',
              'other': 'foo',
            },
            {
              'operator': 'EQ', // will succeed
              'value': 'bar',
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

  test('Returns SimpleProvider Promise.resolve() on AND !isValid.', () => {
    const payload = {
      'when': [
        {
          'operator': 'AND',
          'conditions': [
            {
              'operator': 'EQ', // will fail
              'value': 'foo',
              'other': 'bar',
            },
            {
              'operator': 'EQ', // will succeed
              'value': 'bar',
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

  test('Returns provided promiseProvider on STARTS_WITH isValid.', () => {
    const payload = {
      'when': [
        {
          'operator': 'STARTS_WITH',
          'value': 'foobar',
          'other': 'foo',
        },
      ],
    };
    const parentNode = {'getEnvironment': () => new Environment()};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).toEqual(promiseProvider);
  });

  test('Returns provided promiseProvider on STARTS_WITH !isValid.', () => {
    const payload = {
      'when': [
        {
          'operator': 'STARTS_WITH',
          'value': 'notfoobar',
          'other': 'foo',
        },
      ],
    };
    const parentNode = {'getEnvironment': () => new Environment(), 'getType': () => 'Step', 'setStatus': () => undefined};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).toBeInstanceOf(Provider.SimpleProvider);
    expect(response).not.toEqual(promiseProvider);
  });

  test('Returns provided promiseProvider on ENDS_WITH isValid.', () => {
    const payload = {
      'when': [
        {
          'operator': 'ENDS_WITH',
          'value': 'foobar',
          'other': 'bar',
        },
      ],
    };
    const parentNode = {'getEnvironment': () => new Environment()};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).toEqual(promiseProvider);
  });

  test('Returns provided promiseProvider on ENDS_WITH !isValid.', () => {
    const payload = {
      'when': [
        {
          'operator': 'ENDS_WITH',
          'value': 'foobarnot',
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

  test('Returns provided promiseProvider on MATCHES with CSV isValid.', () => {
    const payload = {
      'when': [
        {
          'operator': 'MATCHES',
          'value': 'afalko/main-244',
          'expressions': 'foo,bar,afalko/main-\\d+',
        },
      ],
    };
    const parentNode = {'getEnvironment': () => new Environment(), 'getType': () => 'Step', 'setStatus': () => undefined};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).toEqual(promiseProvider);
  });

  test('Returns provided promiseProvider on MATCHES with space delimiter isValid.', () => {
    const payload = {
      'when': [
        {
          'operator': 'MATCHES',
          'value': 'afalko/main-244',
          'expressions': 'foo bar afalko/main-\\d+',
          'delimiter': ' ',
        },
      ],
    };
    const parentNode = {'getEnvironment': () => new Environment(), 'getType': () => 'Step', 'setStatus': () => undefined};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).toEqual(promiseProvider);
  });

  test('Returns provided promiseProvider on MATCHES with wrong delimiter !isValid.', () => {
    const payload = {
      'when': [
        {
          'operator': 'MATCHES',
          'value': 'afalko/main-244',
          'expressions': 'foo bar afalko/main-\\d+',
          'delimiter': '|',
        },
      ],
    };
    const parentNode = {'getEnvironment': () => new Environment(), 'getType': () => 'Step', 'setStatus': () => undefined};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).not.toEqual(promiseProvider);
  });

  test('Returns provided promiseProvider on MATCHES !isValid.', () => {
    const payload = {
      'when': [
        {
          'operator': 'MATCHES',
          'value': 'foo,bar,release_*',
          'expressions': 'releases',
        },
      ],
    };
    const parentNode = {'getEnvironment': () => new Environment(), 'getType': () => 'Step', 'setStatus': () => undefined};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).toBeInstanceOf(Provider.SimpleProvider);
    expect(response).not.toEqual(promiseProvider);
  });

  test('Returns promiseProvider on MATCHES when valid .', () => {
    const payload = {
      'when': [
        {
          'operator': 'MATCHES',
          'value': 'test/mainmainmain',
          'expressions': 'foo,bar,test/[main]*',
        },
      ],
    };
    const parentNode = {'getEnvironment': () => new Environment(), 'getType': () => 'Step', 'setStatus': () => undefined};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).toEqual(promiseProvider);
  });


  test('Returns promiseProvider on NOT_MATCHES when valid .', () => {
    const payload = {
      'when': [
        {
          'operator': 'NOT_MATCHES',
          'value': 'test/mainmainmain',
          'expressions': 'foo,bar,test/[main]*',
        },
      ],
    };
    const parentNode = {'getEnvironment': () => new Environment(), 'getType': () => 'Step', 'setStatus': () => undefined};
    const promiseProvider = 'test';

    const response = condition(payload, parentNode, promiseProvider);
    expect(response).not.toEqual(promiseProvider);
  });
});
