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
      image: alpine:3
      commands:
        - exit 1
EOF
  cat << EOF > tmp/teardown.yaml
version: 2.1
pipeline:
  - step:
      name: basic
      image: alpine:3
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
      image: alpine:3
      commands:
        - |
          cat << EOAF > tmp/2.yaml
          version: 2.1
          pipeline:
            - step:
                name: basic
                image: alpine:3
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
      image: alpine:3
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
      image: alpine:3
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
      image: alpine:3
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
  assert_output --partial "Successfully completed step group full-pipeline"
}

@test "CIX runs pipeline as a specific user" {
  mkdir -p tmp
  cat << EOF > tmp/test-user.yaml
version: 2.1
pipeline:
  - step:
      name: first
      user: '299:924'
      image: alpine:3
      commands:
        - id -u
        - id -g
EOF
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/test-user.yaml
  assert_success
  assert_output --partial '299'
  assert_output --partial '924'
  rm tmp/test-user.yaml
  rmdir tmp || true
}

@test "CIX backgrounded steps will log" {
  mkdir -p tmp
  cat << 'EOF' > tmp/background.yaml
version: 2.1
pipeline:
  - step:
      name: basic
      image: alpine:3.9
      background: true
      commands-output: minimal
      commands:
        - echo "hello from background"
  - step:
      name: sleep
      image: alpine:3.9
      commands-output: minimal
      commands:
        - sleep 1
        - echo "complete"
EOF
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/background.yaml
  assert_output --partial 'hello from background'
  rm tmp/background.yaml
  rmdir tmp || true
}

@test "CIX validate passes files with unquoted boolean and number literals for arguments and commands" {
  mkdir -p tmp
  cat << EOF > tmp/literals.yaml
version: 2.1
pipeline:
  - step:
      name: basic-commands
      image: alpine:3
      commands:
        - true
        - 42
  - step:
      name: basic-args
      image: alpine:3
      arguments:
        - sh
        - -c
        - printf "%s\n" $*
        - sh
        - true
        - 42
        - 3.14159
EOF
  run $CIX_SCRIPT_WITH_TTY validate -y tmp/literals.yaml
  assert_success
  rm tmp/literals.yaml
  rmdir tmp || true
}

@test "CIX runs pipelines with unquoted boolean and number literals for arguments" {
  mkdir -p tmp
  cat << 'EOF' > tmp/run-literals.yaml
version: 2.1
pipeline:
  - step:
      name: basic-args
      image: alpine:3
      arguments:
        - sh
        - -c
        - printf "%s\n" $*
        - sh
        - true
        - 42
        - 3.14159
EOF
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/run-literals.yaml
  assert_success
  assert_output --partial 'true'
  assert_output --partial '3.14159'
  rm tmp/run-literals.yaml
  rmdir tmp || true
}

@test "CIX will loop using for-each" {
  mkdir -p tmp
  cat << 'EOF' > tmp/for-each.yaml
version: 2.1
pipeline:
  - step:
      name: for-each
      image: alpine:3.9
      for-each:
        - element 1
        - element 2
        - element 3
        - element 4
      element-variable: ELEMENT
      commands-output: minimal
      commands:
        - echo $ELEMENT
EOF
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/for-each.yaml
  assert_success
  assert_output --partial 'element 3'
  rm tmp/for-each.yaml
  rmdir tmp || true
}

@test "CIX will for-each will contiunue-on-fail" {
  mkdir -p tmp
  cat << 'EOF' > tmp/for-each.yaml
version: 2.1
pipeline:
  - step:
      name: for-each
      image: alpine:3.9
      for-each: 'a,b,c'
      element-variable: ELEMENT
      commands-output: minimal
      continue-on-fail: true
      parallel: false
      commands:
        - |
          if [ "$ELEMENT" == "a" ]; then
            echo "fail $ELEMENT";
            exit 1;
          else
            echo "pass $ELEMENT"
          fi
EOF
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/for-each.yaml
  assert_success
  assert_output --partial 'fail a'
  assert_output --partial 'pass b'
  assert_output --partial 'pass c'
  rm tmp/for-each.yaml
  rmdir tmp || true
}

@test "CIX will for-each will retry" {
  mkdir -p tmp
  cat << 'EOF' > tmp/for-each.yaml
version: 2.1
pipeline:
  - step:
      name: for-each
      image: alpine:3.9
      for-each: 'a,b,c'
      element-variable: ELEMENT
      commands-output: minimal
      parallel: true
      retry:
        iterations: 2
        backoff: 1
      commands:
        - |
          if [ "$ELEMENT" == "a" ]; then
            echo "fail $ELEMENT";
            exit 1;
          else
            echo "pass $ELEMENT"
          fi
EOF
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/for-each.yaml
  assert_failure
  assert_output --partial 'fail a'
  assert_output --partial 'pass b'
  assert_output --partial 'pass c'
  rm tmp/for-each.yaml
  rmdir tmp || true
}

