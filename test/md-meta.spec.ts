import "mocha";
import { expect } from "chai";
import { join } from "path";
import { press } from "../src/api";
import mdMeta from "../src/pipeables/md-meta";

describe("mdMeta", () => {
  const expected = [
    {
      name: "",
      path: "/",
      md: "---\ntemplate: 'home.pug'\n---\n\n# Beverage vessels\n\nWelcome!",
      mdMeta: { template: "home.pug" },
    },
    {
      name: "french-press",
      path: "/french-press/",
      md:
        "---\nheadline: French press\ntags:\n - vessel\n---\n\n# French press\n\nThe French press is also known as a cafetière.",
      mdMeta: { headline: "French press", tags: ["vessel"] },
    },
    {
      name: "tea-pot",
      path: "/tea-pot/",
      md:
        "---\nheadline: Tea pot\ntags:\n - vessel\n---\n\n# Tea pot\n\nA teapot is a vessel used for steeping tea leaves.",
      mdMeta: { headline: "Tea pot", tags: ["vessel"] },
    },
  ];
  it("should add markdown meta to each page", async () => {
    const [items] = await press(join(__dirname, "fixture"), mdMeta, {}, {});
    expect(items).to.deep.equal(expected);
  });
});
