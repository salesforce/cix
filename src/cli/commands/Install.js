/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import AbstractCommand from './AbstractCommand.js';
import {_} from '../../common/index.js';
import dirname from './dirname.cjs';
import fs from 'fs';
import path from 'path';

// import.meta.url jest workaround... Fix once Jest supports ES Modules: https://github.com/facebook/jest/issues/9430
const {__dirname} = dirname;

export default class Install extends AbstractCommand {
  /**
   * @class
   *
   * @description Install Command.
   */
  constructor() {
    super('install');
  }

  /**
   * @function module:cli.Install#registerOptions
   * @description Registers the command's options with Commander.
   *
   * @param {object} program - A reference to the Commander program.
   *
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerOptions(program) {
    program.option('--location <location>', 'Installation location', '/usr/local/bin');
    return super.registerOptions(program);
  }

  /**
   * @function module:cli.Install#registerDescription
   * @description Registers the command's description with Commander.
   *
   * @param {object} program - A reference to the Commander program.
   *
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerDescription(program) {
    return program.description('Starts the pipeline server component for phased execution.');
  }

  /**
   * @function module:cli.Describe#readScript
   * @description Reads the install script off the disk.
   *
   * @returns {string} The contents of the install script.
   */
  readScript() {
    return fs.readFileSync(path.join(__dirname, '../../../scripts', 'cix.sh'), 'utf8');
  }

  /**
   * @function module:cli.Install#action
   * @description Runs the install sub command.
   *
   * @param {object} options - map of options set on command line
   *
   * @returns {undefined}
   */
  action(options) {
    const location = _.trim(options.location);
    const script = this.readScript();

    console.log(
      _.join([
        `cat << 'EOF' >${location}/cix`,
        script,
        'EOF',
        'if [ $? -ne 0 ]; then',
        '  echo "Installation failed, try again with \'sudo $0\'."',
        '  exit 1',
        'fi',
        `chmod +x ${location}/cix`,
        `rm -f ${location}/cix2`,
        `ln -s cix ${location}/cix2`,
        `echo 'Installed cix at ${location}/cix, start by cix -h.'`,
      ], '\n'));
  }
}
