#!/bin/bash
CIX_WRAPPER_VERSION=8

#
# Run and update the CIX (CI Executor) container.
#
# Refer to https://github.com/pages/salesforce/cix/ for more information on CIX.
#
# Usage:
#  cix update           Pull an updated CIX image from the registry.
#  cix install          Output a script which will install or update this wrapper, ideally run it
#                       after 'cix update'. Pipe to 'sudo sh' (cix install | sudo sh).
#  cix --help           Display CIX's general options and supported commands.
#  cix command --help   Display help about a specific command.
#

DEFAULT_CIX_IMAGE=salesforce/cix:latest
DEFAULT_CIX_PORT=10030

# Errandboy passes parameters as an amalgamated string, so break them up on whitespace (this
# prevents whitespace in individual parameter values however).
if [[ $1 == *' '* ]]; then
    set -- $*
fi

# CIX_IMAGE environment variable overrides default. The DOCKER_RELEASE_TAG is just the CIX_IMAGE's tag.
# DOCKER_RELEASE_TAG is passed into the execution so that the user can pin other images to the same tag.
if [[ -z $CIX_IMAGE ]]; then
    CIX_IMAGE=$DEFAULT_CIX_IMAGE
    TAG=$(echo "$@" | egrep -o 'DOCKER_RELEASE_TAG=[[:alnum:].-]+' | cut -d= -f2)
    if [[ $TAG ]]; then
        CIX_IMAGE=${DEFAULT_CIX_IMAGE%:*}:$TAG
    fi
fi

# Updates the CIX Image. This update behavior is implemented within this script. Calling the
# CIX image with the update command will result in an error.
if [[ $1 = update ]]; then
    if ! docker pull $CIX_IMAGE; then
        REGISTRY=$(echo $CIX_IMAGE | cut -d/ -f1)
        echo "Docker pull failed, trying docker login. Please enter your credentials for $REGISTRY"
        docker login $REGISTRY && docker pull $CIX_IMAGE
    fi
    exit $?
fi

# USE_TTY is passed to cix when a terminal is detected. '-it' is required for passing process signals and
# secrets over standard input.
if [[ -t 0 && -t 1 ]]; then
    USE_TTY=-t
fi

# The default port setting is 10030, we need to expose this for the server command, as well as the exec
# command if the --remote option is not set
PORT=$DEFAULT_CIX_PORT

# Extract --port <number> from args.
for (( i = 1; i <= $#; i++ )); do
    if [[ ${!i} = --port ]]; then
        k=$(( $i + 1 ))
        PORT=${!k}
    fi
done

# Helper function to find absolute path given a relative/absolute path
get_abs_filename() {
    echo "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
}

# Extract cixconfig from args (take only first passed) and mount file to CIX image.
for (( i = 1; i <= $#; i++ )); do
    if [[ ${!i} = --configfile || ${!i} = -c ]]; then
        k=$(( $i + 1 ))
        CIXCONFIG=$(get_abs_filename "${!k}") # Docker requires absolute path
        [ ! -f $CIXCONFIG ] && echo "$CIXCONFIG does not exist!" && exit 1
        SET_CIXCONFIG_MOUNT="--mount type=bind,source=$CIXCONFIG,target=/cix/.userconfig"
        SET_CIXCONFIG="-c /cix/.userconfig"
        break
    fi
done

# Expose port to docker only if run with server or exec (without --remote option).
if [[ $1 = server || ( $1 = exec && ! "$@" =~ --remote ) ]]; then
    EXPOSE_PORT="-p ${PORT}:${PORT}"
fi

# By default, docker run will exec(2) over top of this shell process.
EXEC=exec

if [[ $1 = server && ! "$@" =~ --help ]]; then
    SET_NAME="--name cix-${PORT}"
    if [[ " $@ " =~ " -d " || "$@" =~ --detach ]]; then
        DETACH=-d
        EXEC=
    fi
fi

# Only add port if it wasn't explicity added by caller
if [[ $1 && $1 != install && ! "$@" =~ --port ]]; then
    SET_PORT="--port ${PORT}"
fi

# This is used to ensure we always pass a --host for everything but server.
# We use this and host headers to set the environment variable CIX_HOSTNAME
if [[ $1 && $1 != install && $1 != server && ! "$@" =~ --host ]]; then
    SET_HOST="--host $(hostname)"
fi

# Add docker run environment settings
if [[ $LOG_LEVEL ]]; then
    SET_LOGLEVEL="-e LOG_LEVEL=$LOG_LEVEL"
fi

if [[ $DOCKER_HOST ]]; then
    SET_DOCKER_HOST="-e DOCKER_HOST=$DOCKER_HOST"
fi

if [[ $CIX_DOCKER_NETWORK ]]; then
    SET_DOCKER_NETWORK="--network $CIX_DOCKER_NETWORK"
fi

# Detect ENV passthrough options
for (( i = 1; i <= $#; i++ )); do
    if [[ ${!i} = -e || ${!i} = -s || ${!i} = --env || ${!i} = --secret ]]; then
        k=$(( $i + 1 ))
        if [[ ${!k} != *=* ]]; then
            # add params to list
            # secrets cannot be supported here at this time, as '-s' is not supported by 'docker run'
            # this means anything passed like '-s FOO' is insecure as it is part of ENV
            # on the CIX step's image. secrets will still be obfuscated from CIX output.
            ENV_PASSTHROUGH_ARGS="$ENV_PASSTHROUGH_ARGS -e ${!k}"
        fi
    fi
done

if [ -n "$DETACH" ]; then
    echo "Starting the CIX server, listening on port ${PORT}"
fi

$EXEC docker run \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v $PWD:$PWD \
    -w $PWD \
    $EXPOSE_PORT \
    --rm \
    -i \
    $USE_TTY \
    $DETACH \
    $SET_NAME \
    $SET_DOCKER_NETWORK \
    -e CIX_WRAPPER_VERSION=$CIX_WRAPPER_VERSION \
    -e CIX_WRAPPER_IMAGE=$CIX_IMAGE \
    $ENV_PASSTHROUGH_ARGS \
    $SET_LOGLEVEL \
    $SET_DOCKER_HOST \
    $SET_CIXCONFIG_MOUNT \
    $CIX_IMAGE "$@" $SET_HOST $SET_PORT $SET_CIXCONFIG

# For commands other than 'server' this code should never be reached, as they are started with 'exec'.
rc=$?
if [ -n "$DETACH" ]; then
    if [ $rc -ne 0 ]; then
        echo "Server container failed to start."
        exit $rc
    else
        echo "Server container started. Use above container ID or 'cix-${PORT}' in docker commands (such as 'docker stop')."
    fi
fi
