# CIX Release Notes
### 2.4.1-pre
* `exec --remote`, `resume` and `next` block execution of the client until either the pipeline is paused or becomes terminal. 
* `exec --remote`, `resume` and `next` can also now stream logs from the server and display them on the client.
* Updated `--env` and `--secret` with the ability to pass environment variables by name only, using their values from the calling environment.
* Added the `arguments` step attribute so additional parameters can be provided to an image's default ENTRYPOINT command.
* Detach from the console when starting the CIX server (`cix server` command).
* Migrated from custom nodejs base image to new common Strata nodejs base image. 
* NPM dependency cleanup and upgrades. 

### 2.4.0
* Added a plugin framework to CIX. The first feature to take advantage of the new framework is "preprocessors." A preprocessor allows a non-native pipeline to be transformed into a valid CIX pipeline before execution.
* Fixed a bug where teardown was not run after a pipeline failure.
* `cix describe` now displays environment variables defined within a pipeline.
* `cix resume --to step` now runs to and including the specified step.

### 2.3.1
* Restored CIX to loading chained YAML files to just before they get executed ("just-in-time"), rather than at the start of the first pipeline execution. This allows users to dynamically add or sync pipelines from earlier ones at runtime.
* Fixed issues with reading secrets from stdin with and without a TTY.
* Added the ability for users to define a .cixconfig file for some flags which would previously have to be specified on each CIX invocation. See [documentation](/reference/local-configuration.md) for more information.

