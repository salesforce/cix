#### environment

Defines a list of key-value pairs in the step definition representing environment variables which will be accessible from within a step's container. In order to access a value passed to CIX, either in the value field or the default field, the `$$` notation must be used. A default value may be defined in the default field, which will be used in the case where a value is not provided via the value field (either statically or passed to CIX).

By default, environment variables and secrets passed to CIX are not provided to any step which does not explicitly define them within an environment block. Below is an example of these two concepts:
```yaml
environment:
  - name: FOO
    value: foo # statically defined
  - name: BAR
    value: $$BAR_FROM_COMMAND # value passed in via '-e BAR_FROM_COMMAND=bar'
    default: bar # $$BAR_FROM_COMMAND can also be used here
```

CIX provides some helpful predefined environment variables to every container, documented [here](/reference/environment.md).