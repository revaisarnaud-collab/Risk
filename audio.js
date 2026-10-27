// Sons synthétisés avec WebAudio : aucun fichier audio à charger.
// Les navigateurs n'autorisent le son qu'après un premier geste de l'utilisateur,
// d'où unlock(), appelé au premier appui sur « Prêt ».

let ctx = null;
let out = null;
let noise = null;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    out = ctx.createGain();
    out.gain.value = 0.8;
    out.connect(comp).connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function burst(t, { dur, freq, q = 1, gain, type = 'bandpass' }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter).connect(env).connect(out);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

// Dés qui s'entrechoquent dans la main puis roulent sur la table.
export function rattle(ms, dice) {
  if (!ctx) return;
  const now = ctx.currentTime;
  const end = ms / 1000;
  let t = 0;
  while (t < end * 0.8) {
    burst(now + t, { dur: 0.035, freq: 2200 + Math.random() * 2800, q: 7, gain: 0.35 + Math.random() * 0.3 });
    t += 0.02 + Math.random() * 0.05 * (1 + t * 2);
  }
  // impacts sur la table : premier atterrissage puis rebond
  for (const at of [0.55, 0.68, 0.8]) {
    for (let i = 0; i < dice; i++) {
      const jitter = Math.random() * 0.04;
      burst(now + end * at + jitter, { dur: 0.08, freq: 900 + Math.random() * 500, q: 3, gain: at === 0.55 ? 0.7 : 0.35 });
    }
  }
}
