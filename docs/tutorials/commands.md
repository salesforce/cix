# Command Usage

### Multi Line Commands
Your YAML can incorporate multi-line commands in several ways. Check out the demo for examples showing the syntax.

* [docs/examples/multi_line_commands.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/multi_line_commands.yaml) 

[Error loading section, please refresh](../examples/multi_line_commands.yaml ':include :type=code')

To launch this example, run the following command in your terminal:

```bash
cix exec -y docs/examples/multi_line_commands.yaml
```
---

### Docker ENTRYPOINT
The `commands` section overrides the ENTRYPOINT scripts set by a given step's image's Dockerfile. Note: the `environment` definition in the step is still passed to the image normally, regardless of whether the ENTRYPOINT or `commands` section is executed.

However, if you would like to use the image's ENTRYPOINT script, you can omit the commands section altogether. In addition, if you would like to augment the container's default ENTRYPOINT with your own commands, you can use `docker inspect` with
the image name to see what its environment variables, ENTRYPOINT, and CMD parameters contain in order to replicate the
image's default behavior in your `commands` section.

The `arguments` attribute provides a way to specify additional parameters to the ENTRYPOINT script. This is akin to specifying a `CMD` directive along with `ENTRYPOINT` in the Dockerfile, or providing parameters with `docker run`.

### Shell Override
By default, the shell used by a step is `/bin/sh`. The behavior of `/bin/sh` is generally different depending on operating system, and should be verified for a given image (if important). You can also override the default shell, as described below. This is helpful for using a different shell, as well as running simple scripts (python, node, perl, etc.) via their interpreter.

* [docs/examples/interpreters.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/interpreters.yaml) 

[Error loading section, please refresh](../examples/interpreters.yaml ':include :type=code')

### Continue on Fail
More information on this YAML property is available [here](reference/yaml.md#continue-on-fail)

In the [next section](tutorials/environment.md) we'll learn how environment variables work.

### Run pipeline as non-root user

By default commands inside a step are run as root user. This user can be overridden per step.
More information on this is available [here](reference/yaml.md#user)
