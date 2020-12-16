/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import dirname from './dirname.cjs';
import express from 'express';
import fs from 'fs';
import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// import.meta.url jest workaround... Fix once Jest supports ES Modules: https://github.com/facebook/jest/issues/9430
const {__dirname} = dirname;

const json = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf8'));
const version = json.version;

const swagger = express.Router();

const swaggerDefinition = {
  swagger: '2.0',
  info: {
    title: 'CIX Server API',
    version: version,
    description: 'This is the CIX Server API. Contact us on Slack, [#cix-users](https://computecloud.slack.com/archives/CEMNRF99Q).',
    contact: {
      email: 'ciplatform@salesforce.com',
    },
  },
  tags: [
    {
      name: 'Validate',
      description: 'Pipeline Validation',
    },
    {
      name: 'Pipeline',
      description: 'Pipeline Operations',
    },
    {
      name: 'Pipeline Environment',
      description: 'Environment Variable Operations',
    },
    {
      name: 'Plugin',
      description: 'Plugin Operations',
    },
  ],
  basePath: '/api',
  externalDocs: {
    description: 'Find out more about CIX',
    url: 'https://opensource.salesforce.com/cix/',
  },
};

const options = {
  swaggerDefinition: swaggerDefinition,
  apis: [
    __dirname + '/api/*',
  ],
};

const swaggerSpec = swaggerJSDoc(options);


swagger.use('/', swaggerUi.serve);
swagger.get('/', swaggerUi.setup(swaggerSpec));
swagger.get('/swagger.json', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

export default swagger;
