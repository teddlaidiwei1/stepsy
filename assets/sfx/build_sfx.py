# Rebuilds Stepsy's sound effects: bright, loud, game-like. Kenney CC0 layers + sounds synthesised here.
import subprocess, sys, os
import numpy as np

SR = 44100
LIB = os.environ.get("SFXLIB") or os.path.join(os.path.expanduser("~"), ".claude", "tools", "sfxlib")
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
DIG = LIB + r"\kenney_digital-audio\Audio\\"
UI = LIB + r"\kenney_interface-sounds\Audio\\"
UIA = LIB + r"\kenney_ui-audio\Audio\\"
IMP = LIB + r"\kenney_impact-sounds\Audio\\"

def load(path, semis=0.0):
    rate = SR * (2 ** (semis / 12))
    af = f"asetrate={rate:.0f},aresample={SR}" if semis else f"aresample={SR}"
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-af", af, "-ac", "1", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    assert np.abs(a).max() > 0.01, f"silent source {path}"
    return a / np.abs(a).max()

def env(n, a=0.004, r=None):
    e = np.ones(n)
    ka = max(1, int(a * SR)); e[:ka] = np.linspace(0, 1, ka)
    if r is None: e *= np.exp(-np.linspace(0, 5, n))
    else:
        kr = min(n, int(r * SR)); e[-kr:] *= np.linspace(1, 0, kr)
    return e

def tone(f, dur, wave="tri", decay=True, vib=0.0):
    t = np.arange(int(dur * SR)) / SR
    ph = 2 * np.pi * f * t + (vib * np.sin(2 * np.pi * 6 * t) if vib else 0)
    if wave == "sq": w = np.sign(np.sin(ph)) * 0.6
    elif wave == "tri": w = 2 / np.pi * np.arcsin(np.sin(ph))
    else: w = np.sin(ph)
    # bell sparkle: add an octave + fifth partial
    w = w + 0.25 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)
    return w * (env(len(t)) if decay else env(len(t), r=0.03))

def notes(seq, wave="tri", gap=0.07, hold=0.25):
    out = np.zeros(int((gap * len(seq) + hold + 0.1) * SR))
    for i, f in enumerate(seq):
        s = tone(f, hold, wave); k = int(i * gap * SR); out[k:k + len(s)] += s
    return out

def sparkle(dur=0.6, seed=1, lo=2000, hi=5000):
    rng = np.random.default_rng(seed)
    out = np.zeros(int(dur * SR))
    for k in range(int(dur * 28)):
        f = rng.uniform(lo, hi); s = tone(f, 0.09, "sine") * rng.uniform(0.2, 0.5)
        i = int(rng.uniform(0, dur - 0.1) * SR); out[i:i + len(s)] += s
    return out * np.linspace(1, 0.2, len(out))

def riser(dur, f0=300, f1=1400):
    t = np.arange(int(dur * SR)) / SR
    f = f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    w = (2 / np.pi * np.arcsin(np.sin(ph))) * (t / dur) ** 1.5
    return w

def mix(*layers):
    n = max(int(off * SR) + len(a) for a, off, g in layers)
    out = np.zeros(n)
    for a, off, g in layers:
        k = int(off * SR); out[k:k + len(a)] += a * g
    return out

C5, D5, E5, G5, A5 = 523.25, 587.33, 659.25, 783.99, 880.0
C6, E6, G6, C7 = 1046.5, 1318.5, 1568.0, 2093.0
coin = lambda: notes([C6, G6], "sq", gap=0.06, hold=0.32)

