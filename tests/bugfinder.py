"""Curious-kid smoke explorer for Stepsy. Requires Playwright + its Chromium.

    python tests/bugfinder.py [out_dir]

Uses the ALREADY RUNNING server. Does not start servers, change game files, give
the player extra progress, or use real GPS/motion. Findings are heuristics, not
assertions of product intent; in particular, no visible change is a "check".
"""

import json
import re
import sys
import time
from collections import Counter, deque
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import Error, sync_playwright


URL = "http://127.0.0.1:8791/"
SCREENS = ("home", "pets", "shop", "quests", "ranks", "me", "parent")
DEMO = {"version": 3, "demo": True, "onboarded": True,
        "tips": dict.fromkeys(("home", "pets", "shop", "quests", "ranks", "me"), 1)}
ORDER = {n: i for i, n in enumerate((1, 3, 4, 9, 10, 5, 6, 2, 7, 8))}
NAMES = {1: "JavaScript / console error", 2: "does nothing (check)",
         3: "cannot dismiss overlay", 4: "page left inert", 5: "covered centre",
         6: "overflow", 7: "small tap target", 8: "small text",
         9: "broken value in text", 10: "coins / saved progress"}

# Install before app code. Denial is deliberate; no fabricated sensor readings.
INIT_JS = r"""(() => {
  const deny = (_ok, bad) => {
    setTimeout(() => bad && bad({code: 1, message: 'Denied by bugfinder'}), 0);
    return 1;
  };
  if (navigator.geolocation) {
    Object.defineProperties(navigator.geolocation, {
      getCurrentPosition: {value: deny, configurable: true},
      watchPosition: {value: deny, configurable: true},
      clearWatch: {value: () => {}, configurable: true}
    });
  }
  for (const name of ['DeviceMotionEvent', 'DeviceOrientationEvent']) {
    if (window[name]) Object.defineProperty(window[name], 'requestPermission', {
      value: async () => 'denied', configurable: true
    });
  }
  window.__bugfinderToast = 0;
  new MutationObserver(records => {
    if (records.some(r => (r.target.id === 'toast' ||
        r.target.parentElement?.closest('#toast')) &&
        document.querySelector('#toast.show'))) window.__bugfinderToast++;
  }).observe(document, {subtree: true, childList: true, attributes: true,
                        attributeFilter: ['class'], characterData: true});
})();"""

