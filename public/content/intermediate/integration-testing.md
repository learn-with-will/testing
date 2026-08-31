---
id: lesson-14
slug: integration-testing
title: "Integration Testing"
level: intermediate
order: 14
duration: 20
tags:
  - integration-testing
  - seams
  - databases
  - boundaries
  - hermetic
summary: "Testing that separately-working units actually work together across their seams — with a real (test) database or filesystem, when to use real dependencies versus fakes at a boundary, and how to keep integration tests hermetic and repeatable."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain what an **integration test** checks that unit tests can't.
- Test across a real **seam** (database, filesystem, HTTP) safely.
- Decide when to use a **real dependency** vs a **fake** at a boundary.
- Keep integration tests **hermetic** (self-contained) and repeatable.

# Why It Matters

Every unit can pass its own tests while the **connections between them** are broken: a mismatched
column name, a wrong date format at an API boundary, a query that returns rows in the wrong shape. Unit
tests, by design, don't see these because they replace collaborators with doubles. **Integration
tests** deliberately exercise the real seams — your code plus a database, two modules across their
interface — catching the class of bug that lives *between* correctly-built parts. They sit in the
middle of the pyramid: fewer than unit tests, more realistic, and a bit slower.

# Concept Explanation

### What integration tests check

An **integration test** verifies that two or more components **work together**. The classic seam is
your code and a **datastore**: does `save_user()` actually write a row that `get_user()` can read back,
with the real schema and types? Other seams: your HTTP client and a server, your code and the
filesystem, two services and their shared message format.

### Real dependency vs fake at the boundary

You have a spectrum:

- **Real dependency** (e.g., a real database, in a **test instance**): highest fidelity — catches
  schema, SQL, and type issues. Slower and needs setup/cleanup.
- **Fake at the boundary** (in-memory DB, local stub server): faster, but only as trustworthy as the
  fake's fidelity.

A good rule: use a **real** instance of things whose *integration* is exactly what you're testing (your
own database), and **fake** things you don't own or can't run cheaply (a third-party payment API) —
often behind your own adapter, verified separately with a **contract test**.

### Keep it hermetic

A **hermetic** test brings its own world: it doesn't depend on data already present, on another test
running first, or on a shared mutable environment. Techniques:

- Use a **fresh, disposable** datastore per run — e.g., a temporary SQLite file via `tmp_path`, or a
  containerized/ephemeral database.
- **Seed** the exact data the test needs, and **clean up** after (or wrap each test in a transaction
  that **rolls back**).
- Never point tests at a **shared/production** system — flaky, dangerous, and order-dependent.

### A concrete pattern (SQLite + fixture)

```python
import sqlite3
import pytest

@pytest.fixture
def db(tmp_path):
    conn = sqlite3.connect(tmp_path / "test.db")   # fresh, disposable
    conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)")
    yield conn
    conn.close()                                    # teardown

def test_save_then_load_roundtrips(db):
    save_user(db, id=1, name="Ada")
    assert load_user(db, 1) == "Ada"                # real SQL across the seam
```

This exercises the *real* SQL and schema, but in an isolated, throwaway database.

# Key Terminology

- **Integration test** — verifies components work together across a seam.
- **Seam** — a boundary where parts connect (DB, HTTP, filesystem, module interface).
- **Test instance** — a real dependency dedicated to testing, not production.
- **Hermetic test** — self-contained: brings its own data, no shared state.
- **Rollback per test** — wrapping each test in a transaction that undoes its writes.
- **Contract test** — checks two sides of a boundary agree on the interface.

# Options and Trade-offs

| At the boundary | Fidelity | Speed | Use when |
| --------------- | -------- | ----- | -------- |
| Real database (test instance) | High | Slower | The integration with your DB is what you're testing. |
| In-memory DB / fake | Medium | Fast | You want realistic behavior without external setup; guard with a contract test. |
| Local stub server (recorded responses) | Medium | Fast | Testing your HTTP client's parsing/handling. |
| Real third-party API | Highest but flaky | Slowest | Rarely — prefer a fake adapter; reserve for a few smoke checks. |

# Worked Example

Testing a repository against a real (temporary) database, and cleaning up per test:

```python
import sqlite3, pytest

@pytest.fixture
def repo(tmp_path):
    conn = sqlite3.connect(tmp_path / "orders.db")
    conn.execute("CREATE TABLE orders (id INTEGER PRIMARY KEY, total REAL)")
    yield OrderRepo(conn)
    conn.close()

def test_create_and_sum_orders(repo):
    repo.add(total=10.0)
    repo.add(total=5.5)
    assert repo.total_revenue() == 15.5     # real INSERTs + SUM across the seam

def test_empty_repo_has_zero_revenue(repo):  # fresh DB — hermetic, order-independent
    assert repo.total_revenue() == 0
```

Each test gets a **brand-new** database (function-scoped fixture + `tmp_path`), so they're isolated and
can run in any order — while still executing the real SQL that unit tests would have mocked away.

