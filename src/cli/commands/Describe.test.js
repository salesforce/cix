/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeEach, describe, expect */
import {CIXError} from '../../common/index.js';
import Describe from './Describe.js';

describe('Describe.action', () => {
  let describe;
  let getPipelineForAlias;

  beforeEach(() => {
    jest.resetAllMocks();
    describe = new Describe();
    getPipelineForAlias = jest.fn().mockImplementation(() => {
      return {
        body: {
          id: '1234',
        },
      };
    });
  });

  test('Output to stdout', async () => {
    const getPipelineSequence = jest.fn().mockImplementation(() => {
      return {obj: {test: 'test'}};
    });
    jest.spyOn(describe, 'getPipelineApi').mockImplementation(() => {
      return {getPipelineSequence: getPipelineSequence, getPipelineForAlias: getPipelineForAlias};
    });
    const stdout = jest.spyOn(console, 'log').mockImplementation(() => {});
    await describe.action({stdout: true});
    expect(stdout).toHaveBeenCalledWith('{\n  "test": "test"\n}');
  });

  test('Output to stderr', async () => {
    const getPipelineSequence = jest.fn().mockImplementation(() => {
      return {obj: {test: 'test'}};
    });
    jest.spyOn(describe, 'getPipelineApi').mockImplementation(() => {
      return {getPipelineSequence: getPipelineSequence, getPipelineForAlias: getPipelineForAlias};
    });
    const stderr = jest.spyOn(console, 'error').mockImplementation(() => {});
    await describe.action({stderr: true});
    expect(stderr).toHaveBeenCalledWith('{\n  "test": "test"\n}');
  });

  test('Output to file', async () => {
    const getPipelineSequence = jest.fn().mockImplementation(() => {
      return {obj: {test: 'test'}};
    });
    jest.spyOn(describe, 'getPipelineApi').mockImplementation(() => {
      return {getPipelineSequence: getPipelineSequence, getPipelineForAlias: getPipelineForAlias};
    });
    const writeFileSync = jest.spyOn(describe, 'writeSequenceToFile').mockImplementation(() => {});
    await describe.action({file: true});
    expect(writeFileSync.mock.calls[0][1]).toEqual('{\n  "test": "test"\n}');
  });

  test('Throws CIXError on ENOENT', async () => {
    const getPipelineSequence = jest.fn().mockImplementation(() => {
      return {obj: {test: 'test'}};
    });
    jest.spyOn(describe, 'getPipelineApi').mockImplementation(() => {
      return {getPipelineSequence: getPipelineSequence, getPipelineForAlias: getPipelineForAlias};
    });
    jest.spyOn(describe, 'writeSequenceToFile').mockImplementation(() => {
      const error = new Error();
      error.stack = 'ENOENT';
      throw error;
    });
    try {
      await describe.action({file: true});
    } catch (e) {
      expect(e).toBeInstanceOf(CIXError);
    }
  });

  test('Throws CIXError on EPERM', async () => {
    const getPipelineSequence = jest.fn().mockImplementation(() => {
      return {obj: {test: 'test'}};
    });
    jest.spyOn(describe, 'getPipelineApi').mockImplementation(() => {
      return {getPipelineSequence: getPipelineSequence, getPipelineForAlias: getPipelineForAlias};
    });
    jest.spyOn(describe, 'writeSequenceToFile').mockImplementation(() => {
      const error = new Error();
      error.stack = 'EPERM';
      throw error;
    });
    expect.assertions(1);
    try {
      await describe.action({file: true});
    } catch (e) {
      expect(e).toBeInstanceOf(CIXError);
    }
  });

  test('Throws error on unknown error', async () => {
    const getPipelineSequence = jest.fn().mockImplementation(() => {
      return {obj: {test: 'test'}};
    });
    jest.spyOn(describe, 'getPipelineApi').mockImplementation(() => {
      return {getPipelineSequence: getPipelineSequence};
    });
    jest.spyOn(describe, 'writeSequenceToFile').mockImplementation(() => {
      throw new Error();
    });
    expect.assertions(1);
    try {
      await describe.action({file: true});
    } catch (e) {
      expect(e).not.toBeInstanceOf(CIXError);
    }
  });
});


