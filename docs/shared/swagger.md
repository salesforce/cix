# CIX Server API
This is the CIX Server API. Contact us on Slack, [#cix-users](https://computecloud.slack.com/archives/CEMNRF99Q).

## Version: 2.2.2

**Contact information:**  
ciplatform@salesforce.com  

[Find out more about CIX](https://github.com/pages/salesforce/cix/)

### /pipeline/{pipelineId}/environment

#### GET
##### Description:

Returns list of environment variables for a Pipeline.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pipelineId | path | Pipeline ID | Yes | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | successful operation | [ string ] |

#### POST
##### Description:

Adds a new environment variable.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pipelineId | path | Pipeline ID | Yes | string |
| body | body | New environment variable | Yes | [EnvironmentVariable](#environmentvariable) |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | successful operation |

### /pipeline/{pipelineId}/environment/{environmentVar}

#### GET
##### Description:

Gets a environment variable.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pipelineId | path | Pipeline ID | Yes | string |
| environmentVar | path | Environment Variable | Yes | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | successful operation | [EnvironmentVariable](#environmentvariable) |
| 404 | Key does not exist. |  |

### /pipeline

#### POST
##### Description:

Creates a new Pipeline.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| body | body | Pipeline Object to add | Yes | [NewPipeline](#newpipeline) |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | successful operation | object |
| 400 | Invalid request. | string |
| 418 | Invalid Pipeline Schema | object |

#### GET
##### Description:

Returns a list of pipelines.

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | successful operation | [ string ] |

### /pipeline/default

#### GET
##### Description:

Gets the default Pipeline being used.

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | successful operation | object |

### /pipeline/default/{pipelineId}

#### POST
##### Description:

Sets the default Pipeline to be used.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pipelineId | path | Pipeline ID | Yes | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | successful operation |  |
| 404 | Pipeline does not exist. | string |

### /pipeline/{pipelineId}

#### GET
##### Description:

Returns the sequence of Pipeline steps.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pipelineId | path | Pipeline ID | No | [Pipeline](#pipeline) |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | successful operation | [Pipeline](#pipeline) |
| 400 | Invalid request. | string |
| 404 | Pipeline does not exist. | string |

### /pipeline/{pipelineId}/status

#### GET
##### Description:

Returns the status for a pipeline.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pipelineId | path | Pipeline ID | No | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | successful operation | object |
| 404 | Pipeline does not exist. | string |

### /pipeline/{pipelineId}/start

#### GET
##### Description:

Starts a pipeline.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pipelineId | path | Pipeline ID | Yes | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | successful operation |  |
| 404 | Pipeline does not exist. | string |

### /pipeline/{pipelineId}/pause

#### GET
##### Description:

Pauses a pipeline.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pipelineId | path | Pipeline ID | Yes | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | successful operation |  |
| 404 | Pipeline does not exist. | string |

### /pipeline/{pipelineId}/resume

#### GET
##### Description:

Resumes a pipeline.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pipelineId | path | Pipeline ID | No | string |
| step | query | Step Name | No | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | successful operation |  |
| 404 | Pipeline does not exist. | string |

### /pipeline/{pipelineId}/kill

#### GET
##### Description:

Kills a pipeline.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pipelineId | path | Pipeline ID | No | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | successful operation |  |
| 404 | Pipeline does not exist. | string |

### /pipeline/{pipelineId}/next-step

#### GET
##### Description:

Runs the next step on a pipeline.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pipelineId | path | Pipeline ID | No | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | successful operation |  |
| 400 | Invalid request, pipeline may already be complete. | string |
| 404 | Pipeline does not exist. | string |

### /pipeline/{pipelineId}/link/{nextPipelineId}

#### GET
##### Description:

Chains one pipeline to another.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| pipelineId | path | The pipeline to chain onto. | Yes | string |
| nextPipelineId | path | The pipeline to execute next. | Yes | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | successful operation |  |
| 404 | Pipeline does not exist. | string |

### /validate

#### POST
##### Description:

Validates a Pipeline YAML.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| body | body | Pipeline Object to validate | Yes | [NewPipeline](#newpipeline) |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | successful operation |  |
| 400 | Invalid Pipeline Schema | object |

### Models


#### EnvironmentVariable

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| name | string |  | No |
| value | string |  | No |
| type | string |  | No |

#### PipelineStatus

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| PipelineStatus | string |  |  |

#### NewPipeline

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| environment | [ [EnvironmentVariable](#environmentvariable) ] | List of environment variables. | No |
| yamlPath | string | Path to YAML to load. | No |
| type | string | Type of pipeline. | No |

#### Pipeline

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| status | [PipelineStatus](#pipelinestatus) |  | No |
| id | string | UUID ID of the Pipeline. | No |
| environment | [EnvironmentMap](#environmentmap) |  | No |
| yamlPath | string | Path to YAML to load. | No |
| type | string | Type of pipeline. | No |