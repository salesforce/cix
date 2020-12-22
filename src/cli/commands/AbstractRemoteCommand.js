/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {ContainerLogger, ExecutionError, ServerError} from '../../common/index.js';
import AbstractCommand from './AbstractCommand.js';
import Swagger from 'swagger-client';
import axios from 'axios';
import log from 'winston';

export default class AbstractRemoteCommand extends AbstractCommand {
  /**
   * @class
   *
   * @description AbstractRemoteCommand Command.
   *
   * @param {string} name - name of the concrete class.
   * @see {@link https://www.npmjs.com/package/swagger-client|swagger-client}
   */
  constructor(name) {
    super(name);
  }

  /**
   * @function module:cli.AbstractRemoteCommand#registerOptions
   * @description Registers the command's options with Commander.
   *
   * @param {object} program - A reference to the Commander program.
   *
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerOptions(program) {
    program.option('--host <host>', 'CIX Server to connect to', '127.0.0.1');
    program.option('--port <port>', 'CIX Server to connect to', '10030');
    return super.registerOptions(program);
  }

  /**
   * @function module:cli.AbstractRemoteCommand#generateSwaggerClient
   * @description Generates Swagger client.
   *
   * @param {object} options - map of options set on command line
   *
   * @returns {object} The reference to the client.
   */
  async generateSwaggerClient(options) {
    if (!this.client) {
      const port = options.port || '10030';
      const host = options.host || '127.0.0.1';
      const url = `http://${host}:${port}/api-docs/swagger.json`;
      log.debug(`Creating Swagger Client from ${url}`);

      // Timeout of 3seconds trying to contact CIX Server...
      this.client = await new Promise( async (resolve, reject) => {
        setTimeout(() => {
          reject(new ServerError(`Unable to connect to CIX Server on http://${host}:${port}`));
        }, 3000);
        resolve(await Swagger(url));
      });
    }
    return this.client;
  }

  /**
   * @function module:cli.AbstractRemoteCommand#getPipelineApi
   * @description generates a pipeline API client.
   *
   * @param {object} options - map of options set on command line
   *
   * @returns {object} The reference to the pipeline client.
   */
  async getPipelineApi(options) {
    const client = await this.generateSwaggerClient(options);
    return client.apis.Pipeline;
  }

  /**
   * @function module:cli.AbstractRemoteCommand#getValidateApi
   * @description generates a validate API client.
   *
   * @param {object} options - map of options set on command line
   *
   * @returns {object} The reference to the validate client.
   */
  async getValidateApi(options) {
    const client = await this.generateSwaggerClient(options);
    return client.apis.Validate;
  }

  /**
   * @function module:cli.AbstractRemoteCommand#getPluginApi
   * @description generates a plugin API client.
   *
   * @param {object} options - map of options set on command line
   *
   * @returns {object} The reference to the plugin client.
   */
  async getPluginApi(options) {
    const client = await this.generateSwaggerClient(options);
    return client.apis.Plugin;
  }


  async checkStatusPostRun(pipelineId) {
    const pipelineApi = await this.getPipelineApi();
    const response = await pipelineApi.getPipelineStatus({pipelineId: pipelineId});
    const status = response.obj.status;
    switch (status) {
    case 'paused':
      log.info('Step(s) completed successfully.');
      break;
    case 'successful':
      log.info('Pipeline completed successfully.');
      break;
    case 'failed':
      throw new ExecutionError('Pipeline has failed.');
    default:
      throw new ExecutionError(`Pipeline is in an unexpected state: ${status}`);
    }
  }

  /**
   * @function module:cli.AbstractRemoteCommand#logStreamingFetch
   * @description generates a compatible axios request for swagger-client so we can stream the logs.
   *
   * @returns {object} A swagger-client request object.
   */
  logStreamingFetch() {
    return {
      userFetch: async (url, req) => {
        const containerLogger = new ContainerLogger();
        let axiosResponse;

        try {
          axiosResponse = await axios({
            ...req,
            responseType: 'stream',
          });
        } catch (error) {
          // Need to unpack the error stream to get the error message.
          if (error && error.response && error.response.data) {
            const errorMessage = JSON.parse(error.response.data.read().toString('utf8'));
            throw new ServerError(errorMessage.message, errorMessage.status);
          } else {
            throw error;
          }
        }

        try {
          // if the stream gets too heavy, a JSON message may get broken up into more than one chunk
          // track these incomplete messages here
          let incompleteMessage = '';
          for await (const chunk of axiosResponse.data) {
            // convert from buffer to string, split JSON objects by newline
            const jsonArray = chunk.toString('utf8').split('\n');

            // Add the incomplete message to the next chunk
            if (incompleteMessage.length != 0) {
              jsonArray[0] = incompleteMessage + jsonArray[0];
              incompleteMessage = '';
            }

            // get rid of that last array element if it is whitespace
            if (jsonArray[jsonArray.length - 1].trim().length == 0) {
              jsonArray.pop();
            }

            for (const json of jsonArray) {
              let obj;
              try {
                obj = JSON.parse(json);
              } catch (err) {
                incompleteMessage = json;
                break;
              }

              // demux the two log streams
              if (obj.containerNames) {
                // container log
                containerLogger.createClientStream().write(obj);
              } else {
                // cix application log
                obj.message = `Server: ${obj.message}`;
                log.log(obj);
              }
            }
          }
        } catch (err) {
          log.error(`Error parsing log stream: ${err}`);
        }

        // remove the data from the response, could be big...
        return new Response(null, {
          status: axiosResponse.status,
          headers: axiosResponse.headers,
        });
      }};
  }
}
