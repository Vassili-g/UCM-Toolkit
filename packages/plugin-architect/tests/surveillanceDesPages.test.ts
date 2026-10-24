import assert from 'node:assert/strict';
import test from 'node:test';

import { creerLeSuivi, type PageSuivable } from '../src/sandbox/contexte';

interface PageFausse extends PageSuivable {
  readonly nom: string;
  ecoutes: number;
}

function page(nom: string, chargee = true): PageFausse {
  const p: PageFausse = {
    nom,
    ecoutes: 0,
    on() {
      if (!chargee) throw new Error('page non chargée');
      p.ecoutes += 1;
    },
    off() { p.ecoutes -= 1; },
  };
  return p;
}

const rappel = (): void => {};

test('le maître d’une autre page est suivi avec la page courante, une écoute par page', () => {
  const a = page('A');
  const b = page('B');
  const suivi = creerLeSuivi(() => a, rappel);
  suivi.surveiller(b);
  suivi.surveiller(b);
  suivi.recalculer();
  assert.deepEqual([a.ecoutes, b.ecoutes], [1, 1]);
});

test('une page qui n’est ni courante ni celle du sujet est quittée', () => {
  const a = page('A');
  const b = page('B');
  const c = page('C');
  let courante = a;
  const suivi = creerLeSuivi(() => courante, rappel);
  suivi.surveiller(b);
  courante = c;
  suivi.recalculer();
  assert.deepEqual([a.ecoutes, b.ecoutes, c.ecoutes], [0, 1, 1]);
  suivi.surveiller(undefined);
  assert.deepEqual([a.ecoutes, b.ecoutes, c.ecoutes], [0, 0, 1]);
});

test('un sujet sur la page courante ne double pas l’écoute', () => {
  const a = page('A');
  const suivi = creerLeSuivi(() => a, rappel);
  suivi.surveiller(a);
  assert.equal(a.ecoutes, 1);
});

test('rien ne s’écoute avant la première analyse', () => {
  const a = page('A');
  const suivi = creerLeSuivi(() => a, rappel);
  suivi.recalculer();
  assert.equal(a.ecoutes, 0);
});

test('une page non chargée n’est pas suivie et ne bloque pas la page courante', () => {
  const a = page('A');
  const b = page('B', false);
  const suivi = creerLeSuivi(() => a, rappel);
  suivi.surveiller(b);
  assert.deepEqual([a.ecoutes, b.ecoutes], [1, 0]);
});
