/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {DockerError, _} from '../common/index.js';
import DockerUtil from 'dockerode/lib/util.js';
import log from 'winston';
import stream from 'stream';
import tar from 'tar-stream';
import util from 'util';


/**
 * Creates the shell script used to run multiple commands in the container.
 *
 * @param {Array} commands - list of commands the script shall run
 * @param {string} shell - path to the interpreter with which to run the script (default: /bin/sh)
 * @returns {object} the tar-stream 'pack' data for the generated file
 */
function createScript(commands, shell = '/bin/sh') {
  let cmd; let escapedCmd;
  const scriptText = [];

  scriptText.push('#!' + shell + '\n');

  if (shell.split('/').reverse()[0] === 'sh' || shell.split('/').reverse()[0] === 'bash') {
    scriptText.push('PATH=/cix/bin:$PATH');
    scriptText.push('cix_echo() {');
    scriptText.push('  cix_prev_status=$?');
    scriptText.push('  if [ -x "$(command -v date 2>/dev/null)" ]; then');
    scriptText.push('    echo "+ [$(TZ=GMT+8 date +"%Y-%m-%dT%H:%M:%S%z")] $*"');
    scriptText.push('  else');
    scriptText.push('    echo "+ $*"');
    scriptText.push('  fi');
    scriptText.push('  return $cix_prev_status');
    scriptText.push('}');
    scriptText.push('set -e\n');

    for (cmd of commands) {
      escapedCmd = cmd.replace(/'/g, '\'\\\'\'');
      escapedCmd = '\'' + escapedCmd + '\'';
      scriptText.push(`cix_echo ${escapedCmd}`);
      scriptText.push(cmd + '\n');
    }
  } else {
    for (cmd of commands) {
      scriptText.push(cmd + '\n');
    }
  }

  return {
    name: 'usr/bin/cixrc',
    data: scriptText.join('\n'),
    mode: 0o755,
  };
}

/**
 * Packs up files into a buffer representing a tar archive, for copying to a container using the putArchive API.
 *
 * @param {Array} files - array of file objects
 * @returns {Promise} a promise which resolves to a Buffer containing the tar data
 */
async function prepareFilesForPut(files) {
  const pack = tar.pack();

  _.forEach(files, (file) => pack.entry({name: file.name, mode: file.mode}, file.data));

  return new Promise((resolve, reject) => {
    const chunks = [];

    pack.on('error', reject);
    pack.on('data', (chunk) => chunks.push(chunk));
    pack.on('end', () => resolve(Buffer.concat(chunks)));
    pack.finalize();
  });
}

export default class DockerContainer {
  /**
   * Initializes a DockerContainer object.
   *
   * @param {object} dockerApi - Dockerode API object
   * @param {string} uniquePrefix - a unique prefix to use for container name
   * @param {object} [environment] - Environment object
   * @param {string} [networkName] - network name to attach the container to
   * @param {Array} [additionalVolumes] - list of volume objects (name, path) to attach to the container
   */
  constructor(dockerApi, uniquePrefix, environment, networkName, additionalVolumes) {
    this.config = {};

    this.dockerApi = dockerApi;
    this.uniquePrefix = uniquePrefix;

    this.environment = environment ? environment : null;
    this.networkName = networkName ? networkName : null;
    this.volumes = additionalVolumes ? additionalVolumes : [];

    this.inputString = null;
    this.outputStream = null;
    this.errorStream = null;
  }

