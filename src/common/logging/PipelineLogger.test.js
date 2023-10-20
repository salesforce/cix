/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global describe, test, expect  */
import Environment from '../../engine/environment/Environment.js';
import PipelineLogger from './PipelineLogger.js';

describe('PipelineLogger createContainerOutputStream tests', () => {
  test('by default, their should be two pipes (containerConsoleLogger and remoteStream)', () => {
    const pipelineLogger = new PipelineLogger();
    const stream = pipelineLogger.createContainerOutputStream( {containerNames: {shortName: 'container1'}});
    expect(stream._readableState.pipes.length).toBe(1);
  });

  test('file logging is stored and cached', () => {
    const pipelineLogger = new PipelineLogger();
    const stream = pipelineLogger.createContainerOutputStream( {shortName: 'container1'});
    const stream2 = pipelineLogger.createContainerOutputStream( {shortName: 'container1'});
    expect(stream._readableState.pipes).toEqual(stream2._readableState.pipes);
  });

  test('each container gets its own file logger', () => {
    const pipelineLogger = new PipelineLogger();
    const stream = pipelineLogger.createContainerOutputStream( {containerId: 'abc', shortName: 'container1'});
    const stream2 = pipelineLogger.createContainerOutputStream( {containerId: '123', shortName: 'container2'});
    expect(stream._readableState.pipes).not.toBe(stream2._readableState.pipes);
  });

  test.skip('container count increments', () => {
    // Manually run this test because it actually creates a file...
    const pipelineLogger = new PipelineLogger(undefined, 'files', 'logs');
    pipelineLogger.createContainerOutputStream( {containerId: 'abc', shortName: 'container1'});
    pipelineLogger.createContainerOutputStream( {containerId: '123', shortName: 'container2'});
    expect(pipelineLogger.filenameCount).toBe(2);
  });

  test.skip('container count increments, even when reusing name', () => {
    // Manually run this test because it actually creates a file...
    const pipelineLogger = new PipelineLogger(undefined);
    pipelineLogger.createContainerOutputStream({containerId: 'abc', shortName: 'container1'});
    pipelineLogger.createContainerOutputStream({containerId: '123', shortName: 'container1'});
    expect(pipelineLogger.filenameCount).toBe(2);
  });

  test('ContainerStreamTransform buffers input with no newline', () => {
    const emptyEnv = new Environment();
    const pipelineLogger = new PipelineLogger({getEnvironment: () => emptyEnv});

    const dockerStream = pipelineLogger.createContainerOutputStream({shortName: 'container1'});
    const noNewline = 'There is no newline...';
    dockerStream.write(noNewline);
    expect(dockerStream.previousIncompleteChunk).toEqual(noNewline);
    dockerStream.write('\n');
    expect(dockerStream.previousIncompleteChunk).toEqual('');
  });
});
