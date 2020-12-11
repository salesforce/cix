/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeEach, describe, expect */
import Validate from './Validate.js';

describe('Validate.action', () => {
  let validate;

  beforeEach(() => {
    jest.resetAllMocks();
    validate = new Validate();
    // we test these in the abstract class...
    jest.spyOn(validate, 'validateOptions').mockImplementation(() => {});
    jest.spyOn(validate, 'configureLogger').mockImplementation(() => {});
    jest.spyOn(validate, 'generateEnvironmentList').mockImplementation(() => {});
  });

  test('with --remote, we call API', async () => {
    jest.spyOn(validate, 'generateListOfPipelines').mockImplementation(() => [{yaml: 'test.yaml'}]);
    const mockValidate = jest.fn().mockImplementation(() => {});
    jest.spyOn(validate, 'getValidateApi').mockImplementation(() => {
      return {validate: mockValidate};
    });
    await validate.action({remote: true});
    expect(mockValidate).toHaveBeenCalledWith({pipelineSpec: {environment: undefined, yamlPath: 'test.yaml'}});
  });

  test('without --remote, we call PipelineService', async () => {
    jest.spyOn(validate, 'generateListOfPipelines').mockImplementation(() => [{yaml: 'test.yaml'}]);
    const mockValidate = jest.fn().mockImplementation(() => {});
    jest.spyOn(validate, 'getValidateService').mockImplementation(() => {
      return {validatePipeline: mockValidate};
    });
    await validate.action({});
    expect(mockValidate).toHaveBeenCalledWith({environment: undefined, yamlPath: 'test.yaml'});
  });

  test('can run multiple validates', async () => {
    jest.spyOn(validate, 'generateListOfPipelines').mockImplementation(() => [{yaml: 'first.yaml'}, {yaml: 'second.yaml'}]);
    const mockValidate = jest.fn().mockImplementation(() => {});
    jest.spyOn(validate, 'getValidateService').mockImplementation(() => {
      return {validatePipeline: mockValidate};
    });
    await validate.action({});
    expect(mockValidate).toHaveBeenCalledTimes(2);
  });
});


