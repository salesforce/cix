/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {CIXError, CLIError, NodeProvider, PluginError, _} from '../../common/index.js';
import AbstractRemoteCommand from './AbstractRemoteCommand.js';
import log from 'winston';
import readlineSync from 'readline-sync';

export default class Load extends AbstractRemoteCommand {
  /**
   * @class
   *
   * @description Load Command.
   *
   * @param {string} name - name of the concrete class.
   */
  constructor(name) {
    super(name || 'load');

    this.input = '';
  }

  /**
   * @function module:cli.Load#registerOptions
   * @description Registers the command's options with Commander.
   *
   * @param {object} program - A reference to the Commander program.
   *
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerOptions(program) {
    program.option('-a, --pipeline-alias <pipeline-alias>', 'Assign an alias for the pipeline.');
    program.option('-c, --configfile <path>', 'Specify a cix configuration file to load.');
    program.option('-e, --env <mapping>', 'Specify environment variable.  Mapping should be in the form of KEY ' +
      '(value taken from environment) or KEY=VALUE.', this.collectKeyValue);
    program.option('-s, --secret <mapping>', 'Specify a secret (insecure). Mapping should be in the form of KEY ' +
      '(secret taken from environment) or KEY=SECRET.', this.collectKeyValueAndWarn.bind(this));
    program.option('-w, --workspace <path>', 'Specify the workspace path.  Default path is the current working directory.');
    program.option('-l, --logging <mode>', 'Specify container output logging mode: console, or files (separate files).');
    program.option('-p, --logging-path <path>', 'Path where logs created by the \'files\' logging mode will be stored. (default: "logs")');
    program.option('-y, --yaml <path>', 'Path to pipeline definition YAML file. May be repeated.', this.collectValues.bind(this));
    program.option('--plugin <path>', 'Path to plugin YAML file. May be repeated.', this.collectValues.bind(this));
    program.option('--setup <path>', 'Path to setup pipeline YAML file.');
    program.option('--teardown <path>', 'Path to teardown pipeline YAML file.');
    program.option('--secret-prompt <key>', 'CIX will prompt you for the value of the key specified.');
    program.option('--secret-stdin <key>', 'CIX will assign a value passed via stdin to the key specified. Cannot be used with --secrets-stdin.');
    program.option('--secrets-stdin', 'CIX will accept a map of key/value pairs in JSON format via stdin. Cannot be used with --secret-stdin.');
    return super.registerOptions(program);
  }

  /**
   * @function module:cli.Load#registerDescription
   * @description Registers the command's description with Commander.
   *
   * @param {object} program - A reference to the Commander program.
   *
   * @returns {object} The reference to the Commander program (used in builder pattern).
   */
  registerDescription(program) {
    return program.description('Loads a pipeline onto a remote CIX Server.');
  }

  /**
   * @function module:cli.Load#validateOptions
   * @description Check command line parameters.
   *
   * @param {object} options - map of options set on command line
   *
   * @returns {undefined}
   */
  validateOptions(options) {
    super.validateOptions(options);

    if (options.secretStdin && options.secretsStdin) {
      throw new CLIError('--secret-stdin and --secrets-stdin are mutually exclusive');
    }

    if (options.secretPrompt && (options.secretStdin || options.secretsStdin)) {
      throw new CLIError('--secret-prompt may not be used with the --secret-stdin nor --secrets-stdin options');
    }

    if (options.secretStdin === '' || options.secretPrompt === '') {
      throw new CLIError('--secret-stdin and --secret-prompt require non-empty keys to be provided');
    }
  }

  /**
   * @function module:cli.Load#action
   * @description Runs the Load sub command.
   *
   * @param {object} options - map of options set on command line
   *
   * @returns {undefined}
   */
  async action(options) {
    this.loadCixConfig(options);
    this.validateOptions(options);

    if (options.secretStdin || options.secretsStdin || options.secretPrompt && !NodeProvider.getProcess().stdin.isTTY) {
      return new Promise((resolve) => this.acceptInput(resolve))
        .then(() => this.actionCallback(options));
    } else {
      return this.actionCallback(options);
    }
  }

  /**
   * @function module:cli.Load#getStdin
   * @description Mockable method which returns the stdin stream.
   *
   * @returns {object} a readable stream
   */
  getStdin() {
    return NodeProvider.getProcess().stdin;
  }

  /**
   * @function module:cli.Load#setInput
   * @description Provides a way to override input from the CLI.
   *
   * @param {string} input - Data representing input to the program (stdin).
   *
   * @returns {undefined}
   */
  setInput(input) {
    this.input = input;
  }

  /**
   * @function module:cli.AbstractCommand#acceptInput
   * @description Sets up the command to accept input from stdin.
   *
   * @param {Function} onEnd - Called when all input has been collected
   *
   * @returns {undefined}
   */
  acceptInput(onEnd) {
    const inputStream = this.getStdin();

    inputStream.on('data', (chunk) => {
      if (chunk !== null) {
        this.input += chunk;
      }
    });

    inputStream.on('end', () => {
      onEnd();
    });
  }

