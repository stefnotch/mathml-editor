import { assert, assertUnreachable } from ".././assert";
import {
  MathIR,
  MathIRTextLeaf,
  MathIRRow,
  MathIRContainer,
  MathIRLayout,
} from "./math-ir";
import {
  expectNChildren,
  findEitherEndingBracket,
  findEndingBracket,
  wrapInRow,
} from "./math-ir-utils";
import {
  startingBrackets,
  endingBrackets,
  allBrackets,
  ambigousBrackets as eitherBrackets,
} from "./mathml-spec";

type MathMLTags =
  | "math"
  | "semantics"
  | "annotation"
  | "annotation-xml"
  | "mtext"
  | "mi"
  | "mn"
  | "mo"
  | "mspace"
  | "ms"
  | "mrow"
  | "mfrac"
  | "msqrt"
  | "mroot"
  | "mstyle"
  | "merror"
  | "maction"
  | "mpadded"
  | "mphantom"
  | "msub"
  | "msup"
  | "msubsup"
  | "munder"
  | "mover"
  | "munderover"
  | "mmultiscripts"
  | "none"
  | "mprescripts"
  | "mtable"
  | "mtr"
  | "mtd";

export function fromElement(element: HTMLElement): MathIRRow {
  assert(tagIs(element, "math"));
  const mathIR = toMathIR(element);
  assert(!Array.isArray(mathIR));
  assert(mathIR.type == "row");

  return mathIR;
}

export function toElement(mathIR: MathIR): {
  element: Element;
  mathIRLayout: MathIRLayout;
} {
  const mathIRLayout: MathIRLayout = new Map();
  const element = createMathElement("math", []);
  element.setAttribute("display", "block");
  element.setAttribute("style", "font-family: STIX Two");
  element.setAttribute("tabindex", "0");

  const emittedMathML = fromMathIR(mathIR, mathIRLayout);
  if (tagIs(emittedMathML, "mrow")) {
    // Remove duplicate mrow at the top
    element.append(...emittedMathML.childNodes);
  } else {
    element.append(emittedMathML);
  }

  return {
    element,
    mathIRLayout,
  };
}

const mathNamespace = "http://www.w3.org/1998/Math/MathML";
function createMathElement(tagName: MathMLTags, children: Node[]) {
  let element = document.createElementNS(mathNamespace, tagName);
  children.forEach((c) => {
    element.appendChild(c);
  });
  return element;
}

function getText(element: Element) {
  // Good enough for now
  return (element.textContent + "").trim();
}

