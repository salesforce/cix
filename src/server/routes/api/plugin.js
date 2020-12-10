/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* eslint-disable jsdoc/check-tag-names */
import {PluginService} from '../../../engine/index.js';
import asyncLogHandler from './asyncLogHandler.js';
import express from 'express';

const plugin = express.Router();

// TODO below should be updated to provide users with the correct way of defining a plugin (via a file location)
/**
 * @swagger
 *
 * /plugin:
 *   post:
 *     tags:
 *       - "Plugin"
 *     description: "Adds a plugin."
 *     consumes:
 *       - 'application/json'
 *     produces:
 *       - 'application/json'
 *     operationId: "addPlugin"
 *     parameters:
 *       - in: "body"
 *         name: "pluginSpec"
 *         description: "Plugin definition."
 *         required: true
 *     responses:
 *       200:
 *         description: "successful operation"
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: "The UUID of the new Plugin"
 *       400:
 *         description: "Invalid Plugin Schema"
 */
plugin.post('/', asyncLogHandler(async (req, res) => {
  const pluginSpec = {'pluginPath': req.body};
  res.send(await PluginService.addPlugin(pluginSpec.pluginPath));
}));

/**
 * @swagger
 *
 * /plugin:
 *   get:
 *     tags:
 *       - "Plugin"
 *     description: "Returns a list of plugins."
 *     operationId: "getPluginList"
 *     produces:
 *       - 'application/json'
 *     responses:
 *       200:
 *         description: "successful operation"
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             description: "UUID of a plugin."
 */
plugin.get('/', asyncLogHandler(async (req, res) => {
  res.send(await PluginService.getPluginList());
}));

export default plugin;
