---
id: lesson-16
slug: testing-behavior-not-implementation
title: "Testing Behavior, Not Implementation"
level: intermediate
order: 16
duration: 18
tags:
  - behavior
  - implementation-details
  - brittle-tests
  - refactoring
  - public-api
summary: "Why good tests assert on observable behavior through the public API rather than private internals — how implementation-coupled tests become brittle 'change detectors' that break on safe refactors, and how behavior-focused tests give you the confidence to change code."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Distinguish **behavior** (what code does) from **implementation** (how it does it).
- Explain why implementation-coupled tests become **brittle**.
- Write tests through the **public API** that survive refactoring.
- Recognize over-mocking and private-detail assertions as warning signs.

# Why It Matters

A key promise of tests is **confidence to change code**: refactor freely, and the tests tell you if you
broke something. But that promise only holds if tests check **what** the code does, not **how**. Tests
welded to internal details — private methods, exact call sequences, internal data structures — break
every time you tidy the code, even when behavior is unchanged. These "change-detector" tests punish
improvement and train people to distrust the suite. Learning to test behavior is what makes a test
suite an asset instead of a tax.

# Concept Explanation

### Behavior vs implementation

- **Behavior** — the observable contract: given these inputs (and starting state), the code returns
  this result / produces this visible effect. This is what users and callers depend on.
- **Implementation** — the private choices that fulfill the contract: helper methods, internal
  variables, the order of internal calls, which data structure you used. Callers can't see these, and
  you should be free to change them.

Test the **behavior**; treat the implementation as replaceable.

### Why implementation-coupled tests are brittle

A test that asserts on internals fails when you change internals — *even if behavior is identical*.
That's a **false failure**: red without a real bug. Symptoms:

- Asserting a **private** method was called, or reaching into a private attribute.
- **Over-mocking**: verifying the exact internal call sequence (Lesson 11) so any restructuring breaks
  the test.
- Depending on incidental output format, ordering that isn't part of the contract, or a specific
  algorithm.

The cost isn't just annoyance: brittle tests make people **avoid refactoring** (to keep tests green),
so code quality decays.

### Test through the public API

Exercise the unit the way real callers do — its **public interface** — and assert on what they can
observe: the return value, the resulting state, or a required side effect. Then any internal rewrite
that preserves the contract keeps the tests green.

```python
# Brittle: couples to a private helper and internal storage.
def test_brittle():
    c = Cart()
    c.add(Item("pen", 3))
    assert c._items[0].price == 3        # private field!
    assert c._recalc_called is True      # internal bookkeeping!

# Robust: asserts observable behavior through the public API.
def test_robust():
    c = Cart()
    c.add(Item("pen", 3))
    assert c.total() == 3                # what callers actually rely on
```

If you later store items in a dict, precompute totals, or rename `_recalc`, `test_robust` still passes;
`test_brittle` breaks for no good reason.

### The refactoring test

A useful gut check: *"If I refactor the implementation without changing behavior, should this test
still pass?"* If the honest answer is "no", the test is coupled to implementation — loosen it. Good
tests double as a **specification** of behavior, not a transcript of the code.

# Key Terminology

- **Behavior** — the observable contract of a unit (inputs → results/effects).
- **Implementation detail** — a private, replaceable choice about *how* the contract is met.
- **Public API** — the interface callers use; the right surface to test.
- **Brittle / change-detector test** — one that breaks on refactors without real bugs.
- **False failure** — red without a genuine defect.
- **Refactoring** — changing structure without changing behavior.

# Options and Trade-offs

| Assertion target | Robustness | When acceptable |
| ---------------- | ---------- | --------------- |
| Return value / observable state | High | Almost always — the default |
| Required side effect (email sent) | High | When the effect *is* the behavior |
| Internal call sequence (mocks) | Low | Only when the interaction is the contract |
| Private method / private field | Very low | Rarely; usually a design smell |

# Worked Example

Refactoring should keep behavior tests green:

```python
# Version 1
class PriceList:
    def __init__(self):
        self._prices = {}                 # dict
    def set(self, sku, price):
        self._prices[sku] = price
    def price_of(self, sku):
        return self._prices.get(sku, 0)

# Behavior test — no internals mentioned.
def test_price_of_returns_set_price():
    pl = PriceList()
    pl.set("A", 9)
    assert pl.price_of("A") == 9
    assert pl.price_of("Z") == 0          # default for unknown sku
```

```python
# Version 2 — completely different internals (a list of tuples), same behavior.
class PriceList:
    def __init__(self):
        self._rows = []
    def set(self, sku, price):
        self._rows.append((sku, price))
    def price_of(self, sku):
        return next((p for s, p in reversed(self._rows) if s == sku), 0)
```

