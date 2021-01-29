/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {ExecutionError, ValidateError, _} from '../../common/index.js';
import log from 'winston';
import paths from 'deepdash/paths.js';

export default class PipelineImporter {
  constructor({path, rawPipeline, environment}) {
    this.path = _.emptyToNull(path);
    if (this.path != null) {
      this.path = environment.replace$$Values(this.path);
      if (this.path.includes('$$')) {
        throw new ValidateError(`Import path '${this.path}' is missing an environment variable for substitution.`);
      }
    }
    this.rawPipeline = rawPipeline;
    this.environment = environment;
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
        path: _.relativePath(this.path, this.environment, definition),
        environment: this.environment,
      });
      importPath = definition._yaml.path;
      await definition._yaml.loadFromFile();
    } catch (error) {
      log.debug(error);
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
    const
      importFullPath = _.isObject(request) ? _.getOnlyElement(_.keys(request)) : request;
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
      let definition = await _.fetch(this.path, this.environment);
      definition = await _.loadYamlOrJson(definition);
      definition = await this.loadImports(definition);
      definition = await this.expandImports(definition);
      this.definition = definition;
    } catch (error) {
      log.debug(`${error}`);
      throw new ExecutionError(`Failed loading YAML ${this.path}`);
    }
    return this.definition;
  }

  async loadFromMemory() {
    try {
      let definition = await this.loadImports(this.rawPipeline);
      definition = await this.expandImports(definition);
      this.definition = definition;
    } catch (error) {
      log.debug(`${error}`);
      throw new ExecutionError('Failed loading pipeline from memory');
    }
    return this.definition;
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
 *
 * @param {object} yaml - yaml to insert environment overrides
 * @param {object} environmentOverrides - object representing overrides
 *
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
