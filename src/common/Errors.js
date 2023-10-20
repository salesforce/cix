/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {Logger} from './index.js';
import NodeProvider from './NodeProvider.js';

export class CIXError extends Error {
  constructor(message, stack) {
    super(message);
    this.name = 'CIXError';
    this.stack = stack;
  }
}

export class ValidateError extends CIXError {
  constructor(message, errorCode, stack) {
    super(message, stack);
    this.errorCode = errorCode;
    this.name = 'ValidateError';
  }
}

export class ExecutionError extends CIXError {
  constructor(message, errorCode, stack) {
    super(message, stack);
    this.errorCode = errorCode;
    this.name = 'ExecutionError';
  }
}

export class PluginError extends CIXError {
  constructor(message, errorCode, stack) {
    super(message, stack);
    this.errorCode = errorCode;
    this.name = 'PluginError';
  }
}


export class DockerError extends ExecutionError {
  constructor(message, stack) {
    super(message, undefined, stack);
    this.name = 'DockerError';
  }
}

export class CLIError extends CIXError {
  constructor(message, stack) {
    super(message, stack);
    this.name = 'CLIError';
  }
}

export class PipelineError extends CIXError {
  constructor(message, stack) {
    super(message, undefined, stack);
    this.name = 'PipelineError';
  }
}

export class ServerError extends CIXError {
  constructor(message, errorCode, stack) {
    super(message, stack);
    this.errorCode = errorCode;
    this.name = 'ServerError';
  }
}

NodeProvider.getProcess().on('uncaughtException', function(err) {
  if (err.stack) {
    Logger.error(err.stack);
  } else if (err.message) {
    Logger.error(`${err.name}: ${err.message}`);
  }
  NodeProvider.getProcess().exit(127);
});
