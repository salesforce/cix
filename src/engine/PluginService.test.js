/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global jest, describe, expect */
import {PluginError, _} from '../common/index.js';
import PluginService from './PluginService.js';

jest.autoMockOff();

describe('PluginService tests', () => {
  test('PluginService can add and list pipelines', async () => {
    jest.spyOn(_, 'fetch').mockResolvedValue('version: 2.4\nkind: Plugin');
    await PluginService.addPlugin({pluginPath: '/blah'});
    await PluginService.addPlugin({pluginPath: '/blah'});
    expect(PluginService.getPluginList().length).toEqual(2);
  });

  test('Adding pipeline generates ID', async () => {
    jest.spyOn(_, 'fetch').mockResolvedValue('version: 2.4\nkind: Plugin');
    const resp = await PluginService.addPlugin({pluginPath: '/blah'});
    expect(PluginService.getPlugin(resp.id).getId()).toEqual(resp.id);
  });

  test('getPlugin called without a pluginId throws error', async () => {
    expect(() => PluginService.getPlugin(null)).toThrow(PluginError);
  });

  test('getPlugin that does not exist throws error', async () => {
    expect(() => PluginService.getPlugin('123')).toThrow(PluginError);
  });
});
