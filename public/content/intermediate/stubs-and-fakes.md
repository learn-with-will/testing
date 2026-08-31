---
id: lesson-10
slug: stubs-and-fakes
title: "Stubs and Fakes"
level: intermediate
order: 10
duration: 18
tags:
  - stubs
  - fakes
  - state-verification
  - in-memory
  - canned-responses
summary: "The two doubles you'll reach for most — stubs that feed canned answers into your code and fakes that are lightweight working implementations — how to build each, when a fake beats a pile of stubs, and why both go with state verification."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Build a **stub** that returns canned values (and raises canned errors).
- Build a **fake** — a lightweight working implementation — and test against it.
- Decide when a **fake** is better than stubbing many calls.
- Verify **state / results** rather than interactions.

# Why It Matters

Most of the time you replace a dependency, you don't care *that* a method was called — you care that
your code produced the right **result** given a controlled input. That's the job of **stubs** and
**fakes**, the two doubles that pair with **state verification**. They keep tests deterministic and
fast without coupling them to your code's internal call sequence (the coupling that makes mock-heavy
tests brittle, as we'll see later). Knowing how to build each — and when a fake beats a wall of
stubs — is a core testing skill.

# Concept Explanation

### Stubs: canned answers

A **stub** answers the calls your code makes with fixed data, turning an unpredictable dependency into
a controlled input. You can hand-write one as a small class, or configure a `Mock`:

```python
from unittest.mock import Mock

# Hand-written stub
class StubRates:
    def usd_to_eur(self, amount):
        return amount * 0.9          # always this rate, deterministic

# Or a configured Mock acting as a stub
rates = Mock()
rates.usd_to_eur.return_value = 90   # canned answer for any call
```

Stubs can also feed **error paths** by raising: with `unittest.mock`, `side_effect` makes a call raise
(or return a sequence):

```python
api = Mock()
api.fetch.side_effect = TimeoutError("slow")   # stub the failure case
# api.fetch(...) now raises TimeoutError, so you can test your retry/handling logic
```

### Fakes: real behavior, cheaply

A **fake** is a genuine (if simplified) implementation — it actually *works*, just not at production
quality. The classic example is an **in-memory** version of a repository or database:

```python
class InMemoryKeyValue:
    def __init__(self):
        self._data = {}
    def set(self, key, value):
        self._data[key] = value
    def get(self, key):
        return self._data.get(key)
    def delete(self, key):
        self._data.pop(key, None)
```

