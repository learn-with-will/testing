# Software Testing — Learning-Portal course (to be built)

This repository will host the **Software Testing** course for the
[Learning Portal](https://thachthanhthien.github.io/) family of self-paced, static course micro-apps.

It is currently seeded with a single build prompt. To create the course, open a Claude Code session
connected to this repo and hand it [`prompts/new-course-prompt.md`](prompts/new-course-prompt.md):
that prompt derives every detail from the topic and builds the full 24-lesson course end-to-end
(React 19 + Vite + TypeScript shell, Markdown lessons, JSON quizzes), then publishes it to GitHub Pages
at `https://thachthanhthien.github.io/testing/`.

> Scope: Testing software well — the testing pyramid, unit / integration / end-to-end tests, test-driven development (TDD), test doubles (mocks, stubs, fakes, spies), assertions & fixtures, coverage and its limits, flaky tests, and a pragmatic testing strategy. Teach language-agnostic principles with concrete, runnable examples in one mainstream stack.
