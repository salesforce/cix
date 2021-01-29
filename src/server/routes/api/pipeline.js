/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* eslint-disable jsdoc/check-tag-names */
import {PipelineService} from '../../../engine/index.js';
import asyncLogHandler from './asyncLogHandler.js';
import environment from './environment.js';
import express from 'express';
import log from 'winston';

const pipeline = express.Router();
pipeline.use(environment);

/**
 * @swagger
 *
 * definitions:
 *   EnvironmentVariable:
 *     type: object
 *     properties:
 *       name:
 *         type: string
 *       value:
 *         type: string
 *       type:
 *         type: string
 *   PipelineStatus:
 *     type: string
 *     enum:
 *       - "ready"
 *       - "invalid"
 *       - "running"
 *       - "failed"
 *       - "success"
 *   NewPipeline:
 *     type: object
 *     properties:
 *       environment:
 *         type: array
 *         description: "List of environment variables."
 *         items:
 *           $ref: '#/definitions/EnvironmentVariable'
 *       pipelineAlias:
 *         type: string
 *         description: "Alias for pipeline."
 *       yamlPath:
 *         type: string
 *         description: "Path to YAML to load."
 *       rawPipeline:
 *         type: Object
 *         description: "JSON pipeline to load."
 *       type:
 *         type: string
 *         description: "Type of pipeline."
 *   Pipeline:
 *     type: object
 *     properties:
 *       status:
 *         $ref: '#/definitions/PipelineStatus'
 *       id:
 *         type: string
 *         description: "UUID ID of the Pipeline."
 *       environment:
 *         $ref: '#/definitions/EnvironmentMap'
 *       yamlPath:
 *         type: string
 *         description: "Path to YAML to load."
 *       type:
 *         type: string
 *         description: "Type of pipeline."
 */

/**
 * @swagger
 *
 * /pipeline:
 *   post:
 *     tags:
 *       - "Pipeline"
 *     description: "Creates a new Pipeline."
 *     operationId: "addPipeline"
 *     consumes:
 *       - "application/json"
 *     produces:
 *       - 'application/json'
 *     parameters:
 *       - in: "body"
 *         name: "pipelineSpec"
 *         description: "Pipeline Object to add"
 *         required: true
 *         schema:
 *            $ref: "#/definitions/NewPipeline"
 *     responses:
 *       200:
 *         description: "successful operation"
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: "The UUID of the new Pipeline"
 *       400:
 *         description: "Invalid request."
 *         schema:
 *           type: string
 *       418:
 *         description: "Invalid Pipeline Schema"
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: "The UUID of the new Pipeline"
 */
pipeline.post('/', asyncLogHandler(async (req, res) => {
  const pipelineSpec = req.body;
  if (!pipelineSpec.environment) {
    pipelineSpec.environment = [];
  }
  // Grab the host header, remove the port
  let host = req.headers.host;
  if (host.includes(':')) {
    host = host.split(':')[0];
  }
  // Add the host as 'CIX_HOSTNAME' for the pipeline
  pipelineSpec.environment.push({name: 'CIX_HOSTNAME', value: host, type: 'internal'});
  res.send(await PipelineService.addPipeline(pipelineSpec));
}));

/**
 * @swagger
 *
 * /pipeline:
 *   get:
 *     tags:
 *       - "Pipeline"
 *     description: "Returns a list of pipelines."
 *     operationId: "getPipelineList"
 *     produces:
 *       - 'application/json'
 *     responses:
 *       200:
 *         description: "successful operation"
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             description: "UUID of a pipeline."
 */
pipeline.get('/', asyncLogHandler(async (req, res) => {
  res.send(await PipelineService.getPipelineList());
}));

/**
 * @swagger
 *
 * /pipeline/alias/{pipelineAlias}:
 *   get:
 *     tags:
 *       - "Pipeline"
 *     description: "Gets the ID for a pipeline alias."
 *     operationId: "getPipelineForAlias"
 *     parameters:
 *       - name: "pipelineAlias"
 *         in: "path"
 *         description: "Alias name"
 *         required: true
 *         type: string
 *     produces:
 *       - 'application/json'
 *     responses:
 *       200:
 *         description: "successful operation"
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: "The UUID of the Default"
 */
pipeline.get('/alias/:pipelineAlias', asyncLogHandler(async (req, res) => {
  res.send({id: PipelineService.getPipelineForAlias(req.params['pipelineAlias'])});
}));

/**
 * @swagger
 *
 * /pipeline/alias/:
 *   get:
 *     tags:
 *       - "Pipeline"
 *     description: "Gets the ID for a pipeline alias."
 *     operationId: "getAliasList"
 *     produces:
 *       - 'application/json'
 *     responses:
 *       200:
 *         description: "successful operation"
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             description: "Name of alias."
 */
