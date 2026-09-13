/** Location searches need a map, not an unrelated model of an example facility. */
export function prefersGeographicOverview(question) {
  if (/\b(?:how|why|inside|mechanism|geometry|architecture|3d|model)\b/i.test(question)) return false;
  return /\b(?:where|locations?|distribution|clusters?)\b/i.test(question)
    || /\b(?:show|map|locate|find)\b.+\b(?:in|across|around|throughout)\b/i.test(question);
}

/** Fit approximate answer anchors; unwrap longitude to handle the date line. */
export function overviewLocation(targets) {
  if (!targets.length) return null;
  if (targets.length === 1) return targets[0];
  const longitudes = targets.map(t => ((t.longitude % 360) + 360) % 360).sort((a,b) => a-b);
  let gap = -1, start = longitudes[0];
  for (let i=0;i<longitudes.length;i++) {
    const next = longitudes[(i+1)%longitudes.length] + (i===longitudes.length-1 ? 360 : 0);
    if (next-longitudes[i] > gap) { gap=next-longitudes[i]; start=next%360; }
  }
  const width=360-gap;
  const latitudeMin=Math.min(...targets.map(t=>t.latitude)), latitudeMax=Math.max(...targets.map(t=>t.latitude));
  return {name:'Location overview',latitude:(latitudeMin+latitudeMax)/2,longitude:((start+width/2+180)%360)-180,span:Math.min(60,Math.max(8,width*1.3,(latitudeMax-latitudeMin)*1.7))};
}

/** An unlocated model must never inherit the previous question's location. */
export function modelLocation(recipe, answerTarget, queryTarget) {
  const target=recipe.anchor ?? answerTarget ?? queryTarget;
  return target ? {name:target.name,latitude:target.latitude,longitude:target.longitude,span:12} : null;
}
