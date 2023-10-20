/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import LoggerTransportFactory from './LoggerTransportFactory.js';
import PipelineLogger from './PipelineLogger.js';
import path from 'path';
import winston from 'winston';


class Logger {
  constructor() {
    // Create a global logger
    this.globalLogger = winston.createLogger();

    // Add the console transport
    this.globalLogger.add(LoggerTransportFactory.createApplicationConsoleTransport());
    // crete a dictionary of pipeline loggers
    this.pipelineLoggers = {};
  }

  /**
   * @function module:common/logging/Logger#enableFileLogging
   * @description Enables file logging globally.
   * @param {string} loggingType - type of logging to enable
   * @param {object} loggingPath - path to winston cix-execution to
   * @param {string} logname - name of the logfile (default is cix-execution.log)
   */
  enableFileLogging(loggingType, loggingPath, logname) {
    this.loggingType = loggingType;
    this.loggingPath = loggingPath;
    this.logname = logname;
    this.info(`Activating file loging to: "${this.loggingPath}"`);
    this.globalLogger.add(LoggerTransportFactory.createApplicationFileTransport(path.join(this.loggingPath, this.logname)));
  }

  /**
   * @function module:common/logging/Logger#enableFileLogging
   * @description Getter for the global logger.
   * @returns {winston.Logger} - the global logger
   */
  getLogger() {
    return this.globalLogger;
  }

  /**
   * @function module:common/logging/Logger#silly
   * @description silly logger
   * @param {string} message - the message to log
   * @param {string} pipelineId - (optional) the pipeline logger to log to
   */
  silly(message, pipelineId) {
    this.globalLogger.silly(message);
    if (pipelineId) {
      this.getPipelineLogger(pipelineId)?.getRemoteLogger().silly(message);
    }
  }

  /**
   * @function module:common/logging/Logger#debug
   * @description debug logger
   * @param {string} message - the message to log
   * @param {string} pipelineId - (optional) the pipeline logger to log to
   */
  debug(message, pipelineId) {
    this.globalLogger.debug(message);
    if (pipelineId) {
      this.getPipelineLogger(pipelineId)?.getRemoteLogger().debug(message);
    }
  }

  /**
   * @function module:common/logging/Logger#info
   * @description info logger
   * @param {string} message - the message to log
   * @param {string} pipelineId - (optional) the pipeline logger to log to
   */
  info(message, pipelineId) {
    this.globalLogger.info(message);
    if (pipelineId) {
      this.getPipelineLogger(pipelineId)?.getRemoteLogger().info(message);
    }
  }

  /**
   * @function module:common/logging/Logger#warn
   * @description warn logger
   * @param {string} message - the message to log
   * @param {string} pipelineId - (optional) the pipeline logger to log to
   */
  warn(message, pipelineId) {
    this.globalLogger.warn(message);
    if (pipelineId) {
      this.getPipelineLogger(pipelineId)?.getRemoteLogger().warn(message);
    }
  }

  /**
   * @function module:common/logging/Logger#error
   * @description error logger
   * @param {string} message - the message to log
   * @param {string} pipelineId - (optional) the pipeline logger to log to
   */
  error(message, pipelineId) {
    this.globalLogger.error(message);
    if (pipelineId) {
      this.getPipelineLogger(pipelineId)?.getRemoteLogger().error(message);
    }
  }

  /**
   * @function module:common/logging/Logger#log
   * @description logs a winston info object
   * @param {object} obj - the message to log
   * @param {string} pipelineId - (optional) the pipeline logger to log to
   */
  log(obj, pipelineId) {
    this.globalLogger.log(obj);
    if (pipelineId) {
      this.getPipelineLogger(pipelineId)?.getRemoteLogger().log(obj);
    }
  }

  /**
   * @function module:common/logging/Logger#createPipelineLogger
   * @description generates a new PipelineLogger for a pipeline
   * @param {object} pipeline (optional) - the pipeline to generate a logger for
   */
  createPipelineLogger(pipeline) {
    // pipeline, loggingType and loggingPath may be undefiend, but that's ok
    // "default" is used within client execution when we don't have the ID of the pipeline
    this.pipelineLoggers[pipeline?.getId() ?? 'default'] = new PipelineLogger(pipeline, this.loggingType, this.loggingPath, this.logname);
  }

  /**
   * @function module:common/logging/Logger#getPipelineLogger
   * @description gets a PipelineLogger for a pipeline
   * @param {object} pipelineId (optional) - the pipeline to get a logger for
   * @returns {PipelineLogger} - the pipeline logger
   */
  getPipelineLogger(pipelineId = 'default') {
    // "default" is used within client execution when we don't have the ID of the pipeline
    if (pipelineId === 'default' && this.pipelineLoggers[pipelineId] === undefined ) {
      this.createPipelineLogger();
    }
    return this.pipelineLoggers[pipelineId];
  }
}

// Singleton instance
const instance = new Logger();
export {instance as default};
