/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global jest, describe, it, beforeEach, expect */

jest.autoMockOff();

describe('Provider', () => {
  let Provider;

  beforeEach(() => {
    Provider = require('./Provider');
  });

  it('Provider.get should return correct value from object', () => {
    const value = {foo: 1, bar: 2};
    const provider = Provider.fromObject(value);

    expect(provider.get()).toBe(value);
  });

  it('Provider.get should return correct value from function', () => {
    const value = {foo: 1, bar: 2};
    const provider = Provider.fromFunction(() => {
      return value;
    });

    expect(provider.get()).toBe(value);
  });
});
