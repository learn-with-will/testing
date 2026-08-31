---
id: lesson-03
slug: anatomy-of-a-test
title: "The Anatomy of a Test"
level: beginner
order: 3
duration: 16
tags:
  - arrange-act-assert
  - structure
  - naming
  - readability
  - assertions
summary: "The shape every good test shares — Arrange, Act, Assert — plus how to keep one test focused on a single behavior, name it so the report reads like a specification, and write failures that explain themselves."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Structure a test with **Arrange-Act-Assert** (AAA), and relate it to the **Four-Phase Test**.
- Keep a test focused on **one behavior / one logical concept**.
- Name tests so a failure report reads like a **specification**.
- Write assertions and messages that make a failure **self-explanatory**.

# Why It Matters

A test is read far more often than it is written — usually at the worst moment, when it's red and
something is broken. A test with a clear shape and a descriptive name tells you *what* was expected and
*which* behavior failed, without you having to reverse-engineer it. Sloppy tests, by contrast, are
their own bug source: they pass for the wrong reasons or fail mysteriously. Learning the standard
anatomy now makes every later test — unit, integration, or end-to-end — easy to read.

# Concept Explanation

### Arrange, Act, Assert

Almost every good test has three visible parts, in order:

1. **Arrange** — set up the inputs and the world the test needs.
2. **Act** — perform the single action under test.
3. **Assert** — check the result against the expectation.

```python
def test_cart_total_sums_item_prices():
    cart = Cart()                 # Arrange
    cart.add(Item("pen", 3))
    cart.add(Item("mug", 7))

    total = cart.total()          # Act

    assert total == 10            # Assert
```

The blank lines aren't decoration — they mark the three phases so a reader parses the test at a
glance. This is the same idea as Gerard Meszaros's **Four-Phase Test** (setup, exercise, verify,
teardown); AAA folds the optional teardown into the framework's cleanup.

### One behavior per test

A test should pin **one logical concept**. That's not a dogmatic "exactly one `assert`" — several
assertions about the *same* behavior are fine (e.g., checking two fields of one returned object). What
you avoid is a single test that exercises several unrelated behaviors, because then a failure is
ambiguous and the first failing assert hides the rest.

```python
# Too much: three unrelated behaviors in one test.
def test_user():
    assert normalize_email(" A@X.com ") == "a@x.com"
    assert is_adult(birthdate="2015-01-01") is False
    assert full_name("Ada", "Lovelace") == "Ada Lovelace"
```

Split that into three named tests; each failure then names exactly what broke.

### Names that read like a spec

A test name should describe the **behavior**, ideally *subject → condition → expected*. Compare:

```text
test_1                              ✗ tells you nothing
test_discount                       ✗ vague
test_discount_of_20_percent_off_100_is_80   ✓ reads like a requirement
```

With descriptive names, `pytest -v` output becomes living documentation of what the system does.

### Self-explanatory failures

pytest's assertion introspection already shows actual vs expected. You can add a message for extra
context, especially when the values alone aren't obvious:

```python
assert response.status_code == 200, f"unexpected status: {response.status_code}"
```

Keep the assertion about **one comparison** so the report points at a single fact.

# Key Terminology

- **Arrange-Act-Assert (AAA)** — the three phases of a well-structured test.
- **Four-Phase Test** — Meszaros's setup → exercise → verify → teardown pattern.
- **One logical concept per test** — a test targets a single behavior (not necessarily one `assert`).
- **Test name as specification** — a descriptive name that states the expected behavior.
- **Assertion message** — optional text shown when an assertion fails.

# Options and Trade-offs

| Decision | Option A | Option B | How to choose |
| -------- | -------- | -------- | ------------- |
| Assertions per test | Exactly one | One behavior (maybe several asserts) | Group asserts that describe the *same* behavior; split unrelated ones. |
| Naming style | Short (`test_add`) | Descriptive (`test_add_negatives_returns_sum`) | Descriptive names make the report self-documenting. |
| Structure | Free-form | Explicit AAA sections | Explicit AAA is easier to scan and maintain. |

# Worked Example

Turning a vague test into a clear one:

```python
# Before: unclear name, tangled phases, two behaviors.
def test_it_works():
    p = Parser(); assert p.parse("1+2") == 3; assert p.parse("") is None
```

```python
# After: two focused tests, each with clean AAA and a spec-like name.
def test_parse_adds_two_numbers():
    parser = Parser()                 # Arrange
    result = parser.parse("1+2")      # Act
    assert result == 3                # Assert


def test_parse_returns_none_for_empty_input():
    parser = Parser()                 # Arrange
    result = parser.parse("")         # Act
    assert result is None             # Assert
```

Now a red run says exactly which behavior broke — "adds two numbers" or "empty input" — before you
read a single line of code.

