/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global jest, describe, test, expect, beforeEach  */
// eslint-disable-next-line no-unused-vars
import DockerContainer from './DockerContainer';
import DockerExec from './DockerExec';
// eslint-disable-next-line no-unused-vars
import dockerode from 'dockerode';

jest.mock('./DockerContainer');
jest.mock('dockerode');

const environmentMock = {'addEnvironmentVariable': () => {}};
const pipelineMock = {'getEnvironment': () => environmentMock, 'getShortId': () => 'abcd1234', 'getLogStream': () => {}};

describe('DockerExec init()', () => {
  const createNetworkResponse = {id: 'TEST'};

  let dockerExec; let dockerApi;

  beforeEach(() => {
    dockerExec = new DockerExec();
    jest.spyOn(dockerExec, 'installUtilities').mockImplementation(() => {});
    dockerApi = dockerExec.getDockerApi();
    dockerApi.createNetwork.mockReset();
    dockerApi.createVolume.mockReset();
  });

  test('cannot be called twice', () => {
    dockerExec.networkName = 'test';
    return dockerExec.init(pipelineMock).catch((err) => expect(err.message).toMatch('has already been created'));
  });

  test('calls createVolume twice', () => {
    dockerApi.createNetwork.mockResolvedValueOnce(createNetworkResponse);
    dockerApi.createVolume.mockResolvedValue();

    return dockerExec.init(pipelineMock).then(() => expect(dockerApi.createVolume.mock.calls.length).toBe(3));
  });

  test('calls createNetwork once', () => {
    dockerApi.createNetwork.mockResolvedValueOnce(createNetworkResponse);
    dockerApi.createVolume.mockResolvedValue();

    return dockerExec.init(pipelineMock).then(() => expect(dockerApi.createNetwork.mock.calls.length).toBe(1));
  });

  test('skips createVolume when createNetwork fails with appropriate error', () => {
    dockerApi.createNetwork.mockRejectedValueOnce();
    dockerApi.createVolume.mockResolvedValue();

    return dockerExec.init(pipelineMock).catch((err) => {
      expect(dockerApi.createVolume).not.toHaveBeenCalled();
      expect(err.message).toMatch(/Failed to create the network/);
      expect(err.message).not.toMatch(/Failed to create the volume/);
    });
  });

  test('fails when second createVolume fails with appropriate error', () => {
    dockerApi.createNetwork.mockResolvedValueOnce(createNetworkResponse);
    dockerApi.createVolume.mockResolvedValueOnce();
    dockerApi.createVolume.mockRejectedValueOnce();

    return dockerExec.init(pipelineMock).catch((err) => {
      expect(dockerApi.createVolume.mock.calls.length).toBe(2);
      expect(err.message).toMatch(/Failed to create the volume/);
      expect(err.message).not.toMatch(/Failed to create the network/);
    });
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

  test('picks latest CIX image to run', () => {
    dockerApi.createNetwork.mockResolvedValueOnce(createNetworkResponse);
    dockerApi.createVolume.mockResolvedValue();
    dockerApi.listImages.mockResolvedValue([
      {'Id': 1, 'Created': 1549302571, 'Labels': {'SCM_URL': 'https://github.com/salesforce/cix'}},
      {'Id': 2, 'Created': 1556580161, 'Labels': {'SCM_URL': 'https://github.com/salesforce/cix'}},
      {'Id': 3, 'Created': 1520482069, 'Labels': {'SCM_URL': 'https://github.com/salesforce/cix'}},
    ]);

    return dockerExec.getLatestCixImage().then((image) => expect(image.Id).toBe(2));
  });

  test('throws error when no CIX image found', () => {
    dockerApi.createNetwork.mockResolvedValueOnce(createNetworkResponse);
    dockerApi.createVolume.mockResolvedValue();
    dockerApi.listImages.mockResolvedValue([
      {'Id': 1, 'Created': 1549302571, 'Labels': {'SCM_URL': 'not-cix'}},
    ]);

    return dockerExec.getLatestCixImage().catch((err) => expect(err.message).toMatch(/Unable to locate CIX image/));
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

describe('DockerExec runStep()', () => {
  let dockerExec;

  beforeEach(() => {
    jest.resetAllMocks();
    dockerExec = new DockerExec();
  });

  test('cannot be called if uninitialized', async () => {
    await expect(dockerExec.runStep()).rejects.toThrow('DockerExec has not been initialized');
  });

  test('runStep creates and starts a container', async () => {
    dockerExec.networkName = 'test';
    dockerExec.containerLogger = {createServerOutputStream: jest.fn()};
    dockerExec.getEnvironment = () => [];
    dockerExec.getVolumes = () => [];

    expect(dockerExec.getTrackedContainers()).toHaveLength(0);

    const step = await dockerExec.runStep({name: 'test-step', image: 'image:test'});

    expect(DockerContainer.mock.instances[0].create).toHaveBeenCalled();
    expect(DockerContainer.mock.instances[0].start).toHaveBeenCalled();
    expect(dockerExec.getTrackedContainers()).toHaveLength(1);
    expect(dockerExec.containerLogger.createServerOutputStream.mock.calls).toHaveLength(2);
    expect(step).toHaveProperty('name', 'test-step');
    expect(step).toHaveProperty('Finished.StatusCode');
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
});

describe('DockerExec tearDown()', () => {
  let dockerExec; let dockerApi;

  beforeEach(() => {
    jest.resetAllMocks();
    dockerExec = new DockerExec();
    dockerApi = dockerExec.getDockerApi();
  });


  test('tearDown() stops and removes a container', async () => {
    const container1 = new DockerContainer();
    container1.stop = jest.fn().mockImplementation(() => container1);
    dockerExec.getNetworkName = jest.fn().mockResolvedValue('test');
    dockerExec.getTrackedContainers = jest.fn().mockImplementation(() => [container1]);

    expect(dockerExec.getTrackedContainers()).toHaveLength(1);
    await dockerExec.tearDown();
    expect(DockerContainer.mock.instances[0].stop).toHaveBeenCalled();
    expect(DockerContainer.mock.instances[0].remove).toHaveBeenCalled();
  });

  test('tearDown() removes a stopped container', async () => {
    const container1 = new DockerContainer();
    container1.stop = jest.fn().mockImplementation(() => {
      throw new Error('container already stopped');
    });
    dockerExec.getNetworkName = jest.fn().mockResolvedValue('test');
    dockerExec.getTrackedContainers = jest.fn().mockImplementation(() => [container1]);

    expect(dockerExec.getTrackedContainers()).toHaveLength(1);
    await dockerExec.tearDown();
    expect(DockerContainer.mock.instances[0].stop).toHaveBeenCalled();
    expect(DockerContainer.mock.instances[0].remove).toHaveBeenCalled();
  });

  test('tearDown() doesn\'t remove a non-existent container', async () => {
    const container1 = new DockerContainer();
    container1.stop = jest.fn().mockImplementation(() => {
      throw new Error('no such container');
    });
    dockerExec.getNetworkName = jest.fn().mockResolvedValue('test');
    dockerExec.getTrackedContainers = jest.fn().mockImplementation(() => [container1]);

    expect(dockerExec.getTrackedContainers()).toHaveLength(1);
    await dockerExec.tearDown();
    expect(DockerContainer.mock.instances[0].stop).toHaveBeenCalled();
    expect(DockerContainer.mock.instances[0].remove).not.toHaveBeenCalled();
  });

  test('tearDown() removes the network', async () => {
    dockerExec.getNetworkName = jest.fn().mockResolvedValue('test');
    const mockRemoveNetwork = jest.fn();
    dockerApi.getNetwork = jest.fn().mockImplementation(() => {
      return {
        remove: mockRemoveNetwork,
      };
    });

    await dockerExec.tearDown();
    expect(mockRemoveNetwork).toHaveBeenCalled();
  });

  test('tearDown() removes a volume', async () => {
    dockerExec.getVolumes = jest.fn().mockImplementation(() => [{name: 'test'}]);
    const mockRemoveVolume = jest.fn();
    dockerApi.getVolume = jest.fn().mockImplementation(() => {
      return {
        remove: mockRemoveVolume,
      };
    });

    await dockerExec.tearDown();
    expect(mockRemoveVolume).toHaveBeenCalled();
  });
});
