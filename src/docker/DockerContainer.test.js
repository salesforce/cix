/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global describe, test, expect, beforeEach */
import DockerContainer from './DockerContainer';
import Environment from '../engine/environment/Environment';
// eslint-disable-next-line no-unused-vars
import dockerode from 'dockerode';

jest.mock('dockerode');

describe('Step definition transformation', () => {
  let dockerApi; let dockerContainer; let environment;

  beforeEach(() => {
    jest.resetAllMocks();
    dockerApi = new dockerode();
    environment = new Environment();
    dockerContainer = new DockerContainer(dockerApi, 'testprefix', environment, 'testnetwork');
  });

  test('spec contains cmd when arguments passed', () => {
    const step = {
      name: 'test',
      image: 'image-name',
      arguments: ['a', 'b'],
    };
    dockerContainer.createContainerSpec = () => {
      return {};
    };
    dockerContainer.fromStep(step);
    expect(dockerContainer.containerSpec.Cmd).toEqual(['a', 'b']);
  });

  test('spec contains entrypoint script when commands passed', () => {
    const step = {
      name: 'test',
      image: 'image-name',
      commands: ['a', 'b', 'c'],
    };
    dockerContainer.createContainerSpec = () => {
      return {};
    };
    dockerContainer.fromStep(step);
    expect(dockerContainer.containerSpec.Entrypoint).toEqual('/usr/bin/cixrc');
  });

  test('cixrc script contains alternative shell when commands-shell passed', () => {
    const step = {
      'name': 'test',
      'image': 'image-name',
      'commands': ['commands-statement'],
      'commands-shell': '/bin/alt',
    };
    dockerContainer.createContainerSpec = () => {
      return {};
    };
    dockerContainer.fromStep(step);
    expect(dockerContainer.config.files[0].data.substring(0, 11)).toEqual('#!/bin/alt\n');
  });

  test('spec does not define entrypoint nor cmd when no commands or arguments are passed', () => {
    const step = {
      name: 'test',
      image: 'image-name',
    };
    dockerContainer.createContainerSpec = () => {
      return {};
    };
    dockerContainer.fromStep(step);
    expect(dockerContainer.containerSpec.Entrypoint).toBeUndefined();
    expect(dockerContainer.containerSpec.Cmd).toBeUndefined();
  });

  test('fromStep() transforms a basic step', () => {
    const step = {
      name: 'test',
      image: 'image-name',
      commands: ['echo hello world'],
    };
    dockerContainer.fromStep(step);
    expect(dockerContainer.containerSpec).toEqual({
      Entrypoint: '/usr/bin/cixrc',
      Env: [
        'CIX_CONTAINER_NAME=testnetwork-test',
        'CIX_STEP_NAME=test',
        'CIX_WORKDIR=/cix/src',
        'CIX_WORKSPACE=/cix/src',
        'CIX_TEMP=/cix/tmp',
      ],
      HostConfig: {
        Binds: [],
        NetworkMode: 'testnetwork',
      },
      Hostname: 'test',
      Image: 'image-name:latest',
      NetworkingConfig: {
        EndpointsConfig: {
          'testnetwork': {
            Aliases: [
              'test',
            ],
          },
        },
      },
      OpenStdin: false,
      Tty: false,
      name: 'testnetwork-test',
    });
    expect(dockerContainer.config).toEqual({
      background: false,
      files: [
        {
          data: '#!/bin/sh\n\nPATH=/cix/bin:$PATH\n' +
            'cix_timestamp_echo() {\n' +
            '  cix_prev_status=$?\n' +
            '  if [ -x \"$(command -v date 2>/dev/null)\" ]; then\n' +
            '    echo \"+ [$(TZ=GMT+8 date +\"%Y-%m-%dT%H:%M:%S%z\")] $*\"\n' +
            '  else\n' +
            '    echo \"+ $*\"\n' +
            '  fi\n' +
            '  return $cix_prev_status\n' +
            '}\n' +
            'cix_echo() {\n' +
            '  cix_prev_status=$?\n' +
            '  echo \"+ $*\"\n' +
            '  return $cix_prev_status\n' +
            '}\n' +
            'set -e\n\n' +
            'cix_timestamp_echo \'echo hello world\'\n' +
            'echo hello world\n',
          mode: 0o755,
          name: 'usr/bin/cixrc',
        },
      ],
      imageRepository: 'image-name',
      imageTag: 'latest',
      pullPolicy: 'Default',
      qualifiedName: 'testnetwork-test',
      shortName: 'test',
    });
  });

  test('fromStep() populates system and step environment variables', () => {
    dockerContainer.environment.addEnvironmentVariable({name: 'SYSVAR', value: 'SYSVALUE', type: 'internal'});
    const step = {
      name: 'test',
      image: 'image-name',
      environment: [{
        name: 'VAR',
        value: 'VALUE',
      }],
    };
    dockerContainer.fromStep(step);
    expect(dockerContainer.containerSpec.Env).toEqual([
      'CIX_CONTAINER_NAME=testnetwork-test',
      'CIX_STEP_NAME=test',
      'CIX_WORKDIR=/cix/src',
      'CIX_WORKSPACE=/cix/src',
      'CIX_TEMP=/cix/tmp',
      'SYSVAR=SYSVALUE',
      'VAR=VALUE',
    ]);
  });

  test('fromStep() configures \'old style\' registry parameters', () => {
    const step = {
      name: 'test',
      image: 'registry.domain/path/image:version',
      registry: {
        'registry.domain': {
          username: 'user',
          password: 'pass',
        },
      },
    };
    dockerContainer.fromStep(step);
    expect(dockerContainer.config.imageTag).toEqual('version');
    expect(dockerContainer.config.imageRepository).toEqual('registry.domain/path/image');
    expect(dockerContainer.config.authConfig).toEqual({
      username: 'user',
      password: 'pass',
    });
  });

  test('fromStep() configures new style registry parameters', () => {
    const step = {
      name: 'test',
      image: 'registry/path/image',
      registry: {
        'registry': {
          host: {
            name: 'registry.domain',
          },
          username: 'user',
          password: 'pass',
          retry: {
            backoff: 1,
            iterations: 3,
          },
        },
      },
    };
    dockerContainer.fromStep(step);
    expect(dockerContainer.config.imageTag).toEqual('latest');
    expect(dockerContainer.config.imageRepository).toEqual('registry.domain/path/image');
    expect(dockerContainer.config.authConfig).toEqual({
      username: 'user',
      password: 'pass',
    });
    expect(dockerContainer.config.pullRetryConfig).toEqual({
      backoff: 1,
      iterations: 3,
    });
  });

  test('fromStep() configures default registry parameters', () => {
    const step = {
      name: 'test',
      image: 'path/image',
    };
    dockerContainer.fromStep(step);
    expect(dockerContainer.config.imageTag).toEqual('latest');
    expect(dockerContainer.config.imageRepository).toEqual('path/image');
  });

  test('fromStep() will parse image names with sha256 digest', () => {
    const step = {
      name: 'test',
      image: 'path/image@sha256:1234',
    };
    dockerContainer.fromStep(step);
    expect(dockerContainer.containerSpec.Image).toEqual('path/image@sha256:1234');
  });


  test('fromStep() will parse image names with tag', () => {
    const step = {
      name: 'test',
      image: 'path/image:1234',
    };
    dockerContainer.fromStep(step);
    expect(dockerContainer.containerSpec.Image).toEqual('path/image:1234');
  });

  test('fromStep() will parse image names with tag and sha256 digest', () => {
    const step = {
      name: 'test',
      image: 'path/image:1234@sha256:1234',
    };
    dockerContainer.fromStep(step);
    expect(dockerContainer.containerSpec.Image).toEqual('path/image:1234@sha256:1234');
  });


  test('fromStep() will parse image names with no tag as latest', () => {
    const step = {
      name: 'test',
      image: 'path/image',
    };
    dockerContainer.fromStep(step);
    expect(dockerContainer.containerSpec.Image).toEqual('path/image:latest');
  });

  test('createContainerSpec() configures system and step volumes', () => {
    dockerContainer.volumes = [{name: 'stepvol', path: '/stepvol'}];
    const step = {
      volumes: ['/vol1:/mnt/vol1'],
    };
    const newSpec = dockerContainer.createContainerSpec(step);
    expect(newSpec.HostConfig.Binds).toEqual(['stepvol:/stepvol', '/vol1:/mnt/vol1']);
  });

  test('createContainerSpec() configures hostname and aliases', () => {
    const step = {
      name: 'step-name',
      hostname: 'step.domain',
    };
    const newSpec = dockerContainer.createContainerSpec(step);
    expect(newSpec.name).toEqual('testnetwork-step-name');
    expect(newSpec.Hostname).toEqual('step.domain');
    expect(newSpec.NetworkingConfig.EndpointsConfig['testnetwork']).toEqual({
      Aliases: ['step-name', 'step.domain'],
    });
  });

  test('createContainerSpec() sets WorkingDir', () => {
    const step = {
      'name': 'step-name',
      'working-dir': '/cix/src',
    };
    const newSpec = dockerContainer.createContainerSpec(step);
    expect(newSpec.WorkingDir).toEqual('/cix/src');
  });

  test('createContainerSpec() sets user when passed as string', () => {
    const step = {
      'name': 'step-name',
      'user': '123',
    };
    const newSpec = dockerContainer.createContainerSpec(step);
    expect(newSpec.User).toEqual('123');
  });

  test('createContainerSpec() sets user when passed as int', () => {
    const step = {
      'name': 'step-name',
      'user': 123,
    };
    const newSpec = dockerContainer.createContainerSpec(step);
    expect(newSpec.User).toEqual('123');
  });

  test('createContainerSpec() picks user from environment variable', () => {
    dockerContainer.environment.addEnvironmentVariable({name: 'ug-id', value: '123:456'});
    const step = {
      'name': 'step-name',
      'user': '$$ug-id',
    };
    const newSpec = dockerContainer.createContainerSpec(step);
    expect(newSpec.User).toEqual('123:456');
  });

  test('createContainerSpec() skips setting user if starts with $$', () => {
    const step = {
      'name': 'step-name',
      'user': '$$ug-id',
    };
    const newSpec = dockerContainer.createContainerSpec(step);
    expect(newSpec.User).toEqual(undefined);
  });

  test('createContainerSpec() user is undefined by default', () => {
    const step = {
      'name': 'step-name',
    };
    const newSpec = dockerContainer.createContainerSpec(step);
    expect(newSpec.User).toEqual(undefined);
  });

  test('createContainerSpec() user is undefined when user-id is empty', () => {
    const step = {
      'name': 'step-name',
      'user': '',
    };
    const newSpec = dockerContainer.createContainerSpec(step);
    expect(newSpec.User).toEqual(undefined);
  });

  test('createContainerSpec() sets Privileged mode', () => {
    const step = {
      name: 'step-name',
      privileged: true,
    };
    const newSpec = dockerContainer.createContainerSpec(step);
    expect(newSpec.HostConfig.Privileged).toEqual(true);
  });

  test('createContainerSpec() configures unattached container', () => {
    dockerContainer.networkName = undefined;
    const step = {
      name: 'step-name',
    };
    const newSpec = dockerContainer.createContainerSpec(step);
    expect(newSpec.name).toEqual('testprefix-step-name');
    expect(newSpec.Hostname).toEqual('step-name');
    expect(newSpec.NetworkingConfig.EndpointsConfig).toEqual({});
  });

  test('createContainerSpec() handles exposed ports', () => {
    // ports are defined as: [hostPort:]containerPort[/protocol]. Protocol will be ignored and removed
    // from the hostPort side if specified.
    const step = {
      ports: ['3455/udp', 8192, '8222:8222/tcp', '9000/udp:9000'],
    };
    const newSpec = dockerContainer.createContainerSpec(step);
    expect(newSpec.ExposedPorts['8192/tcp']).toEqual({});
    expect(newSpec.HostConfig.PortBindings['3455/udp']).toEqual([{HostPort: '3455'}]);
    expect(newSpec.HostConfig.PortBindings['8192/tcp']).toEqual([{HostPort: '8192'}]);
    expect(newSpec.HostConfig.PortBindings['8222/tcp']).toEqual([{HostPort: '8222'}]);
    expect(newSpec.HostConfig.PortBindings['9000/tcp']).toEqual([{HostPort: '9000'}]);
  });
});

