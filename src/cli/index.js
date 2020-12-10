/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import Application from './Application.js';
import {NodeProvider} from '../common/index.js';
import fs from 'fs';
import path from 'path';

const __dirname = new URL(path.dirname(import.meta.url)).pathname;
const packageMetadata = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));

//
// Let it all begin
//
const app = new Application(packageMetadata, NodeProvider.getProcess().argv);

app.execute();
