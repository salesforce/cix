/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
import {Logger, Provider, _} from '../../../common/index.js';
import Step from '../Step.js';
import YAML from 'js-yaml';

export default (payload, pipelineNode, promiseProvider) => {
  const environment = pipelineNode.getEnvironment();
  if (!_.isNil(payload.when)) {
    _.check(_.isArray(payload.when), `On Step ${payload.name} 'when' has to be an array.`);
    Logger.debug(`Checking 'when' conditions for ${payload.name}.`, pipelineNode?.getPipeline?.().getId());
    const condition = new StepCondition(payload, environment, pipelineNode?.getPipeline?.().getId());

    condition.evaluate();
    if (!condition.isValid()) {
      Logger.debug(`Skipping ${payload.name} with ${condition.getNumFailedConditions()} failed conditions.`, pipelineNode?.getPipeline?.().getId());
      if (pipelineNode.getType() === 'Step' || pipelineNode.getType() === 'Steps') {
        pipelineNode.setStatus(Step.STATUS.skipped); // Steps will set all descendants
      }
      return Provider.fromObject(Promise.resolve());
    }
  }

  return promiseProvider;
};

/**
 * @function module:engine.ConditionDecorator#replace$$
 * @param {object} obj - an object containing the key/value pairs to be replaced
 * @param {string} key - key of the obj containing values to be replaced
 * @param {object} environment - an object representing the passed environment
 * @param {string} defaultKey - default value for a given key
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
 * @param {object} condition - an object representing a conditional
 * @param {object} environment - an object representing the passed environment
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
 * @param {object} func - a function representing the evaluator
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
 * @param {object} value - an object to be checked
 * @returns {boolean} a bool representing whether value is set
 */
function isSet(value) {
  return !_.isNil(_.emptyToNull(value));
}

/**
 * @function module:engine.ConditionDecorator#includesAndNotEmpty
 * @param {object} value - an object to be checked if other is an item of
 * @param {object} other - an object to be checked if it is an item of other
 * @returns {boolean} a bool representing whether other is an item of value
 */
function includesAndNotEmpty(value, other) {
  // empty string is substring of every string, overriding this behavior
  // empty string will not be included in non-empty strings
  return (_.isEmpty(other.trim()) && !_.isEmpty(value.trim())) ? false : _.includes(value, other);
}

/**
 * @function module:engine.ConditionDecorator#regexMatch
 * @param {string} value - an object to be matched
 * @param {string} expressions - a delimited list of regular expressions to match
 * @param {string} delimiter - the delimiter to use
 * @returns {boolean} a boolean value whether the other comes within the regex pattern of value
 */
function regexMatch(value, expressions, delimiter) {
  const regexPatterns = _.split(expressions, delimiter);
  let regxp;
  let matchString;
  for (const pattern of regexPatterns) {
    const trimmedPattern = pattern.trim();
    if (!_.isEmpty(trimmedPattern)) {
      regxp = RegExp(trimmedPattern);
      matchString = value.match(regxp);
    } else {
      return false;
    }
    if ( !_.isNull(regxp) && matchString && (matchString[0] == value) ) {
      return true;
    }
  }
  return false;
}

const MatchEvaluator = {
  expand: (condition, environment) => {
    if (_.isNil(condition.delimiter)) {
      condition.delimiter = ',';
    }
    return {
      operator: condition.operator,
      value: replace$$(condition, 'value', environment),
      expressions: replace$$(condition, 'expressions', environment),
      delimiter: replace$$(condition, 'delimiter', environment),
    };
  },

  isValid: (condition) => {
    return regexMatch(condition.value, condition.expressions, condition.delimiter);
  },
};

const NotMatchEvaluator = {
  expand: MatchEvaluator.expand,
  isValid: _.negate(MatchEvaluator.isValid),
};

const ExistEvaluator = {
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

const NotExistEvaluator = {
  expand: ExistEvaluator.expand,
  isValid: _.negate(ExistEvaluator.isValid),
};

const BooleanEvaluator = {
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
};

const OREvaluator = {
  __proto__: BooleanEvaluator,

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

const ANDEvaluator = {
  __proto__: BooleanEvaluator,

  isValid: (condition) => {
    if (_.isEmpty(condition.conditions)) {
      return false;
    }

    let passed = true;

    _.map(condition.conditions, (subCondition) => {
      const evaluator = EVALUATORS[subCondition.operator];

      if (!_.isNil(evaluator) && !evaluator.isValid(subCondition)) {
        passed = false;
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
  INCLUDES: createSimpleEvaluator(includesAndNotEmpty),
  NOT_INCLUDES: createSimpleEvaluator(_.negate(_.includes)),
  STARTS_WITH: createSimpleEvaluator(_.startsWith),
  ENDS_WITH: createSimpleEvaluator(_.endsWith),
  MATCHES: MatchEvaluator,
  NOT_MATCHES: NotMatchEvaluator,
  EXISTS: ExistEvaluator,
  NOT_EXISTS: NotExistEvaluator,
  OR: OREvaluator,
  AND: ANDEvaluator,
};

export class StepCondition {
  constructor(step, environment, pipelineId) {
    this.step = step;
    this.environment = environment;
    this.numFailedConditions = -1;
    this.pipelineId = pipelineId;
  }

  isValidCondition(condition) {
    if (_.isNil(condition.operator)) {
      Logger.error(`Step ${this.step.name} has condition with no operator.`, this.pipelineId);
      return false;
    }

    const evaluator = EVALUATORS[condition.operator];

    if (_.isNil(evaluator)) {
      Logger.error(`Step ${this.step.name} has condition with invalid operator ${condition.operator}. Valid operators are ${_.keys(EVALUATORS)}.`, this.pipelineId);
      return false;
    }

    const expandedCondition = evaluator.expand(condition, this.environment);

    if (!evaluator.isValid(expandedCondition)) {
      Logger.debug(`Following condition is not met for ${this.step.name}:`, this.pipelineId);
      Logger.debug(`Condition:\n${YAML.dump(condition)}`, this.pipelineId);
      Logger.debug(`Expanded Condition:\n${YAML.dump(expandedCondition)}`, this.pipelineId);
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