describe('create()', () => {
  let dockerApi; let dockerContainer; let environment;

  beforeEach(() => {
    jest.resetAllMocks();
    dockerApi = new dockerode();
    environment = new Environment();
    dockerContainer = new DockerContainer(dockerApi, 'testprefix', environment, 'testnetwork');
    dockerContainer.fromStep = jest.fn();
    dockerContainer.pullImage = jest.fn();
  });

  test('create() calls Dockerode createContainer', async () => {
    await expect(dockerContainer.create({})).resolves.toBeUndefined();
    expect(dockerApi.createContainer).toHaveBeenCalled();
  });

  test('create() pulls image when tag is latest', async () => {
    dockerContainer.config.imageTag = 'latest';
    await expect(dockerContainer.create({})).resolves.toBeUndefined();
    expect(dockerApi.createContainer).toHaveBeenCalled();
    expect(dockerContainer.pullImage).toHaveBeenCalled();
  });

  test('create() pulls image when not present', async () => {
    dockerContainer.config.imageTag = 'version';
    dockerContainer.config.pullPolicy = 'Default';
    dockerApi.createContainer = jest.fn().mockImplementationOnce(() => {
      const e = new Error('Not found');
      e.statusCode = 404;
      throw e;
    });
    await expect(dockerContainer.create({})).resolves.toBeUndefined();
    expect(dockerApi.createContainer).toHaveBeenCalledTimes(2);
    expect(dockerContainer.pullImage).toHaveBeenCalledTimes(1);
  });

  test('create() throws when the image cannot be pulled', async () => {
    dockerContainer.config.imageTag = 'version';
    dockerContainer.config.pullPolicy = 'Default';
    dockerApi.createContainer = jest.fn().mockImplementationOnce(() => {
      const e = new Error('Error');
      e.statusCode = 500;
      throw e;
    });
    await expect(dockerContainer.create({})).rejects.toThrow();
    expect(dockerApi.createContainer).toHaveBeenCalledTimes(1);
    expect(dockerContainer.pullImage).not.toHaveBeenCalled();
  });

  test('create() does not pull image when policy is Never', async () => {
    dockerContainer.config.imageTag = 'latest';
    dockerContainer.config.pullPolicy = 'Never';
    dockerApi.createContainer = jest.fn().mockImplementation(() => {
      const e = new Error('Not found');
      e.statusCode = 404;
      throw e;
    });
    await expect(dockerContainer.create({})).rejects.toThrow('image is not present');
    expect(dockerApi.createContainer).toHaveBeenCalled();
    expect(dockerContainer.pullImage).not.toHaveBeenCalled();
  });
});

