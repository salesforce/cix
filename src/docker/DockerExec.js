/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {DockerError, Logger, NodeProvider, _} from '../common/index.js';
import Docker from 'dockerode';
import DockerContainer from './DockerContainer.js';
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

    if (!_.isNil(_.emptyToNull(NodeProvider.getProcess().env.DOCKER_NETWORK))) {
      this.networkName = NodeProvider.getProcess().env.DOCKER_NETWORK;
      Logger.warn(`Using provided DOCKER_NETWORK=${this.networkName} override.`);
      this.networkProvided = true;
    } else {
      this.networkProvided = false;
    }

    this.containers = [];
  }

  /**
   * Return the default Docker pull-policy for the pipeline
   * @returns {string} the default pull-policy
   */
  getDefaultPullPolicy() {
    return this.pipeline.defaultPullPolicy;
  }

  /**
   * Return the Dockerode object.
   * @returns {object} Dockerode object
   */
  getDockerApi() {
    return this.dockerApi;
  }

  /**
   * Return the environment object.
   * @returns {object} environment object
   */
  getEnvironment() {
    return this.pipeline.getEnvironment();
  }

  /**
   * Return the Docker network name created upon initialization.
   * @returns {string} the network name
   */
  getNetworkName() {
    return this.networkName;
  }

  /**
   * Return the unique prefix assigned to this Exec.
   * @returns {string} the unique prefix string
   */
  getUniquePrefix() {
    return this.uniquePrefix;
  }

  /**
   * Return the Docker volumes to mount in each container.
   * @returns {Array} list of volume objects
   */
  getVolumes() {
    return this.volumes;
  }

  /**
   * Adds container to the list of tracked containers.
   * @param {object} container - DockerContainer object
   */
  trackContainer(container) {
    this.containers.push(container);
  }

  /**
   * Return the list of containers that have been created by this Exec.
   * @returns {Array} list of container objects
   */
  getTrackedContainers() {
    return this.containers;
  }

  /**
   * Is the docker network provided.
   * @returns {boolean} true if the network is provided
   */
  isNetworkProvided() {
    return this.networkProvided;
  }

  /**
   * Find the most recent CIX image on the host.
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
    Logger.debug('Installing utilities');
    const cixImageId = (await this.getLatestCixImage()).Id;
    const cixBinPath = _.find(this.getVolumes(), ['path', '/cix/bin']);
    const cixBinMount = cixBinPath.name + ':' + cixBinPath.path;

    const definition = {
      'name': 'cix-utils',
      'image': cixImageId,
      'commands': ['cp scripts/cix-bin/* /cix/bin'],
      'pull-policy': 'Never',
      'volumes': [cixBinMount],
    };

    const container = new DockerContainer(this.getDockerApi(), this.getUniquePrefix());
    await container.create(definition);
    this.trackContainer(container);
    // TODO: log output using PipelineLogger (need an Environment object, not from Pipeline)
    await container.start(null, NodeProvider.getProcess().stderr);
  }

  /**
   * Prepares Docker to run containers by creating the network, volumes, and any other dependencies.
   * @param {object} pipeline - Pipeline reference.
   */
  async init(pipeline) {
    this.pipeline = pipeline;

    this.uniquePrefix = `cix-${this.pipeline.getShortId()}`;

    if (!this.isNetworkProvided()) {
      try {
        this.networkName = this.uniquePrefix;

        await this.dockerApi.createNetwork({
          Name: this.networkName,
          Driver: 'bridge',
        });
      } catch (err) {
        throw new DockerError(`Failed to create the network ${this.networkName} (host might be out of address ranges - run 'docker system prune' to remove cruft): ${err}`);
      }
    }

    this.getEnvironment().addEnvironmentVariable({name: 'CIX_NETWORK_NAME', value: this.networkName, type: 'internal'});

    this.volumes = _.cloneDeep(DEFAULT_VOLUMES);

    _.map(this.volumes, (volume) => volume.name = `${this.uniquePrefix}-${volume.name}`);

    _.forEach(this.volumes, async (volume) => {
      try {
        await this.dockerApi.createVolume({
          Name: volume.name,
        });
        Logger.debug(`Successfully created volume ${volume.name}`);
      } catch (err) {
        throw new DockerError(`Failed to create the volume ${volume.name}: ${err}`);
      }
    });

    await this.installUtilities();
  }

  /**
   * Starts a container, and unless `step.background` is true waits for it to exit.
   * @param {object} step - the CIX step definition object
   * @returns {object} the original step object, updated with container exit status code if available
   */
  async runStep(step) {
    if (!this.isNetworkProvided() && _.isNil(this.getNetworkName())) {
      throw new DockerError('DockerExec network has not been initialized');
    }

    const container = new DockerContainer(
      this.dockerApi,
      this.uniquePrefix,
      this.getEnvironment(),
      this.getNetworkName(),
      this.getVolumes(),
      this.getDefaultPullPolicy(),
    );

    await container.create(step);
    this.trackContainer(container);

    const containerId = container.getId();
    const containerNames = {
      containerId: containerId,
      shortName: container.getShortName(),
      qualifiedName: container.getQualifiedName(),
    };

    const pipelineLogger = Logger.getPipelineLogger(this.pipeline?.getId());

    const statusCode = await container.start(
      pipelineLogger.createContainerOutputStream(containerNames),
      pipelineLogger.createContainerOutputStream(containerNames, true),
    );

    step.Finished = {
      StatusCode: statusCode,
    };

    return step;
  }

  /**
   * Execute a preprocessor container.
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
   * Stop and remove one step container.
   * @param {object} container - container to remove
   */
  async tearDownOneContainer(container) {
    let containerToRemove;

    Logger.debug(`Removing container ${container.getId()} (${container.getQualifiedName()})`);

    try {
      containerToRemove = await container.stop();
    } catch (err) {
      if (err.message && err.message.includes('container already stopped')) {
        containerToRemove = container;
      } else if (err.message && err.message.includes('no such container')) {
        // This isn't strictly necessary but we want to ignore the exception as no container needs to be removed.
        containerToRemove = null;
      } else {
        Logger.error(`Failed to stop container ${container.getQualifiedName()}:`);
        Logger.error(`    ${err}`);
      }
    }

    if (containerToRemove) {
      try {
        await containerToRemove.remove();
      } catch (err) {
        Logger.error(`Failed to remove container ${containerToRemove.getQualifiedName()}:`);
        Logger.error(`    ${err}`);
      }
    }
  }

  /**
   * Ensure all step containers are stopped and removed.
   */
  async tearDownContainers() {
    Logger.info('Ensuring all containers are stopped and removed');
    _.forEach(this.getTrackedContainers(), async (container) => await this.tearDownOneContainer(container));

    // Wait for background containers to stop. Should take a maximum of 15 seconds, the default stop() timeout.
    // If we don't wait, the network and volumes can't be removed. We don't know if there are actually background
    // containers in the pipeline...
    for (let i = 0; i < 15; i++) {
      const onlineContainers = await this.dockerApi.listContainers({filters: JSON.stringify({network: [this.getNetworkName()], status: ['running', 'removing']})});
      Logger.silly(`Online containers: ${JSON.stringify(onlineContainers)}`);
      if (_.isEmpty(onlineContainers)) {
        break;
      }
      Logger.debug(`Waiting for any stubborn containers to be stopped. ${15 - i} seconds to timeout.`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  /**
   * Remove the Docker network created for the pipeline.
   */
  async tearDownNetwork() {
    if (this.getNetworkName() != undefined && !this.isNetworkProvided()) {
      Logger.debug(`Removing network ${this.getNetworkName()}`);
      const network = this.dockerApi.getNetwork(this.getNetworkName());
      try {
        await network.remove(this.getNetworkName());
      } catch (err) {
        Logger.error(`Failed to remove network ${this.getNetworkName()}:`);
        Logger.error(`    ${err}`);
      }
    }
  }

  /**
   * Remove the utility volumes create for the pipeline.
   */
  async tearDownVolumes() {
    _.forEach(this.getVolumes(), async (volume) => {
      const dockerVolume = this.dockerApi.getVolume(volume.name);
      Logger.debug(`Removing volume ${volume.name}`);
      try {
        await dockerVolume.remove(volume.name);
      } catch (err) {
        Logger.error(`Failed to remove volume ${volume.name}:`);
        Logger.error(`    ${err}`);
      }
    });

    // Node isn't waiting for the remove()s. If we don't wait, they won't be removed.
    Logger.info('Waiting for volumes to be removed');
    await new Promise((r) => setTimeout(r, 3000));
  }

  /**
   * Cleans up the Docker containers and network used by the pipeline.
   */
  async tearDown() {
    if (_.isEmpty(this.getTrackedContainers())) {
      Logger.debug('No containers to stop');
    } else {
      await this.tearDownContainers();
    }

    await this.tearDownNetwork();
    await this.tearDownVolumes();

    Logger.debug('DockerExec teardown complete');
  }
}
