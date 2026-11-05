/**
 * Garde les opérateurs Z (C29) et X (entrées dégradées) et les faux positifs du harnais de stress F3 et F4 : leurs nombres de cas
 * contre les sections 3.3 et 4 du plan, la forme des cas, la borne de chaque cas Z2, un échantillon d'oracles écrits à la main et
 * la cohérence de chaque dégradation (dégrader puis annuler redonne la base). Les 96 profils de A0 ne se construisent pas ici : le
 * test en compte la liste et en construit deux.
 * Le test ne mesure pas le kit : un écart du kit sur ces cas est un résultat du harnais. Le test d'annulation passe en dernier,
 * parce que `annuler` défait les copies que les cas partagent.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { comparer } from './stress/commun/comparer.js';
import { constatsDeLaPortee, copierLeComposant } from './stress/f3-composant/composantDeBase.js';
import { fauxPositifsCibles, fauxPositifsDesProfils } from './stress/f3-composant/fauxPositifs.js';
import type { CasDeComposant } from './stress/f3-composant/operateursAxes.js';
import { operateursEntrees } from './stress/f3-composant/operateursEntrees.js';
import { cleDeConstatEtendue } from './stress/f3-composant/operateursModele.js';
import { borneDeProximite, entreeDeTaille, operateursTailles } from './stress/f3-composant/operateursTailles.js';
import { composantDuProfil, PROFIL_P0, PROFILS_DE_BASE } from './stress/f3-composant/profils.js';

const base = composantDuProfil(PROFIL_P0);
const baseAvant = JSON.stringify(base);
const Z = operateursTailles(base);
const X = operateursEntrees(base);
const A = fauxPositifsCibles(base);
const TOUS: CasDeComposant[] = [...Z, ...X, ...A];
const cas = (id: string): CasDeComposant => TOUS.find((entree) => entree.id === id)!;
const duOperateur = (operateur: string) => TOUS.filter((entree) => entree.operateur === operateur);
const formes = (entree: CasDeComposant) => entree.attendus.map((attendu) => `${attendu.code}:${attendu.forme}`);
const mesures = (operateur: string) => duOperateur(operateur).filter((entree) => entree.verdict === 'mesure').map((entree) => [entree.id, entree.question]);

test('les opérateurs rendent les nombres de cas du plan : 119 Z, 24 X, 43 thèmes ciblés et 96 profils', () => {
  const attendus: Record<string, number> = {
    Z1: 12, Z2: 42, Z3: 9, Z4: 6, Z5: 13, Z6: 5, Z7: 12, Z8: 20, X1: 12, X2: 12,
    A1: 8, A2: 8, A3: 6, A4: 4, A5: 4, A6: 6, A7: 3, A8: 2, A9: 2,
  };
  for (const [operateur, nombre] of Object.entries(attendus)) assert.equal(duOperateur(operateur).length, nombre, operateur);
  assert.deepEqual([Z.length, X.length, A.length], [119, 24, 43]);
  assert.equal(PROFILS_DE_BASE.length, 96);
  const deux = fauxPositifsDesProfils(PROFILS_DE_BASE.slice(0, 2));
  assert.deepEqual(deux.map((entree) => entree.id), ['A0-1', 'A0-2']);
  assert.ok(deux.every((entree) => entree.attendus.length === 0 && entree.entree.zones.length === 0 && entree.famille === 'A'));
});

test('chaque cas a un identifiant <opérateur>-<n>, une description, des zones, des codes jugés et un verdict cohérent', () => {
  assert.equal(new Set(TOUS.map((entree) => entree.id)).size, TOUS.length);
  for (const operateur of ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'X1', 'X2', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9']) {
    duOperateur(operateur).forEach((entree, rang) => assert.equal(entree.id, `${operateur}-${rang + 1}`));
  }
  for (const entree of TOUS) {
    assert.equal(entree.famille, entree.operateur.startsWith('Z') ? 'F4' : entree.operateur.startsWith('X') ? 'F3' : 'A', entree.id);
    assert.ok(entree.entree.description.startsWith(entree.operateur), entree.id);
    assert.ok(entree.entree.zones.length > 0, entree.id);
    const identifiants = new Set(entree.entree.base.releve.variants.map((variant) => variant.id));
    for (const zone of entree.entree.zones) assert.ok(identifiants.has(zone.variant), `${entree.id} ${zone.variant}`);
    assert.equal(entree.verdict === 'mesure', entree.question !== undefined, entree.id);
    assert.ok(entree.codesJuges, `${entree.id} sans codes jugés`);
    for (const attendu of entree.attendus) {
      assert.equal(attendu.code, 'C29', entree.id);
      assert.ok(entree.codesJuges!.includes('C29'), entree.id);
      if (attendu.forme === 'correction') {
        assert.ok(attendu.apres?.cle && attendu.apres.nom, `${entree.id} correction sans cible`);
        const cible = entree.entree.composant.catalogue.variables.find((variable) => variable.cle === attendu.apres?.cle);
        const role = entree.entree.composant.catalogue.collections.find((collection) => collection.cle === cible?.collection)?.role;
        assert.equal(role, 'components', `${entree.id} cible ${attendu.apres?.cle}`);
      }
    }
  }
  assert.deepEqual(duOperateur('X2').map((entree) => entree.codesJuges), Array(12).fill([]), 'X2 ne juge aucun code : il mesure l\'absence d\'exception');
  assert.ok(duOperateur('X1').every((entree) => entree.attendus.length === 0));
});

test('les décisions Q-F3-3, Q-F3-11, Q-F3-13 et Q-F3-14 sont acquises : aucun cas de Z ni de A ne porte le verdict mesure', () => {
  assert.deepEqual(['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'X1', 'X2'].flatMap(mesures), []);
  assert.deepEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'].flatMap(mesures), []);
});

test('Z1 : un C29 par champ, une correction vers le token de la propriété sauf pour counterAxisSpacing', () => {
  assert.deepEqual(duOperateur('Z1').map(formes), [...Array(5).fill(['C29:correction']), ['C29:a-faire'], ...Array(6).fill(['C29:correction'])]);
  assert.ok(cas('Z1-1').attendus[0].apres!.nom!.endsWith('/padding-x'));
  assert.ok(cas('Z1-5').attendus[0].apres!.nom!.endsWith('/gap'));
  assert.ok(cas('Z1-12').attendus[0].apres!.nom!.endsWith('/border-width'));
});

test('Z2 : chaque cas déclare la borne de la SPEC, une question pour un écart d\'au plus la borne, aucun candidat au-delà', () => {
  assert.deepEqual([0.5, 4, 10, 16, 30, 100].map(borneDeProximite), [0.1, 0.4, 1, 1.6, 2, 2]);
  assert.equal(borneDeProximite(0), 0);
  const z2 = duOperateur('Z2');
  const bornes = [0.1, 0.4, 1, 1.6, 2, 2];
  z2.forEach((entree, rang) => assert.equal(entreeDeTaille(entree).borne, bornes[Math.floor(rang / 7)], entree.id));
  // Pour chaque valeur : à la borne (2 côtés), en deçà (2), au-delà (2), puis un token de chaque côté.
  const attendusParValeur = ['C29:question', 'C29:question', 'C29:question', 'C29:question', 'C29:a-faire', 'C29:a-faire', 'C29:question'];
  z2.forEach((entree, rang) => assert.deepEqual(formes(entree), [attendusParValeur[rang % 7]], entree.id));
  assert.equal(z2[6].attendus[0].candidats!.length, 2, 'les deux côtés présents : un proche par côté');
  assert.ok(z2.every((entree) => entree.attendus[0].forme !== 'correction'), 'un proche n\'est jamais une correction');
});

test('Z3 à Z8 : les oracles du plan, écrits à la main', () => {
  assert.deepEqual(duOperateur('Z3').map((entree) => entree.attendus[0].forme), ['correction', 'correction', 'correction', 'question', 'correction', 'correction', 'correction', 'question', 'correction']);
  assert.deepEqual(duOperateur('Z4').map(formes), [['C29:question'], ['C29:correction'], ['C29:question'], ['C29:question'], ['C29:question'], ['C29:question']]);
  assert.deepEqual(duOperateur('Z4').map((entree) => entree.attendus[0].candidats?.length), [2, undefined, 2, 2, 1, 2]);
  assert.deepEqual(duOperateur('Z5').map((entree) => entree.attendus[0].forme),
    ['a-faire', 'a-faire', 'a-faire', 'correction', 'a-faire', 'correction', 'a-faire', 'correction', 'a-faire', 'a-faire', 'a-faire', 'a-faire', 'correction']);
  assert.deepEqual(duOperateur('Z6').map((entree) => entreeDeTaille(entree).recherche), ['incomplete', 'incomplete', 'incomplete', 'incomplete', 'ordinaire']);
  assert.deepEqual(duOperateur('Z6').map((entree) => entree.attendus[0].forme), ['a-faire', 'a-faire', 'a-faire', 'a-faire', 'correction']);
  assert.deepEqual(duOperateur('Z7').map((entree) => entree.attendus.length), [1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 2]);
  const z7 = cas('Z7-12').attendus;
  assert.notEqual(z7[0].cle, z7[1].cle, 'deux C29 distincts pour un même identifiant de layer');
  // Z8 : correction pour la propriété du registre dans la famille `size`, aucun candidat pour les quatre autres propriétés.
  const z8 = duOperateur('Z8').map((entree) => entree.attendus[0].forme);
  assert.deepEqual(z8.slice(0, 10), ['correction', 'correction', 'a-faire', 'correction', 'correction', 'correction', 'correction', 'a-faire', 'a-faire', 'a-faire']);
  assert.deepEqual(z8.slice(10), z8.slice(0, 10));
});

test('X1 et X2 : aucun constat attendu, le cas du fond illisible ne juge pas C80', () => {
  assert.ok(duOperateur('X1').every((entree) => entree.attendus.length === 0));
  assert.ok(duOperateur('X2').every((entree) => entree.attendus.length === 0));
  assert.ok(!cas('X1-4').codesJuges!.includes('C80') && cas('X1-4').codesJuges!.includes('C59'));
  assert.ok(cas('X1-12').entree.composant.catalogue.variables.length === 0);
  assert.equal(cas('X1-2').entree.composant.releve.lecture.layersNonLus, 'inconnu');
  assert.ok(cas('X1-5').entree.composant.releve.variants.every((variant) => variant.layers.every((layer) => layer.liaisons.every((liaison) => liaison.illisible !== true || liaison.variable.cle === ''))));
});

test('cinq cas passent par les contrôles du kit et `comparer` sans lever', () => {
  for (const id of ['Z1-1', 'Z2-1', 'Z7-4', 'X1-2', 'A5-1']) {
    const copie = copierLeComposant(cas(id).entree.composant);
    const resultat = comparer(cas(id), constatsDeLaPortee(copie.releve, copie.catalogue), cleDeConstatEtendue);
    assert.equal(resultat.attendus, cas(id).attendus.length);
  }
  const copie = copierLeComposant(cas('Z1-1').entree.composant);
  assert.equal(comparer(cas('Z1-1'), constatsDeLaPortee(copie.releve, copie.catalogue), cleDeConstatEtendue).detectes, 1);
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
    // Les thèmes A1 reconstruisent le composant avec une autre écriture de valeur d'axe : leur base est cette reconstruction, sans dégradation.
    if (entree.operateur !== 'A1') assert.notEqual(degradee, empreinte(sa), `${entree.id} ne dégrade rien`);
    annuler();
    assert.equal(JSON.stringify([composant.releve, composant.catalogue]), empreinte(sa), `${entree.id} : annuler ne redonne pas la base`);
  }
  const copie = copierLeComposant(base);
  assert.deepEqual(constatsDeLaPortee(copie.releve, copie.catalogue), []);
  assert.equal(JSON.stringify(base), baseAvant);
});
