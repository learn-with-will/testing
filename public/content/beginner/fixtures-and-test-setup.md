---
id: lesson-07
slug: fixtures-and-test-setup
title: "Fixtures and Test Setup"
level: beginner
order: 7
duration: 18
tags:
  - fixtures
  - conftest
  - setup-teardown
  - fixture-scope
  - isolation
summary: "Removing duplicated setup with pytest fixtures — how a fixture provides ready-made state to a test, sharing fixtures via conftest.py, cleaning up with yield, choosing a fixture scope, and keeping shared setup from leaking state between tests."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Write a **pytest fixture** and request it from a test.
- Share fixtures across files with **`conftest.py`**.
- Clean up resources with a **`yield`** fixture (setup/teardown).
- Choose a fixture **scope** and understand the isolation trade-off.
- Recognize and prevent **state leaking** between tests.

# Why It Matters

Tests repeat setup: build the same object, seed the same data, open the same temp file. Copy-pasting
that setup makes tests long and fragile. **Fixtures** are pytest's answer — reusable, composable setup
that's *injected* into the tests that ask for it, with matching teardown. Done well, fixtures make
tests short and focused. Done carelessly — especially with wide scopes — they let one test's leftovers
change another test's result, which is a classic cause of the flaky suites we'll study later.

# Concept Explanation

### A fixture provides ready-made state

Mark a function with `@pytest.fixture`; any test that lists its **name as a parameter** receives its
return value. pytest resolves the dependency for you.

```python
import pytest

@pytest.fixture
def cart():
    c = Cart()
    c.add(Item("pen", 3))
    return c                      # this value is injected into tests

def test_total(cart):            # pytest sees the name and passes the fixture
    assert cart.total() == 3

def test_is_not_empty(cart):     # a fresh cart for each test by default
    assert cart.is_empty() is False
```

Each test gets its **own** fresh `cart` (default scope), so they can't interfere.

### Setup and teardown with `yield`

If a fixture needs cleanup, use `yield`: code before `yield` is setup, code after is teardown, and it
runs even if the test fails.

```python
@pytest.fixture
def temp_file():
    path = Path("scratch.txt")
    path.write_text("hello")     # setup
    yield path                   # the test runs here, receiving `path`
    path.unlink()                # teardown — always runs afterward
```

This replaces the older `unittest` `setUp`/`tearDown` methods with something more flexible and
composable.

### Share fixtures with `conftest.py`

A fixture defined in a file named **`conftest.py`** is automatically available to every test in that
directory and below — no import needed. Put shared fixtures (a test client, a seeded database, sample
data) there.

### Scope controls sharing — and isolation

By default a fixture is **function-scoped**: created fresh for each test. Wider scopes reuse one
instance:

```python
@pytest.fixture(scope="session")   # created once for the whole test run
def db_engine():
    engine = create_test_engine()
    yield engine
    engine.dispose()
```

Scopes, narrowest to widest: `function` → `class` → `module` → `package` → `session`. Wider scope =
faster (built once) but **more shared state** = more risk that one test's changes bleed into the next.
Use a wide scope only for **expensive, read-only** resources (like a connection), and keep anything a
test **mutates** function-scoped.

### Handy built-in fixtures

pytest ships fixtures you don't define: **`tmp_path`** (a unique temp directory per test),
**`monkeypatch`** (safely set/replace attributes and env vars, auto-undone), and **`capsys`** (capture
`stdout`/`stderr`). Prefer `tmp_path` over writing real files in your project.

# Key Terminology

- **Fixture** — reusable setup pytest injects into tests that request it by name.
- **`conftest.py`** — a file whose fixtures are shared across a directory tree automatically.
- **`yield` fixture** — setup before `yield`, teardown after; teardown always runs.
- **Scope** — how often a fixture is created: function/class/module/package/session.
- **`tmp_path` / `monkeypatch` / `capsys`** — built-in fixtures for temp dirs, patching, and output.
- **State leakage** — one test's changes affecting another via shared state.

# Options and Trade-offs

| Decision | Option A | Option B | How to choose |
| -------- | -------- | -------- | ------------- |
| Setup style | Copy-paste in each test | A shared fixture | Fixtures for anything repeated; keep the test body about the behavior. |
| Fixture scope | `function` (fresh each time) | `session` (built once) | Function for mutable state (isolation); session for expensive read-only resources. |
| Sharing | Import helpers | `conftest.py` fixtures | `conftest.py` for cross-file fixtures — no imports, auto-discovered. |
| Temp files | Write into the repo | `tmp_path` fixture | `tmp_path` — unique, auto-cleaned, no leftovers. |

# Worked Example

Refactoring duplicated setup into a fixture with teardown:

```python
# Before: every test rebuilds the same seeded store.
def test_get():
    store = Store(); store.put("k", 1)
    assert store.get("k") == 1

def test_delete():
    store = Store(); store.put("k", 1)
    store.delete("k")
    assert store.get("k") is None
```

