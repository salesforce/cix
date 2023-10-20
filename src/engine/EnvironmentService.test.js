/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global jest, describe, expect */
import EnvironmentService from './EnvironmentService.js';
import PipelineService from './PipelineService.js';

jest.autoMockOff();

describe('EnvironmentService tests', () => {
  // !Important! EnvironmentService is a SINGLETON type object
  // cannot create more than one for testing, order is important!!

  test('listEnvironmentVar should only contain CIX_HOSTNAME, CIX_SERVER_PORT and CIX_EXECUTION_ID', async () => {
    const resp = await PipelineService.addPipeline({yamlPath: 'docs/examples/basic.yaml', type: 'standard', environment: []});

    expect(EnvironmentService.listEnvironmentVar(resp.id)).toEqual(['CIX_EXECUTION_ID', 'CIX_HOSTNAME', 'CIX_SERVER_PORT']);
  });

  test('get/setEnvironmentVar should work', async () => {
    const resp = await PipelineService.addPipeline({yamlPath: 'docs/examples/basic.yaml', type: 'standard', environment: []});
    const testName = 'test'; const testValue = '1234'; const testVar = {name: testName, value: testValue};
    EnvironmentService.setEnvironmentVar(resp.id, testVar);
    expect(EnvironmentService.getEnvironmentVar(resp.id, testName).value).toEqual(testValue);
  });
});
