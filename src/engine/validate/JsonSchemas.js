/*
* Copyright (c) 2022, salesforce.com, inc.
* All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
* For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/**
 * @namespace JsonSchemas
 */

export const mainSchema = {
  '$id': 'main.json',
  'type': 'object',
  'properties': {
    'version': {
      'type': 'number',
      'minimum': 2.1,
      'maximum': 2.1,
    },
    'kind': {
      'const': 'Pipeline',
    },
    'imports': {
      'type': 'object',
      'additionalProperties': {
        '$ref': 'import.json',
      },
    },
    'pipeline': {
      'type': 'array',
      'items': {
        '$ref': 'pipeline.json',
      },
    },
    'registry': {
      'type': 'object',
      'additionalProperties': {
        '$ref': 'registry.json',
      },
    },
  },
  'required': ['version'],
  'additionalProperties': false,
};

export const pipelineSchema = {
  '$id': 'pipeline.json',
  'type': 'object',
  'properties': {
    'step': {
      '$ref': 'step.json',
    },
    'steps': {
      '$ref': 'steps.json',
    },
  },
  'additionalProperties': false,
};

export const stepSchema = {
  '$id': 'step.json',
  'type': 'object',
  'properties': {
    'name': {
      'type': ['string', 'number'],
      'maxLength': 64,
      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9_.-]*$',
    },
    'image': {
      'type': 'string',
    },
    'user': {
      'type': ['string', 'number'],
    },
    'pull-policy': {
      'type': 'string',
    },
    'working-dir': {
      'type': 'string',
    },
    'workspace-mount-point': {
      'type': 'string',
    },
    'arguments': {
      'type': 'array',
      'items': {
        'type': ['string', 'number', 'boolean'],
      },
    },
    'commands': {
      'type': 'array',
      'items': {
        'type': ['string', 'number', 'boolean'],
      },
    },
    'commands-output': {
      'type': 'string',
    },
    'commands-shell': {
      'type': 'string',
    },
    'environment': {
      'type': 'array',
      'items': {
        '$ref': 'environment.json',
      },
    },
    'hostname': {
      'type': 'string',
    },
    'ports': {
      'type': 'array',
      'items': {
        'type': ['string', 'number'],
      },
    },
    'privileged': {
      'type': 'boolean',
    },
    'volumes': {
      'type': 'array',
      'items': {
        'type': 'string',
      },
    },
    'retry': {
      'type': 'object',
      'properties': {
        'iterations': {
          'type': ['integer', 'string'],
          'minimum': 1,
        },
        'backoff': {
          'type': ['integer', 'string'],
          'minimum': 0,
        },
      },
      'additionalProperties': false,
    },
    'timeout': {
      'type': ['integer', 'string'],
      'minimum': 0,
    },
    'background': {
      'type': 'boolean',
    },
    'continue-on-fail': {
      'type': 'boolean',
    },
    'loop': {
      'type': ['integer', 'string'],
      'minimum': 0,
    },
    'counter-variable': {
      'type': 'string',
    },
    'for-each': {
      'type': ['string', 'array'],
    },
    'parallel': {
      'type': 'boolean',
    },
    'element-variable': {
      'type': 'string',
    },
    'when': {
      'type': 'array',
      'items': {
        '$ref': 'when.json',
      },
    },
  },
  'required': ['name', 'image'],
  'additionalProperties': false,
};

export const stepsSchema = {
  '$id': 'steps.json',
  'type': 'object',
  'properties': {
    'name': {
      'type': ['string', 'number'],
    },
    'parallel': {
      'type': 'boolean',
    },
    'pipeline': {
      'type': 'array',
      'items': {
        '$ref': 'pipeline.json',
      },
    },
  },
  'required': ['name', 'pipeline'],
};

export const environmentSchema = {
  '$id': 'environment.json',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
    },
    'value': {
      'type': ['string', 'number', 'boolean'],
    },
    'default': {
      'type': ['string', 'number', 'boolean'],
    },
  },
  'required': ['name'],
};

export const importSchema = {
  '$id': 'import.json',
  'type': 'object',
  'properties': {
    'src': {
      'type': 'string',
    },
    'token': {
      'type': 'string',
    },
  },
  'required': ['src'],
};

export const registrySchema = {
  '$id': 'registry.json',
  'type': 'object',
  'properties': {
    'host': {
      'type': 'object',
      'properties': {
        'name': {
          'type': 'string',
        },
        'default': {
          'type': 'string',
        },
      },
      'required': ['name'],
      'additionalProperties': false,
    },
    'username': {
      'type': 'string',
    },
    'password': {
      'type': 'string',
    },
    'retry': {
      'type': 'object',
      'properties': {
        'iterations': {
          'type': ['integer', 'string'],
          'minimum': 1,
        },
        'backoff': {
          'type': ['integer', 'string'],
          'minimum': 0,
        },
      },
      'additionalProperties': false,
    },
  },
};

export const whenSchema = {
  '$id': 'when.json',
  'type': 'object',
  'properties': {
    'operator': {
      'type': 'string',
    },
    'value': {
      'type': ['string', 'number', 'boolean'],
    },
    'value-default': {
      'type': ['string', 'number', 'boolean'],
    },
    'other': {
      'type': ['string', 'number', 'boolean'],
    },
    'expressions': {
      'type': ['string', 'number', 'boolean'],
    },
    'delimiter': {
      'type': ['string', 'number', 'boolean'],
    },
    'other-default': {
      'type': ['string', 'number', 'boolean'],
    },
    'values': {
      'type': 'array',
    },
    'conditions': {
      'type': 'array',
    },
  },
  'required': ['operator'],
  'additionalProperties': false,
};

export const pluginSchema = {
  '$id': 'plugin.json',
  'type': 'object',
  'properties': {
    'version': {
      'type': 'number',
      'minimum': 2.4,
      'maximum': 2.4,
    },
    'kind': {
      'const': 'Plugin',
    },
    'preprocessor': {
      '$ref': 'preprocessor.json',
    },
  },
  'required': ['version', 'kind'],
  'additionalProperties': false,
};

export const preprocessorSchema = {
  '$id': 'preprocessor.json',
  'type': 'object',
  'properties': {
    'image': {
      'type': 'string',
    },
  },
  'required': ['image'],
  'additionalProperties': false,
};
