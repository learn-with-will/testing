---
id: lesson-15
slug: coverage-and-its-limits
title: "Coverage and Its Limits"
level: intermediate
order: 15
duration: 18
tags:
  - coverage
  - branch-coverage
  - coverage-py
  - goodhart
  - limits
summary: "What code coverage does and doesn't tell you — statement vs branch coverage, measuring it with coverage.py, why 100% coverage never means bug-free, and how to use coverage as a tool to find untested code rather than a target to game."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Define **code coverage** and read a coverage report.
- Distinguish **statement/line**, **branch**, and **path** coverage.
- Explain why **coverage ≠ correctness** — high coverage can still miss bugs.
- Use coverage as a **floor** to find untested code, not a **target** to chase.

# Why It Matters

Coverage is the most quoted testing metric — and the most misunderstood. "We have 95% coverage" sounds
like "we're 95% safe", which is simply false. Coverage measures which lines your tests *executed*, not
whether they *checked the right thing* or considered the inputs that matter. Managed well, coverage is
a useful flashlight that shows dark corners of untested code. Managed badly — as a target to hit — it
invites tests that run code without really testing it. Getting this right is a core piece of honest
testing.

# Concept Explanation

### What coverage measures

**Code coverage** reports the fraction of your code that ran while the tests executed. If a line never
runs during any test, it's **uncovered** — a blind spot. That's genuinely useful: it points at code no
test touches.

What it does **not** measure: whether you **asserted** anything meaningful, whether you tried the
inputs that trigger bugs, or whether the code is correct. Running a line is not the same as testing it.

### Kinds of coverage (increasing rigor)

- **Statement / line coverage** — did each line execute? The most common, and the weakest.
- **Branch (decision) coverage** — did each branch of every `if`/`for`/`while` go **both** ways (true
  *and* false)? Stronger: it catches untested `else` paths that line coverage misses.
- **Path coverage** — did every *combination* of branches execute? Most rigorous, but the number of
  paths explodes, so it's rarely measured fully.

```text
def f(x):
    if x > 0:          # line coverage: one test (x=1) runs both lines → 100% lines
        return "pos"   #   ...but the branch where x <= 0 is never taken!
    return "non-pos"   # branch coverage would flag the missing false branch
```

### Measuring it: coverage.py

In Python, **coverage.py** (often via the `pytest-cov` plugin) collects coverage:

```bash
pip install pytest-cov
pytest --cov=myapp --cov-branch --cov-report=term-missing
```

A report shows, per file, the percentage and the **missing** lines:

```text
Name             Stmts   Miss Branch BrPart  Cover   Missing
------------------------------------------------------------
myapp/orders.py     40      3     14      2    88%   52-54, 61->exit
```

`--cov-branch` enables branch coverage; `Missing` names the exact lines/branches no test exercised —
that's the actionable part.

### Why 100% still isn't safe

- **Missing assertions.** A test can *run* a function and assert nothing (or the wrong thing) — 100%
  covered, 0% checked.
- **Unconsidered inputs.** Coverage says the line ran, not that you tried the empty list, the negative
  number, or the concurrent case where the bug lives.
- **Wrong logic that still runs.** Covered code can be confidently, fully executed — and wrong.

### Goodhart's law: don't chase the number

> "When a measure becomes a target, it ceases to be a good measure." — Goodhart's law

Mandating "100% coverage" pressures people to write tests that execute code without asserting, or to
add trivial tests for getters, hitting the number while adding no safety. Use coverage to **find gaps**;
judge tests by whether they'd **catch a bug** (the idea behind mutation testing, next tier).

# Key Terminology

- **Code coverage** — fraction of code executed by the tests.
- **Statement/line coverage** — each line ran at least once.
- **Branch coverage** — each decision went both true and false.
- **Path coverage** — each combination of branches ran (rarely full).
- **coverage.py / pytest-cov** — the standard Python coverage tools.
- **Goodhart's law** — a measure used as a target stops being a good measure.

# Options and Trade-offs

| Question | Weak answer | Better answer |
| -------- | ----------- | ------------- |
| Which coverage type? | Line only | Add `--cov-branch` for decisions |
| What's a good number? | "100% or bust" | High where risk is high; treat gaps as questions, not failures |
| How to use the report? | Celebrate the % | Read **Missing** lines and ask "should this be tested?" |
| Is 90% coverage safe? | "Yes" | "The 90% *ran*; safety depends on the assertions and cases" |

# Worked Example

Coverage that looks perfect but proves nothing:

```python
def classify(n):
    return "positive" if n > 0 else "non-positive"

def test_classify_runs():
    classify(5)          # calls it... but asserts NOTHING
```

```text
classify: 100% line coverage
```

The report says **100%** — yet the test would pass even if `classify` returned `"banana"`. Add real
assertions *and* the missing branch:

```python
def test_classify_positive():
    assert classify(5) == "positive"

def test_classify_non_positive():
    assert classify(-1) == "non-positive"   # exercises the other branch, with an assertion
```

