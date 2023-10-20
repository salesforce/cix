/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global describe, expect */
import Server from '../../Server.js';
import request from 'supertest';

jest.mock('../../../docker/DockerExec.js'); // TODO fix me - auto-mocking currently has issues with es6 modules

describe('environment', () => {
  let server;
  const port = Math.floor(Math.random() * 64536) + 1000;

  beforeEach(async () => {
    jest.resetAllMocks();
    server = new Server(port);
    await server.loadRoutes();
  });

  afterEach(async () => {
    await server.close();
  });

  test('creating a new pipeline works as expected in a normal case', async () => {
    // create a test pipeline
    const pipeline = {
      'yamlPath': 'docs/examples/basic.yaml',
    };
    const postResponse = await request(server.app)
      .post('/api/pipeline')
      .send(pipeline);
    const pipelineId = JSON.parse(postResponse.text).id;

    // ensure pipelineId is returned
    expect(pipelineId).toBeDefined();
  });

  test('setting and getting aliases work as expected', async () => {
    // create a test pipeline
    const pipeline = {
      'yamlPath': 'docs/examples/basic.yaml',
    };
    const postResponse = await request(server.app)
      .post('/api/pipeline')
      .send(pipeline);
    const pipelineId = JSON.parse(postResponse.text).id;
    expect(pipelineId).toBeDefined();

    // set pipeline alias
    const defaultResponse = await request(server.app)
      .post(`/api/pipeline/${pipelineId}/alias/test`);
    expect(defaultResponse.statusCode).toBe(200);

    // get aliases for pipeline
    let response = await request(server.app).get(`/api/pipeline/${pipelineId}/alias`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expect.arrayContaining(['test']));

    // alias should exist in list of aliases
    response = await request(server.app).get('/api/pipeline/alias');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expect.arrayContaining(['test']));

    // alias should point to the pipeline we created
    response = await request(server.app).get('/api/pipeline/alias/test');
    expect(response.statusCode).toBe(200);
    expect(response.body.id).toEqual(pipelineId);
  });

  test('getting all pipelines works as expected', async () => {
    // create test pipelines
    const pipeline1 = {
      'yamlPath': 'docs/examples/basic.yaml',
    };
    const postResponse1 = await request(server.app)
      .post('/api/pipeline')
      .send(pipeline1);
    const pipelineId1 = JSON.parse(postResponse1.text).id;
    expect(pipelineId1).toBeDefined();

    const pipeline2 = {
      'yamlPath': 'docs/examples/environment.yaml',
    };
    const postResponse2 = await request(server.app)
      .post('/api/pipeline')
      .send(pipeline2);
    const pipelineId2 = JSON.parse(postResponse2.text).id;
    expect(pipelineId2).toBeDefined();

    // ensure pipelines returned by all contain both created pipelines
    const response = await request(server.app).get('/api/pipeline');
    expect(response.statusCode).toBe(200);
    expect(response.text).toContain(pipelineId1);
    expect(response.text).toContain(pipelineId2);
  });

  test('getting pipeline status works as expected', async () => {
    // create a test pipeline
    const pipeline = {
      'yamlPath': 'docs/examples/basic.yaml',
    };
    const postResponse = await request(server.app)
      .post('/api/pipeline')
      .send(pipeline);
    const pipelineId = JSON.parse(postResponse.text).id;
    expect(pipelineId).toBeDefined();

    const response = await request(server.app).get(`/api/pipeline/${pipelineId}/status`);

    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('{\"status\":\"ready\"}');
  });

  test('getting pipeline description works as expected', async () => {
    // create a test pipeline
    const pipeline = {
      'yamlPath': 'docs/examples/basic.yaml',
    };
    const postResponse = await request(server.app)
      .post('/api/pipeline')
      .send(pipeline);
    const pipelineId = JSON.parse(postResponse.text).id;
    expect(pipelineId).toBeDefined();

    const response = await request(server.app).get(`/api/pipeline/${pipelineId}`); // call causes status to change to LOADED

    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('{\"name\":\"root\",\"steps\":[{\"name\":\"basic\",\"status\":\"ready\"}]}');
  });

  test('start results in a successful pipeline', async () => {
    const pipeline = {
      'yamlPath': 'docs/examples/basic.yaml',
    };
    const postResponse = await request(server.app)
      .post('/api/pipeline')
      .send(pipeline);
    const pipelineId = JSON.parse(postResponse.text).id;
    expect(pipelineId).toBeDefined();

    const response = await request(server.app).get(`/api/pipeline/${pipelineId}/start`);
    expect(response.statusCode).toBe(200);

    const statusResponse = await request(server.app).get(`/api/pipeline/${pipelineId}/status`);

    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.text).toBe('{\"status\":\"successful\"}');
  });


  test('next-step results in a paused pipeline', async () => {
    // create a test pipeline
    const pipeline = {
      'yamlPath': 'docs/examples/steps.yaml',
    };
    const postResponse = await request(server.app)
      .post('/api/pipeline')
      .send(pipeline);
    const pipelineId = JSON.parse(postResponse.text).id;
    expect(pipelineId).toBeDefined();

    // invoke next-step call
    const response = await request(server.app).get(`/api/pipeline/${pipelineId}/next-step`);
    expect(response.statusCode).toBe(200);

    // verify only first step finished
    const statusResponse = await request(server.app).get(`/api/pipeline/${pipelineId}`);
    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.text).toContain('{\"name\":\"1-1\",\"status\":\"successful\"}');
    expect(statusResponse.text).toContain('{\"name\":\"1-2\",\"status\":\"ready\"}');
  });

  test('linking two pipelines and starting the first causes both to complete', async () => {
    // create first pipeline
    const pipeline1 = {
      'environment': [],
      'yamlPath': 'docs/examples/basic.yaml',
    };
    const response1 = await request(server.app)
      .post('/api/pipeline')
      .send(pipeline1);
    const pipelineId1 = JSON.parse(response1.text).id;
    expect(pipelineId1).toBeDefined();

    // create second pipeline
    const pipeline2 = {
      'environment': [],
      'yamlPath': 'docs/examples/basic.yaml',
    };
    const response2 = await request(server.app)
      .post('/api/pipeline')
      .send(pipeline2);
    const pipelineId2 = JSON.parse(response2.text).id;
    expect(pipelineId2).toBeDefined();

    // link pipelines together
    const linkResponse = await request(server.app).get(`/api/pipeline/${pipelineId1}/link/${pipelineId2}`);
    expect(linkResponse.statusCode).toBe(200);

    // start pipeline1
    const startResponse = await request(server.app).get(`/api/pipeline/${pipelineId1}/start`);
    expect(startResponse.statusCode).toBe(200);

    // get status of both pipelines
    const statusResponse1 = await request(server.app).get(`/api/pipeline/${pipelineId1}/status`);
    expect(statusResponse1.statusCode).toBe(200);
    expect(statusResponse1.text).toBe('{\"status\":\"successful\"}');

    const statusResponse2 = await request(server.app).get(`/api/pipeline/${pipelineId1}/status`);
    expect(statusResponse2.statusCode).toBe(200);
    expect(statusResponse2.text).toBe('{\"status\":\"successful\"}');
  });

  test('kill returns 404 Not Found when attempted against a non-existent pipeline', async () => {
    // attempt to kill a non-existent pipeline
    const response = await request(server.app).get('/api/pipeline/does-not-exist/kill');

    expect(response.statusCode).toBe(404);
  });

  test('kill returns 200 and does not modify an un-started pipeline', async () => {
    // create a test pipeline
    const pipeline = {
      'environment': [],
      'yamlPath': 'docs/examples/basic.yaml',
    };
    const postResponse = await request(server.app)
      .post('/api/pipeline')
      .send(pipeline);
    const pipelineId = JSON.parse(postResponse.text).id;
    expect(pipelineId).toBeDefined();

    // kill pipeline
    const response = await request(server.app).get(`/api/pipeline/${pipelineId}/kill`);
    expect(response.statusCode).toBe(200);

    // ensure pipeline is still in ready state
    const statusResponse = await request(server.app).get(`/api/pipeline/${pipelineId}/status`);
    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.text).toBe('{\"status\":\"ready\"}');
  });
});
