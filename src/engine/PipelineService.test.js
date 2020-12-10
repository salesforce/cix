/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global, describe, expect */
import {ExecutionError} from '../common/index.js';
import PipelineService from './PipelineService.js';
import fs from 'fs';

describe('PipelineService tests', () => {
  // !Important! PipelineService is a SINGLETON type object
  // cannot create more than one for testing, order is important!!

  test('PipelineService:getPipelineList should return empty list when empty', () => {
    expect(PipelineService.getPipelineList()).toEqual([]);
  });


  test('PipelineService:getAliasList should return empty list when empty', () => {
    expect(PipelineService.getAliasList()).toEqual([]);
  });

  test('PipelineService:getPipeline should throw error if pipeline does not exist', () => {
    expect(() => {
      PipelineService.getPipeline('invalid');
    }).toThrow(ExecutionError);
    expect(() => {
      PipelineService.getPipeline('invalid');
    }).toThrow(/doesn't exist/);
  });

  test('PipelineService:addPipeline test loading all example pipelines', async () => {
    const listIds = [];
    const listOfYaml = fs.readdirSync('./docs/examples');

    for (let i = 0; i < listOfYaml.length; i++) {
      const file = listOfYaml[i];
      if (file.match(/yaml$/)) {
        const path = 'docs/examples/' + file;
        const resp = await PipelineService.addPipeline({yamlPath: path, type: 'standard', environment: []});
        listIds.push(resp.id);
      }
    }
    expect(PipelineService.getPipelineList()).toEqual(listIds);
  });

  test('PipelineService: setAliasForPipeline sets alias, getters can find it.', async () => {
    // long test because the singleton class makes tests within a class non-idempotent
    const firstResp = await PipelineService.addPipeline({yamlPath: 'docs/examples/basic.yaml', type: 'standard', environment: []});
    const first = firstResp.id;
    PipelineService.setAliasForPipeline('first', first);
    // can have multiple alias pointing at same pipeline...
    PipelineService.setAliasForPipeline('first-again', first);
    expect(PipelineService.getAliasList()).toEqual(['latest', 'first', 'first-again']);
    expect(PipelineService.getPipelineForAlias('first')).toEqual(first);
    expect(PipelineService.getPipelineForAlias('first-again')).toEqual(first);
    expect(PipelineService.getAliasesForPipeline(first)).toEqual(['latest', 'first', 'first-again']);
  });

  test('PipelineService: aliases can be pointed at a new pipeline', async () => {
    // long test because the singleton class makes tests within a class non-idempotent
    const firstResp = await PipelineService.addPipeline({yamlPath: 'docs/examples/basic.yaml', type: 'standard', environment: []});
    const secondResp = await PipelineService.addPipeline({yamlPath: 'docs/examples/basic.yaml', type: 'standard', environment: []});
    const first = firstResp.id;
    const second = secondResp.id;
    PipelineService.setAliasForPipeline('first', first);
    // add second alias, but pointing at a different pipeline
    PipelineService.setAliasForPipeline('second', second);
    expect(PipelineService.getAliasesForPipeline(first)).toEqual(['first']);
    expect(PipelineService.getAliasesForPipeline(second)).toEqual(['latest', 'second']);
    // overwrite first with second
    PipelineService.setAliasForPipeline('first', second);
    expect(PipelineService.getAliasesForPipeline(first)).toEqual([]);
    expect(PipelineService.getAliasesForPipeline(second)).toEqual(['latest', 'first', 'second']);
  });

  test('PipelineService: non existent alias or pipelines should throw errors', async () => {
    const firstResp = await PipelineService.addPipeline({yamlPath: 'docs/examples/basic.yaml', type: 'standard', environment: []});
    const first = firstResp.id;
    expect(() => {
      PipelineService.setAliasForPipeline('first', 'invalid');
    }).toThrow(ExecutionError);
    expect(() => {
      PipelineService.setAliasForPipeline('first', first);
      PipelineService.getPipelineForAlias('invalid');
    }).toThrow(ExecutionError);
  });

  test('PipelineService:linkPipeline adds a reference', async () => {
    const firstResp = await PipelineService.addPipeline({yamlPath: 'docs/examples/basic.yaml', type: 'standard', environment: []});
    const secondResp = await PipelineService.addPipeline({yamlPath: 'docs/examples/basic.yaml', type: 'standard', environment: []});

    PipelineService.linkPipeline(firstResp.id, secondResp.id);
    const firstRef = PipelineService.getPipeline(firstResp.id);
    const secondRef = PipelineService.getPipeline(secondResp.id);

    expect(firstRef.getNextPipeline()).toEqual(secondRef);
  });
});
