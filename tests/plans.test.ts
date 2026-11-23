/**
 * Lecture des plans : lots, marques, groupe, état, lot suivant et date du dernier lot.
 * `PLAN-INVENTAIRE.md` sert de plan réel : ses cases indentées ne sont pas des lots.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { dateDuDernierLot, etatDuPlan, lireLePlan, lotSuivant } from '../docs/inventaire/plans';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLAN_INVENTAIRE = path.join(RACINE, 'docs/notes/Recherches/Evolutions globales/PLAN-INVENTAIRE.md');

test('un hash local, le numéro et le texte sont lus', () => {
  const [lot] = lireLePlan('- [x] 3 (bd04e26a). Texte.');
  assert.deepEqual(
    { numero: lot.numero, fait: lot.fait, hashes: lot.hashes, marque: lot.marque, texte: lot.texte },
    { numero: '3', fait: true, hashes: [{ depot: null, hash: 'bd04e26a' }], marque: null, texte: 'Texte.' },
  );
});

test('un hash de dépôt garde le nom du dépôt', () => {
  const [lot] = lireLePlan('- [x] 1 (intencial-library@62d32976). Socle.');
  assert.deepEqual(lot.hashes, [{ depot: 'intencial-library', hash: '62d32976' }]);
});

test("le texte de la parenthèse qui n'est pas une marque est ignoré", () => {
  const [lot] = lireLePlan('- [x] 8 (21b78694, publiés : core 0.17.1). Publication.');
  assert.deepEqual(lot.hashes, [{ depot: null, hash: '21b78694' }]);
  assert.equal(lot.marque, null);
  assert.equal(lot.texte, 'Publication.');
});

test('mainteneur et attend Pn sont des marques', () => {
  const [a, b] = lireLePlan('- [ ] 0.7 (mainteneur). Relire.\n- [ ] 2 (attend P1). Contrat.');
  assert.equal(a.marque, 'mainteneur');
  assert.equal(a.numero, '0.7');
  assert.deepEqual(b.marque, { attend: 'P1' });
});

test("le point final du numéro, les noms d'agents de tête et les liens sont retirés", () => {
  const lots = lireLePlan([
    '- [ ] 4. Texte.',
    '- [ ] 1.1 `implementeur`. Lecture des plans. Commit : `…`',
    '- [ ] 0.1 Décision du mainteneur. Valeurs neutres.',
    '- [ ] 5 `implementeur-exigeant`. [Le lien](x.md) seul.',
  ].join('\n'));
  assert.deepEqual(lots.map((l) => [l.numero, l.texte]), [['4', 'Texte.'], ['1.1', 'Lecture des plans.'], ['0.1', 'Valeurs neutres.'], ['5', 'Le lien seul.']]);
});

test('un texte de plus de 90 caractères est coupé avec une ellipse', () => {
  const [lot] = lireLePlan(`- [ ] 1 ${'mot '.repeat(40)}fin.`);
  assert.equal(lot.texte.length, 90);
  assert.ok(lot.texte.endsWith('…'));
});

test('une case indentée ne compte pas : PLAN-INVENTAIRE donne 8 lots sur 8', () => {
  assert.equal(lireLePlan('- [x] 1 (abcdef0). Lot.\n  - [ ] 1.1. Étape.').length, 1);
  assert.deepEqual(etatDuPlan(lireLePlan(readFileSync(PLAN_INVENTAIRE, 'utf8'))), { faits: 8, total: 8, livre: true });
});

test('une case dans un bloc de code ne compte pas, [X] et * [ ] comptent', () => {
  const lots = lireLePlan('```\n- [ ] 1 exemple\n```\n~~~\n## Titre\n- [ ] 2 exemple\n~~~\n- [X] 3 Un.\n* [ ] 4 Deux.\n+ [ ] 5 Trois.');
  assert.deepEqual(lots.map((l) => [l.numero, l.fait]), [['3', true], ['4', false], ['5', false]]);
});

test('le groupe est le dernier titre ## avant la case, sans son numéro', () => {
  const lots = lireLePlan('- [ ] 0 Avant.\n## Vague 2\n- [ ] 1 A.\n### Sous-titre\n- [ ] 2 B.\n## 3. Suite\n- [ ] 3 C.');
  assert.deepEqual(lots.map((l) => l.groupe), ['', 'Vague 2', 'Vague 2', 'Suite']);
});

test("un plan sans lot n'est pas livré", () => {
  assert.deepEqual(etatDuPlan([]), { faits: 0, total: 0, livre: false });
});

test("lotSuivant saute un lot marqué et rend null s'il n'en reste aucun", () => {
  const lots = lireLePlan('- [x] 1 (abcdef0). Fait.\n- [ ] 2 (mainteneur). Relire.\n- [ ] 3 (attend P1). Attendre.\n- [ ] 4 À faire.');
  assert.equal(lotSuivant(lots)?.numero, '4');
  assert.equal(lotSuivant(lots.slice(0, 3)), null);
});

test('dateDuDernierLot ignore un hash de dépôt et un lot non fait', () => {
  const lots = lireLePlan('- [x] 1 (aaaaaaa). A.\n- [x] 2 (bbbbbbb, dep@ccccccc). B.\n- [ ] 3 (ddddddd). C.');
  const dates: Record<string, string> = { aaaaaaa: '2026-11-01', bbbbbbb: '2026-11-05', ccccccc: '2026-12-01', ddddddd: '2026-12-02' };
  assert.equal(dateDuDernierLot(lots, (h) => dates[h] ?? null), '2026-11-05');
  assert.equal(dateDuDernierLot(lireLePlan('- [ ] 1 (aaaaaaa). A.'), () => '2026-11-01'), null);
});

test('PLAN-INVENTAIRE : groupes, hash et textes des lots réels', () => {
  const plan = lireLePlan(readFileSync(PLAN_INVENTAIRE, 'utf8'));
  assert.deepEqual(
    plan.slice(0, 3).map((l) => [l.numero, l.groupe]),
    [['R1', 'Phase R : refonte de la page locale'], ['R2', 'Phase R : refonte de la page locale'], ['C1', 'Phase C : catalogues dans le code']],
  );
  assert.equal(plan[2].hashes[0].hash, '0822b7eb');
  assert.ok(plan.every((l) => l.texte !== ''));
});

test("un hash en fin de case, hors parenthèse, est lu et le texte s'arrête avant « Commit : »", () => {
  const [lot] = lireLePlan('- [x] 1.1 `implementeur-exigeant`. Juge du kit et dérogation des constats du code. Commit : `354ef421`');
  assert.deepEqual(lot.hashes, [{ depot: null, hash: '354ef421' }]);
  assert.equal(lot.texte, 'Juge du kit et dérogation des constats du code.');
  const [deux] = lireLePlan('- [x] 2 Texte sans point Commit : `abcdef0, dep@1234567`');
  assert.deepEqual(deux.hashes, [{ depot: null, hash: 'abcdef0' }, { depot: 'dep', hash: '1234567' }]);
  assert.equal(deux.texte, 'Texte sans point');
});

test("Commit : `…` et Commit : avec 4.1 n'ajoutent aucun hash", () => {
  const lots = lireLePlan(['- [ ] 1.1 `implementeur`. Lecture des plans. Commit : `…`', '- [ ] 2 Texte. Commit : avec 4.1'].join('\n'));
  assert.deepEqual(lots.map((l) => l.hashes), [[], []]);
  assert.equal(lots[0].texte, 'Lecture des plans.');
});

test('PLAN P6 : les lots 0.20, 0.21, 1.1 à 1.3 ont chacun un hash', () => {
  const plan = lireLePlan(readFileSync(path.join(RACINE, 'docs/notes/Recherches/Linter Dev/PLAN-IMPLEMENTATION-P6-KIT.md'), 'utf8'));
  for (const numero of ['0.20', '0.21', '1.1', '1.2', '1.3']) {
    assert.equal(plan.find((l) => l.numero === numero)?.hashes.length, 1, numero);
  }
});