### 2.3.0
* Added new CLI commands and server endpoints to support phased execution. Please check out [the documentation](/tutorials/phased-exec) for more information.
* Added support for passing in secrets through standard input rather than command line. Please check out [the documentation](/tutorials/secrets#standard-input) for more information.
* Added support to POST pipelines as JSON though the REST API, which removes the need to have the YAML pipeline files available on the server.
* Preliminary support for launching pipeline steps to a Kubernetes cluster.
* Return to using `:latest` as the default image tag in the `cix` wrapper script. The default can be overridden by [setting the CIX_IMAGE environment variable](/reference/cli.md#specifying-the-cix-docker-image-to-use).

### 2.2.2
* Perform a clean shutdown when the INT (Ctrl-C) and TERM signals are received.

### 2.2.1
* When executed by the shell, step `commands` now defaults to `set -e` or 'fail on error' mode, such that any failed
command will abort the pipeline. A step's failure mode can be manually overridden to 'ignore errors' by calling
`set +e` in your `commands` list.
* Refactored loggers to take care of the bug where containers log to multiple files.

### 2.2.0
* Added support for creating new environment variables at runtime. Check out the demo
[docs/examples/environment-passing.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/environment-passing.yaml) to
see how.
* Added new Rest API, the API starts up at http://localhost:10030/api-docs and has the following functionality:
  * Adding new pipelines to execute
  * Chaining together pipeline executions
  * Checking the status of a pipeline execution
  * Adding new environment variables at runtime
  * Ability to start CIX in a server mode with `cix server`
* Refactored much of the code, including upgrading all npm dependencies.

### 2.1.19
* Use `:latest` as the default image version in the wrapper script until renamed CIX is more widespread.

### 2.1.18
* It's time to make it official! The command to start CIX is now `cix`, while `cix2` is deprecated but will continue
to be supported for the foreseeable future. To update your image and wrapper script run `cix2 update` followed by
`cix2 install | sudo sh`. You may then use the command `cix` to run CIX.
* Added ability to use $$ environment format within the environment variables and registry host name `default` key.
* Default to console logging and remove Chalk colors if logging in files mode.
* Move from the jsonschema package to the [ajv](https://www.npmjs.com/package/ajv) package for schema validation.
* Allow the use of alternative interpreters for `commands`. Write your step commands in Python, NodeJS, etc. as long
as it is supported by the image.
* Bug fix: in shell scripts the `$?` variable was being overwritten before it could be used by a subsequent command
([issue #216](https://github.com/salesforce/cix/issues/216)).
* Add timestamp to container commands echo lines.
* To ensure the shell wrapper script is in-sync with the cix image, a version comparison is now performed and warning
emitted if it is outdated.

### 2.1.17
* Added ability to retry the image pull operation, to be more resilient to registry connection issues. Retries
are configured via the new `retry` attribute of the `registry` definition.

### 2.1.16
* Bug fix: fix obfuscation bug in maskSecrets function ([issue #206](https://github.com/salesforce/cix/issues/206)).

### 2.1.15
* Bug fix: avoid using the "function" shell keyword in the cixrc shell script to support older Bourne shells.

### 2.1.14
* [Registries](/reference/yaml.md#registry) may now be defined by alias, with optional default value. This allows the registry
host to be overridden from the command-line. Alternatively, multiple registries may be defined and one selected from the
set using a command line variable.
* Allow `ports` to be defined with command-line variables.
* Fixed a bug where secrets passed with empty strings or regex control characters caused issues during the secret
masking process ([issue #113](https://github.com/salesforce/cix/issues/113)).
* Fixed a bug where the unquoted words `true` and `false` were not treated as strings in `when` condition operands
([issue #190](https://github.com/salesforce/cix/issues/190)).
* When using file logging, step numbers are now padded to two digits for easier sorting.
* Added `INCLUDES` (a.k.a. contains) and `NOT INCLUDES` to available simple conditional operators.

### 2.1.13
* Added check to ensure `exec` will not attempt to process invalid YAML.

### 2.1.12
* Addition of the "OR" [conditional operator](/reference/yaml.md#when).
* Fixed a bug where the Teardown pipeline was not executed when the main pipeline failed.

### 2.1.11
* Steps can be executed based on conditional evaluation of variables with the [when](/reference/yaml.md#when) attribute.
* Imports can now be nested within other imports.
* Multiple YAML files may be specified on the command line using repeated `--yaml` (`-y`) options. Each one will be
executed in order. Files are parsed when encountered so they do not need to exist prior to starting the pipeline.
This allows YAML files to be generated by previous files in the chain.
* Pipelines can be fetched from GitHub, which creates the ability to run "managed pipelines." Refer to the
[cix exec managed](/reference/cli.md#cix-exec-managed) command in the CLI reference.
* A new attribute [commands-shell](/reference/yaml.md#commands-shell) has been introduced to specify the shell binary under
which to run `commands`. This is useful when the default /bin/sh in an image is not the one you would like to run
commands with, but there is a separate shell installed (typically /bin/bash). The replacement shell must be
Bourne-compatible.
* The [privileged](/reference/yaml.md#privileged) attribute has been added to enable Docker privileged mode for containers,
primarily for Docker-in-Docker (running the full Docker engine in a container).
* Fix for `cix install` so it doesn't output CR-LF and break the newly installed file name and contents. Because
this bug is present in the existing script, use the `docker run` instructions from the
[Getting Started guide](getting-started.md) to get the updated version. Future updates can be performed by simply running
`cix install | sudo sh`.
* The 'cix' wrapper script has been improved to allow spaces in `-e` and `-s` parameters.
* When the logging mode is 'files' (`--logging files`), general CIX output is now sent to the console as well.
* Containers are deleted immediately after they are finished, which helps to avoid naming conflicts for repeated steps.
* Fixed erroneous `$$` variable expansion when two overlapping names were defined.

### 2.1.10
* Added ability to specify defaults for environment variables when they are not defined by `-e`, `-s` arguments on the
command line.
* Added ability to validate schema command in cix-cli `cix validate -y your.yaml`.
* Added two new volume mounts to each step: /cix/bin and /cix/libexec. These will be used for shared scripts developed
by the CIX team.
* Change github docs theme to Cayman.

### 2.1.9
* When the 'files' logging mode is enabled (with `--logging files`), general output is saved to `cix-execution.log` as
in CIX 1.
* The default logging level has been changed from WARN to INFO.

### 2.1.2
* Bug fix: fix failing Payload test and skip pipeline creation if schema validation fails.

### 2.1.1
* __USER ACTION REQUIRED__ - YAML changes are required to upgrade from CIX 2.0 to 2.1.
  * The `version` attribute in your YAML definition must be changed from `2.0` to `2.1`.
  * Attributes of `step` must be indented an additional 2 spaces.
    * 2.0 docs/examples/basic.yaml

    ```yaml
      version: 2
      pipeline:
        - step:
          name: basic
          image: alpine:3.8
          commands:
            - hostname
    ```

    * 2.1 docs/examples/basic.yaml

    ```yaml
      version: 2.1
      pipeline:
        - step:
            name: basic
            image: alpine:3.8
            commands:
              - hostname
    ```

  * The `pullpolicy` attribute has been renamed to `pull-policy`.
  * The `workingdir` attribute has been renamed to `working-dir`.
* Added ability to import local files into your pipeline, as full pipelines or as libraries. More info at
docs/examples/import/imports.yaml in the [Getting Started guide](getting-started.md).
* Steps can now be grouped, and grouped steps can be parallelized. More info at docs/examples/steps.yaml in the
[Getting Started guide](getting-started.md).
* Steps and step-groups can be nested. More info at docs/examples/nested_steps.yaml in the
[Getting Started guide](getting-started.md).
* Fixed an issue where older version 2.0 YAML files would cause an `UncaughtException "TypeError: Cannot read
property 'name' of null"` when run with CIX 2.1.
* Fixed an issue where the request npm module was not included in the CIX2 docker image.
* Removed `root-` prefix from first level nested steps.
* Retry `backoff` value is specified in seconds instead of milliseconds.
