/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global describe, expect */
import {PROTOCOLS, getProtocol} from './Protocols.js';

describe('Protocols.getProtocol', () => {
  test('returns the correct HTTPS protocol', () => {
    expect(getProtocol('https://test.com')).toBe(PROTOCOLS.HTTPS);
  });

  test('returns the correct HTTP protocol', () => {
    expect(getProtocol('http://test.com')).toBe(PROTOCOLS.HTTP);
  });

  test('returns the correct default (local) protocol', () => {
    expect(getProtocol('/some/local/file')).toBe(PROTOCOLS.DEFAULT);
  });
});
