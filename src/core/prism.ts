// Prism core + the languages the Software Testing lessons use. `python` is the
// primary language — the examples make tool-agnostic principles concrete with
// pytest and the standard library (`unittest.mock`). `bash` covers running
// tests, coverage, and installing tools. Plain `text` fences (test output,
// tracebacks, pyramids/diagrams, small config) are left unhighlighted.
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/themes/prism-tomorrow.css';

export default Prism;
