/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeEach, describe, expect */
import AbstractLoader from './AbstractLoader.js';
import {ExecutionError} from '../Errors.js';


class ImplementedLoader extends AbstractLoader {
  constructor() {
    super('test://');
  }
}

describe('AbstractLoader.getProtocols', () => {
  let implLoader;

  beforeEach(() => {
    jest.resetAllMocks();
    implLoader = new ImplementedLoader();
  });

  test('returns protocols', () => {
    expect(
      implLoader.getProtocols(),
    ).toEqual('test://');
  });
});

describe('AbstractLoader.relativePath', () => {
  let implLoader;

  beforeEach(() => {
    jest.resetAllMocks();
    implLoader = new ImplementedLoader();
  });

  test('throws an error if unimplemented', () => {
    expect(() => implLoader.relativePath()).toThrow(ExecutionError);
  });
});

describe('AbstractLoader.fetch', () => {
  let implLoader;

  beforeEach(() => {
    jest.resetAllMocks();
    implLoader = new ImplementedLoader();
  });

  test('throws an error if unimplemented', () => {
    expect(() => implLoader.fetch()).toThrow(ExecutionError);
  });
});
