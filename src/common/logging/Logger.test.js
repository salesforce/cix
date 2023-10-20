/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global describe, test, expect  */
import {Logger} from '../index.js';

describe('Logger tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Logs should pass through to global logger.', () => {
    const warnMock = jest.spyOn(Logger.globalLogger, 'warn').mockImplementation();
    Logger.warn('This is a test');
    expect(warnMock.mock.calls.length).toBe(1);
  });

  test('Logs should not pass through to pipeline logger if pipeline ID is not set.', () => {
    const warnMock = jest.spyOn(Logger.globalLogger, 'warn').mockImplementation();
    const getPipeline = jest.spyOn(Logger, 'getPipelineLogger').mockImplementation();
    Logger.warn('This is a test');
    expect(warnMock.mock.calls.length).toBe(1);
    expect(getPipeline.mock.calls.length).toBe(0);
  });

  test('Logs should pass through to pipeline logger if pipeline ID is set.', () => {
    const warnMock = jest.spyOn(Logger.globalLogger, 'warn').mockImplementation();
    const getPipeline = jest.spyOn(Logger, 'getPipelineLogger').mockImplementation();
    Logger.warn('This is a test', '123');
    expect(warnMock.mock.calls.length).toBe(1);
    expect(getPipeline.mock.calls.length).toBe(1);
  });

  test('createPipelineLogger will default to \'default\' if ID is not available.', () => {
    Logger.createPipelineLogger();
    expect(Object.keys(Logger.pipelineLoggers)).toContain('default');
    delete Logger.pipelineLoggers['default'];
  });

  test('createPipelineLogger will not use default to \'default\' if ID is available.', () => {
    Logger.createPipelineLogger({getId: () => '123'});
    expect(Object.keys(Logger.pipelineLoggers)).not.toContain('default');
    delete Logger.pipelineLoggers['123'];
  });

  test('getPipelineLogger will return the pipeline.', () => {
    Logger.createPipelineLogger({getId: () => '123'});
    expect(Logger.getPipelineLogger('123')).not.toBeNull();
    delete Logger.pipelineLoggers['123'];
  });
});
