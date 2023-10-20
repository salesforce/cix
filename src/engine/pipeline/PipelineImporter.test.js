/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* eslint-disable key-spacing */
/* global  describe, expect */
import {ValidateError, _} from '../../common/index.js';
import Environment from '../environment/Environment.js';
import PipelineImporter from './PipelineImporter.js';


describe('Pipeline tests:', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('PipelineImporter substitutes $$ on path imports', async () => {
    const env = new Environment();
    const pipeline = {getEnvironment: () => env};
    env.addEnvironmentVariable({'name': 'EXISTS', 'value': 'MAGIC'});
    const importer = new PipelineImporter({'path': '$$EXISTS/path', 'pipeline': pipeline});
    expect(importer.path).toEqual('MAGIC/path');
  });

  test('PipelineImporter throws error when $$ is not substituted.', async () => {
    const env = new Environment();
    const pipeline = {getEnvironment: () => env};
    expect(() => {
      new PipelineImporter({'path': '$$NOT_EXIST/path', 'pipeline': pipeline});
    }).toThrow(ValidateError);
  });

  test('PipelineImporter will propagate the http-authorization-token.', async () => {
    const pipelineWithImport = jest.fn().mockImplementation(() => `
    version: 2.1
    imports:
      library:
        src: https://github.com/raw/ci/cix/foo.yaml
        http-authorization-token: 1234
    pipeline:
      - import:
          - library.bar
    `);
    const firstImportedPipeline = jest.fn().mockImplementation(() => `
    imports:
      common:
        src: ./common.yaml
    bar:
      steps:
        name: bar
        pipeline:
          - step:
              name: step
              image: alpine:3.9
              commands:
                - echo hi  
    `);
    const secondImportedPipeline = jest.fn().mockImplementation(() => `
    version: 2.1
    pipeline:
      - step:
          name: basic
          image: alpine:3.9
          commands:
            - hostname
    `);
    const env = new Environment();
    const pipeline = {getEnvironment: () => env, getPlugins: () => []};
    const importer = new PipelineImporter({'path': 'mockPath.yaml', 'pipeline': pipeline});

    jest.spyOn(_, 'fetch').mockImplementationOnce(pipelineWithImport);
    jest.spyOn(_, 'fetch').mockImplementationOnce(firstImportedPipeline);
    jest.spyOn(_, 'fetch').mockImplementationOnce(secondImportedPipeline);
    await importer.load();

    // the original pipeline will not have the authToken
    expect(pipelineWithImport.mock.calls[0][2]).toBe(undefined);
    // imported pipeline should have a authToken attached
    expect(firstImportedPipeline.mock.calls[0][2]).toBe(1234);
    // imports of imports should also get it...
    expect(secondImportedPipeline.mock.calls[0][2]).toBe(1234);
  });

  test('PipelineImporter will run preprocessor on all files(including imports).', async () => {
    const pipelineWithImport = jest.fn().mockImplementation(() => `
    version: 2.1
    imports:
      basic:
        src: basic.yaml
    pipeline:
      - import:
          - basic.bar
    `);
    const importedPipeline = jest.fn().mockImplementation(() => `
    bar:
      steps:
        name: basic-hi
        pipeline:
          - step:
              name: basic-hi
              image: alpine:3.9
              commands:
                - echo hi  
    `);
    const env = new Environment();
    const mockPlugin = {runPreprocessor: (exec, input) => input.replace(/basic/g, 'advanced'), getId: () => 'plugin-abc-123'};
    const pipeline = {getEnvironment: () => env, getPlugins: () => [mockPlugin], getExec: () => {}, getId: () => 'abc-123'};
    const importer = new PipelineImporter({'path': 'mockPath.yaml', 'pipeline': pipeline});

    jest.spyOn(_, 'fetch').mockImplementationOnce(pipelineWithImport);
    jest.spyOn(_, 'fetch').mockImplementationOnce(importedPipeline);
    const result = await importer.load();
    expect(result['imports']['advanced']['src']).toBe('advanced.yaml');
    expect(result['pipeline'][0]['steps']['pipeline'][0]['steps']['name']).toBe('advanced-hi');
  });
});