describe('Basic container operations (start, stop, remove)', () => {
  let dockerApi; let dockerContainer; let environment; let mockContainer;

  beforeEach(() => {
    jest.resetAllMocks();
    dockerApi = new dockerode();
    environment = new Environment();
    mockContainer = {
      id: 'abcd0123456ef789',
      attach: jest.fn(),
      remove: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      wait: jest.fn().mockResolvedValue({StatusCode: 0}),
    };
    dockerContainer = new DockerContainer(dockerApi, 'testprefix', environment, 'testnetwork');
    dockerContainer.container = mockContainer;
  });

  test('start() calls Dockerode start, attach, and wait, and returns the status', async () => {
    await expect(dockerContainer.start()).resolves.toEqual(0);
    expect(mockContainer.start).toHaveBeenCalled();
    expect(mockContainer.attach).toHaveBeenCalled();
    expect(mockContainer.wait).toHaveBeenCalled();
  });

  test('start() with background calls Dockerode start and attach, but does not wait nor return a value', async () => {
    dockerContainer.config.background = true;
    await expect(dockerContainer.start()).resolves.toBeUndefined();
    expect(mockContainer.start).toHaveBeenCalled();
    expect(mockContainer.attach).toHaveBeenCalled();
    expect(mockContainer.wait).not.toHaveBeenCalled();
  });

  test('start() throws when the container fails', async () => {
    mockContainer.wait = jest.fn().mockResolvedValue({StatusCode: 1});
    await expect(dockerContainer.start()).rejects.toThrow('failed with non-zero exit status');
  });

  test('stop() calls Dockerode stop', async () => {
    await expect(dockerContainer.stop()).resolves.toEqual(dockerContainer);
    expect(mockContainer.stop).toHaveBeenCalled();
  });

  test('remove() calls Dockerode remove', async () => {
    await expect(dockerContainer.remove()).resolves.toEqual(dockerContainer);
    expect(mockContainer.remove).toHaveBeenCalled();
  });
});

