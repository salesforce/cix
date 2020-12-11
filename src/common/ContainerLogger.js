/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {NodeProvider, _} from './index.js';
import chalk from 'chalk';
import path from 'path';
import stream from 'stream';
import winston from 'winston';

export default class ContainerLogger {
  constructor() {
    if (!_.isNil(winston.fileLogging) && winston.fileLogging.enabled) {
      this.fileLogging = winston.fileLogging;
    } else {
      this.fileLogging = {enabled: false};
    }

    // Default to the current directory if no path specified.
    if (_.isNil(this.fileLogging.path)) {
      this.fileLogging.path = path.resolve();
    }

    this.consoleLogger = winston.createLogger({
      level: (NodeProvider.getProcess().env.LOG_LEVEL || 'info').toLowerCase(),
      format: winston.format.printf(this.colorizedConsoleFormatter),
      transports: [
        new winston.transports.Console({silent: NodeProvider.getProcess().argv.includes('--silent')}),
      ],
    });
  }

  colorizedConsoleFormatter(info) {
    const COLORS = [chalk.blueBright, chalk.greenBright, chalk.magentaBright, chalk.yellowBright,
      chalk.cyanBright, chalk.green, chalk.magenta, chalk.yellow, chalk.cyan];
    const ERROR_COLOR = chalk.redBright;
    const MAX_NAME_LENGTH = 20;

    const containerId = info.containerNames.containerId;
    const containerName = info.containerNames.shortName;

    /**
     * @function module:common/ContainerLogger#elideName
     *
     * @param {string} name - name to shorten
     *
     * @returns {string} shortened name
     */
    function elideName(name) {
      if (name.length > MAX_NAME_LENGTH) {
        return name.slice(0, MAX_NAME_LENGTH - 1) + '~';
      }
      return name;
    }

    if (this.containerColor === undefined) {
      this.containerCount = 0;
      this.containerColor = [];
    }

    if (!this.containerColor[containerId]) {
      this.containerColor[containerId] = COLORS[this.containerCount++ % COLORS.length];
    }

    const colorFn = this.containerColor[containerId];
    const formattedName = elideName(containerName).padEnd(MAX_NAME_LENGTH, ' ') + ' |';
    const output = info.message.toString().split('\n');

    // sometimes we get more than one line in a stream
    for (let i = 0; i < output.length; i++) {
      if (info.isErrorOutput) {
        output[i] = `${colorFn(formattedName)} ${ERROR_COLOR(output[i])}`;
      } else {
        output[i] = `${colorFn(formattedName)} ${output[i]}`;
      }
    }

    return output.join('\n');
  }

  createServerOutputStream(pipeline, containerNames, isErrorOutput = false) {
    let environment = null;
    let logStream = null;

    if (!_.isNil(pipeline)) {
      environment = pipeline.getEnvironment();
      logStream = pipeline.getLogStream();
    }
    const transformStream = new DockerOutputStream(environment, containerNames, isErrorOutput);

    if (this.fileLogging.enabled) {
      const containerId = containerNames.containerId;
      const containerName = containerNames.qualifiedName;

      if (this.containerFileLogger === undefined) {
        this.containerCount = 0;
        this.containerFileLogger = {};
      }

      if (!this.containerFileLogger[containerId]) {
        const filename = path.join(this.fileLogging.path,
          `${(++this.containerCount).toString().padStart(2, '0')}-${containerName}.log`);
        this.containerFileLogger[containerId] = winston.createLogger({
          level: 'info',
          format: winston.format.printf((item) => `${item.message}`),
          transports: [
            new winston.transports.File({filename: filename}),
          ],
        });
      }
      transformStream.pipe(this.containerFileLogger[containerId]);
    } else {
      transformStream.pipe(this.consoleLogger);
    }
    if (!_.isNil(logStream)) {
      transformStream.pipe(logStream);
    }
    return transformStream;
  }

  createClientStream() {
    return this.consoleLogger;
  }
}

class DockerOutputStream extends stream.Transform {
  constructor(environment, containerNames, isErrorOutput) {
    super({
      readableObjectMode: true,
      writableObjectMode: true,
    });
    this.environment = environment;
    this.containerNames = containerNames;
    this.isErrorOutput = isErrorOutput;
  }

  _transform(chunk, _encoding, callback) {
    const message = this.environment.redactSecrets(chunk.toString());

    this.push({
      level: 'info',
      message: Buffer.from(message.trimRight()),
      containerNames: this.containerNames,
      isErrorOutput: this.isErrorOutput,
    });

    callback();
  }
}
