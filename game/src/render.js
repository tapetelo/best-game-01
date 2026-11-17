// All drawing: one canvas, one painter per screen. The village green of
// Ashwick is a real place — houses with lit windows, trees, hedges, stone
// paths, six lamp posts and the Beacon at its heart — and every screen is
// dense: the play HUD carries the night, the score, the flame, the incoming
// Murk, the relics held, the chain and the four abilities at once, so the
// frame reads at a glance even shrunk small.
import {
  BEACON, BOSS, DIFFICULTIES, ENEMY_TYPES, FIELD, FONT, HEDGES, HOUSES,
  LAMPS, LAMP_LIGHT_RADIUS, LAMP_RADIUS, NIGHTS, NIGHT_INTRO, NIGHT_NAMES,
  PALETTE, PLAYER, SHOP, TREES,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_DRAFT = 'draft';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** Click targets, in logical coordinates. Shared with main.js. */
export const TITLE_CARDS = [
  { x: 170, y: 470, w: 290, h: 180, key: 'gentle' },
  { x: 495, y: 470, w: 290, h: 180, key: 'standard' },
  { x: 820, y: 470, w: 290, h: 180, key: 'hard' },
];
export const DRAFT_CARDS = [
  { x: 190, y: 190, w: 270, h: 300 },
  { x: 505, y: 190, w: 270, h: 300 },
  { x: 820, y: 190, w: 270, h: 300 },
];
export const SHOP_RECTS = [
  { x: 340, y: 560, w: 180, h: 64 },
  { x: 550, y: 560, w: 180, h: 64 },
  { x: 760, y: 560, w: 180, h: 64 },
];

export function gradeFor(score) {
  if (score >= 40000) return 'S';
  if (score >= 25000) return 'A';
  if (score >= 12000) return 'B';
  return 'C';
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = FIELD.width * dpr;
    canvas.height = FIELD.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fit();
  window.addEventListener('resize', fit);

  function panel(x, y, w, h, edge = PALETTE.panelEdge) {
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function text(str, x, y, size, color, align = 'center', weight = '700') {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function bar(x, y, w, h, frac, color, bg = '#222842') {
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    const fw = Math.max(0, Math.min(1, frac)) * w;
    if (fw > 2) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, fw, h, 6);
      ctx.fill();
    }
  }

  function pill(str, x, y, bg, fg, size = 15) {
    ctx.font = `700 ${size}px ${FONT}`;
    const w = ctx.measureText(str).width + 22;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 13, w, 26, 13);
    ctx.fill();
    text(str, x, y + 1, size, fg);
    return w;
  }

  // ---- the village -------------------------------------------------------
  function drawGround(t) {
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = 'rgba(200, 210, 255, 0.45)';
    for (let i = 0; i < 42; i++) {
      const x = (i * 173) % FIELD.width;
      const y = (i * 97) % 260;
      ctx.globalAlpha = (0.3 + 0.5 * Math.abs(Math.sin(t * 0.7 + i))) * 0.7;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
    // Grass.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 76, FIELD.width, FIELD.height - 76);
    // Stone paths from the Beacon to the lamps and the edges.
    ctx.strokeStyle = PALETTE.groundPath;
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(BEACON.x, BEACON.y);
    ctx.lineTo(BEACON.x, 84);
    ctx.moveTo(BEACON.x, BEACON.y);
    ctx.lineTo(BEACON.x, 700);
    ctx.moveTo(BEACON.x, BEACON.y);
    ctx.lineTo(30, BEACON.y);
    ctx.moveTo(BEACON.x, BEACON.y);
    ctx.lineTo(1250, BEACON.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 200, 87, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(BEACON.x, BEACON.y);
    ctx.lineTo(BEACON.x, 84);
    ctx.moveTo(BEACON.x, BEACON.y);
    ctx.lineTo(BEACON.x, 700);
    ctx.stroke();
    // Hedges.
    for (const h of HEDGES) {
      ctx.fillStyle = '#1d3a24';
      ctx.beginPath();
      ctx.roundRect(h.x, h.y, h.w, h.h, 9);
      ctx.fill();
      ctx.fillStyle = '#2c5232';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(h.x + 10 + i * 18, h.y + 9, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Trees.
    for (const tr of TREES) {
      ctx.fillStyle = '#2a2118';
      ctx.fillRect(tr.x - 3, tr.y, 6, 14);
      ctx.fillStyle = '#1e4a2c';
      ctx.beginPath();
      ctx.arc(tr.x, tr.y - 6, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c6338';
      ctx.beginPath();
      ctx.arc(tr.x - 8, tr.y - 12, 12, 0, Math.PI * 2);
      ctx.arc(tr.x + 9, tr.y - 11, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    // Houses with lit windows.
    for (const h of HOUSES) {
      ctx.fillStyle = '#232a42';
      ctx.fillRect(h.x, h.y, h.w, h.h);
      ctx.fillStyle = h.roof;
      ctx.beginPath();
      ctx.moveTo(h.x - 6, h.y);
      ctx.lineTo(h.x + h.w / 2, h.y - 26);
      ctx.lineTo(h.x + h.w + 6, h.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 200, 110, 0.9)';
      ctx.fillRect(h.x + 10, h.y + 14, 12, 12);
      ctx.fillRect(h.x + h.w - 24, h.y + 14, 12, 12);
      ctx.fillStyle = 'rgba(255, 200, 110, 0.35)';
      ctx.beginPath();
      ctx.arc(h.x + 16, h.y + 20, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    // The Beacon plaza: a stone ring at the centre.
    ctx.strokeStyle = '#3a4668';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(BEACON.x, BEACON.y, 62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 200, 87, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(BEACON.x, BEACON.y, 74, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawBeacon(t, flame, flameMax) {
    const flick = 1 + Math.sin(t * 9) * 0.09 + Math.sin(t * 23) * 0.04;
    const g = ctx.createRadialGradient(BEACON.x, BEACON.y, 10, BEACON.x, BEACON.y, 240 * flick);
    g.addColorStop(0, 'rgba(255, 190, 90, 0.5)');
    g.addColorStop(0.45, 'rgba(255, 150, 60, 0.16)');
    g.addColorStop(1, 'rgba(255, 150, 60, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(BEACON.x - 250, BEACON.y - 250, 500, 500);
    // Stone post.
    ctx.fillStyle = '#2c3550';
    ctx.beginPath();
    ctx.moveTo(BEACON.x - 24, BEACON.y + 8);
    ctx.lineTo(BEACON.x + 24, BEACON.y + 8);
    ctx.lineTo(BEACON.x + 16, BEACON.y + 34);
    ctx.lineTo(BEACON.x - 16, BEACON.y + 34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1c2338';
    ctx.fillRect(BEACON.x - 30, BEACON.y - 16, 60, 26);
    // The flame itself.
    const fh = 26 * flick * (0.5 + 0.5 * (flame / flameMax));
    ctx.fillStyle = PALETTE.beaconLit;
    ctx.beginPath();
    ctx.ellipse(BEACON.x, BEACON.y - 22, 15 * flick, fh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.goldHot;
    ctx.beginPath();
    ctx.ellipse(BEACON.x, BEACON.y - 18, 7 * flick, fh * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    // Flame label.
    text('THE BEACON', BEACON.x, BEACON.y + 58, 13, PALETTE.gold);
  }

  function drawLamp(l, t) {
    if (l.lit) {
      const g = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, LAMP_LIGHT_RADIUS);
      g.addColorStop(0, 'rgba(255, 190, 90, 0.42)');
      g.addColorStop(1, 'rgba(255, 150, 60, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(l.x - LAMP_LIGHT_RADIUS, l.y - LAMP_LIGHT_RADIUS, LAMP_LIGHT_RADIUS * 2, LAMP_LIGHT_RADIUS * 2);
    }
    ctx.fillStyle = '#2c3550';
    ctx.fillRect(l.x - 3, l.y - 6, 6, 26);
    ctx.fillStyle = '#1c2338';
    ctx.beginPath();
    ctx.roundRect(l.x - 11, l.y - 20, 22, 16, 4);
    ctx.fill();
    if (l.lit) {
      const flick = 1 + Math.sin(t * 10 + l.x) * 0.1;
      ctx.fillStyle = PALETTE.beaconLit;
      ctx.beginPath();
      ctx.ellipse(l.x, l.y - 12, 6 * flick, 8 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#3a4668';
      ctx.beginPath();
      ctx.ellipse(l.x, l.y - 12, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      text('UNLIT', l.x, l.y - 34, 11, PALETTE.muted);
    }
  }

  function drawGroundEmber(e, t) {
    const bob = Math.sin(t * 3 + e.phase) * 3;
    const g = ctx.createRadialGradient(e.x, e.y + bob, 1, e.x, e.y + bob, 20);
    g.addColorStop(0, 'rgba(255, 154, 60, 0.9)');
    g.addColorStop(1, 'rgba(255, 154, 60, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(e.x, e.y + bob, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.ember;
    ctx.beginPath();
    ctx.arc(e.x, e.y + bob, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd9a0';
    ctx.beginPath();
    ctx.arc(e.x - 2, e.y + bob - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEnemy(e, t) {
    const def = ENEMY_TYPES[e.type];
    const frozen = e.frozen > 0;
    const bob = Math.sin(t * 4 + e.wobble) * 3;
    const x = e.x;
    const y = e.y + bob;
    ctx.globalAlpha = frozen ? 0.6 : 0.95;
    const g = ctx.createRadialGradient(x, y, 2, x, y, def.radius + 12);
    g.addColorStop(0, frozen ? 'rgba(160, 190, 255, 0.8)' : def.color + 'cc');
    g.addColorStop(1, def.color + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, def.radius + 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = frozen ? '#aebfff' : def.color;
    if (e.type === 'flicker') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-def.radius * 0.8, -def.radius * 0.8, def.radius * 1.6, def.radius * 1.6);
      ctx.restore();
    } else if (e.type === 'douser') {
      ctx.beginPath();
      ctx.moveTo(x, y - def.radius - 6);
      ctx.quadraticCurveTo(x + def.radius, y + 4, x, y + def.radius);
      ctx.quadraticCurveTo(x - def.radius, y + 4, x, y - def.radius - 6);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, def.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    // Gnawer teeth, Hollow shell ring, Wispmother crown.
    if (e.type === 'gnawer') {
      ctx.fillStyle = '#fff';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 7 - 3, y + 4);
        ctx.lineTo(x + i * 7 + 3, y + 4);
        ctx.lineTo(x + i * 7, y + 11);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (e.type === 'hollow' && e.shield) {
      ctx.strokeStyle = '#e8eefc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, def.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.type === 'wispmother') {
      ctx.fillStyle = def.dark;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 12 - 5, y - def.radius + 4);
        ctx.lineTo(x + i * 12, y - def.radius - 12);
        ctx.lineTo(x + i * 12 + 5, y - def.radius + 4);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Eyes.
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 5, y - 3, 2.6, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 3, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10131f';
    ctx.beginPath();
    ctx.arc(x - 5, y - 3, 1.2, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 3, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // HP pips for the tough ones.
    if (e.maxHp > 1) {
      for (let i = 0; i < e.maxHp; i++) {
        ctx.fillStyle = i < e.hp ? '#ff5d5d' : '#333a52';
        ctx.beginPath();
        ctx.arc(x - (e.maxHp - 1) * 5 + i * 10, y - def.radius - 10, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (frozen) text('❄', x, y - def.radius - 22, 13, '#cfe0ff');
  }

  function drawBoss(b, t) {
    const frozen = b.frozen > 0;
    const wob = Math.sin(t * 2) * 4;
    const r = BOSS.radius;
    ctx.globalAlpha = frozen ? 0.6 : 0.96;
    const g = ctx.createRadialGradient(b.x, b.y, 6, b.x, b.y, r + 46);
    g.addColorStop(0, frozen ? 'rgba(160, 190, 255, 0.7)' : 'rgba(90, 20, 90, 0.85)');
    g.addColorStop(1, 'rgba(42, 10, 61, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r + 46, 0, Math.PI * 2);
    ctx.fill();
    // Jagged dark mass.
    ctx.fillStyle = frozen ? '#5a6f9e' : BOSS.color;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rr = r + Math.sin(a * 3 + t * 2) * 7 + wob * 0.3;
      const px = b.x + Math.cos(a) * rr;
      const py = b.y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    // Crown of spikes.
    ctx.fillStyle = BOSS.dark;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(b.x + i * 14 - 6, b.y - r + 8);
      ctx.lineTo(b.x + i * 14, b.y - r - 16);
      ctx.lineTo(b.x + i * 14 + 6, b.y - r + 8);
      ctx.closePath();
      ctx.fill();
    }
    // Two burning eyes.
    ctx.fillStyle = BOSS.eye;
    ctx.beginPath();
    ctx.arc(b.x - 16, b.y - 6, 6, 0, Math.PI * 2);
    ctx.arc(b.x + 16, b.y - 6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(b.x - 16, b.y - 6, 2.2, 0, Math.PI * 2);
    ctx.arc(b.x + 16, b.y - 6, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (frozen) text('❄', b.x, b.y - r - 28, 15, '#cfe0ff');
  }

  function drawPlayer(p, t, s) {
    const flick = 1 + Math.sin(t * 11) * 0.06 + Math.sin(t * 23) * 0.03;
    const r = PLAYER.lightRadius * flick;
    const g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, r);
    g.addColorStop(0, 'rgba(255, 210, 110, 0.5)');
    g.addColorStop(0.45, 'rgba(255, 170, 70, 0.22)');
    g.addColorStop(1, 'rgba(255, 170, 70, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    if (s.flareFlash > 0) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(s.flareAngle);
      const fg = ctx.createLinearGradient(0, 0, 330, 0);
      fg.addColorStop(0, 'rgba(255, 240, 190, 0.8)');
      fg.addColorStop(1, 'rgba(255, 240, 190, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 330, -0.52, 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (s.dashTimer > 0) {
      ctx.strokeStyle = 'rgba(255, 233, 168, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 24, 0, Math.PI * 2);
      ctx.stroke();
    }
    const blink = s.invulnerable > 0 && Math.floor(t * 10) % 2 === 0;
    ctx.globalAlpha = blink ? 0.4 : 1;
    ctx.fillStyle = '#3d2b1f';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 4, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b4a2f';
    ctx.beginPath();
    ctx.moveTo(p.x - 13, p.y - 6);
    ctx.lineTo(p.x, p.y - 26);
    ctx.lineTo(p.x + 13, p.y - 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2b1e14';
    ctx.beginPath();
    ctx.arc(p.x, p.y + 10, 11, 0, Math.PI);
    ctx.fill();
    ctx.fillRect(p.x - 11, p.y + 8, 22, 12);
    ctx.fillStyle = '#1c2338';
    ctx.fillRect(p.x + 14, p.y - 22, 3, 10);
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.roundRect(p.x + 10, p.y - 34, 12, 14, 3);
    ctx.fill();
    ctx.fillStyle = PALETTE.goldHot;
    ctx.beginPath();
    ctx.arc(p.x + 16, p.y - 27, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ---- HUD ---------------------------------------------------------------
  function drawHud(s, muted) {
    // Top bar.
    panel(16, 10, 1248, 54);
    // Left: Beacon flame.
    text('🔥 BEACON', 34, 26, 13, PALETTE.gold, 'left');
    bar(34, 34, 150, 14, s.flame / s.flameMax, s.flame < 25 ? PALETTE.danger : PALETTE.gold);
    text(`${Math.ceil(s.flame)} / ${s.flameMax}`, 190, 41, 13, PALETTE.text, 'left');
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < s.lives ? '#ff5d5d' : '#333a52';
      ctx.beginPath();
      ctx.arc(262 + i * 20, 40, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '700 9px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('♥', 262 + i * 20, 43);
    }
    // Centre: night + countdown.
    text(`NIGHT ${s.night} / ${NIGHTS}`, 640, 28, 24, PALETTE.gold);
    const left = s.night >= NIGHTS && s.boss ? 'SLAY THE LONG DARK' : `DAWN IN ${Math.max(0, Math.ceil(40 - s.nightTime))}s · ${NIGHT_NAMES[s.night - 1]}`;
    text(left, 640, 52, 13, PALETTE.muted);
    // Right: score, best, embers.
    text('SCORE', 1064, 24, 12, PALETTE.muted, 'right');
    text(String(s.score).replace(/\B(?=(\d{3})+(?!\d))/g, ','), 1124, 40, 26, PALETTE.text, 'right');
    text(`◆ ${s.embers} EMBERS`, 1248, 28, 15, PALETTE.ember, 'right');
    text(`BEST ${s.best || 0}`, 1248, 50, 12, PALETTE.muted, 'right');
    // Win / lose pills, second row.
    pill(`WIN  survive to the dawn of night 7  ·  ${s.lampsLit}/6 lamps`, 470, 82, 'rgba(20, 90, 50, 0.9)', '#8dffb0', 13);
    pill(`LOSE  flame hits 0 or the warden falls`, 830, 82, 'rgba(110, 20, 30, 0.9)', '#ff9a9a', 13);
    // Boss bar.
    if (s.boss) {
      text(BOSS.name, 640, 108, 20, '#ff8fa3');
      bar(440, 120, 400, 12, s.boss.hp / s.boss.maxHp, '#ff4d6d', '#3a0a1e');
      text(`${Math.max(0, Math.ceil(s.boss.hp))} / ${s.boss.maxHp}`, 848, 126, 12, PALETTE.text, 'left');
    }
    // Left panel: INCOMING.
    panel(16, 140, 178, 280);
    text('INCOMING', 105, 158, 14, PALETTE.gold);
    const leftCount = Object.values(s.incoming).reduce((a, b) => a + b, 0);
    text(`${leftCount} LEFT`, 105, 178, 12, PALETTE.muted);
    let y = 200;
    for (const [type, n] of Object.entries(s.incoming)) {
      if (type === 'boss') {
        text('👑 THE LONG DARK', 28, y, 13, '#ff8fa3', 'left');
        text('BOSS', 182, y, 13, '#ff8fa3', 'right');
      } else {
        const def = ENEMY_TYPES[type];
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(34, y, 6, 0, Math.PI * 2);
        ctx.fill();
        text(def.name, 46, y, 13, PALETTE.text, 'left');
        text(`×${n}`, 182, y, 13, PALETTE.gold, 'right');
      }
      y += 22;
    }
    if (s.night < NIGHTS) {
      text(`NEXT: Night ${s.night + 1}`, 105, y + 8, 12, PALETTE.muted);
      text(NIGHT_NAMES[s.night], 105, y + 28, 12, PALETTE.gold);
      if (NIGHT_INTRO[s.night]) text(`NEW: ${NIGHT_INTRO[s.night]}`, 105, y + 48, 12, PALETTE.ember);
    } else {
      text('NEXT: dawn, if the boss falls', 105, y + 8, 12, PALETTE.muted);
    }
    // Right panel: RELICS HELD.
    panel(1086, 140, 178, 280);
    text('RELICS HELD', 1175, 158, 14, PALETTE.gold);
    text(`${s.relicsHeld.length} / 8`, 1175, 178, 12, PALETTE.muted);
    const RELIC_NAMES = {
      emberheart: 'Emberheart', fleetstep: 'Fleetstep', brightwick: 'Brightwick',
      dawnbell: 'Dawn Bell', ironwick: 'Iron Wick', cinderpouch: 'Cinder Pouch',
      thornbrand: 'Thornbrand', hearthstone: 'Hearthstone',
    };
    let ry = 200;
    const shownRelics = s.relicsHeld.slice(0, 7);
    for (const key of shownRelics) {
      text('✦ ' + (RELIC_NAMES[key] || key), 1100, ry, 13, PALETTE.text, 'left');
      ry += 22;
    }
    if (s.relicsHeld.length > 7) {
      text(`+${s.relicsHeld.length - 7} more`, 1100, ry, 13, PALETTE.muted, 'left');
      ry += 22;
    }
    for (const key of s.pactsHeld.slice(0, 2)) {
      text('◆ ' + key, 1100, ry, 13, '#ff9a9a', 'left');
      ry += 22;
    }
    if (s.relicsHeld.length === 0 && s.pactsHeld.length === 0) {
      text('None yet —', 1175, 205, 12, PALETTE.muted);
      text('pick boons at dawn', 1175, 223, 12, PALETTE.muted);
    }
    // Bottom bar.
    panel(16, 648, 1248, 60);
    // Bottom-left: flame + lives recap.
    text('FLAME', 34, 664, 12, PALETTE.muted, 'left');
    bar(34, 672, 130, 12, s.flame / s.flameMax, s.flame < 25 ? PALETTE.danger : PALETTE.gold);
    text(`${Math.ceil(s.flame)}/${s.flameMax}`, 170, 678, 12, PALETTE.text, 'left');
    text('WASD move · MOUSE aim', 34, 700, 11, PALETTE.muted, 'left');
    // Bottom-centre: abilities.
    const abilities = [
      { key: 'LMB', name: 'FLARE', cd: s.flareCooldown, max: 1.1, cost: '' },
      { key: 'SPACE', name: 'DASH', cd: s.dashCooldown, max: 2.2, cost: '' },
      { key: 'E', name: `LAMP −${8 + (s.pactsHeld.includes('gloompact') ? 4 : 0)}◆`, cd: s.lampCooldown, max: 1.0, cost: '' },
      { key: 'Q', name: 'PULSE −12◆', cd: s.pulseCooldown, max: 6, cost: '' },
    ];
    let ax = 470;
    for (const a of abilities) {
      const ready = a.cd <= 0;
      ctx.fillStyle = ready ? 'rgba(255, 200, 87, 0.16)' : 'rgba(40, 46, 70, 0.9)';
      ctx.beginPath();
      ctx.roundRect(ax, 656, 92, 44, 8);
      ctx.fill();
      ctx.strokeStyle = ready ? PALETTE.gold : '#3a4668';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      text(a.key, ax + 46, 668, 11, PALETTE.muted);
      text(a.name, ax + 46, 688, 13, ready ? PALETTE.text : PALETTE.muted);
      if (!ready) {
        ctx.fillStyle = 'rgba(8, 10, 24, 0.55)';
        ctx.beginPath();
        ctx.roundRect(ax, 656, 92 * Math.min(1, a.cd / a.max), 44, 8);
        ctx.fill();
        text(`${a.cd.toFixed(1)}s`, ax + 46, 688, 13, PALETTE.goldHot);
      }
      ax += 100;
    }
    // Bottom-right: chain + grade.
    text('CHAIN', 1070, 664, 12, PALETTE.muted, 'right');
    text(`×${s.chainMult}`, 1120, 684, 26, PALETTE.gold, 'right');
    text(`${s.chain} banished in a row`, 1248, 664, 12, PALETTE.muted, 'right');
    text(`GRADE ${gradeFor(s.score)}`, 1248, 688, 13, PALETTE.text, 'right');
    if (muted) text('MUTED — press M', 640, 712, 12, PALETTE.muted);
  }

  function drawWorld(s, t) {
    drawGround(t);
    for (const l of s.lamps) drawLamp(l, t);
    drawBeacon(t, s.flame, s.flameMax);
    for (const e of s.groundEmbers) drawGroundEmber(e, t);
    for (const e of s.enemies) drawEnemy(e, t);
    if (s.boss) drawBoss(s.boss, t);
    for (const pt of s.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const f of s.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.max);
      text(f.text, f.x, f.y, 15, f.color);
    }
    ctx.globalAlpha = 1;
    drawPlayer(s.player, t, s);
    drawHud(s, false);
  }

  function drawSceneBackdrop(s, t) {
    // A staged village behind the menu screens: ground, beacon, lamps,
    // houses and a few Murk at the edges — a real lit place, not a void.
    drawGround(t);
    for (const l of s.lamps) drawLamp(l, t);
    drawBeacon(t, s.flame, s.flameMax);
    for (const e of s.enemies) drawEnemy(e, t);
    drawPlayer(s.player, t, s);
    ctx.fillStyle = 'rgba(5, 7, 15, 0.5)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  return {
    fit,
    drawTitle(s, best) {
      drawSceneBackdrop(s, 0.6);
      text('EMBERWARDEN', 640, 92, 72, PALETTE.gold);
      text("Ashwick's last warden: keep the Beacon burning through seven nights of the Murk.", 640, 140, 19, PALETTE.text);
      text('LIGHT IS YOUR ONLY WEAPON  ·  EMBERS ARE YOUR BUDGET  ·  EVERY LAMP YOU LIGHT IS A CHOICE', 640, 166, 13, PALETTE.muted);
      // Left: HOW TO PLAY.
      panel(16, 190, 300, 250);
      text('HOW TO PLAY', 166, 210, 15, PALETTE.gold);
      const lines = [
        ['GOAL', 'Flare the Murk, light the lamps:'],
        ['', 'light burns the Murk.'],
        ['WIN', 'Keep the Beacon lit to the'],
        ['', 'dawn of night 7.'],
        ['LOSE', 'The Beacon flame hits 0,'],
        ['', 'or the warden falls 3 times.'],
        ['WASD', 'walk    MOUSE aim'],
        ['LMB', 'flare    SPACE dash'],
        ['E', 'light lamp    Q pulse'],
        ['ESC', 'pause    M sound'],
        ['', 'Each dawn: pick 1 of 3 boons,'],
        ['', 'spend embers in the shop.'],
      ];
      let y = 232;
      for (const [tag, line] of lines) {
        if (tag) {
          ctx.fillStyle = tag === 'WIN' ? 'rgba(20, 90, 50, 0.9)' : tag === 'LOSE' ? 'rgba(110, 20, 30, 0.9)' : 'rgba(255, 200, 87, 0.2)';
          ctx.beginPath();
          ctx.roundRect(28, y - 9, 52, 18, 5);
          ctx.fill();
          text(tag, 54, y, 11, tag === 'WIN' ? '#8dffb0' : tag === 'LOSE' ? '#ff9a9a' : PALETTE.gold);
        }
        text(line, tag ? 90 : 166, y, 13, PALETTE.text, 'left');
        y += 18;
      }
      // Right: THE MURK bestiary.
      panel(964, 190, 300, 250);
      text('THE MURK', 1114, 210, 15, PALETTE.gold);
      text('threat → answer', 1114, 230, 12, PALETTE.muted);
      const bestiary = [
        ['Gloomite', 'Swarms in packs → flare bunches', 'NIGHT 1'],
        ['Gnawer', 'Chews the Beacon → stop it early', 'NIGHT 1'],
        ['Douser', 'Douses lit lamps → flare it first', 'NIGHT 2'],
        ['Flicker', 'Blinks sideways → lead your flare', 'NIGHT 3'],
        ['Hollow', 'Shell eats a flare → hit it twice', 'NIGHT 4'],
        ['Wispmother', 'Bursts into Gloomites → keep clear', 'NIGHT 5'],
        ['THE LONG DARK', 'Night 7 boss → burn it down', 'NIGHT 7'],
      ];
      let by = 252;
      for (const [name, blurb, night] of bestiary) {
        const def = ENEMY_TYPES[name.toLowerCase()];
        if (def) {
          ctx.fillStyle = def.color;
          ctx.beginPath();
          ctx.arc(980, by, 6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#ff4d6d';
          ctx.beginPath();
          ctx.arc(980, by, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        text(name, 994, by, 13, name === 'THE LONG DARK' ? '#ff8fa3' : PALETTE.text, 'left');
        text(night, 1252, by, 11, PALETTE.muted, 'right');
        text(blurb, 994, by + 14, 11, PALETTE.muted, 'left');
        by += 27;
      }
      // Bottom: three difficulty cards.
      text('CHOOSE YOUR WATCH', 640, 452, 22, PALETTE.gold);
      DIFFICULTIES.forEach((d, i) => {
        const r = TITLE_CARDS[i];
        const selected = d.key === s.difficulty.key;
        ctx.fillStyle = selected ? 'rgba(255, 200, 87, 0.14)' : PALETTE.panel;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 12);
        ctx.fill();
        ctx.strokeStyle = selected ? PALETTE.gold : PALETTE.panelEdge;
        ctx.lineWidth = selected ? 3 : 1.5;
        ctx.stroke();
        text(`${d.num}`, r.x + 24, r.y + 24, 15, PALETTE.muted, 'left');
        text(d.name, r.x + r.w / 2, r.y + 40, 26, PALETTE.gold);
        text(d.tag, r.x + r.w / 2, r.y + 68, 13, d.key === 'hard' ? PALETTE.danger : d.key === 'gentle' ? PALETTE.green : PALETTE.text);
        text(d.desc, r.x + r.w / 2, r.y + 92, 13, PALETTE.text);
        d.lines.forEach((line, j) => text(line, r.x + r.w / 2, r.y + 114 + j * 18, 12, PALETTE.muted));
        text(d.best > 0 ? `BEST ◆ ${d.best.toLocaleString()}` : 'NO RUN YET', r.x + r.w / 2, r.y + 166, 13, PALETTE.gold);
      });
      text('CLICK A WATCH  ·  1 2 3  ·  ENTER', 640, 676, 15, PALETTE.goldHot);
      if (best > 0) text(`Best score: ${best.toLocaleString()}`, 640, 700, 13, PALETTE.muted);
    },
    drawPlay(s, t, muted) {
      drawWorld(s, t);
      if (muted) text('MUTED — press M', 640, 712, 12, PALETTE.muted);
    },
    drawDraft(s) {
      drawSceneBackdrop(s, 0.6);
      text(`NIGHT ${s.draft.nightDone} SURVIVED`, 640, 84, 44, PALETTE.gold);
      text(`flame ${Math.ceil(s.flame)}/${s.flameMax}  ·  score ${s.score.toLocaleString()}  ·  best chain ${s.bestChain}  ·  ◆ ${s.embers} embers`, 640, 126, 15, PALETTE.text);
      text('Choose a boon. Two of one family wake its synergy; a pact gives much and takes something.', 640, 156, 14, PALETTE.muted);
      s.draft.cards.forEach((card, i) => {
        const r = DRAFT_CARDS[i];
        const isPact = card.kind === 'pact';
        ctx.fillStyle = isPact ? 'rgba(60, 16, 30, 0.9)' : PALETTE.panel;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 14);
        ctx.fill();
        ctx.strokeStyle = isPact ? '#ff5d7a' : PALETTE.gold;
        ctx.lineWidth = isPact ? 2 : 2.5;
        ctx.stroke();
        text(card.family, r.x + r.w / 2, r.y + 24, 12, isPact ? '#ff8fa3' : PALETTE.gold);
        // Icon: a simple relic glyph.
        ctx.fillStyle = isPact ? '#ff5d7a' : PALETTE.gold;
        ctx.beginPath();
        ctx.arc(r.x + r.w / 2, r.y + 92, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10131f';
        ctx.font = `700 30px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isPact ? '◆' : '✦', r.x + r.w / 2, r.y + 93);
        text(card.name, r.x + r.w / 2, r.y + 158, 26, PALETTE.text);
        text(card.effect, r.x + r.w / 2, r.y + 196, 15, isPact ? '#8dffb0' : PALETTE.goldHot);
        if (isPact) {
          ctx.fillStyle = 'rgba(110, 20, 30, 0.9)';
          ctx.beginPath();
          ctx.roundRect(r.x + 24, r.y + 216, r.w - 48, 40, 8);
          ctx.fill();
          text('THE PRICE', r.x + r.w / 2, r.y + 228, 11, '#ff9a9a');
          text(card.price, r.x + r.w / 2, r.y + 246, 13, '#ff9a9a');
        } else {
          text(card.desc, r.x + r.w / 2, r.y + 226, 13, PALETTE.muted);
        }
        ctx.fillStyle = 'rgba(255, 200, 87, 0.2)';
        ctx.beginPath();
        ctx.roundRect(r.x + r.w / 2 - 14, r.y + r.h - 34, 28, 24, 6);
        ctx.fill();
        text(String(i + 1), r.x + r.w / 2, r.y + r.h - 22, 14, PALETTE.gold);
      });
      const next = s.night + 1;
      text(`Next · Night ${next}: ${NIGHT_NAMES[next - 1]}${NIGHT_INTRO[next - 1] ? `  —  NEW: ${NIGHT_INTRO[next - 1]}` : ''}`, 640, 528, 16, PALETTE.text);
      // Shop row.
      SHOP.forEach((item, i) => {
        const r = SHOP_RECTS[i];
        const afford = s.embers >= item.cost;
        ctx.fillStyle = afford ? 'rgba(255, 200, 87, 0.14)' : PALETTE.panel;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 10);
        ctx.fill();
        ctx.strokeStyle = afford ? PALETTE.gold : '#3a4668';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        text(`${item.num}  ${item.name}`, r.x + r.w / 2, r.y + 20, 15, PALETTE.text);
        text(item.desc, r.x + r.w / 2, r.y + 42, 13, PALETTE.muted);
        text(`◆ ${item.cost}`, r.x + r.w / 2, r.y + 58, 13, afford ? PALETTE.ember : PALETTE.muted);
      });
      text(`◆ ${s.embers} embers`, 280, 592, 16, PALETTE.ember, 'left');
      text('1 · 2 · 3 take a boon    4 · 5 · 6 spend embers    or click    ENTER to skip', 640, 652, 14, PALETTE.muted);
    },
    drawPaused(s) {
      drawWorld(s, 0.6);
      ctx.fillStyle = 'rgba(5, 7, 15, 0.6)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      panel(440, 260, 400, 200);
      text('PAUSED', 640, 310, 44, PALETTE.gold);
      text('Press P or Enter to carry on', 640, 365, 20, PALETTE.text);
      text('R — restart the night', 640, 400, 18, PALETTE.muted);
    },
    drawOver(s, best) {
      // Dawn gradient for a win, cold dark for a loss.
      const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
      if (s.won) {
        grad.addColorStop(0, '#f7c873');
        grad.addColorStop(0.5, '#c98a6b');
        grad.addColorStop(1, '#3a2350');
      } else {
        grad.addColorStop(0, '#0a0e22');
        grad.addColorStop(1, '#160a24');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.fillStyle = 'rgba(255, 220, 150, 0.12)';
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(140 + i * 150, 120 + (i % 3) * 160, 34 + (i % 3) * 14, 0, Math.PI * 2);
        ctx.fill();
      }
      text(s.won ? 'DAWN BREAKS' : 'THE DARK TAKES YOU', 640, 92, 58, s.won ? '#fff3d6' : PALETTE.danger);
      text(s.won ? 'The Long Night is banished. The lantern burned until morning.' : (s.overReason || 'The lantern went out.'), 640, 140, 17, s.won ? '#5a3a1a' : PALETTE.text);
      panel(300, 168, 680, 380);
      text('FINAL SCORE', 360, 196, 13, PALETTE.muted, 'left');
      text(String(s.score).replace(/\B(?=(\d{3})+(?!\d))/g, ','), 360, 234, 44, PALETTE.gold, 'left');
      const isBest = s.score > 0 && s.score >= best;
      if (isBest) {
        ctx.fillStyle = 'rgba(20, 90, 50, 0.9)';
        ctx.beginPath();
        ctx.roundRect(360, 258, 110, 26, 13);
        ctx.fill();
        text('NEW BEST!', 415, 271, 13, '#8dffb0');
      }
      text(`+ ${s.embersBanked} EMBERS BANKED`, 560, 200, 14, PALETTE.ember, 'left');
      text(`${s.relicsHeld.length} RELICS CARRIED`, 560, 224, 12, PALETTE.muted, 'left');
      // Grade circle.
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(880, 230, 46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 200, 87, 0.12)';
      ctx.fill();
      text(gradeFor(s.score), 880, 232, 52, PALETTE.gold);
      text('RANK', 880, 292, 12, PALETTE.muted);
      // Stats grid.
      const stats = [
        ['Nights survived', `${s.won ? 7 : Math.max(0, s.night - 1)} / 7`],
        ['Shadows banished', String(s.kills)],
        ['Longest chain', String(s.bestChain)],
        ['Time', `${Math.floor(s.timePlayed / 60)}:${String(Math.floor(s.timePlayed % 60)).padStart(2, '0')}`],
        ['Embers gathered', String(s.embersCollected)],
        ['Lamps lit', `${s.lampsLit} / 6`],
        ['Best multiplier', `×${Math.max(1, s.chainMult)}`],
        ['Flame left', `${Math.ceil(s.flame)}`],
      ];
      stats.forEach(([label, value], i) => {
        const cx = i % 2 === 0 ? 360 : 640;
        const cy = 316 + Math.floor(i / 2) * 34;
        text(label, cx, cy, 14, PALETTE.muted, 'left');
        text(value, cx + 190, cy, 15, PALETTE.text, 'right');
      });
      // Blessings: relics carried.
      text('BLESSINGS', 360, 470, 13, PALETTE.muted, 'left');
      const names = {
        emberheart: 'Emberheart', fleetstep: 'Fleetstep', brightwick: 'Brightwick',
        dawnbell: 'Dawn Bell', ironwick: 'Iron Wick', cinderpouch: 'Cinder Pouch',
        thornbrand: 'Thornbrand', hearthstone: 'Hearthstone',
      };
      const held = s.relicsHeld.map((k) => names[k] || k);
      text(held.length > 0 ? held.join('  ·  ') : 'None — the warden walked alone', 360, 496, 14, PALETTE.text, 'left');
      if (s.pactsHeld.length > 0) text('Pacts: ' + s.pactsHeld.join(', '), 360, 518, 12, '#ff9a9a', 'left');
      ctx.fillStyle = 'rgba(255, 200, 87, 0.25)';
      ctx.beginPath();
      ctx.roundRect(430, 580, 420, 48, 24);
      ctx.fill();
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 2;
      ctx.stroke();
      text('CLICK OR PRESS ENTER TO KEEP THE LIGHT AGAIN', 640, 604, 16, PALETTE.goldHot);
      text('ESC  ·  BACK TO TITLE', 640, 652, 13, PALETTE.muted);
    },
  };
}
