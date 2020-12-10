/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global jest, describe, beforeEach, expect */
import ConfigImporter, {loadConfigFile} from './ConfigImporter.js';
import {NodeProvider} from '../../common/index.js';
import log from 'winston';

jest.autoMockOff();

describe('ConfigImporter.load', () => {
  let importer;

  beforeEach(() => {
    importer = new ConfigImporter();
  });

  test('loads yaml into json object', () => {
    const content = `--- 
    environment: 
      FOO: foo
      QUX: qux 
    secrets: 
      BAR: bar 
    logging: 
      mode: files 
      path: /tmp`;
    const expected = {
      environment: {FOO: 'foo', QUX: 'qux'},
      secrets: {BAR: 'bar'},
      logging: {mode: 'files', path: '/tmp'},
    };
    jest.spyOn(NodeProvider, 'getFs').mockImplementation(() => {
      return {readFileSync: () => content};
    });

    importer.load();
    expect(importer.loadedConfigs).toStrictEqual(expected);
  });

  test('loads json string into json object', () => {
    const content = '{"environment": {"FOO": "foo","QUX": "qux"},"secrets": {"BAR": "bar"},"logging": {"mode": "files","path": "/tmp"}}';
    const expected = {
      environment: {FOO: 'foo', QUX: 'qux'},
      secrets: {BAR: 'bar'},
      logging: {mode: 'files', path: '/tmp'},
    };
    jest.spyOn(NodeProvider, 'getFs').mockImplementation(() => {
      return {readFileSync: () => content};
    });

    importer.load();
    expect(importer.loadedConfigs).toStrictEqual(expected);
  });

  test('most recently loaded content has the highest priority in the merge', () => {
    const content1 = '{"environment": {"FOO": "foo1","QUX": "qux1"},"secrets": {"BAR": "bar1"},"logging": {"mode": "files","path": "/tmp1"}}';
    const content2 = '{"environment": {"FOO": "foo2","QUX": "qux2"},"secrets": {"BAR": "bar2"},"logging": {"mode": "files","path": "/tmp2"}}';
    const expected = {
      environment: {FOO: 'foo2', QUX: 'qux2'},
      secrets: {BAR: 'bar2'},
      logging: {mode: 'files', path: '/tmp2'},
    };
    jest.spyOn(NodeProvider, 'getFs').mockImplementation(() => {
      return {readFileSync: () => content1};
    }).mockImplementation(() => {
      return {readFileSync: () => content2};
    });

    importer.load();
    expect(importer.loadedConfigs).toStrictEqual(expected);
  });
});

describe('ConfigImporter.updateOptions', () => {
  let importer;

  beforeEach(() => {
    importer = new ConfigImporter();
  });

  test('options already set should have the higher priority', () => {
    const options = {
      env: {FOO: 'foo_already_here'},
      secret: {BAR: 'bar_already_here'},
      logging: {mode: 'console'},
    };
    importer.loadedConfigs = {
      environment: {FOO: 'foo'},
      secrets: {BAR: 'bar'},
      logging: {mode: 'files', path: '/tmp'},
    };
    const expectedOptions = {
      env: {FOO: 'foo_already_here'},
      secret: {BAR: 'bar_already_here'},
      logging: {mode: 'console'},
    };

    importer.updateOptions(options);
    expect(options).toStrictEqual(expectedOptions);
  });

  test('options and loadedConfigs should merge', () => {
    const options = {env: {QUX: 'qux'}, secret: {BAZ: 'baz'}};
    importer.loadedConfigs = {
      environment: {FOO: 'foo'},
      secrets: {BAR: 'bar'},
      logging: {mode: 'files', path: '/tmp'},
    };
    const expectedOptions = {
      env: {FOO: 'foo', QUX: 'qux'},
      secret: {BAR: 'bar', BAZ: 'baz'},
      logging: 'files', loggingPath: '/tmp',
    };

    importer.updateOptions(options);
    expect(options).toStrictEqual(expectedOptions);
  });
});

describe('ConfigImporter.loadConfigFile', () => {
  test('invalid parsing should result in log warning', () => {
    const warnMock = jest.spyOn(log, 'warn').mockImplementation();
    const content = '{}{{}}}}}}';
    jest.spyOn(NodeProvider, 'getFs').mockImplementation(() => {
      return {readFileSync: () => content};
    });

    loadConfigFile('whatever');
    expect(warnMock.mock.calls.length).toBe(1);
  });
});