Your code uses it exactly like the real store, but there's no network, no disk, and no cleanup — and
you verify the **end state** (what's stored after a sequence of operations).

### Stub or fake?

- Use a **stub** when your code makes **one or a few reads** and you just need canned answers.
- Use a **fake** when the collaborator is **stateful** — you write *and* read, or perform a sequence —
  because stubbing each call's return value by hand becomes fragile and unrealistic. A fake tracks
  state naturally.

### Keep the fake honest

A fake is only useful if it behaves like the real thing on the parts you rely on. Where it matters,
teams write a **shared contract test** (the same tests run against both the fake and the real
implementation) to keep them in sync — otherwise your fake can drift and give false confidence.

# Key Terminology

- **Stub** — a double returning canned answers to your code's calls.
- **`return_value`** — configures a `Mock`'s canned return.
- **`side_effect`** — makes a `Mock` raise, or return a sequence, per call.
- **Fake** — a working, simplified implementation (often in-memory).
- **State verification** — asserting on the resulting state / return value.
- **Contract test** — shared tests run against both fake and real to prevent drift.

# Options and Trade-offs

| Situation | Reach for | Why |
| --------- | --------- | --- |
| One canned read (config, rate, single API reply) | Stub | Minimal setup; just return fixed data. |
| Test an error/timeout path | Stub with `side_effect` | Deterministically trigger the failure branch. |
| Stateful collaborator (write then read) | Fake | Tracks state realistically; avoids brittle per-call stubs. |
| Keeping a fake trustworthy | Contract test | Same tests against fake and real prevent drift. |

# Worked Example

Testing a `convert_and_log` function that reads a rate and stores a record:

```python
def convert_and_log(amount, rates, store):
    eur = rates.usd_to_eur(amount)       # a read → stub is fine
    store.set("last", eur)               # stateful write+read → fake is better
    return eur

def test_convert_and_log():
    rates = Mock()
    rates.usd_to_eur.return_value = 90   # STUB: canned answer
    store = InMemoryKeyValue()           # FAKE: real behavior, in memory

    result = convert_and_log(100, rates, store)

    assert result == 90                  # state verification: the return value
    assert store.get("last") == 90       # state verification: the end state in the fake
```

The rate lookup is a simple read (stub), while the store is stateful (fake). Both assertions check
**results**, not which methods were called.

# Real World Analogy

A **stub** is a **vending machine rigged to always dispense the same snack** — press any button, get
the test snack, every time. A **fake** is a **toy cash register that really adds up and makes change**
— not the bank's system, but it behaves correctly for the amounts you test. You use the rigged vending
machine when you just need a predictable item, and the toy register when you need something that
actually keeps a running total.

# Examples

## Example 1 — Basic: a stubbed reader

```python
def test_greeting_uses_stubbed_config():
    config = Mock()
    config.get.return_value = "Hi"       # canned
    assert greet("Ada", config) == "Hi, Ada"
```

**Why this works:** the config is a single read; a stub returns a fixed value so the test is
deterministic and about the greeting logic.

## Example 2 — Real-world: a fake repository for a workflow

```python
def test_transfer_moves_balance():
    accounts = InMemoryKeyValue()        # fake
    accounts.set("alice", 100)
    accounts.set("bob", 0)

    transfer(accounts, "alice", "bob", 40)

    assert accounts.get("alice") == 60   # end state after write+read
    assert accounts.get("bob") == 40
```

**Why this works:** transfer writes and reads multiple keys; the fake tracks that state naturally, and
the test asserts the resulting balances.

## Example 3 — Pitfall: a fake that lies

```python
class InMemoryUsers:
    def add(self, user): self._u = user
    def get(self, uid): return self._u        # ignores uid — returns the LAST user for ANY id!
```

**Why this bites:** this fake doesn't behave like a real repository (it ignores the id), so tests pass
against it while the real code path is broken. A fake must be faithful on the behavior you depend on —
guard it with a contract test if it matters.

# Common Mistakes

- **Stubbing a stateful collaborator call-by-call**, producing brittle, unrealistic tests — use a fake.
- **A fake that diverges** from real behavior, giving false confidence — add a contract test.
- **Forgetting the error paths** — use `side_effect` to stub timeouts/exceptions and test handling.
- **Asserting on calls instead of results** when you actually care about the outcome (that's a stub's
  domain — verify state).

# Best Practices

- Use a **stub** for simple canned reads; use **`side_effect`** to stub failures.
- Use a **fake** for stateful collaborators, and assert the **end state**.
- Keep fakes **faithful**; where correctness matters, run a **contract test** against fake and real.
- Verify **results/state** — that's what stubs and fakes are for.

# Summary

- A **stub** feeds canned answers (`return_value`) and can trigger errors (`side_effect`).
- A **fake** is a working, simplified implementation (often in-memory) that tracks real state.
- Prefer a **fake** over many hand-stubbed calls for stateful collaborators.
- Both pair with **state verification** — assert the result, not the interaction.

# Flash Cards

Q: What is a stub and what does it pair with?
A: A double that returns canned answers to your code's calls; it pairs with state verification — you check the result your code produced from that fixed input.

Q: How do you make a Mock stub raise an exception to test an error path?
A: Set `mock.method.side_effect = SomeError(...)`; the next call raises it, so you can test your handling/retry logic deterministically.

Q: What is a fake?
A: A working but simplified implementation (commonly in-memory) that actually behaves like the real dependency, so you can verify end state without the real cost.

Q: When is a fake better than stubbing each call?
A: When the collaborator is stateful (you write then read, or run a sequence) — a fake tracks state naturally, whereas per-call stubs get brittle and unrealistic.

Q: What is a contract test and why use it with a fake?
A: The same tests run against both the fake and the real implementation, keeping them in sync so the fake doesn't drift and give false confidence.

Q: Do stubs and fakes verify which methods were called?
A: No — they support state verification; you assert on the resulting return value or stored state, not on the interactions (that's what mocks do).

# Exercises

### Easy
Configure a `Mock` as a stub whose `get_temperature()` returns `21`, and write a test that your
`is_comfortable(sensor)` returns `True`.

### Medium
Write an `InMemoryKeyValue` fake and use it to test a `save_then_load` workflow, asserting the value
round-trips. Then add a test using `side_effect` to simulate the store raising on `set`.

### Challenging
Write a faithful `InMemoryUsers` fake (respecting the id), then sketch a contract test — a single set
of tests you could run against both the fake and a real repository — and explain what drift it would
catch.

# Further Reading

- Martin Fowler — *Mocks Aren't Stubs* (stubs, fakes, state vs behavior): <https://martinfowler.com/articles/mocksArentStubs.html>
- Gerard Meszaros — *Fake Object* and *Test Stub*: <http://xunitpatterns.com/Fake%20Object.html>
- Python — *unittest.mock* (`return_value`, `side_effect`): <https://docs.python.org/3/library/unittest.mock.html>
- *Software Engineering at Google* — *Test Doubles*: <https://abseil.io/resources/swe-book/html/ch13.html>
