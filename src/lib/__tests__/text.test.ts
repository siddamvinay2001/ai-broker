import assert from "node:assert/strict";
import { stripDashes } from "@/lib/text";

let n = 0;
const check = (label: string, fn: () => void) => { fn(); n++; console.log(`  PASS  ${label}`); };

check("the exact summary the model produced is cleaned", () => {
  const raw =
    "You're looking for property in Dubai, but I'd love more details—budget, preferred area, " +
    "and whether you're buying, renting, or investing—so I can find the right options for you.";
  const out = stripDashes(raw);
  assert.equal(out.match(/[‒–—―−]/g), null, "a dash survived");
  assert.ok(out.includes("details - budget"), out);
  assert.ok(out.includes("investing - so I can"), out);
});

check("every dash variant is removed", () => {
  for (const d of ["—", "–", "‒", "―", "−", "--"]) {
    const out = stripDashes(`alpha${d}beta`);
    assert.equal(out, "alpha - beta", `failed for U+${d.charCodeAt(0).toString(16)}`);
  }
});

check("spacing around the dash is normalised, not doubled", () => {
  assert.equal(stripDashes("alpha — beta"), "alpha - beta");
  assert.equal(stripDashes("alpha— beta"), "alpha - beta");
  assert.equal(stripDashes("alpha  —  beta"), "alpha - beta");
});

check("numeric ranges stay tight", () => {
  assert.equal(stripDashes("handover 2027–2029"), "handover 2027-2029");
  assert.equal(stripDashes("2–3 beds"), "2-3 beds");
});

check("ordinary hyphens and text are untouched", () => {
  assert.equal(stripDashes("family-friendly off-plan 2-bed"), "family-friendly off-plan 2-bed");
  assert.equal(stripDashes("AED 2,850,000"), "AED 2,850,000");
  assert.equal(stripDashes(""), "");
});

console.log(`\ntext: ${n} checks passed.`);
