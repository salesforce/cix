# CIX 2.1 YAML Reference

Your guide to every YAML attribute available in CIX 2.1.

[Error loading section, please refresh](../shared/yaml-syntax.md ':include')

[Error loading section, please refresh](../shared/concepts.md ':include')

## Complete CIX 2.1 YAML

```yaml
version: 2.1

registry:
  registry-alias:
    host:
      name: $$REGISTRY_OVERRIDE
      default: internal-repo.com
    username: $$INTERNAL_REPO_USERNAME
    password: $$INTERNAL_REPO_PASSWORD
    retry:
      iterations: 3
      backoff: 120
  internal-repo.com:
    username: $$INTERNAL_REPO_USERNAME
    password: $$INTERNAL_REPO_PASSWORD
    retry:
      iterations: 3
      backoff: 120

imports:
  import-name:
    src: path-to-yaml-file
    http-authorization-token: "optional-auth-token-on-http(s)-imports"

pipeline:
  - step:
      name: string
      image: repo/string:tag
      user: <name|uid>[:<group|gid>]
      pull-policy: Default | Always | IfNotPresent | Never
      loop: Int
      counter-variable: COUNTER
      for-each: 
        - list
      for-each: c,s,v
      element-variable: ELEMENT
      ports:
        - "port:port"
        - port
      volumes:
        - "/path:/path[:ro]"
      hostname: string
      workspace-mount-point: /cix/src
      working-dir: /path
      background: false | true
      privileged: false | true
      environment:
        - name: string
          value: string
          default: string
      when:
        - operator: EQ | NEQ | IS_SET | IS_NOT_SET | GTE | GT | LTE | LT | EXISTS | NOT_EXISTS | OR | INCLUDES | NOT_INCLUDES | AND | STARTS_WITH | ENDS_WITH
          value: $$VALUE
          value-default: default-value
          other: $$OTHER
          other-default: default-other
          values: # When Operator is EXISTS or NOT_EXISTS
            - value: $$ON_EXISTS_OPERATOR
              default: something
            - value: $$ON_NOT_EXISTS_OPERATOR
              default: something
          conditions: # When Operator is OR
            - operator: ...
        - operator: MATCHES | NOT_MATCHES
          value: $$VALUE
          expressions: $$REGEXP
          delimiter: ',' #delimiter is optional. By default ',' comma is taken as delimiter 
      arguments:
        - arg1
        - arg2
      commands:
        - echo command
        - echo command1;
          echo command2
        - |
          if multi-line; then
            statement1
          fi
          statement2
      commands-shell: /bin/sh | /bin/bash | ...
      loop: integer
      retry:
        iterations: integer
        backoff: integer
      timeout: integer
      continue-on-fail: false | true

  - import:
      - import-name.step-set:
          environment:
            - name: string
              value: string
              default: string
      - import-name.step-set2

  - steps:
      name:
      parallel: false | true
      pipeline:
        - step:
            . . .
```

## Basic YAML Attributes

### version

Number. Required.

The CIX YAML file must specify a numeric version. Currently, that is `2.1` (as a number, the value should not be
quoted).

```yaml
version: 2.1
```

[Error loading section, please refresh](../shared/registry.md ':include')

### pipeline

