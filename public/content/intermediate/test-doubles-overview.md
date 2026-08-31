---
id: lesson-09
slug: test-doubles-overview
title: "Test Doubles Overview"
level: intermediate
order: 9
duration: 18
tags:
  - test-doubles
  - mock
  - stub
  - fake
  - spy
summary: "The precise vocabulary for stand-in objects that replace real dependencies in a test — dummy, stub, spy, mock, and fake — where each fits, and the key split between state verification (stubs/fakes) and behavior verification (mocks)."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Define **test double** and say why you'd replace a real dependency.
- Name and distinguish the five doubles: **dummy, stub, spy, mock, fake**.
- Tell apart **state verification** and **behavior verification**.
- Choose the *lightest* double that does the job.

# Why It Matters

Real code depends on things that are awkward in a test: a payment gateway, the system clock, a
database, an email server. To test your code in isolation you replace those with stand-ins called
**test doubles**. But "mock" gets thrown around for all of them, and the imprecision causes real
confusion — and real bugs, when people verify the wrong thing. This lesson installs the exact
vocabulary (from Gerard Meszaros's *xUnit Test Patterns* and Martin Fowler's *Mocks Aren't Stubs*) that
the next three lessons build on.

# Concept Explanation

### What a test double is

A **test double** is any object that stands in for a real component during a test — the umbrella term,
named by analogy with a movie *stunt double*. You reach for one when the real dependency is **slow,
non-deterministic, hard to set up, has side effects, or doesn't exist yet**.

### The five kinds (Meszaros)

They differ by how much they do:

- **Dummy** — passed only to fill a parameter list; **never actually used**. (e.g., a placeholder
  `user` a function requires but this test path ignores.)
- **Stub** — returns **canned answers** to the calls the test makes. It feeds fixed inputs into your
  code (e.g., a `Clock` stub that always returns `2026-01-01`).
- **Spy** — a stub that **also records** how it was called, so the test can inspect that afterward
  (e.g., "was `send()` called, and with what?"). It can wrap a real object.
- **Mock** — pre-programmed with **expectations** about the calls it should receive and **verifies**
  them; the test fails if the expected interaction doesn't happen. Mocks do **behavior verification**.
- **Fake** — a **working but simplified** implementation not suitable for production (e.g., an
  in-memory database standing in for the real one). It really *behaves*, just cheaply.

### State vs behavior verification

This is the split that matters most:

- **State verification** — run the code, then check the resulting **state or return value**. Stubs and
  fakes support this: "given this canned input, did my code produce the right output?"
- **Behavior verification** — check that your code **made the right calls** on its collaborators.
  Mocks and spies support this: "did my code call `charge()` exactly once with `$10`?"

Fowler's *Mocks Aren't Stubs* is precisely this distinction: a **stub** helps you assert on
**results**; a **mock** helps you assert on **interactions**.

### Names are roles, not classes

In Python, `unittest.mock.Mock`/`MagicMock` is one flexible object that can *act as* a stub, a spy, or
a mock depending on how you use it. The **role in the test** — canned input vs recorded/verified
interaction — is what earns the name, not the class you instantiated.

# Key Terminology

- **Test double** — any stand-in for a real dependency in a test (umbrella term).
- **Dummy** — filler passed but never used.
- **Stub** — provides canned answers (inputs to your code).
- **Spy** — a stub that records how it was called.
- **Mock** — verifies expected interactions (behavior verification).
- **Fake** — a lightweight working implementation (e.g., in-memory DB).
- **State vs behavior verification** — check the result vs check the calls made.

# Options and Trade-offs

| Double | Does it return canned data? | Does it record calls? | Verifies interactions? | Typical use |
| ------ | --------------------------- | --------------------- | ---------------------- | ----------- |
| Dummy | No | No | No | Fill a required parameter you don't use |
| Stub | Yes | No | No | Feed fixed inputs (clock, config, API reply) |
| Spy | Yes | Yes | You assert manually | "Was it called, and how?" |
| Mock | Yes | Yes | Yes (built-in expectations) | Assert the right calls were made |
| Fake | Yes (really computes) | No | No | Cheap working stand-in (in-memory DB) |

# Worked Example

The same collaborator, replaced by different doubles for different goals:

```python
# System under test: notify a user, returning True if the message was accepted.
def notify(user, sender):
    if not user.email:
        return False
    sender.send(user.email, "Hello!")
    return True
```

```python
from unittest.mock import Mock

def test_returns_false_without_email_uses_dummy():
    sender = Mock()                       # DUMMY here: this path never calls it
    assert notify(User(email=None), sender) is False

def test_sends_and_verifies_the_call():   # MOCK/SPY: behavior verification
    sender = Mock()
    notify(User(email="a@b.com"), sender)
    sender.send.assert_called_once_with("a@b.com", "Hello!")
```

The first test only needs a **dummy** (the sender is never used on that path). The second uses the same
object as a **mock/spy** to verify the interaction. Nothing real was sent.

# Real World Analogy

Test doubles are the **film crew's stand-ins**. A **dummy** is a cardboard cutout in the background —
present, never interacts. A **stub** is a body double who delivers the same scripted line every take
(canned answer). A **spy** is that double *plus* a clapperboard operator noting exactly what was said
and when. A **mock** is a director who *insists* the line be delivered precisely once, on cue, and
yells "cut!" if it isn't (verifies interaction). A **fake** is a cheaper working prop — a real
(plastic) sword that swings, just not battle-grade.

# Examples

## Example 1 — Basic: a stub feeding canned input

```python
class FixedClock:
    def now(self):
        return datetime(2026, 1, 1)      # canned answer

def test_is_new_year_uses_a_stub_clock():
    assert is_new_year(clock=FixedClock()) is True
```

**Why this works:** the stub removes real time, making the test deterministic — this is state
verification (check the returned boolean).

## Example 2 — Real-world: a fake in-memory repository

```python
class InMemoryUserRepo:               # FAKE: a real, simplified implementation
    def __init__(self): self._rows = {}
    def add(self, user): self._rows[user.id] = user
    def get(self, uid): return self._rows.get(uid)

def test_register_then_fetch_uses_a_fake_repo():
    repo = InMemoryUserRepo()
    register(repo, User(id=1, name="Ada"))
    assert repo.get(1).name == "Ada"   # state verification against the fake
```

**Why this works:** the fake behaves like a database without the cost, so you verify real end-state
without touching a real DB.

## Example 3 — Pitfall: verifying behavior when you meant state

```python
from unittest.mock import Mock

def test_totals():
    calc = Mock()
    calc.add.return_value = 7
    result = checkout(calc)
    calc.add.assert_called_once()       # only checks a call happened...
    # ...but never asserts `result`! A wrong total passes silently.
```

**Why this bites:** the test verifies an *interaction* but forgets the *outcome*. Over-focusing on
"was it called?" while ignoring "was the result right?" lets real bugs through. Prefer state
verification unless the interaction itself is the behavior you care about.

# Common Mistakes

- **Calling everything a "mock"** — imprecision leads to verifying the wrong thing.
- **Reaching for a mock when a stub (or fake) would do** — verify results, not calls, when the result
  is what matters.
- **Only asserting a call happened**, never the outcome — bugs slip through.
- **Faking so much** that the test no longer resembles how the real system behaves.

# Best Practices

- Pick the **lightest double** that does the job: dummy < stub < spy/mock < fake in ceremony.
- Default to **state verification**; use **behavior verification** only when the interaction *is* the
  point (e.g., "an email must be sent").
- Prefer a **fake** for a stateful collaborator (a repository) over a wall of stubbed calls.
- Use precise words — "stub", "mock", "fake" — so teammates know what a test actually checks.

# Summary

- A **test double** stands in for a real dependency; the five roles are **dummy, stub, spy, mock,
  fake**.
- **Stubs/fakes → state verification** (check the result); **mocks/spies → behavior verification**
  (check the calls).
- In Python one `Mock` object can play several roles — the **role**, not the class, names the double.
- Use the lightest double, and prefer checking outcomes over checking interactions.

# Flash Cards

Q: What is a test double?
A: Any object that stands in for a real dependency during a test — the umbrella term covering dummies, stubs, spies, mocks, and fakes.

Q: What is the difference between a stub and a mock?
A: A stub provides canned answers so you can verify your code's result (state verification); a mock is pre-programmed with expected calls and verifies the interactions your code makes (behavior verification).

Q: What is a fake?
A: A working but simplified implementation not fit for production — for example an in-memory database that really stores and returns data, cheaply.

Q: What is a spy?
A: A stub that also records how it was called, so the test can inspect the recorded calls afterward.

Q: What's the difference between state and behavior verification?
A: State verification checks the resulting state or return value; behavior verification checks that your code made the expected calls on its collaborators.

Q: In Python, does the class Mock determine whether something is a stub or a mock?
A: No — one Mock/MagicMock can act as a stub, spy, or mock; the role it plays in the test (canned input vs verified interaction) is what names it.

# Exercises

### Easy
For each scenario, name the lightest suitable double: (a) a `logger` a code path never touches; (b) a
clock that must always return a fixed time; (c) checking that `send_email()` was called once.

### Medium
Write a `FixedClock` stub and use it to test an `is_business_hours(clock)` function deterministically
for a time inside and outside business hours.

### Challenging
Take the "verifies behavior when you meant state" pitfall. Rewrite the test to assert the actual
`result`, and explain when verifying the call *would* be the right choice instead.

# Further Reading

- Martin Fowler — *Mocks Aren't Stubs*: <https://martinfowler.com/articles/mocksArentStubs.html>
- Martin Fowler — *TestDouble* (bliki): <https://martinfowler.com/bliki/TestDouble.html>
- Gerard Meszaros — *Test Double* patterns: <http://xunitpatterns.com/Test%20Double.html>
- Python — *unittest.mock*: <https://docs.python.org/3/library/unittest.mock.html>
