import "mocha";
import { expect } from "chai";
import { join } from "path";
import { press, makePipe } from "../src/api";
import Page from "../src/types/page";
import pressed from "./expected/pressed";

interface Context {
  names: Array<string>;
  pageCount: number;
}
interface PageExtra extends Page {
  extra: string;
}

describe("press", () => {
  const setup = () => {
    const items: Page[] = [];
    const toItem = (page: Page) => page;
    const seed = { names: <string[]>[], pageCount: 0 };
    const reducers = {
      names: (page: Page, previous: string[]) => previous.concat(page.name),
      pageCount: (page: Page, previous: number) => previous + 1,
    };
    const fixturePath = join(__dirname, "fixture");
    return { items, toItem, seed, reducers, fixturePath };
  };

  describe("parse", () => {
    it("should parse each directory", async () => {
      const { toItem, fixturePath } = setup();
      const [pages] = await press(fixturePath, [], toItem, {}, {});
      expect(pages).to.deep.equal(pressed);
    });

    it("should fold context with reducers", async () => {
      const { items, toItem, seed, reducers, fixturePath } = setup();
      const [pages, context] = await press(
        fixturePath,
        items,
        toItem,
        seed,
        reducers
      );
      expect(pages).to.deep.equal(pressed);
      expect(context).to.deep.equal({
        names: ["", "french-press", "tea-pot"],
        pageCount: 3,
      });
    });

    it("should fold context with async reducers", async () => {
      const { items, toItem, seed, fixturePath } = setup();
      const asyncReducers = {
        names: (page: Page, previous: string[]) =>
          Promise.resolve(previous.concat(page.name)),
        pageCount: (page: Page, previous: number) =>
          Promise.resolve(previous + 1),
      };
      const [pages, context] = await press(
        fixturePath,
        items,
        toItem,
        seed,
        asyncReducers
      );
      expect(pages).to.deep.equal(pressed);
      expect(context).to.deep.equal({
        names: ["", "french-press", "tea-pot"],
        pageCount: 3,
      });
    });

    it("transforms each page", async () => {
      const { fixturePath } = setup();
      const toItem = (page: Page): PageExtra => ({ ...page, extra: "sauce" });
      const [pages] = await press(fixturePath, [], toItem, {}, {});
      const expected = ["sauce", "sauce", "sauce"];
      expect(pages.map((page) => page.extra)).to.deep.equal(expected);
    });

    it("transforms pages with a pipe", async () => {
      const { fixturePath } = setup();
      const pipeable = (page: Page): PageExtra => ({ ...page, extra: "pipe" });
      const pipe = makePipe<Page, null>()(pipeable);
      const [pages] = await press(fixturePath, [], pipe, {}, {});
      const expected = ["pipe", "pipe", "pipe"];
      expect(pages.map((page) => page.extra)).to.deep.equal(expected);
    });

    it("transforms pages with an async pipe", async () => {
      const { fixturePath } = setup();
      const pipeable = (page: Page): Promise<PageExtra> =>
        Promise.resolve({ ...page, extra: "async pipe" });
      const pipe = makePipe<Page, null>()(pipeable);
      const [pages] = await press(fixturePath, [], pipe, {}, {});
      const expected = ["async pipe", "async pipe", "async pipe"];
      expect(pages.map((page) => page.extra)).to.deep.equal(expected);
    });
  });

  describe("makePipe", () => {
    it("returns a function", async () => {
      expect(makePipe()).to.be.a("function");
    });
  });

  describe("pipe", () => {
    it("passes pages through any number of pipeables", async () => {
      interface Context {
        names: Array<string>;
        pageCount: number;
      }
      const { items, toItem, seed, reducers, fixturePath } = setup();
      const [pages, context] = await press(
        fixturePath,
        items,
        toItem,
        seed,
        reducers
      );

      const upper = (pages: Page[]): Page[] =>
        pages.map((page) => ({ ...page, name: page.name.toUpperCase() }));

      const starDashes = (pages: Page[]): Page[] =>
        pages.map((page) => ({ ...page, name: page.name.replace(/-/g, "*") }));

      const addContext = (pages: Page[], context: Context) =>
        pages.map((page, index) => ({
          ...page,
          extra: `Page ${index + 1} of ${context.pageCount}`,
        }));

      const justExtra = (pages: PageExtra[]) => pages.map((page) => page.extra);

      const upNames = ["", "FRENCH-PRESS", "TEA-POT"];
      const starNames = ["", "FRENCH*PRESS", "TEA*POT"];
      const extra = ["Page 1 of 3", "Page 2 of 3", "Page 3 of 3"];

      const pipeThrough = makePipe<Page[], Context>();

      expect(
        (await pipeThrough(upper)(pages, context)).map((page) => page.name)
      ).to.deep.equal(upNames);

      expect(
        (await pipeThrough(upper, starDashes)(pages, context)).map(
          (page) => page.name
        )
      ).to.deep.equal(starNames);

      const pipeExtra = makePipe<Page[], Context>();
      expect(
        (await pipeExtra(upper, starDashes, addContext)(pages, context)).map(
          (pg) => pg.extra
        )
      ).to.deep.equal(extra);

      const pipeString = makePipe<Page[], Context>();
      expect(
        await pipeString(
          upper,
          starDashes,
          addContext,
          justExtra
        )(pages, context)
      ).to.deep.equal(extra);
    });

    it("awaits promises returned by pipeables", async () => {
      interface PageExtra extends Page {
        extra: string;
      }
      const { items, toItem, seed, reducers, fixturePath } = setup();
      const [pages, context] = await press(
        fixturePath,
        items,
        toItem,
        seed,
        reducers
      );

      const upper = (pages: Page[]): Promise<Page[]> =>
        Promise.resolve(
          pages.map((page) => ({ ...page, name: page.name.toUpperCase() }))
        );

      const starDashes = (pages: Page[]): Page[] =>
        pages.map((page) => ({ ...page, name: page.name.replace(/-/g, "*") }));

      const addContext = (pages: Page[], context: Context) =>
        Promise.resolve(
          pages.map((page, index) => ({
            ...page,
            extra: `Page ${index + 1} of ${context.pageCount}`,
          }))
        );

      const justExtra = (pages: PageExtra[]): string[] =>
        pages.map((page) => page.extra);

      const upNames = ["", "FRENCH-PRESS", "TEA-POT"];
      const starNames = ["", "FRENCH*PRESS", "TEA*POT"];
      const extra = ["Page 1 of 3", "Page 2 of 3", "Page 3 of 3"];

      const pipeThrough = makePipe<Page[], Context>();
      const upperPipe = pipeThrough(upper);
      expect(
        (await upperPipe(pages, context)).map((page) => page.name)
      ).to.deep.equal(upNames);

      const starPipe = pipeThrough(upper, starDashes);
      expect(
        (await starPipe(pages, context)).map((page) => page.name)
      ).to.deep.equal(starNames);

      const pipeExtra = makePipe<Page[], Context>();
      const extraPipe = pipeExtra(upper, starDashes, addContext);
      expect(
        (await extraPipe(pages, context)).map((pg) => pg.extra)
      ).to.deep.equal(extra);

      const pipeString = makePipe<Page[], Context>();
      const stringPipe = pipeString(upper, starDashes, addContext, justExtra);
      const result = await stringPipe(pages, context);
      expect(result).to.deep.equal(extra);
    });
  });
});
