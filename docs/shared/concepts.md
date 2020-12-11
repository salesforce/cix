## CIX Concepts

When CIX starts your pipeline, each step (container) is executed with the workspace mounted at the
path `/cix/src`. The workspace persists across all steps.

Steps are executed sequentially by default, although there is a mechanism to run a group of steps
in parallel, and ordinarily a failed step will terminate the pipeline. A failed step is one in
which any of its commands exits with a non-zero status. The [`continue-on-fail`](/reference/yaml?id=continue-on-fail)
attribute is available to modify this behavior.
