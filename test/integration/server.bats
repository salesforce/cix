#!/usr/bin/env bats
load '../../node_modules/bats-support/load'
load '../../node_modules/bats-assert/load'
load 'helper'

function setup() {
  check_port_not_used
  configure_cix
  start_server
  wait_for_start
}

function teardown() {
  stop_server
  wait_for_kill
}

@test "CIX able to remotely run basic.yaml" {
  run $CIX_SCRIPT_WITH_TTY exec -y docs/examples/basic.yaml --remote
  assert_success
}

@test "CIX will exit non-zero on failed pipeline" {
  mkdir -p tmp
  cat << EOF > tmp/failed.yaml
version: 2.1
pipeline:
  - step:
      name: fail
      image: alpine:3
      commands:
        - exit 1
EOF
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/failed.yaml --remote
  assert_failure
  rm tmp/failed.yaml
  rmdir tmp || true
}

@test "CIX will exit non-zero on chained failed pipeline" {
  mkdir -p tmp
  cat << EOF > tmp/success.yaml
version: 2.1
pipeline:
  - step:
      name: success
      image: alpine:3
      commands:
        - exit 0
EOF
  cat << EOF > tmp/failed.yaml
version: 2.1
pipeline:
  - step:
      name: fail
      image: alpine:3
      commands:
        - exit 1
EOF
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/success.yaml -y tmp/failed.yaml --remote
  assert_failure
  rm tmp/failed.yaml tmp/success.yaml
  rmdir tmp || true
}

@test "CIX able to load & continue basic.yaml" {
  run $CIX_SCRIPT_WITH_TTY load -y docs/examples/basic.yaml
  assert_success
  assert_output --partial "INFO: Pipeline(s) loaded, use 'cix resume' to continue."
  run $CIX_SCRIPT_WITH_TTY resume
  assert_success
  assert_output --partial "Resume: running pipeline to completion."
}

@test "CIX describe loads the pipeline JIT" {
  run $CIX_SCRIPT_WITH_TTY load -y docs/examples/phased-exec.yaml
  assert_success
  assert_output --partial "INFO: Pipeline(s) loaded, use 'cix resume' to continue."
  run $CIX_SCRIPT_WITH_TTY pipelines --status
  assert_success
  assert_output --partial 'Pipeline Status: "ready"'
  run $CIX_SCRIPT_WITH_TTY describe
  run $CIX_SCRIPT_WITH_TTY pipelines --status
  assert_success
  assert_output --partial 'Pipeline Status: "loaded"'
}

@test "CIX describe displays pipeline" {
  run $CIX_SCRIPT_WITH_TTY load -y docs/examples/phased-exec.yaml
  assert_success
  assert_output --partial "INFO: Pipeline(s) loaded, use 'cix resume' to continue."
  run $CIX_SCRIPT_WITH_TTY describe
  assert_success
  assert_output --partial '"name": "fifth"'
}

@test "CIX load can use plugins" {
  mkdir -p tmp
  cat << EOF > tmp/plugin.yaml
version: 2.4
kind: Plugin
preprocessor:
  image: never-actually-ran:test
EOF
  export LOG_LEVEL=SILLY
  run $CIX_SCRIPT_WITH_TTY load --plugin tmp/plugin.yaml -y docs/examples/phased-exec.yaml
  assert_success
  assert_output --partial "Got back Pipeline"
  rm tmp/plugin.yaml
  rmdir tmp || true
}


@test "CIX resume blocks and pauses for cix resume, --to, --next" {
  mkdir -p tmp
  cat << EOF > tmp/blocking.yaml
version: 2.1
pipeline:
  - step:
      name: first
      image: alpine:3
      commands:
        - echo "Magic String 1"
        - sleep 5
  - step:
      name: second
      image: alpine:3
      commands:
        - echo "Magic String 2"
        - sleep 5
  - step:
      name: third
      image: alpine:3
      commands:
        - echo "Magic String 3"
        - sleep 5
EOF
  run $CIX_SCRIPT_WITH_TTY load -y tmp/blocking.yaml
  run $CIX_SCRIPT_WITH_TTY resume --to first
  assert_output --partial 'Magic String 1'
  assert_success
  run $CIX_SCRIPT_WITH_TTY pipelines --status
  assert_success
  assert_output --partial 'Pipeline Status: "paused"'
  run $CIX_SCRIPT_WITH_TTY resume --next
  assert_output --partial 'Magic String 2'
  assert_success
  run $CIX_SCRIPT_WITH_TTY pipelines --status
  assert_success
  assert_output --partial 'Pipeline Status: "paused"'
  run $CIX_SCRIPT_WITH_TTY resume
  assert_output --partial 'Magic String 3'
  assert_success
  run $CIX_SCRIPT_WITH_TTY pipelines --status
  assert_success
  assert_output --partial 'Pipeline Status: "successful"'
  rm tmp/blocking.yaml
  rmdir tmp || true
}


