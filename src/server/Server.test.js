/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeAll, describe, expect */
import Server from './Server.js';
import {ServerError} from '../common/index.js';
import request from 'supertest';

// Testing only routes here which are not covered by specific route api classes
describe('Server.loadRoutes', async () => {
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

  test('should load the default route', async () => {
    const response = await request(server.app).get('/');

    expect(response.statusCode).toBe(200);
    expect(response.text).toContain('Welcome to the CIX landing page.');
  });

  test('should load the /api-docs route', async () => {
    const response = await request(server.app).get('/api-docs');

    expect(response.statusCode).toBe(301); // redirects to /api-docs/#/
  });

  test('should load the /api-docs/#/ route', async () => {
    const response = await request(server.app).get('/api-docs/#/');

    expect(response.statusCode).toBe(200);
    expect(response.text).toContain('Swagger UI');
  });
});

describe('Server.onError', () => {
  let server;
  const port = Math.floor(Math.random() * 64536) + 1000;

  beforeAll(async () => {
    jest.resetAllMocks();
    server = new Server(port);
  });

  afterAll(async () => {
    await server.close();
  });

  class TestError extends Error {
    constructor(message, code) {
      super();
      this.message = message;
      this.code = code;
    }
  }

  test('should say privileges required, if EACCES returned', () => {
    expect(() => server.onError(new TestError('error', 'EACCES'))).toThrow(ServerError);
    expect(() => server.onError(new TestError('error', 'EACCES'))).toThrow('Requires elevated privileges...');
  });

  test('should say port is in use, if EADDRINUSE returned', () => {
    expect(() => server.onError(new TestError('error', 'EADDRINUSE'))).toThrow(ServerError);
    expect(() => server.onError(new TestError('error', 'EADDRINUSE'))).toThrow('Port is already in use...');
  });

  test('should rethrow error if code not recognized', () => {
    expect(() => server.onError(new TestError('error'))).toThrow(TestError);
    expect(() => server.onError(new TestError('error'))).toThrow('error');
  });
});

describe('Server.normalizePort', () => {
  let server;
  const port = Math.floor(Math.random() * 64536) + 1000;

  beforeAll(async () => {
    jest.resetAllMocks();
    server = new Server(port);
  });

  afterAll(async () => {
    await server.close();
  });

  test('named pipes should be returned', () => {
    expect(server.normalizePort('named-pipe')).toBe('named-pipe');
  });

  test('integers should be returned', () => {
    expect(server.normalizePort('10000')).toBe(10000);
  });

  test('negative integers should cause a server error', () => {
    expect(() => server.normalizePort(-10000)).toThrow(ServerError);
  });

  test('out of bounds integers should cause a server error', () => {
    expect(() => server.normalizePort(100000000)).toThrow(ServerError);
    expect(() => server.normalizePort(100000000)).toThrow('Provided port \'100000000\' is invalid!');
  });

  test('non-integers should be converted to nearest integer', () => {
    expect(server.normalizePort(10.4)).toBe(10);
  });
});
