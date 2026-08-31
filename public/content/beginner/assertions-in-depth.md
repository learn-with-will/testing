---
id: lesson-04
slug: assertions-in-depth
title: "Assertions in Depth"
level: beginner
order: 4
duration: 18
tags:
  - assertions
  - pytest-raises
  - approx
  - exceptions
  - floating-point
summary: "Going beyond `assert x == y` — comparing values, collections, and identity correctly, checking floating-point results with pytest.approx, and asserting that code raises the right exception with pytest.raises, including matching the message."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Choose the right comparison: **equality (`==`)** vs **identity (`is`)** vs **membership (`in`)**.
- Compare **collections** (lists, dicts, sets) in one assertion.
- Test floating-point results safely with **`pytest.approx`**.
- Assert that code **raises** the expected exception using **`pytest.raises`**, and match its message.
- Add clear assertion **messages** without over-specifying.

# Why It Matters

The assertion is where a test earns its keep — it's the line that decides pass or fail. Weak or wrong
assertions are a top source of tests that *look* thorough but catch nothing (or fail for the wrong
reason). Two traps bite beginners constantly: comparing floating-point numbers with `==`, and forgetting
to test the **error** cases where code *should* raise. This lesson gives you the handful of assertion
tools that cover almost everything you'll need.

# Concept Explanation

### Equality, identity, and membership

- **`==`** checks **equality of value**: do these two things *look the same*?
- **`is`** checks **identity**: are these the *same object* in memory? Use `is` only for singletons
  like `None`, `True`, `False` (`assert result is None`).
- **`in`** checks **membership**: `assert "error" in message`.

```python
assert total == 10          # value equality — the usual choice
assert result is None       # identity — correct for None
assert "carrot" in basket   # membership
```

Using `is` for ordinary values (`x is 10`) is a bug waiting to happen — it may pass by accident today
and fail later. Reserve `is` for `None`/`True`/`False`.

### Comparing collections

You don't need to loop — Python compares whole collections by value:

```python
assert sorted_names == ["Ada", "Bo", "Cy"]         # lists compare element-by-element, order matters
assert user == {"id": 1, "name": "Ada"}            # dicts compare keys and values
assert set(tags) == {"a", "b"}                     # sets ignore order and duplicates
```

pytest's introspection even shows a **diff** of the two collections on failure, so you see exactly
which element differs.

### Floating-point: never `==`

Because computers store decimals in binary, arithmetic has tiny rounding errors:

```text
>>> 0.1 + 0.2
0.30000000000000004
>>> 0.1 + 0.2 == 0.3
False
```

Comparing floats with `==` gives flaky, surprising results. Use **`pytest.approx`**, which compares
within a small tolerance:

```python
from pytest import approx

assert 0.1 + 0.2 == approx(0.3)
assert total == approx(19.99, rel=1e-3)   # relative tolerance
```

### Asserting that code raises

Error handling is behavior too — and you test it by asserting the code **raises** the right exception:

```python
import pytest

def withdraw(balance, amount):
    if amount > balance:
        raise ValueError("insufficient funds")
    return balance - amount


def test_overdraw_raises_value_error():
    with pytest.raises(ValueError):
        withdraw(balance=50, amount=100)
```

The test **passes** because the expected `ValueError` was raised. You can also check the message:

```python
def test_overdraw_message():
    with pytest.raises(ValueError, match="insufficient"):   # match is a regex search
        withdraw(50, 100)
```

If you need the exception object, capture it: `with pytest.raises(ValueError) as exc:` then assert on
`str(exc.value)`.

# Key Terminology

- **`==` (equality)** — same value; the default comparison.
- **`is` (identity)** — same object; use only for `None`/`True`/`False`.
- **`in` (membership)** — element/substring is contained in a collection or string.
- **`pytest.approx`** — compares numbers within a tolerance (for floating point).
- **`pytest.raises`** — a context manager asserting a block raises a given exception.
- **`match=`** — a regex searched against the raised exception's message.

# Options and Trade-offs

| Decision | Option A | Option B | How to choose |
| -------- | -------- | -------- | ------------- |
| Compare floats | `== 0.3` | `== approx(0.3)` | Always `approx` for computed floats; `==` is unreliable. |
| Check `None` | `== None` | `is None` | Use `is None` — it's the idiomatic, correct identity check. |
| Test an error | Call and hope it raises | `with pytest.raises(...)` | `pytest.raises` makes "should raise" an explicit, checkable expectation. |
| Match a message | Assert full string equality | `match=` a stable substring/regex | Match a stable fragment; full-message equality is brittle. |

# Worked Example

Testing a `parse_percentage("20%") -> 0.2` function, including its error path:

```python
import pytest

def parse_percentage(text):
    if not text.endswith("%"):
        raise ValueError(f"not a percentage: {text!r}")
    return int(text[:-1]) / 100


def test_parses_a_valid_percentage():
    assert parse_percentage("20%") == approx(0.2)


def test_rejects_missing_percent_sign():
    with pytest.raises(ValueError, match="not a percentage"):
        parse_percentage("20")
```

