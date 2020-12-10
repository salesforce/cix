/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeEach, describe, expect */
import Exec from './Exec.js';

describe('Exec.action', () => {
  let exec;

  beforeEach(() => {
    jest.resetAllMocks();
    exec = new Exec();
    // we test these in the abstract class...
    jest.spyOn(exec, 'validateOptions').mockImplementation(() => {});
    jest.spyOn(exec, 'configureLogger').mockImplementation(() => {});
    jest.spyOn(exec, 'handleSecrets').mockImplementation(() => {});
    jest.spyOn(exec, 'initServer').mockImplementation(() => {});
    jest.spyOn(exec, 'generateEnvironmentList').mockImplementation(() => {});
  });

  test('when executing a remote pipeline, we add it, then start it.', async () => {
    jest.spyOn(exec, 'generateListOfPipelines').mockImplementation(() => [{yaml: 'test.yaml'}]);
    const addPipeline = jest.fn().mockImplementation(() => {
      return {body: {id: 'PIPELINE_ID'}};
    });
    const startPipeline = jest.fn().mockImplementation(() => {});
    const getPipelineStatus = jest.fn().mockImplementation(() => {
      return {
        obj: {
          status: 'successful',
        },
      };
    });
    jest.spyOn(exec, 'getPipelineApi').mockImplementation(() => {
      return {addPipeline: addPipeline, getPipelineStatus: getPipelineStatus, startPipeline: startPipeline};
    });
    await exec.action({remote: true});
    expect(startPipeline.mock.calls[0][0]).toEqual({pipelineId: 'PIPELINE_ID', remoteLogs: false});
  });

  test('when executing a local pipeline, we add it, then start it.', async () => {
    jest.spyOn(exec, 'generateListOfPipelines').mockImplementation(() => [{yaml: 'test.yaml'}]);
    const addPipeline = jest.fn().mockImplementation(() => {
      return {id: 'PIPELINE_ID'};
    });
    const startPipeline = jest.fn().mockImplementation(() => {});
    jest.spyOn(exec, 'getPipelineService').mockImplementation(() => {
      return {addPipeline: addPipeline, startPipeline: startPipeline};
    });
    await exec.action({});
    expect(startPipeline).toHaveBeenCalledWith('PIPELINE_ID');
  });
});


