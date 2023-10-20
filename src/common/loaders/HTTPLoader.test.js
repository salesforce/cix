/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeEach, describe, expect */
import {ExecutionError} from '../index.js';
import HTTPLoader from './HTTPLoader.js';
import axios from 'axios';

jest.mock('axios');

describe('HTTPLoader.relativePath', () => {
  let loader;

  beforeEach(() => {
    jest.resetAllMocks();
    loader = new HTTPLoader();
  });

  test('relative path returned is relative to folder of path argument', () => {
    const definition = {src: 'testImported.yaml'};
    expect(loader.relativePath('https://github.com/testImporter.yaml', undefined, definition)).toBe('https://github.com/testImported.yaml');
  });
});

describe('HTTPLoader.fetch', () => {
  let loader;

  beforeEach(() => {
    jest.resetAllMocks();
    loader = new HTTPLoader();
  });

  test('expect fetch to return data with auth token', async () => {
    const expectedResp = {data: 'test_data'};
    axios.mockImplementation(() => Promise.resolve(expectedResp));
    const environmentMock = {};
    environmentMock.getEnvironmentVariable = jest.fn();
    environmentMock.replace$$Values = jest.fn();
    environmentMock.replace$$Values.mockReturnValue('replace_token');
    environmentMock.getEnvironmentVariable.mockReturnValue({value: '$$token'});

    const resp = await loader.fetch('http://test.com/path', environmentMock);
    expect(resp).toBe(expectedResp.data);
  });

  test('expect fetch to return error if axios rejects', async () => {
    axios.mockImplementation(() => Promise.reject(new Error('error')));
    const environmentMock = {};
    environmentMock.getEnvironmentVariable = jest.fn();
    environmentMock.getEnvironmentVariable.mockReturnValue(undefined); // no token

    await expect(loader.fetch('http://test.com/path', environmentMock)).rejects.toThrow(ExecutionError);
  });

  test('expect fetch to use YAML authToken over Environment authToken', async () => {
    const expectedResp = {data: 'test_data'};
    axios.mockImplementation(() => Promise.resolve(expectedResp));
    const environmentMock = {};
    environmentMock.getEnvironmentVariable = jest.fn();
    environmentMock.replace$$Values = (input) => `${input}`;
    environmentMock.getEnvironmentVariable.mockReturnValue({value: '5678'});

    await loader.fetch('http://test.com/path', environmentMock, '1234');
    expect(axios.mock.calls[0][0].headers.Authorization).toBe('token 1234');
  });
});
