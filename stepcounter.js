// Step counter from the phone's motion sensor. Written by Codex (ChatGPT), checked by Claude.
export function createStepCounter(onStep) {
  let session = null;

  function stop() {
    const s = session;
    if (!s) return;
    session = null;
    s.running = false;
    clearTimeout(s.timer);
    clearTimeout(s.burstTimer);
    globalThis.removeEventListener("devicemotion", s.listener);
    s.finish?.("unsupported");
  }

  async function start() {
    if (session) return session.ready;
    const Motion = globalThis.DeviceMotionEvent;
    if (!Motion) return "unsupported";

    let permission;
    try {
      // Preserve the button click's user activation.
      permission = typeof Motion.requestPermission === "function"
        ? Motion.requestPermission()
        : "granted";
    } catch {
      return "denied";
    }

    const s = { running: false, listener: null };
    session = s;
    s.ready = new Promise(resolve => {
      s.finish = status => {
        clearTimeout(s.timer);
        s.running = status === "ok";
        if (status !== "ok") {
          globalThis.removeEventListener("devicemotion", s.listener);
          if (session === s) session = null;
        }
        s.finish = null;
        resolve(status);
      };
    });

    Promise.resolve(permission).then(result => {
      if (session !== s) return;
      if (result !== "granted") return s.finish("denied");

      let filtered = null, baseline = 0, threshold = 1.2;
      let high = false, peakHeight = 0, peakTime = 0;
      let lastPeak = null, burst = 0, total = 0;
      const resetBurst = () => { lastPeak = null; burst = 0; };

      s.listener = event => {
        if (session !== s) return;
        const a = event.accelerationIncludingGravity;
        if (!a || ![a.x, a.y, a.z].every(Number.isFinite)) return;
        const magnitude = Math.hypot(a.x, a.y, a.z);
        if (!Number.isFinite(magnitude)) return;
        const now = performance.now();
        s.finish?.("ok");

        if (lastPeak !== null && now - lastPeak >= 2500) resetBurst();
        if (filtered === null) {
          filtered = baseline = magnitude;
          return;
        }
        filtered += 0.2 * (magnitude - filtered);
        baseline += 0.02 * (filtered - baseline);
        const height = filtered - baseline;

        if (height > threshold) {
          if (!high || height > peakHeight) {
            peakHeight = height;
            peakTime = now;
          }
          high = true;
          return;
        }
        if (!high) return;
        high = false;
        threshold = Math.max(0.9, Math.min(3.5,
          threshold * 0.8 + peakHeight * 0.45 * 0.2));

        const gap = lastPeak === null ? Infinity : peakTime - lastPeak;
        if (gap < 300) return;
        if (gap > 2000) burst = 0;
        lastPeak = peakTime;
        clearTimeout(s.burstTimer);
        s.burstTimer = setTimeout(resetBurst, Math.max(0, 2500 - (now - peakTime)));

        // Confirm on the third peak, then credit all three together.
        if (++burst === 3) onStep(total += 3);
        else if (burst > 3) onStep(++total);
      };
      globalThis.addEventListener("devicemotion", s.listener, { passive: true });
      s.timer = setTimeout(() => s.finish?.("unsupported"), 1500);
    }, () => s.finish?.("denied"));

    return s.ready;
  }

  return { start, stop, isRunning: () => session?.running === true };
}
