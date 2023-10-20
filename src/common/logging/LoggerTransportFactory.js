/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {NodeProvider} from '../index.js';
import chalk from 'chalk';
import winston from 'winston';

class LoggerTransportFactory {
  constructor() {
    // Check to see if the TTY can support colors
    this.supportsColor = !NodeProvider.getProcess().argv.includes('--no-color') &&
      (chalk.supportsColor.hasBasic || NodeProvider.getProcess().argv.includes('--color'));
    // Get Log Level from the environment variable, default to info
    this.logLevel = (NodeProvider.getProcess().env.LOG_LEVEL || 'info').toLowerCase();
    // option to silence logs for utests
    this.silent = NodeProvider.getProcess().argv.includes('--silent');
  }

  /**
   * @function module:common/logging/LoggerTransportFactory#createContainerConsoleTransport
   * @description Creates a file transport for the console logs
   * @returns {winston.transports} - the console transport
   */
  createContainerConsoleTransport() {
    return new winston.transports.Console({
      level: 'info',
      silent: this.silent,
      format: winston.format.combine(
        winston.format.label({label: 'color'}),
        winston.format.printf(this.composeStyleFormatter),
      ),
    });
  }

  /**
   * @function module:common/logging/LoggerTransportFactory#createContainerFilesTransport
   * @param {string} filename - the filename to write the logs to
   * @param {boolean} composeStyle - whether to use compose style formatting
   * @description Creates a file transport for the console logs
   * @returns {winston.transports} - the console transport
   */
  createContainerFileTransport(filename, composeStyle = false) {
    let format = winston.format.printf((item) => `${item.message}`);
    if (composeStyle) {
      format = winston.format.combine(
        winston.format.label({label: 'no-color'}),
        winston.format.printf(this.composeStyleFormatter),
      );
    }
    return new winston.transports.File({
      level: 'info',
      silent: this.silent,
      filename: filename,
      format: format,
    });
  }

  /**
   * @function module:common/logging/LoggerTransportFactory#createApplicationConsoleTransport
   * @description Creates a console transport for the application logs.
   * @returns {winston.transports} - the console transport
   */
  createApplicationConsoleTransport() {
    return new winston.transports.Console({
      level: this.logLevel,
      silent: this.silent,
      format: winston.format.combine(
        winston.format.timestamp({format: 'YYYY-MM-DDTHH:mm:ssZ'}),
        winston.format(this.uppercaseLogLevelFormatter)(),
        this.supportsColor ? winston.format.colorize() : winston.format.printf(() => { }),
        winston.format.align(),
        winston.format.printf((info) => `${info.timestamp}  ${info.level} ${info.message}`),
      ),
    });
  }

  /**
   * @function module:common/logging/LoggerTransportFactory#createApplicationFileTransport
   * @description Creates a file transport for the application logs.
   * @param {string} filename - the filename to write the logs to
   * @returns {winston.transports} - the file transport
   */
  createApplicationFileTransport(filename) {
    return new winston.transports.File({
      level: this.logLevel,
      silent: this.silent,
      filename: filename,
      format: winston.format.combine(
        winston.format.timestamp({format: 'YYYY-MM-DDTHH:mm:ssZ'}),
        winston.format(this.uppercaseLogLevelFormatter)(),
        winston.format.align(),
        winston.format.printf((info) => `${info.timestamp}  ${info.level} ${info.message}`),
      ),
    });
  }

  /**
   * @function module:common/logging/LoggerTransportFactory#uppercaseLogLevelFormatter
   * @description Uppercases the log level in the log message.
   * @param {object} info - the winston info object
   * @returns {string} - log string
   */
  uppercaseLogLevelFormatter(info) {
    info.level = info.level.toUpperCase();
    return info;
  }

  /**
   * @function module:common/logging/LoggerTransportFactory#composeStyleFormatter
   * @description Creates a winston formatter that colors the container output.
   * @param {object} info - the winston info object
   * @returns {string} - log string
   */
  composeStyleFormatter(info) {
    const COLORS = [chalk.blue, chalk.green, chalk.magenta, chalk.yellow, chalk.cyan];
    const ERROR_COLOR = chalk.red;
    const MAX_NAME_LENGTH = 20;

    const containerId = info.containerNames.containerId;
    let formattedName = info.containerNames.shortName;
    if (formattedName.length > MAX_NAME_LENGTH) {
      formattedName = formattedName.substring(0, MAX_NAME_LENGTH - 1) + '~';
    }
    formattedName = formattedName.padEnd(MAX_NAME_LENGTH, ' ') + ' |';

    if (this.containerColor === undefined) {
      this.containerCount = 0;
      this.containerColor = [];
    }

    if (!this.containerColor[containerId]) {
      this.containerColor[containerId] = COLORS[this.containerCount++ % COLORS.length];
    }

    const colorFn = this.containerColor[containerId];
    const output = info.message.toString().split('\n');

    // sometimes we get more than one line in a stream
    for (let i = 0; i < output.length; i++) {
      if (info.label === 'color') {
        if (info.isErrorOutput) {
          output[i] = `${colorFn(formattedName)} ${ERROR_COLOR(output[i])}`;
        } else {
          output[i] = `${colorFn(formattedName)} ${output[i]}`;
        }
      } else {
        output[i] = `${formattedName} ${output[i]}`;
      }
    }

    return output.join('\n');
  }
}

// Singleton instance
const instance = new LoggerTransportFactory();
export {instance as default};
