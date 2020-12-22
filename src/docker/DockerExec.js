/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {ContainerLogger, DockerError, NodeProvider, _} from '../common/index.js';
import Docker from 'dockerode';
import DockerContainer from './DockerContainer.js';
import log from 'winston';
import stream from 'stream';
import url from 'url';
import util from 'util';

const DEFAULT_VOLUMES = [{name: 'bin', path: '/cix/bin'}, {name: 'libexec', path: '/cix/libexec'}, {name: 'tmp', path: '/cix/tmp'}];

export default class DockerExec {
  constructor() {
    const options = {Promise: Promise};

    if (!_.isNil(_.emptyToNull(NodeProvider.getProcess().env.DOCKER_HOST))) {
      const dockerHostURL = url.parse(NodeProvider.getProcess().env.DOCKER_HOST);

      options.host = dockerHostURL.hostname;
      options.port = dockerHostURL.port;
    }

    this.dockerApi = new Docker(options);

    this.containers = [];
  }

  /**
   * Return the ContainerLogger to use.
   *
   * @returns {object} the docker logger for this execution
   */
  getContainerLogger() {
    return this.containerLogger;
  }

  /**
   * Return the Dockerode object.
   *
   * @returns {object} Dockerode object
   */
  getDockerApi() {
    return this.dockerApi;
  }

  /**
   * Return the environment object.
   *
   * @returns {object} environment object
   */
  getEnvironment() {
    return this.pipeline.getEnvironment();
  }

  /**
   * Return the Docker network name created upon initialization.
   *
   * @returns {string} the network name
   */
  getNetworkName() {
    return this.networkName;
  }

  /**
   * Return the unique prefix assigned to this Exec.
   *
   * @returns {string} the unique prefix string
   */
  getUniquePrefix() {
    return this.uniquePrefix;
  }

  /**
   * Return the Docker volumes to mount in each container.
   *
   * @returns {Array} list of volume objects
   */
  getVolumes() {
    return this.volumes;
  }

  /**
   * Adds container to the list of tracked containers.
   *
   * @param {object} container - DockerContainer object
   */
  trackContainer(container) {
    this.containers.push(container);
  }

  /**
   * Return the list of containers that have been created by this Exec.
   *
   * @returns {Array} list of container objects
   */
  getTrackedContainers() {
    return this.containers;
  }

  /**
   * Find the most recent CIX image on the host.
   *
   * @returns {string} latest CIX Image on the host
   */
  async getLatestCixImage() {
    const images = await this.dockerApi.listImages();
    const latestCixImage = _.findLast(_.sortBy(images, 'Created'), {'Labels': {'SCM_URL': 'https://github.com/salesforce/cix'}});

    if (_.isNil(latestCixImage)) {
      throw new DockerError('Unable to locate CIX image');
    }

    return latestCixImage;
  }

  /**
   * Copy CIX-furnished utility commands into the cix-bin volume.
   */
  async installUtilities() {
    log.debug('Installing utilities');
    const cixImageId = (await this.getLatestCixImage()).Id;
    const cixBinPath = _.find(this.getVolumes(), ['path', '/cix/bin']);
    const cixBinMount = cixBinPath.name + ':' + cixBinPath.path;

    const definition = {
      name: 'cix-utils',
      image: cixImageId,
      commands: ['cp scripts/cix-bin/* /cix/bin'],
      volumes: [cixBinMount],
    };

    const container = new DockerContainer(this.getDockerApi(), this.getUniquePrefix());
    await container.create(definition);
    this.trackContainer(container);
    // TODO: log output using ContainerLogger (need an Environment object, not from Pipeline)
    await container.start(null, NodeProvider.getProcess().stderr);
  }

  /**
   * Prepares Docker to run containers by creating the network, volumes, and any other dependencies.
   *
   * @param {object} pipeline - Pipeline reference.
   */
  async init(pipeline) {
    this.pipeline = pipeline;

    if (!_.isNil(this.getNetworkName())) {
      throw new DockerError(`Network ${this.getNetworkName()} has already been created`);
    }

    this.uniquePrefix = `cix-${this.pipeline.getShortId()}`;

    try {
      this.networkName = this.uniquePrefix;

      this.getEnvironment().addEnvironmentVariable({name: 'CIX_NETWORK_NAME', value: this.networkName, type: 'internal'});

      await this.dockerApi.createNetwork({
        Name: this.networkName,
        Driver: 'bridge',
      });
    } catch (err) {
      throw new DockerError(`Failed to create the network ${this.networkName} (host might be out of address ranges - run 'docker system prune' to remove cruft):\n\t${err}`);
    }

    this.volumes = _.cloneDeep(DEFAULT_VOLUMES);

    _.map(this.volumes, (volume) => volume.name = `${this.uniquePrefix}-${volume.name}`);

    _.each(this.volumes, async (volume) => {
      try {
        await this.dockerApi.createVolume({
          Name: volume.name,
        });
        log.debug(`Successfully created volume ${volume.name}`);
      } catch (err) {
        throw new DockerError(`Failed to create the volume ${volume.name}:\n\t${err}`);
      }
    });

    this.containerLogger = new ContainerLogger();

    await this.installUtilities();
  }

