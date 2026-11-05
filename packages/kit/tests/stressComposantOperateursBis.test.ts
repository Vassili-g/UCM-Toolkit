/**
 * Garde les opérateurs M, U, T et S du harnais de stress F3 : leurs nombres de cas contre la section 3.3 du plan, la forme des
 * cas, un échantillon d'oracles écrits à la main et la cohérence de chaque dégradation (dégrader puis annuler redonne la base).
 * Le test ne mesure pas le kit : un écart du kit sur ces cas est un résultat du harnais. Le test d'annulation passe en dernier,
 * parce que `annuler` défait les copies que les cas partagent.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { proposerLaPropagation } from '../src/controles/index.js';
import { comparer } from './stress/commun/comparer.js';
import { constatsDeLaPortee, copierLeComposant } from './stress/f3-composant/composantDeBase.js';
import type { CasDeComposant } from './stress/f3-composant/operateursAxes.js';
import { cleDeConstatEtendue, modeleDuCas, operateursModele } from './stress/f3-composant/operateursModele.js';
import { operateursPeinture } from './stress/f3-composant/operateursPeinture.js';
import { operateursStructure } from './stress/f3-composant/operateursStructure.js';
import { operateursTheme } from './stress/f3-composant/operateursTheme.js';
import { composantDuProfil, PROFIL_ALPHA, PROFIL_P0 } from './stress/f3-composant/profils.js';

const base = composantDuProfil(PROFIL_P0);
const baseAvant = JSON.stringify(base);
const M = operateursModele(base);
const U = operateursPeinture(base);
const T = operateursTheme(base);
const S = operateursStructure(base);
const TOUS: CasDeComposant[] = [...M, ...U, ...T, ...S];
const cas = (id: string): CasDeComposant => TOUS.find((entree) => entree.id === id)!;
const duOperateur = (operateur: string) => TOUS.filter((entree) => entree.operateur === operateur);
const codes = (entree: CasDeComposant) => entree.attendus.map((attendu) => `${attendu.code}:${attendu.forme}`);

test('les opérateurs rendent les nombres de cas de la section 3.3 du plan : 26 M, 52 U, 28 T, 20 S', () => {
  const attendus: Record<string, number> = { M1: 10, M2: 16, U1: 22, U2: 9, U3: 15, U4: 6, T1: 24, T2: 4, S1: 8, S2: 8, S3: 4 };
  for (const [operateur, nombre] of Object.entries(attendus)) assert.equal(duOperateur(operateur).length, nombre, operateur);
  assert.deepEqual([M.length, U.length, T.length, S.length], [26, 52, 28, 20]);
});

test('chaque cas a un identifiant <opérateur>-<n>, une description, des zones, des codes jugés et un verdict cohérent', () => {
  assert.equal(new Set(TOUS.map((entree) => entree.id)).size, TOUS.length);
  for (const operateur of ['M1', 'M2', 'U1', 'U2', 'U3', 'U4', 'T1', 'T2', 'S1', 'S2', 'S3']) {
    duOperateur(operateur).forEach((entree, rang) => assert.equal(entree.id, `${operateur}-${rang + 1}`));
  }
  for (const entree of TOUS) {
    assert.equal(entree.famille, 'F3');
    assert.ok(entree.entree.description.startsWith(entree.operateur), entree.id);
    assert.ok(entree.entree.zones.length > 0, entree.id);
    const identifiants = new Set(entree.entree.base.releve.variants.map((variant) => variant.id));
    for (const zone of entree.entree.zones) assert.ok(identifiants.has(zone.variant), `${entree.id} ${zone.variant}`);
    assert.equal(entree.verdict === 'mesure', entree.question !== undefined, entree.id);
    assert.ok(entree.codesJuges && entree.codesJuges.length > 0, `${entree.id} sans codes jugés`);
    for (const attendu of entree.attendus) {
      assert.ok(entree.codesJuges!.includes(attendu.code), `${entree.id} attend ${attendu.code}, qu'il ne juge pas`);
      if (attendu.forme === 'correction') {
        assert.ok(attendu.apres?.cle && attendu.apres.nom, `${entree.id} correction sans cible`);
        // Une correction vise un token de components du jeu, ou la variable de thème que C63 écrit : jamais layout ni primitives (P6).
        const cible = entree.entree.composant.catalogue.variables.find((variable) => variable.cle === attendu.apres?.cle);
        const role = entree.entree.composant.catalogue.collections.find((collection) => collection.cle === cible?.collection)?.role;
        assert.ok(cible && (role === 'components' || (attendu.code === 'C63' && role === 'theme')), `${entree.id} cible ${attendu.apres?.cle}`);
      }
    }
  }
});

test('les cas qui dépendent d\'une question non confirmée portent le verdict mesure et son identifiant', () => {
  const mesures = (operateur: string) => duOperateur(operateur).filter((entree) => entree.verdict === 'mesure').map((entree) => [entree.id, entree.question]);
  // Q-F3-1, Q-F3-2, Q-F3-4, Q-F3-6 et Q-F3-7 sont tranchées : les opérateurs M2, U1 et U2 n'ont plus de cas `mesure`.
  assert.deepEqual([...mesures('M2'), ...mesures('U1'), ...mesures('U2')], []);
  // Q-F3-8, Q-F3-9 et Q-F3-10 sont tranchées : T1 et T2 n'ont plus de cas `mesure`.
  assert.deepEqual([...mesures('T1'), ...mesures('T2')], []);
  assert.deepEqual(mesures('S1'), [['S1-5', 'S1-5']]);
  assert.deepEqual([...mesures('M1'), ...mesures('U3'), ...mesures('U4'), ...mesures('S2'), ...mesures('S3')], []);
});

test('M1 : un C21 pour les cas 1, 2, 4, 7, 8, 9 et 10, aucun pour 3, 5 et 6 (E-41)', () => {
  assert.deepEqual(duOperateur('M1').map((entree) => entree.attendus.length), [1, 2, 0, 1, 0, 0, 1, 1, 1, 1]);
  assert.ok(duOperateur('M1').every((entree) => entree.attendus.every((attendu) => attendu.code === 'C21')));
  assert.deepEqual(duOperateur('M1').map((entree) => entree.entree.base.releve.variants.length), [36, 36, 36, 3, 2, 36, 36, 36, 36, 36]);
  assert.equal(cas('M1-10').entree.base.spec.modesDeTaille, 2);
});

test('M2 : un C24 avec correction par liaison retirée et un C81 par sorte, un oracle propre aux cas particuliers', () => {
  const m2 = duOperateur('M2');
  // M2-1 : 35 variants nus × 14 liaisons du composant, plus un C81 pour les couleurs et un pour les tailles.
  assert.deepEqual([cas('M2-1').attendus.filter((a) => a.code === 'C24').length, cas('M2-1').attendus.filter((a) => a.code === 'C81').length], [490, 2]);
  assert.ok(cas('M2-1').attendus.filter((a) => a.code === 'C24').every((a) => a.forme === 'correction' && a.cle.endsWith('|')));
  assert.deepEqual([cas('M2-3').attendus.length, cas('M2-4').attendus.length], [211, 281], 'couleurs 6 × 35 + C81, tailles 8 × 35 + C81');
  for (const entree of m2) assert.ok(modeleDuCas(entree), entree.id);
  assert.deepEqual(codes(cas('M2-7')), ['C24:question']);
  assert.deepEqual(cas('M2-7').attendus[0].candidats, []);
  assert.notEqual(cas('M2-7').attendus[0].cle.split('|')[1], '', 'homologue ambigu : la question nomme le premier homonyme du variant visé (Q-F3-7)');
  assert.deepEqual(cas('M2-12').attendus[0].candidats?.length, 2);
  assert.equal(cas('M2-8').attendus.filter((a) => a.code === 'C24').length, 13);
  assert.deepEqual([6, 9, 10, 11, 13, 14, 16].map((rang) => cas(`M2-${rang}`).attendus.length), [0, 0, 0, 0, 0, 0, 0]);
  assert.equal(cas('M2-15').attendus.filter((a) => a.code === 'C24').length, 2);
  // Le C81 de deux modèles à égalité porte le premier variant du jeu.
  assert.ok(cas('M2-5').attendus.find((a) => a.code === 'C81')!.cle.startsWith('10:1|'));
});

test('U1 : un C25 par type de layer, une correction avec un seul candidat, une question sans candidat', () => {
  const u1 = duOperateur('U1');
  for (const [rang, entree] of u1.entries()) {
    if (entree.entree.description.includes('Glyph')) { assert.deepEqual(entree.attendus, [], entree.id); continue; }
    const [constat] = entree.attendus;
    assert.equal(entree.attendus.length, 1, entree.id);
    assert.deepEqual([constat.code, constat.forme], ['C25', rang % 2 === 0 ? 'correction' : 'question'], entree.id);
    if (constat.forme === 'question') assert.deepEqual(constat.candidats, [], entree.id);
  }
  const role = (id: string) => cas(id).attendus[0].apres!.nom!.split('/').at(-1);
  assert.deepEqual(['U1-1', 'U1-3', 'U1-5', 'U1-7', 'U1-9', 'U1-11', 'U1-13', 'U1-15', 'U1-17', 'U1-19'].map(role),
    ['background', 'border', 'ring', 'background', 'icon', 'background', 'background', 'foreground', 'foreground', 'foreground']);
  assert.ok(cas('U1-4').attendus[0].cle.endsWith('|strokes||'));
});

test('U2 à U4 : des témoins sans constat, le même token quel que soit l\'ordre des axes, un choix de candidat par cas', () => {
  assert.deepEqual(duOperateur('U2').map((entree) => entree.attendus.map((a) => `${a.code}:${a.forme}`)), [[], [], [], [], [], [], [], ['C25:a-faire'], ['C25:a-faire']], 'les sept témoins, puis les layers masqués jugés (Q-F3-1)');
  const u3 = duOperateur('U3');
  assert.ok(u3.every((entree) => codes(entree).join() === 'C25:correction'));
  // Cinq ordres, trois rôles : l'ordre des propriétés du relevé change, le nom du token attendu reste celui de la grammaire.
  const ordres = new Set(u3.map((entree) => entree.entree.base.releve.proprietes.filter((p) => p.type === 'VARIANT').map((p) => p.nom).join()));
  assert.equal(ordres.size, 5);
  assert.ok(u3.every((entree) => /^button\/color\/(primary|neutral|danger)\/(solid|outline)\/(small|medium)\/(default|hover|disabled)\/(background|foreground|border)$/.test(entree.attendus[0].apres!.nom!)));
  assert.deepEqual(duOperateur('U4').map((entree) => entree.attendus[0].forme), ['a-faire', 'a-faire', 'correction', 'question', 'correction', 'correction']);
  assert.equal(cas('U4-4').attendus[0].candidats!.length, 2);
  assert.ok(cas('U4-3').attendus[0].apres!.nom!.endsWith('/text'));
  assert.ok(cas('U4-6').attendus[0].apres!.nom!.includes('/rest/'));
});

test('T1 et T2 : C80 sur chaque liaison directe, C59 pour les fonds qui ne sont pas de surface, correction vers un token de components', () => {
  const t1 = duOperateur('T1');
  // Direct : C80 sur le texte, et sur le fond quand il est lié, jamais de C59 (Q-F3-9). Par token : jamais de C80.
  assert.ok(t1.filter((_, rang) => rang < 20 && rang % 2 === 1).every((entree) => entree.attendus.every((attendu) => attendu.code === 'C59')));
  assert.ok(t1.filter((_, rang) => rang < 21 && rang % 2 === 0).every((entree) => entree.attendus.every((attendu) => attendu.code === 'C80')));
  const avecC59 = t1.slice(0, 20).filter((entree) => entree.attendus.some((attendu) => attendu.code === 'C59')).map((entree) => entree.id);
  // Aucun, fond en dur, solid/default, page/foreground, fond d'un frère ; surface/default, hover, pressed, subtle et le fond d'un ancêtre n'en ont pas.
  assert.deepEqual(avecC59, ['T1-2', 'T1-4', 'T1-14', 'T1-16', 'T1-20']);
  const c59 = cas('T1-2').attendus.find((attendu) => attendu.code === 'C59')!;
  assert.equal(c59.forme, 'correction');
  assert.ok(c59.apres!.nom!.endsWith('/zone/page-foreground'));
  assert.equal(cas('T1-22').attendus.find((a) => a.code === 'C59')!.cle.split('|')[3], '0', 'la plage figure dans la clé du C59');
  assert.deepEqual(cas('T1-23').attendus.find((a) => a.code === 'C59')!.candidats, []);
  assert.equal(cas('T1-24').attendus.find((a) => a.code === 'C59')!.candidats!.length, 2);
  assert.deepEqual([1, 2, 3, 4].map((rang) => codes(cas(`T2-${rang}`))), [[], [], ['C80:a-faire'], ['C80:a-faire']]);
});

test('S1 à S3 : des questions sans présélection, une correction alias-de-mode, la clé d\'un C63 porte le mode', () => {
  assert.deepEqual(duOperateur('S1').map((entree) => entree.attendus.length), [0, 1, 1, 1, 0, 0, 0, 2]);
  assert.deepEqual(duOperateur('S1').map((entree) => entree.attendus[0]?.candidats?.length), [undefined, 2, 2, 3, undefined, undefined, undefined, 2]);
  const [s18a, s18b] = cas('S1-8').attendus;
  assert.notEqual(s18a.cle, s18b.cle);
  assert.ok(s18a.cle.endsWith('|Default') && s18b.cle.endsWith('|Comfortable'));
  assert.deepEqual(duOperateur('S2').map((entree) => entree.attendus.map((attendu) => attendu.forme)), [
    ['correction'], ['correction'], ['correction', 'correction'], ['question'], ['question'], ['a-faire'], ['question'], ['question', 'question', 'question'],
  ]);
  assert.equal(cas('S2-4').attendus[0].candidats!.length, 2);
  assert.deepEqual(cas('S2-5').attendus[0].candidats, []);
  assert.deepEqual(duOperateur('S3').map((entree) => entree.attendus.map((attendu) => attendu.code)), [['C20'], [], [], ['C20']]);
  assert.equal(cas('S1-2').entree.base.spec.modesDeTaille, 2);
});

test('quatre cas passent par les contrôles du kit et `comparer` sans lever', () => {
  for (const id of ['M1-1', 'U1-9', 'S2-1', 'T1-5']) {
    const copie = copierLeComposant(cas(id).entree.composant);
    const resultat = comparer(cas(id), constatsDeLaPortee(copie.releve, copie.catalogue), cleDeConstatEtendue);
    assert.equal(resultat.attendus, cas(id).attendus.length);
  }
  const m2 = cas('M2-2');
  const copie = copierLeComposant(m2.entree.composant);
  const emis = [...constatsDeLaPortee(copie.releve, copie.catalogue), ...proposerLaPropagation(copie.releve, copie.catalogue, modeleDuCas(m2)!)];
  assert.ok(comparer(m2, emis, cleDeConstatEtendue).detectes > 0);
});

test('les opérateurs tournent sur d\'autres profils : Pα garde ses cas, un jeu sans axe n\'en rend que ceux qui n\'ont pas besoin d\'axe', () => {
  const alpha = composantDuProfil(PROFIL_ALPHA);
  const casAlpha = [...operateursModele(alpha), ...operateursPeinture(alpha), ...operateursTheme(alpha), ...operateursStructure(alpha)];
  assert.ok(casAlpha.length > 80);
  const seul = composantDuProfil({ ...PROFIL_P0, id: 'p-seul', forme: 'divider-1' });
  assert.deepEqual(operateursModele(seul), []);
  assert.deepEqual(operateursStructure(seul), []);
});

test('dégrader ne touche pas la base, puis annuler redonne le relevé et le catalogue de la base', () => {
  assert.equal(JSON.stringify(base), baseAvant);
  const empreintes = new Map<unknown, string>();
  const empreinte = (composant: CasDeComposant['entree']['base']) => {
    let connue = empreintes.get(composant);
    if (connue === undefined) {
      connue = JSON.stringify([composant.releve, composant.catalogue]);
      empreintes.set(composant, connue);
    }
    return connue;
  };
  for (const entree of TOUS) {
    const { composant, base: sa, annuler } = entree.entree;
    const degradee = JSON.stringify([composant.releve, composant.catalogue]);
    assert.notEqual(degradee, empreinte(sa), `${entree.id} ne dégrade rien`);
    annuler();
    assert.equal(JSON.stringify([composant.releve, composant.catalogue]), empreinte(sa), `${entree.id} : annuler ne redonne pas la base`);
  }
  const copie = copierLeComposant(base);
  assert.deepEqual(constatsDeLaPortee(copie.releve, copie.catalogue), []);
  assert.equal(JSON.stringify(base), baseAvant);
});
