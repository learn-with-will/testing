---
id: lesson-23
slug: a-pragmatic-testing-strategy
title: "A Pragmatic Testing Strategy"
level: advanced
order: 23
duration: 20
tags:
  - strategy
  - risk-based
  - maintainability
  - regression
  - roi
summary: "Bringing the course together into judgment — deciding what to test and how much based on risk, keeping suites fast and maintainable, turning every bug into a regression test, and recognizing when not to write a test at all."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Decide **what to test and how much** using **risk** and **cost-benefit**.
- Apply the pyramid/trophy as **judgment**, not dogma.
- Keep a suite **maintainable**: fast, deterministic, readable.
- Turn bugs into **regression tests**, and know when **not** to test.

# Why It Matters

By now you have the tools — units, doubles, TDD, integration, E2E, coverage, property and mutation
testing, CI. Strategy is knowing **which to use where**, so your effort buys the most safety per hour.
Test too little and bugs ship; test everything equally and the suite becomes a slow, brittle tax that
outweighs its value. A pragmatic strategy treats testing as **risk management**: concentrate effort
where a failure would hurt most and where mistakes are most likely, and go light where the risk is
trivial.

# Concept Explanation

### Test by risk, not by rote

Prioritize with two questions: **How bad if it breaks?** (impact) and **How likely to be wrong?**
(complexity, churn, past bugs). High-impact **and** intricate code (money, auth, data integrity, tricky
algorithms) earns thorough testing at multiple levels. Low-impact, simple, stable code (a trivial getter)
earns little or none.

```text
                 high impact
                     ▲
   test well,        │        test heavily,
   watch for churn   │        multiple levels
   ──────────────────┼──────────────────►  high complexity / churn
   minimal or        │        test the logic,
   no tests          │        cover edge cases
                     │
```

### Right test, right level

Use the **pyramid** as a default (many unit, fewer integration, few E2E), and adjust — the **trophy**'s
integration emphasis suits UI-heavy code. Push each check to the **lowest level that gives real
confidence**: prefer a fast unit test to an integration test to an E2E test when it can catch the same
bug. Reserve E2E for **critical journeys**.

### Maintainability is a feature

A suite people trust and keep is one that is:

- **Fast** — so it runs constantly (slow suites get skipped).
- **Deterministic** — no flakes (Lesson 18), or trust collapses.
- **Readable** — behavior-named tests (Lesson 3) that double as documentation.
- **Behavior-focused** — not coupled to implementation (Lesson 16), so refactoring stays cheap.

Tests are code you maintain forever; a brittle or slow test can cost more than the bug it might catch.

### Every bug becomes a test

When a bug escapes, first write a **failing test that reproduces it**, then fix the code. This does two
things: proves your fix works, and adds a **regression test** so the bug can't silently return. Over
time your suite becomes a memory of every mistake the system has made.

### When not to test

Testing has a cost; sometimes it's not worth it:

- **Trivial code** with no logic (a plain getter, a constant).
- **Throwaway spikes / prototypes** you'll delete.
- **Exploratory work** where you don't yet know the design (test once it stabilizes).
- **Framework/library internals** you don't own (test *your* usage at the boundary, not their code).

"Don't test" is a legitimate, deliberate choice — different from *forgetting* to test. Spend the saved
effort where risk is real.

### Balancing under- and over-testing

- **Under-testing** — critical paths untested, bugs reach users, refactoring is scary.
- **Over-testing** — redundant/duplicated tests, brittle implementation-coupled tests, a slow suite
  that's ignored. More tests is not strictly better; **useful** tests are better.

# Key Terminology

- **Risk-based testing** — allocating effort by impact × likelihood of failure.
- **Cost-benefit / ROI** — weighing a test's value against its writing and maintenance cost.
- **Regression test** — a test added to lock in a fix so the bug can't return.
- **Maintainable suite** — fast, deterministic, readable, behavior-focused.
- **Lowest useful level** — the cheapest test level that still catches the bug.
- **Deliberate non-testing** — consciously choosing not to test low-risk code.

# Options and Trade-offs

| Situation | Under-test risk | Over-test risk | Pragmatic move |
| --------- | --------------- | -------------- | -------------- |
| Payment/auth logic | Severe | Low | Test thoroughly, multiple levels |
| Trivial getter | Negligible | Wasted effort/brittleness | Skip or one light test |
| A found bug | Recurs silently | — | Add a regression test, then fix |
| Prototype/spike | Low (throwaway) | Wasted effort | Defer tests until it stabilizes |
| UI-heavy feature | Missed integration bugs | Slow E2E overuse | Lean on integration (trophy) |

# Worked Example

Triaging a small app's testing effort by risk:

```text
Module                  Impact   Complexity   Strategy
----------------------  -------  ----------   ----------------------------------------
billing.charge()        High     High         Unit (edge cases) + integration + 1 E2E
auth.verify_password()  High     Medium       Unit incl. wrong/empty; property test
pricing.apply_rules()   Medium   High         Unit + parametrized boundaries; mutation-audit
utils.title_case()      Low      Low          One example test
models.User.full_name   Low      Trivial      No dedicated test (covered incidentally)
```

