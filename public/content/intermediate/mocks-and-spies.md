---
id: lesson-11
slug: mocks-and-spies
title: "Mocks and Spies"
level: intermediate
order: 11
duration: 18
tags:
  - mocks
  - spies
  - behavior-verification
  - unittest-mock
  - assert-called
summary: "Behavior verification with mocks and spies — using unittest.mock to assert that your code made the right calls, the assert_called family and call inspection, when interaction is the behavior you must check, and the risk of over-verifying."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Use **`unittest.mock`** to verify that your code **called a collaborator correctly**.
- Apply the **`assert_called*`** family and inspect `call_args` / `call_count`.
- Recognize when **behavior verification** is the right choice (side-effect-only collaborators).
- Avoid **over-verification** that couples tests to incidental details.

# Why It Matters

Sometimes the behavior you need to test *is* an interaction: "when an order ships, an email **must** be
sent"; "on error, we **must** publish an alert". There's no return value to check — the *effect* is the
whole point. **Mocks** and **spies** verify these interactions. Used precisely, they pin important
side effects. Used carelessly, they turn into change-detector tests that break on every safe refactor —
so this lesson is as much about restraint as technique.

# Concept Explanation

### Behavior verification with a mock

A **mock** records the calls it receives and lets you **assert** them. Python's `unittest.mock.Mock`
(and `MagicMock`, which also supports magic methods like `len()`) is the standard tool:

```python
from unittest.mock import Mock

def ship(order, mailer):
    mailer.send(order.email, subject="Shipped")

def test_shipping_sends_an_email():
    mailer = Mock()
    ship(Order(email="a@b.com"), mailer)
    mailer.send.assert_called_once_with("a@b.com", subject="Shipped")
```

The test passes only if `send` was called **exactly once** with those arguments — behavior
verification.

### The assert family

`unittest.mock` gives several assertions and attributes:

```python
m.assert_called()                 # called at least once
m.assert_called_once()            # called exactly once
m.assert_called_with(2, 3)        # the MOST RECENT call had these args
m.assert_called_once_with(2, 3)   # called exactly once, with these args
m.assert_not_called()             # never called

m.call_count                      # number of calls (an int)
m.call_args                       # args of the most recent call
m.call_args_list                  # args of every call, in order
```

### Spies: record, then inspect

A **spy** emphasizes *recording* over pre-set expectations: let the code run, then inspect what
happened. Every `Mock` is already a spy — it records `call_args_list` and `call_count`. You can also
**wrap a real object** so the real behavior runs *and* calls are recorded:

```python
real = PaymentGateway()
spy = Mock(wraps=real)            # calls pass through to `real`, but are recorded
charge(spy, 10)
assert spy.charge.call_count == 1 # inspect afterwards
```

### When behavior verification is right — and wrong

Use it when the **interaction is the observable behavior** and there's no result to check: sending
email, publishing an event, writing to a log/queue, invalidating a cache. Avoid it when you *could*
check a **result or state** instead — verifying internal calls then just duplicates the implementation
and makes refactoring painful (the topic of Lesson 16).

# Key Terminology

- **Mock** — a double that verifies expected interactions (behavior verification).
- **`MagicMock`** — a `Mock` that also implements magic/dunder methods.
- **`assert_called_once_with(...)`** — asserts exactly one call, with given arguments.
- **`call_count` / `call_args` / `call_args_list`** — inspectable records of the calls.
- **Spy (`wraps=`)** — records calls while optionally passing through to a real object.
- **Over-verification** — asserting incidental calls, coupling the test to implementation.

# Options and Trade-offs

| Goal | Use | Note |
| ---- | --- | ---- |
| "An email must be sent" | Mock + `assert_called_once_with` | No return value to check; the call *is* the behavior. |
| "Retry exactly 3 times on error" | Mock + `call_count` / `call_args_list` | The number/args of calls is the contract. |
| Real behavior *and* a record | Spy with `wraps=` | Passes through, records calls. |
| A result you can check | Stub/fake + state assert | Prefer state verification; don't verify internal calls. |

# Worked Example

Verifying a retry policy — where the *pattern of calls* is the behavior:

```python
from unittest.mock import Mock

def fetch_with_retry(api, retries=3):
    for attempt in range(retries):
        try:
            return api.get()
        except TimeoutError:
            continue
    raise RuntimeError("all retries failed")

def test_retries_until_success():
    api = Mock()
    api.get.side_effect = [TimeoutError(), TimeoutError(), "ok"]  # stub the sequence

    result = fetch_with_retry(api)

    assert result == "ok"                 # state: the eventual result
    assert api.get.call_count == 3        # behavior: it retried the right number of times
```

Here the double is both a **stub** (the `side_effect` sequence feeds inputs) and a **mock/spy** (we
assert `call_count`). The retry *count* is genuine behavior worth verifying — but note we still assert
the **result** too.

# Real World Analogy