@test "CIX will continue-on-fail if timeout" {
  mkdir -p tmp
  cat << 'EOF' > tmp/continue-on-fail.yaml
version: 2.1
pipeline:
  - step:
      name: first
      image: alpine:3.9
      continue-on-fail: true
      timeout: 1
      commands:
        - sleep 2
  - step:
      name: second
      image: alpine:3.9
      commands:
        - echo "hello world"
EOF
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/continue-on-fail.yaml
  assert_success
  assert_output --partial 'failed, but it is continue-on-fail'
  assert_output --partial 'hello world'
  rm tmp/continue-on-fail.yaml
  rmdir tmp || true
}

@test "CIX will print last line if no newline" {
  mkdir -p tmp
  cat << 'EOF' > tmp/no-newline.yaml
version: 2.1
pipeline:
  - step:
      name: newline-test
      image: alpine:3.9
      commands:
        - echo "first"
        - echo -n "second"
EOF
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/no-newline.yaml
  assert_success
  assert_output --partial 'second'
  rm tmp/no-newline.yaml
  rmdir tmp || true
}

@test "CIX will log to files" {
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
  run $CIX_SCRIPT_WITH_TTY exec -l files -p tmp -y tmp/files.yaml
  assert [ -e 'tmp/cix-execution.log' ]
  first=(tmp/*first.log)
  second=(tmp/*second.log)
  assert [ -e "$first" ]
  assert [ -e "$second" ]
  rm tmp/*.log
  rm tmp/files.yaml
  rmdir tmp || true
}

@test "CIX will log to single file" {
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
  run $CIX_SCRIPT_WITH_TTY exec -l file -p tmp -y tmp/file.yaml
  assert [ -e 'tmp/cix-execution.log' ]
  first=(tmp/*first.log)
  second=(tmp/*second.log)
  assert [ ! -e "$first" ]
  assert [ ! -e "$second" ]
  rm tmp/*.log
  rm tmp/file.yaml
  rmdir tmp || true
}

@test "CIX can log to different filename" {
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
  run $CIX_SCRIPT_WITH_TTY exec -l file -L basic.log -p tmp -y tmp/file.yaml
  assert [ -e 'tmp/basic.log' ]
  assert [ ! -e 'tmp/cix-ececution.log' ]
  rm tmp/*.log
  rm tmp/file.yaml
  rmdir tmp || true
}

@test "CIX can silence logs" {
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
  run $CIX_SCRIPT_WITH_TTY exec --silent
  refute_output
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
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/success.yaml -y tmp/failed.yaml
  assert_failure
  rm tmp/failed.yaml tmp/success.yaml
  rmdir tmp || true
}
@test "CIX valid regular expression running step" {
  mkdir -p tmp
  cat << 'EOF' > tmp/regex.yaml
version: 2.1
pipeline:
  - step:
      name: regex-test-invalid
      image: alpine:3.9
      when:
        - operator: NOT_MATCHES
          value: 'freeze,test,strata'
          expressions: 'strata_\d+\.\d+'
          delimiter: ','
      commands:
        - echo "unsuccessful check"
  - step:
      name: regex-test-valid
      image: alpine:3.9
      when:
        - operator: MATCHES
          value: 'freeze,test,strata_1.2'
          expressions: 'strata_\d+\.\d+'
          delimiter: ','
      commands:
        - echo "successful check"
EOF
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/regex.yaml
  assert_success
  assert_output --partial 'unsuccessful'
  assert_output --partial 'successful'
  rm tmp/regex.yaml
  rmdir tmp || true
}
@test "CIX invalid regular expression running step" {
  mkdir -p tmp
  cat << 'EOF' > tmp/regex_in.yaml
version: 2.1
pipeline:
  - step:
      name: regex-test
      image: alpine:3.9
      when:
        - operator: NOT_MATCHES
          value: 'strata1.2'
          expressions: 'strata_\d+\.\d+'
      commands:
        - echo "successful not matches"
  - step:
      name: regex-test2
      image: alpine:3.9
      commands:
        - echo "successful run"
EOF
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/regex_in.yaml
  assert_success
  assert_output --partial 'successful not matches'
  assert_output --partial 'successful run'
  rm tmp/regex_in.yaml
  rmdir tmp || true
}


@test "CIX exec will resolve sha256 digest" {
  mkdir -p tmp
  cat << EOF > tmp/digest.yaml
version: 2.1
pipeline:
  - step:
      name: basic
      image: alpine@sha256:414e0518bb9228d35e4cd5165567fb91d26c6a214e9c95899e1e056fcd349011
      commands:
        - echo this should go
EOF
  run $CIX_SCRIPT_WITH_TTY exec -y tmp/digest.yaml
  assert_success
  rm tmp/digest.yaml
  rmdir tmp || true
}