The behavior test passes against **both** versions, so it protected the refactor. A test asserting
`pl._prices["A"] == 9` would have broken on Version 2 despite identical behavior.

# Real World Analogy

Judge a **restaurant by the meal, not the recipe**. Behavior testing is the food critic tasting the
dish: is it delivered, correct, and good? The kitchen is free to swap suppliers, reorder steps, or buy
a new oven — as long as the plate is right. An implementation-coupled test is a critic who storms out
because the chef stirred counter-clockwise or used a different brand of salt — details the diner never
perceives. That critic makes the kitchen afraid to improve anything.

# Examples

## Example 1 — Basic: assert the result, not the route

```python
def test_sum_even_numbers():
    assert sum_even([1, 2, 3, 4]) == 6     # behavior: the total
    # NOT: assert that it used a list comprehension, or a helper, or looped twice
```

**Why this works:** it pins the contract (sum of evens) and lets the implementation be anything that
computes it.

## Example 2 — Real-world: a side effect that is the behavior

```python
def test_password_reset_sends_one_email(mailer):
    request_reset(user, mailer)
    mailer.send.assert_called_once()       # the email IS the observable behavior here
```

**Why this works:** sending the email is the contract (not an internal detail), so verifying that one
interaction is legitimate behavior testing — while still not asserting *how* the message was built.

## Example 3 — Pitfall: the change-detector test

```python
def test_report_builder():
    b = ReportBuilder()
    b.build(data)
    assert b._sections == ["header", "body", "footer"]   # internal list
    b._normalize.assert_called_once()                    # private step
```

**Why this bites:** rename `_sections`, merge the normalize step, or reorder internal construction —
all behavior-preserving — and the test goes red. It documents the *code*, not the *contract*, and
discourages any cleanup. Assert the produced report instead.

# Common Mistakes

- **Asserting on private methods/fields** — couples the test to replaceable internals.
- **Over-mocking the internal call sequence** — turns refactors into false failures.
- **Pinning incidental details** (ordering, format) that aren't part of the contract.
- **Treating tests as a transcript of the implementation** rather than a spec of behavior.

# Best Practices

- Test through the **public API**; assert **return values, observable state, or required effects**.
- Ask the **refactoring question**: would a behavior-preserving change still pass? If not, loosen it.
- Reserve **behavior verification** (mocks) for interactions that *are* the contract.
- Keep tests reading like a **specification** of what the unit promises.

# Summary

- Test **what** code does (behavior), not **how** (implementation).
- Implementation-coupled tests are **brittle change detectors** that punish refactoring with false
  failures.
- Assert on **public results, state, or required side effects** — not private internals or call
  sequences.
- Good behavior tests give you **confidence to refactor** and read like a spec.

# Flash Cards

Q: What's the difference between behavior and implementation?
A: Behavior is the observable contract (inputs → results/effects that callers depend on); implementation is the private, replaceable how — helpers, internal variables, call order.

Q: Why are implementation-coupled tests brittle?
A: They fail whenever internals change, even if behavior is identical — false failures that break on safe refactors and discourage improving the code.

Q: What surface should you test through?
A: The public API — assert on return values, observable state, or required side effects, the way real callers experience the unit.

Q: What is the "refactoring question" gut check?
A: "If I change the implementation without changing behavior, should this test still pass?" If the answer is no, the test is coupled to implementation and should be loosened.

Q: When is asserting a method call (behavior verification) legitimate?
A: When the interaction itself is the contract — e.g., a password reset must send an email — not when it's an incidental internal step.

Q: What's a "change-detector" test?
A: A test coupled to internals (private fields, exact call order) that detects any code change rather than any behavior change, producing red without real bugs.

# Exercises

### Easy
Given a `Stack` class, write a behavior test using only `push`, `pop`, and `is_empty` (the public API),
without touching any internal list.

### Medium
Take a test that asserts on a private attribute (e.g., `obj._cache`). Rewrite it to assert observable
behavior instead, and describe an internal change that would now be safe.

### Challenging
Write two implementations of a small class with different internals but identical behavior. Write one
behavior test that passes against both, and one implementation-coupled test that passes against only
one. Explain what this demonstrates about brittle tests.

# Further Reading

- Martin Fowler — *Refactoring* & *Self Testing Code*: <https://martinfowler.com/bliki/SelfTestingCode.html>
- Kent C. Dodds — *Testing Implementation Details*: <https://kentcdodds.com/blog/testing-implementation-details>
- Martin Fowler — *Mocks Aren't Stubs* (over-specification): <https://martinfowler.com/articles/mocksArentStubs.html>
- *Software Engineering at Google* — *Testing Overview* (change-detector tests): <https://abseil.io/resources/swe-book/html/ch11.html>
