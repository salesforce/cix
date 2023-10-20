/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global jest, describe, expect */
import ValidateService from './ValidateService.js';
import fs from 'fs';

jest.autoMockOff();

describe('ValidateService tests', () => {
  test('Validate all demo pipelines', async () => {
    const listOfYaml = fs.readdirSync('./docs/examples');

    const problems = [];

    for (let i = 0; i < listOfYaml.length; i++) {
      const file = listOfYaml[i];
      if (file.match(/yaml$/)) {
        const path = 'docs/examples/' + file;
        try {
          await ValidateService.validatePipeline({yamlPath: path, type: 'standard', environment: []});
        } catch (e) {
          problems.push(`${file} failed validation: ${e}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
