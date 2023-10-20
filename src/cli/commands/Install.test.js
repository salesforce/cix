/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeEach, describe, expect */
import Install from './Install.js';

describe('Install.action', () => {
  let install;

  beforeEach(() => {
    install = new Install();
    jest.resetAllMocks();
  });

  test('Produces script.', async () => {
    jest.spyOn(install, 'readScript').mockImplementation(() => 'SCRIPT');
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    await install.action({location: '/needs/trim   '});

    // match location
    expect(consoleLog.mock.calls[0][0]).toMatch(/\/needs\/trim\/cix/);
    // match script contents
    expect(consoleLog.mock.calls[0][0]).toMatch(/SCRIPT/);
  });
});


