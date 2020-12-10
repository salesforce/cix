# Environment Variables

Environment variables must be passed to CIX at yaml load time (`cix load`, `cix exec`) and can be an effective way to pass information into the Docker container used in a particular step. Environment variables (and secrets) will only be available to the Docker images in steps which explicitly import them. 

?> **Work In Progress** TODO: describe dynamic variables here.

## YAML Property
[Error loading section, please refresh](../shared/environment.md ':include')

### Working with Bash

```bash
# save foo to environment variable var
var="foo" # saves foo to var (white space is important here)
export var="foo" # saves foo to var and allows access via sub-processes (white space is important here)
var='foo!' # single quotes must be used for certain special characters: https://www.tldp.org/LDP/abs/html/special-chars.html

# helper commands can be accessed with command substitution: http://tldp.org/LDP/abs/html/commandsub.html
# it is generally a good idea to surround the substitution with double quotes to ensure 
# the returned value is not interpreted directly by bash (and whitespace preserved), 
# but instead is passed as a string to CIX
cix exec -y docs/examples/environment.yaml -e FOO_FROM_COMMAND="$(curl www.google.com)"
```

## Examples

### CLI Variables

* [docs/examples/environment.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/environment.yaml) 

[Error loading section, please refresh](../examples/environment.yaml ':include :type=code')

To launch this example, run the following command in your terminal:

```bash
cix exec -y docs/examples/environment.yaml -e FOO_FROM_COMMAND=foo -e BAR_FROM_COMMAND=bar
```

### Dynamic Variables
  
* [docs/examples/environment-passing.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/environment-passing.yaml) 

[Error loading section, please refresh](../examples/environment-passing.yaml ':include :type=code')

To launch this example, run the following command in your terminal:

```bash
cix exec -y docs/examples/environment-passing.yaml
```

---

Now that you've tried environment variables, check out its secure counterpart secrets in the [next section](tutorials/secrets.md).
