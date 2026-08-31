---
id: lesson-12
slug: patching-and-mock-pitfalls
title: "Patching and Mock Pitfalls"
level: intermediate
order: 12
duration: 20
tags:
  - patching
  - mock-patch
  - autospec
  - monkeypatch
  - pitfalls
summary: "Replacing a real dependency in place with unittest.mock.patch — and the traps that make mocking go wrong: patching where a name is looked up (not where it's defined), using autospec so mocks match real signatures, and the danger of over-mocking things you don't own."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Use **`unittest.mock.patch`** as a decorator and context manager, and **`patch.object`**.
- Apply the golden rule: **patch where the name is looked up**, not where it's defined.
- Use **`autospec=True`** so a mock's signature matches the real object.
- Avoid **over-mocking** and the "mock what you don't own" trap.

# Why It Matters

Often the dependency you want to replace isn't passed in — it's imported and used deep inside a
function. **`patch`** temporarily swaps it for a double, then restores it. It's powerful and, honestly,
the single most error-prone tool in testing: patch the wrong name and your real code runs anyway;
mis-type a method and a plain `Mock` cheerfully returns another mock, so a **broken test passes green**.
This lesson is the safety briefing that keeps mocking from lying to you.

# Concept Explanation

### `patch` swaps a name, temporarily

`patch` replaces an attribute for the duration of a test, then automatically undoes it:

```python
from unittest.mock import patch

# As a context manager
with patch("app.services.send_email") as send:
    send.return_value = True
    register(user)
    send.assert_called_once()

# As a decorator (the mock is injected as an argument)
@patch("app.services.send_email")
def test_register(send):
    register(user)
    send.assert_called_once()
```

`patch.object(SomeClass, "method")` patches a specific attribute of an object/class when you have a
reference to it.

### The golden rule: patch where it's *looked up*

This is the mistake everyone makes once. Python binds names at import time. If your module does:

```python
# app/handlers.py
from app.services import send_email      # a LOCAL name 'send_email' now lives in app.handlers

def register(user):
    send_email(user.email)               # looks up app.handlers.send_email
```

then you must patch **`app.handlers.send_email`** — the name *in the module that uses it* — **not**
`app.services.send_email`. Patching the definition site does nothing, because `handlers` already has
its own reference:

```python
@patch("app.handlers.send_email")        # ✓ patches the name actually looked up
def test_register(send):
    ...
# @patch("app.services.send_email")      # ✗ real function still runs inside handlers
```

Rule of thumb: **patch the name in the namespace where it is used.**

### `autospec` makes mocks honest

A plain `Mock` will happily accept *any* attribute or call — including typos — and return a new mock,
so mistakes pass silently:

```python
m = Mock()
m.snd("hi")            # typo for send(); no error — returns a Mock!
m.send()               # wrong number of args; no error either
```

`autospec=True` (or `create_autospec`) builds the double from the **real object's API**, so wrong
names and wrong signatures **raise**:

```python
@patch("app.handlers.send_email", autospec=True)
def test_register(send):
    register(user)
    send.assert_called_once_with(user.email)   # signature is enforced
```

Prefer `autospec=True` whenever you patch — it turns "silently passes" into "loudly fails".

### pytest's `monkeypatch`

pytest offers the **`monkeypatch`** fixture for the same idea, with automatic undo:

```python
def test_reads_env(monkeypatch):
    monkeypatch.setenv("MODE", "test")
    monkeypatch.setattr("app.handlers.send_email", lambda *a: True)
    assert current_mode() == "test"
```

### Don't mock what you don't own

Patching a third-party library's internals couples your tests to details you don't control (and that
can change). Prefer to **wrap the external dependency behind your own thin adapter** and fake/patch
*that* boundary. Your adapter is small and stable; the library's guts are not.

# Key Terminology

- **`patch(target)`** — temporarily replaces `target` (a dotted name) with a mock, then restores it.
- **Patch where looked up** — target the name in the module that *uses* it, not where it's defined.
- **`patch.object(obj, "attr")`** — patch a specific attribute of an object/class.
- **`autospec=True` / `create_autospec`** — build the mock from the real API to catch bad names/args.
- **`monkeypatch`** — pytest's fixture for setting/replacing attributes and env vars, auto-undone.
- **Adapter boundary** — your own thin wrapper around a third-party dependency, safer to double.

# Options and Trade-offs

| Decision | Option A | Option B | How to choose |
| -------- | -------- | -------- | ------------- |
| Patch target | Where it's defined | Where it's **looked up** | Always the lookup site — otherwise the real code runs. |
| Mock fidelity | Plain `Mock` | `autospec=True` | Autospec by default; it catches typos and bad signatures. |
| Tool | `unittest.mock.patch` | pytest `monkeypatch` | Either works; monkeypatch is ergonomic in pytest, patch is portable. |
| External libs | Patch their internals | Wrap in your adapter, double that | Own the boundary; don't couple to library internals. |

# Worked Example

The classic wrong-target bug and its fix:

```python
# app/report.py
from app.clock import now

def timestamped(msg):
    return f"[{now()}] {msg}"
```

```python
# WRONG: real now() still runs — the test is non-deterministic and fails.
@patch("app.clock.now")
def test_timestamp_wrong(now_mock):
    now_mock.return_value = "2026-01-01"
    assert timestamped("hi") == "[2026-01-01] hi"   # FAILS: real time used

# RIGHT: patch the name as looked up in app.report, with autospec.
@patch("app.report.now", autospec=True)
def test_timestamp_right(now_mock):
    now_mock.return_value = "2026-01-01"
    assert timestamped("hi") == "[2026-01-01] hi"   # PASSES
```

