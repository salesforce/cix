## CIX Pipeline Introduction

CIX pipelines are written in YAML. If you are unfamiliar with YAML, please review the [YAML Syntax section below](#yaml-syntax).

A pipeline is a series of steps. In a most basic pipeline, each step is executed sequentially, and usually includes a name, docker image, and set of commands. Like so:
```yaml
step:
  name: hello_world
  image: alpine:3.9
  commands:
    - echo "hello world"
```

> 💡Tip: Use an editor like [VS Code](https://code.visualstudio.com/) with a [YAML linter](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) to avoid common whitespace typos.

Every CIX pipeline must contain a `version` and `pipeline` attribute. Here is a complete CIX YAML with two steps run sequentially.
```yaml
version: 2.1
pipeline:
  - step:
      name: first
      image: alpine:3.9
      commands:
        - echo "hello from first step, pausing for 3 seconds..."
        - sleep 3
  - step:
      name: second
      image: alpine:3.9
      commands:
        - echo "hello from second step!"
```

If you already have CIX installed you can validate the YAML with the `validate` command, as in the following:

```sh
cix validate --yaml path/to/cix.yaml
```

---

Now that we've got some YAML basics, let's learn how to execute a pipeline in the [next section](getting-started/running.md).
