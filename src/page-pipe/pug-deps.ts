import { join, parse } from "path";
import { readFileSync } from "fs";
import Page from "../types/page";
import PressContext from "../types/press-context";

const defaultTemplate = "page.pug";

const build = (templates: ReadonlyArray<string>): ReadonlyArray<string> => {
  const template = templates.slice(-1)[0];
  const match = readFileSync(template, "utf-8").match(/^extends\s+(.+)$/m);
  return !!match
    ? build(templates.concat(join(parse(template).dir, match[1])))
    : templates;
};

const pugDeps = (page: Page, context: PressContext): Page => {
  const template = join(
    context.templates,
    (page.mdMeta.template as string | undefined) || defaultTemplate
  );
  const dependencies = [...page.dependencies, ...build([template])];
  return { ...page, template, dependencies };
};

export default pugDeps;