Same function, two dotted paths — only the one matching where `now` is *used* actually replaces it.

# Real World Analogy

Patching is like **redirecting someone's mail**. `register` has already copied the address of
`send_email` into its own address book (the `from ... import`). Filing a change-of-address at the
*original post office* (`app.services`) does nothing — `register` still uses the copy it wrote down. You
have to update **its** address book (`app.handlers`). And `autospec` is the post office refusing a
letter addressed to "Jhon Smtih" or missing a ZIP code, instead of silently delivering it to a random
house — catching the typo before it causes a mystery.

# Examples

## Example 1 — Basic: patch as a context manager

```python
from unittest.mock import patch

def test_uuid_is_stable():
    with patch("app.ids.uuid4", return_value="fixed-id"):
        assert make_id() == "fixed-id"
```

**Why this works:** `make_id` looks up `uuid4` in `app.ids`, so that's the name patched; the double
returns a fixed id for a deterministic test.

## Example 2 — Real-world: autospec catches a bad call

```python
@patch("app.handlers.charge", autospec=True)
def test_checkout_charges_total(charge):
    checkout(cart_total=25)
    charge.assert_called_once_with(25)     # if code called charge(25, extra=1), autospec would flag it
```

**Why this works:** because the mock is built from the real `charge` signature, a call with the wrong
arguments raises instead of passing silently.

## Example 3 — Pitfall: the always-green mock

```python
from unittest.mock import Mock

def test_saves(monkeypatch):
    db = Mock()
    monkeypatch.setattr("app.handlers.db", db)
    save_user(User("Ada"))
    db.insrt.assert_called_once()          # TYPO: 'insrt' — Mock auto-creates it, assertion passes!
```

**Why this bites:** a plain `Mock` invents `insrt` on access, so the misspelled assertion passes even
though the real code calls `insert`. The test proves nothing. `autospec`/`create_autospec` would raise
`AttributeError` on the typo. Always spec your mocks.

# Common Mistakes

- **Patching where it's defined** instead of where it's looked up — the real code runs anyway.
- **Plain mocks that swallow typos** — misspelled methods/attributes silently pass; use `autospec`.
- **Over-mocking** — replacing so much that the test exercises mocks, not your logic.
- **Mocking third-party internals** — brittle; wrap them in an adapter and double the boundary.

# Best Practices

- Patch the name **in the module that uses it**; verify by importing that module's path.
- Add **`autospec=True`** (or `create_autospec`) so wrong names and signatures fail loudly.
- Let `patch`/`monkeypatch` **auto-undo** — never leave a global permanently replaced.
- **Own your boundaries**: wrap external services in a thin adapter and fake/patch that.

# Summary

- **`patch`** temporarily swaps a name for a mock and restores it; use it as a decorator or context
  manager.
- The golden rule: **patch where the name is looked up**, not where it's defined.
- **`autospec=True`** builds the mock from the real API, catching typos and bad signatures.
- Avoid **over-mocking**, and prefer to double your **own adapter** over third-party internals.

# Flash Cards

Q: If module `handlers` does `from services import send_email`, which name do you patch?
A: `handlers.send_email` — the name in the module that looks it up. Patching `services.send_email` leaves the real function running inside handlers.

Q: Why is patching "where it's looked up, not where it's defined" the rule?
A: Python binds the imported name into the using module at import time, so that module has its own reference; you must replace that reference, not the original definition.

Q: What problem does autospec=True solve?
A: A plain Mock accepts any attribute or call (including typos) and returns a mock, so mistakes pass silently; autospec builds the double from the real API so wrong names/signatures raise.

Q: What is the "always-green mock" pitfall?
A: A misspelled assertion like mock.insrt.assert_called_once() passes because Mock auto-creates the attribute; the test proves nothing. autospec/create_autospec would flag the typo.

Q: What does pytest's monkeypatch fixture do?
A: It sets or replaces attributes and environment variables during a test and automatically undoes the changes afterward — a pytest-native alternative to patch.

Q: Why avoid mocking third-party library internals directly?
A: It couples your tests to details you don't control and that can change; wrapping the dependency in your own thin adapter and doubling that boundary is more stable.

# Exercises

### Easy
Given `from app.clock import now` used inside `app.report.timestamped`, write the correct `@patch`
target string and explain why the "obvious" `app.clock.now` target fails.

### Medium
Write a test that patches `uuid4` (as looked up in the module under test) with `autospec=True` and a
fixed return value, and asserts your `make_id()` returns the fixed id.

### Challenging
Reproduce the always-green typo pitfall with a plain `Mock`, confirm it passes despite the misspelling,
then switch to `create_autospec` (or `autospec=True`) and show the test now fails loudly. Explain the
mechanism in one paragraph.

# Further Reading

- Python — *unittest.mock* `patch`: <https://docs.python.org/3/library/unittest.mock.html#patch>
- Python — *Where to patch*: <https://docs.python.org/3/library/unittest.mock.html#where-to-patch>
- Python — *Autospeccing*: <https://docs.python.org/3/library/unittest.mock.html#autospeccing>
- pytest — *monkeypatch*: <https://docs.pytest.org/en/stable/how-to/monkeypatch.html>