Now coverage and *meaning* agree. The lesson: the number was never the point — the assertions and the
second case were.

# Real World Analogy

Coverage is like a **checklist of rooms an inspector walked through**. "Visited 100% of the rooms"
tells you the inspector *entered* every room — not that they **looked** for problems, opened the
cupboards, or checked the wiring. An inspector can stroll through every room, tick the box, and miss the
gas leak. You want the rooms visited (coverage) *and* a real inspection in each (meaningful
assertions). And if you pay inspectors purely by rooms-per-hour, they'll speed-walk through — the
metric becomes the target and the inspection gets worse.

# Examples

## Example 1 — Basic: branch coverage finds a missing case

```python
def shipping(weight):
    if weight > 20:
        return "freight"
    return "parcel"

def test_light_parcel():
    assert shipping(5) == "parcel"      # 100% LINE coverage, but the >20 branch never runs
```

**Why this works (as a lesson):** line coverage reads 100%, yet `--cov-branch` flags the untaken
`weight > 20` branch — prompting a `test_heavy_freight` case.

## Example 2 — Real-world: reading term-missing

```bash
pytest --cov=billing --cov-branch --cov-report=term-missing
```

```text
billing/invoice.py   72   5   24   3   90%   88-90, 95->exit
```

**Why this works:** the 90% is less useful than the **Missing** column — lines 88–90 and a branch at 95
are untested. You go read those lines and decide whether they need a test (often yes: they're error
handling).

## Example 3 — Pitfall: chasing 100% with empty tests

A team mandates 100% coverage. Under deadline, developers add tests that call functions and assert
nothing, plus trivial getter tests, to hit the number. Coverage reads 100%; a real bug in an
un-*asserted* path ships anyway.

**Why this bites:** the target corrupted the metric (Goodhart). The suite executes everything and
verifies little. Better: keep coverage as a **signal**, and measure test *quality* by whether tests
catch injected faults (mutation testing).

# Common Mistakes

- **Equating coverage with correctness** — running a line isn't testing it.
- **Line coverage only** — missing untested `else`/false branches; enable branch coverage.
- **Chasing 100%** — invites assertion-free tests that game the number.
- **Ignoring the Missing report** — the percentage is noise; the untested lines are the signal.

# Best Practices

- Turn on **branch coverage** (`--cov-branch`) — it catches untested decision paths.
- Read the **Missing** lines and ask "does this deserve a test?", especially for error handling.
- Treat coverage as a **floor/flashlight**, not a KPI; never sacrifice assertion quality for the number.
- Judge tests by whether they'd **fail if the code broke** — the intuition behind mutation testing.

# Summary

- **Coverage** = the fraction of code the tests **executed** — a blind-spot finder, not a safety score.
- **Branch** coverage is stronger than **line** coverage; **path** coverage is rarely full.
- **coverage.py / pytest-cov** report the percentage and the **Missing** lines/branches.
- **100% coverage never means bug-free** (missing assertions/inputs); use it as a tool, not a target
  (Goodhart).

# Flash Cards

Q: What does code coverage actually measure?
A: The fraction of your code that executed while the tests ran — which lines/branches were reached — not whether anything was meaningfully asserted or correct.

Q: How does branch coverage differ from line coverage?
A: Line coverage checks each line ran; branch coverage checks each decision went both true and false, catching untested else/false paths that line coverage misses.

Q: Why doesn't 100% coverage mean the code is bug-free?
A: A test can run every line while asserting nothing meaningful, skipping the inputs where bugs live, or executing wrong-but-covered logic — coverage measures execution, not correctness.

Q: What is Goodhart's law and how does it apply to coverage?
A: "When a measure becomes a target, it ceases to be a good measure" — mandating 100% coverage invites assertion-free tests that hit the number without adding safety.

Q: Which part of a coverage report is most actionable?
A: The Missing lines/branches (e.g., `--cov-report=term-missing`), which name exactly what no test exercised — the percentage alone is far less useful.

Q: How should you use coverage in practice?
A: As a floor/flashlight to find untested code, then judge tests by whether they'd fail if the code broke — not by chasing a target percentage.

# Exercises

### Easy
Run `pytest --cov=<yourmodule> --cov-report=term-missing` on a small project and identify one Missing
line. Decide whether it deserves a test and why.

### Medium
Write a function with an `if/else`, then a single test that gives 100% line coverage but misses a
branch. Add `--cov-branch`, observe the gap, and add the test that closes it — with a real assertion.

### Challenging
Construct a test that achieves 100% coverage of a function while asserting nothing (or the wrong
thing), and show it passes even when you break the function. Explain what metric would have caught this
and why coverage didn't.

# Further Reading

- Coverage.py — *documentation* (branch coverage, reports): <https://coverage.readthedocs.io/>
- pytest-cov — *plugin docs*: <https://pytest-cov.readthedocs.io/>
- Martin Fowler — *TestCoverage*: <https://martinfowler.com/bliki/TestCoverage.html>
- Goodhart's law (overview): <https://en.wikipedia.org/wiki/Goodhart%27s_law>
