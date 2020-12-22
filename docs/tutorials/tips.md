# Additional Topics

### Docker outside of Docker
Learn how to communicate with the host's Docker engine from within a CIX step (Docker-outside-of-Docker).

* [docs/examples/docker.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/docker.yaml) 

[Error loading section, please refresh](../examples/docker.yaml ':include :type=code')

To launch this example, run the following command in your terminal:

```bash
cix exec -y docs/examples/docker.yaml
```

### Set +e
?> The default commands mode is `set -e` or 'fail on error.' You can easily change the mode from within your commands set with `set +e`.
See the demo for an example of this behavior change in action.

* [docs/examples/set_plus_e.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/set_plus_e.yaml) 

[Error loading section, please refresh](../examples/set_plus_e.yaml ':include :type=code')

To launch this example, run the following command in your terminal:

```bash
cix exec -y docs/examples/set_plus_e.yaml
```
