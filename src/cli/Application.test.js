/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global describe, expect */
import {CLIError, Logger, NodeProvider} from '../common/index.js';
import {Application} from './Application';

describe('Application.execute', () => {
  let app; let processMock;
  beforeEach(() => {
    jest.resetAllMocks();
    // Can modify these in the tests...
    processMock = {
      argv: '--silent',
      cwd: () => '.',
      env: {'CIX_WRAPPER_VERSION': 3, 'LOG_LEVEL': 'info'},
      exit: () => {},
      stdin: {isTTY: true},
    };
    jest.spyOn(NodeProvider, 'getProcess').mockImplementation(() => processMock);
    app = new Application({version: 2}, ['/usr/local/bin/node', '/usr/src/app/src/index.js']);
  });

  test('Fails with no commands', () => {
    jest.spyOn(app, 'getProgram').mockImplementation(() => {
      return {
        addCommand: jest.fn().mockResolvedValue(),
        outputHelp: jest.fn().mockResolvedValue(),
        name: jest.fn().mockResolvedValue(),
        version: jest.fn().mockResolvedValue(),
      };
    });
    processMock.exit = jest.fn().mockImplementation();
    app.execute();
    expect(processMock.exit).toHaveBeenCalled();
  });

  test('validateWrapperScript: no version prints "out of date"', () => {
    delete processMock.env['CIX_WRAPPER_VERSION'];
    const logWarn = jest.spyOn(Logger, 'warn').mockImplementation();
    app.validateWrapperScript();
    expect(logWarn.mock.calls[0][0]).toEqual(expect.stringMatching(/out of date/));
  });


  test('validateWrapperScript: lower version warns "out of date"', () => {
    const logWarn = jest.spyOn(Logger, 'warn').mockImplementation();
    processMock.env['CIX_WRAPPER_VERSION'] = 1;
    app.validateWrapperScript();
    expect(logWarn.mock.calls[0][0]).toEqual(expect.stringMatching(/out of date/));
  });

  test('validateWrapperScript: higher version warns "newer than"', () => {
    const logWarn = jest.spyOn(Logger, 'warn').mockImplementation();
    processMock.env['CIX_WRAPPER_VERSION'] = 666;
    app.validateWrapperScript();
    expect(logWarn.mock.calls[0][0]).toEqual(expect.stringMatching(/newer than/));
  });

  test('validateWrapperScript: no warn if version is exact', () => {
    const logWarn = jest.spyOn(Logger, 'warn').mockImplementation();
    jest.spyOn(app, 'getWrapperScript').mockImplementation(() => '#!/bin/bash\nCIX_WRAPPER_VERSION=3');
    app.validateWrapperScript();
    expect(logWarn).not.toHaveBeenCalled();
  });

  test('executeSubCommands: exits 0 if no failure', async () => {
    processMock.exit = jest.fn().mockImplementation();
    jest.spyOn(app, 'getProgram').mockImplementation(() => {
      return {parseAsync: jest.fn().mockResolvedValue()};
    });
    await app.executeSubCommands();
    expect(processMock.exit).toHaveBeenCalledWith(0);
  });

  test('executeSubCommands: CLIError exits 1', async () => {
    processMock.exit = jest.fn().mockImplementation();
    jest.spyOn(app, 'getProgram').mockImplementation(() => {
      return {parseAsync: jest.fn().mockRejectedValue(new CLIError('crap'))};
    });
    await app.executeSubCommands();
    expect(processMock.exit).toHaveBeenCalledWith(1);
  });

  test('executeSubCommands: Unexpected Errors exit 100 and don\'t print help', async () => {
    processMock.exit = jest.fn().mockImplementation();
    const outputHelp = jest.fn().mockImplementation();
    jest.spyOn(app, 'getProgram').mockImplementation(() => {
      return {parseAsync: jest.fn().mockRejectedValue(new Error('crap')), outputHelp: outputHelp};
    });
    await app.executeSubCommands();
    expect(processMock.exit).toHaveBeenCalledWith(100);
    expect(outputHelp).not.toHaveBeenCalled();
  });
});