The effort concentrates on `billing` and `auth` (costly if wrong) and `pricing` (intricate, bug-prone),
while trivial helpers get little or nothing. Same total effort, far more safety than testing everything
uniformly.

# Real World Analogy

A pragmatic testing strategy is like a **hospital triage nurse**. Everyone who walks in *could* be seen
at maximum depth, but resources are finite, so the nurse sorts by **severity and likelihood**: the chest
pain gets the full workup now; the paper cut gets a plaster. Treating every patient as an emergency would
collapse the system and *delay* the people who truly need care. Good triage — like good testing — puts
the most effort where the risk is greatest, and isn't shy about a light touch where it isn't.

# Examples

## Example 1 — Basic: turn a bug into a regression test

```python
# A user reported that discounts over 100% produced negative prices.
def test_discount_over_100_percent_is_rejected():   # written FIRST, reproduces the bug
    with pytest.raises(ValueError):
        apply_discount(50, pct=120)
# then fix apply_discount to validate pct — the test locks the fix in forever
```

**Why this works:** the failing test reproduces the reported bug; after the fix it stands guard against
the bug ever returning.

## Example 2 — Real-world: choosing the lowest useful level

A bug lives in date-rounding logic used by a report. Rather than a slow E2E test through the whole
report UI, you write a **unit** test for the rounding function with boundary dates — same bug caught, in
milliseconds, precisely located.

**Why this works:** pushing the test to the lowest level that still catches the bug keeps it fast and
diagnostic, reserving E2E for genuine end-to-end journeys.

## Example 3 — Pitfall: over-testing trivia while criticals slip

A team has 50 tests for string helpers and getters, and **none** for the payment path. Coverage looks
high; the suite is slow; then a billing bug ships.

**Why this bites:** effort went to low-risk, low-complexity code (padding the count) while the
high-impact path was neglected. Tests should follow **risk**, not whatever is easiest to test.

# Common Mistakes

- **Uniform effort** — testing trivial and critical code equally, misallocating time.
- **Chasing counts/coverage** instead of **risk** and **usefulness**.
- **Letting the suite rot** — slow, flaky, or implementation-coupled tests people stop trusting.
- **Not converting bugs into regression tests**, so the same defects recur.

# Best Practices

- Allocate testing effort by **risk** (impact × likelihood); go deep on critical, intricate code.
- Catch each bug at the **lowest useful level**; reserve E2E for **critical journeys**.
- Keep the suite **fast, deterministic, readable, behavior-focused** — maintainability is value.
- **Reproduce every bug with a test first**, then fix; deliberately **skip** genuinely low-risk code.

# Summary

- Treat testing as **risk management**: most effort where failure is costly and code is error-prone.
- Use the pyramid/trophy as **judgment**; push tests to the **lowest level** that gives confidence.
- A trustworthy suite is **fast, deterministic, readable, and behavior-focused**.
- Turn bugs into **regression tests**; it's fine — and wise — to **not** test trivial code.

# Flash Cards

Q: What two factors should drive how much you test something?
A: Impact (how bad if it breaks) and likelihood of failure (complexity, churn, past bugs) — concentrate effort where both are high; go light where risk is trivial.

Q: What does "test at the lowest useful level" mean?
A: Catch a bug with the cheapest test that still gives real confidence — prefer a fast unit test to an integration test to an E2E test when it catches the same issue.

Q: What should you do the moment a bug is reported?
A: Write a failing test that reproduces it, then fix the code — this proves the fix and leaves a regression test so the bug can't silently return.

Q: Name qualities of a maintainable test suite.
A: Fast (so it's run), deterministic (no flakes), readable (behavior-named), and behavior-focused (not coupled to implementation, so refactoring stays cheap).

Q: When is it reasonable not to write a test?
A: For trivial code with no logic, throwaway prototypes/spikes, unstable exploratory work, or third-party internals you don't own — deliberately, to spend effort where risk is real.

Q: Why isn't "more tests" automatically better?
A: Over-testing adds redundant, brittle, slow tests that get ignored and raise maintenance cost; useful tests aimed at real risk beat sheer quantity.

# Exercises

### Easy
List three modules or functions in a project you know and rate each by impact and complexity. Say which
deserves the most testing and why.

### Medium
Take a bug you've encountered (or invent one). Write the failing regression test that reproduces it,
then describe the fix that makes it pass.

### Challenging
For a small app, write a one-page testing strategy: which parts get unit/integration/E2E tests, what you
deliberately won't test and why, how you'll keep the suite fast, and how you'll handle a flaky test in
CI. Justify each choice by risk.

# Further Reading

- Martin Fowler — *The Practical Test Pyramid* (strategy): <https://martinfowler.com/articles/practical-test-pyramid.html>
- Kent C. Dodds — *The Testing Trophy*: <https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications>
- *Software Engineering at Google* — *Testing Overview* (what/how much to test): <https://abseil.io/resources/swe-book/html/ch11.html>
- Martin Fowler — *SelfTestingCode*: <https://martinfowler.com/bliki/SelfTestingCode.html>