describe('Pulling Images', () => {
  let dockerApi; let dockerContainer; let environment;

  beforeEach(() => {
    jest.resetAllMocks();
    dockerApi = new dockerode();
    environment = new Environment();
    dockerContainer = new DockerContainer(dockerApi, 'testprefix', environment, 'testnetwork');
  });

  test('pullImage() calls pullImageFromRegistry', async () => {
    dockerContainer.config = {
      authConfig: {
        username: 'user',
        password: 'pass',
      },
      imageRepository: 'test',
      imageTag: 'latest',
    };
    dockerContainer.pullImageFromRegistry = jest.fn();

    expect(await dockerContainer.pullImage()).toBeUndefined();
    expect(dockerContainer.pullImageFromRegistry).toHaveBeenCalledWith({
      authconfig: {
        password: 'pass',
        username: 'user',
      },
      fromImage: 'test',
      tag: 'latest',
    });
  });

  test('pullImage() with retry calls pullRetryDecorator', async () => {
    dockerContainer.config = {
      imageRepository: 'test',
      imageTag: 'latest',
      pullRetryConfig: {
        backoff: 1,
        iterations: 2,
      },
    };
    dockerContainer.pullImageFromRegistry = jest.fn();
    dockerContainer.pullRetryDecorator = jest.fn();

    expect(await dockerContainer.pullImage()).toBeUndefined();
    expect(dockerContainer.pullImageFromRegistry).not.toHaveBeenCalled();
    expect(dockerContainer.pullRetryDecorator).toHaveBeenCalledWith({
      fromImage: 'test',
      tag: 'latest',
    });
  });

  test.skip('pullRetryDecorator()', async () => {
    const imagePullSpec = {
      'fromImage': 'does-not-exist',
      'tag': 'latest',
    };

    dockerContainer.config = {
      'authConfig': {
        'username': 'test',
        'password': 'test-pass',
      },
      'pullRetryConfig': {
        'backoff': 0,
        'iterations': 3,
      },
    };

    let count = 0;
    dockerContainer.pullImageFromRegistry = jest.fn().mockImplementation((imagePullSpec) => {
      count++;

      expect(imagePullSpec.authconfig.username).toBe('test');
      expect(imagePullSpec.authconfig.password).toBe('test-pass');

      // dockerode currently strips credentials from imagePullSpec during a request
      imagePullSpec.authconfig = undefined;

      if (count === 3) {
        return;
      } else {
        const e = new Error();
        e.statusCode = 500;
        throw e;
      }
    });

    await dockerContainer.pullRetryDecorator(imagePullSpec);
    expect(dockerContainer.pullImageFromRegistry).toHaveBeenCalledTimes(3);
  });
});

