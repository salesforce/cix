# Installing CIX

## Prerequisites
All you need to run CIX is Docker and a shell.

If Docker is not installed on your workstation, these pointers should get you going:

**MacOS**
- Install Docker Desktop for Mac from the Docker web site:
  - Download [Docker Desktop for Mac](https://docs.docker.com/docker-for-mac/install/) and follow the installation instructions.

**Linux**
- Install the `docker-engine` (CE) package for your platform.

## Installing from DockerHub

Pull the image to make sure you've got the latest image:

```
docker pull salesforce/cix:latest
```

Finally, install the `cix` wrapper script into your path using the image's built-in bootstrap:

```
docker run --rm salesforce/cix:latest install | sudo sh
```

## Updating CIX

To update the CIX Image and wrapper script, run the following commands:
```bash
# Updates the CIX Docker Image
cix update
# Updates the CIX Wrapper Script
docker run --rm salesforce/cix:latest install | sudo sh
```

## Testing It
Finally, give CIX a test drive to ensure the wrapper script is working correctly:

```
cix --help
```
---

Now that CIX is installed, learn the basics about a CIX pipeline in the [next section](getting-started/pipeline.md).