// Time to iterate over the MathML and create a cute little tree
// Doesn't deal with horrible MathML yet (so stuff like unnecessary nested mrows is bad, maybe that should be a post-processing step?)
function toMathIR(element: Element): MathIR | MathIR[] {
  let children = [...element.children];

  if (tagIs(element, "math", "mrow", "mtd")) {
    // Uses flatMap so that msub can return two elements...
    return wrapInRow(children.flatMap((c) => toMathIR(c)));
  } else if (tagIs(element, "semantics") && children.length > 0) {
    return toMathIR(children[0]);
  } else if (tagIs(element, "mtext", "ms")) {
    return {
      type: "text",
      value: getText(element),
    };
  } else if (tagIs(element, "mi", "mn")) {
    return getText(element)
      .split("")
      .map((v) => {
        return {
          type: "symbol",
          value: v,
        };
      });
  } else if (tagIs(element, "mo")) {
    return getText(element)
      .split("")
      .map((v) => {
        if (element.getAttribute("stretchy") != "false" && allBrackets.has(v)) {
          return {
            type: "bracket",
            value: v,
          };
        } else {
          return {
            type: "symbol",
            value: v,
          };
        }
      });
  } else if (tagIs(element, "mfrac")) {
    return (
      expectNChildren(element, 2) ?? {
        type: "frac",
        values: children.map((c) => wrapInRow(toMathIR(c))),
        count: 2,
      }
    );
  } else if (tagIs(element, "msqrt")) {
    return {
      type: "root",
      values: [
        wrapInRow({
          type: "symbol",
          value: "2",
        }),
        wrapInRow(children.flatMap((c) => toMathIR(c))),
      ],
      count: 2,
    };
  } else if (tagIs(element, "mroot")) {
    return (
      expectNChildren(element, 2) ?? {
        type: "root",
        values: [
          wrapInRow(toMathIR(children[1])),
          wrapInRow(toMathIR(children[0])),
        ],
        count: 2,
      }
    );
  } else if (tagIs(element, "msub")) {
    let base = toMathIR(children[0]);
    if (!Array.isArray(base)) {
      base = [base];
    }
    return (
      expectNChildren(element, 2) ?? [
        ...base,
        {
          type: "sub",
          value: wrapInRow(toMathIR(children[1])),
        },
      ]
    );
  } else if (tagIs(element, "msup")) {
    let base = toMathIR(children[0]);
    if (!Array.isArray(base)) {
      base = [base];
    }
    return (
      expectNChildren(element, 2) ?? [
        ...base,
        {
          type: "sup",
          value: wrapInRow(toMathIR(children[1])),
        },
      ]
    );
  } else if (tagIs(element, "msubsup")) {
    let base = toMathIR(children[0]);
    if (!Array.isArray(base)) {
      base = [base];
    }
    return (
      expectNChildren(element, 3) ?? [
        ...base,
        {
          type: "sub",
          value: wrapInRow(toMathIR(children[1])),
        },
        {
          type: "sup",
          value: wrapInRow(toMathIR(children[2])),
        },
      ]
    );
  } else if (tagIs(element, "munder")) {
    return (
      expectNChildren(element, 2) ?? {
        type: "under",
        values: [
          wrapInRow(toMathIR(children[0])),
          wrapInRow(toMathIR(children[1])),
        ],
        count: 2,
      }
    );
  } else if (tagIs(element, "mover")) {
    return (
      expectNChildren(element, 2) ?? {
        type: "over",
        values: [
          wrapInRow(toMathIR(children[0])),
          wrapInRow(toMathIR(children[1])),
        ],
        count: 2,
      }
    );
  } else if (tagIs(element, "munderover")) {
    return (
      expectNChildren(element, 3) ?? {
        type: "over",
        values: [
          wrapInRow({
            type: "under",
            values: [
              wrapInRow(toMathIR(children[0])),
              wrapInRow(toMathIR(children[1])),
            ],
            count: 2,
          }),
          wrapInRow(toMathIR(children[2])),
        ],
        count: 2,
      }
    );
  } else if (tagIs(element, "mtable")) {
    if (
      !children.every(
        (c) =>
          tagIs(c, "mtr") && [...c.children].every((cc) => tagIs(cc, "mtd"))
      )
    ) {
      return {
        type: "error",
        value: "Unexpected children " + element,
      };
    }

    return {
      type: "table",
      values: children.map((c) =>
        [...c.children].map((cc) => wrapInRow(toMathIR(cc)))
      ),
    };
  } else {
    return {
      type: "error",
      value: "Unknown element " + element,
    };
  }
}

/**
 * Checks if an element has a given tag name
 */
function tagIs(element: Element, ...tagNames: string[]): boolean {
  return tagNames.includes(element.tagName.toLowerCase());
}

function getTextBoundingBox(t: Text, index: number) {
  const range = document.createRange();
  range.setStart(t, index);
  range.setEnd(t, index + 1); // Select the entire character
  return range.getBoundingClientRect();
}

function getTextLayout(t: Text, index: number) {
  const boundingBox = getTextBoundingBox(t, index);

  return {
    x: boundingBox.x + window.scrollX,
    y: boundingBox.y + window.scrollY,
    height: boundingBox.height,
  };
}

function getRowLayout(mathLayout: (() => DOMRect)[], index: number) {
  console.log("getRowLayout", index);
  assert(index <= mathLayout.length);
  const isLast = index == mathLayout.length;
  const boundingBox = isLast
    ? mathLayout[mathLayout.length - 1]() // Hacks in the final symbol/character
    : mathLayout[index]();

  return {
    x: boundingBox.x + (isLast ? boundingBox.width : 0) + window.scrollX,
    y: boundingBox.y + window.scrollY,
    height: boundingBox.height, // TODO: Use the script level or font size instead
  };
}