```python
# After: one fixture provides a fresh, seeded store to each test.
import pytest

@pytest.fixture
def store():
    s = Store()
    s.put("k", 1)
    yield s
    s.close()                    # teardown runs after each test

def test_get(store):
    assert store.get("k") == 1

def test_delete(store):
    store.delete("k")
    assert store.get("k") is None
```

Because the fixture is function-scoped, `test_delete` deleting `"k"` can't affect `test_get` — each
gets its own store.

# Real World Analogy

A fixture is like a **hotel room prepared for each guest**: fresh towels and a made bed are set up
before you arrive (setup), and housekeeping resets it after you leave (teardown), so the next guest
never finds your mess. **Scope** is how often housekeeping resets the room: per-guest (function) is
safest; "clean once a week" (session) is cheaper but risks handing the next guest a used room. You'd
only share a room-for-the-week for something no guest changes — like the hotel's lobby.

# Examples

## Example 1 — Basic: a simple fixture

```python
import pytest

@pytest.fixture
def numbers():
    return [3, 1, 2]

def test_sorted(numbers):
    assert sorted(numbers) == [1, 2, 3]
```

**Why this works:** the test requests `numbers` by name and receives the list, keeping the body focused
on the behavior.

## Example 2 — Real-world: temp files with a built-in fixture

```python
def test_writes_a_report(tmp_path):
    out = tmp_path / "report.txt"
    write_report(out, data=[1, 2, 3])
    assert out.read_text() == "1,2,3"
```

**Why this works:** `tmp_path` gives a unique, auto-cleaned directory, so the test never leaves files
behind or collides with another test.

## Example 3 — Pitfall: state leaking through a wide scope

```python
@pytest.fixture(scope="module")   # ONE list shared by every test in the file
def basket():
    return []

def test_add(basket):
    basket.append("apple")
    assert basket == ["apple"]

def test_starts_empty(basket):     # FAILS if it runs after test_add — basket already has "apple"
    assert basket == []
```

**Why this bites:** a module-scoped **mutable** fixture is shared, so `test_add`'s append leaks into
`test_starts_empty`, making the result depend on order. Fix: use the default `function` scope for
mutable state.

# Common Mistakes

- **Wide scope on mutable state** — sharing a mutated object causes order-dependent, flaky tests.
- **Cleanup that never runs** — doing teardown after the assertion (which may fail) instead of after
  `yield`, which always runs.
- **Writing real files** in the project instead of using `tmp_path`.
- **Overusing fixtures** — hiding so much setup that a test's own behavior becomes hard to read.

# Best Practices

- Extract repeated setup into fixtures; keep each test body about the **behavior**.
- Default to **function scope**; widen only for **expensive, read-only** resources.
- Use **`yield`** for teardown so cleanup always happens, even on failure.
- Put shared fixtures in **`conftest.py`**, and prefer built-ins like **`tmp_path`** and
  **`monkeypatch`**.

# Summary

- **Fixtures** provide reusable setup that pytest injects into tests by name.
- **`yield`** splits setup from teardown; teardown always runs.
- **`conftest.py`** shares fixtures across a directory tree automatically.
- **Scope** trades speed for isolation — keep mutable state function-scoped to avoid **leakage**.

# Flash Cards

Q: How does a test receive a fixture in pytest?
A: By listing the fixture's name as a parameter; pytest resolves it and passes the fixture's value into the test.

Q: What does a `yield` fixture give you?
A: Setup before the yield and teardown after it; the teardown runs after the test even if the test fails.

Q: What is conftest.py for?
A: It holds fixtures (and hooks) shared automatically across every test in its directory and below — no import needed.

Q: What is the default fixture scope, and why prefer it for mutable state?
A: `function` scope — a fresh instance per test — which keeps one test's mutations from leaking into another and causing order-dependent failures.

Q: When is a wider scope like session appropriate?
A: For expensive, read-only resources (e.g., a database connection) that tests don't mutate, so building it once is safe and faster.

Q: Why use the built-in tmp_path fixture?
A: It provides a unique temporary directory per test that pytest cleans up automatically, so tests don't leave files behind or collide.

# Exercises

### Easy
Write a fixture `user` that returns a `User("Ada")` and two tests that use it — one checking the name,
one checking a default role. Confirm each test gets a fresh user.

### Medium
Write a `yield` fixture that creates a temporary SQLite file (use `tmp_path`), yields a connection, and
closes it in teardown. Add a test that inserts and reads back a row.

### Challenging
Reproduce the leaking-basket pitfall with a `scope="module"` mutable fixture, observe the order-
dependent failure, then fix it. Explain in one paragraph why wide scope plus mutation causes flakiness.

# Further Reading

- pytest — *How to use fixtures*: <https://docs.pytest.org/en/stable/how-to/fixtures.html>
- pytest — *Fixture scopes*: <https://docs.pytest.org/en/stable/how-to/fixtures.html#scope-sharing-fixtures-across-classes-modules-packages-or-session>
- pytest — *`tmp_path`* and *`monkeypatch`*: <https://docs.pytest.org/en/stable/how-to/tmp_path.html>
- Python — *unittest* `setUp`/`tearDown`: <https://docs.python.org/3/library/unittest.html#unittest.TestCase.setUp>
