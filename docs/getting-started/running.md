# Running CIX Demo Pipelines

For general CIX command usage, refer to the [CIX Command Line Reference](/reference/cli).

Here we'll describe how to run the included demo pipelines and take a look at their source code to
see how CIX pipelines are constructed.

## Get the Demos

To run these demos, you will need to sync out the CIX project from GitHub:

```bash
git clone --depth=1 git@github.com:ci/cix.git
cd cix
```

The demo pipelines are found in the `docs/examples` directory.

## Running a Pipeline

Once you have CIX installed and a clone of the CIX source repository, you can run the `basic` demo
to get a sense of the execution process and see CIX in action. The `basic` demo is a minimal
workflow that uses a publicly available Docker image and simply outputs the hostname of the pipeline
step's container.

[GitHub Source](https://github.com/salesforce/cix/blob/master/docs/examples/basic.yaml)

[Error loading section, please refresh](../examples/basic.yaml ':include :type=code')

To launch this example, run the following command in your terminal:

```bash
cix exec -y docs/examples/basic.yaml
```

## Inspecting Docker

Let's have a look at the Docker objects created when CIX executes a pipeline step. Modify the
`basic.yaml` example to add a pause after the hostname command, which will allow you to run some docker
commands to see the resources CIX creates and uses.

1. Open `docs/examples/basic.yaml` in your editor.
2. Add a new line to the end of the file, which will add the `sleep` command to the list of commands
(be sure to preserve the same number of leading spaces as the previous line on the new line, and ensure
they are not replaced with tabs):
```yaml
    commands:
      - hostname
      - sleep 300        <-- add this line
```
3. Save the file.

Now execute the pipeline again, and then open another terminal and have a look around.

```
$ cix exec -y docs/examples/basic.yaml
2020-07-15T01:22:57Z  INFO 	Starting Pipeline: 7aa5d76e-a5a0-4353-9d2c-429c685fabfb
2020-07-15T01:22:57Z  INFO 	Swagger ready at http://localhost:10030/api-docs
2020-07-15T01:22:58Z  INFO 	Starting serial step group 'Pipeline 7aa5d76e'
2020-07-15T01:22:58Z  INFO 	Starting step 'basic'
basic                | + [2020-07-14T17:22:59-0800] hostname
basic                | basic
basic                | + [2020-07-14T17:22:59-0800] sleep 300
```

Open a new terminal and run some `docker` commands to see the created resources:

```
$ docker ps
CONTAINER ID        IMAGE                                                  COMMAND                  CREATED             STATUS              PORTS                      NAMES
056a7a480c62        alpine:3.9                                             "/usr/bin/cixrc"         39 seconds ago      Up 37 seconds                                  cix-7aa5d76e-basic
406cf7334af4        salesforce/cix:latest   "/usr/local/lib/node…"   46 seconds ago      Up 44 seconds       0.0.0.0:10030->10030/tcp   elastic_hopper
```

In the CONTAINERs listing above, we can see that there are two containers currently (this
can vary based on parallel steps, other containers your system is running, etc). The first one is
the container of the first step. The name is "cix-7aa5d76e-basic", which is comprised of a random
part which ensures names are unique on the system (actually a part of the Pipeline ID generated
by CIX to identify each pipeline it is executing), and the step name.

The second container is CIX itself. This one was started by the `cix` shell command. It has a server
component which enables persistence of data for the pipeline as well as phased execution.

```
$ docker network ls
NETWORK ID          NAME                DRIVER              SCOPE
0cb73b2af308        bridge              bridge              local
165378e18dc6        cix-7aa5d76e        bridge              local
adeb44db60f9        host                host                local
c61df0dc12ae        none                null                local

$ docker volume ls
DRIVER              VOLUME NAME
local               cix-7aa5d76e-bin
local               cix-7aa5d76e-libexec
```

These next two listings show the Docker network created for our execution and the storage volumes
needed by CIX. They all share the same Pipeline ID prefix as the containers.

## Jumping into a Container

When you have a long running container, you can connect to it using the typical means provided by
`docker` commands, such as `exec`, `attach`, and `logs`. Note that to start a shell your target
container must contain a shell command, such as `/bin/sh` or `/bin/bash`. Some images may not
provide a usable shell, in which case you may have to get creative with how to troubleshoot issues.

Start up the `basic` pipeline again, if it's not still running, and connect to the step container:

```bash
docker exec -it -w /cix/src cix-7aa5d76e-basic /bin/sh
```

The path `/cix/src` is the default location where CIX mounts the current directory from the host
into each container that it starts. In a typical CI or development case this is usually the
workspace containing the project's source code.

Since you're now in a shell in the container, you are in a separate process and can look around the
container, look at logs and other data while whatever the container is already running continues to
execute (in our case, that's just the `sleep`).

---

Now that you can run CIX, check out some core concepts in the [next section](getting-started/concepts.md).