pipeline.get('/alias/', asyncLogHandler(async (req, res) => {
  res.send(PipelineService.getAliasList());
}));

/**
 * @swagger
 *
 * /pipeline/{pipelineId}:
 *   get:
 *     tags:
 *       - "Pipeline"
 *     description: "Returns the sequence of Pipeline steps."
 *     operationId: "getPipelineSequence"
 *     produces:
 *       - 'application/json'
 *     parameters:
 *       - name: "pipelineId"
 *         in: "path"
 *         description: "Pipeline ID"
 *         required: false
 *         schema:
 *            $ref: "#/definitions/Pipeline"
 *     responses:
 *       200:
 *         description: "successful operation"
 *         schema:
 *           $ref: '#/definitions/Pipeline'
 *       400:
 *         description: "Invalid request."
 *         schema:
 *           type: string
 *       404:
 *         description: "Pipeline does not exist."
 *         schema:
 *           type: string
 */
pipeline.get('/:pipelineId', asyncLogHandler(async (req, res) => {
  res.send(await PipelineService.getPipelineSequence(req.params['pipelineId']));
}));

/**
 * @swagger
 *
 * /pipeline/{pipelineId}/alias:
 *   get:
 *     tags:
 *       - "Pipeline"
 *     description: "Gets the alias for a given pipeline."
 *     operationId: "getAliasesForPipeline"
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
 *           items:
 *             type: string
 *             description: "Alias for pipeline."
 */
pipeline.get('/:pipelineId/alias', asyncLogHandler(async (req, res) => {
  res.send(PipelineService.getAliasesForPipeline(req.params['pipelineId']));
}));

/**
 * @swagger
 *
 * /pipeline/{pipelineId}/alias/{pipelineAlias}:
 *   post:
 *     tags:
 *       - "Pipeline"
 *     description: "Sets the alias for a given pipeline."
 *     operationId: "setAliasForPipeline"
 *     produces:
 *       - 'application/json'
 *     parameters:
 *       - name: "pipelineId"
 *         in: "path"
 *         description: "Pipeline ID"
 *         required: true
 *         type: string
 *       - name: "pipelineAlias"
 *         in: "path"
 *         description: "Alias name"
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: "successful operation"
 */
pipeline.post('/:pipelineId/alias/:pipelineAlias', asyncLogHandler(async (req, res) => {
  res.send({id: PipelineService.setAliasForPipeline(req.params['pipelineAlias'], req.params['pipelineId'])});
}));

/**
 * @swagger
 *
 * /pipeline/{pipelineId}/status:
 *   get:
 *     tags:
 *       - "Pipeline"
 *     description: "Returns the status for a pipeline."
 *     operationId: "getPipelineStatus"
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
 *           type: object
 *           description: "Pipeline Status"
 *           properties:
 *             status:
 *               $ref: '#/definitions/PipelineStatus'
 *       404:
 *         description: "Pipeline does not exist."
 *         schema:
 *           type: string
 */
pipeline.get('/:pipelineId/status', asyncLogHandler(async (req, res) => {
  res.send({status: await PipelineService.getPipeline(req.params['pipelineId']).getStatus()});
}));

/**
 * @swagger
 *
 * /pipeline/{pipelineId}/start:
 *   get:
 *     tags:
 *       - "Pipeline"
 *     description: "Starts a pipeline."
 *     operationId: "startPipeline"
 *     produces:
 *       - 'application/json'
 *     parameters:
 *       - name: "pipelineId"
 *         in: "path"
 *         description: "Pipeline ID"
 *         required: true
 *         type: string
 *       - name: "blocking"
 *         in: "query"
 *         description: "Blocks until pipeline is complete."
 *         required: false
 *         type: boolean
 *         default: true
 *       - name: "remoteLogs"
 *         in: "query"
 *         description: "Remote Log Stream"
 *         required: false
 *         type: boolean
 *         default: true
 *     responses:
 *       200:
 *         description: "successful operation"
 *       404:
 *         description: "Pipeline does not exist."
 *         schema:
 *           type: string
 */
pipeline.get('/:pipelineId/start', asyncLogHandler(async (req, res) => {
  if (req.query.blocking === undefined || req.query.blocking === 'true') {
    log.debug('Server blocking on pipeline execution.');
    await PipelineService.startPipeline(req.params['pipelineId']);
  } else {
    log.debug('Server non-blocking on pipeline execution.');
    PipelineService.startPipeline(req.params['pipelineId']);
  }
  res.send();
}));

/**
 * @swagger
 *
 * /pipeline/{pipelineId}/pause:
 *   get:
 *     tags:
 *       - "Pipeline"
 *     description: "Pauses a pipeline."
 *     operationId: "pausePipeline"
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
 *           type: string
 *       404:
 *         description: "Pipeline does not exist."
 *         schema:
 *           type: string
 */
