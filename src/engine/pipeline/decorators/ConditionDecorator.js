/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {Provider, _} from '../../../common/index.js';
import Step from '../Step.js';
import YAML from 'js-yaml';
import log from 'winston';

export default (payload, pipelineNode, promiseProvider) => {
  const environment = pipelineNode.getEnvironment();
  if (!_.isNil(payload.when)) {
    _.check(_.isArray(payload.when), `On Step ${payload.name} 'when' has to be an array.`);
    log.debug(`Checking 'when' conditions for ${payload.name}.`);
    const condition = new StepCondition(payload, environment);

    condition.evaluate();
    if (!condition.isValid()) {
      log.debug(`Skipping ${payload.name} with ${condition.getNumFailedConditions()} failed conditions.`);
      if (pipelineNode.getType() === 'Step' || pipelineNode.getType() === 'Steps') {
        pipelineNode.setStatus(Step.STATUS.skipped); // Steps will set all descendants
      }
      return Provider.fromObject(Promise.resolve());
    }
  }

  return promiseProvider;
};

/**
 * @function module:engine.ConditionDecorator#replace$$Values
 *
 * @param {object} obj - an object containing the key/value pairs to be replaced
 * @param {string} key - key of the obj containing values to be replaced
 * @param {object} environment - an object representing the passed environment
 * @param {string} defaultKey - default value for a given key
 *
 * @returns {object} new object, contained replaced values
 */
function replace$$(obj, key, environment, defaultKey) {
  let replaced = environment.replace$$Values(obj[key]);

  if (_.includes(obj[key], '$$') && _.isEqual(obj[key], replaced)) {
    replaced = obj[defaultKey || key + '-default'];
  }

  if (_.isUndefined(replaced)) {
    replaced = null;
  }

  return _.toString(replaced);
}

/**
 * @function module:engine.ConditionDecorator#defaultExpansion
 *
 * @param {object} condition - an object representing a conditional
 * @param {object} environment - an object representing the passed environment
 *
 * @returns {object} an object representing the conditional
 */
function defaultExpansion(condition, environment) {
  return {
    operator: condition.operator,
    value: replace$$(condition, 'value', environment),
    other: replace$$(condition, 'other', environment),
  };
}

/**
 * @function module:engine.ConditionDecorator#createSimpleEvaluator
 *
 * @param {object} func - a function representing the evaluator
 *
 * @returns {object} an object representing the simple evaluator
 */
function createSimpleEvaluator(func) {
  return {
    expand: defaultExpansion,
    isValid: (condition) => {
      return func(condition.value, condition.other);
    },
  };
}

/**
 * @function module:engine.ConditionDecorator#isSet
 *
 * @param {object} value - an object to be checked
 *
 * @returns {boolean} a bool representing whether value is set
 */
function isSet(value) {
  return !_.isNil(_.emptyToNull(value));
}

const EXISTS = {
  expand: (condition, environment) => {
    return {
      operator: condition.operator,
      value: replace$$(condition, 'value', environment),
      values: _.map(condition.values, (obj) => {
        return replace$$(obj, 'value', environment, 'default');
      }),
    };
  },

  isValid: (condition) => {
    return _.includes(condition.values, condition.value);
  },
};

const NOT_EXISTS = {
  expand: EXISTS.expand,
  isValid: _.negate(EXISTS.isValid),
};

const OREvaluator = {
  expand: (condition, environment) => {
    return {
      operator: condition.operator,
      conditions: _.map(condition.conditions, (subCondition) => {
        const evaluator = EVALUATORS[subCondition.operator];

        if (!_.isNil(evaluator)) {
          return evaluator.expand(subCondition, environment);
        } else {
          return subCondition;
        }
      }),
    };
  },

  isValid: (condition) => {
    if (_.isEmpty(condition.conditions)) {
      return false;
    }

    let passed = false;

    _.map(condition.conditions, (subCondition) => {
      const evaluator = EVALUATORS[subCondition.operator];

      if (!_.isNil(evaluator) && evaluator.isValid(subCondition)) {
        passed = true;
      }
    });

    return passed;
  },
};

const EVALUATORS = {
  EQ: createSimpleEvaluator(_.isEqual),
  NEQ: createSimpleEvaluator(_.negate(_.isEqual)),
  IS_SET: createSimpleEvaluator(isSet),
  IS_NOT_SET: createSimpleEvaluator(_.negate(isSet)),
  GTE: createSimpleEvaluator(_.gte),
  GT: createSimpleEvaluator(_.gt),
  LTE: createSimpleEvaluator(_.lte),
  LT: createSimpleEvaluator(_.lt),
  INCLUDES: createSimpleEvaluator(_.includes),
  NOT_INCLUDES: createSimpleEvaluator(_.negate(_.includes)),
  STARTS_WITH: createSimpleEvaluator(_.startsWith),
  ENDS_WITH: createSimpleEvaluator(_.endsWith),
  EXISTS,
  NOT_EXISTS,
  OR: OREvaluator,
};

export class StepCondition {
  constructor(step, environment) {
    this.step = step;
    this.environment = environment;
    this.numFailedConditions = -1;
  }

  isValidCondition(condition) {
    if (_.isNil(condition.operator)) {
      log.error(`Step ${this.step.name} has condition with no operator.`);
      return false;
    }

    const evaluator = EVALUATORS[condition.operator];

    if (_.isNil(evaluator)) {
      log.error(`Step ${this.step.name} has condition with invalid operator ${condition.operator}. Valid operators are ${_.keys(EVALUATORS)}.`);
      return false;
    }

    const expandedCondition = evaluator.expand(condition, this.environment);

    if (!evaluator.isValid(expandedCondition)) {
      log.debug(`Following condition is not met for ${this.step.name}:`);
      log.debug(`Condition:\n${YAML.dump(condition)}`);
      log.debug(`Expanded Condition:\n${YAML.dump(expandedCondition)}`);
      return false;
    }

    return true;
  }

  evaluate() {
    this.numFailedConditions = _.size(
      _.reject(this.step.when, (condition) => {
        return this.isValidCondition(condition);
      }),
    );
  }

  getNumFailedConditions() {
    return this.numFailedConditions;
  }

  isValid() {
    return this.numFailedConditions === 0;
  }
}