# One cheap browser-side pass serves discovery, snapshots, and layout checks.
# Rendered controls below the fold are discovered too, then scrolled into view.
INSPECT_JS = r"""() => {
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const shown = e => {
    if (!e || !e.getClientRects().length || e.closest('[hidden]')) return false;
    for (let p=e; p; p=p.parentElement) {
      const s=getComputedStyle(p);
      if (s.display==='none' || s.visibility==='hidden' || +s.opacity===0) return false;
    }
    return true;
  };
  const open = id => shown(document.getElementById(id));
  const intro=open('intro'), sheet=open('sheet'), walk=open('walk');
  const surface = intro ? 'intro' : sheet ?
    'sheet:' + norm(document.querySelector('#sheetTitle')?.textContent ||
                    document.querySelector('#sheetBody')?.textContent).slice(0,100) :
    walk ? 'walk' : 'screen';
  const roots = intro ? [document.getElementById('intro')] :
    sheet ? [document.getElementById('sheet')] :
    walk ? [document.getElementById('walk')] :
    [...document.querySelectorAll('.screen:not([hidden]), #dock, .topbar')];
  const sel='button, [role="tab"], a, [tabindex]';
  const enabled=e => !e.disabled && e.getAttribute('aria-disabled')!=='true' &&
                       !e.closest('[inert]');
  const label=e => norm(e.getAttribute('aria-label') || e.innerText ||
    e.getAttribute('title') || e.id || e.tagName).replace(/, wearing$/i,'').slice(0,140);
  const path=e => {
    if(e.id) return '#'+CSS.escape(e.id);
    const parts=[];
    for(let p=e; p && p!==document.body; p=p.parentElement) {
      if(p.id) {parts.unshift('#'+CSS.escape(p.id)); break;}
      let n=1; for(let q=p.previousElementSibling;q;q=q.previousElementSibling)
        if(q.tagName===p.tagName) n++;
      parts.unshift(p.tagName.toLowerCase()+':nth-of-type('+n+')');
    }
    return parts.join(' > ');
  };
  const candidates=[], issues=[], collisions=new Map();
  const dock=document.getElementById('dock');
  const dockTop=!intro && !sheet && !walk && shown(dock) ? dock.getBoundingClientRect().top : innerHeight;
  const inView=r => r.width>0 && r.height>0 && r.bottom>0 && r.top<innerHeight &&
                      r.right>0 && r.left<innerWidth;
  const visibleRect=(e,r) => {
    if(!inView(r)) return false;
    for(let p=e.parentElement;p;p=p.parentElement) {
      const s=getComputedStyle(p), b=p.getBoundingClientRect();
      if(/hidden|auto|scroll|clip/.test(s.overflowY) && (r.bottom<=b.top || r.top>=b.bottom)) return false;
      if(/hidden|auto|scroll|clip/.test(s.overflowX) && (r.right<=b.left || r.left>=b.right)) return false;
    }
    return true;
  };
  const all=[];
  for(const root of roots.filter(Boolean)) all.push(root,...root.querySelectorAll('*'));
  for(const e of all) {
    if(!shown(e)) continue;
    const r=e.getBoundingClientRect(), viewport=visibleRect(e,r);
    if(e.matches(sel) && enabled(e)) {
      const data=[...e.attributes].filter(a=>a.name.startsWith('data-'))
        .sort((a,b)=>a.name.localeCompare(b.name)).map(a=>a.name+'='+a.value).join('|');
      let base=e.id ? '#'+e.id : e.tagName+'|'+(data || label(e));
      // The same shop action button has genuinely different Wear/Buy/Remove actions.
      if(e.id==='tryBtn') base+='|'+norm(e.innerText).replace(/[\d,]+/g,'#');
      const collision=collisions.get(base)||0; collisions.set(base,collision+1);
      const key=surface+'|'+base+'|'+collision;
      const d={key, selector:path(e), label:label(e), id:e.id, surface,
        data:Object.fromEntries([...e.attributes].filter(a=>a.name.startsWith('data-'))
                              .map(a=>[a.name,a.value])),
        item:e.classList.contains('item-card'),
        href:e.tagName==='A' ? e.getAttribute('href') : null,
        download:e.hasAttribute('download'),
        close:e.dataset.act==='close' || /^(close|cancel|yay!?|done|i'm ok now)$/i.test(norm(e.innerText)),
        chrome:!!e.closest('#dock, .topbar'),
        selected:e.getAttribute('aria-selected')==='true' || e.getAttribute('aria-current')==='page'};
      candidates.push(d);
      if(viewport) {
        if(r.width<40 || r.height<40) issues.push({kind:7,key,label:d.label,
          detail:`Target is ${r.width.toFixed(1)} x ${r.height.toFixed(1)} px (minimum 40 x 40).`});
        const x=r.left+r.width/2,y=r.top+r.height/2;
        if(x>=0 && x<innerWidth && y>=0 && y<innerHeight &&
           (dock.contains(e) || y<dockTop)) {
          const hit=document.elementFromPoint(x,y);
          if(hit && hit!==e && !e.contains(hit)) issues.push({kind:5,key,label:d.label,
            detail:'Centre is covered by '+path(hit)+'.'});
        }
      }
    }
    if(!viewport) continue;
    if(e.matches('button, .tag, .pc-name, .nm, h1, h2, h3, h4, h5, h6') &&
       e.clientWidth>0 && e.scrollWidth>e.clientWidth+2)
      issues.push({kind:6,key:surface+'|'+path(e),label:label(e),
        detail:`Text/content width ${e.scrollWidth}px exceeds box ${e.clientWidth}px.`});
    const direct=[...e.childNodes].filter(n=>n.nodeType===3 && norm(n.textContent));
    const font=parseFloat(getComputedStyle(e).fontSize);
    if(direct.length && font<12 && !e.closest('svg, script, style')) {
      const range=document.createRange(); range.selectNodeContents(e);
      if([...range.getClientRects()].some(inView)) issues.push({kind:8,
        key:surface+'|'+path(e),label:norm(direct.map(n=>n.textContent).join(' ')).slice(0,120),
        detail:`Visible text is ${font.toFixed(1)}px (minimum 12px).`});
    }
  }
  if(document.documentElement.scrollWidth>innerWidth) issues.push({kind:6,key:'document',
    label:'page',detail:`Page width ${document.documentElement.scrollWidth}px exceeds viewport ${innerWidth}px.`});
  const inert=[...document.querySelectorAll('#app > *')].filter(e=>e.inert).map(e=>e.id||e.tagName);
  if(!sheet && !intro && inert.length) issues.push({kind:4,key:'inert',label:'#app',
    detail:'No sheet/intro is open, but these app children are inert: '+inert.join(', ')});
  if(open('scrim') && !sheet && !intro) issues.push({kind:3,key:'orphan-scrim',
    label:'#scrim',detail:'Scrim is visible without a sheet or intro.'});
  const text=[...roots,document.querySelector('#toast.show')].filter(Boolean)
    .map(e=>e.innerText).join('\n');
  const broken=[...new Set(text.match(/\b(?:NaN|undefined|null|[-+]?Infinity)\b|\[object[^\]\n]*\]?/g)||[])];
  if(broken.length) issues.push({kind:9,key:surface+'|broken',label:'visible text',
    detail:'Broken-looking value(s): '+broken.join(', ')});
  const coins=norm(document.querySelector('.coins')?.innerText).replace(/,/g,'').replace(/\u2212/g,'-');
  const number=coins.match(/-?\d+(?:\.\d+)?/);
  if(number && +number[0]<0) issues.push({kind:10,key:'coins',label:'.coins',detail:'Negative coins: '+coins});
  try {const raw=localStorage.getItem('stepsy'); if(raw!==null) JSON.parse(raw);}
  catch(e) {issues.push({kind:10,key:'storage',label:'localStorage stepsy',detail:'Cannot parse saved progress: '+e.message});}
  // Classes/ARIA catch selection changes without comparing canvas animation pixels.
  const state=all.filter(e=>shown(e) && e.matches('button, [role="tab"], .item-card, .pet-card'))
    .map(e=>[path(e),e.className,e.getAttribute('aria-selected'),e.getAttribute('aria-pressed'),e.disabled]);
  const toast=document.querySelector('#toast.show');
  return {surface,intro,sheet,walk,scrim:open('scrim'),view:document.body.dataset.view,
    candidates,issues,snapshot:JSON.stringify([text,state]),
    toast:toast ? norm(toast.innerText) : '', toastSeq:window.__bugfinderToast||0,
    gate:sheet && shown(document.getElementById('gateIn'))};
}"""


