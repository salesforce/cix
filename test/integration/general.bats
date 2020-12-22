#!/usr/bin/env bats
load '../../node_modules/bats-support/load'
load '../../node_modules/bats-assert/load'
load 'helper'

function setup() {
  check_port_not_used
  configure_cix
}

@test "CIX able to run basic.yaml" {
  run $CIX_SCRIPT_WITH_TTY exec -y docs/examples/basic.yaml
  assert_success
  assert_output --partial 'Successfully completed step'
}


@test "CIX runs teardown on failure" {
  mkdir -p tmp
  cat << EOF > tmp/fail.yaml
version: 2.1
pipeline:
  - step:
      name: basic
      image: alpine:3.9
      commands:
        - exit 1
EOF
  cat << EOF > tmp/teardown.yaml
version: 2.1
pipeline:
  - step:
      name: basic
      image: alpine:3.9
      commands:
        - echo "Ran Teardown"
EOF
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/fail.yaml --teardown tmp/teardown.yaml
  assert_failure
  assert_output --partial 'Ran Teardown'
  rm tmp/fail.yaml tmp/teardown.yaml
  rmdir tmp || true
}

@test "CIX loads pipelines JIT" {
  mkdir -p tmp
  cat << EOF > tmp/1.yaml
version: 2.1
pipeline:
  - step:
      name: basic
      image: alpine:3.9
      commands:
        - |
          cat << EOAF > tmp/2.yaml
          version: 2.1
          pipeline:
            - step:
                name: basic
                image: alpine:3.9
                commands:
                  - echo "hi from generated 2.yaml"
          EOAF
EOF
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/1.yaml -y tmp/2.yaml
  assert_success
  assert_output --partial 'hi from generated 2.yaml'
  rm tmp/1.yaml tmp/2.yaml
  rmdir tmp || true
}

@test "CIX validate rejects bad files" {
  mkdir -p tmp
  cat << EOF > tmp/bad.yaml
version: 2.1
pipeline:
  - step:
      name: basic
      image: alpine:3.9
      commands:
- this IS NOT valid YAML
EOF
  run $CIX_SCRIPT_WITH_TTY validate -y tmp/bad.yaml
  assert_failure
  assert_output --partial 'Failed loading YAML'
  rm tmp/bad.yaml
  rmdir tmp || true
}

@test "CIX validate passes good files" {
  mkdir -p tmp
  cat << EOF > tmp/good.yaml
version: 2.1
pipeline:
  - step:
      name: basic
      image: alpine:3.9
      commands:
        - this IS valid YAML
EOF
  run $CIX_SCRIPT_WITH_TTY validate -y tmp/good.yaml
  assert_success
  rm tmp/good.yaml
  rmdir tmp || true
}

@test "CIX environment variables present" {
  mkdir -p tmp
  cat << 'EOF' > tmp/env.yaml
version: 2.1
pipeline:
  - step:
      name: basic
      image: alpine:3.9
      commands:
        - if [ -z $CIX_HOSTNAME ] || [ -z $CIX_STEP_NAME ] || [ -z $CIX_NETWORK_NAME ] || [ -z $CIX_CONTAINER_NAME ] || [ -z $CIX_EXECUTION_ID ]; then exit 1; fi
EOF
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/env.yaml
  assert_success
  rm tmp/env.yaml
  rmdir tmp || true
}

@test "CIX imports work" {
  run $CIX_SCRIPT_WITH_TTY exec exec -y docs/examples/import/imports.yaml
  assert_success
  assert_output --partial "Successfully completed step group 'full-pipeline'"
}
