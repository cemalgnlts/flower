import { NodeBuilder, Flower } from "./flower.esm.js";

const flower = new Flower(document.getElementById("container"));

const NumberNode = new NodeBuilder("number")
  .setTitle("Number")
  .output()
  .addTextFieldElement({ type: "number", value: "0", id: "num" })
  .build();

const CalcNode = new NodeBuilder("calc")
  .setTitle("Calculator")

  .input()
  .addTextFieldElement({ type: "number", value: "0", id: "first", readOnly: true })

  .output()

  .input()
  .addTextFieldElement({ type: "number", value: "0", defaultValue: "0", id: "second", readOnly: true })

  .onInput((values, els) => {
    const f = els.get("first");
    const s = els.get("second");

    const [numf = f.defaultValue, nums = s.defaultValue] = values;

    f.value = numf;
    s.value = nums;
  })
  .onOutput((els) => {
    const f = els.get("first");
    const s = els.get("second");

    return f.valueAsNumber + s.valueAsNumber;
  })
  .build();

const PrintNode = new NodeBuilder("print")
  .setTitle("Output")
  .input()
  .addTextFieldElement({ type: "number", readOnly: true, id: "res" })
  .onInput((value, els) => {
    els.get("res").value = value;
  }).build();

// Positions.

const number1 = flower.addNode(NumberNode);
number1.setAnchor("LeftCenter", 50, -100);

const number2 = flower.addNode(NumberNode);
number2.setAnchor("LeftCenter", 50, 100);

const calc = flower.addNode(CalcNode);
calc.setAnchor("CenterCenter");

const print = flower.addNode(PrintNode);
print.setAnchor("RightCenter", -50, -100);

number1.connectToNode(calc);
number2.connectToNode(calc, 1);
calc.connectToNode(print);

// For context menu.

flower.registerNode({
  title: "Number",
  desc: "Add number field.",
  node: NumberNode
});

flower.registerNode({
  title: "Calculator",
  desc: "Calculate two number.",
  node: CalcNode
});

flower.registerNode({
  title: "Print",
  desc: "Print value.",
  node: PrintNode
});