  /**
   *
   * Produces a Docker API container specification object from a CIX Step definition object.
   *
   * @param {object} definition - the CIX step definition structure
   * @returns {object} an object representing the Docker API container structure
   */
  createContainerSpec(definition) {
    let containerSpec = {};

    containerSpec.HostConfig = {};

    if (this.networkName) {
      containerSpec.HostConfig.NetworkMode = this.networkName;
    }

    if (!_.isEmpty(this.volumes)) {
      containerSpec.HostConfig.Binds = _.map(this.volumes, (volume) => volume.name + ':' + volume.path);
    } else {
      containerSpec.HostConfig.Binds = [];
    }

    if (!_.isNil(definition.volumes)) {
      containerSpec.HostConfig.Binds = containerSpec.HostConfig.Binds.concat(definition.volumes);
    }

    if (!_.isNil(definition['working-dir'])) {
      containerSpec.WorkingDir = definition['working-dir'];
    }

    if (!_.isNil(definition.privileged)) {
      containerSpec.Privileged = true;
    }

    // The container receives a fully-qualified name (network name + step name) so that it's unique on the Docker host.
    if (this.networkName) {
      containerSpec.name = `${this.networkName}-${definition.name}`;
    } else {
      containerSpec.name = `${this.uniquePrefix}-${definition.name}`;
    }

    const aliases = [definition.name];

    // The hostname internally (among containers on this pipeline's network) is the step name or provided hostname.
    if (!_.isNil(definition.hostname)) {
      containerSpec.Hostname = definition.hostname;
      aliases.push(definition.hostname);
    } else {
      containerSpec.Hostname = definition.name;
    }

    containerSpec.NetworkingConfig = {
      EndpointsConfig: {},
    };
    if (this.networkName) {
      containerSpec.NetworkingConfig.EndpointsConfig[this.networkName] = {
        Aliases: aliases,
      };
    }

    if (!_.isNil(definition.ports)) {
      let containerPortSpec; let hostPort; let portSpec;

      containerSpec.ExposedPorts = {};
      containerSpec.HostConfig.PortBindings = {};

      for (portSpec of definition.ports) {
        portSpec = portSpec.toString();

        if (portSpec.includes(':')) {
          [hostPort, containerPortSpec] = portSpec.split(':');
        } else {
          hostPort = containerPortSpec = portSpec;
        }

        if (containerPortSpec.indexOf('/') === -1) {
          containerPortSpec += '/tcp';
        }

        // Ensure host port does not specify the protocol.
        if (hostPort.includes('/')) {
          hostPort = hostPort.split('/')[0];
        }

        // Ensure the port is exposed by the container.
        containerSpec.ExposedPorts[containerPortSpec] = {};

        // Create the port mapping between Host and Container ports.
        containerSpec.HostConfig.PortBindings[containerPortSpec] = [{
          HostPort: hostPort,
        }];
      }
    }

    // Configure expected container I/O behavior.
    containerSpec = Object.assign({
      Tty: false,
      OpenStdin: false,
    }, containerSpec);

    if (definition.attachStdin) {
      containerSpec.OpenStdin = true;
      containerSpec.StdinOnce = true; // https://github.com/apocas/dockerode/issues/455#issuecomment-489436370
    }

    return containerSpec;
  }

  /**
   * Produces objects representing the Docker API container and associated configuration from a CIX step definition.
   *
   * @param {object} definition - the CIX step (container) definition structure
   */
  fromStep(definition) {
    this.containerSpec = this.createContainerSpec(definition);

    if (!_.isNil(definition.commands)) {
      if (definition['commands-shell']) {
        this.config.files = [createScript(definition.commands, definition['commands-shell'])];
      } else {
        this.config.files = [createScript(definition.commands)];
      }

      this.containerSpec.Entrypoint = '/usr/bin/cixrc';
    } else if (!_.isNil(definition.arguments)) {
      this.containerSpec.Cmd = definition.arguments;
    }

    // Populate standard and instance environment variables.
    this.containerSpec.Env = [
      `CIX_CONTAINER_NAME=${this.containerSpec.name}`,
      `CIX_STEP_NAME=${definition.name}`,
    ];

    if (!_.isNull(this.environment)) {
      _.forEach(this.environment.listEnvironmentVariables('internal'), (internalVariableName) => {
        const internalVariable = this.environment.getEnvironmentVariable(internalVariableName);
        this.containerSpec.Env.push(`${internalVariable.name}=${internalVariable.value}`);
      });
    }

    // Push step-defined environment variables.
    if (!_.isNil(definition.environment)) {
      for (const e of definition.environment) {
        this.containerSpec.Env.push(e['name'] + '=' + e['value']);
      }
    }

    /*
     * Populate all the special non-Docker fields that are used to convey configuration and metadata.
     */

    if (definition['pull-policy']) {
      log.debug('Pull-policy for this image is ' + definition['pull-policy']);
      this.config.pullPolicy = definition['pull-policy'];
    } else {
      this.config.pullPolicy = 'Default';
    }

    // Parse the image name for registry information, expand if aliased, and populate auth credentials.
    const imageParts = DockerUtil.parseRepositoryTag(definition.image);

    this.config.imageRepository = imageParts.repository;

    if (imageParts.tag) {
      this.config.imageTag = imageParts.tag;
    } else {
      this.config.imageTag = 'latest';
    }

    if (definition.registry && this.config.imageRepository.includes('/')) {
      const imageRegistry = this.config.imageRepository.split('/', 1)[0];

      if (imageRegistry && definition.registry[imageRegistry]) {
        if (imageRegistry.includes('.')) {
          log.debug(`Registry ${imageRegistry} is a literal host name`);
        } else if (definition.registry[imageRegistry].host && definition.registry[imageRegistry].host.name) {
          log.debug(`Registry ${imageRegistry} is an alias for ${definition.registry[imageRegistry].host.name}`);

          this.config.imageRepository = this.config.imageRepository.replace(imageRegistry, definition.registry[imageRegistry].host.name);
        }

        if (definition.registry[imageRegistry].username && definition.registry[imageRegistry].password) {
          if (definition.registry[imageRegistry].username.startsWith('$$')) {
            log.warn('Username not set, logging in anonymously...');
          } else {
            this.config.authConfig = {
              username: definition.registry[imageRegistry].username,
              password: definition.registry[imageRegistry].password,
            };
          }
        }

        if (definition.registry[imageRegistry].retry) {
          this.config.pullRetryConfig = definition.registry[imageRegistry].retry;
        }
      }
    }

    this.containerSpec.Image = this.config.imageRepository + ':' + this.config.imageTag;

    this.config.shortName = definition.name;
    this.config.qualifiedName = this.containerSpec.name;

    this.config.continueOnFail = Boolean(definition['continue-on-fail']);
    this.config.background = Boolean(definition.background);
  }

