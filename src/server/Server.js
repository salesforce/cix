/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {Logger, ServerError, _} from '../common/index.js';
import dirname from './dirname.cjs';
import express from 'express';
import fs from 'fs';
import http from 'http';
import indexRouter from './routes/index.js';
import path from 'path';
import pipelineRouter from './routes/api/pipeline.js';
import pluginRouter from './routes/api/plugin.js';
import swaggerRouter from './routes/swagger.js';
import validateRouter from './routes/api/validate.js';

// import.meta.url jest workaround... Fix once Jest supports ES Modules: https://github.com/facebook/jest/issues/9430
const {__dirname} = dirname;

export default class Server {
  constructor(port) {
    if (_.isNil(port)) {
      port = 10030;
    }

    Logger.debug('Starting CIX Server on port: ' + port);

    // Create app context
    this.loadRoutes();

    // Get port from environment and store in Express.
    this.port = this.normalizePort(port);
    this.app.set('port', this.port);

    // Create HTTP server
    this.server = http.createServer(this.app);

    // Listen on provided port, on all network interfaces.
    this.server.listen(port);

    this.server.on('error', this.onError.bind(this));
    this.server.on('listening', this.onListening.bind(this));
  }

  async block() {
    // awaiting on a promise that will not resolve...
    await new Promise(() => Logger.debug('Control-C to terminate...'));
  }

  async close() {
    await this.server.close();
  }

  loadRoutes() {
    this.app = express();

    // view engine setup
    this.app.set('views', path.join(__dirname, './views'));
    this.app.set('view engine', 'ejs');

    // Add logging route
    this.app.use(this.expressLogger);

    this.app.use(express.json());
    this.app.use(express.urlencoded({extended: false}));
    this.app.use(express.static(path.join(__dirname, './public')));

    // load the docs
    const devPath = path.join(__dirname, '../../../docs');
    const containerPath = '/usr/src/app/docs';
    if (fs.existsSync(devPath)) {
      this.app.use('/docs', express.static(devPath));
    } else {
      this.app.use('/docs', express.static(containerPath));
    }

    this.app.use('/', indexRouter);
    this.app.use('/api/pipeline', pipelineRouter);
    this.app.use('/api/plugin', pluginRouter);
    this.app.use('/api/validate', validateRouter);
    this.app.use('/api-docs', swaggerRouter);

    // catch 404 and forward to error handler
    this.app.use((req, res, next) => {
      return next(new ServerError('Resource not found', 404));
    });

    // error handler, method signature needs to match exactly.
    // eslint-disable-next-line no-unused-vars
    this.app.use((error, req, res, next) => {
      // render the error page
      if (res._headerSent) {
        Logger.debug('Headers already sent. Unable to send error response to client for pipeline failure.');
      } else {
        const status = error.status || error.errorCode || 500;
        Logger.error(`${status} handling error ${error.message}`);
        if (error.stack) {
          Logger.debug(`${error.stack}`);
        }

        res.status(status);
        res.json({
          status: status,
          message: error.message,
        });
      }
    });
  }

  /**
   * @function module:server.Server#normalizePort
   * @param {object} port - port to normalize
   * @returns {number} normalized port
   */
  normalizePort(port) {
    if (isNaN(port)) {
      return port; // named port
    }

    const retPort = parseInt(port, 10);
    if (retPort > 0 && retPort <= 65535) {
      return retPort;
    } else {
      throw new ServerError(`Provided port '${port}' is invalid!`);
    }
  }

  /**
   * @function module:server.Server#onError
   * @description Event listener for HTTP server "error" event.
   * @param {object} error - error object
   */
  onError(error) {
    // These errors will get caught by the global catch in Errors.js
    switch (error.code) {
    case 'EACCES':
      throw new ServerError('Requires elevated privileges...');
    case 'EADDRINUSE':
      throw new ServerError('Port is already in use...');
    default:
      throw error;
    }
  }

  /**
   * @function module:server.Server#expressLogger
   * @param {object} req - request object
   * @param {object} res - response object
   * @param {object} next - function to be executed after logger
   */
  expressLogger(req, res, next) {
    let remoteAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // convert ipv6 to ipv4
    remoteAddress = remoteAddress.split(':').pop();
    // fix localhost reference
    if (remoteAddress == '1') {
      remoteAddress = '127.0.0.1';
    }
    Logger.debug(`${remoteAddress} ${req.method} ${req.originalUrl} received`);
    Logger.silly(`Express Logger Message: ${JSON.stringify(req.body, null, 4)}`);
    res.on('finish', function() {
      Logger.debug(`${remoteAddress} ${req.method} ${req.originalUrl} ${res.statusCode}`);
    });
    next();
  }

  /**
   * Event listener for HTTP server "listening" event.
   */
  onListening() {
    const addr = this.server.address();
    Logger.info(`Swagger ready at http://localhost:${addr.port}/api-docs`);
  }
}
