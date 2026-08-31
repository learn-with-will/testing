---
id: lesson-08
slug: parametrized-tests
title: "Parametrized Tests"
level: beginner
order: 8
duration: 16
tags:
  - parametrize
  - data-driven
  - edge-cases
  - boundary-values
  - dry
summary: "Running the same test logic over many inputs with @pytest.mark.parametrize — turning a pile of near-identical tests into one data-driven table, labeling cases for readable output, and using parametrization to cover boundaries and edge cases cheaply."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Use **`@pytest.mark.parametrize`** to run one test over many inputs.
- Give cases readable **ids** so failures name the exact input.
- Cover **boundary and edge cases** as a compact data table.
- Know when parametrization helps and when it **hurts readability**.

# Why It Matters

You'll constantly want to test the same behavior across many inputs: valid and invalid, boundaries,
weird characters. Copy-pasting a test five times with different numbers is noisy and easy to get wrong —
and when one case fails, the duplicated code makes it slow to see which. **Parametrization** turns that
repetition into a single test plus a table of cases. pytest then runs the test once per row and reports
each independently, so you get broad coverage with little code.

# Concept Explanation

### One test, many inputs

`@pytest.mark.parametrize` takes the parameter names and a list of value tuples. pytest runs the test
**once per tuple**:

```python
import pytest

@pytest.mark.parametrize("value, expected", [
    (0, 32),
    (100, 212),
    (-40, -40),
])
def test_to_fahrenheit(value, expected):
    assert to_fahrenheit(value) == expected
```

That's **three independent tests** from one function. If the −40 case breaks, only it fails; the others
still report pass.

### Each case runs and reports independently

Because the cases are separate tests, one failing input doesn't hide the others — unlike putting three
asserts in one test body, where the first failure stops the rest.

```text
test_to_fahrenheit[0-32] PASSED
test_to_fahrenheit[100-212] PASSED
test_to_fahrenheit[-40--40] FAILED
```

### Readable ids

pytest auto-generates the `[...]` label from the values. For clarity (especially with objects or long
strings), give explicit **`ids`**:

```python
@pytest.mark.parametrize(
    "text, ok",
    [("a@b.com", True), ("nope", False), ("", False)],
    ids=["valid", "missing-at", "empty"],
)
def test_validate_email(text, ok):
    assert validate_email(text) is ok
```

Now a failure reads `test_validate_email[missing-at]` — instantly meaningful.

### Boundaries as data

Parametrization shines for boundary tables — the min, the max, one below, one above:

```python
@pytest.mark.parametrize("age, allowed", [
    (17, False),   # just below
    (18, True),    # boundary
    (19, True),    # just above
])
def test_is_adult(age, allowed):
    assert is_adult(age) is allowed
```

### Stacking (use sparingly)

Two stacked `parametrize` decorators produce the **cross-product** of cases — handy, but the count
multiplies fast (3 × 4 = 12 tests), so keep combinations meaningful.

# Key Terminology

- **`@pytest.mark.parametrize`** — decorator that runs a test once per set of inputs.
- **Case / row** — one tuple of parameter values = one generated test.
- **`ids`** — human-readable labels for each case, shown in the report.
- **Data-driven test** — test logic separated from a table of input/expected data.
- **Boundary value** — an input at the edge of valid/invalid (off-by-one lives here).
- **Cross-product** — stacking parametrize multiplies cases together.

# Options and Trade-offs

| Decision | Option A | Option B | How to choose |
| -------- | -------- | -------- | ------------- |
| Many similar cases | Copy the test N times | One parametrized test | Parametrize — less code, independent reporting. |
| Case labels | Auto-generated ids | Explicit `ids=[...]` | Explicit ids when values are objects/long strings. |
| Different behaviors | Force into one table | Separate tests | Parametrize *same* logic over data; split genuinely different behaviors. |
| Combinations | Stack parametrize | List only meaningful rows | Stack sparingly — the cross-product explodes. |

# Worked Example

Collapsing five near-duplicate tests into one table:

```python
# Before: five copies differing only in the numbers.
def test_abs_pos(): assert my_abs(3) == 3
def test_abs_neg(): assert my_abs(-3) == 3
def test_abs_zero(): assert my_abs(0) == 0
# ...and so on

# After: one data-driven test with named cases.
import pytest

@pytest.mark.parametrize("n, expected", [
    (3, 3),
    (-3, 3),
    (0, 0),
    (-1, 1),
], ids=["positive", "negative", "zero", "minus-one"])
def test_my_abs(n, expected):
    assert my_abs(n) == expected
```

Adding a new case is now one line in the table, and a failure names exactly which input broke.

# Real World Analogy