Begins the pipeline definition, which is a collection of steps, [imports](#imports), and [step groups](#steps).

### step

Defines a pipeline step - that is, a container. Supported attributes are described below, only `name` and `image`
are required.

#### arguments

List of strings.

A list of command arguments to pass to the image's default ENTRYPOINT executable. Mutually exclusive with the
`commands` attribute. As a special case, YAML boolean (`true`, `false`) and number (`123`, `3.14`) literals
can be supplied without quotes, but be sure to quote other special YAML syntax that can be interpreted as
structures or objects.

```yaml
arguments:
  - --work-dir
  - /cix/src
  - --timeout
  - 120
  - --enable-check
  - true
  - --data
  - '{}'
  - start
```

#### background

Boolean, default `false`.

When `true`, the step will be executed asynchronously from the remaining pipeline. Therefore, this can be used to
start "services" which are required by subsequent steps. The exit status of background steps is ignored, and a failure
will not abort the pipeline.

Containers terminate when there is no longer a process with PID 1, so if your process detaches from the standard file
descriptors (stdin, stdout, and stderr) and starts a new process group (known as "daemonizing"), then you will need to
otherwise prevent your container from exiting (such as a while loop which waits for the desired process to exit). If
possible, your process should remain in the foreground.

#### commands

A list of shell command strings to be executed after the container is started. These commands are added to a
script which is injected into the container and replaces the container's default ENTRYPOINT. Mutually exclusive with
the `arguments` attribute. As a special case, YAML boolean (`true`, `false`) and number (`123`, `3.14`) literals
can be supplied without quotes, but be sure to quote other special YAML syntax that can be interpreted as
structures or objects.

```yaml
commands:
  - echo Hello world
  - cp /src/file /tmp
```

##### Tips & Caveats for `commands`

The YAML "literal block scalar" operator is great for specifying multi-line expressions. It avoids having to escape
special YAML characters or cram a complex shell statement into one long line with semicolons. It looks like this:

```
commands:
  - |-
    n=1
    while read word; do
      echo $n: $word
      n=$((n + 1))
    done < file
  - echo Then a regular string
```

If you want to augment the container's default ENTRYPOINT with your own commands, you can use `docker inspect` with
the image name to see what its environment variables, ENTRYPOINT, and CMD parameters contain in order to replicate the
image's default behavior in your `commands` section.

The script which executes `commands` is by default run with the `/bin/sh` shell in the container, so you may be
restricted to the limitations of that particular version of the shell which comes with the container's image (e.g.
if it is a strictly POSIX-conforming Bourne shell, you will be prevented from using bash extensions such as arrays,
`[[` expressions, `pushd`, `popd` etc. See the `commands-shell` attribute for a workaround.

An excellent reference to shell scripting can be found here:
[Advanced Bash Scripting Guide](http://tldp.org/LDP/abs/html/index.html).

#### commands-output

String, default `timestamp`.

Changes the default step output behavior, allowing users to simplify the output of their steps without wrapping them in
a script. Allowed options are:
* `timestamp` echoes the commands before their stdout/stderr is displayed, with a timestamp. This is the default
behavior.
* `echo` echoes the commands before their stdout/stderr is displayed, but does not provide a timestamp.
* `minimal` steps will only convey the stdout/stderr of the commands run.

#### commands-shell

String, default `/bin/sh`.

Configures an alternative interpreter to execute `commands`. By default, CIX uses the Bourne shell (`/bin/sh`), however
some images may also provide a separate `/bin/bash`, or another language entirely (Python, NodeJS, etc).

```yaml
commands-shell: /bin/bash
```

#### continue-on-fail

Boolean, default `false`.

When `true`, a non-zero exit code will be ignored and the pipeline will continue. Otherwise, a failed step will cause
the pipeline to abort.

A step's status is determined by the first command to fail within the step (or the last command if all prior commands
are successful). If using the Bourne shell, `set +e` can be called to ignore failed intermediate commands. Then only the
last command's status will be used to determine the outcome of the step.

[Error loading section, please refresh](../shared/environment.md ':include')

#### hostname

String.

Specifies an alias hostname for the container, in addition to the step name. Any hostname can be chosen, from a
simple word (“db” or “web”) to a fully-qualified hostname such as “www.salesforce.com”. The internal DNS server
will resolve this name to the container's address for all other containers on the same network (that is, within
the same pipeline).

##### More On Container Names

A container can be referenced using several names. The first of course is the step name as defined by the `name:`
attribute in the YAML file. This is the preferred name.

A second name can be specified using the `hostname:` attribute, in the case that the container is masquerading as an
external service.

The third name is an internal Docker-specific name, a combination of the randomly-generated network name and
step name. This name should not be directly used by the pipeline. It is the name by which the container is known
outside of the pipeline's network, to give each container a unique name on the CIX host to avoid naming conflicts.

Docker will provide an internal DNS service for your containers. This enables it to resolve container names to IP
addresses. It's not advisable to manipulate the /etc/resolv.conf file, as this will remove the ability to refer to and
connect with other containers by name.

#### image

String. Required.

The name of the image for this step. If the image resides on an authenticated registry, you must specify the
`registry` entry for the registry and provide authentication credentials.

#### loop

Integer.

Causes the step to be repeated the number of times specified.

#### counter-variable

String. Optional for `loop` or `for-each`.

Exports a counter (starting at 1) as an environment variable to the current step iteration. 

#### for-each

YAML List or CSV.

Causes the step to repeated for each element in the list or CSV.

#### element-variable

String. Required for `for-each`.

Exports the element as an environment variable to the step iteration. 

#### name

String. Required.

The container will be given this name as its hostname on the Docker network. Other containers can refer to it using
this name. See the `hostname` attribute for more details on container hostnames.

#### user

String or Integer. Optional.

