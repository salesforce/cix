/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {PipelineService} from '../../../engine/index.js';
import {pipeline} from 'stream';

/**
 * This method does two things. First it wraps async functions sending errors to the
 * express error handler. Secondly it sets up and closes the log stream for compatible
 * requests.
 *
 * @param {Function} callback - function to wrap with log handler
 * @returns {Function} - the function to return to the express router
 */
export default function asyncLogHandler(callback) {
  return function(req, res, next) {
    pipeLogStream(req, res);
    // catch(next) sends the error to the error handler
    callback(req, res, next).finally(() => {
      destroyLogStream(req);
    }).catch(next);
  };
}

/**
 * @param {object} req - express request object
 * @param {object} res - express response object
 */
function pipeLogStream(req, res) {
  if (req.params['pipelineId'] && req.query['remoteLogs'] && req.query['remoteLogs'] == 'true') {
    pipeline(PipelineService.getPipeline(req.params['pipelineId']).generateLogStream(), res, () => {});
  }
}

/**
 * @param {object} req - express request object
 */
function destroyLogStream(req) {
  if (req.params['pipelineId'] && req.query['remoteLogs'] && req.query['remoteLogs'] == 'true') {
    PipelineService.getPipeline(req.params['pipelineId']).destroyLogStream();
  }
}