@test "CIX can resume without blocking" {
  mkdir -p tmp
  cat << EOF > tmp/non-blocking.yaml
version: 2.1
pipeline:
  - step:
      name: first
      image: alpine:3
      commands:
        - sleep 2
        - echo "Magic String 1"
EOF
  run $CIX_SCRIPT_WITH_TTY load -y tmp/non-blocking.yaml
  run $CIX_SCRIPT_WITH_TTY resume --non-blocking
  refute_output --partial 'Magic String 1'
  assert_success
  run $CIX_SCRIPT_WITH_TTY pipelines --status
  assert_success
  assert_output --partial 'Pipeline Status: "running"'
  sleep 2
  run $CIX_SCRIPT_WITH_TTY pipelines --status
  assert_success
  assert_output --partial 'Pipeline Status: "successful"'
  rm tmp/non-blocking.yaml
  rmdir tmp || true
}

@test "CIX --next pipeline failure returns non-zero exit" {
  mkdir -p tmp
  cat << EOF > tmp/error.yaml
version: 2.1
pipeline:
  - step:
      name: first
      image: alpine:3
      commands:
        - exit 1
  - step:
      name: second
      image: alpine:3
      commands:
        - echo "Magic String 2"
        - sleep 5
EOF
  run $CIX_SCRIPT_WITH_TTY load -y tmp/error.yaml
  run $CIX_SCRIPT_WITH_TTY resume --to first
  refute_output --partial 'Magic String 2'
  assert_failure
  run $CIX_SCRIPT_WITH_TTY pipelines --status
  assert_success
  assert_output --partial 'Pipeline Status: "failed"'
  rm tmp/error.yaml
  rmdir tmp || true
}

@test "CIX Pipelines can be Aliased" {
  run $CIX_SCRIPT_WITH_TTY load -y docs/examples/basic.yaml --pipeline-alias first
  assert_success
  run $CIX_SCRIPT_WITH_TTY load -y docs/examples/phased-exec.yaml
  assert_success
  run $CIX_SCRIPT_WITH_TTY pipelines
  assert_success
  assert_output --partial '- alias: first'
  assert_output --partial '- alias: latest'
  run $CIX_SCRIPT_WITH_TTY pipelines --get-alias first
  assert_success
  run $CIX_SCRIPT_WITH_TTY pipelines --get-alias latest
  assert_success
  run $CIX_SCRIPT_WITH_TTY pipelines --get-alias nonexistant
  assert_failure
  run $CIX_SCRIPT_WITH_TTY resume --pipeline-alias first
  assert_success
  run $CIX_SCRIPT_WITH_TTY pipelines --status --pipeline-alias first
  assert_success
  assert_output --partial 'Pipeline Status: "successful"'
  run $CIX_SCRIPT_WITH_TTY pipelines --status
  assert_success
  assert_output --partial 'Pipeline Status: "ready"'
  assert_success
  run $CIX_SCRIPT_WITH_TTY resume
  assert_success
  run $CIX_SCRIPT_WITH_TTY pipelines --status
  assert_success
  assert_output --partial 'Pipeline Status: "successful"'
  run $CIX_SCRIPT_WITH_TTY pipelines --status --pipeline-alias latest
  assert_success
  assert_output --partial 'Pipeline Status: "successful"'
}

@test "CIX will log remotely to files" {
  mkdir -p tmp
  cat << 'EOF' > tmp/files.yaml
version: 2.1
pipeline:
  - step:
      name: first
      image: alpine:3.9
      commands:
        - echo "first"
  - step:
      name: second
      image: alpine:3.9
      commands:
        - echo "second"
EOF
  run $CIX_SCRIPT_WITH_TTY exec -l files -p tmp -y tmp/files.yaml --remote
  assert [ -e 'tmp/cix-execution.log' ]
  first=(tmp/*first.log)
  second=(tmp/*second.log)
  assert [ -e "$first" ]
  assert [ -e "$second" ]
  rm tmp/*.log
  rm tmp/files.yaml
  rmdir tmp || true
}

@test "CIX will log remotely to single file" {
  mkdir -p tmp
  cat << 'EOF' > tmp/file.yaml
version: 2.1
pipeline:
  - step:
      name: first
      image: alpine:3.9
      commands:
        - echo "first"
  - step:
      name: second
      image: alpine:3.9
      commands:
        - echo "second"
EOF
  run $CIX_SCRIPT_WITH_TTY exec -l file -p tmp -y tmp/file.yaml --remote
  assert [ -e 'tmp/cix-execution.log' ]
  first=(tmp/*first.log)
  second=(tmp/*second.log)
  assert [ ! -e "$first" ]
  assert [ ! -e "$second" ]
  rm tmp/*.log
  rm tmp/file.yaml
  rmdir tmp || true
}
