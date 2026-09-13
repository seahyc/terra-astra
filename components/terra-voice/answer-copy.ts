// Voice checks belong in the conversation; keep a subject explanation focused.
// Preserve a microphone-only reply instead of making the panel empty.
export function cleanEditorialCopy(text: string): string {
  const trimmed = text.trim();
  const remaining = trimmed.replace(/^(?:(?:yes|yep|yeah|sure|ok(?:ay)?)[\s,—–!:-]+)?(?:i can hear you(?:\s+(?:clearly|loud and clear|just fine))?|i[’']m listening|your (?:mic|microphone|audio) is (?:working|coming through)(?:\s+(?:clearly|fine))?)[.!?]\s*/i, '').trim();
  return remaining || trimmed;
}

// Return original sentence spans, including their whitespace, so callers can
// retain exact offsets. Protect common abbreviations before ICU segmentation.
export function sentenceSegments(text: string): string[] {
  const protectedText = text
    .replace(/\b(?:[A-Za-z]\.){2,}/g, value => value.replaceAll('.', 'x'))
    .replace(/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St)\./g, value => value.replaceAll('.', 'x'))
    .replace(/https?:\/\/[^\s)]+/g, value => value.replace(/[.!?]/g, 'x'));
  return [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(protectedText)]
    .map(segment => text.slice(segment.index, segment.index + segment.segment.length));
}

export function firstSentence(text: string): string {
  return sentenceSegments(text)[0]?.trim() ?? '';
}

export function lastSentence(text: string): string {
  return sentenceSegments(text).at(-1)?.trim() ?? '';
}

export function firstParagraph(text: string): string {
  return text.trim().split(/\r?\n[ \t]*\r?\n/, 1)[0] ?? '';
}

export function splitEditorialAnswer(text: string) {
  const copy = cleanEditorialCopy(text);
  const lead = firstParagraph(copy);
  return { lead, detail: copy.slice(lead.length).trim() };
}

export function spokenParagraph(text: string): string {
  return firstParagraph(cleanEditorialCopy(text))
    .replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, '$1')
    .replace(/cite[^]+/g, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/\s+/g, ' ').trim();
}

export function deliverGroundedParagraph(
  say: (delegationId: string | null, content: string) => void,
  delegationId: string | null,
  text: string,
  guard: { signal: AbortSignal; isCurrent: () => boolean },
): boolean {
  if (guard.signal.aborted || !guard.isCurrent()) return false;
  const paragraph = spokenParagraph(text);
  if (!paragraph) return false;
  // One delivery per validated result; the controller handles transport chunking.
  say(delegationId, `Read the following paragraph aloud in full, exactly as written, without an introduction or summary. Paragraph: ${JSON.stringify(paragraph)}`);
  return true;
}
