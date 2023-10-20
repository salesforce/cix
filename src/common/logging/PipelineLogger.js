/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/

import ContainerStreamTransform from './ContainerStreamTransform.js';
import LoggerTransportFactory from './LoggerTransportFactory.js';
import _ from 'lodash';
import path from 'path';
import stream from 'stream';
import winston from 'winston';


export default class PipelineLogger {
  constructor(pipeline, loggingType, loggingPath, logname) {
    this.pipeline = pipeline;
    this.loggingType = loggingType;
    this.loggingPath = loggingPath;
    this.logname = logname;

    // Creates a console logger for container output
    this.containerConsoleLogger = winston.createLogger();
    this.containerConsoleLogger.add(LoggerTransportFactory.createContainerConsoleTransport());

    if (this.loggingType === 'file') {
      // Creates a file logger for single file logging
      this.containerFileLogger = winston.createLogger();
      this.containerFileLogger.add(LoggerTransportFactory.createContainerFileTransport(path.join(this.loggingPath, this.logname), true));
    } else if (this.loggingType === 'files') {
      // A unique 'files' logger is generated for each container on demand, see createContainerFilesLogger
      this.containerFilesLogger = {};
      this.filenameCount = 0;
    }

    // The client (which does not need a remote stream) will not provide a pipeline object
    if (!_.isNil(pipeline)) {
      // Create a remote stream for remote clinets to hook into
      this.remoteStream = this.createRemoteStream();
      // Create a log interface for the remote stream
      this.remoteLogger = this.createRemoteLogger();
      // Start a heartbeat to keep the remote stream alive
      this.startHeartbeat();
    }
  }

  /**
   * @function module:common/logging/PipelineLogger#createContainerFilesLogger
   * @description Generates a unique file logger for each container.
   * @param {object} containerNames - container names object
   * @returns {object} - log stream
   */
  createContainerFilesLogger(containerNames) {
    const containerId = containerNames.containerId;
    const containerName = containerNames.qualifiedName;

    if (!this.containerFilesLogger[containerId]) {
      const filename = path.join(this.loggingPath, `${(++this.filenameCount).toString().padStart(2, '0')}-${containerName}.log`);
      this.containerFilesLogger[containerId] = winston.createLogger();
      this.containerFilesLogger[containerId].add(LoggerTransportFactory.createContainerFileTransport(filename));
    }
    return this.containerFilesLogger[containerId];
  }

  /**
   * @function module:common/logging/PipelineLogger#createRemoteStream
   * @description Generates a remote stream for the pipeline.
   * @returns {object} - log stream
   */
  createRemoteStream() {
    const backPressureMessage = JSON.stringify({'level': 'warn', 'message': 'Not able to keep up with server log streaming, having to drop packets....'});
    const backPressureMessageByteSize = Buffer.byteLength(backPressureMessage);

    return new stream.Transform({
      writableObjectMode: true,
      readableHighWaterMark: 26214400, // 25MB
      transform(chunk, _encoding, callback) {
        chunk.message = chunk.message.toString('utf8');
        const strMessage = JSON.stringify(chunk) + '\n';
        const strMessageByteSize = Buffer.byteLength(strMessage);
        // drops any message if stream is full, prevents backpressure and memory consumption
        // see: https://nodejs.org/en/docs/guides/backpressuring-in-streams/
        if (this.readableLength + strMessageByteSize + backPressureMessageByteSize < this.readableHighWaterMark) {
          this.push(strMessage);
          this.backpressureWarning = false;
        } else {
          // send a warning if there is space, and we are not already sending one
          if (!this.backpressureWarning && this.readableLength + backPressureMessageByteSize < this.readableHighWaterMark) {
            this.push(backPressureMessage);
            this.backpressureWarning = true;
          }
        }
        callback();
      },
    });
  }

  /**
   * @function module:common/logging/PipelineLogger#createRemoteLogger
   * @description Generates a remote stream for the pipeline.
   * @returns {object} - log stream
   */
  createRemoteLogger() {
    return winston.createLogger({
      level: 'silly',
      transports: [
        new winston.transports.Stream({stream: this.remoteStream}),
      ],
    });
  }

  /**
   * @function module:common/logging/PipelineLogger#createContainerOutputStream
   * @description Creates a stream for dockerrode to use, pipe that stream into correct logger.
   * @param {object} containerNames - container names object
   * @param {boolean} isErrorOutput - is error output
   * @returns {object} - log stream
   */
  createContainerOutputStream(containerNames, isErrorOutput = false) {
    const transformStream = new ContainerStreamTransform(this.pipeline?.getEnvironment(), containerNames, isErrorOutput);
    stream.pipeline(transformStream, this.containerConsoleLogger, () => { });
    if (this.remoteStream) {
      stream.pipeline(transformStream, this.remoteStream, () => { });
    }
    if (this.loggingType === 'file') {
      stream.pipeline(transformStream, this.containerFileLogger, () => { });
    } else if (this.loggingType === 'files') {
      stream.pipeline(transformStream, this.createContainerFilesLogger(containerNames), () => { });
    }
    return transformStream;
  }

  /**
   * @function module:common/logging/PipelineLogger#clientContainerLogger
   * @description Used by a client to log container output.
   * @param {object} info - winston info object
   */
  clientContainerLogger(info) {
    this.containerConsoleLogger.log(info);
    if (this.loggingType === 'file') {
      this.containerFileLogger.log(info);
    } else if (this.loggingType === 'files') {
      if (!this.containerFilesLogger[info.containerNames?.containerId]) {
        this.containerFilesLogger[info.containerNames.containerId] = this.createContainerFilesLogger(info.containerNames);
      }
      this.containerFilesLogger[info.containerNames?.containerId].log(info);
    }
  }

  /**
   * @function module:common/logging/PipelineLogger#startHeartbeat
   * @description Starts a heartbeat to keep the remote stream alive.
   */
  startHeartbeat() {
    if (this.remoteStream != null) {
      this.remoteStream.write({message: 'Heartbeat.', level: 'silly'});
      setTimeout(this.startHeartbeat.bind(this), 60000);
    }
  }

  /**
   * @function module:common/logging/PipelineLogger#getRemoteLogger
   * @description getter for the logger to log to the remote stream
   * @returns {object} - winston logger
   */
  getRemoteLogger() {
    return this.remoteLogger;
  }

  /**
   * @function module:common/logging/PipelineLogger#getRemoteReadableStream
   * @description getter for the readable rate-limited stream
   * @returns {stream} - readable stream
   */
  getRemoteReadableStream() {
    return this.remoteStream;
  }
}
