/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeEach, describe, expect */
import AbstractCommand from './AbstractCommand.js';
import {Logger} from '../../common/index.js';

class ImplementedCommand extends AbstractCommand {
  constructor() {
    super('test');
  }
  action() {
    // stub - must override
  }
}

describe('AbstractCommand.collectKeyValue', () => {
  let implCommand;

  beforeEach(() => {
    jest.resetAllMocks();
    implCommand = new ImplementedCommand();
  });

  test('returns the correct values after being called once', () => {
    expect(
      implCommand.collectKeyValue('KEY=value'),
    ).toEqual({KEY: 'value'});
  });

  test('returns the correct values after being called several times', () => {
    const acc = {};

    implCommand.collectKeyValue('FOO=foo', acc);
    implCommand.collectKeyValue('BAR=bar', acc);
    implCommand.collectKeyValue('FOOBAR=foobar', acc);

    expect(acc).toEqual({FOO: 'foo', BAR: 'bar', FOOBAR: 'foobar'});
  });

  test('returns the correct values when passed only a KEY (value retrieved from process.env)', () => {
    const acc = {};
    process.env.FOO = 'foo';
    process.env.BAR = 'bar';

    implCommand.collectKeyValue('FOO', acc);
    implCommand.collectKeyValue('BAR', acc);

    expect(acc).toEqual({FOO: 'foo', BAR: 'bar'});
  });
});

describe('Application.configureLogger', () => {
  let implCommand;

  beforeEach(() => {
    jest.resetAllMocks();
    implCommand = new ImplementedCommand();
  });

  afterEach(() => {
    if (Logger.fileLogging) {
      delete Logger.fileLogging;
    }
  });

  // TODO: leaked file handle...
  test.skip('We add a file logger...', () => {
    const logAdd = jest.spyOn(Logger, 'add').mockImplementation(() => {});
    implCommand.configureLogger({logging: 'files', loggingPath: '/dev/null'});
    expect(logAdd).toHaveBeenCalled();
    expect(Logger.fileLogging).toEqual({'enabled': true, 'path': '/dev/null'});
  });
});
