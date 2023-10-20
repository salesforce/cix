/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global jest, describe, expect */
import {Logger, PluginError, _} from '../../common/index.js';
import {DockerExec} from '../../docker/index.js';
import Plugin from './Plugin.js';

jest.autoMockOff();

describe('Plugin tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('Empty constructor throws error.', () => {
    expect(() => {
      new Plugin();
    }).toThrow(PluginError);
  });

  test('Missing pluginPath throws error.', () => {
    expect(() => {
      new Plugin({});
    }).toThrow(PluginError);
  });

  test('New object creates new 36 char UUID.', () => {
    const plugin = new Plugin({pluginPath: '/blah'});
    expect(plugin.getId().length).toEqual(36);
  });

  test('loadAndValidate throws error on invalid schema.', async () => {
    expect.assertions(1);
    jest.spyOn(_, 'fetch').mockResolvedValue('{"invalid": "value"}');
    const plugin = new Plugin({pluginPath: '/blah'});
    try {
      await plugin.loadAndValidate();
    } catch (error) {
      expect(error).toBeInstanceOf(PluginError);
    }
  });

  test('loadAndValidate loads JSON.', async () => {
    jest.spyOn(_, 'fetch').mockResolvedValue('{"version":2.4,"kind":"Plugin","preprocessor":{"image":"test:latest"}}');
    const plugin = new Plugin({pluginPath: '/blah'});
    await plugin.loadAndValidate();
    expect(plugin.preprocessor).toEqual({'image': 'test:latest'});
  });

  test('loadAndValidate loads YAML.', async () => {
    jest.spyOn(_, 'fetch').mockResolvedValue('version: 2.4\nkind: Plugin\npreprocessor:\n  image: test:latest');
    const plugin = new Plugin({pluginPath: '/blah'});
    await plugin.loadAndValidate();
    expect(plugin.preprocessor).toEqual({'image': 'test:latest'});
  });

  test('runPreprocessor skips executing preprocessor if one does not exist.', async () => {
    jest.spyOn(_, 'fetch').mockResolvedValue('version: 2.4\nkind: Plugin');
    const plugin = new Plugin({pluginPath: '/blah'});
    await plugin.loadAndValidate();
    const logDebug = jest.spyOn(Logger, 'debug').mockImplementation();
    await plugin.runPreprocessor();
    expect(logDebug.mock.calls[0][0]).toEqual(expect.stringMatching(/Skipping preprocessor/));
  });

  test('runPreprocessor returns result.output when exec.runPreprocessor returns status of 0', async () => {
    jest.spyOn(_, 'fetch').mockResolvedValue('version: 2.4\nkind: Plugin\npreprocessor:\n  image: test:latest');
    const plugin = new Plugin({pluginPath: '/blah'});
    await plugin.loadAndValidate();

    const exec = new DockerExec();
    exec.runPreprocessor = jest.fn().mockReturnValue({
      status: 0,
      output: 'test',
    });

    expect(await plugin.runPreprocessor(exec, '')).toEqual('test');
  });

  test('runPreprocessor throws PluginError with result.output when exec.runPreprocessor returns a non-0 status', async () => {
    const logError = jest.spyOn(Logger, 'error').mockImplementation();
    jest.spyOn(_, 'fetch').mockResolvedValue('version: 2.4\nkind: Plugin\npreprocessor:\n  image: test:latest');
    const plugin = new Plugin({pluginPath: '/blah'});
    await plugin.loadAndValidate();

    const exec = new DockerExec();
    exec.runPreprocessor = jest.fn().mockReturnValue({
      status: 1,
      output: 'error',
    });

    await expect(plugin.runPreprocessor(exec, '')).rejects.toThrow(PluginError);
    expect(logError.mock.calls[0][0]).toEqual('The preprocessor has returned a non-zero exit code (1):\nerror');
  });
});
