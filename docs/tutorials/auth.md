# Registry Authentication

CIX supports the use of private/authenticated image registries for Docker images used by step definitions (`image` attribute in your YAML step definition). Please ensure you are using a [safe method of providing secrets](/tutorials/secrets?id=secrets-passed-via-stdin) when passing your registry password to CIX.

*Note: CIX currently supports basic-auth with Docker registries (i.e. CIX supports username+password or username+key). Other method are unsupported at this time, and this may disqualify some registries from use in a step definition.*

## How to use the Registry attribute

[Error loading section, please refresh](../shared/registry.md ':include')

## Example

* [docs/examples/registry.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/registry.yaml) 

[Error loading section, please refresh](../examples/registry.yaml ':include :type=code')

To launch this example, run the following command in your terminal:

```bash
cix exec -y docs/examples/registry.yaml -e INTERNAL_REPO_USERNAME={your_username} -s INTERNAL_REPO_PASSWORD={your_password}
```
---

In the [next section](tutorials/plugins.md) we'll learn how to extend some CIX functionality with plugins.