SOUNDS = {
    "tap": mix((load(UIA + "click3.ogg", 4), 0, 1.0)),
    "open": mix((load(UI + "maximize_004.ogg", 3), 0, 1.0), (notes([G5, C6], "sine", 0.05, 0.12), 0.02, 0.35)),
    "close": mix((load(UI + "minimize_004.ogg", 2), 0, 1.0)),
    "coin": coin(),
    "mark": mix((coin(), 0, 1.0), (load(DIG + "powerUp7.ogg", 2), 0.05, 0.7), (sparkle(0.5, 2), 0.1, 0.6)),
    "egg": mix((load(DIG + "phaserUp3.ogg", 2), 0, 0.8), (notes([E5, G5, C6, E6], "tri", 0.07, 0.3), 0.12, 1.0),
               (sparkle(0.7, 3), 0.2, 0.7)),
    "shake": None,  # built below
    "hatch": mix((load(IMP + "impactGlass_medium_002.ogg", 3), 0, 1.0), (load(DIG + "powerUp1.ogg", 3), 0.04, 0.6),
                 (notes([C5, E5, G5, C6, E6, G6], "sq", 0.06, 0.3), 0.08, 0.55),
                 (tone(C6, 0.9, "tri") + tone(E6, 0.9, "tri") + tone(G6, 0.9, "tri"), 0.45, 0.45),
                 (sparkle(1.2, 4), 0.2, 0.9)),
    "buy": mix((coin(), 0, 1.0), (load(UI + "confirmation_002.ogg", 2), 0.1, 0.7)),
    "nope": mix((load(UI + "error_004.ogg"), 0, 1.0)),
    "walkstart": mix((load(DIG + "powerUp3.ogg", 2), 0, 0.9), (notes([C5, G5, C6], "tri", 0.09, 0.3), 0.05, 0.8)),
    "walkend": mix((notes([C5, E5, G5, C6], "sq", 0.1, 0.25), 0, 0.6),
                   (tone(C6, 0.8, "tri") + tone(G5, 0.8, "tri"), 0.42, 0.6), (sparkle(0.9, 5), 0.3, 0.6)),
    "pet": mix((load(DIG + "pepSound1.ogg", 5), 0, 1.0)),
    "avatar": mix((load(DIG + "phaseJump1.ogg", 3), 0, 1.0)),
    "cheer": mix((notes([G5, C6, E6], "tri", 0.06, 0.25), 0, 1.0), (sparkle(0.5, 6), 0.08, 0.7)),
    "levelup": mix((load(DIG + "powerUp10.ogg", 2), 0, 0.6), (notes([C5, E5, G5, C6, E6, G6, C7], "sq", 0.055, 0.25), 0, 0.5),
                   (tone(C6, 1.0, "tri") + tone(E6, 1.0, "tri") + tone(G6, 1.0, "tri") + tone(C7, 1.0, "sine"), 0.42, 0.45),
                   (sparkle(1.3, 9), 0.25, 0.9)),
    "claim": mix((load(DIG + "powerUp1.ogg", 2), 0, 0.7), (coin(), 0.05, 0.9), (coin(), 0.2, 0.7), (sparkle(0.8, 7), 0.15, 0.8)),
}

# Egg shake (plays while the egg wobbles, 1.7 s): rattles that speed up over a rising tone, ends just before the crack.
taps = []
t = 0.0; gap = 0.32
while t < 1.55:
    taps.append((load(IMP + f"impactWood_light_00{len(taps) % 5}.ogg", 6), t, 0.55 + 0.4 * t / 1.55))
    t += gap; gap = max(0.09, gap * 0.82)
SOUNDS["shake"] = mix(*taps, (riser(1.6, 250, 1200), 0, 0.35), (sparkle(1.6, 8, 1500, 3500) * np.linspace(0, 1, int(1.6 * SR)), 0, 0.5))

for name, a in SOUNDS.items():
    a = a[: len(a)]
    # trim trailing silence, short fade, peak to -1 dBFS
    nz = np.nonzero(np.abs(a) > 1e-3)[0]; a = a[: nz[-1] + 1]
    f = min(len(a), int(0.02 * SR)); a[-f:] *= np.linspace(1, 0, f)
    a = a / np.abs(a).max() * 10 ** (-1 / 20)
    p = subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f64le", "-ar", str(SR), "-ac", "1", "-i", "-",
                        "-c:a", "libmp3lame", "-b:a", "128k", os.path.join(OUT, name + ".mp3")],
                       input=a.astype(np.float64).tobytes(), check=True)
    print(f"{name:10s} {len(a)/SR:5.2f}s")
