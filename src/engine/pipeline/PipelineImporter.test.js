/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* eslint-disable key-spacing */
/* global  describe, expect */

import Environment from '../environment/Environment.js';
import PipelineImporter from './PipelineImporter.js';
import {ValidateError} from '../../common/index.js';

describe('Pipeline tests:', () => {
  test('PipelineImporter substitutes $$ on path imports', async () => {
    const env = new Environment();
    env.addEnvironmentVariable({'name': 'EXISTS', 'value': 'MAGIC'});
    const importer = new PipelineImporter({'path': '$$EXISTS/path', 'environment': env});
    expect(importer.path).toEqual('MAGIC/path');
  });

  test('PipelineImporter throws error when $$ is not substituted.', async () => {
    const env = new Environment();
    expect(() => {
      new PipelineImporter({'path': '$$NOT_EXIST/path', 'environment': env});
    }).toThrow(ValidateError);
  });
});
