/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global describe, test, expect, beforeEach  */
import LoggerTransportFactory from './LoggerTransportFactory.js';
import stripAnsi from 'strip-ansi';

jest.mock('./Logger.js');

describe('LoggerTransportFactory composeStyleFormatter tests', () => {
  let pipelineLogger;

  beforeEach(() => {
    jest.restoreAllMocks();
    pipelineLogger = LoggerTransportFactory;
  });

  test('Console output should be after the pipe.', () => {
    const message = {containerNames: {shortName: 'test'}, message: 'should be tabbed'};
    const output = pipelineLogger.composeStyleFormatter(message);
    expect(stripAnsi(output)).toEqual('test                 | should be tabbed');
  });

  test('Long container names should be truncated.', () => {
    const message = {containerNames: {shortName: 'TheQuickBrownFoxJumpsOverTheLazyDog'}, message: 'should be truncated'};
    const output = pipelineLogger.composeStyleFormatter(message);
    expect(stripAnsi(output)).toEqual('TheQuickBrownFoxJum~ | should be truncated');
  });

  test('Multiline messages should each have the container name prepended.', () => {
    const message = {containerNames: {shortName: 'multiline'}, message: 'first\nsecond'};
    const output = pipelineLogger.composeStyleFormatter(message);
    expect(output.match(/multiline/g).length).toStrictEqual(2);
  });

  test('Should use different colors for different containers.', () => {
    pipelineLogger.composeStyleFormatter({containerNames: {containerId: 'abc', shortName: 'container1'}, message: 'test'});
    pipelineLogger.composeStyleFormatter({containerNames: {containerId: '123', shortName: 'container2'}, message: 'test'});
    expect(pipelineLogger.containerColor['abc']).not.toStrictEqual(pipelineLogger.containerColor['123']);
  });

  test('Should use different colors for containers with same name.', () => {
    pipelineLogger.composeStyleFormatter({containerNames: {containerId: 'abc', shortName: 'container1'}, message: 'test'});
    pipelineLogger.composeStyleFormatter({containerNames: {containerId: '123', shortName: 'container1'}, message: 'test'});
    expect(pipelineLogger.containerColor['abc']).not.toStrictEqual(pipelineLogger.containerColor['123']);
  });
});
