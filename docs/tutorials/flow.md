# Retry, Timeouts and Loops

Several flow control mechanisms are available as attributes you can apply to a step. Their purpose is, generally, to allow users to avoid implementing a command line solution for looping and retry mechanics within steps.

In order to illustrate the differences in readability and ease of understanding between a bash implementation and a pure CIX implementation of retry:

```yaml
version: 2.1
pipeline:
  - step:
      name: bash_example
      image: alpine:3.9
      commands:
        - |
          for i in $(seq 1 5); do
            wget bad-address && s=0 && break || s=$? && sleep 15
          done
          exit $s
```

becomes:

```yaml
version: 2.1
pipeline:
  - step:
      name: cix_example
      image: alpine:3.9
      commands:
        - wget bad-address
      retry:
        iterations: 5
        backoff: 15
```

### Loops
Learn how to use CIX's looping mechanism. There are two types of loops:
1. A basic `loop` with a integer to represent how many loops to complete. The loop may optionally include a `counter-variable` attribute. This will add a counter environment variable for the step. 
2. A `for-each` style loop. The `for-each` can take either a `yaml` list or a CSV list. An `element-variable` attribute is required for this style of loop. The element-variable will add an environment variable to that step with the current element being iterated over. The `for-each` may also optionally include a `counter-variable` attribute, just like the standard `loop`. This will add a counter environment variable for the step.

Any loop iteration with a non-0 exit code will cause a pipeline failure. There also exists a `parallel` attriute to run the looped steps in parallel.


* [docs/examples/loop.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/loop.yaml) 

[Error loading section, please refresh](../examples/loop.yaml ':include :type=code')

To launch this example, run the following command in your terminal:

```bash
cix exec -y docs/examples/loop.yaml
```

### Retry
Learn how to use CIX's retry mechanism. The retry will kickoff if a non-0 exit code is encountered in an iteration.
A pipeline failure will only occur if the last retry iteration ran causes a non-0 exit code.

* [docs/examples/retry.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/retry.yaml) 

[Error loading section, please refresh](../examples/retry.yaml ':include :type=code')

To launch this example, run the following command in your terminal:

```bash
cix exec -y docs/examples/retry.yaml
```

### Timeouts
Learn how to use CIX's timeout mechanism. The demo's step will randomly sleep for 15 seconds. Try to experiment with the
timeout values on your own, to get an idea of how it will function in your substrate. As an example, a timeout of 15 seconds on a step containing only a `sleep 15` will always cause a timeout exception,
given the timeout applies to the step overall (including pulling the image, starting the image, etc.).

* [docs/examples/timeout.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/timeout.yaml) 

[Error loading section, please refresh](../examples/timeout.yaml ':include :type=code')

To launch this example, run the following command in your terminal:

```bash
cix exec -y docs/examples/timeout.yaml -e TIMEOUT_IN_SECONDS=15
```

---

Let's build on this in the next section and learn about [Conditional Steps](/tutorials/conditionals.md).
