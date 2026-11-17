// Combat: fists (F) and pistol (click, Q cycles, R reloads).
// Shooting hits the nearest living target inside a forward cone.
export function createCombat() {
  return {
    weapon: 'fists', ammo: 24, reserve: 96, punchCd: 0,
    cycle() { this.weapon = this.weapon === 'fists' ? 'pistol' : 'fists'; },
    reload() {
      if (this.weapon !== 'pistol' || this.ammo >= 24 || this.reserve <= 0) return false;
      const need = 24 - this.ammo, take = Math.min(need, this.reserve);
      this.ammo += take; this.reserve -= take; return true;
    },
    punch(targets, px, pz, heading) {
      if (this.punchCd > 0) return null;
      this.punchCd = 0.45;
      let best = null, bestD = 2.4;
      for (const t of targets) {
        if (t.dead || t.hp <= 0) continue;
        const d = Math.hypot(t.x - px, t.z - pz);
        if (d < bestD) { bestD = d; best = t; }
      }
      if (best) { best.hp -= 34; if (best.hp <= 0) best.dead = true; }
      return best;
    },
    shoot(targets, px, pz, heading) {
      if (this.weapon !== 'pistol' || this.ammo <= 0) return { hit: null, dry: this.ammo <= 0 };
      this.ammo -= 1;
      let best = null, bestD = 42;
      const fx = Math.sin(heading), fz = Math.cos(heading);
      for (const t of targets) {
        if (t.dead || t.hp <= 0) continue;
        const dx = t.x - px, dz = t.z - pz;
        const d = Math.hypot(dx, dz);
        if (d > 42 || d < 0.5) continue;
        const dot = (dx * fx + dz * fz) / d;
        if (dot < 0.82) continue;
        if (d < bestD) { bestD = d; best = t; }
      }
      if (best) { best.hp -= 50; if (best.hp <= 0) best.dead = true; }
      return { hit: best, dry: false };
    },
    tick(dt) { this.punchCd = Math.max(0, this.punchCd - dt); },
  };
}
