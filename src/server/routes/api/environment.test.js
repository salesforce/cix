/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeAll, describe, expect */
import Server from '../../Server.js';
import request from 'supertest';

describe('environment', () => {
  let server;
  let pipelineId;
  const port = Math.floor(Math.random() * 64536) + 1000;

  beforeAll(async () => {
    jest.resetAllMocks();
    server = new Server(port);
    await server.loadRoutes();
    const pipeline = {
      'environment': [
        {
          'name': 'test',
          'value': 'test_value',
          'type': 'environment',
        },
      ],
      'yamlPath': 'docs/examples/basic.yaml',
    };
    const response = await request(server.app)
      .post('/api/pipeline')
      .send(pipeline);
    pipelineId = JSON.parse(response.text).id;
  });

  afterAll(async () => {
    await server.close();
  });

  test('getting an environment variable works as expected', async () => {
    const response = await request(server.app).get(`/api/pipeline/${pipelineId}/environment/test`);

    expect(response.text).toBe('{\"name\":\"test\",\"value\":\"test_value\",\"type\":\"environment\"}');
  });

  test('post an environment variable (env type) works', async () => {
    const postResponse = await request(server.app) // supertest attempts to post to port 80 if specified with server.app
      .post(`/api/pipeline/${pipelineId}/environment`)
      .send({
        'name': 'test2',
        'value': 'test_value2',
        'type': 'environment',
      });

    expect(postResponse.statusCode).toBe(200);

    const response = await request(server.app).get(`/api/pipeline/${pipelineId}/environment/test2`);
    expect(response.text).toBe('{\"name\":\"test2\",\"value\":\"test_value2",\"type\":\"environment\"}');
  });

  test('post an environment variable (env type) works', async () => {
    const postResponse = await request(server.app) // supertest attempts to post to port 80 if specified with server.app
      .post(`/api/pipeline/${pipelineId}/environment`)
      .send({
        'name': 'test3',
        'value': 'test_value3',
        'type': 'secret',
      });

    expect(postResponse.statusCode).toBe(200);

    const response = await request(server.app).get(`/api/pipeline/${pipelineId}/environment/test3`);
    expect(response.text).toBe('{\"name\":\"test3\",\"value\":\"********",\"type\":\"secret\"}');
  });

  test('getting all environment variables works as expected', async () => {
    const response = await request(server.app).get(`/api/pipeline/${pipelineId}/environment`);

    expect(response.text).toBe('[\"test\",\"CIX_HOSTNAME\",\"CIX_SERVER_PORT\",\"CIX_EXECUTION_ID\",\"test2\",\"test3\"]');
  });
});
