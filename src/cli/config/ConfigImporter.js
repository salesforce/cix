/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {Logger, NodeProvider, _} from '../../common/index.js';
import Path from 'path';
import yaml from 'js-yaml';

export default class ConfigImporter {
  filenames = ['.cixconfig.yaml', '.cixconfig.json', '.cixconfig'];

  /**
   * @function module:cli.config.ConfigImporter#load
   * @description Loads the content of one or all config files into memory.
   * @param {string} [path] - path to .cixconfig file
   * @returns {undefined}
   */
  load(path) {
    let filenames = this.filenames;

    // if a specific path is provided, load it exclusively
    if (path) {
      filenames = _.concat([], path);
    }

    // load all of the configurations from the filesystem
    let configs = [];
    _.each(filenames, (filename) => {
      const pathToLoad = Path.resolve(`${Path.dirname(filename)}/${Path.basename(filename)}`);
      const loadedConfigs = loadConfigFile(pathToLoad);
      if (loadedConfigs) {
        Logger.debug(`Successfully loaded CIX user configuration from ${pathToLoad}`);
        configs = _.concat(configs, loadedConfigs);
      }
    });

    this.loadedConfigs = _.merge({}, ...configs);
  }

  /**
   * @function module:cli.config.ConfigImporter#updateOptions
   * @description Modifies the options object to use imported configs where applicable.
   * @param {object} options - map of options set on command line
   * @returns {undefined}
   */
  updateOptions(options) {
    // options already set in 'options' will have the highest priority
    if (!options.yaml && this.loadedConfigs.pipelines) {
      options.yaml = this.loadedConfigs.pipelines;
    }

    if (!options.plugin && this.loadedConfigs.plugins) {
      options.plugin = this.loadedConfigs.plugins;
    }

    if (this.loadedConfigs.environment) {
      options.env = _.merge({}, this.loadedConfigs.environment, options.env);
    }

    if (this.loadedConfigs.secrets) {
      options.secret = _.merge({}, this.loadedConfigs.secrets, options.secret);
    }

    if (this.loadedConfigs['prompted-secrets']) {
      options.secretPrompt = _.union(this.loadedConfigs['prompted-secrets'], options.secretPrompt);
    }

    if (this.loadedConfigs.logging && this.loadedConfigs.logging.mode) {
      if (!options.logging) {
        options.logging = this.loadedConfigs.logging.mode;
      }
    }

    if (this.loadedConfigs.logging && this.loadedConfigs.logging.path) {
      if (!options.loggingPath && options.logging === 'files') {
        options.loggingPath = this.loadedConfigs.logging.path;
      }
    }
  }
}

/**
 * @function module:cli.config.ConfigImporter#loadConfigFile
 * @description Loads options from the given path.
 * @param {object} path - location of config file to load
 * @returns {object} representation of the loaded configurations
 */
export function loadConfigFile(path) {
  const encoding = 'utf-8';
  let file;

  try {
    file = NodeProvider.getFs().readFileSync(path);
  } catch (error) {
    return; // do not alert user if file is not found, just continue on
  }

  try {
    return yaml.load(file, encoding);
  } catch (error) { // file is not yaml, try loading it as json
    try {
      return JSON.parse(file);
    } catch (err) {
      Logger.warn(`Could not parse ${path} as either YAML or JSON, skipping.`);
    }
  }
}
