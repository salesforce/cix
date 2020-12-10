/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {ExecutionError, _} from '../../common/index.js';

export default class Environment {
  #environmentMap = {};
  #secretsRegex = undefined;
  #secretsMask = _.pad('', 8, '*');
  constructor(environmentList) {
    if (environmentList) {
      _.forEach(environmentList, (envVar) => {
        this.addEnvironmentVariable(envVar);
      });
    }
  }

  addEnvironmentVariable(environmentVar) {
    if (_.isNil(environmentVar) || _.isNil(environmentVar.name) || _.isNil(environmentVar.value)) {
      throw new ExecutionError('Need to provide name and value for an environment or secret object.');
    }

    if (_.isNil(environmentVar.type)) {
      environmentVar.type = 'environment';
    } else if (environmentVar.type === 'secret' && !_.isEmpty(_.trim(environmentVar.value))) {
      this._updateSecretsRegex(environmentVar.value);
    }

    this.#environmentMap[environmentVar.name] = _.clone(environmentVar);
  }

  getEnvironmentVariable(name) {
    return _.clone(this.#environmentMap[name]);
  }

  listEnvironmentVariables(type) {
    if (_.isNil(type)) {
      return _.keys(this.#environmentMap);
    } else {
      return _.keys(_.omitBy(this.#environmentMap, (environmentVar) => environmentVar.type !== type));
    }
  }

  replace$$Values(input) {
    if (_.isNil(input)) {
      return '';
    }

    let output = String(input);

    _.forEach(this.#environmentMap, (envVar, key) => {
      const regex = new RegExp('\\$\\$' + key + '(?!\\w)', 'g');

      output = output.replace(regex, envVar.value);
    });

    return output;
  }

  _updateSecretsRegex(newSecret) {
    const secrets = [newSecret];

    _.forEach(this.#environmentMap, (envVar) => {
      if (envVar.type === 'secret' && !_.isEmpty(envVar.value.trim())) {
        secrets.push(envVar.value);
      }
    });

    this.#secretsRegex = new RegExp(`(${_.join(_.map(secrets, _.escapeRegExp), '|')})`, 'g');
  }

  redactSecrets(input) {
    if (_.isNil(input)) {
      return '';
    }

    if (_.isNil(this.#secretsRegex)) {
      return input;
    }

    return _.replace(input, this.#secretsRegex, this.#secretsMask);
  }
}
