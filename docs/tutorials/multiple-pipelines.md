# Multiple Pipelines

There are two ways to run more than one pipeline:
1. CIX supports chaining multiple pipelines together on the command line. This allows the user to
execute multiple yaml files back to back.
2. Create distinct pipelines and reference them by ID or Alias.

## Chaining Pipelines

CIX pipelines are defined in YAML files. A CIX execution can specify multiple pipelines, which are
run in sequence. These are specified using the `--yaml` (or `-y`) option. The option may be repeated
to specify multiple pipeline definitions, which will each be executed consecutively in the order
they appear on the command-line. If any pipeline fails, the entire execution is terminated.

The options `--setup` and `--teardown` provide a means to specify pipelines that will be executed
before any other pipelines, and at the termination of execution, respectively. These can be used to
perform initial setup and final housekeeping tasks. The teardown pipeline is always run, whether the
execution was successful or not.

The pipeline files specified with the `--yaml` and `--teardown` options need not exist prior to
execution. This makes it possible for a pipeline to generate the file that defines a subsequent one.
Of course, in order that the execution may be "bootstrapped" at least one file must exist, be that
the `--setup` definition, or the first `--yaml` pipeline should there be no setup option.

Refer to the [CLI Reference](/reference/cli).

### Example

```
cix exec --setup prepare.yaml --yaml build.yaml --yaml test.yaml --teardown cleanup.yaml
```

## Managing Multiple Pipelines with Aliases

Up until now all cix commands have worked on a single pipeline. Each pipeline, even if working with
a single pipeline, gets a UUID associated with it. The reason we don't specify the UUID is that the
last pipeline loaded gets marked with the alias 'latest'. When no UUID is specified the pipeline with
the alias 'latest' is used. For convenience, the user may also add their own aliases and associate them
with pipelines.

### Examples:
Try loading two pipelines and displaying the IDs
```
# first start cix server in another terminal
cix load -y docs/examples/basic.yaml
cix load -y docs/examples/basic.yaml
cix pipelines
```
The second one should have the alias 'latest' as it was the last one added.

You may specify your own alias when loading a yaml.
```
cix load -y docs/examples/basic.yaml --pipeline-alias test
cix pipelines
```
> Pipelines may have multiple aliases pointed at them.

You may also set an alias on a previously created pipeline, assuming you know its ID.
```
cix load -y docs/examples/basic.yaml
cix pipelines --set-alias test --pipeline-id ${pipeline_id}
```
> Setting an alias for an alias that already exists updates it.

Likewise you can also get a pipeline ID from an alias.
```
cix load -y docs/examples/basic.yaml --set-alias test
cix pipelines --get-alias test
```

You can use `cix resume` with a --pipeline-id or --pipeline-alias.
```
cix load -y docs/examples/basic.yaml --set-alias test
cix resume --pipeline-alias test
```
---

In the [next section](tutorials/auth.md) we'll learn how to use basic registry auth.
