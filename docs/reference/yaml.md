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
    http_authorization_token: "optional-auth-token-on-http(s)-imports"

pipeline:
  - step:
      name: string
      image: repo/string:tag
      pull-policy: Default | Always | IfNotPresent | Never
      ports:
        - "port:port"
        - port
      volumes:
        - "/path:/path[:ro]"
      hostname: string
      working-dir: /path
      background: false | true
      privileged: false | true
      environment:
        - name: string
          value: string
          default: string
      when:
        - operator: EQ | NEQ | IS_SET | IS_NOT_SET | GTE | GT | LTE | LT | EXISTS | NOT_EXISTS | OR | INCLUDES | NOT_INCLUDES
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

### version {docsify-ignore}

Number. Required.

The CIX YAML file must specify a numeric version. Currently, that is `2.1` (as a number, the value should not be quoted).

```yaml
version: 2.1
```

[Error loading section, please refresh](../shared/registry.md ':include')

### pipeline {docsify-ignore}

Begins the pipeline definition, which is a collection of steps, [imports](#imports), and [step groups](#steps).

### step {docsify-ignore}

Defines a pipeline step - that is, a container. Supported attributes are described below, only `name` and `image`
are required.

#### arguments {docsify-ignore}

List of strings.

A list of command arguments to pass to the image's default ENTRYPOINT executable. Mutually exclusive with the `commands`
attribute.

```yaml
arguments:
  - --work-dir
  - /cix/src
  - start
```

#### background {docsify-ignore}

Boolean, default `false`.

When `true`, the step will be executed asynchronously from the remaining pipeline. Therefore, this can be used to
start "services" which are required by subsequent steps.

Containers terminate when there is no longer a process with PID 1, so if your process detaches from the standard file
descriptors (stdin, stdout, and stderr) and starts a new process group ("daemonizes"), then you will need to otherwise
prevent your container from exiting (such as a while loop which waits for the desired process to exit). If possible,
your process should remain in the foreground.

#### commands {docsify-ignore}

A list of shell command strings to be executed after the container is started. These commands are added to a
script which is injected into the container and replaces the container's default ENTRYPOINT. Mutually exclusive with
the `arguments` attribute.

```yaml
commands:
  - echo Hello world
  - cp /src/file /tmp
```
 
##### Tips & Caveats for `commands` {docsify-ignore}

The YAML "literal block scalar" operator is great for specifying multi-line expressions. It avoids having to escape special
YAML characters or cram a complex shell statement into one long line with semicolons. It looks like this:

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

#### commands-shell {docsify-ignore}

String, default `/bin/sh`.

Configures an alternative interpreter to execute `commands`. By default, CIX uses the Bourne shell (`/bin/sh`), however
some images may also provide a separate `/bin/bash`, or another language entirely (Python, NodeJS, etc).

```yaml
commands-shell: /bin/bash
```

#### continue-on-fail {docsify-ignore}

Boolean, default `false`.

When `true`, a non-zero exit code will be ignored and the pipeline will continue. Otherwise, a failed step will cause
the pipeline to abort.

A step's status is determined by the first command to fail within the step (or the last command if all prior commands
are successful). If using the Bourne shell, `set +e` can be called to ignore failed intermediate commands. Then only the
last command's status will be used to determine the outcome of the step.

[Error loading section, please refresh](../shared/environment.md ':include')

#### hostname {docsify-ignore}
 
String.

Specifies an alias hostname for the container, in addition to the step name. Any hostname can be chosen, from a
simple word (“db” or “web”) to a fully-qualified hostname such as “www.salesforce.com”. The internal DNS server
will resolve this name to the container's address for all other containers on the same network (that is, within
the same pipeline).

##### More On Container Names {docsify-ignore}

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

#### image {docsify-ignore}

String. Required.

The name of the image for this step. If the image resides on an authenticated registry, you must specify the
`registry` entry for the registry and provide authentication credentials.

#### loop {docsify-ignore}

Integer.

Causes the step to be repeated the number of times specified.
 
#### name {docsify-ignore}

String. Required.

The container will be given this name as its hostname on the Docker network. Other containers can refer to it using
this name. See the `hostname` attribute for more details on container hostnames.

#### ports {docsify-ignore}

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

#### privileged {docsify-ignore}

Boolean, default `false`.

Enables the Docker privileged mode where containers have additional access to the host's devices and kernel features,
primarily required for using Docker-in-Docker (a Docker Engine running fully inside a container).

See the [Docker documentation on the --privileged
option](https://docs.docker.com/engine/reference/commandline/run/#full-container-capabilities---privileged) for more
details.

#### pull-policy {docsify-ignore}

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

#### retry {docsify-ignore}

Must specify `iterations:` and `backoff:` values, which are both integers.

Causes the step to be retried if it fails (exits with a non-zero status). It will be retried up to `iterations` times,
with a delay of `backoff` seconds between attempts.

```yaml
retry:
  iterations: 3
  backoff: 30
```
  
#### timeout {docsify-ignore}

Integer, in seconds.

Causes the step to fail if it takes longer than the specified number of seconds.

#### volumes {docsify-ignore}

List of volumes to mount in the container.

```yaml
volumes:
  - /tmp:/hosttmp
  - /var/log:/hostlogs:ro
```

[Error loading section, please refresh](../shared/conditionals.md ':include')

#### working-dir {docsify-ignore}

String, default `/cix/src`.

Specifies an alternative current-working-directory when the container starts.

## Advanced Topics

### steps {docsify-ignore}

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
 
#### name {docsify-ignore}

String. Required.

Provides a name for the group of steps.

#### parallel {docsify-ignore}

Boolean, default `false`.

If set to `true`, the steps in the step group will be run concurrently.

#### pipeline {docsify-ignore}

Begins the declaration of sub-steps and step groups which will be grouped as a unit. Accepts all the
attributes available to the top level `pipeline` directive.

Step groups may contain nested groups.

### imports {docsify-ignore}

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
    http_authorization_token: my-awesome-optional-http-authorization-token

pipeline:
  . . .
```

#### Using Imported Steps and Pipelines {docsify-ignore}

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