  /**
   * @function module:cli.Load#actionCallback
   * @description Runs the remainder of the Load sub command, as a callback when input is required.
   *
   * @param {object} options - map of options set on command line
   *
   * @returns {undefined}
   */
  async actionCallback(options) {
    this.handleSecrets(options);
    this.configureLogger(options);

    const plugins = await this.loadPlugin(options);
    const pipelineList = this.generateListOfPipelines(options);
    log.silly(`Adding new pipelines: ${JSON.stringify(pipelineList)}`);

    // Add and link all chained pipelines
    for (let i = 0; i < pipelineList.length; i++) {
      log.silly(`Adding Pipeline ${i + 1} of ${pipelineList.length}: ${JSON.stringify(pipelineList[i])}`);
      const pipelineSpec = {};

      if (!_.isEmpty(plugins)) {
        pipelineSpec.plugins = plugins;
      }

      pipelineSpec.yamlPath = pipelineList[i].yaml;
      if (!_.isNil(pipelineList[i].type) && pipelineList[i].type == 'teardown') {
        pipelineSpec.type = 'teardown';
      } else {
        pipelineSpec.type = 'standard';
      }
      pipelineSpec.environment = this.generateEnvironmentList(options);

      if (options.workspace) {
        pipelineSpec.workspace = options.workspace;
      }

      // Add the alias to the first pipeline
      if (options.pipelineAlias && i == 0) {
        pipelineSpec.pipelineAlias = options.pipelineAlias;
      }

      let response;
      if (this.name === 'load' || options.remote) {
        const pipelineApi = await this.getPipelineApi(options);
        response = await pipelineApi.addPipeline({pipelineSpec: pipelineSpec});
        response = response.body;
      } else {
        // Only run this from derived subclasses like Exec.
        if (!pipelineSpec.environment) {
          pipelineSpec.environment = [];
        }
        pipelineSpec.environment.push({name: 'CIX_HOSTNAME', value: options.host, type: 'internal'});
        response = await this.getPipelineService().addPipeline(pipelineSpec);
      }
      log.silly(`Got back Pipeline ${JSON.stringify(response)}`);

      if (_.isNil(response) || _.isNil(response.id)) {
        throw new CIXError('Response invalid');
      } else {
        pipelineList[i].id = response.id;
      }

      // Chain the pipelines together...
      if (i != 0) {
        if (this.name === 'load' || options.remote) {
          const pipelineApi = await this.getPipelineApi(options);
          await pipelineApi.linkPipeline({pipelineId: pipelineList[i - 1].id, nextPipelineId: pipelineList[i].id});
        } else {
          // Only run this from derived subclasses like Exec.
          await this.getPipelineService().linkPipeline(pipelineList[i - 1].id, pipelineList[i].id);
        }
      }
    }

    if (this.name === 'load') {
      log.info('INFO: Pipeline(s) loaded, use \'cix resume\' to continue.');
    }

    // return the first Pipeline ID, so caller can kick off the pipeline chain
    return pipelineList[0].id;
  }

  /**
   * @function module:cli.Load#loadPlugin
   * @description Loads any plugins defined in options.
   *
   * @param {object} options - map of options set on command line
   *
   * @returns {Array} list of pipeline ids.
   */
  async loadPlugin(options) {
    const ids = [];
    if (options.plugin) {
      log.info(`Plugins to load: ${options.plugin}`);
      let pluginApi;
      if (this.name === 'load' || options.remote) {
        pluginApi = await this.getPluginApi(options);
        for (const plugin in options.plugin) {
          log.silly(`Adding plugin ${options.plugin[plugin]}`);
          const response = await pluginApi.addPlugin({'pluginSpec': {'pluginPath': options.plugin[plugin]}});
          if (response.body && response.body.id) {
            log.silly(`Created plugin ${response.body.id}`);
            ids.push(response.body);
          } else {
            throw new PluginError('Did not get back ID from server.');
          }
        }
      } else {
        pluginApi = this.getPluginService();
        for (const plugin in options.plugin) {
          log.silly(`Adding plugin ${options.plugin[plugin]}`);
          ids.push(await pluginApi.addPlugin({'pluginPath': options.plugin[plugin]}));
        }
      }
    }
    return ids;
  }

  /**
   * @function module:cli.Load#handleSecrets
   * @description Check options and intake secrets
   *
   * @param {object} options - map of options set on command line
   *
   * @returns {undefined}
   */
  handleSecrets(options) {
    // secretStdin and secretsStdin are mutually exclusive options.
    if (options.secretStdin) {
      const key = options.secretStdin;

      // Trim final newline from stdin.
      this.input = this.input.replace(/\n$/, '');

      options.secret = _.extend(options.secret, {[key.trim()]: this.input});
    } else if (options.secretsStdin) {
      let secretMap = {};

      try {
        secretMap = JSON.parse(this.input);

        for (const [key, value] of Object.entries(secretMap)) {
          if (!key) {
            throw SyntaxError('Keys in map provided must be defined and non-empty');
          }

          if (!value) {
            throw SyntaxError('Values in map provided must be defined and non-empty');
          }
        }
      } catch (e) {
        throw new CLIError('There was an issue parsing JSON from stdin: ' + e);
      }

      if (!_.isEmpty(secretMap)) {
        options.secret = _.extend(options.secret, secretMap);
      }
    }

    if (options.secretPrompt) {
      const key = options.secretPrompt;
      let value;

      if (NodeProvider.getProcess().stdin.isTTY) {
        // Backspace doesn't appear to work by design (https://github.com/anseki/readline-sync/issues/17).
        value = readlineSync.question(`Please enter the value for secret '${key}': `, {
          hideEchoBack: true,
          keepWhitespace: true,
        });
      } else {
        if (options.secretStdin || options.secretsStdin) {
          throw new CLIError('--secret-prompt cannot be combined with --secret-stdin nor --secrets-stdin unless the input is a TTY');
        }

        // Trim final newline from stdin.
        value = this.input.replace(/\n$/, '');
      }

      options.secret = _.extend(options.secret, {[key]: value});
    }
  }
}
