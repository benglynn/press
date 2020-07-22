import Directory from "../types/directory";
import HasMdMeta from "../types/has-md-meta";

type TItem = Directory & HasMdMeta;

type Tags = { [key: string]: Array<TItem> };

export const seed = <Tags>{};

export const reducer = (item: TItem, previous: Tags) =>
  ((Array.isArray(item.mdMeta.tags) && item.mdMeta.tags) || [])
    .filter((item): item is string => typeof item === "string")
    .reduce(
      (tags, tag) => ({
        ...tags,
        [tag]: [...(previous[tag] || []), item],
      }),
      previous
    );
