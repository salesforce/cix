### registry

Top-level directive which provides credentials for authenticating to private image registries.

A registry may be specified using one of two formats. The newer format provides an aliasing mechanism and the
ability to override the registry name using a command-line variable.

The original format simply associates registry login credentials with the hostname:

```yaml
version: 2.1

registry:
  registry.host.domain:
    username: $$EXTERNAL_VARIABLE
    password: $$SECRET_VARIABLE
    retry:
      iterations: 3
      backoff: 120

pipeline:
  . . .
  - step:
      image: registry.host.domain/path/to/image:tag
```

The new format defines an alias and hostname, with optional default value should the name contain a variable which
is not defined. Use the alias when referring to the registry in the step `image` attribute. Aliases may not include
the period (`.`) character.

```yaml
version: 2.1

registry:
  registry-alias:
    host:
      name: $$REGISTRY_OVERRIDE
      default: registry.host.domain
    username: $$EXTERNAL_VARIABLE
    password: $$SECRET_VARIABLE
    retry:
      iterations: 3
      backoff: 120

pipeline:
  . . .
  - step:
      image: registry-alias/path/to/image:tag
```

Another application of aliases is to define several registries in the YAML and then select a specific one using a
variable.

```yaml
version: 2.1

registry:
  reg-option1:
    host:
      name: registry1.domain
    username: $$EXTERNAL_VARIABLE
    password: $$SECRET_VARIABLE
  reg-option2:
    host:
      name: registry2.domain
    username: $$EXTERNAL_VARIABLE
    password: $$SECRET_VARIABLE
  reg-option3:
    host:
      name: registry3.domain
    username: $$EXTERNAL_VARIABLE
    password: $$SECRET_VARIABLE

pipeline:
  . . .
  - step:
      image: $$REGISTRY_OPTION/path/to/image:tag
```

Then specify the alias to use on the cix command line:

```
$ cix exec -e REGISTRY_OPTION=reg-option3
```

An optional `retry` configuration may be specified, which will cause CIX to retry an image pull if it receives a 500
server error. This usually indicates a timeout or authentication failure. The default behavior is to attempt a pull only
once. If `iterations` is specified and is greater than 1, the default `backoff` is 120 seconds.
