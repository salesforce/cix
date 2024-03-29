# Environment Reference

These environment variables will automatically be set for each CIX execution.

`CIX_CONTAINER_NAME`

The fully-qualified name of the container on the CIX host, composed of the unique network name
and the step name (e.g., `cix-XYZab-stepname`). This name should not be used for network connections.


`CIX_EXECUTION_ID`

The ID of the running pipeline. This is mostly used for interfacing with the Server API.

`CIX_HOSTNAME`

The name of the host running CIX (e.g., your workstation or server). This variable is defined only
when cix is started via the wrapper shell script (`cix`, refer to the [Getting Started](../getting-started.md)
document for installation instructions).

`CIX_NETWORK_NAME`

The name of the isolated network created for this pipeline (e.g., `cix-XYZab`). Especially useful
when using docker-outside-of-docker (the host's `docker.sock` is mounted into the container) to attach new containers
to the Docker network used within a CIX execution.

`CIX_SERVER_PORT`

The port number on which the CIX server is listening. This variable defaults to 10030.

`CIX_STEP_NAME`

The name of the step for which this container is being run (from the YAML `name:` attribute). It
will be the container's hostname, unless the optional `hostname:` attribute is supplied. Either of these names may
be used to address the host on the Docker network.

`CIX_TEMP`

The temp directory of CIX, persists through steps as a docker volume. Defaults to `/cix/tmp`.

`CIX_WORKDIR`

The working directory of the container, defaults to `/cix/src`. Almost always is the same as the workspace bind volume mount (see ``CIX_WORKSPACE`).

`CIX_WORKSPACE`

 Where the workspace is mounted, defaults to `/cix/src`.



# Example 
* [docs/examples/environment-built-ins.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/environment-built-ins.yaml) 

[Error loading section, please refresh](../examples/environment-built-ins.yaml ':include :type=code')