pipeline.get('/:pipelineId/pause', asyncLogHandler(async (req, res) => {
  await PipelineService.pausePipeline(req.params['pipelineId']);
  res.send();
}));

/**
 * @swagger
 *
 * /pipeline/{pipelineId}/resume:
 *   get:
 *     tags:
 *       - "Pipeline"
 *     description: "Resumes a pipeline."
 *     operationId: "resumePipeline"
 *     produces:
 *       - 'application/json'
 *     parameters:
 *       - name: "pipelineId"
 *         in: "path"
 *         description: "Pipeline ID"
 *         required: true
 *         type: string
 *       - name: "step"
 *         in: "query"
 *         description: "Step Name"
 *         required: false
 *         type: string
 *       - name: "blocking"
 *         in: "query"
 *         description: "Blocks while pipeline is active."
 *         required: false
 *         type: boolean
 *         default: true
 *       - name: "remoteLogs"
 *         in: "query"
 *         description: "Remote Log Stream"
 *         required: false
 *         type: boolean
 *         default: true
 *     responses:
 *       200:
 *         description: "successful operation"
 *       404:
 *         description: "Pipeline does not exist."
 *         schema:
 *           type: string
 */
pipeline.get('/:pipelineId/resume', asyncLogHandler(async (req, res) => {
  if (req.query.blocking === undefined || req.query.blocking === 'true') {
    log.debug('Server blocking on pipeline execution.');
    await PipelineService.resumePipeline(req.params['pipelineId'], req.query['step']);
  } else {
    log.debug('Server non-blocking on pipeline execution.');
    PipelineService.resumePipeline(req.params['pipelineId'], req.query['step']);
  }
  res.send();
}));

/**
 * @swagger
 *
 * /pipeline/{pipelineId}/kill:
 *   get:
 *     tags:
 *       - "Pipeline"
 *     description: "Kills a pipeline."
 *     operationId: "killPipeline"
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
 *       404:
 *         description: "Pipeline does not exist."
 *         schema:
 *           type: string
 */
pipeline.get('/:pipelineId/kill', asyncLogHandler(async (req, res) => {
  await PipelineService.killPipeline(req.params['pipelineId']);
  res.send();
}));

/**
 * @swagger
 *
 * /pipeline/{pipelineId}/next-step:
 *   get:
 *     tags:
 *       - "Pipeline"
 *     description: "Runs the next step on a pipeline."
 *     operationId: "nextPipelineStep"
 *     produces:
 *       - 'application/json'
 *     parameters:
 *       - name: "pipelineId"
 *         in: "path"
 *         description: "Pipeline ID"
 *         required: true
 *         type: string
 *       - name: "blocking"
 *         in: "query"
 *         description: "Blocks while pipeline is active."
 *         required: false
 *         type: boolean
 *         default: true
 *       - name: "remoteLogs"
 *         in: "query"
 *         description: "Remote Log Stream"
 *         required: false
 *         type: boolean
 *         default: true
 *     responses:
 *       200:
 *         description: "successful operation"
 *       400:
 *         description: "Invalid request, pipeline may already be complete."
 *         schema:
 *           type: string
 *       404:
 *         description: "Pipeline does not exist."
 *         schema:
 *           type: string
 */
pipeline.get('/:pipelineId/next-step', asyncLogHandler(async (req, res) => {
  if (req.query.blocking === undefined || req.query.blocking === 'true') {
    log.debug('Server blocking on pipeline execution.');
    await PipelineService.nextStepInPipeline(req.params['pipelineId'], req.query['step']);
  } else {
    log.debug('Server non-blocking on pipeline execution.');
    PipelineService.nextStepInPipeline(req.params['pipelineId'], req.query['step']);
  }
  res.send();
}));

/**
 * @swagger
 *
 * /pipeline/{pipelineId}/link/{nextPipelineId}:
 *   get:
 *     tags:
 *       - "Pipeline"
 *     description: "Chains one pipeline to another."
 *     operationId: "linkPipeline"
 *     produces:
 *       - 'application/json'
 *     parameters:
 *       - name: "pipelineId"
 *         in: "path"
 *         description: "The pipeline to chain onto."
 *         required: true
 *         type: string
 *       - name: "nextPipelineId"
 *         in: "path"
 *         description: "The pipeline to execute next."
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: "successful operation"
 *       404:
 *         description: "Pipeline does not exist."
 *         schema:
 *           type: string
 */
pipeline.get('/:pipelineId/link/:nextPipelineId', asyncLogHandler(async (req, res) => {
  await PipelineService.linkPipeline(req.params['pipelineId'], req.params['nextPipelineId']);
  res.send();
}));

export default pipeline;