function fromMathIR(mathIR: MathIR, mathIRLayout: MathIRLayout): Element {
  function setTextLayout(mathIR: MathIRTextLeaf, textNode: Text): Text {
    mathIRLayout?.set(mathIR, (index) => getTextLayout(textNode, index));
    return textNode;
  }

  function setRowLayout(mathIR: MathIRRow, mathLayout: (() => DOMRect)[]) {
    mathIRLayout?.set(mathIR, (index) => getRowLayout(mathLayout, index));
  }

  if (mathIR.type == "error") {
    return createMathElement("merror", [
      createMathElement("mtext", [
        setTextLayout(mathIR, document.createTextNode(mathIR.value)),
      ]),
    ]);
  } else if (mathIR.type == "frac") {
    return createMathElement("mfrac", [
      fromMathIR(mathIR.values[0], mathIRLayout),
      fromMathIR(mathIR.values[1], mathIRLayout),
    ]);

    // Maybe detect under-over?
  } else if (mathIR.type == "over") {
    return createMathElement("mover", [
      fromMathIR(mathIR.values[0], mathIRLayout),
      fromMathIR(mathIR.values[1], mathIRLayout),
    ]);
  } else if (mathIR.type == "under") {
    return createMathElement("munder", [
      fromMathIR(mathIR.values[0], mathIRLayout),
      fromMathIR(mathIR.values[1], mathIRLayout),
    ]);
  } else if (mathIR.type == "root") {
    // TODO: Sometimes create a msqrt
    return createMathElement("mroot", [
      fromMathIR(mathIR.values[1], mathIRLayout),
      fromMathIR(mathIR.values[0], mathIRLayout),
    ]);
  } else if (mathIR.type == "row") {
    // TODO: Maybe don't emit every useless row
    const parsedChildren = fromMathIRRow(mathIR.values, mathIRLayout);
    setRowLayout(mathIR, parsedChildren.mathLayout);
    return createMathElement("mrow", parsedChildren.elements);
  } else if (mathIR.type == "sub" || mathIR.type == "sup") {
    return createMathElement("merror", [
      createMathElement("mtext", [
        document.createTextNode("Unexpected " + mathIR.type),
      ]),
    ]);
  } else if (mathIR.type == "symbol") {
    const parsedChildren = fromMathIRRow([mathIR], mathIRLayout);
    return parsedChildren.elements.length == 1
      ? parsedChildren.elements[0]
      : createMathElement("mrow", parsedChildren.elements);
  } else if (mathIR.type == "bracket") {
    const element = createMathElement("mo", [
      document.createTextNode(mathIR.value),
    ]);
    element.setAttribute("stretchy", "false");
    return element;
  } else if (mathIR.type == "text") {
    return createMathElement("mtext", [
      setTextLayout(mathIR, document.createTextNode(mathIR.value)),
    ]);
  } else if (mathIR.type == "table") {
    return createMathElement(
      "mtable",
      mathIR.values.map((v) =>
        createMathElement(
          "mtr",
          v.map((cell) => {
            if (cell.type == "row") {
              // TODO: Does this introduce useless rows? (also remember, we need the row parsing logic from above)
              return createMathElement("mtd", [fromMathIR(cell, mathIRLayout)]);
            } else {
              return createMathElement("mtd", [fromMathIR(cell, mathIRLayout)]);
            }
          })
        )
      )
    );
  } else {
    assertUnreachable(mathIR);
  }
}

// For starting a number
const isDigit = /^\p{Nd}+$/gu;
// For parsing a whole number
const isNumber = /^\p{Nd}+(\.\p{Nd}*)?$/gu;

/**
 * Parse all the children of a row, has some special logic
 */
