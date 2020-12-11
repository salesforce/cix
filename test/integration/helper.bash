#!/bin/bash

function check_port_not_used() {
  if [ "$(lsof -i -P -n | grep -v "FIN_WAIT_1" | grep -c 10030)" -gt "0" ]; then
    echo "ERROR: Port 10030 in use!" >&2
    echo "$(lsof -i -P -n | grep -v "FIN_WAIT_1" | grep 10030)" >&2
    return 1
  fi
}

function start_server() {
  SERVER_STARTED=
  # close fd 3 on child processes to prevent bats from blocking on it
  # https://github.com/bats-core/bats-core#file-descriptor-3-read-this-if-bats-hangs
  $CIX_SCRIPT server -l console 3>&- &
  SERVER_STARTED=yes
}

function stop_server() {
  if [ "$SERVER_STARTED" ]; then
    docker stop cix-10030
  fi
}

function wait_for_start() {
  if [ "$SERVER_STARTED" ]; then
    set +e
    NEXT_WAIT_TIME=0
    until [ "$NEXT_WAIT_TIME" -eq 5 ] || curl -sSf "http://localhost:10030/api-docs/" >/dev/null; do
      sleep $(( NEXT_WAIT_TIME++ ))
    done
    set -e
    if [ "$NEXT_WAIT_TIME" -ge 5 ]; then
      echo "ERROR: Timeout waiting for server to come up." >&2
      return 1
    fi
  else
    echo "ERROR: No server process to wait on." >&2
  fi
}

function wait_for_kill() {
  if [ "$SERVER_STARTED" ]; then
    set +e
    NEXT_WAIT_TIME=0
    until [ "$NEXT_WAIT_TIME" -eq 5 ] || ! docker inspect cix-10030 >/dev/null; do
      sleep $(( NEXT_WAIT_TIME++ ))
    done
    set -e
    if [ "$NEXT_WAIT_TIME" -ge 5 ]; then
      echo "ERROR: Timeout waiting to stop CIX server, please kill it manually." >&2
      return 1
    fi
  else
    echo "ERROR: No server process to stop." >&2
    return 1
  fi
}

function configure_cix(){
  if [ -z "$CIX_IMAGE" ]; then
    export CIX_IMAGE=salesforce/cix:local
  fi
  if [ -z "$LOG_LEVEL" ]; then
    export LOG_LEVEL=INFO
  fi
  
  export CIX_SCRIPT_WITH_TTY="faketty ./scripts/cix.sh"
  export CIX_SCRIPT="./scripts/cix.sh"
}

function faketty() {
  tmp=$(mktemp)
  [ "$tmp" ] || return 99
  # Produce a script that runs the command provided to faketty as
  # arguments and stores the status code in the temporary file
  cmd="$(printf '%q ' "$@")"'; echo $? >'$tmp
  # Run the script through /bin/sh with fake tty
  if [ "$(uname)" = "Darwin" ]; then
    script -Fq /dev/null /bin/sh -c "$cmd"
  else
    script -qfc "/bin/sh -c $(printf "%q " "$cmd")" /dev/null
  fi
  # Ensure that the status code was written to the temporary file or
  # fail with status 99
  [ -s $tmp ] || return 99
  err=$(< $tmp)
  rm -f $tmp
  return $err
}
