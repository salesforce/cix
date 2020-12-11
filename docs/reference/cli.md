# CIX Command Line Reference

## Specifying the CIX Docker Image to Use
After installing CIX and the `cix` wrapper script (see [Installing CIX](/getting-started/install) in
Getting Started), you start CIX by running the `cix` shell command followed by one of the subcommands
described below. The Docker image that the wrapper script uses can be changed by setting and
exporting the `CIX_IMAGE` environment variable in your shell prior to running `cix`. You would do this
to run a different version of CIX. By default, cix uses the `:latest` image, which is the most recent
release build.

The `exec`, `load`, and `validate` commands also accept the option `-e DOCKER_RELEASE_TAG=tag` to choose
which version is used. This method is deprecated and should not be relied upon.

## Logging Modes
The `-l --logging <mode>` option takes one of the following modes to set the logging style.

* `console` (the default)
  * Colorized output is displayed in the terminal (when attached to a TTY).
* `files`
  * Each container's output is logged to its own separate file, in the directory specified by the
`-p --logging-path <path>` option. CIX's general output is printed to the standard output streams as
well as the file `cix-execution.log`.

## Logging Levels
Logging is performed by the `winston` module, and the verbosity level can be specified with the
`LOG_LEVEL` environment variable, by setting it to one of the following values (which are
case-insensitive):

* `SILLY` the most information
* `DEBUG` a lot of information
* `INFO` (default) a fair amount of information
* `WARN` only the important information
* `ERROR` only execution errors

For example, to see only ERROR output the CIX command line would look like:

```
LOG_LEVEL=ERROR cix exec -y docs/examples/basic.yaml
```

## cix exec

Exec loads and executes pipelines in a single command. To load a pipeline without starting it please see [`cix load`](/reference/cli?id=cix-load). You can also chain pipelines or add setup and teardown pipelines. For more on this feature check out [Chaining Pipelines](tutorials/chaining).

> You can run this exec against a remote cix server using `--remote`. If you run exec remotely, the file will need to exist on the remote server. The default action is to exec locally.

```
Usage: cix exec [options]

Executes a pipeline.

Options:
  -c, --configfile <path>    Specify a cix configuration file to load.
  -e, --env <mapping>        Specify environment variable.  Mapping should be in the form of KEY (value taken from environment) or KEY=VALUE.
  -s, --secret <mapping>     Specify a secret (insecure). Mapping should be in the form of KEY (secret taken from environment) or KEY=SECRET.
  -w, --workspace <path>     Specify the workspace path.  Default path is the current working directory.
  -l, --logging <mode>       Specify container output logging mode: console, or files (separate files).
  -p, --logging-path <path>  Path where logs created by the 'files' logging mode will be stored. (default: "logs")
  -y, --yaml <path>          Path to pipeline definition YAML file. May be repeated.
  --plugin <path>            Path to plugin YAML file. May be repeated.
  --setup <path>             Path to setup pipeline YAML file.
  --teardown <path>          Path to teardown pipeline YAML file.
  --secret-prompt <key>      CIX will prompt you for the value of the key specified.
  --secret-stdin <key>       CIX will assign a value passed via stdin to the key specified. Cannot be used with --secrets-stdin.
  --secrets-stdin            CIX will accept a map of key/value pairs in JSON format via stdin. Cannot be used with --secret-stdin.
  --host <host>              CIX Server to connect to (default: "127.0.0.1")
  --port <port>              CIX Server to connect to (default: "10030")
  --remote                   CIX will execute against a remote CIX Server.
  -h, --help                 display help for command
```

## cix validate

Running validate will start with loading the YAML and checking to see it is valid. Then it will load the pipeline and all its imports to ensure all required YAML attributes and imports are valid.

> You can run this validation against a remote cix server using `--remote`. If you run validate remotely, the file will need to exist on the remote server. The default action is to validate locally.

```
Usage: cix validate [options]

Validate your YAML files without executing

Options:
  -e, --env <mapping>     Specify environment variable.  Mapping should be in the form of KEY (value taken from environment) or KEY=VALUE.
  -s, --secret <mapping>  Specify a secret (insecure). Mapping should be in the form of KEY (secret taken from environment) or KEY=SECRET.
  -w, --workspace <path>  Specify the workspace path.  Default path is the current working directory.
  -y, --yaml <path>       Path to pipeline definition YAML file. May be repeated.
  --setup <path>          Path to setup pipeline YAML file.
  --teardown <path>       Path to teardown pipeline YAML file.
  --remote                CIX will execute against a remote CIX Server.
  --host <host>           CIX Server to connect to (default: "127.0.0.1")
  --port <port>           CIX Server to connect to (default: "10030")
  -h, --help              display help for command
```

## cix server

Starts a server on the specified port (default 10030). More on the server can be found in the [Server Reference](/reference/server).

