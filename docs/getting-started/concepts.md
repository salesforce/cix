# Basic CIX Concepts

## Workspace Directory

When CIX is started, the current directory is used as the "workspace", and this is expected to contain your source
code or project that is being built and tested or run by CIX. The workspace is mounted into each container that is
started by the pipeline under the path `/cix/src`.

Your pipeline definition (YAML) files are also expected to be accessible from under this path.

## Container Network

In Docker mode, CIX creates a private network for the containers of a pipeline. This allows the containers to communicate
freely with each other, while being isolated from other containers on the host.

It also allows for private DNS resolution, so that containers may refer to each other by their simple step names and
`hostname` aliases.

Containers in the same pipeline can also communicate with each other without need to export or specify ports. Containers
can connect to other concurrent containers on any port.

These topics are covered in more detail in the [Background Services](tutorials/background) tutorial.

---

Now that you understand some basics, check out the [Tutorials](tutorials/commands) to learn more about CIX.
