/** Short "tudun" notification chime via Web Audio API */
export function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playTone = (freq, start, duration, volume = 0.22) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    };

    const t = ctx.currentTime;
    playTone(523.25, t, 0.12);
    playTone(783.99, t + 0.1, 0.22, 0.2);

    setTimeout(() => ctx.close().catch(() => {}), 500);
  } catch {
    /* autoplay blocked or unsupported */
  }
}
