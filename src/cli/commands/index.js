/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import Describe from './Describe.js';
import Exec from './Exec.js';
import Install from './Install.js';
import Kill from './Kill.js';
import Load from './Load.js';
import Pipelines from './Pipelines.js';
import Resume from './Resume.js';
import Server from './Server.js';
import Update from './Update.js';
import Validate from './Validate.js';

const install = new Install();
const server = new Server();
const exec = new Exec();
const validate = new Validate();
const update = new Update();
const load = new Load();
const resume = new Resume();
const describe = new Describe();
const kill = new Kill();
const pipelines = new Pipelines();

// Order represented in help
export default [
  exec,
  validate,
  server,
  load,
  pipelines,
  resume,
  describe,
  kill,
  install,
  update,
];