  /**
   * Starts a container, and unless `step.background` is true waits for it to exit.
   *
   * @param {object} step - the CIX step definition object
   * @returns {object} the original step object, updated with container exit status code if available
   */
  async runStep(step) {
    if (_.isNil(this.getNetworkName())) {
      throw new DockerError('DockerExec has not been initialized');
    }

    const container = new DockerContainer(this.dockerApi, this.uniquePrefix, this.getEnvironment(), this.getNetworkName(), this.getVolumes());
    await container.create(step);
    this.trackContainer(container);

    const containerId = container.getId();
    const containerNames = {
      containerId: containerId,
      shortName: container.getShortName(),
      qualifiedName: container.getQualifiedName(),
    };

    const statusCode = await container.start(
      this.getContainerLogger().createServerOutputStream(this.pipeline, containerNames),
      this.getContainerLogger().createServerOutputStream(this.pipeline, containerNames, true),
    );

    step.Finished = {
      StatusCode: statusCode,
    };

    return step;
  }

  /**
   * Execute a preprocessor container.
   *
   * @param {string} image - name of the preprocessor image
   * @param {string} data - string data to pass to the container on stdin
   * @returns {string} transformed data
   */
  async runPreprocessor(image, data) {
    // TODO: get last part of 'image' name and use that as the step name (e.g.: `cix-preprocessor-${imagename}`).
    const definition = {
      'name': 'cix-prepro',
      'image': image,
      'pull-policy': 'IfNotPresent',
      'continue-on-fail': true,
    };

    const container = new DockerContainer(this.dockerApi, `cix-${_.randomString(8)}`);

    const chunks = [];
    let containerOutput = '';

    // Create a stream to capture the container's stdout/stderr
    const outputStream = new stream.Writable();
    outputStream._write = (chunk, _encoding, next) => {
      chunks.push(chunk);
      next();
    };
    outputStream._final = (finalizer) => {
      containerOutput = Buffer.concat(chunks).toString('utf8');
      finalizer();
    };

    await container.create(definition, data);
    this.trackContainer(container);

    const statusCode = await container.start(outputStream, outputStream);

    // Ensure stream is closed and writing is finished.
    outputStream.end();
    const finished = util.promisify(stream.finished);
    await finished(outputStream);

    return {status: statusCode, output: containerOutput};
  }

  /**
   * Cleans up the Docker containers and network used by the pipeline.
   */
  async tearDown() {
    if (_.isEmpty(this.getTrackedContainers())) {
      log.debug('No containers to stop');
    } else {
      log.debug('Ensuring all containers are stopped and removed');

      await _.each(this.getTrackedContainers(), async (container) => {
        let containerToRemove;

        log.debug(`Removing container ${container.getId()}`);

        try {
          containerToRemove = await container.stop();
        } catch (err) {
          if (err.message && err.message.includes('container already stopped')) {
            containerToRemove = container;
          } else if (err.message && err.message.includes('no such container')) {
            // This isn't strictly necessary but we want to ignore the exception as no container needs to be removed.
            containerToRemove = null;
          } else {
            log.error(`Failed to stop container ${container.getId()}: \n\t${err}\n`);
          }
        }

        if (containerToRemove) {
          try {
            await containerToRemove.remove();
          } catch (err) {
            log.error(`Failed to remove container ${containerToRemove.getId()}: \n\t${err}\n`);
          }
        }
      });
    }

    if (this.getNetworkName() != undefined) {
      log.debug(`Removing network ${this.getNetworkName()}`);

      const network = this.dockerApi.getNetwork(this.getNetworkName());
      try {
        await network.remove(this.getNetworkName());
      } catch (err) {
        log.error(`Failed to remove network ${this.getNetworkName()}: \n\t${err}\n`);
      }
    }

    await _.each(this.getVolumes(), async (volume) => {
      const dockerVolume = this.dockerApi.getVolume(volume.name);

      log.debug(`Removing volume ${volume.name}`);

      try {
        await dockerVolume.remove(volume.name);
      } catch (err) {
        log.error(`Failed to remove volume ${volume.name}: \n\t${err}\n`);
      }
    });

    log.debug('DockerExec teardown complete');
  }
}
