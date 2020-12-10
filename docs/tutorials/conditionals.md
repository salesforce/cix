# Conditional Steps

Conditional expressions, which are introduced using the `when` attribute, allow a step to be conditionally executed
based on the evaluation of several operators. The values which the operators evaluate may be provided by environment
parameters passed to CIX, supplied as strings in the pipeline definition, or set by previous steps.

## YAML Property

[Error loading section, please refresh](../shared/conditionals.md ':include')

## Examples

The following example demonstrates the usage of each operator.

* [docs/examples/conditional.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/conditional.yaml)

[Error loading section, please refresh](../examples/conditional.yaml ':include :type=code')

To launch this example, run the following command in your terminal:

```bash
cix exec -y docs/examples/conditional.yaml
```

---

Next let's learn about [Importing Files](/tutorials/import.md). 
