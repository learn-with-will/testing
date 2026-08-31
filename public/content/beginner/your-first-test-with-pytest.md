---
id: lesson-02
slug: your-first-test-with-pytest
title: "Your First Test with pytest"
level: beginner
order: 2
duration: 16
tags:
  - pytest
  - setup
  - test-discovery
  - running-tests
  - assertions
summary: "Setting up Python and pytest, writing your very first test function, how pytest discovers tests by naming convention, running the suite from the command line, and reading a green pass and a red failure report."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Install **pytest** into a virtual environment and check it runs.
- Write a test as a plain function that uses `assert`.
- Explain pytest's **discovery** rules (which files and functions it collects).
- Run tests from the terminal and read the **pass/fail** summary.
- Interpret pytest's failure report, including its **assertion introspection**.

# Why It Matters

Reading about testing only takes you so far; the habit forms once you can write a test and watch it
go green. pytest is the most widely used Python test runner because it asks for almost no ceremony: a
test is just a function with `assert`. Getting a working setup and running your first pass/fail is the
gateway to everything else — fixtures, mocks, coverage — so it's worth doing cleanly once. The tool
specifics here are pytest, but the *ideas* (a runner discovers tests, runs them, and reports) apply to
Jest, JUnit, and every other framework.

# Concept Explanation

### Set up an isolated environment

Install tools into a **virtual environment** so each project's dependencies stay separate and
reproducible:

```bash
python -m venv .venv           # create an isolated environment
source .venv/bin/activate      # activate it (Windows: .venv\Scripts\activate)
pip install pytest             # install the test runner
pytest --version               # confirm it's available
```

### Write a test

By default, pytest treats a function as a test when its **name starts with `test_`** and it lives in
a **file named `test_*.py`** (or `*_test.py`). Put the code under test and the test in a file:

```python
# test_math.py
def add(a, b):
    return a + b


def test_add_two_positive_numbers():
    assert add(2, 3) == 5
```

No base class, no special imports — just a function and an `assert`.

### How pytest finds tests (discovery)

When you run `pytest`, it **collects** tests by convention, from the current directory down:

- files matching `test_*.py` or `*_test.py`;
- functions named `test_*`;
- methods named `test_*` inside classes named `Test*` (that have no `__init__`).