  /**
   * Return a shortened version of a Docker container ID.
   *
   * @returns {string} the short container ID (12 hex digits)
   */
  getId() {
    return this.container.id.substring(0, 12);
  }

  /**
   * Return the container's short, friendly name, which is the CIX step name.
   *
   * @returns {string} the container's short name
   */
  getShortName() {
    return this.config.shortName;
  }

  /**
   * Return the Docker engine's name for the container (network name '-' short name).
   *
   * @returns {string} the container name qualified with unique network name
   */
  getQualifiedName() {
    return this.config.qualifiedName;
  }

  /**
   * Transfer files into a container.
   *
   * @param {Array} files files to put in container
   * @returns {Promise} a promise which resolves to a Dockerode container object
   */
  async putFiles(files) {
    const buffer = await prepareFilesForPut(files);
    await this.container.putArchive(buffer, {path: '/'});
    return this.container;
  }

  async pullRetryDecorator(imagePullSpec) {
    let backoff = this.config.pullRetryConfig.backoff;
    let iterations = this.config.pullRetryConfig.iterations;

    if (iterations < 1) {
      iterations = 1;
    }

    if (backoff < 1) {
      backoff = 0;
    }

    for (let i = 0; i < iterations; i++) {
      try {
        await this.pullImageFromRegistry(imagePullSpec);
        break;
      } catch (err) {
        if (err.statusCode && err.statusCode === 500) {
          // Registry server errors (timeout, bad auth, etc) will be retried.
          if (i + 1 < iterations) {
            log.warn(`DockerPullImage: received error communicating with registry, retrying (attempt ${i + 1}/${iterations})`);
            await new Promise((resolve) => setTimeout(resolve, backoff * 1000));
          }
        } else {
          throw new DockerError(err);
        }
      }
    }
  }

  async pullImageFromRegistry(imagePullSpec) {
    const imageStream = await this.dockerApi.createImage(imagePullSpec);
    const output = await util.promisify(this.dockerApi.modem.followProgress)(imageStream);
    log.debug(`DockerPullFromRegistry '${this.getQualifiedName()}': ${output[output.length - 1].status}`);
  }

  /**
   * Pulls the container's image from a Docker registry.
   */
  async pullImage() {
    try {
      const imagePullSpec = {};

      if (this.config.authConfig) {
        imagePullSpec.authconfig = {
          username: this.config.authConfig.username,
          password: this.config.authConfig.password,
        };

        log.debug(`DockerPullImage '${this.getQualifiedName()}': using authentication (username ${imagePullSpec.authconfig.username})`);
      }

      imagePullSpec.fromImage = this.config.imageRepository;
      imagePullSpec.tag = this.config.imageTag;

      log.debug(`DockerPullImage '${this.getQualifiedName()}': pulling image ${imagePullSpec.fromImage}:${imagePullSpec.tag}`);

      if (this.config.pullRetryConfig) {
        await this.pullRetryDecorator(imagePullSpec);
      } else {
        // Unqualified images will be pulled from Docker Hub, without retries.
        await this.pullImageFromRegistry(imagePullSpec);
      }
    } catch (err) {
      throw new DockerError(`DockerPullImage '${this.getQualifiedName()}': failed to pull image ${this.config.imageRepository}:${this.config.imageTag}: \n\t${err}`);
    }
  }

