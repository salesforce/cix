# Background Services

CIX ordinarily runs each step in a pipeline sequentially, one after the other. One step must complete
before the next one is started. In some cases you may want to start a container that acts as a "service"
in that it is started and then continues to run while subsequent steps are executed. It may bring up
a network server that other steps access, or do any number of other concurrent "background" tasks.

This is accomplished with the [`background`](/reference/yaml?id=background) step attribute:

```yaml
  - step:
      name: web-service
      image: nginx
      background: true
```

When `background` is `true`, CIX starts the step's container in the order it is listed in the pipeline,
but it does not wait for the container to exit. Should the background container exit prematurely with a
non-zero status code, the pipeline will fail.

Any background containers that remain at the conclusion of the pipeline will be terminated by CIX. If your
background process requires a managed shut down, it should install a signal handler for the TERM signal.

## Foreground Process

A common problem users face when trying to create a background step is that the container exits
*too soon*. The process that is started in the container should not daemonize or detach from the standard
file descriptors (this is typically known as "remaining in the foreground" and applications may provide
a command-line option to accomplish this when their default behavior is to go into the background).

When a container is brought up the first process started in it is given process ID 1, and is treated
specially by the container runtime. Signals are only sent to PID 1, and it is the only process that
Docker cares about. Once PID 1 exits, the container is terminated.

If your background step runs shell commands, the shell itself is PID 1. Once the list of commands is
complete the container will exit unless there is some sort of blocking operation that keeps the shell
alive.

## Network Ports

Since all containers in the pipeline are attached to the same container network, they can
speak to each other freely on any port, so there is no need to expose ports using the
[`ports`](/reference/yaml?id=ports) attribute. The `ports` attribute can still be used to expose ports
to the host if that is required.

## Examples

Learn how Inter-container Communication works in CIX. Please read the YAML and see if the execution
behaves how you would expect.

* [docs/examples/icc.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/icc.yaml)

[Error loading section, please refresh](../examples/icc.yaml ':include :type=code')

To launch this example, run the following command in your terminal:

```bash
cix exec -y docs/examples/icc.yaml
```

---

In the [next section](tutorials/phased-exec.md) we'll learn how to pause and resume pipelines.
