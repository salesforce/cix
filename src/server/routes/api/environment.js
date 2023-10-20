/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* eslint-disable jsdoc/check-tag-names */
import {EnvironmentService} from '../../../engine/index.js';
import asyncLogHandler from './asyncLogHandler.js';
import express from 'express';

const environment = express.Router();

/**
 * @swagger
 *
 * /pipeline/{pipelineId}/environment:
 *   get:
 *     tags:
 *       - "Pipeline Environment"
 *     description: "Returns list of environment variables for a Pipeline."
 *     operationId: "listEnvironmentVariables"
 *     produces:
 *       - 'application/json'
 *     parameters:
 *       - name: "pipelineId"
 *         in: "path"
 *         description: "Pipeline ID"
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: "successful operation"
 *         schema:
 *           type: array
 *           description: "List of environment variables."
 *           items:
 *             type: string
 */
environment.get('/:pipelineId/environment', asyncLogHandler(async (req, res) => {
  res.send(await EnvironmentService.listEnvironmentVar(req.params['pipelineId']));
}));

/**
 * @swagger
 *
 * /pipeline/{pipelineId}/environment:
 *   post:
 *     tags:
 *       - "Pipeline Environment"
 *     description: "Adds a new environment variable."
 *     operationId: "setEnvironmentVariable"
 *     consumes:
 *       - "application/json"
 *     produces:
 *       - 'application/json'
 *     parameters:
 *       - name: "pipelineId"
 *         in: "path"
 *         description: "Pipeline ID"
 *         required: true
 *         type: string
 *       - name: "body"
 *         in: "body"
 *         description: "New environment variable"
 *         required: true
 *         schema:
 *            $ref: '#/definitions/EnvironmentVariable'
 *     responses:
 *       200:
 *         description: "successful operation"
 */
environment.post('/:pipelineId/environment', asyncLogHandler(async (req, res) => {
  res.send(await EnvironmentService.setEnvironmentVar(req.params['pipelineId'], req.body));
}));

/**
 * @swagger
 *
 * /pipeline/{pipelineId}/environment/{environmentVar}:
 *   get:
 *     tags:
 *       - "Pipeline Environment"
 *     description: "Gets a environment variable."
 *     operationId: "getEnvironmentVariable"
 *     produces:
 *       - 'application/json'
 *     parameters:
 *       - name: "pipelineId"
 *         in: "path"
 *         description: "Pipeline ID"
 *         required: true
 *         type: string
 *       - name: "environmentVar"
 *         in: "path"
 *         description: "Environment Variable"
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: "successful operation"
 *         schema:
 *           $ref: '#/definitions/EnvironmentVariable'
 *       404:
 *         description: "Key does not exist."
 */
environment.get('/:pipelineId/environment/:environmentVar', asyncLogHandler(async (req, res) => {
  res.send(await EnvironmentService.getEnvironmentVar(req.params['pipelineId'], req.params['environmentVar']));
}));

export default environment;
