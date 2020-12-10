/*
* Copyright (c) 2020, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global jest, describe, expect */
import {CIXError, ValidateError} from './Errors.js';
import _ from './lodash.js';
import yaml from 'js-yaml';

beforeEach(() => {
  jest.resetAllMocks();
});

describe('lodash.check', () => {
  test('check should throw CIXError if parameter is false', () => {
    expect(() => _.check(false)).toThrow(CIXError);
  });
});

describe('lodash.getOnlyElement', () => {
  test('should return first element in an array of size 1', () => {
    expect(_.getOnlyElement([true])).toBe(true);
  });

  test('should throw CIXError if array is not an array', () => {
    expect(() => _.getOnlyElement(true)).toThrow(CIXError);
    expect(() => _.getOnlyElement(true)).toThrow('Collection has to be an array!');
  });

  test('should throw CIXError if array has more than one element', () => {
    expect(() => _.getOnlyElement([true, true, true])).toThrow(CIXError);
    expect(() => _.getOnlyElement([true, true, true])).toThrow('Expecting one element, got more!');
  });

  test('should throw CIXError if array has no elements', () => {
    expect(() => _.getOnlyElement([])).toThrow(CIXError);
    expect(() => _.getOnlyElement([])).toThrow('Empty collection, while expecting one element!');
  });
});

describe('lodash.getUniqueDuplicates', () => {
  test('should return one element for each element with at least one duplicate in array', () => {
    expect(_.getUniqueDuplicates([1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4])).toEqual([1, 2, 3]);
  });
});

describe('lodash.loadYamlOrJson', () => {
  test('should return json representation of yaml string provided', () => {
    const data = {data: 'test'};
    const yamlData = yaml.safeDump(data);

    expect(_.loadYamlOrJson(yamlData)).toEqual(data);
  });
  test('should return json if json string is provided', () => {
    const data = '{data: \"test\"}';
    const dataObj = {data: 'test'};

    expect(_.loadYamlOrJson(data)).toEqual(dataObj);
  });

  test('should throw CIXError if it cannot parse yaml or json', () => {
    jest.mock('js-yaml');
    yaml.safeLoad = jest.fn(() => {
      throw new Error();
    });

    expect(() => _.loadYamlOrJson(undefined)).toThrow(ValidateError);
  });
});
