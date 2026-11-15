export type CoverKind = "avatar" | "song" | "venue" | "shop";

// One shared segmenter keeps initials, accents and emoji intact without image files.
const segmenter = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter("zh-CN", { granularity: "grapheme" })
  : null;

function characters(value: string): string[] {
  if (segmenter) return Array.from(segmenter.segment(value), part => part.segment);

  // Older browsers still preserve common combining marks and emoji sequences.
  const result: string[] = [];
  let regionalCount = 0;
  for (const character of Array.from(value)) {
    const regional = /[\u{1F1E6}-\u{1F1FF}]/u.test(character);
    const previous = result.at(-1);
    const joinsPrevious = previous !== undefined && (
      /[\p{M}\u200D\uFE0E\uFE0F\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]/u.test(character)
      || previous.endsWith("\u200D")
      || (regional && regionalCount % 2 === 1)
    );
    if (joinsPrevious) result[result.length - 1] += character;
    else result.push(character);
    regionalCount = regional ? regionalCount + 1 : 0;
  }
  return result;
}

function normalizedName(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/gu, " ");
}

export function coverText(name: string, kind: CoverKind): string {
  const text = normalizedName(name);
  if (!text) return "?";

  if (kind === "avatar") {
    // Uppercase can expand characters such as ß, so keep one visible character.
    return characters(characters(text)[0].toUpperCase())[0];
  }
  if (kind !== "song") return wrapCoverName(text).join("\n");

  const words = text.split(" ");
  const first = characters(words[0]);
  if (first.length > 10) return /[\p{Script=Han}]/u.test(words[0]) ? first.slice(0, 10).join("") : words[0];

  let label = words[0];
  let length = first.length;
  for (const word of words.slice(1)) {
    const nextLength = length + 1 + characters(word).length;
    if (nextLength > 10) break;
    label += ` ${word}`;
    length = nextLength;
  }
  return label;
}

/** Spaces consume one position within a line, never at the start of a new one. */
export function wrapCoverName(name: string): string[] {
  const text = normalizedName(name);
  if (!text) return ["?"];
  const lines: string[] = [];
  let current: string[] = [];
  for (const word of text.split(" ")) {
    const letters = characters(word);
    if (current.length && current.length + 1 + letters.length <= (/^[\x00-\x7F]*$/.test([...current, ...letters].join("")) ? 10 : 8)) {
      current.push(" ", ...letters);
      continue;
    }
    if (current.length) {
      lines.push(current.join(""));
      if (lines.length === 3) return lines;
      current = [];
    }
    // Keep Latin words intact; the cover measures and fits their actual width.
    while (letters.length > 8 && /[\p{Script=Han}]/u.test(word)) {
      lines.push(letters.splice(0, 8).join(""));
      if (lines.length === 3) return lines;
    }
    current = letters;
  }
  if (current.length && lines.length < 3) lines.push(current.join(""));
  return lines;
}

const wideCharacter = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}]/u;

/** Keep the song's ten-character selection, balancing long CJK captions into two lines. */
export function coverLines(name: string, kind: CoverKind): string[] {
  if (kind === "venue" || kind === "shop") return wrapCoverName(name);
  const label = coverText(name, kind);
  if (kind !== "song") return [label];
  const letters = characters(label);
  const weight = (character: string) => wideCharacter.test(character) ? 1 : character === " " ? .35 : .55;
  const total = letters.reduce((sum, letter) => sum + weight(letter), 0);
  if (total <= 6.8) return [label];
  let left = 0, best = -1, difference = Infinity;
  for (let index = 1; index < letters.length; index++) {
    left += weight(letters[index - 1]);
    // Break at spaces or between CJK characters, preserving every Latin word.
    if (letters[index] !== " " && letters[index - 1] !== " " && !(wideCharacter.test(letters[index]) && wideCharacter.test(letters[index - 1]))) continue;
    const nextDifference = Math.abs(total - 2 * left);
    if (nextDifference < difference) { difference = nextDifference; best = index; }
  }
  return best === -1 ? [label] : [letters.slice(0, best).join("").trimEnd(), letters.slice(best).join("").trimStart()].filter(Boolean);
}

function identityHash(value: string) {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619);
  return hash >>> 0;
}

const typography = [
  {key: "humanist", family: '"Segoe UI", "Microsoft YaHei", sans-serif', weight: 600},
  {key: "geometric", family: '"Trebuchet MS", "Microsoft YaHei", sans-serif', weight: 600},
  {key: "editorial", family: 'Georgia, "Microsoft YaHei", sans-serif', weight: 600},
  {key: "rounded", family: '"Arial Rounded MT Bold", "Microsoft YaHei", sans-serif', weight: 600},
] as const;

export function coverTypography(identity: string, kind: CoverKind) {
  return typography[identityHash(`font:${kind}:${identity}`) % typography.length];
}

const palettes = [
  { background: "#e5edff", foreground: "#2d4d83" },
  { background: "#e9e5f7", foreground: "#5a457a" },
  { background: "#f7e7de", foreground: "#7b4b35" },
  { background: "#e1f0e7", foreground: "#355f49" },
  { background: "#f6edcf", foreground: "#6f5d24" },
  { background: "#dff0f4", foreground: "#2f5c67" },
  { background: "#f5e2eb", foreground: "#7b3c59" },
  { background: "#e8ebee", foreground: "#475665" },
  { background: "#e5eee0", foreground: "#47633b" },
  { background: "#eee6de", foreground: "#66503d" },
] as const;

export function coverPalette(identity: string, kind: CoverKind) {
  // Derive the colour from identity, never list order or a render-time random value.
  return palettes[identityHash(`${kind}:${identity}`) % palettes.length];
}