Parametrized tests are like a **spreadsheet of test rows** feeding one procedure. Instead of writing a
separate checklist for every product, an inspector uses one checklist and a table of items: each row is
stamped pass/fail on its own. Add a product? Add a row. And if row 7 fails, the report says "row 7:
missing-at", not just "something failed" — the label points straight at the culprit.

# Examples

## Example 1 — Basic: a parametrized table

```python
import pytest

@pytest.mark.parametrize("word, expected", [
    ("racecar", True),
    ("hello", False),
    ("", True),
])
def test_is_palindrome(word, expected):
    assert is_palindrome(word) is expected
```

**Why this works:** three cases (including the empty-string edge) share one line of logic; each reports
independently.

## Example 2 — Real-world: boundary coverage with ids

```python
@pytest.mark.parametrize("score, grade", [
    (89, "B"), (90, "A"), (100, "A"), (59, "F"), (60, "D"),
], ids=["just-below-A", "exactly-A", "max", "just-below-D", "exactly-D"])
def test_letter_grade(score, grade):
    assert letter_grade(score) == grade
```

**Why this works:** the table pins each grade boundary (where off-by-one bugs live), and the ids make a
failure like `[exactly-A]` self-explanatory.

## Example 3 — Pitfall: cramming different behaviors into one table

```python
@pytest.mark.parametrize("func, arg, expected", [
    (normalize_email, " A@X.com ", "a@x.com"),
    (is_adult, 20, True),
    (slugify, "Hi There", "hi-there"),
])
def test_everything(func, arg, expected):
    assert func(arg) == expected
```

**Why this bites:** these are three unrelated behaviors forced into one generic test. The name
`test_everything` documents nothing, and the shared body obscures each function's intent.
Parametrization is for the **same** logic over varied data — not a dumping ground.

# Common Mistakes

- **Parametrizing unrelated behaviors** into a generic `test_everything`, losing readable intent.
- **Cryptic case labels** — relying on auto ids for objects/long strings; add explicit `ids`.
- **Over-stacking** decorators so the cross-product balloons into hundreds of cases.
- **Hiding the expected value in logic** — recomputing it in the test instead of listing it as data
  (a test that mirrors the implementation can pass even when both are wrong).

# Best Practices

- Use parametrize for the **same behavior across many inputs**; split genuinely different behaviors.
- Add **`ids`** so each case's failure names the input.
- Build **boundary tables** (below/at/above) to catch off-by-one bugs cheaply.
- List the **expected value as data**, don't recompute it from the code under test.

# Summary

- **`@pytest.mark.parametrize`** runs one test over many inputs — each an independent, separately-
  reported test.
- Explicit **`ids`** make failures name the exact case.
- Parametrization is ideal for **boundary/edge tables** and keeps tests DRY.
- Keep it to **one behavior over varied data**; don't merge unrelated tests, and don't over-stack.

# Flash Cards

Q: What does @pytest.mark.parametrize do?
A: It runs the same test function once per row of input data, producing several independent tests from one definition.

Q: Why is a parametrized test better than three asserts in one test body?
A: Each case runs and reports independently, so one failing input doesn't stop or hide the others, and the report names which input failed.

Q: What are `ids` in parametrize used for?
A: They give each case a human-readable label in the test report (e.g., [missing-at]) so a failure points directly at the input.

Q: What kind of tests is parametrization best suited to?
A: The same behavior checked across many inputs — especially boundary/edge tables (below, at, above a limit).

Q: What happens if you stack two parametrize decorators?
A: pytest generates the cross-product of the two case lists, so the number of tests multiplies — use it sparingly.

Q: Why list the expected value as data instead of recomputing it in the test?
A: Recomputing with the same logic as the code under test can make the test pass even when both are wrong; explicit expected values are an independent check.

# Exercises

### Easy
Rewrite three separate tests of a `double(n)` function (for 2→4, 0→0, −3→−6) as a single parametrized
test with `ids`.

### Medium
Write a parametrized boundary table for a `letter_grade(score)` function covering the A/B/C/D/F cut
points, including just-below and just-above each boundary.

### Challenging
Take a parametrized test where the "expected" value is computed from the same formula as the code under
test. Explain why it could pass even if the formula is wrong, and rewrite it with hand-written expected
values.

# Further Reading

- pytest — *How to parametrize fixtures and test functions*: <https://docs.pytest.org/en/stable/how-to/parametrize.html>
- pytest — *Parametrizing tests* (examples): <https://docs.pytest.org/en/stable/example/parametrize.html>
- Martin Fowler — *Data-Driven Tests* (bliki): <https://martinfowler.com/bliki/DataDrivenTests.html>
- Python — *unittest* `subTest` (the standard-library way to run one test over many inputs): <https://docs.python.org/3/library/unittest.html#distinguishing-test-iterations-using-subtests>
