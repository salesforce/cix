# Importing Files

CIX allows users to split up their pipeline into multiple files. This can be useful when sharing common pipeline code between different pipelines to reduce duplication. 

There are two types of imports. Importing whole pipelines, and importing individual steps from shared libraries.

## Importing whole pipelines

CIX `imports` allow users to include a full standalone pipeline from another file. 

Example:

full-pipeline.yaml
```yaml 
version: 2.1
pipeline:
  - step:
      name: import-test
      image: alpine:3.9
      environment:
        - name: FOO
          value: $$FOO
      commands:
        - echo $FOO
```
This pipeline simply prints the environment variable FOO. Test it out by passing it the string `hi`.
```sh
cix exec -y full-pipeline.yaml -e FOO=hi
```

cix.yaml
```yaml 
version: 2.1
imports:
  full-pipeline:
    src: ./full-pipeline.yaml
pipeline:
  - step:
      name: echo
      image: alpine:3.9
      commands:
        - echo 'This pipeline will import full-pipeline.yaml with the FOO environment variable set to "test"'
  - import:
      - full-pipeline:
          environment:
            - name: FOO
              value: test
```
This pipeline imports full-pipeline and sets FOO to `test`.
```sh
cix exec -y cix.yaml
```

## Importing sections from a library file. 

Users can create a library YAML, which cannot be run standalone. Using a library YAML allows users to selectively import `steps` from that file by name. `steps` can contain just a single `step` or multiple nested `steps`.

Example:
 library.yaml
```yaml
setup: # name this set of steps will be referenced by
  steps:
    name: setup # any name can be used here, but I'd recommend keeping them the same for sanity purposes
    pipeline:
      - step:
          name: sync
          image: alpine:3.9
          commands:
            - echo "performs some sync operation"
cleanup:
  steps:
    name: cleanup 
    pipeline:
      - step:
          name: restore
          image: alpine:3.9
          commands:
            - echo "performs some cleanup operation"
```
!> Notice the library.yaml does not include the `version` attribute or begin with `pipeline`. Library files cannot be executed on their own. 

cix.yaml
```yaml 
version: 2.1
imports:
  library:
    src: ./library.yaml
pipeline:
  - import:
      - library.setup
  - step:
      name: echo
      image: alpine:3.9
      commands:
        - echo "user can mix step, steps and imports"
  - import:
      - library.cleanup
```
To import a section of the library file, simply just use `.` notation for the qualified name of the step. 

## Importing from GIT
!> Experimental feature. 
!> To use GIT, the user must supply a GIT Auth Token environment variable called HTTP_AUTHORIZATION_TOKEN

There are two ways to use GIT. 

The first way is you can load a git URL from the command line:
```
Example:

cix exec -y https://github.com/raw/ci/cix/master/docs/examples/import/imports.yaml -s HTTP_AUTHORIZATION_TOKEN=$GIT_AUTH_TOKEN
```

The second way is inside the `import` section of the YAML.
```yaml
version: 2.1
imports:
  library:
    src: https://github.com/raw/ci/cix/master/docs/examples/import/library.yaml
    http_authorization_token: $$HTTP_AUTHORIZATION_TOKEN # must be passed via -s or one of the more secure --secret* options
pipeline:
  - import:
      - library.phase1:
          environment:
            - name: CHANGELIST
              value: 222123123
            - name: P4PORT
              value: ssl:p4proxy.soma.salesforce.com:1999 # dev P4PORT
      - library.phase2
```

## Full Example

?> There are three files in this example.

* [docs/examples/import/imports.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/import/imports.yaml) 

[Error loading section, please refresh](../examples/import/imports.yaml ':include :type=code')

* [docs/examples/import/library.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/import/library.yaml) 

[Error loading section, please refresh](../examples/import/full-pipeline.yaml ':include :type=code')

* [docs/examples/import/full-pipeline.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/import/full-pipeline.yaml) 

[Error loading section, please refresh](../examples/import/library.yaml ':include :type=code')

To launch this example, run the following command in your terminal:

```bash
cix exec -y docs/examples/import/imports.yaml
```
---

In the [next section](tutorials/background.md) we'll learn how to background a step so that you can run more than one container at a time.