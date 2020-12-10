/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global describe, test, expect, beforeEach  */
import ContainerLogger from './ContainerLogger.js';
import {_} from '../common/index.js';
import stripAnsi from 'strip-ansi';
import winston from 'winston';

describe('ContainerLogger colorizedConsoleFormatter tests', () => {
  let containerLogger;

  beforeEach(() => {
    containerLogger = new ContainerLogger();
  });

  test('Console output should be after the pipe.', () => {
    const message = {containerNames: {shortName: 'test'}, message: 'should be tabbed'};
    const output = containerLogger.colorizedConsoleFormatter(message);
    expect(stripAnsi(output)).toEqual('test                 | should be tabbed');
  });

  test('Long container names should be truncated.', () => {
    const message = {containerNames: {shortName: 'TheQuickBrownFoxJumpsOverTheLazyDog'}, message: 'should be truncated'};
    const output = containerLogger.colorizedConsoleFormatter(message);
    expect(stripAnsi(output)).toEqual('TheQuickBrownFoxJum~ | should be truncated');
  });

  test('Multiline messages should each have the container name prepended.', () => {
    const message = {containerNames: {shortName: 'multiline'}, message: 'first\nsecond'};
    const output = containerLogger.colorizedConsoleFormatter(message);
    expect(output.match(/multiline/g).length).toStrictEqual(2);
  });

  test('Should use different colors for different containers.', () => {
    containerLogger.colorizedConsoleFormatter({containerNames: {containerId: 'abc', shortName: 'container1'}, message: 'test'});
    containerLogger.colorizedConsoleFormatter({containerNames: {containerId: '123', shortName: 'container2'}, message: 'test'});
    expect(containerLogger.containerColor['abc']).not.toStrictEqual(containerLogger.containerColor['123']);
  });

  test('Should use different colors for containers with same name.', () => {
    containerLogger.colorizedConsoleFormatter({containerNames: {containerId: 'abc', shortName: 'container1'}, message: 'test'});
    containerLogger.colorizedConsoleFormatter({containerNames: {containerId: '123', shortName: 'container1'}, message: 'test'});
    expect(containerLogger.containerColor['abc']).not.toStrictEqual(containerLogger.containerColor['123']);
  });
});

describe('ContainerLogger createServerOutputStream tests', () => {
  test('container console logging pipes to the console logger', () => {
    const containerLogger = new ContainerLogger();
    const stream = containerLogger.createServerOutputStream(null, {containerNames: {qualifiedName: 'container1'}});
    expect(_.castArray(stream._readableState.pipes)).toEqual([containerLogger.consoleLogger]);
  });

  test('container file logging does not pipe to the console logger', () => {
    winston.fileLogging = {enabled: true, path: '/tmp'};
    const containerLogger = new ContainerLogger();
    const stream = containerLogger.createServerOutputStream(null, {containerNames: {qualifiedName: 'container1'}});
    expect(_.castArray(stream._readableState.pipes)).not.toEqual([containerLogger.consoleLogger]);
  });

  test('file logging is stored and cached', () => {
    winston.fileLogging = {enabled: true, path: '/tmp'};
    const containerLogger = new ContainerLogger();
    const stream = containerLogger.createServerOutputStream(null, {qualifiedName: 'container1'});
    const stream2 = containerLogger.createServerOutputStream(null, {qualifiedName: 'container1'});
    expect(stream._readableState.pipes).toEqual(stream2._readableState.pipes);
  });

  test('each container gets its own file logger', () => {
    winston.fileLogging = {enabled: true, path: '/tmp'};
    const containerLogger = new ContainerLogger();
    const stream = containerLogger.createServerOutputStream(null, {containerId: 'abc', qualifiedName: 'container1'});
    const stream2 = containerLogger.createServerOutputStream(null, {containerId: '123', qualifiedName: 'container2'});
    expect(stream._readableState.pipes).not.toBe(stream2._readableState.pipes);
  });

  test('container count increments', () => {
    winston.fileLogging = {enabled: true, path: '/tmp'};
    const containerLogger = new ContainerLogger();
    containerLogger.createServerOutputStream(null, {containerId: 'abc', qualifiedName: 'container1'});
    containerLogger.createServerOutputStream(null, {containerId: '123', qualifiedName: 'container2'});
    expect(containerLogger.containerCount).toBe(2);
  });

  test('container count increments, even when reusing name', () => {
    winston.fileLogging = {enabled: true, path: '/tmp'};
    const containerLogger = new ContainerLogger();
    containerLogger.createServerOutputStream(null, {containerId: 'abc', qualifiedName: 'container1'});
    containerLogger.createServerOutputStream(null, {containerId: '123', qualifiedName: 'container1'});
    expect(containerLogger.containerCount).toBe(2);
  });

  afterEach(() => {
    // remove the global state :(
    if (winston.fileLogging) {
      delete winston.fileLogging;
    }
  });
});
