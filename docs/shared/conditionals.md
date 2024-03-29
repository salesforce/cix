#### when
Specifies conditions which must be met in order for the step to be executed. See
[docs/examples/conditional.yaml](https://github.com/salesforce/cix/blob/master/docs/examples/conditional.yaml)
for examples.

```yaml
when:
  - operator: IS_SET
    value: $$SOME_ENV_VALUE # can be variable or value
  - operator: NEQ
    value: $$FOO_CONDITION_VALUE # can be variable or value
    value-default: 1
    other: $$BAR_CONDITION_VALUE # can be variable or value
    other-default: 2
  - operator: NOT_EXISTS
    value: $$RUN
    value-default: yes
    values:
      - value: $$RUN_CONDITION_VALUE_1 # can be variable or value
        default: no
      - value: maybe
  - operator: OR
    conditions:
      - operator: EQ
        value: $$FOO_CONDITION_VALUE
        value-default: 1
        other: $$BAR_CONDITION_VALUE
        other-default: 2
      - operator: NEQ
        value: $$FOO_CONDITION_VALUE
        value-default: 2
        other: $$BAR_CONDITION_VALUE
        other-default: 1
      - operator: MATCHES
        value: 'main-244'
        expressions: 'freeze,main,main-\d+'
        delimiter: ','
      - operator: NOT_MATCHES
        value: 'patch_'
        expressions: 'freeze,main,patch-\d+'

```

##### Operators
The following operators are defined:

| Operator | Description | Expected Attributes |
| --- | --- | --- |
| `IS_SET`, `IS_NOT_SET` | Emptiness check of 'value' | value |
| `EQ`, `NEQ` | Equality/Non-equality of 'value' to 'other' | (1) value, other, value-default, other-default |
| `GTE`, `GT`, `LTE`, `LT` | Numeric or String (lexical) comparison of 'value' to 'other' | (1) value, other, value-default, other-default |
| `INCLUDES`, `NOT_INCLUDES` | Substring comparison -- does 'value' include the string 'other'. Evaluates to false if 'other' is an empty string and 'value' is not an empty string  | (1) value, other, value-default, other-default |
| `STARTS_WITH`, `ENDS_WITH` | String prefix and suffix comparison -- does 'value' start with or end with the string 'other' | (1) value, other, value-default, other-default |
| `EXISTS`, `NOT_EXISTS` | List membership -- is 'value' among 'values' | (2) value, value-default, values |
| `OR` | Alternation | `conditions`, a list of operator/value attributes as above |
| `AND` | Conjunction | `conditions`, a list of operator/value attributes as above |
| `MATCHES`, `NOT_MATCHES` | Regular expression comparison -- does 'expressions' match the string 'value'. 'expressions' can take multiple expressions separated by a char(delimiter). Can pass optional 'delimiter' to split the expressions to compare a single expression against the 'value'. By default 'delimiter' is taken as comma ','. | (1) value, expressions |

(1) Operator expects attributes named `value` and `other`, with optional `value-default` and `other-default`
alternatives which supply values when the former attributes are not defined or refer to variables which cannot
be expanded.

(2) Operator expects attributes named `value`, with optional `value-default`, and `values` which is a list of 'value items'
(composed of `value` and optional `default` attribute pairs) against which the value is compared.
