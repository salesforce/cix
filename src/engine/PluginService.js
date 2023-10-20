/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {Logger, PluginError, _} from '../common/index.js';
import Plugin from './plugin/Plugin.js';

/**
 * @class
 * @description Services all engine calls.
 */
class PluginService {
  constructor() {
    this.plugins = {};
  }

  /**
   * @function module:engine.PluginService#addPlugin
   * @description Creates a new Plugin.
   * @async
   * @param {object} definition - A object representation of the plugin.
   * @returns {string} An object response containing the ID of the plugin.
   */
  async addPlugin(definition) {
    const plugin = new Plugin(definition);

    await plugin.loadAndValidate();
    const pluginId = plugin.getId();

    Logger.debug(`Adding new plugin to CIX: ${pluginId}`);

    this.plugins[pluginId] = plugin;

    return {id: pluginId};
  }

  /**
   * @function module:engine.PluginService#getPluginList
   * @description Gets a list of plugin IDs that exist.
   * @returns {Array} List of pipeline ids.
   */
  getPluginList() {
    Logger.silly('Getting list of plugin IDs.');
    return Object.keys(this.plugins);
  }

  /**
   * @function module:engine.PluginService#getPlugin
   * @description Validates and loads a yaml.
   * @async
   * @param {object} pluginId - All parameters are sent in this object.
   * @returns {object} The validated/loaded YAML Pipeline.
   */
  getPlugin(pluginId) {
    if (_.isNil(pluginId)) {
      throw new PluginError('pluginId parameter(s) missing.', 400);
    }
    if (this.plugins[pluginId] === undefined) {
      throw new PluginError(`Plugin ${pluginId} does not exist.`, 404);
    }
    return this.plugins[pluginId];
  }
}

// make PluginService a singleton
const service = new PluginService();

Object.freeze(service);

export {service as default};
