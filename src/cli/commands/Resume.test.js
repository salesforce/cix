/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeEach, describe, expect */
import {CLIError, ExecutionError} from '../../common/index.js';
import Resume from './Resume.js';


describe('Resume.action', () => {
  let resume;
  let getPipelineStatus;
  let getPipelineForAlias;

  beforeEach(() => {
    resume = new Resume();
    jest.resetAllMocks();
    getPipelineStatus = jest.fn().mockImplementation(() => {
      return {
        obj: {
          status: 'successful',
        },
      };
    });
    getPipelineForAlias = jest.fn().mockImplementation(() => {
      return {
        body: {
          id: 'id',
        },
      };
    });
  });

  test('--next calls nextPipelineStep API.', async () => {
    const nextPipelineStep = jest.fn().mockImplementation(() => {});
    jest.spyOn(resume, 'getPipelineApi').mockImplementation(() => {
      return {nextPipelineStep: nextPipelineStep, getPipelineStatus: getPipelineStatus, getPipelineForAlias: getPipelineForAlias};
    });
    await resume.action({next: true});
    expect(nextPipelineStep).toHaveBeenCalled();
  });

  test('pipeline failure should trigger an exception in client', async () => {
    expect.assertions(1);
    const nextPipelineStep = jest.fn().mockImplementation(() => {});
    getPipelineStatus = jest.fn().mockImplementation(() => {
      return {
        obj: {
          status: 'failed',
        },
      };
    });
    jest.spyOn(resume, 'getPipelineApi').mockImplementation(() => {
      return {nextPipelineStep: nextPipelineStep, getPipelineStatus: getPipelineStatus, getPipelineForAlias: getPipelineForAlias};
    });
    try {
      await resume.action({next: true});
    } catch (error) {
      expect(error).toBeInstanceOf(ExecutionError);
    }
  });

  test('--to calls resumePipeline with argument.', async () => {
    const resumePipeline = jest.fn().mockImplementation(() => {});
    jest.spyOn(resume, 'getPipelineApi').mockImplementation(() => {
      return {resumePipeline: resumePipeline, getPipelineStatus: getPipelineStatus, getPipelineForAlias: getPipelineForAlias};
    });
    await resume.action({to: 'test'});
    expect(resumePipeline.mock.calls[0][0]).toEqual({pipelineId: 'id', step: 'test', remoteLogs: false});
  });

  test('no options calls resumePipeline without argument.', async () => {
    const resumePipeline = jest.fn().mockImplementation(() => {});
    jest.spyOn(resume, 'getPipelineApi').mockImplementation(() => {
      return {resumePipeline: resumePipeline, getPipelineStatus: getPipelineStatus, getPipelineForAlias: getPipelineForAlias};
    });
    await resume.action({});
    expect(resumePipeline.mock.calls[0][0]).toEqual({pipelineId: 'id', remoteLogs: false});
  });

  test('cannot call both --to and --next', async () => {
    expect.assertions(1);
    try {
      await resume.action({to: 'test', next: true});
    } catch (error) {
      expect(error).toBeInstanceOf(CLIError);
    }
  });
});
