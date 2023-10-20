/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global  describe, expect */
import Pipeline from './Pipeline.js';
import Step from './Step.js';

describe('Step tests:', () => {
  let emptyPipeline;
  let pipelineRootNode;
  const mockRunStep = jest.fn().mockResolvedValue();

  beforeEach( async () => {
    emptyPipeline = new Pipeline({rawPipeline: {version: 2.1, pipeline: [{}]}});
    await emptyPipeline.loadAndValidate();
    emptyPipeline.getExec = jest.fn().mockImplementation(() => {
      return {runStep: mockRunStep, constructor: {name: 'Pipeline'}};
    });
    pipelineRootNode = emptyPipeline.getPipelineTreeRoot();
    jest.clearAllMocks();
  });

  test('Step:getParent(): returns parent.', () => {
    const step = new Step({
      name: 'basic',
      image: 'alpine:3.9',
      commands: ['hostname'],
    }, pipelineRootNode);
    expect(step.getParent()).toEqual(pipelineRootNode);
  });

  test('Step:start(): start calls runStep once.', async () => {
    const step = new Step({
      name: 'basic',
      image: 'alpine:3.9',
      commands: ['hostname'],
    }, pipelineRootNode);
    await step.start();
    expect(mockRunStep.mock.calls.length).toEqual(1);
  });

  test('Step:start(): runStep gets the correct command.', async () => {
    const step = new Step({
      name: 'basic',
      image: 'alpine:3.9',
      commands: ['hostname'],
    }, emptyPipeline);
    await step.start();
    expect(mockRunStep.mock.calls[0][0].commands).toEqual(['hostname']);
  });

  test('Step:start(): status is set to successful after normal run.', async () => {
    const step = new Step({
      name: 'basic',
      image: 'alpine:3.9',
      commands: ['hostname'],
    }, pipelineRootNode);
    await step.start();
    expect(mockRunStep.mock.calls[0][0].commands).toEqual(['hostname']);
    expect(step.getStatus()).toEqual(Step.STATUS.successful);
  });

  test('Step:start(): status is set to failed after failed run.', async () => {
    const mockRunFailedStep = jest.fn().mockRejectedValue('step failed');
    emptyPipeline.getExec = jest.fn().mockImplementation(() => {
      return {runStep: mockRunFailedStep, constructor: {name: 'Pipeline'}};
    });
    const step = new Step({
      name: 'basic',
      image: 'alpine:3.9',
      commands: ['exit 1'],
    }, pipelineRootNode);

    try {
      await step.start();
    } catch (err) {
      expect(err).toEqual('step failed');
    }
    expect(step.getStatus()).toEqual(Step.STATUS.failed);
  });

  test('Step:start(): status \'skipped\' remains when it has already been set.', async () => {
    const step = new Step({
      name: 'basic',
      image: 'alpine:3.9',
      commands: ['hostname'],
    }, pipelineRootNode);
    step.setStatus(Step.STATUS.skipped);
    await step.start();
    expect(step.getStatus()).toEqual(Step.STATUS.skipped);
  });

  test('Step:validatePayload(): sets an empty array for a valid payload', async () => {
    const step = new Step({
      step: null,
      image: 'backgroundprocess',
      commands: ['sleep 60'],
      background: true,
    }, pipelineRootNode);
    expect(step.getErrors()).toEqual([]);
  });

  test('Step:validatePayload(): sets a message for invalid loop values', () => {
    const step = new Step({
      name: 'invalidLoop',
      loop: -10,
    }, pipelineRootNode);
    expect(step.getErrors()).toEqual(['Yaml: step loop value must be greater than 1 (actual value: -10): invalidLoop']);
  });

  test('Step:validatePayload(): sets a message for invalid retry iterations value', () => {
    const step = new Step({
      name: 'invalidRetryIterations',
      retry: {iterations: 0, backoff: 10},
    }, pipelineRootNode);
    expect(step.getErrors()).toEqual(['Yaml: step retry iterations value must be greater than 1 (actual value: 0): invalidRetryIterations']);
  });

  test('Step:validatePayload(): sets a message for invalid backoff iterations value', () => {
    const step = new Step({
      name: 'invalidRetryBackoff',
      retry: {iterations: 4, backoff: -1},
    }, pipelineRootNode);
    expect(step.getErrors()).toEqual(['Yaml: step retry backoff value (in seconds) must be greater than or equal to 0 (actual value: -1): invalidRetryBackoff']);
  });

  test('Step:validatePayload(): sets a message for competing loop and retry usage', () => {
    const step = new Step({
      name: 'invalidRetryLoopCompeting',
      retry: {iterations: 4, backoff: 10},
      loop: 10,
    }, pipelineRootNode);
    expect(step.getErrors()).toEqual(['Yaml: step retry and loop cannot be set on the same step: invalidRetryLoopCompeting']);
  });

  test('Step:validatePayload(): sets a message for trying to mount to workspace mount point', () => {
    const DEFAULT_WORKSPACE_MOUNT = '/cix/src';
    const step = new Step({
      name: 'invalidWorkspaceMountPoint',
      volumes: ['/tmp:' + DEFAULT_WORKSPACE_MOUNT, '/home/whatever:' + DEFAULT_WORKSPACE_MOUNT],
    }, pipelineRootNode);
    expect(step.getErrors()).toEqual(['Yaml: the following mount points are not unique for step invalidWorkspaceMountPoint: ' + DEFAULT_WORKSPACE_MOUNT]);
  });

  test('Step:validatePayload(): sets a message for volumes in the wrong format - no colon', () => {
    const step = new Step({
      name: 'invalidVolumeFormat',
      volumes: ['/tmp/tmp'],
    }, pipelineRootNode);
    expect(step.getErrors()).toEqual(['Yaml: volumes must be in src:dest(:ro - optionally) format (actual value: /tmp/tmp): invalidVolumeFormat']);
  });

  test('Step:validatePayload(): sets a message for volumes in the wrong format - too many mounts specified', () => {
    const step = new Step({
      name: 'invalidVolumeFormat',
      volumes: ['/tmp:/tmp:/tmp'],
    }, pipelineRootNode);
    expect(step.getErrors()).toEqual(['Yaml: volumes must be in src:dest(:ro - optionally) format (actual value: /tmp:/tmp:/tmp): invalidVolumeFormat']);
  });

  test('Step:validatePayload(): sets a message for volumes with conflicting mount points', () => {
    const step = new Step({
      name: 'conflictingMountPoints',
      volumes: ['/tmp:/tmp', '/tmp2:/tmp:ro'],
    }, pipelineRootNode);
    expect(step.getErrors()).toEqual(['Yaml: the following mount points are not unique for step conflictingMountPoints: /tmp']);
  });

  test('Step:validatePayload(): sets an empty array for read-only volume', () => {
    const step = new Step({
      name: 'validReadOnlyVolume',
      volumes: ['/tmp:/tmp:ro'],
    }, pipelineRootNode);
    expect(step.getErrors()).toEqual([]);
  });

  test('Step:validatePayload(): sets a message when both arguments and commands are specified', () => {
    const step = new Step({
      name: 'test',
      arguments: ['a', 'b'],
      commands: ['a', 'b', 'c'],
    }, pipelineRootNode);
    expect(step.getErrors()).toEqual(['Yaml: step contains both \'arguments\' and \'commands\' properties: test']);
  });

  test('Step:validatePayload(): sets a message for invalid pull-policy value', () => {
    const step = new Step({
      'name': 'test',
      'pull-policy': 'WhenIFeelLikeIt',
    }, pipelineRootNode);
    expect(step.getErrors()).toEqual(['Yaml: step contains invalid pull-policy \'WhenIFeelLikeIt\' (allowed: Default, Always, IfNotPresent, Never): test']);
  });

  test('Step:(): sets workspace to default', () => {
    const step = new Step({
      'name': 'test',
    }, pipelineRootNode);
    expect(step.definition['workspace-mount-point']).toEqual('/cix/src');
  });

  test('Step:(): sets workspace to supplied', () => {
    const step = new Step({
      'name': 'test',
      'workspace-mount-point': '/tmp/project',
    }, pipelineRootNode);
    expect(step.definition['workspace-mount-point']).toEqual('/tmp/project');
  });
});

