/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeEach, describe, expect */
import Kill from './Kill.js';

describe('Kill.action', () => {
  let kill;

  beforeEach(() => {
    kill = new Kill();
    jest.resetAllMocks();
  });

  test('kill calls killPipeline api.', async () => {
    const killPipeline = jest.fn().mockImplementation(() => {});
    jest.spyOn(kill, 'getPipelineApi').mockImplementation(() => {
      return {killPipeline: killPipeline};
    });
    await kill.action({});
    expect(killPipeline).toHaveBeenCalled();
  });
});


