/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {DockerExec} from '../../docker/index.js';
import {_} from '../../common/index.js';

export default class ExecFactory {
  getExec(mode) {
    if (_.isNil(mode) || mode === 'docker') {
      return new DockerExec();
    }
  }
}
