## YAML Syntax

YAML is a great format for human-managed configuration. There's not a lot of pointless
markup and it's very readable. It can be easily edited in any text editor.

However there are a few caveats. Whitespace is important in YAML. Indenting is significant (similar
to the Python language), and tabs must not be used to indent lines. Use only spaces for indenting.

YAML automatically coerces values to types based on how they appear. Quoting is used to force some
values which may be interpreted as numbers, arrays, or maps to be strings.

A bare `: ` (colon-space) must be quoted, otherwise YAML will interpret it as defining a map.

Strings may span multiple lines, but will be squashed into a single line string, with newlines
replaced by spaces.

A handy syntax feature for long multi-line shell commands and the like is the "Literal Block Scalar"
operator, `|`. When a value is preceded by the operator, newlines are preserved in the value, and special
character sequences which are significant to YAML, such as `: ` (colon-space) are ignored. Like so:

```yaml
  commands:
    - |
      if [[ $var ]]; then
        echo Var is set to: $var      <-- ': ' here would normally be a YAML syntax error
      else
        echo Var is not set.
      fi
    - echo "End of commands."
```

### YAML Syntax References {docsify-ignore}

- The Ansible project provides a fairly concise [guide to YAML syntax](https://docs.ansible.com/ansible/latest/reference_appendices/YAMLSyntax.html).
- Wikipedia.org's article on YAML has a good [Syntax section](https://en.wikipedia.org/wiki/YAML#Syntax).
- The YAML.org [Reference Card](https://yaml.org/refcard.html).
- The complete [YAML 1.2 Spec](https://yaml.org/spec/1.2/spec.html).