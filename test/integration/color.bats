#!/usr/bin/env bats
load '../../node_modules/bats-support/load'
load '../../node_modules/bats-assert/load'
load 'helper'

function setup() {
  check_port_not_used
  configure_cix
}

@test "CIX with TTY outputs color" {
  run $CIX_SCRIPT_WITH_TTY exec -y docs/examples/basic.yaml
  assert_success
  assert_output --partial '[32mINFO[39m'
  assert_output --partial '[34mbasic'
}

@test "CIX without TTY doesn't output color" {
  run $CIX_SCRIPT exec -y docs/examples/basic.yaml
  assert_success
  refute_output --partial '[32mINFO[39m'
  refute_output --partial '[34mbasic'
}

@test "CIX with TTY doesn't output color if --no-color specified" {
  run $CIX_SCRIPT_WITH_TTY exec -y docs/examples/basic.yaml --no-color
  assert_success
  refute_output --partial '[32mINFO[39m'
  refute_output --partial '[34mbasic'
}

@test "CIX without TTY outputs color if --color specified" {
  run $CIX_SCRIPT exec -y docs/examples/basic.yaml --color
  assert_success
  assert_output --partial '[32mINFO[39m'
  assert_output --partial '[34mbasic'
}

@test "CIX with TTY doesn't output color if both --color and --no-color specified" {
  run $CIX_SCRIPT_WITH_TTY exec -y docs/examples/basic.yaml --color --no-color
  assert_success
  refute_output --partial '[32mINFO[39m'
  refute_output --partial '[34mbasic'
}

@test "CIX without TTY doesn't output color if both --color and --no-color specified" {
  run $CIX_SCRIPT exec -y docs/examples/basic.yaml --color --no-color
  assert_success
  refute_output --partial '[32mINFO[39m'
  refute_output --partial '[34mbasic'
}