Because discovery is automatic, adding a test never means editing a list — you just create a
`test_*.py` file. (These defaults are configurable, but the conventions above are what you'll use.)

### Run it and read the result

```bash
pytest            # discover and run everything, quiet summary
pytest -q         # even quieter
pytest -v         # verbose: one line per test with its name
```

A pass looks like this:

```text
test_math.py .                                    [100%]
1 passed in 0.01s
```

The single `.` is your passing test. Each test prints a `.` for pass, `F` for failure, `E` for error.

### Reading a failure

Change the expectation to something wrong and pytest shows exactly what happened:

```text
    def test_add_two_positive_numbers():
>       assert add(2, 3) == 6
E       assert 5 == 6
E        +  where 5 = add(2, 3)

test_math.py:6: AssertionError
1 failed in 0.02s
```

This is pytest's **assertion introspection**: it rewrites your plain `assert` so the report shows the
real values (`5 == 6`, and that `5` came from `add(2, 3)`). You rarely need a debugger to see why an
assertion failed.

# Key Terminology

- **pytest** — a popular Python test runner and framework.
- **Virtual environment (`venv`)** — an isolated per-project set of installed packages.
- **Test discovery / collection** — how pytest finds tests by file and function naming convention.
- **`assert`** — the plain Python statement pytest uses to check expectations.
- **Assertion introspection** — pytest rewriting `assert` so failures show the actual values.
- **Exit status** — pytest returns non-zero if any test fails (used by CI).

# Options and Trade-offs

| Decision | Option A | Option B | How to choose |
| -------- | -------- | -------- | ------------- |
| Framework | `unittest` (standard library) | `pytest` (third-party) | pytest for terse `assert`-based tests and rich reports; `unittest` if you can't add dependencies. |
| Where tests live | Beside the code | In a separate `tests/` folder | Either works; a `tests/` folder scales better on bigger projects. |
| Test naming | Short (`test_add`) | Behavior-describing (`test_add_two_positive_numbers`) | Prefer descriptive names — the report reads like a spec. |

# Worked Example

Let's go from empty folder to a green run.

```bash
mkdir first-tests && cd first-tests
python -m venv .venv && source .venv/bin/activate
pip install pytest
```

```python
# test_greet.py
def greet(name):
    return f"Hello, {name}!"


def test_greet_uses_the_name():
    assert greet("Sam") == "Hello, Sam!"
```

```bash
pytest -v
```

```text
test_greet.py::test_greet_uses_the_name PASSED    [100%]
1 passed in 0.01s
```

One file, one function, one assertion — and pytest discovered and ran it with no configuration.

# Real World Analogy

pytest's discovery is like a **teacher collecting homework** by a rule everyone knows: "put your name
at the top and hand in the sheet titled *Homework*." The teacher doesn't keep a master list of who
wrote what — anything matching the naming rule gets picked up and graded. Follow the convention
(`test_*.py`, `test_*` functions) and your work is automatically collected and "graded" every run.

# Examples

## Example 1 — Basic: a passing test

```python
# test_temperature.py
def to_fahrenheit(c):
    return c * 9 / 5 + 32


def test_freezing_point():
    assert to_fahrenheit(0) == 32
```

**Why this works:** the file and function follow the discovery convention, and the assertion states a
known fact (0°C is 32°F), so `pytest` collects and passes it.

## Example 2 — Real-world: several tests in one file

```python
# test_temperature.py
def to_fahrenheit(c):
    return c * 9 / 5 + 32


def test_freezing_point():
    assert to_fahrenheit(0) == 32


def test_boiling_point():
    assert to_fahrenheit(100) == 212
```

```text
test_temperature.py ..                            [100%]
2 passed in 0.01s
```

**Why this works:** each behavior gets its own named test, so a failure report tells you *which*
property broke, not just "something's wrong".

## Example 3 — Pitfall: a test pytest never runs

```python
# test_temperature.py
def check_freezing():          # <-- name does not start with test_
    assert to_fahrenheit(0) == 32
```

```text
1 file collected, 0 tests ran
no tests ran in 0.00s
```

**Why this bites:** the function is named `check_freezing`, not `test_*`, so discovery skips it. A
"green" run with **0 tests** is a silent false sense of safety — always check the count.

# Common Mistakes

- **Breaking the naming convention** — a file or function without the `test_` prefix is silently
  skipped. Watch the "collected"/"ran" count.
- **Installing pytest globally** — without a virtual environment, project dependencies collide. Use
  `venv`.
- **Running the file with `python test_x.py`** — that just imports it; tests don't run. Use the
  `pytest` command.
- **Catching the assertion yourself** — wrapping asserts in broad `try/except` hides failures.

# Best Practices

- Keep tests in `test_*.py` files with `test_*` functions so discovery just works.
- Give tests **descriptive names** — the verbose report becomes readable documentation.
- Run `pytest -v` while learning so you see each test by name.
- Watch the **passed/failed/collected counts**; "0 tests ran" is a warning, not a success.

# Summary

- Install pytest in a **virtual environment**; a test is a plain `test_*` function using `assert`.
- pytest **discovers** tests by convention: `test_*.py` files and `test_*` functions.
- Run with `pytest` (add `-v` for per-test names); `.` = pass, `F` = fail.
- **Assertion introspection** shows the real values behind a failing `assert`.
- A green run with **0 tests collected** means your names don't match the convention.

# Flash Cards

Q: By default, which files and functions does pytest treat as tests?
A: Files named `test_*.py` (or `*_test.py`) and functions named `test_*` (plus `test_*` methods in `Test*` classes).

Q: Why write tests inside a virtual environment?
A: A `venv` isolates each project's installed packages, so dependencies don't collide and the setup is reproducible.

Q: What does pytest's assertion introspection give you?
A: When a plain `assert` fails, pytest rewrites it to show the actual values involved (e.g., `assert 5 == 6` and where the 5 came from), so you rarely need a debugger.

Q: What does a run that says "no tests ran" usually mean?
A: Discovery found nothing matching the convention — often a misnamed file or function (missing the `test_` prefix), not that the code is fine.

Q: How do you run the tests, and how not to?
A: Run `pytest` from the terminal; don't run `python test_file.py`, which only imports the module without executing the tests.

Q: In pytest output, what do `.` and `F` mean?
A: A dot is a passing test and an `F` is a failing test; there's one character per collected test.

# Exercises

### Easy
Create a `venv`, install pytest, and write `test_smoke.py` containing `def test_truth(): assert True`.
Run `pytest -v` and confirm you see one `PASSED`.

### Medium
Write `to_fahrenheit` and add tests for 0°C, 100°C, and −40°C (where Celsius and Fahrenheit are
equal). Run them and make sure all three pass.

### Challenging
Deliberately rename one test function to drop its `test_` prefix and re-run. Explain what the
collected/ran counts show and why this is a dangerous kind of "passing" run.

# Further Reading

- pytest — *Get Started*: <https://docs.pytest.org/en/stable/getting-started.html>
- pytest — *How to invoke pytest*: <https://docs.pytest.org/en/stable/how-to/usage.html>
- pytest — *Good Integration Practices* (test layout & discovery): <https://docs.pytest.org/en/stable/explanation/goodpractices.html>
- Python — *venv*: <https://docs.python.org/3/library/venv.html>
