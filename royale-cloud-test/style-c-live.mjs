// Scene-only animation inputs. The simulation and save format do not depend on art.
const scenes = new WeakMap();

export function bindStyleCGame(owner, game) {
  if (owner) scenes.set(owner, {game, facing:game.hero.face, turnedAt:-Infinity});
}

export function liveStyleCOptions(options, hero, time) {
  const scene = scenes.get(options.cloth || options.artState);
  if (!scene) return options;
  if (scene.facing !== hero.face) {
    scene.facing = hero.face;
    scene.turnedAt = time;
  }
  const active = scene.game.powers.active;
  let poseName;
  if (!hero.dead && hero.respawnAge >= .6 && !hero.stun && !hero.attack && !hero.flying && (hero.castAge ?? 1) >= .25) {
    if (active.whirlwind && active.whirlwind.age < .48) poseName = 'whirlwind';
    else if (active.roots && active.roots.age < .48) poseName = 'roots';
    else if (hero.agile && (hero.dodgeAge ?? 1) < .48) poseName = 'agility';
    else if (hero.steel && active.steel?.age < .5) poseName = 'steel';
    else if (scene.game.powers.data.levels.speed && Math.abs(hero.vx) > 315) poseName = 'speed';
  }
  if (hero.stun > 0 && (hero.hurtAge ?? 0) > .04 && Math.abs(hero.vx) > 60) poseName = 'knockback';
  const effectAge = poseName === 'agility' ? hero.dodgeAge : active[poseName]?.age;
  return {...options, poseName:options.poseName || poseName, effectAge, turnAge:time - scene.turnedAt};
}
