// Camera QR scanner for adding a friend in person. Uses the back camera and jsQR (a free QR reader).
const JSQR = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
const JSQR_SRI = 'sha384-b5Ya4Bq3qCyz39m2ISh+4DxjAIljdeFwK/BsXLuj9gugaNwAcj/ia15fxNZL9Nlx';
let jsqrLoad = null;
function loadJsQR() {
  jsqrLoad ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = JSQR; s.integrity = JSQR_SRI; s.crossOrigin = 'anonymous';
    s.onload = () => res(window.jsQR); s.onerror = () => { jsqrLoad = null; rej(new Error('load')); };
    document.head.appendChild(s);
  });
  return jsqrLoad;
}

export const canScan = () => !!navigator.mediaDevices?.getUserMedia;

// Shows the camera inside `box` and resolves with the text of the first QR code it sees.
// Returns { promise, stop }. The promise rejects with 'denied', 'nocamera' or 'stopped'.
export function scanQR(box) {
  let stream = null, raf = 0, stopped = false, rejectIt;
  const video = document.createElement('video');
  video.setAttribute('playsinline', ''); video.muted = true; video.autoplay = true;
  video.className = 'scan-video';
  const canvas = document.createElement('canvas');
  const c2d = canvas.getContext('2d', { willReadFrequently: true });
  const stop = () => {
    stopped = true;
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((t) => t.stop());
    video.remove();
    rejectIt?.(new Error('stopped'));
  };
  const promise = new Promise(async (resolve, reject) => {
    rejectIt = reject;
    try {
      // Keep hold of the camera as soon as it opens, so it is always switched off again, even if the QR reader
      // fails to load or the kid closed the scanner while the camera was still starting.
      const cam = navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false })
        .then((s) => { stream = s; if (stopped) s.getTracks().forEach((t) => t.stop()); return s; });
      const [jsQR] = await Promise.all([loadJsQR(), cam]);
      if (stopped) { stop(); return; }
      video.srcObject = stream;
      box.prepend(video);
      await video.play().catch(() => {});
      const tick = () => {
        if (stopped) return;
        if (video.readyState >= 2 && video.videoWidth) {
          const w = 480, h = Math.round(480 * video.videoHeight / video.videoWidth);
          canvas.width = w; canvas.height = h;
          c2d.drawImage(video, 0, 0, w, h);
          const hit = jsQR(c2d.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
          if (hit?.data) { rejectIt = null; stop(); resolve(hit.data); return; }
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      rejectIt = null; // so the real reason (camera refused / none) reaches the kid, not 'stopped'
      stop();
      const name = e?.name || '';
      reject(new Error(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied'
        : name === 'NotFoundError' || name === 'OverconstrainedError' || !canScan() ? 'nocamera' : e?.message || 'error'));
    }
  });
  return { promise, stop };
}
