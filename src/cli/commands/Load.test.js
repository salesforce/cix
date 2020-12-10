/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeEach, describe, expect */
import Load from './Load.js';

describe('Load.action', () => {
  let load;
  let vanillaPipeline;

  beforeEach(() => {
    jest.resetAllMocks();
    load = new Load();
    // we test these in the abstract class...
    jest.spyOn(load, 'validateOptions').mockImplementation(() => {});
    jest.spyOn(load, 'configureLogger').mockImplementation(() => {});
    jest.spyOn(load, 'handleSecrets').mockImplementation(() => {});
    jest.spyOn(load, 'generateEnvironmentList').mockImplementation(() => {});
    vanillaPipeline = {
      pipelineSpec: {
        'environment': undefined,
        'type': 'standard',
        'yamlPath': 'test.yaml',
      },
    };
  });

  test('loading a remote pipeline.', async () => {
    jest.spyOn(load, 'generateListOfPipelines').mockImplementation(() => [{yaml: 'test.yaml'}]);
    const addPipeline = jest.fn().mockImplementation(() => {
      return {body: {id: 'PIPELINE_ID'}};
    });
    jest.spyOn(load, 'getPipelineApi').mockImplementation(() => {
      return {addPipeline: addPipeline};
    });
    await load.action({remote: true});
    expect(addPipeline).toHaveBeenCalledWith(vanillaPipeline);
  });

  test('loading a remote pipeline with alias and workspace get set.', async () => {
    jest.spyOn(load, 'generateListOfPipelines').mockImplementation(() => [{yaml: 'test.yaml'}]);
    const addPipeline = jest.fn().mockImplementation(() => {
      return {body: {id: 'PIPELINE_ID'}};
    });
    jest.spyOn(load, 'getPipelineApi').mockImplementation(() => {
      return {addPipeline: addPipeline};
    });
    await load.action({remote: true, pipelineAlias: 'test-alias', workspace: '/tmp'});
    vanillaPipeline.pipelineSpec.pipelineAlias = 'test-alias';
    vanillaPipeline.pipelineSpec.workspace = '/tmp';
    expect(addPipeline).toHaveBeenCalledWith(vanillaPipeline);
  });

  test('specifying more than one pipeline links them.', async () => {
    jest.spyOn(load, 'generateListOfPipelines').mockImplementation(() => [{yaml: 'test.yaml'}, {yaml: 'test2.yaml'}]);
    const addPipeline = jest.fn().mockImplementation(() => {
      return {body: {id: 'PIPELINE_ID'}};
    });
    const linkPipeline = jest.fn().mockImplementation(() => {});
    jest.spyOn(load, 'getPipelineApi').mockImplementation(() => {
      return {addPipeline: addPipeline, linkPipeline: linkPipeline};
    });
    await load.action({remote: true});
    expect(addPipeline).toHaveBeenNthCalledWith(1, vanillaPipeline);
    vanillaPipeline.pipelineSpec.yamlPath = 'test2.yaml';
    expect(addPipeline).toHaveBeenNthCalledWith(2, vanillaPipeline);
  });
});

describe('Load.validateOptions', () => {
  let loadCommand;

  beforeEach(() => {
    jest.resetAllMocks();
    loadCommand = new Load();
  });

  test('throws an error if --secret-stdin and --secrets-stdin used together', () => {
    const options = {'yaml': ['docs/examples/basic.yaml'], 'secretStdin': 'test', 'secretsStdin': true};
    expect(() => loadCommand.validateOptions(options)).toThrow('--secret-stdin and --secrets-stdin are mutually exclusive');
  });

  test('throws an error if --secret-stdin isn\'t provided a valid key', () => {
    const options = {'yaml': ['docs/examples/basic.yaml'], 'secretStdin': ''};
    expect(() => loadCommand.validateOptions(options)).toThrow('--secret-stdin and --secret-prompt require non-empty keys to be provided');
  });

  test('throws an error if --secret-prompt isn\'t provided a valid key', () => {
    const options = {'yaml': ['docs/examples/basic.yaml'], 'secretPrompt': ''};
    expect(() => loadCommand.validateOptions(options)).toThrow('--secret-stdin and --secret-prompt require non-empty keys to be provided');
  });
});

describe('Load.handleSecrets', () => {
  let loadCommand;

  beforeEach(() => {
    loadCommand = new Load();
    jest.resetAllMocks();
  });

  test('--secret-stdin correctly handles the d.t.m. case', () => {
    const options = {'secretStdin': 'test'};

    loadCommand.setInput('test_value');
    loadCommand.handleSecrets(options);

    expect(options).toEqual({'secretStdin': 'test', 'secret': {'test': 'test_value'}});
  });

  test('--secret-stdin trims key but not value', () => {
    const options = {'secretStdin': '  test '};

    loadCommand.setInput(' test_value ');
    loadCommand.handleSecrets(options);

    expect(options).toEqual({'secretStdin': '  test ', 'secret': {'test': ' test_value '}});
  });

  test('--secrets-stdin correctly handles the d.t.m. case', () => {
    const options = {'secretsStdin': true};

    loadCommand.setInput('{"test1": "test_value1", "test2": "test_value2"}');
    loadCommand.handleSecrets(options);

    expect(options).toEqual({'secretsStdin': true, 'secret': {'test1': 'test_value1', 'test2': 'test_value2'}});
  });

  test('--secrets-stdin does not trim keys or values', () => {
    const options = {'secretsStdin': true};

    loadCommand.setInput('{" test1  ": "  test_value1 ", "  test2  ": "  test_value2  "}');
    loadCommand.handleSecrets(options);

    expect(options).toEqual({'secretsStdin': true, 'secret': {' test1  ': '  test_value1 ', '  test2  ': '  test_value2  '}});
  });

  test('--secrets-stdin throws an error on json parsing issues', () => {
    const options = {'secretsStdin': true};

    loadCommand.setInput('{"test1":, "test2": "test_value2"}');
    expect(() => loadCommand.handleSecrets(options)).toThrow(
      'There was an issue parsing JSON from stdin: SyntaxError: Unexpected token , in JSON at position 9',
    );
  });

  test('--secrets-stdin throws an error if a key is empty', () => {
    const options = {'secretsStdin': true};

    loadCommand.setInput('{"": "value1", "test2": "test_value2"}');
    expect(() => loadCommand.handleSecrets(options)).toThrow(
      'There was an issue parsing JSON from stdin: SyntaxError: Keys in map provided must be defined and non-empty',
    );
  });

  test('--secrets-stdin throws an error if a value is empty', () => {
    const options = {'secretsStdin': true};

    loadCommand.setInput('{"test1": "", "test2": "test_value2"}');
    expect(() => loadCommand.handleSecrets(options)).toThrow(
      'There was an issue parsing JSON from stdin: SyntaxError: Values in map provided must be defined and non-empty',
    );
  });
});
