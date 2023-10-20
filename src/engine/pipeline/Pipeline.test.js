/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* eslint-disable key-spacing */
/* global  describe, expect */
import {ExecutionError, Logger, NodeProvider, ValidateError, _} from '../../common/index.js';
import Pipeline from './Pipeline.js';
import Step from './Step.js';

const mockInit = jest.fn().mockResolvedValue();
const mockRunStep = jest.fn().mockResolvedValue();
const mockTeardown = jest.fn().mockResolvedValue();
const mockReject = jest.fn().mockRejectedValue();
const mockSuccessfulPipeline = jest.fn().mockImplementation(() => {
  return {init: mockInit, tearDown: mockTeardown, runStep: mockRunStep};
});
const mockFailedPipeline = jest.fn().mockImplementation(() => {
  return {init: mockInit, tearDown: mockTeardown, runStep: mockReject};
});
const mockFailedInit = jest.fn().mockImplementation(() => {
  return {init: mockReject, tearDown: mockTeardown, runStep: mockRunStep};
});

describe('Pipeline tests:', () => {
  let basicPipeline; let nestedPipeline;
  const basicPipelineDefinition = {
    version: 2.1,
    pipeline: [{
      step: {
        name: 'basic',
        image: 'test',
      },
    }],
  };
  const nestedStepsPipelineDefinition = {
    version: 2.1,
    pipeline: [{
      'steps': {
        'name': 1,
        'pipeline': [{
          'step': {
            'name': '1.1',
            'image': 'test',
          },
        }, {
          'steps': {
            'name': '1.2',
            'parallel': true,
            'pipeline': [{
              'step': {
                'name': '1.2.1',
                'image': 'test',
              },
            }, {
              'step': {
                'name': '1.2.2',
                'image': 'test',
              },
            }],
          },
        }, {
          'steps': {
            'name': '1.3',
            'pipeline': [{
              'step': {
                'name': '1.3.1',
                'image': 'test',
              },
            }, {
              'step': {
                'name': '1.3.2',
                'image': 'test',
              },
            }],
          },
        }],
      },
    }, {
      'step': {
        'name': '2.1',
        'image': 'test',
      },
    }],
  };

  beforeEach(async () => {
    basicPipeline = new Pipeline({rawPipeline: _.cloneDeep(basicPipelineDefinition)});
    await basicPipeline.loadAndValidate();
    nestedPipeline = new Pipeline({rawPipeline: _.cloneDeep(nestedStepsPipelineDefinition)});
    await nestedPipeline.loadAndValidate();
    jest.spyOn(basicPipeline, 'getExec').mockImplementation(mockSuccessfulPipeline);
    jest.spyOn(nestedPipeline, 'getExec').mockImplementation(mockSuccessfulPipeline);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('Supplying both rawPipeline and yamlPath results in Error.', () => {
    expect(() => {
      new Pipeline({rawPipeline: 'blah', yamlPath: 'blah'});
    }).toThrow(new ValidateError('Cannot use yamlPath and rawPipeline parameters together.', 400));
  });

  test('Supplying neither rawPipeline or yamlPath results in Error.', async () => {
    expect(() => {
      new Pipeline({});
    }).toThrow(new ValidateError('Either the yamlPath or rawPipeline parameters are required.', 400));
  });

  test('Supplying nothing results in Error.', async () => {
    expect(() => {
      new Pipeline();
    }).toThrow(new ValidateError('Must pass in a new Pipeline object.', 400));
  });

  test('Pipeline: Get/Set environment object and value.', () => {
    const testEnvName = 'test'; const testEnvValue = '1234'; const testVar = {name: testEnvName, value: testEnvValue};
    basicPipeline.getEnvironment().addEnvironmentVariable(testVar);
    expect(basicPipeline.getEnvironment().getEnvironmentVariable(testEnvName).value).toEqual(testEnvValue);
  });

  test('Pipeline: Describes pipeline.', async () => {
    // eslint-disable-next-line max-len
    const result = {name: 'root', steps: [{name: '1', steps: [{name:'1.1', status:'ready'}, {name:'1.2', parallel: true, steps: [{name:'1.2.1', status: 'ready'}, {name:'1.2.2', status: 'ready'}]}, {name:'1.3', steps: [{name:'1.3.1', status: 'ready'}, {name:'1.3.2', status: 'ready'}]}]}, {name:'2.1', status: 'ready'}]};
    const description = await nestedPipeline.describeSequence();
    expect(description).toEqual(result);
  });

  test('Pipeline: Describes pipeline with environment variables', async () => {
    const nestStepsWithEnvironmentPipelineDefinition = _.cloneDeep(nestedStepsPipelineDefinition);
    nestStepsWithEnvironmentPipelineDefinition.pipeline[0].steps.environment = [{name: 'foo', value: 'foo'}];
    nestStepsWithEnvironmentPipelineDefinition.pipeline[0].steps.pipeline[0].step.environment = [{name: 'bar', value: 'bar'}];

    const nestedPipelineWithEnvironment = new Pipeline({rawPipeline: nestStepsWithEnvironmentPipelineDefinition});
    // eslint-disable-next-line max-len
    const result = {name: 'root', steps: [{name: '1', steps: [{name:'1.1', status: 'ready'}, {name:'1.2', parallel: true, steps: [{name:'1.2.1', status: 'ready'}, {name:'1.2.2', status: 'ready'}]}, {name:'1.3', steps: [{name:'1.3.1', status: 'ready'}, {name:'1.3.2', status: 'ready'}]}]}, {name:'2.1', status: 'ready'}], environment_keys: ['foo', 'bar']};
    const description = await nestedPipelineWithEnvironment.describeSequence();
    expect(description).toEqual(result);
  });

  test('Pipeline: getStep list returns only steps, in order.', () => {
    const list = nestedPipeline.getStepList();
    expect(_.map(list, (item) => {
      return item.getName();
    })).toEqual(['1.1', '1.2.1', '1.2.2', '1.3.1', '1.3.2', '2.1']);
  });

  test('Pipeline: getSteps list returns only steps, in order.', () => {
    const list = nestedPipeline.getStepsList();
    expect(_.map(list, (item) => {
      return item.getName();
    })).toEqual(['root', '1', '1.2', '1.3']);
  });

  test('Pipeline: getPipelineNodeList list returns steps and step, in order.', async () => {
    const list = nestedPipeline.getPipelineNodeList();
    expect(_.map(list, (item) => {
      return item.getName();
    })).toEqual(['root', '1', '1.1', '1.2', '1.2.1', '1.2.2', '1.3', '1.3.1', '1.3.2', '2.1']);
  });

  test('Pipeline: Returns accurate length.', () => {
    expect(basicPipeline.getLength()).toEqual(1);
  });

  test('Pipeline: Kill calls teardown on active pipelines.', () => {
    basicPipeline.setStatus(Pipeline.STATUS.running);
    expect(basicPipeline.getLength()).toEqual(1);
  });

  test('Pipeline: Init called once.', async () => {
    await basicPipeline.start();
    expect(mockInit.mock.calls.length).toBe(1);
  });

  test('Pipeline: Teardown called once.', async () => {
    await basicPipeline.start();
    expect(mockTeardown.mock.calls.length).toBe(1);
  });

  test('Pipeline: runstep called once.', async () => {
    await basicPipeline.start();
    expect(mockRunStep.mock.calls.length).toBe(1);
  });

  test('Pipeline: successful pipeline status.', async () => {
    await basicPipeline.start();
    expect(basicPipeline.getStatus()).toBe('successful');
  });

  test('Pipeline: failure has failed status.', async () => {
    jest.spyOn(basicPipeline, 'getExec').mockImplementation(mockFailedPipeline);
    await basicPipeline.start();
    expect(basicPipeline.getStatus()).toBe('failed');
  });

  test('Pipeline: teardown called on failure.', async () => {
    jest.spyOn(basicPipeline, 'getExec').mockImplementation(mockFailedPipeline);
    await basicPipeline.start();
    expect(mockTeardown.mock.calls.length).toBe(1);
  });

  test('Pipeline: steps after a failed step are marked as skipped', async () => {
    jest.spyOn(nestedPipeline, 'getExec').mockImplementation(mockFailedPipeline);
    await nestedPipeline.start();
    expect(nestedPipeline.getStatus()).toBe('failed');
    expect(nestedPipeline.getStepList().filter((node) => node.getStatus() === Step.STATUS.skipped).length).toEqual(5);
  });

  test('Pipeline: teardown called on init failure.', async () => {
    jest.spyOn(basicPipeline, 'getExec').mockImplementation(mockFailedInit);
    await basicPipeline.start();
    expect(mockTeardown.mock.calls.length).toBe(1);
  });

  test('Pipeline: can get status of chained pipelines on failure.', async () => {
    basicPipeline.setNextPipeline(nestedPipeline);
    basicPipeline.setStatus(Pipeline.STATUS.successful);
    nestedPipeline.setStatus(Pipeline.STATUS.failed);
    expect(basicPipeline.getStatus()).toBe(Pipeline.STATUS.successful);
    expect(basicPipeline.getStatus(true)).toBe(Pipeline.STATUS.failed);
  });

  test('Pipeline: can get status of chained pipelines on success.', async () => {
    basicPipeline.setNextPipeline(nestedPipeline);
    basicPipeline.setStatus(Pipeline.STATUS.successful);
    nestedPipeline.setStatus(Pipeline.STATUS.successful);
    expect(basicPipeline.getStatus()).toBe(Pipeline.STATUS.successful);
    expect(basicPipeline.getStatus(true)).toBe(Pipeline.STATUS.successful);
  });

  test('Pipeline: can get status of chained pipelines while in progress.', async () => {
    basicPipeline.setNextPipeline(nestedPipeline);
    basicPipeline.setStatus(Pipeline.STATUS.successful);
    nestedPipeline.setStatus(Pipeline.STATUS.running);
    expect(basicPipeline.getStatus()).toBe(Pipeline.STATUS.successful);
    expect(basicPipeline.getStatus(true)).toBe(Pipeline.STATUS.running);
  });

  test('Pipeline: setStatus throws on unrecognized status.', () => {
    expect(() => {
      basicPipeline.setStatus('invalid');
    }).toThrow(/is not a valid status/);
  });

  test('Pipeline: awaitStatusChange notifies caller when setStatus is called.', async () => {
    const spy = jest.spyOn(basicPipeline, 'awaitStatusChange');
    const result = basicPipeline.awaitStatusChange();
    basicPipeline.setStatus(Pipeline.STATUS.running);
    await result;
    expect(spy.mock.results[0].value).resolves.toBe(Pipeline.STATUS.running);
  });

  test('Pipeline: awaitStatusChange notifies only on select statuses.', async () => {
    const spy = jest.spyOn(basicPipeline, 'awaitStatusChange');
    const result = basicPipeline.awaitStatusChange([Pipeline.STATUS.running]);
    // we will ignore this one
    basicPipeline.setStatus(Pipeline.STATUS.paused);
    // set this one so it fires after the await result, this one should return a result
    setTimeout(() => basicPipeline.setStatus(Pipeline.STATUS.running), 100);
    await result;
    expect(spy.mock.results[0].value).resolves.toBe(Pipeline.STATUS.running);
  });

  test('Pipeline: resume accepts a step breakpoint and runs to it.', async () => {
    nestedPipeline.resume('1.1');
    await nestedPipeline.awaitStatusChange(['running']);
    expect(nestedPipeline.getBreakpoint()).toEqual('1.1');
    await nestedPipeline.awaitStatusChange(['paused']);
    expect(nestedPipeline.getStatus()).toBe('paused');
    expect(nestedPipeline.getStepList().filter((node) => node.getStatus() === Step.STATUS.successful).length).toEqual(1);
  });

  test('Pipeline: resume accepts a steps breakpoint and runs to it.', async () => {
    nestedPipeline.resume('1.2');
    await nestedPipeline.awaitStatusChange(['running']);
    expect(nestedPipeline.getBreakpoint()).toEqual('1.2');
    await nestedPipeline.awaitStatusChange(['paused']);
    expect(nestedPipeline.getStatus()).toBe('paused');
    // 1.1, 1.2.1 and 1.2.2 should all have ran...
    expect(nestedPipeline.getStepList().filter((node) => node.getStatus() === Step.STATUS.successful).length).toEqual(3);
  });

  test('Pipeline: next after parallel breakpoint moves past steps block.', async () => {
    nestedPipeline.resume('1.2');
    await nestedPipeline.awaitStatusChange(['running']);
    expect(nestedPipeline.getBreakpoint()).toEqual('1.2');
    await nestedPipeline.awaitStatusChange(['paused']);
    expect(nestedPipeline.getStatus()).toBe('paused');
    // 1.1, 1.2.1 and 1.2.2 should all have ran...
    expect(nestedPipeline.getStepList().filter((node) => node.getStatus() === Step.STATUS.successful).length).toEqual(3);
  });

  test('Pipeline: next on a multi step pipeline will set a breakpoints', async () => {
    nestedPipeline.nextStep();
    await nestedPipeline.awaitStatusChange(['paused']);
    expect(nestedPipeline.getBreakpoint()).toEqual('1.1');
    nestedPipeline.nextStep();
    await nestedPipeline.awaitStatusChange(['paused']);
    expect(nestedPipeline.getBreakpoint()).toEqual('1.2');
    // 1.2.1 and 1.2.2 are in parallel, breakpoint is set to their parent
    nestedPipeline.nextStep();
    await nestedPipeline.awaitStatusChange(['paused']);
    expect(nestedPipeline.getBreakpoint()).toEqual('1.3.1');
    nestedPipeline.nextStep();
    await nestedPipeline.awaitStatusChange(['paused']);
    expect(nestedPipeline.getBreakpoint()).toEqual('1.3.2');
    nestedPipeline.nextStep();
    await nestedPipeline.awaitStatusChange(['successful']);
    expect(nestedPipeline.getBreakpoint()).toBeNull();
    expect(nestedPipeline.isTerminal()).toBeTruthy();
    try {
      await nestedPipeline.nextStep();
    } catch (error) {
      expect(error).toBeInstanceOf(ExecutionError);
    }
    expect.assertions(7);
  });

  test('Pipeline: resuming to last step should just run whole pipeline', async () => {
    await nestedPipeline.resume('2.1');
    expect(nestedPipeline.isTerminal()).toBeTruthy();
  });

  test('Pipeline: resuming to last steps should just run whole pipeline', async () => {
    const singleStepsPipeline = {
      version: 2.1,
      pipeline: [{
        'steps': {
          'name': 'group',
          'pipeline': [{
            'step': {
              'name': 'group-a',
              'image': 'test',
            },
          }]},
      }],
    };
    const stepsPipeline = new Pipeline({rawPipeline: singleStepsPipeline});
    jest.spyOn(stepsPipeline, 'getExec').mockImplementation(mockSuccessfulPipeline);
    await stepsPipeline.loadAndValidate();
    await stepsPipeline.resume('group');

    expect(stepsPipeline.isTerminal()).toBeTruthy();
  });

  test('Pipeline: resume will start an un started pipeline', async () => {
    const spy = jest.spyOn(basicPipeline, 'start');
    await basicPipeline.resume();
    expect(spy).toHaveBeenCalled();
  });

  test('Pipeline: resume will not work on a terminal pipeline', async () => {
    const spy = jest.spyOn(basicPipeline, 'start');
    basicPipeline.setStatus(Pipeline.STATUS.successful);
    try {
      await basicPipeline.resume();
    } catch (e) {
      expect(e).toBeInstanceOf(ExecutionError);
    }
    expect(spy).not.toHaveBeenCalled();
  });

  test('Pipeline: accumulates errors.', async () => {
    // this disables loadAndValidate throwing an error...
    jest.spyOn(_, 'isEmpty').mockResolvedValue(true);
    const invalidPipeline = new Pipeline({rawPipeline: {version: 2.1, pipeline:[{step: {name: 'basic', image: 'alpine:3.9', loop: 0, commands: ['hostname']}}]}});
    await invalidPipeline.loadAndValidate();
    const errors = invalidPipeline.getErrors();
    expect(errors).toEqual(['Yaml: step loop value must be greater than 1 (actual value: 0): basic']);
  });

  test('Pipeline: isActive reports true if pipeline is active.', () => {
    expect(basicPipeline.isActive()).toBeFalsy(); // new is starting status
    basicPipeline.setStatus(Pipeline.STATUS.ready); expect(basicPipeline.isActive()).toBeFalsy();
    basicPipeline.setStatus(Pipeline.STATUS.loaded); expect(basicPipeline.isActive()).toBeFalsy();
    basicPipeline.setStatus(Pipeline.STATUS.initializing); expect(basicPipeline.isActive()).toBeTruthy();
    basicPipeline.setStatus(Pipeline.STATUS.running); expect(basicPipeline.isActive()).toBeTruthy();
    basicPipeline.setStatus(Pipeline.STATUS.paused); expect(basicPipeline.isActive()).toBeTruthy();
    basicPipeline.setStatus(Pipeline.STATUS.failed); expect(basicPipeline.isActive()).toBeFalsy();
    basicPipeline.setStatus(Pipeline.STATUS.skipped); expect(basicPipeline.isActive()).toBeFalsy();
    basicPipeline.setStatus(Pipeline.STATUS.successful); expect(basicPipeline.isActive()).toBeFalsy();
  });


  test('Pipeline: isTerminal reports true if pipeline is active.', () => {
    expect(basicPipeline.isTerminal()).toBeFalsy(); // new is starting status
    basicPipeline.setStatus(Pipeline.STATUS.ready); expect(basicPipeline.isTerminal()).toBeFalsy();
    basicPipeline.setStatus(Pipeline.STATUS.loaded); expect(basicPipeline.isActive()).toBeFalsy(); // FIXME: Should this not be 'isTerminal()'??
    basicPipeline.setStatus(Pipeline.STATUS.initializing); expect(basicPipeline.isTerminal()).toBeFalsy();
    basicPipeline.setStatus(Pipeline.STATUS.running); expect(basicPipeline.isTerminal()).toBeFalsy();
    basicPipeline.setStatus(Pipeline.STATUS.paused); expect(basicPipeline.isTerminal()).toBeFalsy();
    basicPipeline.setStatus(Pipeline.STATUS.failed); expect(basicPipeline.isTerminal()).toBeTruthy();
    basicPipeline.setStatus(Pipeline.STATUS.skipped); expect(basicPipeline.isTerminal()).toBeTruthy();
    basicPipeline.setStatus(Pipeline.STATUS.successful); expect(basicPipeline.isTerminal()).toBeTruthy();
  });

  test('Pipeline: isStartable reports true if pipeline is ready or loaded.', () => {
    expect(basicPipeline.isTerminal()).toBeFalsy(); // new is starting status
    basicPipeline.setStatus(Pipeline.STATUS.ready); expect(basicPipeline.isStartable()).toBeTruthy();
    basicPipeline.setStatus(Pipeline.STATUS.loaded); expect(basicPipeline.isStartable()).toBeTruthy();
    basicPipeline.setStatus(Pipeline.STATUS.initializing); expect(basicPipeline.isStartable()).toBeFalsy();
    basicPipeline.setStatus(Pipeline.STATUS.running); expect(basicPipeline.isStartable()).toBeFalsy();
    basicPipeline.setStatus(Pipeline.STATUS.paused); expect(basicPipeline.isStartable()).toBeFalsy();
    basicPipeline.setStatus(Pipeline.STATUS.failed); expect(basicPipeline.isStartable()).toBeFalsy();
    basicPipeline.setStatus(Pipeline.STATUS.skipped); expect(basicPipeline.isStartable()).toBeFalsy();
    basicPipeline.setStatus(Pipeline.STATUS.successful); expect(basicPipeline.isStartable()).toBeFalsy();
  });

  test('Resolving empty workspace gives you CWD.', () => {
    expect(basicPipeline.resolveWorkspace()).toBe(NodeProvider.getProcess().cwd());
  });

  test('Relative paths become absolute.', () => {
    jest.spyOn(NodeProvider, 'getFs').mockImplementation(() => {
      return {existsSync: () => true, accessSync: () => {}};
    });
    expect(basicPipeline.resolveWorkspace('hello/cix')).toBe(NodeProvider.getProcess().cwd() + '/hello/cix');
  });

  test('Paths that don\'t exist throw Error.', () => {
    jest.spyOn(NodeProvider, 'getFs').mockImplementation(() => {
      return {existsSync: () => false, accessSync: () => {}};
    });
    expect(() => basicPipeline.resolveWorkspace('test')).toThrow(ValidateError);
  });

  test('Paths that are not writable show warning.', () => {
    jest.spyOn(NodeProvider, 'getFs').mockImplementation(() => {
      return {existsSync: () => true, accessSync: () => {
        throw new Error();
      }};
    });
    const warnMock = jest.spyOn(Logger, 'warn').mockImplementation();
    basicPipeline.resolveWorkspace('test');

    expect(warnMock.mock.calls[0][0]).toMatch(/Workspace is not writable/);
  });
});
