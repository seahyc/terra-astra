/** Interpretive collective flow, never people, observations or measured density. */
const METRES_PER_DEGREE = 111195;
const R = Math.PI/180;
function scatter(index: number) {
  let value = Math.imul(index ^ (index >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0)/4294967296;
}
export function sampleCircumambulation(time: number, center: readonly number[], output: Float32Array) {
  const count = output.length/3;
  for (let i=0; i<count; i++) {
    // Overlapping stream radii avoid a fixed set of visible orbital rings.
    const spread = scatter(i+1471);
    const seed = scatter(i+809)*Math.PI*2;
    const angle = seed + .15*Math.sin(seed*2) + time*(.019-spread*.006) + .08*Math.sin(time*.07+seed);
    const radius = 18 + spread*40 + .9*Math.sin(seed*4+spread*7);
    const lon = (center[0] + Math.cos(angle)*radius/(METRES_PER_DEGREE*Math.cos(center[1]*R)))*R;
    const lat = (center[1] + Math.sin(angle)*radius/METRES_PER_DEGREE)*R;
    // Increasing east/north angle is counter-clockwise in the north-up local view.
    output[i*3] = Math.cos(lat)*Math.sin(lon)*1.000021;
    output[i*3+1] = Math.sin(lat)*1.000021;
    output[i*3+2] = Math.cos(lat)*Math.cos(lon)*1.000021;
  }
}
