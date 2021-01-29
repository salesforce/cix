# Local Configuration

CIX supports the use of local configuration files (similar to .npmrc), in order to save certain command line options to
ease development and make CIX pipeline invocations more repeatable.

Currently the config file supports specifying default pipeline and plugin definition files (YAML), setting Environment
and Secret variables, and defining the Logging Mode and associated path if appropriate. Refer to the CLI reference
sections on [Logging Modes](/reference/cli#logging-modes) and [`exec` command options](/reference/cli#cix-exec)).

Pipelines and plugins specified on the command line (with the `--yaml` and `--plugin` options) will override those set
in the configuration file. Environment and Secret variables are cumulative, but values specified on the command-line
override similarly named variables from the configuration file.

## Supported filenames and types
CIX config files can be named the following: `.cixconfig`, `.cixconfig.json`, and `.cixconfig.yaml`. These files must
be placed in the execution directory (not the location of the YAML file you are executing, but the folder from which you
execute CIX, otherwise known as the working directory). You can also provide a specific file path to load, and it will
be mounted to the CIX image (as `/cix/.userconfig`). This cix configuration file will only be made available to the CIX
docker image used during execution. If you provide a specific file via `-c` or `--configfile`, it will be the only
configuration file loaded.

The file extensions are available as an option so you can use your favorite editor and take advantage of syntax
highlighting.

These files are loaded in the following order, with #1 having the lowest merge priority and #3 having the highest.

1. `.cixconfig.yaml`
2. `.cixconfig.json`
3. `.cixconfig`

## An example `.cixconfig` file in YAML format
`.cixconfig` files can be in either YAML or JSON format.
```yaml
---
pipelines:
  - cix.yaml
  - build/test.yaml

plugins:
  - preprocessor-plugin.yaml

environment:
  FOO: foo
  BAR: bar

secrets: # Warning: storing secrets in plain text on disk is not advised. Try using --secret-prompt <key> or one of the --secret(s) options.
  BAZ: baz

prompted-secrets:
  - QUX

logging:
  mode: files    # 'console' or 'files'
  path: cix-logs # default 'logs', ignored in console mode
                 # Keep in mind, this path must be under the workspace you specify to be preserved.
                 # The default workspace is the current working directory.
```

## An example `.cixconfig` file in JSON format
`.cixconfig` files can be in either YAML or JSON format.
```json
{
   "pipelines": [
      "cix.yaml",
      "build/test.yaml"
   ],
   "plugins": [
      "preprocessor-plugin.yaml"
   ],
   "environment": {
      "FOO": "foo",
      "BAR": "qux"
   },
   "secrets": {
      "BAZ": "baz"
   },
   "prompted-secrets": [
      "QUX"
   ],
   "logging": {
      "mode": "files",
      "path": "cix-logs"
   }
}
```
