/* Everyday Black Friday — the hallway backdrop.
 *
 * The showroom hallway sits BEHIND every page. As the shopper scrolls
 * down through the deals, the room walks forward around them.
 *
 * The feel we want: a calm, steady walk. Never a jump, never a snap,
 * never a race. Two rules make that happen:
 *
 *   1. PACE  — the walk is tied to real distance scrolled, not to the
 *      length of the page. One scene per PACE pixels, always. A short
 *      page shows a few steps of hallway; a long page shows more. So
 *      scrolling always feels the same speed, on every page.
 *
 *   2. SEAMLESS HANDOFF — each scene drifts forward as you approach it,
 *      and the next scene drifts in behind it, arriving at exactly the
 *      size and strength the current one started at. At the moment they
 *      swap, the two pictures are identical, so there is nothing to see.
 *      No pop, no snap. The crossfade itself is the in-between frame,
 *      which is why no extra pictures are needed.
 *
 * No controls, no captions, no counter. It is scenery, not a page.
 * The readability scrim lives in css/stage.css and sits on top of this,
 * underneath the content, so text stays easy to read.
 */
(function () {
  'use strict';

  var BASE = '/showroom/images/';

  /* ── The dials that decide how it feels ── */
  var PACE = 620;      /* pixels of scroll per scene — bigger = slower walk */
  var DRIFT = 0.055;   /* how much a scene grows as you walk into it */
  var EASE = 300;      /* smoothing, ms — bigger = glidier, less twitchy */
  var TOP_SPEED = 1.0; /* scenes per second it may ever move — the calm cap */

  /* The route, in order — the same walk MJ laid out. */
  var SCENES = [
    '0', 'added-0', 'added-1', '1',
    'extension-01', 'extension-02', 'extension-03', 'extension-04',
    'variety-0', 'category-1', 'extension-06', 'category-3',
    'extension-08', 'variety-1', 'category-2', 'extension-10',
    'extension-11', 'added-2', 'variety-2', 'category-4',
    'extension-13', 'extension-14', 'added-3', '2',
    'added-4', 'added-5', '3', 'added-6',
    'added-7', 'added-12', 'added-13', 'extension-15',
    'extension-16', 'extension-17', 'extension-18', 'added-14',
    'extension-19', 'extension-20', 'extension-21', 'extension-22',
    'extension-23', 'added-15', 'extension-24', 'extension-25',
    'extension-26', 'extension-27', '4', 'extension-28',
    'extension-29', 'extension-30', 'extension-31', 'extension-32',
    'added-8', 'added-9', '5', 'added-10',
    'category-5', 'extension-34', 'extension-35', 'added-11'
  ];

  var last = SCENES.length - 1;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  var layer, front, back;
  var position = 0, current = -1, frame = 0, lastTime = 0;
  var cache = {};

  function src(i) { return BASE + SCENES[Math.max(0, Math.min(last, i))] + '.jpg'; }

  /* Pull nearby scenes down quietly so the walk never stutters —
     ahead for scrolling down, behind for scrolling back up. */
  function warm(i) {
    for (var n = i - 1; n <= i + 3; n++) {
      if (n >= 0 && n <= last && !cache[n]) {
        cache[n] = new Image();
        cache[n].src = src(n);
      }
    }
  }

  function build() {
    layer = document.createElement('div');
    layer.className = 'hallway';
    layer.setAttribute('aria-hidden', 'true');

    front = document.createElement('img');
    back = document.createElement('img');
    front.alt = '';
    back.alt = '';
    back.style.opacity = '0';
    front.src = src(0);
    back.src = src(1);

    layer.appendChild(front);
    layer.appendChild(back);
    document.body.insertBefore(layer, document.body.firstChild);
    warm(0);
  }

  /* How far along the hallway this scroll position sits. */
  function target() {
    var doc = document.documentElement;
    var y = window.pageYOffset || doc.scrollTop || 0;
    return Math.max(0, Math.min(last, y / PACE));
  }

  /* Soft start, soft finish — no hard edges anywhere in the move. */
  function smooth(t) { return t * t * (3 - 2 * t); }

  function paint() {
    var index = Math.min(last, Math.floor(position));
    var frac = position - index;

    if (index !== current) {
      front.src = src(index);
      back.src = src(index + 1);
      current = index;
      warm(index);
    }

    /* The next scene arrives across the WHOLE step, so there is never a
       moment where nothing is moving and then something suddenly does. */
    var blend = smooth(Math.max(0, Math.min(1, frac)));
    back.style.opacity = (back.complete && back.naturalWidth) ? blend : 0;

    /* The scene you are in drifts forward from 1 to 1+DRIFT.
       The next one drifts from 1-DRIFT up to exactly 1 — which is where
       the next scene begins. They meet perfectly, so the swap is invisible. */
    front.style.transform = 'scale(' + (1 + frac * DRIFT) + ')';
    back.style.transform = 'scale(' + (1 - DRIFT + frac * DRIFT) + ')';
  }

  function render(time) {
    frame = 0;
    var elapsed = lastTime ? Math.min(64, time - lastTime) : 16;
    lastTime = time;

    var want = target();
    var gap = want - position;

    /* Glide toward the scroll position, and never faster than a walk. */
    var move = gap * (1 - Math.exp(-elapsed / EASE));
    var cap = TOP_SPEED * (elapsed / 1000);
    if (move > cap) move = cap;
    if (move < -cap) move = -cap;

    position += move;
    if (Math.abs(want - position) < 0.0004) position = want;

    paint();

    if (Math.abs(target() - position) > 0.0004) {
      frame = requestAnimationFrame(render);
    } else {
      lastTime = 0;
    }
  }

  function queue() { if (!frame) frame = requestAnimationFrame(render); }

  function start() {
    if (!document.body || document.querySelector('.hallway')) return;
    build();

    if (reduced.matches) { position = 0; paint(); return; }

    /* Begin already standing where the page is, so nothing lurches on load. */
    position = target();
    paint();

    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue, { passive: true });
    back.addEventListener('load', queue);
    front.addEventListener('load', queue);
    queue();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
