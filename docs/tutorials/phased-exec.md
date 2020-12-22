# Phased Execution

Phased execution is designed to load and run a pipeline incrementally rather than all at once like with `cix exec`.

Phased execution is a collection of different command line tools. Here are some of these commands at a high level, more details are provided in the sections below.
* `cix server` - starts up a remote CIX server.
* `cix load -y some/path/cix.yaml` - loads a pipeline, but doesn't start it.
* `cix describe` - describes the steps within the previously loaded pipeline.
* `cix resume --to 'step-name'` - will run up to and including the named step 'step-name', then pause.
* `cix resume --next` - will run the next step of the pipeline, then pause.
* `cix resume` - will run the pipeline to completion.


## Loading a pipeline

First, start a server:
```shell
cix server -l console # the default for server is '-l files', for this demo let's log to console
```

Let's load a pipeline:

```shell
cix load -y docs/examples/phased-exec.yaml
```

Load works just like `cix exec`, you can provide environment variables and secrets.

```shell
cix load -y docs/examples/phased-exec.yaml -e FOO='foo' -s P4_PASSWORD='password'
```

If the server resides on another server or is running on an alternate port, you can specify either --host or --port.

```shell
cix load -y docs/examples/phased-exec.yaml --host '10.10.10.10' --port '8080'
```


## Describing the pipeline step order

* [docs/examples/phased-exec.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/phased-exec.yaml) 

[Error loading section, please refresh](../examples/phased-exec.yaml ':include :type=code')

```shell
cix load -y docs/examples/phased-exec.yaml # from previous section
cix describe
```

```json
{
  "name": "Pipeline 56114",
  "steps": [
    {
      "name": "first"
    },
    {
      "name": "group",
      "steps": [
        {
          "name": "second"
        },
        {
          "name": "third"
        }
      ]
    },
    {
      "name": "fourth"
    },
    {
      "name": "fifth"
    }
  ]
}
```

## Resuming a pipeline to completion

```shell
cix load -y docs/examples/phased-exec.yaml # from previous section
cix resume
```

Is equivalent to running to a `cix exec` where exec loads and runs a pipeline to completion in one step.

```shell
cix exec -y  docs/examples/phased-exec.yaml
```

You can also run `cix exec` against a remote server. The previous exec example does not communicate with a server.
```shell
cix exec -y  docs/examples/phased-exec.yaml --remote
```

?> `cix resume` at this time is non-blocking, meaning you'll need to check the the status to see when it is complete
```shell
cix resume
cix pipelines --status
```

## Resuming a pipeline to a specific step

Will run a pipeline to specific step. If the step doesn't exit, it would continue to completion.

The following example would run to and including the step 'second', then pause.
```shell
cix load -y docs/examples/phased-exec.yaml # from previous section
cix resume --to second
```

In the case of the phased-exec.yaml, there is no step called 'something' so it would just run to the end.
```shell
cix load -y docs/examples/phased-exec.yaml # from previous section
cix resume --to something
```

## Running one step at a time

This will run one step at a time. Take the earlier example where we describe the phased-exec.yaml pipeline.
```shell
cix load -y docs/examples/phased-exec.yaml # from previous section
cix describe
```

Then run each step, one at a time.
```shell
cix resume --next
echo "ran first step"
cix resume --next
echo "ran second step"
cix resume --next
echo "ran third step"
cix resume --next
echo "ran fourth step"
cix resume --next
echo "ran fifth step"
cix resume --next
echo "will display error that pipeline is finished"
```

---

In the [next section](tutorials/multiple-pipelines.md) we'll learn how to run more than one pipeline.