```
Usage: cix server [options]

Starts a local CIX server.

Options:
  -c, --configfile <path>    Specify a cix configuration file to load.
  -d, --detach               Shell command only: detach the server container from the console.
  -w, --workspace <path>     Specify the workspace path.  Default path is the current working directory.
  --port <port>              CIX Server Port (default: "10030")
  -l, --logging <mode>       Specify container output logging mode: console, or files (separate files) (default: "files")
  -p, --logging-path <path>  Path where logs created by the 'files' logging mode will be stored. (default: "logs")
  -h, --help                 display help for command
```

## cix load

Similar to [`cix exec`](/reference/cli?id=cix-exec). Loads the YAML without starting it.

> Load only works against a remote cix server.

```
Usage: cix load [options]

Loads a pipeline onto a remote CIX Server.

Options:
  -c, --configfile <path>    Specify a cix configuration file to load.
  -e, --env <mapping>        Specify environment variable.  Mapping should be in the form of KEY (value taken from environment) or KEY=VALUE.
  -s, --secret <mapping>     Specify a secret (insecure). Mapping should be in the form of KEY (secret taken from environment) or KEY=SECRET.
  -w, --workspace <path>     Specify the workspace path.  Default path is the current working directory.
  -l, --logging <mode>       Specify container output logging mode: console, or files (separate files).
  -p, --logging-path <path>  Path where logs created by the 'files' logging mode will be stored. (default: "logs")
  -y, --yaml <path>          Path to pipeline definition YAML file. May be repeated.
  --plugin <path>            Path to plugin YAML file. May be repeated.
  --setup <path>             Path to setup pipeline YAML file.
  --teardown <path>          Path to teardown pipeline YAML file.
  --secret-prompt <key>      CIX will prompt you for the value of the key specified.
  --secret-stdin <key>       CIX will assign a value passed via stdin to the key specified. Cannot be used with --secrets-stdin.
  --secrets-stdin            CIX will accept a map of key/value pairs in JSON format via stdin. Cannot be used with --secret-stdin.
  --host <host>              CIX Server to connect to (default: "127.0.0.1")
  --port <port>              CIX Server to connect to (default: "10030")
  -h, --help                 display help for command
```

## cix pipelines

Displays a list of pipelines and allows users to set a new default pipeline to work on. See [phased execution](/tutorials/phased-exec) for more.

> Pipelines only works against a remote cix server.

```
Usage: cix pipelines [options]

Lists information about pipelines.

Options:
  --default                    Displays default pipeline.
  --set-default <pipeline-id>  Sets the default pipeline.
  --status [pipeline-id]       Displays the status of a pipeline.
  --host <host>                CIX Server to connect to (default: "127.0.0.1")
  --port <port>                CIX Server to connect to (default: "10030")
  -h, --help                   display help for command
```

## cix resume

Resumes a paused or loaded pipeline. See [phased execution](/tutorials/phased-exec) for more.

> Resume only works against a remote cix server.

```
Usage: cix resume [options]

Continues a paused Pipeline on a CIX Server.

Options:
  --to <step>    Run to step name, then pause before the next step.
  --next         Run one step, then pause.
  --host <host>  CIX Server to connect to (default: "127.0.0.1")
  --port <port>  CIX Server to connect to (default: "10030")
  -h, --help     display help for command
```


## cix describe

Describes pipeline steps as a JSON structure. See [phased execution](/tutorials/phased-exec) for more.

> Describe only works against a remote cix server.

```
Usage: cix describe [options]

Displays the sequence of the steps.

Options:
  --file <location>  Write the Pipeline steps to a file.
  --stdout           Write the Pipeline steps to standard output.
  --stderr           Write the Pipeline steps to standard error.
  --host <host>      CIX Server to connect to (default: "127.0.0.1")
  --port <port>      CIX Server to connect to (default: "10030")
  -h, --help         display help for command
```

## cix kill

Kills a remote running pipeline.

> Kill only works against a remote cix server.

```
Usage: cix kill [options]

Kills a running pipeline.

Options:
  --host <host>  CIX Server to connect to (default: "127.0.0.1")
  --port <port>  CIX Server to connect to (default: "10030")
  -h, --help     display help for command
```

## cix install and cix update

Installs the CIX shell wrapper command into /usr/local/bin, or another location if specified. Pipe
the command's output to a shell.

When installing CIX for the first time, installation of the wrapper script is performed directly
with `docker run` (refer to [Installing CIX](/getting-started/install.md) in the Getting
Started Guide). Once CIX is established on the system, this command can be used to update the cix
shell script, for instance after the container image has been updated with `cix update`.

Install usage:
```
Usage: cix install [options]

Starts the pipeline server component for phased execution.

Options:
  --location <location>  Installation location (default: "/usr/local/bin")
  -h, --help             display help for command
```

Update usage:
```
Usage: cix update [options]

Shell command only: updates the CIX docker image from the registry.

Options:
  -h, --help  display help for command
```
