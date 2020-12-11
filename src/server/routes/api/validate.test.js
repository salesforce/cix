/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeAll, describe, expect */
import Server from '../../Server.js';
import request from 'supertest';

describe('validate', async () => {
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

  test('succeeds when validating a valid full pipeline', async () => {
    const pipeline = {
      'environment': [
        {
          'name': 'LOOPS',
          'value': '10',
          'type': 'environment',
        },
      ],
      'yamlPath': 'docs/examples/loop.yaml',
    };

    const response = await request(server.app)
      .post('/api/validate/pipeline/full')
      .send(pipeline);

    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('');
  });

  // TODO the full pipeline validate api is currently broken, it sends an empty response on error
  test.skip('fails when validating an invalid full pipeline', async () => {
    const pipeline = {
      'environment': [
        {
          'name': 'LOOPS',
          'value': '-1',
          'type': 'environment',
        },
      ],
      'yamlPath': 'docs/examples/loop.yaml',
    };

    const response = await request(server.app)
      .post('/api/validate/pipeline/full')
      .send(pipeline);

    expect(response.statusCode).toBe(400);
    expect(response.text).toContain('something');
  });

  test('succeeds when validating a valid pipeline schema', async () => {
    const pipeline = {
      'version': 2.1,
      'pipeline': [
        {
          'step': {
            'name': 'basic',
            'image': 'alpine:3.9',
            'commands': [
              'hostname',
            ],
          },
        },
      ],
    };

    const response = await request(server.app)
      .post('/api/validate/pipeline/schema')
      .send(pipeline);

    expect(response.statusCode).toBe(200);
  });

  test('fails with errors when validating an invalid pipeline schema', async () => {
    const pipeline = {
      'version': 2.1,
      'pipeline': [
        {
          'step': {
            'commands': [
              'hostname',
            ],
          },
        },
      ],
    };

    const response = await request(server.app)
      .post('/api/validate/pipeline/schema')
      .send(pipeline);

    expect(response.statusCode).toBe(400);
    expect(response.text).toContain('should have required property \'name\'');
    expect(response.text).toContain('should have required property \'image\'');
  });

  test('succeeds when validating a valid plugin schema', async () => {
    const plugin = {
      'version': 2.4,
      'kind': 'Plugin',
      'preprocessor': {
        'image': 'test:latest',
      },
    };

    const response = await request(server.app)
      .post('/api/validate/plugin/schema')
      .send(plugin);

    expect(response.statusCode).toBe(200);
  });

  test('succeeds when validating a valid plugin schema', async () => {
    const plugin = {
      'version': 2.4,
      'kind': 'Plugin',
      'nonexistent': {
        'image': 'test:latest',
      },
    };

    const response = await request(server.app)
      .post('/api/validate/plugin/schema')
      .send(plugin);

    expect(response.statusCode).toBe(400);
    expect(response.text).toContain('should NOT have additional properties');
  });
});
