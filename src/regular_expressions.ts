export const lineSplitterRegExp: RegExp = /\r?\n/g;
export const cardLineRegExp: RegExp = /^(?:\/\/ *)?(?:\w+: )?(\d+) ([^\[]+)(?: \[([^\] ]+)(?: ([^\] ]+)(?: ([^\] ]+)(?: ([^\]]+).*)?)?)?\])?$/;
export const cardNameReplaceExp: RegExp = /^((?:\/\/ *)?(?:\w+: )?\d+ )(?:[^\[]+\b)(.*)$/;
export const cardCollNoReplaceExp: RegExp = /^((?:\/\/ *)?(?:\w+: )?\d+ [^\[]+ \[[^\] ]+)(?: [^\] ]+)?([ \]].*)$/;