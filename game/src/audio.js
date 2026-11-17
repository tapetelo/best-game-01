// WebAudio sound, oscillator-based only — no audio files. A soft hum while
// playing, a chime when a brazier lights, a warm swell on an ember pickup,
// a low thud when a wisp touches the warden, and a dawn chord on the win.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let hum = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, seconds, type, gainValue, when = 0) {
    const ac = ensure();
    if (!ac || muted) return;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainValue, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (muted && hum) {
        try { hum.stop(); } catch { /* already stopped */ }
        hum = null;
      }
      return muted;
    },
    isMuted() {
      return muted;
    },
    startHum() {
      const ac = ensure();
      if (!ac || muted || hum) return;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = 55;
      gain.gain.value = 0.035;
      osc.connect(gain).connect(ac.destination);
      osc.start();
      hum = osc;
    },
    stopHum() {
      if (hum) {
        try { hum.stop(); } catch { /* already stopped */ }
        hum = null;
      }
    },
    ember() {
      tone(880, 0.25, 'sine', 0.12);
      tone(1318, 0.3, 'sine', 0.08, 0.06);
    },
    beacon() {
      tone(523, 0.5, 'triangle', 0.14);
      tone(784, 0.6, 'triangle', 0.12, 0.1);
      tone(1046, 0.7, 'sine', 0.1, 0.2);
    },
    flare() {
      tone(196, 0.35, 'sawtooth', 0.06);
      tone(392, 0.3, 'sine', 0.1, 0.02);
    },
    hit() {
      tone(110, 0.4, 'sawtooth', 0.16);
      tone(82, 0.5, 'square', 0.08, 0.05);
    },
    night() {
      tone(330, 0.5, 'triangle', 0.1);
      tone(440, 0.6, 'triangle', 0.1, 0.15);
    },
    dawn() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 1.2, 'sine', 0.12, i * 0.12));
    },
    dash() {
      tone(520, 0.18, 'sine', 0.1);
      tone(760, 0.2, 'sine', 0.08, 0.05);
    },
    pulse() {
      tone(220, 0.5, 'triangle', 0.12);
      tone(330, 0.5, 'triangle', 0.1, 0.08);
    },
    boon() {
      tone(659, 0.4, 'sine', 0.12);
      tone(988, 0.5, 'sine', 0.1, 0.1);
    },
    boss() {
      tone(65, 1.0, 'sawtooth', 0.14);
      tone(98, 1.0, 'sawtooth', 0.1, 0.2);
    },
  };
}