A mock is a **mystery shopper with a checklist**. The company doesn't just want the transaction to
complete — it wants proof the clerk *said the greeting*, *offered the receipt*, and *did it once*. The
shopper verifies those specific interactions happened as scripted. Useful for genuinely required
behaviors — but if the checklist demands the clerk use exactly the same words, tap the screen in a
fixed order, and stand on one foot, every harmless change to the routine "fails" the audit. That's
over-verification.

# Examples

## Example 1 — Basic: verify a required side effect

```python
from unittest.mock import Mock

def test_alert_is_published_on_failure():
    bus = Mock()
    handle_failure(bus, code=500)
    bus.publish.assert_called_once_with("alert", {"code": 500})
```

**Why this works:** publishing the alert is the behavior; there's no return value, so verifying the
call is exactly right.

## Example 2 — Real-world: a spy that wraps a real object

```python
from unittest.mock import Mock

def test_cache_is_consulted_before_the_db():
    real_cache = InMemoryKeyValue()
    cache = Mock(wraps=real_cache)         # real behavior + recording
    load_user(cache, db, uid=1)
    load_user(cache, db, uid=1)
    assert cache.get.call_count == 2       # consulted each time
```

**Why this works:** the wrapped cache behaves for real (so the code works), while the spy records that
it was consulted — verifying an interaction that has no separate return to check.

## Example 3 — Pitfall: over-verification

```python
def test_render_report():
    fmt = Mock()
    render_report(fmt, data)
    fmt.begin.assert_called_once()
    fmt.write_header.assert_called_once()
    fmt.write_row.assert_called()          # asserts every internal step...
    fmt.end.assert_called_once()
    # No assertion on the actual rendered output!
```

**Why this bites:** the test pins the *exact internal call sequence*, so any refactor of how the report
is assembled breaks it — even when the output is still correct. And it never checks the output itself.
Prefer asserting the produced report (state) over each internal call.

# Common Mistakes

- **Verifying internal calls** you could replace with a **result/state** assertion — brittle tests.
- **Using `assert_called_with` when you mean `assert_called_once_with`** — the former only checks the
  *latest* call and ignores extra calls.
- **Asserting a call but never the outcome** — check the result too when there is one.
- **Mocking so deeply** that the test mirrors the implementation and breaks on safe refactors.

# Best Practices

- Use behavior verification for **side-effect-only** collaborators (email, events, logs, queues).
- Prefer **`assert_called_once_with`** to pin both the count and the arguments.
- When there's a result, **assert the result** in addition to (or instead of) the calls.
- Keep verification to the **essential interaction**; don't assert incidental internal steps.

# Summary

- **Mocks/spies** verify **interactions** — use them when the call *is* the behavior.
- `unittest.mock` provides `assert_called*`, `call_count`, `call_args`, and `wraps=` for spying.
- Every `Mock` records calls (it's already a spy); `wraps=` runs the real object too.
- Guard against **over-verification** — prefer state assertions when a result exists.

# Flash Cards

Q: When is behavior verification (a mock) the right choice?
A: When the interaction itself is the observable behavior and there's no return value to check — e.g., an email must be sent, an event must be published.

Q: What does assert_called_once_with(args) check?
A: That the mock was called exactly once, and that its call used exactly those arguments — pinning both the count and the arguments.

Q: How does assert_called_with differ from assert_called_once_with?
A: assert_called_with only checks the most recent call's arguments (extra calls are ignored); assert_called_once_with also requires that there was exactly one call.

Q: How do you make a Mock spy that still runs the real object?
A: Create it with `Mock(wraps=real_object)`; calls pass through to the real object and are also recorded for inspection.

Q: What is over-verification and why is it harmful?
A: Asserting incidental internal calls (the exact call sequence) instead of the outcome; it couples the test to the implementation, so safe refactors break it.

Q: If a function both retries and returns a value, what should the test assert?
A: Both — the eventual result (state) and the number/pattern of calls (behavior) — since the result is real behavior even when the retry count matters.

# Exercises

### Easy
Write a `notify(user, mailer)` function and a test that verifies `mailer.send` was called once with the
user's email. Use `assert_called_once_with`.

### Medium
Test a `fetch_with_retry` that succeeds on the third try: stub `get` with a `side_effect` sequence of
two `TimeoutError`s then a value, and assert both the returned value and `call_count == 3`.

### Challenging
Take the over-verified `render_report` test. Rewrite it to assert the produced output instead of the
internal calls, and explain which single interaction (if any) still deserves behavior verification.

# Further Reading

- Python — *unittest.mock* (Mock, MagicMock, assert_called*): <https://docs.python.org/3/library/unittest.mock.html>
- Python — *unittest.mock* `wraps` and call inspection: <https://docs.python.org/3/library/unittest.mock.html#the-mock-class>
- Martin Fowler — *Mocks Aren't Stubs* (behavior verification): <https://martinfowler.com/articles/mocksArentStubs.html>
- Gerard Meszaros — *Test Spy* and *Mock Object*: <http://xunitpatterns.com/Test%20Spy.html>
