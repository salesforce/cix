#!/usr/bin/env bats
load '../../node_modules/bats-support/load'
load '../../node_modules/bats-assert/load'
load 'helper'

function setup() {
  check_port_not_used
  configure_cix
}

@test "CIX able to handle secrets from the command line" {
  run $CIX_SCRIPT_WITH_TTY exec -y docs/examples/secrets.yaml -s SECRET_FOO=secret1 -s SECRET_BAR=secret2
  assert_success
  assert_output --partial 'Multiple secrets such as ********, ********, and ******** on the same line will be masked'
  refute_output --partial 'secret1'
  refute_output --partial 'secret2'
}

@test "CIX able to handle single secret via stdin" {
  run bash -c "echo 'bar' | $CIX_SCRIPT exec -y docs/examples/secure_secrets.yaml --secret-stdin BAR_FROM_STDIN"
  assert_success
  assert_output --partial 'When secrets are printed out such as foo_is_unset, ********, baz_is_unset, and qux_is_unset, they will be masked.'
  refute_output --partial 'secret1'
}

@test "CIX able to handle multiple secrets via stdin as JSON" {
  run bash -c "echo '{ \"BAZ_FROM_JSON_STDIN\": \"secret1\", \"QUX_FROM_JSON_STDIN\": \"secret2\" }' | $CIX_SCRIPT exec -y docs/examples/secure_secrets.yaml --secrets-stdin"
  assert_success
  assert_output --partial 'When secrets are printed out such as foo_is_unset, bar_is_unset, ********, and ********, they will be masked.'
  refute_output --partial 'secret1'
  refute_output --partial 'secret2'
}
