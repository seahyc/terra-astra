/** Stable, independent star rhythms. Positions never change as the light shimmers. */
export function scintillation(time: number, phase: number, motion: boolean, amount = 1, signature = -1) {
  if (!motion) return { brightness: 1, glint: 0, size: 1 };
  const seed = ((phase * 13.37) % 1 + 1) % 1;
  const wave = signature >= 0
    ? Math.sin(time * 1.05 + signature) * .17
    : Math.sin(time * (.7 + seed * .35) + phase) * .16 + Math.sin(time * 1.7 + phase * 2.7) * .07;
  const glint = signature >= 0
    ? Math.pow(Math.max(0, Math.sin(time * 1.05 + signature)), 12) * .45
    : seed > .84 ? Math.pow(Math.max(0, Math.sin(time * (.85 + seed * .65) + phase * 3.1)), 24) : 0;
  return { brightness: 1 + amount * (wave + glint * .85), glint: glint * amount, size: 1 + glint * amount * .32 };
}

/** The same rhythm on the GPU, without per-frame uploads for individual stars. */
export const scintillationGLSL = `
vec3 scintillate(float t,float phase,float motion,float amount,float signature){
  float seed=fract(phase*13.37);
  float wave=signature>=0.0?sin(t*1.05+signature)*.17:sin(t*(.7+seed*.35)+phase)*.16+sin(t*1.7+phase*2.7)*.07;
  float glint=signature>=0.0?pow(max(0.0,sin(t*1.05+signature)),12.0)*.45:step(.84,seed)*pow(max(0.0,sin(t*(.85+seed*.65)+phase*3.1)),24.0);
  float strength=motion*amount;
  return vec3(1.0+strength*(wave+glint*.85),glint*strength,1.0+glint*strength*.32);
}`;
