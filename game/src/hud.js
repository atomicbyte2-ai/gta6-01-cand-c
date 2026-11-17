// Dense HUD: DOM panels + a circular 2D minimap canvas.
// Stars, money, clock, health/armor, speed + car, weapon, radio,
// police roster, mission text, storm gauge, dialogue, popups.
import { POLICE_UNITS, HELI_UNIT, RADIOS } from './config.js';

function el(id) { return document.getElementById(id); }

export function createHud(game) {
  const mm = el('minimap').getContext('2d');
  let sayTimer = 0, bannerTimer = 0, popupCd = 0;
  const popups = [];

  function stars(n) {
    let s = '';
    for (let i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    return s;
  }

  function drawMinimap() {
    const W = 220, H = 220, S = W / 300; // world -150..150 -> 0..220
    mm.clearRect(0, 0, W, H);
    mm.fillStyle = 'rgba(42,36,28,0.92)'; mm.fillRect(0, 0, W, H);
    const px = (x) => (x + 150) * S, pz = (z) => (z + 150) * S;
    // Sea + beach.
    mm.fillStyle = '#2e7d8e'; mm.fillRect(0, pz(138), W, H - pz(138));
    mm.fillStyle = '#ead9a8'; mm.fillRect(0, pz(125), W, pz(138) - pz(125));
    // Port pad.
    mm.fillStyle = '#8a8378'; mm.fillRect(px(78), pz(-25), (140 - 78) * S, (85 + 25) * S);
    // Roads.
    mm.strokeStyle = '#a8905e'; mm.lineWidth = 5;
    for (const r of [-90, -45, 0, 45, 90]) {
      mm.beginPath(); mm.moveTo(px(-140), pz(r)); mm.lineTo(px(140), pz(r)); mm.stroke();
      mm.beginPath(); mm.moveTo(px(r), pz(-140)); mm.lineTo(px(r), pz(140)); mm.stroke();
    }
    mm.strokeStyle = '#c9a03e'; mm.lineWidth = 6;
    mm.beginPath(); mm.moveTo(px(-140), pz(-118)); mm.lineTo(px(140), pz(-118)); mm.stroke();
    // Mission marker.
    const mp = game.missions.markerPos();
    if (mp) {
      mm.fillStyle = '#ffd23e';
      mm.beginPath(); mm.arc(px(mp[0]), pz(mp[1]), 7, 0, Math.PI * 2); mm.fill();
      mm.strokeStyle = '#fff'; mm.lineWidth = 2; mm.stroke();
    }
    // Police dots.
    for (const u of game.police.units) {
      if (!u.active) continue;
      mm.fillStyle = '#4a90ff';
      mm.beginPath(); mm.arc(px(u.x), pz(u.z), 4, 0, Math.PI * 2); mm.fill();
    }
    if (game.police.heliActive) {
      mm.fillStyle = '#ff9040';
      mm.beginPath(); mm.arc(px(game.police.heli.position.x), pz(game.police.heli.position.z), 5, 0, Math.PI * 2); mm.fill();
    }
    // Player arrow.
    const p = game.player;
    mm.save();
    mm.translate(px(p.x), pz(p.z)); mm.rotate(-p.heading);
    mm.fillStyle = '#fff';
    mm.beginPath(); mm.moveTo(0, -8); mm.lineTo(5, 6); mm.lineTo(-5, 6); mm.closePath(); mm.fill();
    mm.restore();
  }

  function update() {
    const p = game.player, pol = game.police;
    el('stars').textContent = stars(pol.wanted);
    el('stars').style.color = pol.wanted > 0 ? '#ff4040' : '#ffd23e';
    el('money').textContent = `$${game.money}`;
    const hrs = Math.floor(game.clock / 60) % 24, mins = Math.floor(game.clock % 60);
    el('clock').textContent = `DAY ${game.day}  ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    el('health-fill').style.width = `${Math.max(0, p.hp)}%`;
    el('armor-fill').style.width = `${Math.max(0, p.armor)}%`;
    el('speed').textContent = game.car ? `${Math.round(game.playerCarSpeed)} KM/H` : `${Math.round(game.playerSpeed * 3.6)} KM/H`;
    el('carname').textContent = game.car ? game.car.model.name : 'ON FOOT — JOSS MAREK';
    el('weapon').textContent = game.combat.weapon === 'pistol'
      ? `PISTOL  ${game.combat.ammo} / ${game.combat.reserve}` : 'FISTS';
    el('radio').textContent = `♪ ${RADIOS[game.radioIdx]}`;
    el('rep').textContent = `REP ${game.rep}  •  JOBS ${game.missions.st.doneList.length}/6`;
    // Storm gauge.
    const ph = game.stormPhase;
    const label = ph === 2 ? 'DUST STORM — PD BLIND' : ph === 1 ? 'STORM FRONT INCOMING' : 'DUST: CALM';
    el('storm').textContent = `${label}  ${Math.ceil(game.stormTimer)}s`;
    el('storm').style.color = ph === 2 ? '#ff9040' : ph === 1 ? '#ffd23e' : '#e8dcc0';
    // Mission text.
    el('mission-title').textContent = game.missions.st.active
      ? game.missions.current().name : (game.missions.st.index < 6 ? 'DUSTLINE HARBOR' : 'LEGEND OF THE HARBOR');
    el('mission-text').textContent = game.missions.objectiveText();
    // Police roster.
    const rows = [];
    game.police.units.forEach((u) => {
      if (!u.active) return;
      const d = Math.round(Math.hypot(p.x - u.x, p.z - u.z));
      rows.push(`${u.id} ${u.status} ${d}m — ${u.officer}`);
    });
    if (game.police.heliActive) rows.push(`${HELI_UNIT.id} OVERHEAD — ${HELI_UNIT.officer}`);
    el('roster').innerHTML = rows.length
      ? `<b>DUSTLINE PD RESPONSE</b><br>${rows.join('<br>')}`
      : '<b>DUSTLINE PD</b><br>All quiet on the harbor.';
    el('district').textContent = game.districtAt(p.x, p.z);
    drawMinimap();
    // Timers.
    if (sayTimer > 0) { sayTimer -= 1 / 60; if (sayTimer <= 0) el('dialogue').style.display = 'none'; }
    if (bannerTimer > 0) { bannerTimer -= 1 / 60; if (bannerTimer <= 0) el('banner').style.display = 'none'; }
    popupCd = Math.max(0, popupCd - 1 / 60);
    for (const pop of [...popups]) {
      pop.t -= 1 / 60;
      if (pop.t <= 0) { pop.node.remove(); popups.splice(popups.indexOf(pop), 1); }
    }
  }

  return {
    update,
    say(text, who) {
      const d = el('dialogue');
      d.innerHTML = `<b>${who || ''}</b> ${text}`;
      d.style.display = 'block'; sayTimer = 6;
    },
    banner(text) {
      const b = el('banner');
      b.textContent = text; b.style.display = 'block'; bannerTimer = 4;
    },
    popup(title, sub) {
      if (popupCd > 0 || popups.length >= 4) return;
      popupCd = 0.4;
      const box = el('popups');
      const node = document.createElement('div');
      node.className = 'popup';
      node.innerHTML = `<b>${title}</b> ${sub || ''}`;
      box.appendChild(node);
      popups.push({ node, t: 3.2 });
    },
    show(id) { el(id).style.display = 'flex'; },
    hide(id) { el(id).style.display = 'none'; },
    setWasted(showIt) { el('wasted-screen').style.display = showIt ? 'flex' : 'none'; },
  };
}
