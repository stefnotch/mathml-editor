# mathml-editor

A prototype of a MathML editor. See it in action at https://stefnotch.github.io/mathml-editor

## History

MathML is a lovely, but quite massive standard for *rendering* mathematical formulas on the web. 
With the advent of [MathML Core](https://w3c.github.io/mathml-core/#introduction), it has become significantly sleeker, better documented and thus, more interesting for browser vendors. [So the lovely folks at Igalia](https://mathml.igalia.com/) decided to start getting MathML supported in Chromnium! [Here is the current status](https://chromestatus.com/feature/5240822173794304).

My hope is that it'll get ready to ship in the next year(s). Then, having a *formula editor* that uses MathML for rendering will finally be a perfectly reasonable choice!

## Developer info

- `src/MathEditor.vue` contains a Vue wrapper for the mathematical editor
- `src/math-editor` contains all the code for the mathematical editor
- `src/math-editor/math-ir.ts` is the "intermediate representation" of a formula
- `src/math-editor/math-ast.ts` is the same representation plus links to parents

## References

- [Accessibility](https://www.hawkeslearning.com/Accessibility/guides/mathml_content.html#workNotes)
- [Canonicalize](https://github.com/NSoiffer/MathCAT/blob/main/src/canonicalize.rs)
- Test cases
  - https://github.com/cortex-js/compute-engine/issues/11
  - https://github.com/cortex-js/compute-engine/issues/10
  - https://github.com/cortex-js/compute-engine/issues/13
- Examples
  - https://fred-wang.github.io/TeXZilla/
  - https://build-chromium.igalia.com/mathml/torture-test/mathml-torture-test.html
  - https://corpora.mathweb.org/corpus/arxmliv/tex%5Fto%5Fhtml/no_problem
  - https://fred-wang.github.io/TeXZilla/examples/customElement.html
- [Mathml operator priority](https://github.com/w3c/mathml/issues/161) and [this](https://www.w3.org/TR/MathML3/appendixc.html)
- [Mathml operators](https://w3c.github.io/mathml-core/#operator-tables)
