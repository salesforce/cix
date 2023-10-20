/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {ExecutionError, Logger, ValidateError, _} from '../../common/index.js';
import paths from 'deepdash/paths';

export default class PipelineImporter {
  constructor({path, rawPipeline, pipeline, httpAuthToken}) {
    this.path = _.emptyToNull(path);
    this.rawPipeline = rawPipeline;
    this.pipeline = pipeline;
    if (this.path != null) {
      this.path = this.pipeline.getEnvironment().replace$$Values(this.path);
      if (this.path.includes('$$')) {
        throw new ValidateError(`Import path '${this.path}' is missing an environment variable for substitution.`);
      }
    }
    this.httpAuthToken = httpAuthToken;
    this.definition = {};
    this.errors = [];
  }

  isEmpty() {
    return _.isNil(this.path);
  }

  async loadImport(definition) {
    let importPath;
    try {
      definition._yaml = new PipelineImporter({
        path: _.relativePath(this.path, this.pipeline.getEnvironment(), definition),
        pipeline: this.pipeline,
        httpAuthToken: definition['http_authorization_token'] || // for backwards compatibility
                       definition['http-authorization-token'] ||
                       this.httpAuthToken,
      });
      importPath = definition._yaml.path;
      await definition._yaml.loadFromFile();
    } catch (error) {
      Logger.debug(error, this.pipeline.getId());
      throw new ExecutionError(`Failed importing ${importPath}`);
    }
  }

  async loadImports(yaml) {
    const imports = _.values(yaml.imports || {});
    for (let i = 0; i < imports.length; i++) {
      await this.loadImport(imports[i]);
    }
    return yaml;
  }

  expandImportRequest(yaml, request) {
    const importFullPath = _.isObject(request) ? _.getOnlyElement(_.keys(request)) : request;
    const [importPath, importSubPath] = _.split(importFullPath, '.');
    const environmentOverrides = _.isObject(request) ? _.getOnlyElement(_.values(request)).environment : {};

    return yaml.imports[importPath]._yaml.getSteps({
      path: importSubPath,
      environmentOverrides,
    });
  }

  expandImports(yaml) {
    const yamlPaths = paths(_.omit(yaml, 'imports'), {leavesOnly: false});

    _.map(yamlPaths, (path) => {
      if (_.endsWith(path, '.import')) {
        const
          setPath = _.join(_.dropRight(_.split(path, '.')), '.');
        const importRequest = _.get(yaml, path);
        const pipeline = [];

        _.check(_.isArray(importRequest), `Expecting import ${path} to be an array.`);
        _.map(importRequest, (request) => {
          pipeline.push(this.expandImportRequest(yaml, request));
        });

        _.set(yaml, setPath, {
          steps: {
            name: '',
            pipeline,
          },
        });
      }
    });

    _.map(yaml.imports, (v) => {
      delete v._yaml;
    });

    return yaml;
  }

  async load() {
    if (!_.isNil(this.path)) {
      return await this.loadFromFile();
    } else if (!_.isNil(this.rawPipeline)) {
      return await this.loadFromMemory();
    } else {
      throw new ExecutionError('No pipeline defined to import from.');
    }
  }

  async loadFromFile() {
    try {
      let definition = await _.fetch(this.path, this.pipeline.getEnvironment(), this.httpAuthToken);
      if (!_.isEmpty(this.pipeline.getPlugins())) {
        Logger.debug(`Plugins installed, running all preprocessors on ${this.path}.`, this.pipeline.getId());
        definition = await this.runPreprocessor(definition);
      }
      definition = await _.loadYamlOrJson(definition);
      definition = await this.loadImports(definition);
      definition = await this.expandImports(definition);
      this.definition = definition;
    } catch (error) {
      Logger.error(`${error}`, this.pipeline.getId());
      throw new ExecutionError(`Failed loading YAML ${this.path}`);
    }
    return this.definition;
  }

  async loadFromMemory() {
    if (!_.isEmpty(this.pipeline.getPlugins())) {
      Logger.warn('Skipping preprocessor because of raw JSON input.', this.pipeline.getId());
    }
    try {
      let definition = await this.loadImports(this.rawPipeline);
      definition = await this.expandImports(definition);
      this.definition = definition;
    } catch (error) {
      Logger.debug(`${error}`, this.pipeline.getId());
      throw new ExecutionError('Failed loading pipeline from memory', this.pipeline.getId());
    }
    return this.definition;
  }

  async runPreprocessor(definition) {
    for (const plugin of this.pipeline.getPlugins()) {
      Logger.silly(`Pipeline definition before preprocessor ${plugin.getId()}:\n${definition}`, this.pipeline.getId());
      definition = await plugin.runPreprocessor(this.pipeline.getExec(), definition);
      Logger.silly(`Pipeline definition after preprocessor ${plugin.getId()}:\n${definition}`, this.pipeline.getId());
    }
    return definition;
  }

  getSteps({path, environmentOverrides}) {
    return {
      steps: applyEnvironmentOverrides(
        _.cloneDeep(_.get(this.definition, _.join(_.filter([path, 'steps']), '.'))),
        environmentOverrides,
      ),
    };
  }
}

/**
 * @function module:engine.PipelineImporter#applyEnvironmentOverrides
 * @param {object} yaml - yaml to insert environment overrides
 * @param {object} environmentOverrides - object representing overrides
 * @returns {object} yaml object with all overrides in place
 */
function applyEnvironmentOverrides(yaml, environmentOverrides) {
  const overrides = _.keyBy(environmentOverrides, 'name');

  _.each(paths(yaml, {leavesOnly: false}), (path) => {
    const environment = _.get(yaml, `${path}.environment`);

    if (environment) {
      _.set(
        yaml,
        `${path}.environment`,
        _.values(
          _.assign({},
            _.keyBy(environment, 'name'),
            overrides,
          ),
        ),
      );
    }
  });

  return yaml;
}