One test pins the happy path (with `approx`, since `0.2` is a float), the other pins the error
contract. Together they describe the function's full behavior.

# Real World Analogy

Assertions are like the **acceptance criteria** on a delivery. "Same value" is checking the package
contents match the order; "identity" is checking it's literally the same numbered parcel; "approx" is
weighing produce to the nearest gram rather than demanding an impossible exact figure; and
`pytest.raises` is confirming that a *forbidden* order (ship to a banned address) is correctly
**refused** — testing that the right thing is rejected is as important as testing that the right
thing is accepted.

# Examples

## Example 1 — Basic: collection equality

```python
def test_unique_sorted_returns_sorted_distinct_values():
    assert unique_sorted([3, 1, 3, 2]) == [1, 2, 3]
```

**Why this works:** one assertion compares the whole list by value; pytest shows an element diff if it
fails.

## Example 2 — Real-world: floating-point money math

```python
from pytest import approx

def test_apply_tax_uses_a_tolerance():
    assert apply_tax(19.99, rate=0.0825) == approx(21.64, abs=0.01)
```

**Why this works:** taxes produce non-round floats; `approx` with a one-cent tolerance avoids a false
failure from binary rounding while still catching real errors.

## Example 3 — Pitfall: forgetting to test the error path

```python
def divide(a, b):
    return a / b

def test_divide():
    assert divide(6, 2) == 3          # only the happy path is checked
```

**Why this bites:** `divide(6, 0)` raises `ZeroDivisionError`, but no test says what *should* happen
for a zero divisor. The error behavior is untested and undefined. Add a `pytest.raises` (or define and
test a friendlier error) so the contract is explicit.

# Common Mistakes

- **Comparing floats with `==`** — use `pytest.approx`; `0.1 + 0.2 != 0.3` in binary.
- **Using `is` for values** — `x is 10` may pass by luck; reserve `is` for `None`/`True`/`False`.
- **Never testing exceptions** — error handling is behavior; assert it with `pytest.raises`.
- **Over-matching messages** — asserting the *entire* exception string breaks on any wording tweak;
  match a stable fragment.

# Best Practices

- Default to `==` for values and whole collections; let pytest show the diff.
- Use `is None` / `is True` / `is False` for singletons.
- Wrap computed floats in `approx` with a sensible tolerance.
- Test the **error paths** with `pytest.raises`, matching a stable part of the message.

# Summary

- Pick the right check: **`==`** (value), **`is`** (identity, for `None`), **`in`** (membership).
- Compare **whole collections** in one assertion; pytest diffs them on failure.
- Never compare floats with `==` — use **`pytest.approx`**.
- Assert error behavior with **`pytest.raises`**, optionally `match=`-ing the message.

# Flash Cards

Q: Why shouldn't you compare floating-point results with ==?
A: Binary storage introduces tiny rounding errors (e.g., 0.1 + 0.2 != 0.3), so == gives surprising, flaky failures. Use pytest.approx with a tolerance instead.

Q: When should you use `is` instead of `==` in an assertion?
A: Only for singletons — `is None`, `is True`, `is False`. For ordinary values use `==`; `is` checks object identity, not value.

Q: How do you assert that a function raises a specific exception?
A: Use `with pytest.raises(SomeError):` around the call; the test passes only if that exception (or a subclass) is raised in the block.

Q: How do you also check the raised exception's message?
A: Pass `match="fragment"` to pytest.raises (a regex search), or capture it with `as exc` and assert on `str(exc.value)`.

Q: How do you compare two dictionaries in a test?
A: Just `assert actual == expected`; Python compares dicts by keys and values, and pytest shows a diff of the differences on failure.

Q: Why is asserting the full text of an exception message risky?
A: Any wording change breaks the test even when behavior is correct; match a stable substring or regex instead of the whole string.

# Exercises

### Easy
Write an assertion that `0.1 + 0.2` equals `0.3` using `pytest.approx`, and one that a function returns
`None` using `is`.

### Medium
Write a `parse_percentage` like the worked example and two tests: one for a valid input (using
`approx`) and one that asserts a `ValueError` with a message match for a missing `%`.

### Challenging
Take a function with an unchecked error path (e.g., `divide`). Decide and document the intended
behavior for the bad input, then write the `pytest.raises` test that pins it. Explain why matching the
whole message would make the test brittle.

# Further Reading

- pytest — *How to write and report assertions*: <https://docs.pytest.org/en/stable/how-to/assert.html>
- pytest — *Assertions about expected exceptions*: <https://docs.pytest.org/en/stable/how-to/assert.html#assertions-about-expected-exceptions>
- pytest — *`approx` reference*: <https://docs.pytest.org/en/stable/reference/reference.html#pytest-approx>
- Python — *Floating-Point Arithmetic: Issues and Limitations*: <https://docs.python.org/3/tutorial/floatingpoint.html>
