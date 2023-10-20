/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global jest, describe, test, expect, beforeEach  */
import DockerContainer from './DockerContainer';
import DockerExec from './DockerExec';
import {NodeProvider} from '../common/index.js';
// eslint-disable-next-line no-unused-vars
import dockerode from 'dockerode';
// eslint-disable-next-line no-unused-vars
import stream from 'stream';

jest.mock('./DockerContainer');
jest.mock('dockerode');

const environmentMock = {'addEnvironmentVariable': () => {}};
const pipelineMock = {'getEnvironment': () => environmentMock, 'getShortId': () => 'abcd1234', 'getLogStream': () => {}};

describe('DockerExec runStep()', () => {
  let dockerExec;

  beforeEach(() => {
    jest.clearAllMocks();
    dockerExec = new DockerExec();
  });

  test('cannot be called if uninitialized', async () => {
    await expect(dockerExec.runStep()).rejects.toThrow('DockerExec network has not been initialized');
  });

  test('runStep creates and starts a container', async () => {
    dockerExec.networkName = 'test';
    dockerExec.getEnvironment = () => [];
    dockerExec.getVolumes = () => [];
    dockerExec.getDefaultPullPolicy = () => 'Default';

    expect(dockerExec.getTrackedContainers()).toHaveLength(0);

    const step = await dockerExec.runStep({name: 'test-step', image: 'image:test'});

    expect(DockerContainer.mock.instances[0].create).toHaveBeenCalled();
    expect(DockerContainer.mock.instances[0].start).toHaveBeenCalled();
    expect(dockerExec.getTrackedContainers()).toHaveLength(1);
    expect(step).toHaveProperty('name', 'test-step');
    expect(step).toHaveProperty('Finished.StatusCode');
  });
});

describe('DockerExec init()', () => {
  const createNetworkResponse = {id: 'TEST'};

  let dockerExec; let dockerApi;

  beforeEach(() => {
    process.exit = jest.fn(); // ensure tests never exit
    dockerExec = new DockerExec();
    jest.spyOn(dockerExec, 'installUtilities').mockImplementation(() => {});
    dockerApi = dockerExec.getDockerApi();
    dockerApi.createNetwork.mockReset();
    dockerApi.createVolume.mockReset();
  });

  test('cannot be called twice', async () => {
    dockerExec.networkName = 'test';
    await dockerExec.init(pipelineMock).catch((err) => expect(err.message).toMatch('has already been created'));
  });

  test('calls createVolume twice', async () => {
    dockerApi.createNetwork.mockResolvedValueOnce(createNetworkResponse);
    dockerApi.createVolume.mockResolvedValue();

    await dockerExec.init(pipelineMock).then(() => expect(dockerApi.createVolume.mock.calls.length).toBe(3));
  });

  test('calls createNetwork once', async () => {
    dockerApi.createNetwork.mockResolvedValueOnce(createNetworkResponse);
    dockerApi.createVolume.mockResolvedValue();

    await dockerExec.init(pipelineMock).then(() => expect(dockerApi.createNetwork.mock.calls.length).toBe(1));
  });

  test('skips createVolume when createNetwork fails with appropriate error', async () => {
    dockerApi.createNetwork.mockRejectedValueOnce();
    dockerApi.createVolume.mockResolvedValue();

    await dockerExec.init(pipelineMock).catch((err) => {
      expect(dockerApi.createVolume).not.toHaveBeenCalled();
      expect(err.message).toMatch(/Failed to create the network/);
      expect(err.message).not.toMatch(/Failed to create the volume/);
    });
  });


  test('will skip network creation if one is provided', async () => {
    const spy = jest.spyOn(NodeProvider, 'getProcess').mockImplementation(() => {
      return {
        env: {DOCKER_NETWORK: 'host'},
      };
    });
    dockerExec = new DockerExec();
    spy.mockRestore();
    jest.spyOn(dockerExec, 'installUtilities').mockImplementation(() => {});

    dockerApi = dockerExec.getDockerApi();

    await dockerExec.init(pipelineMock).then(() => expect(dockerApi.createNetwork.mock.calls.length).toBe(0));
  });
});

describe('DockerExec installUtilities()', () => {
  const createNetworkResponse = {id: 'TEST'};

  let dockerExec; let dockerApi;

  beforeEach(() => {
    jest.resetAllMocks();
    dockerExec = new DockerExec();
    dockerApi = dockerExec.getDockerApi();
  });

  test('picks latest CIX image to run', async () => {
    dockerApi.createNetwork.mockResolvedValueOnce(createNetworkResponse);
    dockerApi.createVolume.mockResolvedValue();
    dockerApi.listImages.mockResolvedValue([
      {'Id': 1, 'Created': 1549302571, 'Labels': {'SCM_URL': 'https://github.com/salesforce/cix'}},
      {'Id': 2, 'Created': 1556580161, 'Labels': {'SCM_URL': 'https://github.com/salesforce/cix'}},
      {'Id': 3, 'Created': 1520482069, 'Labels': {'SCM_URL': 'https://github.com/salesforce/cix'}},
    ]);

    await dockerExec.getLatestCixImage().then((image) => expect(image.Id).toBe(2));
  });

  test('throws error when no CIX image found', async () => {
    dockerApi.createNetwork.mockResolvedValueOnce(createNetworkResponse);
    dockerApi.createVolume.mockResolvedValue();
    dockerApi.listImages.mockResolvedValue([
      {'Id': 1, 'Created': 1549302571, 'Labels': {'SCM_URL': 'not-cix'}},
    ]);

    await dockerExec.getLatestCixImage().catch((err) => expect(err.message).toMatch(/Unable to locate CIX image/));
  });

  test('installUtilities creates and starts a container', async () => {
    dockerExec.getLatestCixImage = async () => {
      return {Id: 'test:latest'};
    };
    dockerExec.getVolumes = () => {
      return [{'name': 'bin', 'path': '/cix/bin'}];
    };

    expect(dockerExec.getTrackedContainers()).toHaveLength(0);
    await dockerExec.installUtilities();
    expect(DockerContainer.mock.instances[0].create).toHaveBeenCalled();
    expect(DockerContainer.mock.instances[0].start).toHaveBeenCalled();
    expect(dockerExec.getTrackedContainers()).toHaveLength(1);
  });
});

