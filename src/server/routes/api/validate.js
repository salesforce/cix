/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* eslint-disable jsdoc/check-tag-names */
import {ValidateService} from '../../../engine/index.js';
import {_} from '../../../common/index.js';
import asyncLogHandler from './asyncLogHandler.js';
import express from 'express';

const validate = express.Router();

/**
 * @swagger
 *
 * /validate/pipeline/full:
 *   post:
 *     tags:
 *       - "Validate"
 *     description: "Validates a Pipeline YAML."
 *     consumes:
 *       - 'application/json'
 *     produces:
 *       - 'application/json'
 *     operationId: "validate"
 *     parameters:
 *       - in: "body"
 *         name: "pipelineSpec"
 *         description: "Pipeline Object to validate"
 *         required: true
 *         schema:
 *            $ref: "#/definitions/NewPipeline"
 *     responses:
 *       200:
 *         description: "successful operation"
 *       400:
 *         description: "Invalid Pipeline Schema"
 *         schema:
 *           type: object
 *           properties:
 *             result:
 *               type: string
 *               description: "YAML validation result."
 */
validate.post('/pipeline/full', asyncLogHandler(async (req, res) => {
  await ValidateService.validatePipeline(req.body);
  res.send();
}));

/**
 * @swagger
 *
 * /validate/pipeline/schema:
 *   post:
 *     tags:
 *       - "Validate"
 *     description: "Validates a JSON Pipeline Schema without loading."
 *     consumes:
 *       - 'application/json'
 *     produces:
 *       - 'application/json'
 *     operationId: "validatePipelineSchema"
 *     parameters:
 *       - in: "body"
 *         name: "pipelineSpec"
 *         description: "Pipeline Schema"
 *         required: true
 *     responses:
 *       200:
 *         description: "successful operation"
 *       400:
 *         description: "Invalid Pipeline Schema"
 *         schema:
 *           type: object
 *           properties:
 *             result:
 *               type: string
 *               description: "YAML validation result."
 */
validate.post('/pipeline/schema', asyncLogHandler(async (req, res) => {
  const errors = await ValidateService.validatePipelineSchema(req.body);
  if (_.isEmpty(errors)) {
    res.send();
  } else {
    res.status(400).send(errors);
  }
}));

/**
 * @swagger
 *
 * /validate/plugin/schema:
 *   post:
 *     tags:
 *       - "Validate"
 *     description: "Validates a Plugin Schema without loading."
 *     consumes:
 *       - 'application/json'
 *     produces:
 *       - 'application/json'
 *     operationId: "validatePluginSchema"
 *     parameters:
 *       - in: "body"
 *         name: "pluginSpec"
 *         description: "Pipeline Schema"
 *         required: true
 *     responses:
 *       200:
 *         description: "successful operation"
 *       400:
 *         description: "Invalid Pipeline Schema"
 *         schema:
 *           type: object
 *           properties:
 *             result:
 *               type: string
 *               description: "YAML validation result."
 */
validate.post('/plugin/schema', asyncLogHandler(async (req, res) => {
  const errors = await ValidateService.validatePluginSchema(req.body);
  if (_.isEmpty(errors)) {
    res.send();
  } else {
    res.status(400).send(errors);
  }
}));

export default validate;
