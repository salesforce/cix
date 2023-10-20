/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global jest, describe, test, beforeEach, expect */
import Environment from './Environment.js';
// const Environment = require('./Environment.js');
jest.autoMockOff();

describe('Environment add/remove/list', () => {
  let env;

  beforeEach(() => {
    env = new Environment();
  });

  test('addEnvironmentVariable should add a variable.', () => {
    const testName = 'test'; const testValue = '1234'; const testVar = {name: testName, value: testValue};
    env.addEnvironmentVariable(testVar);
    expect(env.getEnvironmentVariable(testName)).toEqual(testVar);
  });

  test('getting value that does not exist returns undefined.', () => {
    expect(env.getEnvironmentVariable('ghost')).toEqual(undefined);
  });

  test('second addEnvironmentVariable replaces.', () => {
    const testName = 'test'; const testValue = '1234'; const testVar = {name: testName, value: testValue};
    const testValue2 = '5678'; const testVar2 = {name: testName, value: testValue2};
    env.addEnvironmentVariable(testVar);
    env.addEnvironmentVariable(testVar2);
    expect(env.getEnvironmentVariable(testName)).toEqual(testVar2);
  });

  test('list environment variables.', () => {
    const testName = 'test'; const testValue = '1234'; const testVar = {name: testName, value: testValue};
    const testName2 = 'test2'; const testVar2 = {name: testName2, value: testValue};
    env.addEnvironmentVariable(testVar);
    env.addEnvironmentVariable(testVar2);
    expect(env.listEnvironmentVariables()).toEqual([testName, testName2]);
  });
});

describe('Environment replace$$Values', () => {
  let env;

  beforeEach(() => {
    env = new Environment();
  });

  test('should replace $$ value in string by itself', () => {
    env.addEnvironmentVariable({name: 'FOO', value: 'foo'});
    const replacement = env.replace$$Values('$$FOO');

    expect(replacement).toEqual('foo');
  });

  test('should replace repeated $$ values in string', () => {
    env.addEnvironmentVariable({name: 'FOO', value: 'foo'});
    const replacement = env.replace$$Values('$$FOO$$FOO');

    expect(replacement).toEqual('foofoo');
  });

  test('should replace multiple $$ values in string', () => {
    env.addEnvironmentVariable({name: 'FOO', value: 'foo'});
    env.addEnvironmentVariable({name: 'BAR', value: 'bar'});
    const replacement = env.replace$$Values('$$FOO$$BAR');

    expect(replacement).toEqual('foobar');
  });

  test('should not replace $$ values when not a full match', () => {
    env.addEnvironmentVariable({name: 'FOO', value: 'foo'});
    const replacement = env.replace$$Values('$$FOO$$FOO_BAR');

    expect(replacement).toEqual('foo$$FOO_BAR');
  });

  test('should not replace values when not preceded by $$', () => {
    env.addEnvironmentVariable({name: 'FOO', value: 'foo'});
    const replacement = env.replace$$Values('FOO');

    expect(replacement).toEqual('FOO');
  });

  test('should not expand $FOOBAR when $FOO is defined', () => {
    env.addEnvironmentVariable({name: 'FOO', value: 'foo'});
    const replacement = env.replace$$Values('$$FOOBAR');

    expect(replacement).toEqual('$$FOOBAR');
  });
});


describe('Environment redactSecrets', () => {
  let env;

  beforeEach(() => {
    env = new Environment();
  });

  test('should redact a secrets', () => {
    env.addEnvironmentVariable({name: 'FOO', value: 'foo', type: 'secret'});
    const replacement = env.redactSecrets('foo');

    expect(replacement).toEqual('********');
  });
});
