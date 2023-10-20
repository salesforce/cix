/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global jest, describe, expect */
import Validate from './Validate.js';
import {_} from '../../common/index.js';


jest.autoMockOff();

describe('Validate tests', () => {
  const validPipeline = {
    version: 2.1,
    pipeline: [
      {
        step: {
          name: 'basic',
          image: 'alpine:3.9',
          commands: [
            'hostname',
          ],
        },
      },
    ],
  };

  test('Valid schema returns empty list.', () => {
    expect(Validate.validatePipelineSchema(validPipeline)).toEqual([]);
  });

  test('Missing parameter results in error', () => {
    expect(Validate.validatePipelineSchema()).toMatchObject([{'message': 'must be object'}]);
  });

  test('Passing in a JSON string should result in an error.', () => {
    expect(Validate.validatePipelineSchema('{"version":2.1,"pipeline":[{"step":{"name":"basic","image":"alpine:3.9","commands":["hostname"]}}]}'))
      .toMatchObject([{'message': 'must be object'}]);
  });

  test('Missing version results in error', () => {
    const copy = _.cloneDeep(validPipeline);
    delete copy.version;
    expect(Validate.validatePipelineSchema(copy)).toMatchObject([{'message': 'must have required property \'version\''}]);
  });

  test('Missing name results in error', () => {
    const copy = _.cloneDeep(validPipeline);
    delete copy.pipeline[0].step.name;
    expect(Validate.validatePipelineSchema(copy)).toMatchObject([{'message': 'must have required property \'name\''}]);
  });

  test('Can accumulate more than one error.', () => {
    const copy = _.cloneDeep(validPipeline);
    delete copy.version;
    delete copy.pipeline[0].step.name;
    expect(Validate.validatePipelineSchema(copy).length).toBe(2);
  });

  test('Space in name causes error.', () => {
    const copy = _.cloneDeep(validPipeline);
    copy.pipeline[0].step.name = 'invalid name';
    expect(Validate.validatePipelineSchema(copy)).toMatchObject([{'message': 'must match pattern \"^[a-zA-Z0-9][a-zA-Z0-9_.-]*$\"'}]);
  });

  test('Really long name causes error.', () => {
    const copy = _.cloneDeep(validPipeline);
    copy.pipeline[0].step.name = 'this-is-a-very-long-step-name-it-should-not-be-over-64-characters';
    expect(Validate.validatePipelineSchema(copy)).toMatchObject([{'message': 'must NOT have more than 64 characters'}]);
  });
});
