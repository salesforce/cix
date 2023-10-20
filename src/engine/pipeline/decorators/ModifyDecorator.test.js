/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global  describe, expect */
import Environment from '../../environment/Environment.js';
import ModifyDecorator from './ModifyDecorator.js';

describe('ModifyDecorator:', () => {
  let modify;

  beforeEach(() => {
    jest.clearAllMocks();
    modify = ModifyDecorator;
  });

  test('Payload is modified no provided environment.', () => {
    const payload = {};
    const expected = {
      'environment': [],
      'volumes': [],
    };
    const parentNode = {'getEnvironment': () => new Environment()};

    modify(payload, parentNode, undefined);
    expect(payload).toEqual(expected);
  });

  test('Payload is modified with environment substitutions, and default.', () => {
    const payload = {
      'environment': [
        {
          'name': 'foo',
          'value': '$$foo',
        },
        {
          'name': 'bar',
          'value': '$$bar',
          'default': 'bar',
        },
      ],
    };
    const expected = {
      'environment': [
        {
          'name': 'foo',
          'value': 'foo',
        },
        {
          'name': 'bar',
          'value': 'bar', // default provided above
        },
      ],
      'volumes': [],
    };
    const environment = new Environment();
    environment.addEnvironmentVariable({'name': 'foo', 'value': 'foo'});

    const parentNode = {'getEnvironment': () => environment};

    modify(payload, parentNode, undefined);
    expect(payload).toEqual(expected);
  });

  test('Payload is modified with environment if environment only specifies name', () => {
    const payload = {
      'environment': [
        {
          'name': 'foo',
        },
        {
          'name': 'bar',
          'default': 'default_bar',
        },
      ],
    };
    const expected = {
      'environment': [
        {
          'name': 'foo',
          'value': 'foo',
        },
        {
          'name': 'bar',
          'value': 'default_bar', // default provided above
        },
      ],
      'volumes': [],
    };
    const environment = new Environment();
    environment.addEnvironmentVariable({'name': 'foo', 'value': 'foo'});

    const parentNode = {'getEnvironment': () => environment};

    modify(payload, parentNode, undefined);
    expect(payload).toEqual(expected);
  });

  test('Payload is modified with retry substitutions.', () => {
    const payload = {
      'retry': {
        'iterations': '$$iterations',
        'backoff': '$$backoff',
      },
    };
    const expected = {
      'environment': [],
      'retry': {
        'iterations': '2',
        'backoff': '10',
      },
      'volumes': [],
    };
    const environment = new Environment();
    environment.addEnvironmentVariable({'name': 'iterations', 'value': '2'});
    environment.addEnvironmentVariable({'name': 'backoff', 'value': '10'});

    const parentNode = {'getEnvironment': () => environment};

    modify(payload, parentNode, undefined);
    expect(payload).toEqual(expected);
  });

  test('Payload is modified with loop substitutions.', () => {
    const payload = {
      'loop': '$$loops',
    };
    const expected = {
      'environment': [],
      'loop': '10',
      'volumes': [],
    };
    const environment = new Environment();
    environment.addEnvironmentVariable({'name': 'loops', 'value': '10'});

    const parentNode = {'getEnvironment': () => environment};

    modify(payload, parentNode, undefined);
    expect(payload).toEqual(expected);
  });

  test('Payload is modified with timeout substitutions.', () => {
    const payload = {
      'timeout': '$$timeout',
    };
    const expected = {
      'environment': [],
      'timeout': '10',
      'volumes': [],
    };
    const environment = new Environment();
    environment.addEnvironmentVariable({'name': 'timeout', 'value': '10'});

    const parentNode = {'getEnvironment': () => environment};

    modify(payload, parentNode, undefined);
    expect(payload).toEqual(expected);
  });

  test('Payload is modified with hostname substitutions.', () => {
    const payload = {
      'hostname': '$$hostname',
    };
    const expected = {
      'environment': [],
      'hostname': 'localhost',
      'volumes': [],
    };
    const environment = new Environment();
    environment.addEnvironmentVariable({'name': 'hostname', 'value': 'localhost'});

    const parentNode = {'getEnvironment': () => environment};

    modify(payload, parentNode, undefined);
    expect(payload).toEqual(expected);
  });

  test('Payload is modified with ports substitutions.', () => {
    const payload = {
      'ports': [
        '80:80',
        '1800:$$port',
      ],
    };
    const expected = {
      'environment': [],
      'ports': [
        '80:80',
        '1800:1800',
      ],
      'volumes': [],
    };
    const environment = new Environment();
    environment.addEnvironmentVariable({'name': 'port', 'value': '1800'});

    const parentNode = {'getEnvironment': () => environment};

    modify(payload, parentNode, undefined);
    expect(payload).toEqual(expected);
  });


  test('Payload is modified with arguments substitutions.', () => {
    const payload = {
      'arguments': [
        'param1',
        '$$param_name',
      ],
    };
    const expected = {
      'environment': [],
      'arguments': [
        'param1',
        'param2',
      ],
      'volumes': [],
    };
    const environment = new Environment();
    environment.addEnvironmentVariable({'name': 'param_name', 'value': 'param2'});

    const parentNode = {'getEnvironment': () => environment};

    modify(payload, parentNode, undefined);
    expect(payload).toEqual(expected);
  });
});
