/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeEach, describe, expect */
import {CLIError} from '../../common/index.js';
import Update from './Update.js';


describe('Update.action', () => {
  let update;

  beforeEach(() => {
    update = new Update();
    jest.resetAllMocks();
  });

  test('Update throws CLIError.', async () => {
    expect.assertions(1);
    try {
      await update.action();
    } catch (error) {
      expect(error).toBeInstanceOf(CLIError);
    }
  });
});


