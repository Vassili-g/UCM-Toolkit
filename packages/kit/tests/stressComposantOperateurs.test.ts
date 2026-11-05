/**
 * Garde les opérateurs L, R et K du harnais de stress F3 : leurs nombres de cas contre la section 3.3 du plan, la forme des cas,
 * un échantillon d'oracles écrits à la main, et la cohérence de chaque dégradation (dégrader puis annuler redonne la base).
 * Le test ne mesure pas le kit : un écart du kit sur ces cas est un résultat du harnais, pas un échec d'ici. Les tests qui lisent
 * l'état dégradé passent avant celui qui annule, parce que `annuler` défait les copies que les cas partagent.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { collectionParCle } from '../src/controles/catalogue.js';
import { comparer } from './stress/commun/comparer.js';
import { constatsDeLaPortee, copierLeComposant } from './stress/f3-composant/composantDeBase.js';
import { cleDeConstat, operateursAxes, porteeAdmise, type CasDeComposant } from './stress/f3-composant/operateursAxes.js';
import { operateursCibles } from './stress/f3-composant/operateursCibles.js';
import { operateursRoles } from './stress/f3-composant/operateursRoles.js';
import { composantDuProfil, PROFIL_ALPHA, PROFIL_P0, PROFILS_DE_BASE } from './stress/f3-composant/profils.js';

const base = composantDuProfil(PROFIL_P0);
const baseAvant = JSON.stringify(base);
const L = operateursAxes(base);
const R = operateursRoles(base);
const K = operateursCibles(base);
const TOUS: CasDeComposant[] = [...L, ...R, ...K];
const cas = (id: string): CasDeComposant => TOUS.find((entree) => entree.id === id)!;
const duOperateur = (operateur: string) => TOUS.filter((entree) => entree.operateur === operateur);
const nomFinal = (nom: string | undefined) => nom?.split('/').at(-1);

test('les opérateurs rendent les nombres de cas de la section 3.3 du plan : 60 L, 27 R, 63 K', () => {
  const attendus: Record<string, number> = { L1: 20, L2: 16, L3: 8, L4: 10, L5: 6, R1: 22, R2: 5, K1: 10, K2: 13, K3: 16, K4: 24 };
  for (const [operateur, nombre] of Object.entries(attendus)) assert.equal(duOperateur(operateur).length, nombre, operateur);
  assert.deepEqual([L.length, R.length, K.length], [60, 27, 63]);
});

test('chaque cas a un identifiant <opérateur>-<n>, une description, des zones et un verdict cohérent', () => {
  assert.equal(new Set(TOUS.map((entree) => entree.id)).size, TOUS.length);
  for (const operateur of ['L1', 'L2', 'L3', 'L4', 'L5', 'R1', 'R2', 'K1', 'K2', 'K3', 'K4']) {
    duOperateur(operateur).forEach((entree, rang) => assert.equal(entree.id, `${operateur}-${rang + 1}`));
  }
  const identifiantsDeBase = new Set(base.releve.variants.map((variant) => variant.id));
  for (const entree of TOUS) {
    assert.equal(entree.famille, 'F3');
    assert.ok(entree.entree.description.startsWith(entree.operateur), entree.id);
    assert.ok(entree.entree.zones.length > 0, entree.id);
    for (const zone of entree.entree.zones) assert.ok(identifiantsDeBase.has(zone.variant), `${entree.id} ${zone.variant}`);
    assert.equal(entree.verdict === 'mesure', entree.question !== undefined, entree.id);
    assert.ok(!entree.codesJuges?.includes('C21'), 'C21 relève de M1');
    for (const attendu of entree.attendus) {
      assert.ok(attendu.cle.split('|').length === 5, `${entree.id} ${attendu.cle}`);
      if (attendu.forme === 'correction') {
        // Une correction vise un token de components, jamais theme, layout, brands, utility ni primitives (P6).
        const cible = entree.entree.composant.catalogue.variables.find((variable) => variable.cle === attendu.apres?.cle);
        assert.ok(cible, `${entree.id} cible ${attendu.apres?.cle}`);
        assert.equal(collectionParCle(entree.entree.composant.catalogue, cible.collection)?.role, 'components', entree.id);
      }
    }
  }
});

test('les cas qui dépendent d\'une question non confirmée portent le verdict mesure et son identifiant', () => {
  const mesures = TOUS.filter((entree) => entree.verdict === 'mesure').map((entree) => [entree.id, entree.question]);
  assert.deepEqual(mesures, [
    ['L5-1', 'Q-F3-12'], ['L5-2', 'Q-F3-12'],
    ['K3-4', 'Q-F3-15'], ['K3-8', 'Q-F3-15'], ['K3-12', 'Q-F3-15'],
  ]);
});

test('L1 : hover lié au token default est une question, les autres transitions des corrections vers le token du variant', () => {
  const l1 = duOperateur('L1');
  // Les questions : les quatre liaisons de la première transition, puis le premier cas de la seconde plage et celui de Glyph.
  const parmiLesQuestions = [...l1.slice(0, 4), l1[16], l1[18]];
  for (const entree of parmiLesQuestions) {
    const [constat] = entree.attendus;
    assert.deepEqual([entree.attendus.length, constat.code, constat.forme, constat.candidats?.length], [1, 'C16', 'question', 1], entree.id);
    assert.ok(constat.cle.includes('/default/'), `${entree.id} lit le token default`);
    assert.ok(constat.candidats![0].includes('/hover/'), entree.id);
  }
  for (const entree of l1.filter((autre) => !parmiLesQuestions.includes(autre))) {
    const [constat] = entree.attendus;
    assert.deepEqual([constat.code, constat.forme], ['C16', 'correction'], entree.id);
  }
  // L1-5 : variant default lié au token hover, correction vers le token default du même rôle.
  const [l15] = cas('L1-5').attendus;
  assert.ok(l15.cle.includes('/hover/'));
  assert.ok(l15.apres!.nom!.includes('/default/'));
  assert.equal(nomFinal(l15.apres!.nom), 'background');
  // Les quatre derniers cas portent la seconde plage de texte puis la surcharge de Glyph.
  assert.deepEqual(l1.slice(16).map((entree) => entree.entree.description.match(/\((texte-2|glyph)\)/)?.[1]), ['texte-2', 'texte-2', 'glyph', 'glyph']);
});

test('L2 à L5 : corrections vers le token du variant, questions pour la palette absente ou en double, témoins sans constat', () => {
  for (const entree of [...duOperateur('L2').slice(0, 12), ...duOperateur('L3'), ...duOperateur('L4')]) {
    assert.deepEqual(entree.attendus.map((constat) => [constat.code, constat.forme]), [['C22', 'correction']], entree.id);
  }
  for (const entree of duOperateur('L4')) assert.ok(entree.attendus[0].apres!.nom!.startsWith('button/size/'), entree.id);
  const [absent1, absent2, double1, double2] = duOperateur('L2').slice(12);
  for (const entree of [absent1, absent2]) assert.deepEqual([entree.attendus[0].forme, entree.attendus[0].candidats], ['question', []], entree.id);
  for (const entree of [double1, double2]) {
    const [constat] = entree.attendus;
    assert.equal(constat.candidats!.length, 2);
    assert.equal(constat.candidats![0], constat.candidats![1]);
  }
  assert.deepEqual(duOperateur('L5').map((entree) => entree.attendus.length), [1, 1, 0, 0, 0, 0]);
});

test('R1 : un C24 vers le rôle attendu de la cible, plus un C18 quand le token pris a des scopes incompatibles', () => {
  const r1 = duOperateur('R1');
  const attenduParGroupe = [['background', 5], ['border', 4], ['foreground', 4], ['icon', 4], ['ring', 5]] as const;
  let rang = 0;
  for (const [role, nombre] of attenduParGroupe) {
    for (const entree of r1.slice(rang, rang + nombre)) {
      const [c24] = entree.attendus;
      assert.deepEqual([c24.code, c24.forme, nomFinal(c24.apres?.nom)], ['C24', 'correction', role], entree.id);
      for (const autre of entree.attendus.slice(1)) assert.deepEqual([autre.code, autre.forme], ['C18', 'a-faire'], entree.id);
    }
    rang += nombre;
  }
  // Fond : border et ring ont des scopes de trait. Trait : background, text et icon ont ALL_FILLS. Texte : border et ring. Icône : border et ring. Anneau : tout sauf border.
  assert.equal(r1.reduce((somme, entree) => somme + entree.attendus.length - 1, 0), 13);
  assert.deepEqual(duOperateur('R2').map((entree) => entree.attendus[0].candidats?.length), [0, 0, 0, 2, 2]);
});

test('K1 : C19 seul sur le token d\'un autre composant ; K2 : C80 seul, deux témoins sans constat', () => {
  for (const entree of duOperateur('K1')) {
    assert.deepEqual(entree.attendus.map((constat) => constat.code), ['C19'], entree.id);
    assert.ok(/^alert|^button-group/.test(entree.attendus[0].cle.split('|')[4]), entree.id);
  }
  assert.deepEqual(duOperateur('K2').map((entree) => entree.attendus.map((constat) => constat.code)), [
    ...Array.from({ length: 11 }, () => ['C80']), [], [],
  ]);
});

test('K3 : un C20 par liaison du token dont l\'alias vise une couche interdite, rien pour les cibles admises', () => {
  const k3 = duOperateur('K3');
  const avecC20 = k3.filter((entree) => entree.attendus.length > 0).map((entree) => entree.id);
  assert.deepEqual(avecC20, ['K3-1', 'K3-2', 'K3-3', 'K3-4', 'K3-6', 'K3-7', 'K3-8', 'K3-12', 'K3-13', 'K3-14']);
  // Un token de taille sert tous les variants de sa taille : 18 liaisons sur P0.
  for (const id of ['K3-6', 'K3-7', 'K3-8']) assert.equal(cas(id).attendus.length, 18, id);
  for (const id of ['K3-1', 'K3-4', 'K3-12', 'K3-13', 'K3-14']) assert.equal(cas(id).attendus.length, 1, id);
  assert.ok(k3.every((entree) => entree.attendus.every((constat) => constat.code === 'C20')));
  // Les deux derniers cas à deux modes partent d'une base à deux modes.
  assert.deepEqual([cas('K3-13').entree.base.spec.modesDeTaille, cas('K3-14').entree.base.spec.modesDeTaille, cas('K3-1').entree.base.spec.modesDeTaille], [2, 2, 1]);
});

test('K4 : un C18 pour les 6 jeux incompatibles seulement, un par cible', () => {
  const k4 = duOperateur('K4');
  const avecC18 = k4.filter((entree) => entree.attendus.length > 0).map((entree) => entree.id);
  assert.deepEqual(avecC18, ['K4-3', 'K4-7', 'K4-11', 'K4-15', 'K4-19', 'K4-23']);
  assert.equal(porteeAdmise(['FRAME_FILL'], 'forme'), false);
  assert.equal(porteeAdmise(['ALL_FILLS'], 'trait'), false);
  assert.equal(porteeAdmise([], 'texte'), true);
  assert.equal(porteeAdmise(['ALL_SCOPES'], 'trait'), true);
});

test('un oracle sans constat attendu laisse comparer rendre tous les attendus en manque', () => {
  const resultat = comparer(cas('R1-1'), [], cleDeConstat);
  assert.equal(resultat.ecarts.length, cas('R1-1').attendus.length);
  assert.ok(resultat.ecarts.every((ecart) => ecart.sorte === 'manque'));
});

test('trois cas passent par les contrôles du kit et `comparer` sans lever', () => {
  for (const id of ['L1-1', 'R1-1', 'K1-1']) {
    const copie = copierLeComposant(cas(id).entree.composant);
    const resultat = comparer(cas(id), constatsDeLaPortee(copie.releve, copie.catalogue), cleDeConstat);
    assert.equal(resultat.attendus, cas(id).attendus.length);
  }
});

test('les opérateurs tournent sur d\'autres profils : Pα garde ses cas, Badge lit Type et Tone, ses cas restent attendus (Q-F5-1)', () => {
  const alpha = composantDuProfil(PROFIL_ALPHA);
  const casAlpha = [...operateursAxes(alpha), ...operateursRoles(alpha), ...operateursCibles(alpha)];
  assert.equal(casAlpha.filter((entree) => entree.operateur === 'L1').length, 0, 'alert-11 n\'a pas d\'axe d\'états');
  assert.ok(casAlpha.filter((entree) => entree.operateur === 'K4').length === 24);
  assert.ok(casAlpha.every((entree) => entree.question !== 'Q-08'));
  const badge = composantDuProfil(PROFILS_DE_BASE.find((profil) => profil.forme === 'badge-9' && profil.imbriques && profil.plages === 2 && profil.modesDeTaille === 1)!);
  const casBadge = operateursAxes(badge);
  assert.ok(casBadge.some((entree) => entree.operateur === 'L2'));
  assert.ok(casBadge.every((entree) => entree.verdict === 'attendu' && entree.question === undefined), 'Type (style) et Tone (palette) ont un rôle');
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
  for (const operateur of ['L1', 'R1', 'K2', 'K3', 'K4']) {
    const premier = duOperateur(operateur)[0].entree;
    assert.deepEqual(premier.composant.releve, premier.base.releve, operateur);
    assert.deepEqual(premier.composant.catalogue, premier.base.catalogue, operateur);
  }
  // La base redonne ses constats : aucun, comme avant toute dégradation.
  const copie = copierLeComposant(base);
  assert.deepEqual(constatsDeLaPortee(copie.releve, copie.catalogue), []);
  assert.equal(JSON.stringify(base), baseAvant);
});
