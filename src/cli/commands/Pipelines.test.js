/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeEach, describe, expect */
import {CLIError, Logger} from '../../common/index.js';
import Pipelines from './Pipelines.js';

describe('Pipelines.action', () => {
  let pipelines;
  let getPipelineForAlias;
  let getPipelineStatus;

  beforeEach(() => {
    pipelines = new Pipelines();
    jest.resetAllMocks();
    getPipelineForAlias = jest.fn().mockImplementation(() => {
      return {
        obj: {
          id: 'test',
        },
      };
    });
    getPipelineStatus = jest.fn().mockImplementation(() => {
      return {
        obj: {
          status: 'ready',
        },
      };
    });
  });

  test('cannot call both --set-alias and --get-alias', async () => {
    expect.assertions(1);
    try {
      await pipelines.action({setAlias: 'test', getAlias: 'test'});
    } catch (error) {
      expect(error).toBeInstanceOf(CLIError);
    }
  });

  test('getting --status without pipelineID will warn and get latest', async () => {
    const logWarn = jest.spyOn(Logger, 'warn').mockImplementation(() => {});
    jest.spyOn(pipelines, 'getPipelineApi').mockImplementation(() => {
      return {getPipelineForAlias: getPipelineForAlias, getPipelineStatus: getPipelineStatus};
    });
    await pipelines.action({status: true});
    expect(logWarn).toHaveBeenCalledWith('--pipeline-id not supplied using "latest" alias.');
  });

  test('getting --status with pipelineID will print status ', async () => {
    const logInfo = jest.spyOn(Logger, 'info').mockImplementation(() => {});
    jest.spyOn(pipelines, 'getPipelineApi').mockImplementation(() => {
      return {getPipelineForAlias: getPipelineForAlias, getPipelineStatus: getPipelineStatus};
    });
    await pipelines.action({status: true});
    expect(logInfo).toHaveBeenCalledWith('Pipeline Status: "ready"');
  });

  test('setting alias requires --pipelineId', async () => {
    expect.assertions(1);
    jest.spyOn(pipelines, 'getPipelineApi').mockImplementation(() => {});
    try {
      await pipelines.action({setAlias: 'test'});
    } catch (error) {
      expect(error).toBeInstanceOf(CLIError);
    }
  });

  test('setting alias test', async () => {
    const setAliasForPipeline = jest.fn().mockImplementation(() => {});
    jest.spyOn(pipelines, 'getPipelineApi').mockImplementation(() => {
      return {setAliasForPipeline: setAliasForPipeline};
    });
    await pipelines.action({setAlias: 'test', pipelineId: '123'});
    expect(setAliasForPipeline).toHaveBeenCalledWith({pipelineAlias: 'test', pipelineId: '123'});
  });

  test('getting alias test', async () => {
    const logInfo = jest.spyOn(Logger, 'info').mockImplementation(() => {});
    jest.spyOn(pipelines, 'getPipelineApi').mockImplementation(() => {
      return {getPipelineForAlias: getPipelineForAlias};
    });
    await pipelines.action({getAlias: 'test'});
    expect(getPipelineForAlias).toHaveBeenCalledWith({pipelineAlias: 'test'});
    expect(logInfo).toHaveBeenCalledWith('test -> test');
  });

  test('list pipelines with aliases', async () => {
    const logInfo = jest.spyOn(Logger, 'info').mockImplementation(() => {});
    const getAliasesForPipeline = jest.fn().mockImplementation(() => {
      return {
        obj: ['latest', 'test'],
      };
    });
    const getPipelineList = jest.fn().mockImplementation(() => {
      return {
        obj: ['123'],
      };
    });
    jest.spyOn(pipelines, 'getPipelineApi').mockImplementation(() => {
      return {getPipelineList: getPipelineList, getAliasesForPipeline: getAliasesForPipeline};
    });
    await pipelines.action({});
    expect(getAliasesForPipeline).toHaveBeenCalledWith({pipelineId: '123'});
    expect(logInfo).toHaveBeenCalledWith('  - 123');
    expect(logInfo).toHaveBeenCalledWith('    - alias: latest');
    expect(logInfo).toHaveBeenCalledWith('    - alias: test');
  });
});


