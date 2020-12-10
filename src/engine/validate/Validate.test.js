/*
* Copyright (c) 2020, salesforce.com, inc.
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
    expect(Validate.validatePipelineSchema()).toMatchObject([{'message': 'should be object'}]);
  });

  test('Passing in a JSON string should result in an error.', () => {
    expect(Validate.validatePipelineSchema('{"version":2.1,"pipeline":[{"step":{"name":"basic","image":"alpine:3.9","commands":["hostname"]}}]}'))
      .toMatchObject([{'message': 'should be object'}]);
  });

  test('Missing version results in error', () => {
    const copy = _.cloneDeep(validPipeline);
    delete copy.version;
    expect(Validate.validatePipelineSchema(copy)).toMatchObject([{'message': 'should have required property \'version\''}]);
  });

  test('Missing name results in error', () => {
    const copy = _.cloneDeep(validPipeline);
    delete copy.pipeline[0].step.name;
    expect(Validate.validatePipelineSchema(copy)).toMatchObject([{'message': 'should have required property \'name\''}]);
  });

  test('Can accumulate more than one error.', () => {
    const copy = _.cloneDeep(validPipeline);
    delete copy.version;
    delete copy.pipeline[0].step.name;
    expect(Validate.validatePipelineSchema(copy).length).toBe(2);
  });
});