describe('Step looping tests:', () => {
  let emptyPipeline;
  let pipelineRootNode;
  const mockRunStep = jest.fn().mockResolvedValue();

  beforeEach( async () => {
    emptyPipeline = new Pipeline({rawPipeline: {version: 2.1, pipeline: [{}]}});
    await emptyPipeline.loadAndValidate();
    emptyPipeline.getExec = jest.fn().mockImplementation(() => {
      return {runStep: mockRunStep, constructor: {name: 'Pipeline'}};
    });
    pipelineRootNode = emptyPipeline.getPipelineTreeRoot();
    jest.clearAllMocks();
  });

  test('Step:getParent(): returns parent.', () => {
    const step = new Step({
      name: 'basic',
      image: 'alpine:3.9',
      commands: ['hostname'],
    }, pipelineRootNode);
    expect(step.getParent()).toEqual(pipelineRootNode);
  });

  test('Step:start(): loop will run step n times.', async () => {
    const step = new Step({
      name: 'basic',
      loop: 3,
      image: 'alpine:3.9',
      commands: ['hostname'],
    }, pipelineRootNode);
    await step.start();
    expect(mockRunStep.mock.calls.length).toEqual(3);
  });

  test('Step:start(): loop will not run if count is 0.', async () => {
    const step = new Step({
      name: 'basic',
      loop: 0,
      image: 'alpine:3.9',
      commands: ['hostname'],
    }, pipelineRootNode);
    await step.start();
    expect(mockRunStep.mock.calls.length).toEqual(0);
  });

  test('Step:start(): loop with count 1 is fine.', async () => {
    const step = new Step({
      name: 'basic',
      loop: 1,
      image: 'alpine:3.9',
      commands: ['hostname'],
    }, pipelineRootNode);
    await step.start();
    expect(mockRunStep.mock.calls.length).toEqual(1);
  });

  test('Step:start(): loop only takes numeric values.', async () => {
    const step = new Step({
      name: 'basic',
      loop: 'a',
      image: 'alpine:3.9',
      commands: ['hostname'],
    }, pipelineRootNode);
    await step.start();
    expect(mockRunStep.mock.calls.length).toEqual(0);
  });

  test('Step:start(): loop quoted strings work.', async () => {
    const step = new Step({
      name: 'basic',
      loop: '2',
      image: 'alpine:3.9',
      commands: ['hostname'],
    }, pipelineRootNode);
    await step.start();
    expect(mockRunStep.mock.calls.length).toEqual(2);
  });

  test('Step:start(): counter-variable can be set.', async () => {
    const step = new Step({
      'name': 'basic',
      'loop': '2',
      'counter-variable': 'COUNTER',
      'image': 'alpine:3.9',
      'commands': ['hostname'],
    }, pipelineRootNode);
    await step.start();
    expect(mockRunStep.mock.calls[0][0].environment).toEqual([{name: 'COUNTER', value: '1'}]);
    expect(mockRunStep.mock.calls[1][0].environment).toEqual([{name: 'COUNTER', value: '2'}]);
  });

  test('Step:start(): cannot use for-each and loop.', async () => {
    const step = new Step({
      'name': 'basic',
      'loop': '2',
      'for-each': 'a,b,c,d',
      'element-variable': 'i',
      'image': 'alpine:3.9',
      'commands': ['hostname'],
    }, pipelineRootNode);
    try {
      await step.start();
    } catch (err) {
      expect(err.message).toEqual('Cannot use both for-each and loop within the same step.');
    }
    expect(mockRunStep.mock.calls.length).toEqual(0);
    expect.assertions(2);
  });

  test('Step:start(): for-each will run CSV list.', async () => {
    const step = new Step({
      'name': 'basic',
      'for-each': 'a,b,c,d',
      'element-variable': 'i',
      'image': 'alpine:3.9',
      'commands': ['hostname'],
    }, pipelineRootNode);
    await step.start();
    expect(mockRunStep.mock.calls.length).toEqual(4);
  });

  test('Step:start(): for-each will accept a single value', async () => {
    const step = new Step({
      'name': 'basic',
      'for-each': 'a',
      'element-variable': 'i',
      'image': 'alpine:3.9',
      'commands': ['hostname'],
    }, pipelineRootNode);
    await step.start();
    expect(mockRunStep.mock.calls.length).toEqual(1);
  });

  test('Step:start(): for-each with no value will not run', async () => {
    const step = new Step({
      'name': 'basic',
      'for-each': '',
      'element-variable': 'i',
      'image': 'alpine:3.9',
      'commands': ['hostname'],
    }, pipelineRootNode);
    await step.start();
    expect(mockRunStep.mock.calls.length).toEqual(0);
  });

  test('Step:start(): for-each with no value will not run (as YAML)', async () => {
    const step = new Step({
      'name': 'basic',
      'for-each': [''],
      'element-variable': 'i',
      'image': 'alpine:3.9',
      'commands': ['hostname'],
    }, pipelineRootNode);
    await step.start();
    expect(mockRunStep.mock.calls.length).toEqual(0);
  });

  test('Step:start(): for-each can use counter-variable', async () => {
    const step = new Step({
      'name': 'basic',
      'for-each': ['a', 'b'],
      'element-variable': 'e',
      'counter-variable': 'c',
      'image': 'alpine:3.9',
      'commands': ['hostname'],
    }, pipelineRootNode);
    await step.start();
    expect(mockRunStep.mock.calls[0][0].environment).toEqual([{name: 'e', value: 'a'}, {name: 'c', value: '1'}]);
    expect(mockRunStep.mock.calls[1][0].environment).toEqual([{name: 'e', value: 'b'}, {name: 'c', value: '2'}]);
    expect(mockRunStep.mock.calls.length).toEqual(2);
  });

  test('Step:start(): for-each will run YAML list.', async () => {
    const step = new Step({
      'name': 'basic',
      'for-each': ['a', 'b', 'c', 'd'],
      'element-variable': 'i',
      'image': 'alpine:3.9',
      'commands': ['hostname'],
    }, pipelineRootNode);
    await step.start();
    expect(mockRunStep.mock.calls.length).toEqual(4);
  });

  test('Step:start(): for-each will ignore trailing comma.', async () => {
    const step = new Step({
      'name': 'basic',
      'for-each': 'a,b,c,',
      'element-variable': 'i',
      'image': 'alpine:3.9',
      'commands': ['hostname'],
    }, pipelineRootNode);
    await step.start();
    expect(mockRunStep.mock.calls.length).toEqual(3);
  });


  test('Step:start(): for-each must provide element-variable.', async () => {
    const step = new Step({
      'name': 'basic',
      'for-each': 'a,b,c,d',
      'image': 'alpine:3.9',
      'commands': ['hostname'],
    }, pipelineRootNode);
    try {
      await step.start();
    } catch (err) {
      expect(err.message).toMatch('for-each must include an element-variable definition.');
    }
    expect(mockRunStep.mock.calls.length).toEqual(0);
    expect.assertions(2);
  });

  test('Step:start(): for-each will substitute and environment variable.', async () => {
    emptyPipeline.getEnvironment().addEnvironmentVariable({name: 'LOOP', value: 'a,b,c'});
    const step = new Step({
      'name': 'basic',
      'for-each': '$$LOOP',
      'element-variable': 'i',
      'image': 'alpine:3.9',
      'commands': ['hostname'],
    }, pipelineRootNode);

    await step.start();
    expect(mockRunStep.mock.calls.length).toEqual(3);
  });

  test('Step:start(): for-each with un-substituted variable will skip.', async () => {
    const step = new Step({
      'name': 'basic',
      'for-each': '$$LOOP',
      'element-variable': 'i',
      'image': 'alpine:3.9',
      'commands': ['hostname'],
    }, pipelineRootNode);

    await step.start();
    expect(mockRunStep.mock.calls.length).toEqual(0);
  });
});
