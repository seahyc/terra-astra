import test from 'node:test';
import assert from 'node:assert/strict';
import { splitEditorialAnswer, sentenceSegments, firstSentence, lastSentence, firstParagraph, spokenParagraph, deliverGroundedParagraph } from '../components/terra-voice/answer-copy.ts';

test('presentation preserves all prose; response routing owns conversation separation', () => {
  for (const text of ['Yes—I can hear you. Angkor Wat is in Cambodia.', 'I can hear you clearly.', 'Yes, Angkor Wat is in Cambodia.', '“I can hear you,” says the character. The scene is about distance.']) {
    assert.deepEqual(splitEditorialAnswer(text), {lead:text,detail:''});
    assert.equal(spokenParagraph(text), text);
  }
});
test('lead is a complete paragraph and More detail contains only subsequent paragraphs', () => {
  const lead = 'First fact. Second fact. Third fact.';
  assert.deepEqual(splitEditorialAnswer(lead+'\n\nA second paragraph.\n\nA third paragraph.'), {lead,detail:'A second paragraph.\n\nA third paragraph.'});
  assert.equal(firstParagraph('  '+lead+'\r\n\r\nMore.  '),lead);
  assert.deepEqual(splitEditorialAnswer('  '), {lead:'',detail:''});
});
test('a long paragraph stays complete without character caps, sentence caps or ellipsis', () => {
  const text = Array.from({length:12},(_,i)=>'Complete explanatory sentence number '+(i+1)+'.').join(' ');
  assert.ok(text.length>360);
  assert.deepEqual(splitEditorialAnswer(text),{lead:text,detail:''});
  assert.equal(spokenParagraph(text),text);
});
test('captions preserve U.S. abbreviations, titles, decimals and linked URLs', () => {
  const text = 'Dr. Smith studies U.S. Rail infrastructure. The trench sample is 5.36 km deep. See [source](https://example.com/a.b?x=2).';
  assert.equal(firstSentence(text), 'Dr. Smith studies U.S. Rail infrastructure.');
  assert.equal(lastSentence(text), 'See [source](https://example.com/a.b?x=2).');
  assert.equal(sentenceSegments(text).length, 3);
  assert.equal(sentenceSegments(text).join(''), text);
});
test('caption segments preserve streaming partial text and paragraph spacing', () => {
  const text = 'The U.S. has many cities.\n\nThe next point is still arriving';
  assert.equal(firstSentence(text), 'The U.S. has many cities.');
  assert.equal(lastSentence(text), 'The next point is still arriving');
  assert.equal(sentenceSegments(text).join(''), text);
  assert.equal(firstSentence(''), ''); assert.equal(lastSentence(''), '');
});
test('spoken paragraph retains all prose while excluding URL destinations and citation syntax', () => {
  const text = 'Yes—I can hear you. **Angkor Wat** is near [Siem Reap](https://example.com/source). It has five central towers. citesource0\n\nMore context.';
  assert.equal(spokenParagraph(text),'Yes—I can hear you. Angkor Wat is near Siem Reap. It has five central towers.');
});
test('spoken paragraph omits raw URLs embedded in prose and at paragraph end', () => {
  const text = 'The U.S. figures are independently published (https://example.com/report?year=2026), according to Dr. Lee. Learn more: https://example.org/summary.\n\nA later paragraph.';
  assert.equal(spokenParagraph(text), 'The U.S. figures are independently published, according to Dr. Lee. Learn more.');
});
test('spoken paragraph keeps markdown link labels while omitting adjacent raw URLs', () => {
  const text = 'Compare [NASA Earthdata](https://earthdata.nasa.gov/) with the raw dataset (https://example.org/raw-data), then review the full paragraph.';
  assert.equal(spokenParagraph(text), 'Compare NASA Earthdata with the raw dataset, then review the full paragraph.');
});
test('validated readout sends the full grounded paragraph exactly once per delivery', () => {
  const calls=[],say=(...args)=>calls.push(args),controller=new AbortController();
  const paragraph='A first point. A second point. A third point. A fourth point.';
  assert.equal(deliverGroundedParagraph(say,'turn-1',paragraph+'\n\nFurther reading.',{signal:controller.signal,isCurrent:()=>true}),true);
  assert.equal(calls.length,1); assert.equal(calls[0][0],'turn-1');
  assert.ok(calls[0][1].endsWith(JSON.stringify(paragraph)));
  assert.match(calls[0][1],/aloud in full/);
});
test('aborted, stale and empty readouts never start speech', () => {
  const calls=[],say=(...args)=>calls.push(args),controller=new AbortController();
  assert.equal(deliverGroundedParagraph(say,null,'A fact with a source https://example.com/source.',{signal:controller.signal,isCurrent:()=>false}),false);
  assert.equal(deliverGroundedParagraph(say,null,' ',{signal:controller.signal,isCurrent:()=>true}),false);
  controller.abort();
  assert.equal(deliverGroundedParagraph(say,null,'A fact.',{signal:controller.signal,isCurrent:()=>true}),false);
  assert.deepEqual(calls,[]);
});
