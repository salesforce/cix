/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/* global beforeEach, describe, expect */
import Path from 'path';
import {ValidateError} from '../index.js';
// disable eslint for next line, some weird issue with jest loading order
// eslint-disable-next-line sort-imports
import LocalFileLoader from './LocalFileLoader.js';

describe('LocalFileLoader.relativePath', () => {
  let loader;

  beforeEach(() => {
    loader = new LocalFileLoader();
  });

  test('relative path returned is relative to folder of path argument', () => {
    const definition = {src: './full-pipeline.yaml'};
    expect(loader.relativePath('docs/examples/import/imports.yaml', undefined, definition)).toBe('docs/examples/import/full-pipeline.yaml');
  });
});

describe('LocalFileLoader.fetch', () => {
  let loader;

  beforeEach(() => {
    loader = new LocalFileLoader();
  });

  test('fetch returns the contents of a file', () => {
    expect(loader.fetch(Path.resolve(__dirname, 'LocalFileLoader.test.js'), undefined)).toBeDefined();
  });

  test('fetch throws an error if a file does not exist', () => {
    expect(() => loader.fetch('nonexistent', undefined)).toThrow(ValidateError);
  });
});

