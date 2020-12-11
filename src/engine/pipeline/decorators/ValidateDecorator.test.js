/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global  describe, expect */
import Pipeline from '../Pipeline.js';
import Step from '../Step.js';
import ValidateDecorator from './ValidateDecorator.js';

describe('ValidateDecorator:', () => {
  let validate;
  const emptyPipeline = new Pipeline({rawPipeline: []});


  beforeEach( () => {
    jest.clearAllMocks();
    validate = ValidateDecorator;
  });

  test('Expect not to throw on valid Step.', () => {
    const step = new Step({
      name: 'basic',
      image: 'alpine:3.9',
      commands: ['hostname'],
    }, emptyPipeline);
    const promiseProvider = 'test';

    expect(() => validate(undefined, step, promiseProvider)).not.toThrow();
  });

  test('Expect to throw on invalid Step.', () => {
    const step = new Step({
      name: 'basic',
      image: 'alpine:3.9',
      commands: ['hostname'],
      retry: {
        iterations: -1,
        backoff: 10,
      },
    }, emptyPipeline);
    const promiseProvider = 'test';

    expect(() => validate(undefined, step, promiseProvider)).toThrow('Yaml: step retry iterations value must be greater than 1 (actual value: -1): basic');
  });
});