# Real World Analogy

A good test is like a **well-written lab experiment**. First you *prepare* the apparatus and reagents
(Arrange), then you *run* the one reaction you're studying (Act), then you *record whether* the
outcome matched the hypothesis (Assert). A lab notebook that mixed three experiments on one line, with
the title "stuff", would be useless to the next scientist — and so is a test named `test_it_works`
that checks five things at once.

# Examples

## Example 1 — Basic: clean AAA

```python
def test_slugify_lowercases_and_hyphenates():
    text = "Hello World"            # Arrange
    slug = slugify(text)            # Act
    assert slug == "hello-world"    # Assert
```

**Why this works:** three visible phases, one behavior, and a name that states the rule being checked.

## Example 2 — Real-world: multiple asserts, one behavior

```python
def test_parsing_a_date_sets_all_fields():
    d = parse_date("2026-08-31")            # Act (Arrange is the literal)
    assert (d.year, d.month, d.day) == (2026, 8, 31)
```

**Why this works:** three assertions, but all about the *single* behavior "parse a date into its
fields" — so the test stays focused even with more than one check.

## Example 3 — Pitfall: the grab-bag test

```python
def test_account():
    acct = Account()
    acct.deposit(100)
    assert acct.balance == 100
    acct.withdraw(30)
    assert acct.balance == 70
    assert acct.can_withdraw(1000) is False
    assert acct.history[0].kind == "deposit"
```

**Why this bites:** deposits, withdrawals, overdraft rules, and history are four behaviors. If the
first assert fails, pytest stops and you never learn about the others; and the name `test_account`
tells you nothing about which rule broke. Split into four named tests.

# Common Mistakes

- **Testing several behaviors at once**, so a failure is ambiguous and later asserts never run.
- **Meaningless names** (`test_1`, `test_it_works`) that make red runs hard to triage.
- **No visible structure** — arrange, act, and assert all mashed together on one line.
- **Asserting on incidental details** unrelated to the behavior, making the test brittle.

# Best Practices

- Write tests in explicit **Arrange / Act / Assert** blocks, separated by blank lines.
- Keep each test about **one behavior**; multiple asserts are fine if they describe that behavior.
- Name tests as **subject → condition → expected result** so the report documents the system.
- Add an assertion **message** when the raw values wouldn't be self-explanatory.

# Summary

- Every good test has three phases: **Arrange, Act, Assert** (a fold of the Four-Phase Test).
- Target **one logical concept** per test — not necessarily one `assert`, but one behavior.
- Use **descriptive names** so `pytest -v` reads like a specification.
- Make failures self-explanatory with a single clear comparison and an optional message.

# Flash Cards

Q: What do the three A's in AAA stand for?
A: Arrange (set up inputs and state), Act (perform the one action under test), Assert (check the result against the expectation).

Q: Does "one concept per test" mean exactly one assert?
A: No — it means one behavior. Several assertions about the same behavior are fine; avoid testing unrelated behaviors in a single test.

Q: Why prefer descriptive test names like test_discount_of_20_percent_off_100_is_80?
A: The name states the expected behavior, so a verbose run reads like living documentation and a failure immediately tells you what broke.

Q: How does AAA relate to Meszaros's Four-Phase Test?
A: The Four-Phase Test is setup → exercise → verify → teardown; AAA is the same shape with teardown handled by the framework's cleanup.

Q: What's the risk of one test that checks four unrelated behaviors?
A: The first failing assert stops the test, hiding the others, and a vague name makes it hard to tell which behavior actually broke.

Q: When should you add a message to an assertion?
A: When the actual/expected values alone wouldn't make the failure obvious — the message adds the missing context.

# Exercises

### Easy
Take `test_it_works(): assert p.parse("1+2") == 3; assert p.parse("") is None` and rewrite it as two
tests with AAA structure and descriptive names.

### Medium
Write a test for a `Cart.total()` method using explicit Arrange / Act / Assert blocks separated by
blank lines, checking the total of two items.

### Challenging
Find (or invent) a `test_account`-style grab-bag test that checks 3+ behaviors. Split it into focused
tests, and explain for one of them how the improved name would speed up debugging a failure.

# Further Reading

- Martin Fowler — *GivenWhenThen* (a sibling of Arrange-Act-Assert): <https://martinfowler.com/bliki/GivenWhenThen.html>
- Gerard Meszaros — *Four-Phase Test*: <http://xunitpatterns.com/Four%20Phase%20Test.html>
- pytest — *How to write and report assertions*: <https://docs.pytest.org/en/stable/how-to/assert.html>
- *Software Engineering at Google* — *Testing Overview* (readable tests): <https://abseil.io/resources/swe-book/html/ch11.html>
