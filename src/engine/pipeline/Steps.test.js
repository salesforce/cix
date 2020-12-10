/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global jest, describe, expect */
import Pipeline from './Pipeline.js';
import Steps from './Steps.js';
import {_} from '../../common/index.js';


jest.autoMockOff();

describe('Steps.modifyPayload', () => {
  let emptyPipeline;
  let pipelineRootNode;
  const mockRunStep = jest.fn().mockResolvedValue();

  // Clone these
  const parallelGroup = {
    'name': 'my-parallel-group',
    'parallel': true,
    'pipeline': [{
      'step': {
        'name': 'step-1',
        'image': 'test',
      },
    }, {
      'step': {
        'name': 'step-2',
        'image': 'test',
      },
    }],
  };
  const serialGroup = {
    'name': 'my-serial-group',
    'pipeline': [{
      'step': {
        'name': 'step-1',
        'image': 'test',
      },
    }, {
      'step': {
        'name': 'step-2',
        'image': 'test',
      },
    }],
  };

  beforeEach( async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    emptyPipeline = new Pipeline({rawPipeline: {version: 2.1, pipeline: [{}]}});
    await emptyPipeline.loadAndValidate();
    emptyPipeline.getExec = jest.fn().mockImplementation(() => {
      return {runStep: mockRunStep, constructor: {name: 'Pipeline'}};
    });
    pipelineRootNode = emptyPipeline.getPipelineTreeRoot();
  });

  test('Parallel steps get run in parallel.', async () => {
    const steps = new Steps(_.cloneDeep(parallelGroup), pipelineRootNode);
    expect(steps.isParallel()).toBeTruthy();
    const descendants = steps.getDescendants();
    expect(descendants.length).toBe(2);
    mockRunStep.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });
    });
    const result = steps.start();
    expect(descendants.filter((descendant) => descendant.getStatus() === 'running').length).toBe(2);
    jest.runAllTimers();
    await result;
    expect(descendants.filter((descendant) => descendant.getStatus() === 'successful').length).toBe(2);
  });

  test('serial steps get run in serial.', async () => {
    const steps = new Steps(_.cloneDeep(serialGroup), pipelineRootNode);
    expect(steps.isParallel()).toBeFalsy();
    const descendants = steps.getDescendants();
    expect(descendants.length).toBe(2);
    mockRunStep.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });
    });
    steps.start();
    expect(descendants.filter((descendant) => descendant.getStatus() === 'running').length).toBe(1);
  });

  test('Breakpoints in parallel block trigger all steps within that block.', async () => {
    const steps = new Steps(_.cloneDeep(parallelGroup), pipelineRootNode);
    steps.getPipeline().setBreakpoint('step-1');
    expect(steps.isParallel()).toBeTruthy();
    const descendants = steps.getDescendants();
    expect(descendants.length).toBe(2);
    mockRunStep.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });
    });
    const result = steps.start();
    expect(descendants.filter((descendant) => descendant.getStatus() === 'running').length).toBe(2);
    jest.advanceTimersByTime(1000);
    await result;
    expect(descendants.filter((descendant) => descendant.getStatus() === 'successful').length).toBe(2);
  });
});
