# Plugins

?> **New Feature** Plugins are a recent addition to CIX. Currently only `preprocessors` are supported.

Plugins allow the user to inject container executions at different phases of the pipeline lifecycle. Examples include transforming a CIX pipeline YAML prior to it being run (see [preprocessor](#preprocessor)) or collecting metrics before or after steps are executed (future feature).

## Preprocessor

### Preprocessor Docker Image
The preprocessor plugin gives the user the ability to transform the pipeline YAML prior to it being loaded using a user created Docker image. This Docker image can be written with anything that runs in Docker. It just needs to read the input on standard input, transform it by any means, then write the output on standard output (emit errors or logs to standard error to prevent contaminating the output). The transformed output is then validated and loaded when the pipeline is started. 

### Preprocessor Plugin YAML
To use a preprocessor plugin, you must create a plugin YAML. Simply add the preprocessor image you'd like to use into the YAML.

!> Warning: The preprocessor plugin currently does not authenticate with any private registries. If using a private registry requiring authentication, pull the image before you run CIX. 

[Error loading section, please refresh](../examples/plugins/preprocessor.yaml ':include :type=code')

### Preprocessor Execution
To run CIX with a preprocessor plugin, pass the plugin YAML path with the `--plugin` option:
```sh
cix exec --plugin examples/plugins/preprocessor.yaml -y examples/basic.yaml
```

You can chain multiple preprocessors together, the output from one will be piped into the input of the next. Order of the CLI options is maintained: 
```sh
cix exec --plugin first.yaml --plugin second.yaml -y examples/basic.yaml
```
---

In the [last section](tutorials/tips.md) we'll cover some tips and tricks.
