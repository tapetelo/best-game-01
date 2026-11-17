// All drawing: one canvas, one painter per screen. The night is near-black
// blue; the only warm things are the lantern, the lit braziers and the
// embers, so the frame reads at a glance even shrunk small: a big golden
// glow in the middle of the dark, big HUD numbers along the top.
import { BEACON_LIGHT_RADIUS, BEACON_RADIUS, EMBER, FIELD, FONT, FUEL, LIVES, NIGHTS, PALETTE, PLAYER, WISP } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

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

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 200, 87, 0.35)';
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

  function drawGround(t) {
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Faint stars and far hills, so the dark is a place, not a void.
    ctx.fillStyle = 'rgba(200, 210, 255, 0.5)';
    for (let i = 0; i < 40; i++) {
      const x = (i * 173) % FIELD.width;
      const y = (i * 97) % 300;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + i));
      ctx.globalAlpha = tw * 0.7;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.nightFar;
    ctx.beginPath();
    ctx.moveTo(0, 620);
    for (let x = 0; x <= FIELD.width; x += 80) ctx.lineTo(x, 600 + Math.sin(x * 0.01) * 22);
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.lineTo(0, FIELD.height);
    ctx.fill();
    ctx.strokeStyle = PALETTE.groundLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 70, FIELD.width - 40, FIELD.height - 90);
  }

  function drawBeacon(b, t, channel, isChanneling) {
    const flick = 1 + Math.sin(t * 9 + b.x) * 0.08;
    if (b.lit) {
      const g = ctx.createRadialGradient(b.x, b.y, 6, b.x, b.y, BEACON_LIGHT_RADIUS * flick);
      g.addColorStop(0, 'rgba(255, 190, 90, 0.55)');
      g.addColorStop(0.5, 'rgba(255, 150, 60, 0.18)');
      g.addColorStop(1, 'rgba(255, 150, 60, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(b.x - BEACON_LIGHT_RADIUS, b.y - BEACON_LIGHT_RADIUS, BEACON_LIGHT_RADIUS * 2, BEACON_LIGHT_RADIUS * 2);
    }
    // Stone brazier bowl.
    ctx.fillStyle = '#2c3550';
    ctx.beginPath();
    ctx.moveTo(b.x - 22, b.y + 6);
    ctx.lineTo(b.x + 22, b.y + 6);
    ctx.lineTo(b.x + 14, b.y + 26);
    ctx.lineTo(b.x - 14, b.y + 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1c2338';
    ctx.fillRect(b.x - 6, b.y + 26, 12, 14);
    if (b.lit) {
      ctx.fillStyle = PALETTE.beaconLit;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - 4, 13 * flick, 17 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.goldHot;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - 2, 6 * flick, 9 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = PALETTE.beaconCold;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - 2, 12, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      text('UNLIT', b.x, b.y - 34, 13, PALETTE.muted);
      if (isChanneling) {
        ctx.strokeStyle = PALETTE.gold;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(b.x, b.y - 2, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * channel);
        ctx.stroke();
        text('LIGHTING…', b.x, b.y - 56, 13, PALETTE.gold);
      }
    }
  }

  function drawEmber(e, t) {
    const bob = Math.sin(t * 3 + e.phase) * 3;
    const g = ctx.createRadialGradient(e.x, e.y + bob, 1, e.x, e.y + bob, 22);
    g.addColorStop(0, 'rgba(255, 154, 60, 0.9)');
    g.addColorStop(1, 'rgba(255, 154, 60, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(e.x, e.y + bob, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.ember;
    ctx.beginPath();
    ctx.arc(e.x, e.y + bob, EMBER.radius - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd9a0';
    ctx.beginPath();
    ctx.arc(e.x - 2, e.y + bob - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWisp(w, t) {
    const frozen = w.frozen > 0;
    const bob = Math.sin(t * 4 + w.wobble) * 4;
    const alpha = frozen ? 0.55 : 0.95;
    ctx.globalAlpha = alpha;
    // Smoky body.
    const g = ctx.createRadialGradient(w.x, w.y + bob, 2, w.x, w.y + bob, WISP.radius + 12);
    g.addColorStop(0, frozen ? 'rgba(160, 190, 255, 0.8)' : 'rgba(143, 123, 255, 0.85)');
    g.addColorStop(1, 'rgba(143, 123, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(w.x, w.y + bob, WISP.radius + 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = frozen ? '#aebfff' : PALETTE.wisp;
    ctx.beginPath();
    ctx.arc(w.x, w.y + bob, WISP.radius, 0, Math.PI * 2);
    ctx.fill();
    // Two eyes: the only thing that shows in the dark.
    ctx.fillStyle = PALETTE.wispEye;
    ctx.beginPath();
    ctx.arc(w.x - 5, w.y + bob - 3, 2.6, 0, Math.PI * 2);
    ctx.arc(w.x + 5, w.y + bob - 3, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (frozen) text('❄', w.x, w.y + bob - 24, 14, '#cfe0ff');
  }

  function drawPlayer(p, t, invulnerable, flareFlash, flareAngle) {
    const flick = 1 + Math.sin(t * 11) * 0.06 + Math.sin(t * 23) * 0.03;
    const r = PLAYER.lightRadius * flick;
    // The lantern glow: the warm heart of the frame.
    const g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, r);
    g.addColorStop(0, 'rgba(255, 210, 110, 0.5)');
    g.addColorStop(0.45, 'rgba(255, 170, 70, 0.22)');
    g.addColorStop(1, 'rgba(255, 170, 70, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    if (flareFlash > 0) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(flareAngle);
      const fg = ctx.createLinearGradient(0, 0, 330, 0);
      fg.addColorStop(0, 'rgba(255, 240, 190, 0.75)');
      fg.addColorStop(1, 'rgba(255, 240, 190, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 330, -0.55, 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Warden: hooded figure with the lantern held high.
    const blink = invulnerable > 0 && Math.floor(t * 10) % 2 === 0;
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
    // The lantern itself.
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

  function drawHud(s, muted) {
    panel(16, 12, 1248, 52);
    text(`NIGHT ${s.night} / ${NIGHTS}`, 40, 38, 26, PALETTE.gold, 'left');
    const nightLeft = Math.max(0, Math.ceil(40 - s.nightTime));
    text(`DAWN IN ${nightLeft}s`, 300, 38, 20, PALETTE.text, 'left');
    text(`BRAZIERS ${s.beaconsLit} / 5`, 520, 38, 20, PALETTE.text, 'left');
    text(`EMBERS ${s.embersCollected}`, 740, 38, 20, PALETTE.text, 'left');
    text(`SCORE ${s.score}`, 920, 38, 20, PALETTE.text, 'left');
    // Lives as little lanterns, kept clear of the fuel bar.
    for (let i = 0; i < LIVES; i++) {
      ctx.fillStyle = i < s.lives ? PALETTE.gold : '#333a52';
      ctx.beginPath();
      ctx.arc(1046 + i * 26, 38, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    // Fuel bar.
    ctx.fillStyle = '#222842';
    ctx.beginPath();
    ctx.roundRect(1150, 26, 90, 24, 6);
    ctx.fill();
    const fw = 90 * Math.max(0, s.fuel / FUEL.max);
    ctx.fillStyle = s.fuel < 25 ? PALETTE.danger : PALETTE.gold;
    ctx.beginPath();
    ctx.roundRect(1150, 26, fw, 24, 6);
    ctx.fill();
    text('FUEL', 1195, 38, 12, '#10131f');
    text(muted ? 'MUTED (M)' : 'M: MUTE', 640, 700, 13, PALETTE.muted);
  }

  function drawWorld(s, t) {
    drawGround(t);
    for (const b of s.beacons) {
      const isChanneling = s.channelBeacon >= 0 && s.beacons[s.channelBeacon] === b;
      drawBeacon(b, t, s.channel / 1.4, isChanneling);
    }
    for (const e of s.embers) drawEmber(e, t);
    for (const w of s.wisps) drawWisp(w, t);
    for (const pt of s.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawPlayer(s.player, t, s.invulnerable, s.flareFlash, s.flareAngle);
    drawHud(s, false);
  }

  return {
    fit,
    drawTitle(best) {
      drawGround(0.6);
      // A staged night behind the title: one lit brazier, embers, wisps held back.
      ctx.fillStyle = 'rgba(5, 7, 15, 0.45)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      panel(240, 110, 800, 470);
      text('EMBERWARDEN', 640, 185, 64, PALETTE.gold);
      text('Carry the last lantern through seven nights.', 640, 245, 24, PALETTE.text);
      text('Light is your weapon — and your fuel.', 640, 280, 20, PALETTE.muted);
      text('WASD / ARROWS — move      MOUSE — aim the beam', 640, 340, 20, PALETTE.text);
      text('CLICK / SPACE — flare: freeze wisps in a cone of light', 640, 372, 20, PALETTE.text);
      text('Stand by a brazier to light it  •  Gather embers to feed the lantern', 640, 404, 20, PALETTE.text);
      text('Wisps crawl slowly in the light — flare to freeze them. Survive all 7 nights — see the dawn.', 640, 436, 20, PALETTE.text);
      text('▶  PRESS ENTER OR CLICK TO BEGIN  •  P pause  •  M mute', 640, 500, 22, PALETTE.goldHot);
      if (best > 0) text(`Best run: survived to night ${best}`, 640, 540, 16, PALETTE.muted);
    },
    drawPlay(s, t, muted) {
      drawWorld(s, t);
      if (muted) text('MUTED — press M', 640, 700, 13, PALETTE.muted);
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
      drawGround(0.6);
      ctx.fillStyle = 'rgba(5, 7, 15, 0.55)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      panel(240, 130, 800, 440);
      if (s.won) {
        text('☀  DAWN BREAKS  ☀', 640, 200, 52, PALETTE.gold);
        text('Seven nights survived. The last lantern never went out.', 640, 255, 22, PALETTE.text);
      } else {
        text('THE DARK TAKES YOU', 640, 200, 48, PALETTE.danger);
        text(s.overReason || 'The lantern went out.', 640, 255, 22, PALETTE.text);
      }
      text(`Nights survived: ${s.won ? 7 : Math.max(0, s.night - 1)} / 7     Braziers lit: ${s.beaconsLit} / 5`, 640, 310, 20, PALETTE.text);
      text(`Embers gathered: ${s.embersCollected}     Score: ${s.score}`, 640, 345, 20, PALETTE.text);
      if (best > 0) text(`Best run: night ${best}`, 640, 380, 16, PALETTE.muted);
      text('PRESS ENTER OR R TO PLAY AGAIN', 640, 450, 24, PALETTE.goldHot);
      text('The wisps are already gathering for the next night…', 640, 500, 16, PALETTE.muted);
    },
  };
}
