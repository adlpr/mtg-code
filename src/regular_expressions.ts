export const cardLineRegExp: RegExp = /^(?:\/\/ *)?(?:\w+: )?(\d+) ([^\[]+)(?: \[([^\] ]+)(?: ([^\] ]+)(?: ([^\] ]+)(?: ([^\]]+).*)?)?)?\])?$/;
export const lineSplitterRegExp: RegExp = /\r?\n/g;
export const cardNameReplaceExp: RegExp = /^((?:\/\/ *)?(?:\w+: )?\d+ )(?:[^\[]+\b)(.*)$/;
export const cardCollNoReplaceExp: RegExp = /^((?:\/\/ *)?(?:\w+: )?\d+ [^\[]+ \[[^\] ]+)(?: [^\] ]+)?([ \]].*)$/;
export const cardPrintedNameReplaceExp: RegExp = /^((?:\/\/ *)?(?:\w+: )?\d+ [^\[]+ \[[^\]=]+)(?: = [^\]]*)?\]$/;
export const searchLineRegExp: RegExp = /^\/\/ *Search: *(.*?) *$/i;
export const commentLineRegExp: RegExp = /^\/\/.*$/;
