# Secrets

CIX was designed to accept secrets in a few different ways, in order to allow users to strike their own balance between convenience and security. You can pass key-value pair secrets either directly via CLI options or via stdin (when using the appropriate CLI options). CIX pipeline steps can access these secrets by specifying them as [environment variables](tutorials/environment.md) in the step declaration. You should plan on protecting secret variables by controlling your pipeline definition from malicious modifications; either to the images being used or to the environment being made available to a particular step.

## Examples

### Secrets passed directly via the CLI options

!> **Insecure** Secrets passed in this way will be exposed to the process table, and available via **ps** and **history**. Please be wary of using this method to pass your secrets to CIX.

This method of passing secrets is convenient, but should only be used in select circumstances.

* [docs/examples/secrets.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/secrets.yaml) 

[Error loading section, please refresh](../examples/secrets.yaml ':include :type=code')

  ```bash
  cix exec -y docs/examples/secrets.yaml -s SECRET_FOO=foo -s SECRET_BAR=bar
  ```

### Secrets passed via stdin

This method of passing secrets to CIX does not expose them to the process table, and allows for integration with all credential helpers (their output can be piped to stdin or an intermediate script in order to format the credentials). You can pass a single secret with `--secret-stdin KEY`, pass multiple secrets in JSON format with `--secrets-stdin` and prompt the user for a single secret with `--secret-prompt KEY`.

If you are planning on passing multiple credentials to CIX via the `--secrets-stdin` CLI option, [jq](https://stedolan.github.io/jq/) is a handy utility to properly format JSON data. The JSON object passed is a list of the key-value paired secrets. If you need to pass secrets from more than one credential helper, you will likely need to write your own script to gather the credentials and format them.

Note about the examples: Directly echoing the secrets, as we've done in the examples for the sake of simplicity, is not secure. The `echo` command is a stand-in for the credential helper of your choice. 
  
* [docs/examples/secure_secrets.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/secure_secrets.yaml) 

[Error loading section, please refresh](../examples/secure_secrets.yaml ':include :type=code')

  ```bash
  # Interactive prompt
  cix exec -y docs/examples/secure_secrets.yaml --secret-prompt FOO_FROM_PROMPT
  ```

  ```bash
  # Passing single secret
  echo 'bar' | cix exec -y docs/examples/secure_secrets.yaml --secret-stdin BAR_FROM_STDIN
  ```

  ```bash
  # Passing multiple secrets with a JSON formatted object
  echo '{ "BAZ_FROM_JSON_STDIN": "baz", "QUX_FROM_JSON_STDIN": "qux" }' | cix exec -y docs/examples/secure_secrets.yaml --secrets-stdin
  ```

---

In the [next section](tutorials/steps.md), we'll discover how to group steps together to run them in parallel.
