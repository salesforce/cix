/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeAll, describe, expect */
import Server from '../../Server.js';
import request from 'supertest';

describe('plugin', () => {
  let server;
  const port = Math.floor(Math.random() * 64536) + 1000;

  beforeAll(async () => {
    jest.resetAllMocks();
    server = new Server(port);
    await server.loadRoutes();
  });

  afterAll(async () => {
    await server.close();
  });

  test('succeeds when creating a new plugin', async () => {
    const plugin = {'pluginPath': 'docs/examples/plugins/plugin.yaml'};
    const response = await request(server.app)
      .post('/api/plugin')
      .send(plugin);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.text).id).toBeDefined();
  });

  test('fails when creating a new plugin at an invalid location', async () => {
    const plugin = {'pluginPath': 'non/existent'};
    const response = await request(server.app)
      .post('/api/plugin')
      .send(plugin);

    expect(response.statusCode).toBe(500);
    expect(response.text).toContain('Failed to load file: non/existent');
  });
});