describe('DockerExec runPreprocessor()', () => {
  let dockerExec;

  beforeEach(() => {
    jest.resetAllMocks();
    dockerExec = new DockerExec();
  });

  test('runPreprocessor creates and starts a container', async () => {
    dockerExec.networkName = 'test';

    expect(dockerExec.getTrackedContainers()).toHaveLength(0);
    await dockerExec.runPreprocessor('image:test', 'test data');
    expect(DockerContainer.mock.instances[0].create).toHaveBeenCalled();
    expect(DockerContainer.mock.instances[0].start).toHaveBeenCalled();
    expect(dockerExec.getTrackedContainers()).toHaveLength(1);
  });

  test('runPreprocessor returns status returned by DockerContainer.start', async () => {
    dockerExec.networkName = 'test';
    const container = new DockerContainer();
    container.start = jest.fn().mockImplementation(() => 1);
    DockerContainer.mockImplementation(() => container);

    expect(dockerExec.getTrackedContainers()).toHaveLength(0);
    const result = await dockerExec.runPreprocessor('image:test', 'test data');
    expect(DockerContainer.mock.instances[0].create).toHaveBeenCalled();
    expect(DockerContainer.mock.instances[0].start).toHaveBeenCalled();
    expect(dockerExec.getTrackedContainers()).toHaveLength(1);
    expect(result.status).toBe(1);
  });

  // TODO the stream stuff within both runPreprocessor() and runStep() needs to be tested properly
});

describe('DockerExec tearDown()', () => {
  let dockerExec; let dockerApi;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    dockerExec = new DockerExec();
    dockerApi = dockerExec.getDockerApi();
  });

  test('tearDownContainers() stops and removes a container', async () => {
    const container1 = new DockerContainer();
    container1.stop = jest.fn().mockImplementation(() => container1);
    dockerExec.getTrackedContainers = jest.fn().mockImplementation(() => [container1]);

    dockerExec.tearDownContainers();
    jest.advanceTimersByTime(15000);
    await Promise.resolve();
    expect(DockerContainer.mock.instances[0].stop).toHaveBeenCalled();
    expect(DockerContainer.mock.instances[0].remove).toHaveBeenCalled();
  });

  test('tearDownContainers() removes a stopped container', async () => {
    const container1 = new DockerContainer();
    container1.stop = jest.fn().mockImplementation(() => {
      throw new Error('container already stopped');
    });
    dockerExec.getTrackedContainers = jest.fn().mockImplementation(() => [container1]);

    dockerExec.tearDownContainers();
    jest.advanceTimersByTime(15000);
    await Promise.resolve();
    expect(DockerContainer.mock.instances[0].stop).toHaveBeenCalled();
    expect(DockerContainer.mock.instances[0].remove).toHaveBeenCalled();
  });

  test('tearDownContainers() doesn\'t remove a non-existent container', async () => {
    const container1 = new DockerContainer();
    container1.stop = jest.fn().mockImplementation(() => {
      throw new Error('no such container');
    });
    dockerExec.getTrackedContainers = jest.fn().mockImplementation(() => [container1]);

    dockerExec.tearDownContainers();
    jest.advanceTimersByTime(15000);
    await Promise.resolve();
    expect(DockerContainer.mock.instances[0].stop).toHaveBeenCalled();
    expect(DockerContainer.mock.instances[0].remove).not.toHaveBeenCalled();
  });

  test('tearDownNetwork() removes the network', async () => {
    dockerExec.getNetworkName = jest.fn().mockResolvedValue('test');
    const mockRemoveNetwork = jest.fn();
    dockerApi.getNetwork = jest.fn().mockImplementation(() => {
      return {
        remove: mockRemoveNetwork,
      };
    });

    await dockerExec.tearDownNetwork();
    expect(mockRemoveNetwork).toHaveBeenCalled();
  });

  test('tearDownNetwork() skips teardown if DOCKER_HOSTNAME is set', async () => {
    const spy = jest.spyOn(NodeProvider, 'getProcess').mockImplementation(() => {
      return {
        env: {DOCKER_NETWORK: 'host'},
      };
    });
    dockerExec = new DockerExec();
    spy.mockRestore();

    const mockRemoveNetwork = jest.fn();
    dockerApi.getNetwork = jest.fn().mockImplementation(() => {
      return {
        remove: mockRemoveNetwork,
      };
    });

    await dockerExec.tearDownNetwork();
    expect(mockRemoveNetwork).not.toHaveBeenCalled();
  });

  test('tearDownVolumes() removes a volume', async () => {
    dockerExec.getVolumes = jest.fn().mockImplementation(() => [{name: 'test'}]);
    const mockRemoveVolume = jest.fn();
    dockerApi.getVolume = jest.fn().mockImplementation(() => {
      return {
        remove: mockRemoveVolume,
      };
    });

    dockerExec.tearDownVolumes();
    jest.advanceTimersByTime(3000);
    await Promise.resolve();
    expect(mockRemoveVolume).toHaveBeenCalled();
  });
});