class BudgetExpired(Exception):
    pass


class Finder:
    def __init__(self, out):
        self.out = out
        out.mkdir(parents=True, exist_ok=True)
        self.started = time.monotonic()
        self.overall_deadline = self.started + 340
        self.findings, self.actions, self.notes = [], [], []
        self.unique, self.screen_shots = set(), set()
        self.shots = 0
        self.run = "-"
        self.page = None
        self.errors = []
        self.error_cursor = 0
        self.seen, self.queued = set(), set()
        self.checkpoints = {}
        self.coverage = {}

    def budget(self):
        if time.monotonic() >= min(self.deadline, self.overall_deadline):
            raise BudgetExpired()

    def pause(self, milliseconds=600):
        self.budget()
        self.page.wait_for_timeout(milliseconds)

    def shot(self, name):
        remaining = min(self.deadline, self.overall_deadline) - time.monotonic()
        if remaining < 0.2:
            return "not captured (runtime budget reached)"
        try:
            self.page.screenshot(path=str(self.out / name), timeout=min(1800, int(remaining * 1000)),
                                 animations="disabled", full_page=False)
            return name
        except Error as exc:
            self.notes.append(f"{self.run}: screenshot {name} failed: {str(exc)[:180]}")
            return "unavailable"

    def finding(self, kind, screen, element, detail, key=None):
        identity = (self.run, screen, kind, key or element,
                    detail if kind in (1, 9, 10) else "")
        if identity in self.unique:
            return
        self.unique.add(identity)
        filename = "not captured (60 finding screenshots reached)"
        if self.shots < 60:
            self.shots += 1
            filename = self.shot(f"finding-{self.shots:03d}-{self.run}-{kind}.png")
        self.findings.append(dict(run=self.run, screen=screen, element=element,
                                  kind=kind, detail=detail, screenshot=filename))

    def inspect(self, screen, element="screen"):
        self.budget()
        state = self.page.evaluate(INSPECT_JS)
        for issue in state["issues"]:
            self.finding(issue["kind"], screen, issue["label"],
                         issue["detail"] + f" Observed after: {element}.", issue["key"])
        for error in self.errors[self.error_cursor:]:
            self.finding(1, screen, element, error, error)
        self.error_cursor = len(self.errors)
        shot_screen = "intro" if state["intro"] else "walk" if state["walk"] else state["view"]
        key = (self.run, shot_screen)
        if shot_screen and key not in self.screen_shots and (state["intro"] or state["walk"] or
                (not state["sheet"] and state["view"] == screen)):
            self.screen_shots.add(key)
            self.shot(f"screen-{self.run}-{shot_screen}.png")
        return state

    def external(self, d):
        href = d.get("href")
        if d.get("download"):
            return True
        if href is None or href.startswith("#"):
            return False
        from urllib.parse import urljoin
        dest, base = urlsplit(urljoin(self.page.url, href)), urlsplit(URL)
        return (dest.scheme, dest.netloc) != (base.scheme, base.netloc)

    def permitted(self, d):
        return d["id"] != "sosBtn" and not self.external(d)

    @staticmethod
    def control_key(screen, d):
        # Dock/topbar and overlay nodes are shared by every main screen. Testing
        # them seven times wastes most of the six-minute budget.
        scope = "shared" if d["chrome"] or d["surface"] != "screen" else screen
        return scope, d["key"]

    def locate(self, d):
        locator = self.page.locator(d["selector"])
        if locator.count() != 1 or not locator.is_visible() or not locator.is_enabled():
            return None
        # Re-rendered grids can reuse a DOM path for a different item.
        valid = locator.evaluate(r"""(e, d) => {
          const norm=s=>(s||'').replace(/\s+/g,' ').trim().replace(/, wearing$/i,'');
          if(d.id==='tryBtn') return norm(e.innerText).replace(/[\d,]+/g,'#')===
                                    norm(d.label).replace(/[\d,]+/g,'#');
          return d.id ? e.id===d.id : norm(e.getAttribute('aria-label') || e.innerText ||
            e.getAttribute('title') || e.id || e.tagName).slice(0,140)===d.label;
        }""", d)
        return locator if valid else None

    def tap(self, d, screen, purpose="explore"):
        self.budget()
        if not self.permitted(d):
            return False
        locator = self.locate(d)
        if locator is None:
            return False
        locator.scroll_into_view_if_needed(timeout=900)
        locator.evaluate("e => e.scrollIntoView({block:'center', inline:'nearest', behavior:'instant'})")
        self.page.wait_for_timeout(35)
        point = locator.evaluate("""e => {
          const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
          const dock=document.getElementById('dock'),dr=dock.getBoundingClientRect();
          const hit=document.elementFromPoint(x,y);
          return {x,y,inside:x>=0&&x<innerWidth&&y>=0&&y<innerHeight,
            underDock:!dock.inert&&!dock.contains(e)&&getComputedStyle(dock).visibility!=='hidden'&&
              dr.height>0&&y>=dr.top&&y<=dr.bottom,
            covered:!!hit&&hit!==e&&!e.contains(hit)};
        }""")
        before = self.inspect(screen, f"before {d['label']}")
        if not point["inside"] or point["underDock"]:
            self.notes.append(f"{self.run}/{screen}: could not safely tap {d['label']} "
                              "after scrolling (outside viewport / behind dock).")
            return False
        # Real touch input also reveals controls covered by another element.
        if purpose == "explore":
            self.checkpoints.setdefault(self.control_key(screen, d),
                self.page.evaluate("localStorage.getItem('stepsy')"))
        error_count = len(self.errors)
        self.page.touchscreen.tap(point["x"], point["y"])
        self.pause(600 if purpose in ("explore", "cleanup") else 260)
        after = self.inspect(screen, d["label"])
        changed = before["snapshot"] != after["snapshot"] or \
            before["surface"] != after["surface"] or \
            after["toastSeq"] > before["toastSeq"] or \
            (after["toast"] and before["toast"] != after["toast"])
        result = "changed" if changed else "no visible change"
        if after["sheet"]:
            result += "; " + after["surface"]
        if point["covered"]:
            result += "; centre covered"
        if len(self.errors) > error_count:
            result += f"; {len(self.errors) - error_count} error(s)"
        self.actions.append((self.run, screen, purpose, d["label"], result))
        self.seen.add(self.control_key(screen, d))
        if purpose == "explore" and not changed:
            self.finding(2, screen, d["label"],
                         "Tap changed no DOM text, selection, sheet, or toast. Check intent; "
                         "already-selected controls and canvas-only changes can be fine.", d["key"])
        return True

    def selector_tap(self, selector, screen, purpose="restore"):
        state = self.inspect(screen, purpose)
        for d in state["candidates"]:
            if self.page.locator(selector).count() == 1 and \
                    self.page.locator(selector).evaluate("(e,s) => e.matches(s)", d["selector"]):
                return self.tap(d, screen, purpose)
        return False

    def settle_sheet(self, screen):
        state = self.inspect(screen)
        # Hatching and the demo QR scan intentionally have brief buttonless phases.
        if state["sheet"] and not any(d["close"] for d in state["candidates"]):
            for _ in range(7):
                self.pause(250)
                state = self.inspect(screen, "waiting for sheet animation")
                if not state["sheet"] or any(d["close"] for d in state["candidates"]):
                    break
        return state

    def cleanup(self, screen):
        for _ in range(3):
            state = self.settle_sheet(screen)
            if state["intro"]:
                self.page.keyboard.press("Escape")
                self.pause(300)
                if self.inspect(screen)["intro"]:
                    self.finding(3, screen, "#intro", "Unexpected intro blocks exploration and Escape did not dismiss it.")
                    return False
            elif state["sheet"]:
                own = next((d for d in state["candidates"] if d["close"]), None)
                if own:
                    self.tap(own, screen, "cleanup")
                else:
                    self.page.keyboard.press("Escape")
                    self.pause(300)
                if self.inspect(screen)["sheet"]:
                    self.page.keyboard.press("Escape")
                    self.pause(300)
                    if self.inspect(screen)["sheet"]:
                        self.finding(3, screen, own["label"] if own else "#sheet",
                                     "Sheet survived its dismissal button (if present) and Escape.")
                        return False
            elif state["walk"]:
                if not self.selector_tap("#endBtn", screen, "cleanup"):
                    self.finding(3, screen, "#endBtn", "Cannot end walk to restore the screen.")
                    return False
            else:
                return not state["scrim"]
        state = self.inspect(screen)
        return not (state["sheet"] or state["intro"] or state["walk"] or state["scrim"])

    def answer_gate(self):
        body = self.page.locator("#sheetBody").inner_text()
        match = re.search(r"(\d+)\s*(?:\u00d7|\u00c3\u2014|[xX*])\s*(\d+)", body)
        if not match:
            self.notes.append(f"{self.run}: could not read multiplication question: {body[:120]}")
            return False
        a, b = map(int, match.groups())
        self.page.locator("#gateIn").fill(str(a * b), timeout=900)
        return True

    def navigate(self, screen):
        state = self.inspect(screen, "navigation")
        if state["view"] == screen and not (state["sheet"] or state["walk"] or state["intro"]):
            return True
        if not self.cleanup(screen):
            return False
        if screen == "parent":
            if not self.navigate("me") or not self.selector_tap("#openParent", "me"):
                return False
            if not self.answer_gate() or not self.selector_tap('#sheetBody button[type="submit"]', "me"):
                return False
        else:
            selector = "#profileBtn" if screen == "me" else f'.tab[data-tab="{screen}"]'
            if not self.selector_tap(selector, screen):
                return False
        state = self.inspect(screen, "navigation finished")
        return state["view"] == screen and not state["sheet"]

    def restore(self, screen, route, allow_rewind=True):
        if not self.cleanup(screen) or not self.navigate(screen):
            return False
        for d in route:
            self.budget()
            locator = self.locate(d)
            if locator is None:
                checkpoint = self.checkpoints.get(self.control_key(screen, d))
                if allow_rewind and checkpoint is not None:
                    # A hatch consumes its egg. Replay the actual pre-tap save
                    # to reach its other button without inventing player progress.
                    self.page.evaluate("s => localStorage.setItem('stepsy', s)", checkpoint)
                    self.page.reload(wait_until="domcontentloaded", timeout=8000)
                    self.page.wait_for_function("document.querySelector('#shopTabs [data-t]')", timeout=8000)
                    self.pause(300)
                    self.notes.append(f"{self.run}/{screen}: replayed a saved-state checkpoint "
                                      f"to revisit consumed control {d['label']}.")
                    return self.restore(screen, route, allow_rewind=False)
                return False
            # Selected shop/rank tabs already represent the desired branch.
            if ("data-t" in d["data"] or "data-b" in d["data"]) and \
                    locator.get_attribute("aria-selected") == "true":
                continue
            if d["item"] and locator.evaluate("e => e.classList.contains('sel')"):
                continue
            if not self.tap(d, screen, "restore"):
                return False
            state = self.settle_sheet(screen)
            if state["gate"] and not self.answer_gate():
                return False
        return True

    def explore(self, screen):
        if not self.navigate(screen):
            self.notes.append(f"{self.run}/{screen}: screen unreachable through its UI.")
            self.coverage[(self.run, screen)] = "unreachable"
            return
        queue = deque()

        def discover(route):
            state = self.settle_sheet(screen)
            # Test content first. Repeated navigation controls are still tested per screen.
            ordered = sorted(state["candidates"], key=lambda d: (d["chrome"], d["close"]))
            fresh = []
            for d in ordered:
                key = self.control_key(screen, d)
                if self.permitted(d) and key not in self.queued and key not in self.seen:
                    self.queued.add(key)
                    task_route = list(route)
                    if state["surface"] == "screen" and not d["chrome"] and \
                            not ("data-t" in d["data"] or "data-b" in d["data"]):
                        selected = next((c for c in state["candidates"] if c["selected"] and
                                         ("data-t" in c["data"] or "data-b" in c["data"])), None)
                        if selected and not any("data-t" in step["data"] or "data-b" in step["data"]
                                                for step in task_route):
                            task_route.insert(0, selected)
                    fresh.append((task_route, d))
            queue.extendleft(reversed(fresh))
            return state

        discover([])
        tested, unavailable = 0, 0
        while queue:
            self.budget()
            route, d = queue.popleft()
            if self.control_key(screen, d) in self.seen:
                continue
            if not self.restore(screen, route):
                unavailable += 1
                self.notes.append(f"{self.run}/{screen}: path no longer reachable for {d['label']} "
                                  "(a prior action may have consumed it).")
                continue
            if self.inspect(screen)["gate"]:
                # Never submit Demo mode's gate, including when replaying a route.
                if any(step["id"] == "demoBtn" for step in route):
                    self.cleanup(screen)
                    continue
                self.answer_gate()
            before = self.inspect(screen)
            if not self.tap(d, screen):
                unavailable += 1
                continue
            tested += 1
            after = self.settle_sheet(screen)
            next_route = list(route)
            if d["id"] == "demoBtn":
                self.cleanup(screen)  # Cancel the gate; A must remain a real player.
            elif before["surface"] != after["surface"] and (after["sheet"] or after["walk"]):
                discover(route + [d])
            elif "data-t" in d["data"] or "data-b" in d["data"]:
                # These tabs reveal new grids/boards but keep the same main screen.
                next_route = [d]
                discover(next_route)
            elif d["item"]:
                next_route = [step for step in route if not step["item"]] + [d]
                discover(next_route)
            elif after["surface"] == before["surface"] and after["view"] == screen:
                if d["data"].get("data-act") == "scan":
                    next_route = route + [d]
                discover(next_route)
            # Own buttons are used before Escape; cleanup taps are logged and deduped.
            if not self.cleanup(screen):
                self.notes.append(f"{self.run}/{screen}: recovery reload after a stuck overlay.")
                self.page.reload(wait_until="domcontentloaded", timeout=8000)
                self.pause(600)
            self.navigate(screen)
            discover([])  # E.g. new friend cards and newly claimable quests.
        previous = self.coverage.get((self.run, screen), (0, 0))
        if not isinstance(previous, tuple):
            previous = (0, 0)
        self.coverage[(self.run, screen)] = (previous[0] + tested, previous[1] + unavailable)

    def onboard(self):
        self.inspect("intro", "startup")
        # Probe the two optional intro controls, then reload the still-new save
        # so the required five-Next/name path is exercised in full as well.
        self.selector_tap('#intro [data-act="skip"]', "intro", "explore")
        self.selector_tap('#intro [data-act="back"]', "intro", "explore")
        self.page.reload(wait_until="domcontentloaded", timeout=8000)
        self.page.wait_for_function("document.querySelector('#intro:not([hidden]) [data-act=next]')",
                                    timeout=8000)
        for _ in range(5):
            if not self.selector_tap('#intro [data-act="next"]', "intro", "explore"):
                raise RuntimeError("Could not complete the required five intro Next taps")
        self.page.locator("#introName").fill("Ace", timeout=1000)
        if not self.selector_tap('#intro button[type="submit"]', "intro", "explore"):
            raise RuntimeError("Nickname submit was unavailable")
        # Last slide: permissions (steps, safe zone, alerts). Tap each Allow, then Let's go!
        self.pause(400)
        if self.page.locator("#intro .perm-card").count():
            for i in range(self.page.locator("#intro [data-ask]").count()):
                self.selector_tap(f'#intro .perm:nth-child({i + 1}) [data-ask]', "intro", "explore")
            if not self.selector_tap('#intro [data-act="done"]', "intro", "explore"):
                raise RuntimeError("Permissions slide had no Let's go! button")
        if self.inspect("home", "nickname submitted")["intro"]:
            self.page.keyboard.press("Escape")
            self.pause(300)
            self.finding(3, "intro", "Let's go!", "Intro remained after submitting nickname Ace and Escape.")
            raise RuntimeError("Intro did not finish")

    def run_context(self, browser, run):
        self.run = run
        self.deadline = min(time.monotonic() + 164, self.overall_deadline)
        self.seen, self.queued = set(), set()
        self.checkpoints = {}
        self.errors, self.error_cursor = [], 0
        context = browser.new_context(viewport={"width": 390, "height": 844},
                                      device_scale_factor=2, is_mobile=True, has_touch=True,
                                      permissions=[], service_workers="block")
        context.add_init_script(INIT_JS)
        page = self.page = context.new_page()
        page.set_default_timeout(1400)
        page.set_default_navigation_timeout(8000)
        page.on("pageerror", lambda error: self.errors.append("pageerror: " + str(error)))
        page.on("console", lambda message: self.errors.append("console.error: " + message.text +
                " " + json.dumps(message.location, ensure_ascii=False))
                if message.type == "error" else None)
        page.on("dialog", lambda dialog: dialog.dismiss())
        context.on("page", lambda popup: popup.close() if popup != page else None)

        def guard(route):
            request = route.request
            target, base = urlsplit(request.url), urlsplit(URL)
            if request.is_navigation_request() and (target.scheme, target.netloc) != (base.scheme, base.netloc):
                self.notes.append(f"{run}: blocked off-site navigation to {request.url}")
                route.abort()
            else:
                route.continue_()

        context.route("**/*", guard)
        print(f"Run {run}: {'new real player' if run == 'A' else 'Demo mode'}", flush=True)
        try:
            page.goto(URL, wait_until="domcontentloaded", timeout=12000)
            if run == "B":
                page.evaluate("s => localStorage.setItem('stepsy', JSON.stringify(s))", DEMO)
                page.reload(wait_until="domcontentloaded", timeout=12000)
            page.wait_for_function("document.querySelector('#shopTabs [data-t]')", timeout=12000)
            self.pause(800)
            if run == "A":
                self.onboard()
            # A later quest/demo action can make a previously seen egg hatchable.
            for pass_number in (1, 2):
                for screen in SCREENS:
                    print(f"  {run}: {screen}" + (" (new controls)" if pass_number == 2 else ""), flush=True)
                    try:
                        self.explore(screen)
                    except Error as exc:
                        self.notes.append(f"{run}/{screen}: traversal failed: {str(exc)[:400]}")
                        if not self.cleanup(screen):
                            page.reload(wait_until="domcontentloaded", timeout=8000)
                            self.pause(600)
            self.cleanup("parent")
        except BudgetExpired:
            self.notes.append(f"{run}: 164-second run budget reached; pending controls are untested.")
        except (Error, RuntimeError) as exc:
            self.notes.append(f"{run}: exploration interrupted: {str(exc)[:600]}")
            # Startup errors are important even if initialization never reaches a tap.
            for error in self.errors[self.error_cursor:]:
                self.finding(1, "startup / interrupted", "page", error, error)
        finally:
            context.close()

    def report(self):
        def cell(value):
            return str(value).replace("|", "\\|").replace("\n", " ").replace("\r", " ")

        findings = sorted(self.findings, key=lambda f: (ORDER[f["kind"]], f["run"], f["screen"], f["element"]))
        counts = Counter(f["kind"] for f in findings)
        elapsed = time.monotonic() - self.started
        lines = ["# Stepsy bug finder", "",
                 f"Target: {URL} — iPhone-sized Chromium, 390 × 844 CSS px, scale factor 2.",
                 f"Elapsed: {elapsed:.1f}s. Findings: {len(findings)}; "
                 f"checks: {counts[2]}. Finding screenshots: {self.shots}/60.", "",
                 "These are possible bugs. No-change taps are listed separately as checks. "
                 "Restoration and cleanup taps appear in the action log, but do not generate no-change checks.", "",
                 "## Findings (most serious first)", "",
                 "| Type | Run | Screen | Element | What went wrong | Screenshot |",
                 "| --- | --- | --- | --- | --- | --- |"]
        for f in findings:
            if f["kind"] in (2, 7, 8):
                continue
            screenshot = f["screenshot"]
            link = f"[{screenshot}]({screenshot})" if screenshot.endswith(".png") else screenshot
            lines.append("| " + " | ".join(map(cell, [f"{f['kind']}. {NAMES[f['kind']]}",
                         f["run"], f["screen"], f["element"], f["detail"], link])) + " |")
        if not any(f["kind"] not in (2, 7, 8) for f in findings):
            lines.append("| — | — | — | — | No findings in these severity groups. | — |")
        lines += ["", "## Checks: taps with no visible change", "",
                  "Already-selected tabs, focus containers, and canvas-only reactions may be intentional.", "",
                  "| Run | Screen | Element | What happened | Screenshot |", "| --- | --- | --- | --- | --- |"]
        for f in findings:
            if f["kind"] == 2:
                name = f["screenshot"]
                link = f"[{name}]({name})" if name.endswith(".png") else name
                lines.append("| " + " | ".join(map(cell, [f["run"], f["screen"], f["element"], f["detail"], link])) + " |")
        lines += ["", "## Findings: target and text size", "",
                  "| Type | Run | Screen | Element | What went wrong | Screenshot |",
                  "| --- | --- | --- | --- | --- | --- |"]
        for f in findings:
            if f["kind"] in (7, 8):
                name = f["screenshot"]
                link = f"[{name}]({name})" if name.endswith(".png") else name
                lines.append("| " + " | ".join(map(cell, [f"{f['kind']}. {NAMES[f['kind']]}",
                             f["run"], f["screen"], f["element"], f["detail"], link])) + " |")
        lines += ["", "## Coverage", "", "| Run | Screen | Result |", "| --- | --- | --- |"]
        for run in ("A", "B"):
            for screen in SCREENS:
                result = self.coverage.get((run, screen), "not completed (see limitations)")
                if isinstance(result, tuple):
                    result = f"{result[0]} exploration taps; {result[1]} unavailable"
                lines.append(f"| {run} | {screen} | {cell(result)} |")
        lines += ["", "Screen screenshots: " + ", ".join(
            f"[{run}/{screen}](screen-{run}-{screen}.png)" for run, screen in sorted(self.screen_shots)),
            "", "## Scope and limitations", "",
            "- Two fresh contexts; run A starts with empty storage and uses five Next taps plus nickname Ace. "
            "Run B writes the supplied Demo seed and reloads.",
            "- SOS and off-site/download links are skipped. Demo mode's gate is cancelled, never submitted. "
            "Parent view's multiplication gate is read and answered automatically.",
            "- GPS and motion permissions are denied. A real player's 'Not counting' is expected. "
            "Only UI-reachable progress is used; no ready-to-hatch eggs or coins are injected. "
            "Actual pre-tap save checkpoints may be replayed to revisit consumed controls.",
            "- Controls are deduped by id, data attributes, or label, with an "
            "ordinal for identical siblings. Shop Wear/Buy/Remove variants count as distinct actions. "
            "Main-screen controls have separate scopes; shared dock/topbar/walk/sheet controls are tested "
            "once per run. Navigation, reopening, and cleanup may repeat taps to restore a path.",
            "- Intro Back/Skip are probed before reloading the still-new save for the prescribed Next/name path. "
            "Paths still unavailable after checkpoint recovery are recorded below. "
            "Screenshots show the current viewport.",
            "- Layout checks run on visible viewport content before/after taps; controls below the fold "
            "are discovered and scrolled into view. DOM snapshots do not compare rendered 3D pixels. "
            "Console errors may include CDN/network failures as well as game bugs."]
        lines += ["- " + cell(note) for note in dict.fromkeys(self.notes)]
        lines += ["", "## Action log", "", "| Run | Screen | Purpose | Element | Result |",
                  "| --- | --- | --- | --- | --- |"]
        lines += ["| " + " | ".join(map(cell, row)) + " |" for row in self.actions]
        (self.out / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("\nType                         A     B   Total")
        print("--------------------------  ----  ----  -----")
        for kind in ORDER:
            a = sum(f["run"] == "A" and f["kind"] == kind for f in findings)
            b = sum(f["run"] == "B" and f["kind"] == kind for f in findings)
            print(f"{str(kind) + '. ' + NAMES[kind]:<28}{a:>4}  {b:>4}  {a+b:>5}")
        print(f"{len(self.actions)} taps logged; {elapsed:.1f}s; report: {self.out / 'report.md'}")
        if self.notes:
            print("Coverage limitations are recorded in the report.")


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "bugfinder-out"
    finder = Finder(out.resolve())
    finder.deadline = finder.overall_deadline
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--use-gl=angle", "--enable-unsafe-swiftshader"], timeout=10000)
            try:
                for run in ("A", "B"):
                    finder.run_context(browser, run)
            finally:
                browser.close()
    except (Error, KeyboardInterrupt) as exc:
        finder.notes.append("Runner stopped: " + str(exc)[:600])
    finally:
        finder.report()


if __name__ == "__main__":
    main()
