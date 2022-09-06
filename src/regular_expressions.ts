export const cardLineRegExp: RegExp = /^(?:\/\/\s*)?(?:\w+: )?(\d+)\s+([^\[]+)(?:\s+\[([^\]\s]+)(?:\s+([^\]\s]+)(?:\s+([^\]\s]+)(?:\s+([^\]]+).*)?)?)?\])?$/;
export const cardNameReplaceExp: RegExp = /^((?:\/\/\s*)?(?:\w+: )?\d+\s+)(?:[^\[]+\b)(.*)$/;
export const lineSplitterRegExp: RegExp = /\r?\n/g;