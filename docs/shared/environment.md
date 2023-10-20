#### environment

Defines a list of key-value pairs in the step definition representing environment variables which will be accessible from within a step's container. 

In order to assign a value passed to CIX to the environment of a step, the `$$` notation can be used in either the `value` field or the `default` field. For example: `value: $$BAR` and `default: $$BAR_DEFAULT` will use the values from `-e BAR=bar` and `-e BAR_DEFAULT=bar-default`, respectively.

If the `value` field is omitted from the YAML environment item, the `value` field will also automatically be defined as `$$` prepended to the `name` field. For example: `name: BAZ` will infer `value: $$BAZ` if the `value` field is left undefined in the YAML definition. 

A default environment value may be defined in the `default` field, which will be used in the case where a resolvable value is not provided to CIX. In the example below: `default: baz-default` will cause `BAZ` to equal `baz-default` within the step's environment if `-e BAZ=baz` is not provided to CIX, because CIX was not passed a value for `$$BAZ`.

!> **Important** For security purposes, environment variables and secrets passed to CIX are not provided to any step which does not explicitly define them in a YAML environment block.

Below is an example of these concepts:
```yaml
environment:
  - name: FOO
    # value statically defined
    value: foo
  - name: BAR
    # value passed in via '-e BAR=bar'
    value: $$BAR
    # default passed in via '-e BAR_DEFAULT=bar-default'
    default: $$BAR_DEFAULT
  - name: BAZ
    # when value is omitted, value == $$BAZ,
    # passed in via '-e BAZ=baz'
    default: baz-default
```

CIX provides some helpful predefined environment variables to every container, documented [here](/reference/environment.md).