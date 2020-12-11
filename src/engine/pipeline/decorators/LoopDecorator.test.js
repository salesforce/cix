/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global  describe, expect */
import LoopDecorator from './LoopDecorator.js';
import {Provider} from '../../../common/index.js';

describe('LoopDecorator tests:', () => {
  let loop;
  const providedFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    loop = LoopDecorator;
  });

  test('LoopDecorator: Loops on length.', async () => {
    const response = loop({loop: 3}, undefined, Provider.fromFunction(providedFunction));
    await response.get();
    expect(providedFunction.mock.calls.length).toEqual(3);
  });

  test('LoopDecorator: Returns provider if no loop.', async () => {
    const provider = Provider.fromFunction(providedFunction);
    const response = loop({}, undefined, provider);
    expect(provider).toBe(response);
  });

  test('LoopDecorator: No loop executes once.', async () => {
    const response = loop({}, undefined, Provider.fromFunction(providedFunction));
    await response.get();
    expect(providedFunction.mock.calls.length).toEqual(1);
  });

  test('LoopDecorator: Loop only takes numeric values.', async () => {
    loop({loop: 'twice'}, undefined, Provider.fromFunction(providedFunction));
    expect(providedFunction.mock.calls.length).toEqual(0);
  });

  test('LoopDecorator: Quoted strings work.', async () => {
    const response = loop({loop: '2'}, undefined, Provider.fromFunction(providedFunction));
    await response.get();
    expect(providedFunction.mock.calls.length).toEqual(2);
  });
});