  /**
   * Create container from this object.
   *
   * @param {object} definition - the step container definition.
   * @param {string} [input] - string data which will be provided to the container on its stdin.
   */
  async create(definition, input) {
    let container;

    definition.attachStdin = false;

    if (input) {
      this.inputString = input;
      definition.attachStdin = true;
    }

    this.fromStep(definition);

    try {
      log.debug(`Creating ${this.getShortName()} (docker container ${this.getQualifiedName()})`);

      if (this.config.imageTag === 'latest' &&
          this.config.pullPolicy !== 'IfNotPresent' &&
          this.config.pullPolicy !== 'Never' ||
          this.config.pullPolicy === 'Always') {
        try {
          await this.pullImage();
        } catch (err) {
          if (this.config.pullPolicy === 'Always') {
            throw err;
          }
          log.warn('Failed to update image tagged \'latest\', image may be out of date');
        }
      }

      container = await this.dockerApi.createContainer(this.containerSpec);
    } catch (err) {
      if (err.statusCode && err.statusCode === 404) {
        // Docker Engine reports image is not found locally, attempt to pull it from a registry (unless policy is Never).
        if (this.config.pullPolicy === 'Never') {
          throw new DockerError(`DockerCreate: could not create container '${this.getQualifiedName()}', image is not present and the pull policy is 'Never': \n\t${err}`);
        }

        try {
          await this.pullImage();
          container = await this.dockerApi.createContainer(this.containerSpec);
        } catch (errNested) {
          throw new DockerError(`DockerCreate: could not create container '${this.getQualifiedName()}': \n\t${errNested}`);
        }
      } else {
        throw new DockerError(err);
      }
    }

    this.container = container;

    if (this.config.files) {
      await this.putFiles(this.config.files);
    }
  }

  /**
   * Start the container.
   *
   * @param {object} [outputStream] - stream to which the container will print standard output.
   * @param {object} [errorStream] - stream to which the container will print error output.
   * @returns {number} the container's exit status
   */
  async start(outputStream, errorStream) {
    log.debug(`Starting ${this.getShortName()} (docker container ${this.getQualifiedName()})`);

    if (outputStream) {
      this.outputStream = outputStream;
    } else {
      this.outputStream = new stream.Writable();
      this.outputStream._write = (_chunk, _encoding, next) => setImmediate(next);
    }

    if (errorStream) {
      this.errorStream = errorStream;
    } else {
      this.errorStream = new stream.Writable();
      this.errorStream._write = (_chunk, _encoding, next) => setImmediate(next);
    }

    const container = await this.container.start();

    const attachStdin = Boolean(this.inputString);

    // In the case of a background container, this async function will continue to stream the container's output even after start() returns.
    container.attach({
      stdin: attachStdin,
      hijack: attachStdin,
      stdout: true,
      stderr: true,
      logs: true,
      stream: true,
    }, (err, muxedStream) => {
      if (err) {
        throw new DockerError(`Container '${this.getQualifiedName()}' attach failed: \n\t${err}`);
      }

      if (attachStdin) {
        // Submit input to the container's stdin and close the (input side of the Duplex) stream to indicate EOF.
        muxedStream.end(this.inputString);
      }

      this.dockerApi.modem.demuxStream(muxedStream, this.outputStream, this.errorStream);
    });

    if (this.config.background) {
      log.debug(`Background container '${this.getQualifiedName()}' (${this.getId()}) started`);
      return;
    }

    let waitResult;

    try {
      log.debug(`Waiting for container ${this.getQualifiedName()} (${this.getId()})`);
      waitResult = await container.wait();
    } catch (e) {
      log.debug(`Exception while waiting for container ${this.getQualifiedName()}: \n\t${e}`);
    }

    try {
      await this.remove();
    } catch (e) {
      log.debug(`Exception while removing container ${this.getQualifiedName()}`);
    }

    if (waitResult && waitResult.StatusCode) {
      if (this.config.continueOnFail) {
        log.debug(`Container '${this.getQualifiedName()}' exited with non-zero status ${waitResult.StatusCode} (ignored)`);
      } else {
        throw new DockerError(`Container '${this.getQualifiedName()}' failed with non-zero exit status ${waitResult.StatusCode}`);
      }
    } else {
      log.debug(`Container '${this.getQualifiedName()}' exited cleanly`);
    }

    return waitResult.StatusCode;
  }

  /**
   * Stop the container.
   *
   * @param {object} options - Dockerode stop API options, e.g. t: timeout before killing the container
   * @returns {object} this DockerContainer object, which allows chaining
   */
  async stop(options) {
    await this.container.stop(options);
    return this;
  }

  /**
   * Remove the container.
   *
   * @returns {object} this DockerContainer object, which allows chaining
   */
  async remove() {
    await this.container.remove();
    return this;
  }
}