A string value specifying the user or integer value specifying user-id (uid) inside the container. The user field
accepts a username or UID as well as optional group or GID (format: <name|uid>[:<group|gid>]).
The user value can also be supplied via an environment variable with the `$$` notation.

Default value of uid and gid is 0 (root)

See the [Docker documentation](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/#user) on how
to add usernames in images using Dockerfile

```yaml
pipeline:
  - step:
      name: example
      user: '$$MY_USER'
```

#### ports

List of ports to expose to the external host.

Exposes the listed ports to the host. Note that to communicate between containers within the pipeline, ports do not
need to be exposed. All ports are reachable within the CIX network.

Ports are specified in the form: `external-port “:” internal-port “/” optional-protocol` (protocol is `tcp` or `udp`).
TCP is the default protocol.

Ports may also be specified as a single integer, in which case the same port is used both internally and externally.

```
ports:
  - '8080:80'
  - 9000
```

#### privileged

Boolean, default `false`.

Enables the Docker privileged mode where containers have additional access to the host's devices and kernel features,
primarily required for using Docker-in-Docker (a Docker Engine running fully inside a container).

See the [Docker documentation on the --privileged
option](https://docs.docker.com/engine/reference/commandline/run/#full-container-capabilities---privileged) for more
details.

#### pull-policy

String. Permissible values: `Default`, `Always`, `IfNotPresent`, `Never`

Specifies when CIX will pull the image for a step. It applies to the current step only.

`Always` will pull the image every time, whether it is available locally or not.

`IfNotPresent` will pull the image if it does not already exist locally.

`Never` will never attempt to pull the image from a registry. If it is not present locally, the step will fail.

The `Default` behavior uses the image's tag to determine when to attempt a pull. If the image is tagged 'latest', or
has no explicit tag (which is the same as 'latest'), then the image is `Always` pulled. It is assumed that images
tagged 'latest' should always be updated. If the image is tagged with any other string, the behavior is to pull it
only if it does not exist (i.e., `IfNotPresent`).

`Never` is useful if you require that an image be built locally, and CIX should not look for it in a registry.

```yaml
image: redis
pull-policy: IfNotPresent
```

#### retry

Must specify `iterations:` and `backoff:` values, which are both integers.

Causes the step to be retried if it fails (exits with a non-zero status). It will be retried up to `iterations` times,
with a delay of `backoff` seconds between attempts.

```yaml
retry:
  iterations: 3
  backoff: 30
```

#### timeout

Integer, in seconds.

Causes the step to fail if it takes longer than the specified number of seconds.

#### volumes

List of volumes to mount in the container.

```yaml
volumes:
  - /tmp:/hosttmp
  - /var/log:/hostlogs:ro
```

[Error loading section, please refresh](../shared/conditionals.md ':include')

#### working-dir

String, default `/cix/src`.

Specifies an alternative current-working-directory when the container starts.

#### workspace-mount-point

String, default `/cix/src`.

Specifies an alternative location where the workspace (typically the current directory on the host or the directory
provided to `cix` with the `-w --workspace` option) will be mounted in the container.

## Advanced Topics

### steps

Begins a nested group of pipeline steps and imports.

```yaml

pipeline:

  - steps:
      name: group-name
      parallel: false | true
      pipeline:
        - step:
            . . .
```

#### name

String. Required.

Provides a name for the group of steps.

#### parallel

Boolean, default `false`.

If set to `true`, the steps in the step group will be run concurrently.

#### pipeline

Begins the declaration of sub-steps and step groups which will be grouped as a unit. Accepts all the
attributes available to the top level `pipeline` directive.

Step groups may contain nested groups.

### imports

Top-level directive which introduces an imported set of steps or entire pipeline for use later in the current file.

Each imported set of steps or pipeline is introduced by a key, which will be the name given to the imported pipeline.

```yaml
version: 2.1

imports:
  import-name:
    src: path-to-file.yaml
  another-import:
    src: another-file.yaml
  remote-import:
    src: http://my-awesome-remote-server/foo.yaml
    http-authorization-token: my-awesome-optional-http-authorization-token

pipeline:
  . . .
```

#### Using Imported Steps and Pipelines

Use imported steps and pipelines in your main YAML file, with `import:` followed by a list of the imported steps.
Values are passed into the imported step(s) via environment variables.

```yaml
pipeline:
  - import:
      - import-name:
          environment:
            - name: FOO
              value: bar
```

Step groups (`steps`) and pipelines may be called in their entirety, or as submodules.
