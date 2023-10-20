/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeEach, describe, expect */
import Server from './Server.js';


describe('Server.action', () => {
  let server;

  beforeEach(() => {
    server = new Server();
    jest.resetAllMocks();
  });

  test('Server starts.', async () => {
    const mockBlock = jest.fn().mockImplementation(() => {});
    jest.spyOn(server, 'initServer').mockImplementation(() => {
      return {block: mockBlock};
    });
    await server.action({});
    expect(mockBlock).toBeCalled();
  });
});


