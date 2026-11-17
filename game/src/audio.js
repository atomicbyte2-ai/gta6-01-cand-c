// Synth audio only — WebAudio oscillators, no audio files.
export function createAudio() {
  let ctx = null, engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null;
  let radioTimer = 0, radioOn = true;
  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 60;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(engineGain); engineGain.connect(ctx.destination); engineOsc.start();
      sirenOsc = ctx.createOscillator(); sirenOsc.type = 'sine'; sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain); sirenGain.connect(ctx.destination); sirenOsc.start();
      return true;
    } catch { return false; }
  }
  function blip(freq, dur, type, vol) {
    if (!ensure() || !ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
  }
  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    engine(speed01, driving) {
      if (!ensure() || !engineOsc) return;
      engineGain.gain.value = driving ? 0.03 + speed01 * 0.05 : 0;
      engineOsc.frequency.value = 55 + speed01 * 130;
    },
    siren(on) {
      if (!ensure() || !sirenOsc) return;
      sirenGain.gain.value = on ? 0.02 : 0;
      if (on) sirenOsc.frequency.value = 650 + Math.sin(performance.now() / 320) * 220;
    },
    shot() { blip(180, 0.12, 'square', 0.12); blip(90, 0.1, 'sawtooth', 0.1); },
    punch() { blip(120, 0.08, 'triangle', 0.1); },
    pickup() { blip(660, 0.12, 'sine', 0.1); blip(990, 0.18, 'sine', 0.1); },
    cash() { blip(880, 0.1, 'sine', 0.09); blip(1320, 0.22, 'sine', 0.09); },
    hurt() { blip(110, 0.2, 'sawtooth', 0.1); },
    // Tiny radio jingle every few seconds while driving.
    radio(dt, station) {
      if (!radioOn) return;
      radioTimer -= dt;
      if (radioTimer <= 0) {
        radioTimer = 6 + Math.random() * 4;
        const notes = [523, 659, 784, 880];
        notes.forEach((n, i) => setTimeout(() => blip(n, 0.15, 'triangle', 0.04), i * 130));
      }
    },
    toggleRadio() { radioOn = !radioOn; return radioOn; },
  };
}