function fromMathIRRow(
  mathIR: MathIR[],
  mathIRLayout: MathIRLayout
): {
  elements: Element[];
  mathLayout: (() => DOMRect)[];
} {
  // That parsing needs to
  // - Parse numbers <mn> numbers go brr
  // - Parse variables <mi> everything else I guess
  // - Parse operators <mo> https://w3c.github.io/mathml-core/#operator-tables
  // - Put the sub and sup where they belong
  // - Match brackets (opening - closing bracket pairs)
  // - Does not really need to parse e, integral-dx and other stuff for now.
  //   Instead we'll expose some "parser" API to the user and let them deal with fun like "wait, what e is that"

  const output: Element[] = [];
  const mathLayout: (() => DOMRect)[] = [];

  function pushOutput(element: Element) {
    output.push(element);
    mathLayout.push(() => element.getBoundingClientRect());
  }

  for (let i = 0; i < mathIR.length; i++) {
    const element = mathIR[i];
    if (element.type == "symbol") {
      if (element.value.search(isDigit) != -1) {
        const parsed = fromMathIRNumber(mathIR, i);
        output.push(parsed.element);
        mathLayout.push(...parsed.mathLayout); // TODO: Numbers get squished into one element
        i = parsed.lastDigitIndex;
      } else if (allBrackets.has(element.value)) {
        const pseudoBracket = createMathElement("mo", [
          document.createTextNode(element.value),
        ]);
        pseudoBracket.setAttribute("stretchy", "false");
        pushOutput(pseudoBracket);
      } else {
        // TODO: Might be an operator

        pushOutput(
          createMathElement("mi", [document.createTextNode(element.value)])
        );
      }
    } else if (element.type == "bracket") {
      if (endingBrackets.has(element.value)) {
        pushOutput(fromMathIR(element, mathIRLayout)); // No opening bracket
      } else {
        // A starting bracket or an either bracket (funnily enough, the logic is almost the same for both)
        const endingBracketIndex = startingBrackets.has(element.value)
          ? findEndingBracket(mathIR, i)
          : findEitherEndingBracket(mathIR, i);
        // TODO: maybe check if the ending bracket is actually the right type of bracket?
        if (endingBracketIndex == null) {
          pushOutput(fromMathIR(element, mathIRLayout)); // No closing bracket
        } else {
          const parsedChildren = fromMathIRRow(
            mathIR.slice(i + 1, endingBracketIndex),
            mathIRLayout
          );
          const endingBracket = mathIR[endingBracketIndex];
          assert(endingBracket.type == "bracket");
          const startingBracketElement = createMathElement("mo", [
            document.createTextNode(element.value),
          ]);
          const endingBracketElement = createMathElement("mo", [
            document.createTextNode(endingBracket.value),
          ]);
          output.push(
            createMathElement("mrow", [
              startingBracketElement,
              parsedChildren.elements.length == 1
                ? parsedChildren.elements[0]
                : createMathElement("mrow", parsedChildren.elements),
              endingBracketElement,
            ])
          );
          mathLayout.push(() => startingBracketElement.getBoundingClientRect());
          mathLayout.push(...parsedChildren.mathLayout);
          mathLayout.push(() => endingBracketElement.getBoundingClientRect());
        }
      }
    } else if (element.type == "sub" || element.type == "sup") {
      const lastElement = output.pop();
      if (lastElement) {
        const subSupElement = fromMathIR(element.value, mathIRLayout);
        mathLayout.push(() => subSupElement.getBoundingClientRect());
        output.push(
          createMathElement(element.type == "sub" ? "msub" : "msup", [
            lastElement,
            subSupElement,
          ])
        );
      } else {
        // A lonely sub or sup is an error, we let this function deal with it
        pushOutput(fromMathIR(element, mathIRLayout));
      }
    } else {
      pushOutput(fromMathIR(element, mathIRLayout));
    }
  }

  return { elements: output, mathLayout: mathLayout };
}

function fromMathIRNumber(
  mathIR: MathIR[],
  firstDigitIndex: number
): {
  element: Element;
  mathLayout: (() => DOMRect)[];
  lastDigitIndex: number;
} {
  const mathLayout: (() => DOMRect)[] = [];
  const firstDigit = mathIR[firstDigitIndex];
  assert(firstDigit.type == "symbol");

  let digits = firstDigit.value;
  let i = firstDigitIndex + 1; // Invariant: Always points at the next digit
  let count = 1;
  while (i < mathIR.length) {
    const element = mathIR[i];
    if (
      element.type == "symbol" &&
      (digits + element.value).search(isNumber) != -1
    ) {
      digits += element.value;
      i += 1;
      count += 1;
    } else {
      break;
    }
  }

  const textNode = document.createTextNode(digits);
  for (let j = 0; j < count; j++) {
    mathLayout.push(() => getTextBoundingBox(textNode, j));
  }

  return {
    element: createMathElement("mn", [textNode]),
    mathLayout: mathLayout,
    lastDigitIndex: i - 1,
  };
}
