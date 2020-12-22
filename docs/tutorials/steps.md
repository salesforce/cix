# Grouped Steps

The YAML attribute `steps` (please note the pluralization) is a grouping of one or more `step` attributes.

The syntax is as follows:
```yaml
  - steps:
      name: example
      pipeline:
        - step:
            . . .
        - step:
            . . .
```

A `steps` group is useful for a variety of reasons:
1. Running more than one `step` in parallel. [Example below](/tutorials/steps?id=parallel-steps).
2. Importing a `steps` group from another file. Refer to [Importing Files](/tutorials/import.md) for more.
3. Conditionally running a `steps` group based on an environment variable. Refer to [Conditional Steps](/tutorials/conditionals.md) for more.
4. Ability to add retry, timeouts and loops to a `steps` group. Refer to [Retry, Timeouts and Loops](/tutorials/flow.md) for more.
5. Ability to nest a `steps` group within another `steps` group as shown in the [example below](/tutorials/steps?id=nested-steps).

## Examples

### Parallel Steps

* [docs/examples/steps.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/steps.yaml)

[Error loading section, please refresh](../examples/steps.yaml ':include :type=code')

To launch this example, run the following command in your terminal:

```bash
cix exec -y docs/examples/steps.yaml
```

### Nested Steps

* [docs/examples/steps.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/nested_steps.yaml) 

[Error loading section, please refresh](../examples/nested_steps.yaml ':include :type=code')

To launch this example, run the following command in your terminal:

```bash
cix exec -y docs/examples/nested_steps.yaml
```

---

Next we'll learn about [Retry, Timeouts and Loops](/tutorials/flow.md).