describe('Copying files to the container', () => {
  let dockerApi; let dockerContainer; let environment;

  beforeEach(() => {
    jest.resetAllMocks();
    dockerApi = new dockerode();
    environment = new Environment();
    dockerContainer = new DockerContainer(dockerApi, 'testprefix', environment, 'testnetwork');
  });

  test.skip('putFiles() doesn\'t really test anything', () => {
    const files = {
      name: 'testfile',
      mode: 0o644,
      data: 'test data',
    };
    dockerContainer.container = {
      putArchive: jest.fn(),
    };

    expect(dockerContainer.putFiles(files)).resolves.toEqual(dockerContainer.container);
    // expect(dockerContainer.container.putArchive).toHaveBeenCalled();
    // OK we're not really testing anything here...
  });

  describe('createScript', () => {
    test('should support the echo commands-output', () => {
      const result = DockerContainer.createScript('test-echo', ['ls', 'pwd'], 'echo');
      const expectedResult = {
        data: '#!/bin/sh\n\nPATH=/cix/bin:$PATH\n' +
          'cix_timestamp_echo() {\n' +
          '  cix_prev_status=$?\n' +
          '  if [ -x \"$(command -v date 2>/dev/null)\" ]; then\n' +
          '    echo \"+ [$(TZ=GMT+8 date +\"%Y-%m-%dT%H:%M:%S%z\")] $*\"\n' +
          '  else\n' +
          '    echo \"+ $*\"\n' +
          '  fi\n' +
          '  return $cix_prev_status\n' +
          '}\n' +
          'cix_echo() {\n' +
          '  cix_prev_status=$?\n' +
          '  echo \"+ $*\"\n' +
          '  return $cix_prev_status\n' +
          '}\n' +
          'set -e\n\n' +
          'cix_echo \'ls\'\n' +
          'ls\n\n' +
          'cix_echo \'pwd\'\n' +
          'pwd\n',
        mode: 0o755,
        name: 'usr/bin/cixrc',
      };
      expect(result).toEqual(expectedResult);
    });

    test('should support the minimal commands-output', () => {
      const result = DockerContainer.createScript('test-minimal', ['ls', 'pwd'], 'minimal');
      const expectedResult = {
        data: '#!/bin/sh\n\nPATH=/cix/bin:$PATH\n' +
          'cix_timestamp_echo() {\n' +
          '  cix_prev_status=$?\n' +
          '  if [ -x \"$(command -v date 2>/dev/null)\" ]; then\n' +
          '    echo \"+ [$(TZ=GMT+8 date +\"%Y-%m-%dT%H:%M:%S%z\")] $*\"\n' +
          '  else\n' +
          '    echo \"+ $*\"\n' +
          '  fi\n' +
          '  return $cix_prev_status\n' +
          '}\n' +
          'cix_echo() {\n' +
          '  cix_prev_status=$?\n' +
          '  echo \"+ $*\"\n' +
          '  return $cix_prev_status\n' +
          '}\n' +
          'set -e\n\n' +
          'ls\n\n' +
          'pwd\n',
        mode: 0o755,
        name: 'usr/bin/cixrc',
      };
      expect(result).toEqual(expectedResult);
    });

    test('should support the timestamp commands-output', () => {
      const result = DockerContainer.createScript('test-timestamp', ['ls', 'pwd'], 'timestamp');
      const expectedResult = {
        data: '#!/bin/sh\n\nPATH=/cix/bin:$PATH\n' +
          'cix_timestamp_echo() {\n' +
          '  cix_prev_status=$?\n' +
          '  if [ -x \"$(command -v date 2>/dev/null)\" ]; then\n' +
          '    echo \"+ [$(TZ=GMT+8 date +\"%Y-%m-%dT%H:%M:%S%z\")] $*\"\n' +
          '  else\n' +
          '    echo \"+ $*\"\n' +
          '  fi\n' +
          '  return $cix_prev_status\n' +
          '}\n' +
          'cix_echo() {\n' +
          '  cix_prev_status=$?\n' +
          '  echo \"+ $*\"\n' +
          '  return $cix_prev_status\n' +
          '}\n' +
          'set -e\n\n' +
          'cix_timestamp_echo \'ls\'\n' +
          'ls\n\n' +
          'cix_timestamp_echo \'pwd\'\n' +
          'pwd\n',
        mode: 0o755,
        name: 'usr/bin/cixrc',
      };
      expect(result).toEqual(expectedResult);
    });

    test('should default to the timestamp commands-output', () => {
      const result = DockerContainer.createScript('test-default', ['ls', 'pwd']);
      const expectedResult = {
        data: '#!/bin/sh\n\nPATH=/cix/bin:$PATH\n' +
          'cix_timestamp_echo() {\n' +
          '  cix_prev_status=$?\n' +
          '  if [ -x \"$(command -v date 2>/dev/null)\" ]; then\n' +
          '    echo \"+ [$(TZ=GMT+8 date +\"%Y-%m-%dT%H:%M:%S%z\")] $*\"\n' +
          '  else\n' +
          '    echo \"+ $*\"\n' +
          '  fi\n' +
          '  return $cix_prev_status\n' +
          '}\n' +
          'cix_echo() {\n' +
          '  cix_prev_status=$?\n' +
          '  echo \"+ $*\"\n' +
          '  return $cix_prev_status\n' +
          '}\n' +
          'set -e\n\n' +
          'cix_timestamp_echo \'ls\'\n' +
          'ls\n\n' +
          'cix_timestamp_echo \'pwd\'\n' +
          'pwd\n',
        mode: 0o755,
        name: 'usr/bin/cixrc',
      };
      expect(result).toEqual(expectedResult);
    });
  });
});
