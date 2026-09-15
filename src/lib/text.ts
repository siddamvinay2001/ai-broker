/// Model output is sanitised rather than merely discouraged. Prompt rules
/// reduce how often a dash appears; they never remove it, and one slipping
/// through is visible to the buyer.

/// Em dash, en dash, horizontal bar, minus sign, and the two-hyphen form.
const DASH_RUN = /\s*(?:--|[‒–—―−])\s*/g;

export function stripDashes(text: string): string {
  return text.replace(DASH_RUN, (match, offset: number, whole: string) => {
    const before = whole[offset - 1];
    const after = whole[offset + match.length];
    // A dash between digits is a range ("2-3 beds", "2027-2029"): keep it
    // tight. Anywhere else it is punctuation, so give it breathing room.
    if (before && after && /\d/.test(before) && /\d/.test(after)) return "-";
    return " - ";
  });
}