# Real World Analogy

Unit tests bench-test each part; an integration test is the **dress rehearsal** where the actors,
lighting, and sound run the scene **together** for the first time. Each performer knew their lines
(units passed), but the rehearsal is where you discover the lighting cue fires on the wrong word or two
actors reach for the same prop — problems that only appear at the *seams* between well-prepared parts.
And you rehearse on a **set built for rehearsal**, not opening night's live audience (a test instance,
not production).

# Examples

## Example 1 — Basic: filesystem seam with tmp_path

```python
def test_export_writes_readable_csv(tmp_path):
    path = tmp_path / "out.csv"
    export_orders(path, [Order(1, 10.0)])
    assert path.read_text().splitlines()[0] == "id,total"   # real file written and read back
```

**Why this works:** it integrates your export code with the real filesystem in an isolated temp
directory — catching real formatting/encoding bugs a mock file couldn't.

## Example 2 — Real-world: HTTP client against a local stub server

```python
def test_client_parses_price(local_http_server):
    local_http_server.route("/price", json={"usd": 42})
    client = PriceClient(base_url=local_http_server.url)
    assert client.get_price() == 42            # real HTTP round-trip, controlled response
```

**Why this works:** it exercises the real request/response path and your parsing, without depending on
the live third-party service — deterministic and offline-friendly.

## Example 3 — Pitfall: a non-hermetic test on shared data

```python
def test_user_count():
    assert count_users(shared_db) == 5     # depends on whatever rows already exist!
```

**Why this bites:** it assumes the shared database holds exactly five users, so it breaks when data
changes, when another test writes, or when run in a different order. It's flaky and coupled. Fix: use a
fresh, seeded database and assert against data the test itself created.

# Common Mistakes

- **Pointing tests at a shared or production system** — flaky, order-dependent, and risky.
- **Assuming pre-existing data** instead of seeding exactly what the test needs.
- **No cleanup** — leftover rows/files leak into later tests.
- **Faking the very seam you meant to test** — then you're not integration-testing at all.

# Best Practices

- Test real seams against a **disposable test instance**; seed and clean up (or roll back) per test.
- Keep each test **hermetic** — independent of order and of pre-existing data.
- Use **real** dependencies you own; **fake** third parties behind an adapter (with a contract test).
- Keep integration tests **fewer** than unit tests and focused on the boundaries that matter.

# Summary

- **Integration tests** catch bugs at the **seams** that unit tests deliberately mock away.
- Prefer a **real test instance** for things you own; **fake** third parties at an adapter boundary.
- Make tests **hermetic**: fresh, seeded data; cleanup or transaction **rollback** per test.
- They're **fewer and slower** than unit tests but far more realistic about how parts connect.

# Flash Cards

Q: What does an integration test check that a unit test doesn't?
A: That two or more components actually work together across their seam (e.g., code + real database), catching bugs that live between correctly-built parts.

Q: What makes a test "hermetic"?
A: It is self-contained — it brings its own data, doesn't depend on pre-existing state or on other tests, and doesn't touch shared/production systems.

Q: At a boundary, when should you use a real dependency vs a fake?
A: Use a real (test) instance when that integration is what you're testing (your own DB); fake things you don't own or can't run cheaply, behind an adapter guarded by a contract test.

Q: How can you keep database integration tests isolated and order-independent?
A: Give each test a fresh, disposable database (e.g., a tmp_path SQLite file) and seed exactly what it needs, or wrap each test in a transaction that rolls back.

Q: Why should integration tests avoid a shared/production database?
A: Shared data makes tests flaky and order-dependent (and risks corrupting real data); a test should assert against data it created in an isolated instance.

Q: Where do integration tests sit on the testing pyramid?
A: In the middle — fewer than unit tests, more realistic and a bit slower, focused on the important boundaries.

# Exercises

### Easy
Write an integration test that uses `tmp_path` to write a small JSON file with your code and reads it
back, asserting the round-tripped contents.

### Medium
Using a temporary SQLite database in a fixture, test that a `UserRepo.add` then `UserRepo.get`
round-trips a user, and add a second test proving a fresh repo starts empty.

### Challenging
Take a flaky, non-hermetic test that assumes existing rows. Rewrite it to seed its own data in a
disposable database and clean up, then explain two specific ways the original could fail that yours
cannot.

# Further Reading

- Martin Fowler — *IntegrationTest* (bliki): <https://martinfowler.com/bliki/IntegrationTest.html>
- Martin Fowler — *Contract Test* and *Self-Initializing Fake*: <https://martinfowler.com/bliki/ContractTest.html>
- pytest — *tmp_path* and fixtures for integration setup: <https://docs.pytest.org/en/stable/how-to/tmp_path.html>
- *Software Engineering at Google* — *Larger Testing*: <https://abseil.io/resources/swe-book/html/ch14.html>
