/** Le classement des cartes des trois états de galerie, leurs nombres et les limites d'une analyse partielle. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { SIGNES, REPRISES_DE_SIGNES } from '@ucm-kit/core/referentiel';
import type { PluginMessage } from '../src/messages';
import type { Releve } from '../src/modele';
import { lireLesCategories, type DonneesDesCategories } from '../src/ui/tokens/categories';

interface EtatDeGalerie {
  readonly id: string;
  readonly atteinte: readonly { readonly message?: PluginMessage }[];
}

const { ETATS: NOMENCLATURE } = require('../galerie/etats/nomenclature.cjs') as { ETATS: readonly EtatDeGalerie[] };
const { ETATS: STRUCTURE } = require('../galerie/etats/structure.cjs') as { ETATS: readonly EtatDeGalerie[] };

/** Les données que les messages de cet état ont rendues, sans rejouer les gestes du DOM. */
function donneesDe(id: string): DonneesDesCategories {
  const etat = [...NOMENCLATURE, ...STRUCTURE].find((candidat) => candidat.id === id);
  assert.ok(etat, id);
  let nomenclature: DonneesDesCategories['nomenclature'] = null;
  let constats: DonneesDesCategories['constats'] = [];
  let corrections: DonneesDesCategories['corrections'] = [];
  let releve: Releve | null = null;
  for (const { message } of etat.atteinte) {
    if (message?.type === 'bilan') nomenclature = message.bilan;
    if (message?.type === 'structure') ({ constats, corrections } = message);
    if (message?.type === 'releve') releve = message.releve;
  }
  const collections = new Map(releve?.collections.map(({ id: cle, nom }) => [cle, nom]));
  const noms = new Map(releve?.variables.map(({ id: cle, nom, collection }) => [cle, `${collections.get(collection)}/${nom}`]));
  return {
    nomenclature, constats, corrections, partielle: false,
    noms: { nom: (cle) => noms.get(cle) ?? null, cle: (nom) => [...noms].find(([, entier]) => entier === nom)?.[0] ?? null },
  };
}

const IDENTIFIANTS = ['noms', 'manquantes', 'crans', 'alias', 'modes', 'valeurs', 'couches', 'types', 'rangement', 'scopes'];
const LIBELLES = ['Noms', 'Variables manquantes', 'Crans', 'Alias', 'Modes', 'Valeurs', 'Couches', 'Types', 'Rangement', 'Scopes'];
const SIGNES_ATTENDUS = ['nom', 'a-creer', 'cran', 'rompue', 'mode', 'valeurs', 'couches', 'types', 'rangement', 'scope'];

for (const [id, attendus] of [
  ['a-appliquer', [7, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  ['t-integrite-a-faire', [0, 2, 1, 0, 2, 0, 4, 1, 1, 0]],
  ['t-structure', [7, 0, 0, 2, 2, 2, 1, 0, 0, 1]],
] as const) {
  test(`${id} rend les dix catégories, signes et nombres de cartes`, () => {
    const categories = lireLesCategories(donneesDe(id));
    assert.deepEqual(categories.map(({ id }) => id), IDENTIFIANTS);
    assert.deepEqual(categories.map(({ libelle }) => libelle), LIBELLES);
    assert.deepEqual(categories.map(({ signe }) => signe), SIGNES_ATTENDUS);
    assert.deepEqual(categories.map(({ famille }) => famille), Array(10).fill('rubrique-tokens'));
    assert.deepEqual(categories.map(({ nombre }) => nombre), attendus);
    assert.deepEqual(categories.map(({ cartes }) => cartes.length), attendus);
    assert.deepEqual(categories.map(({ tenue }) => tenue), attendus.map((nombre) => nombre === 0));
  });
}

test('chaque signe de catégorie appartient au kit et à la famille rubrique-tokens', () => {
  const repris = REPRISES_DE_SIGNES.find(({ famille }) => famille === 'rubrique-tokens')?.reprend ?? [];
  for (const { signe } of lireLesCategories(donneesDe('a-appliquer'))) {
    assert.ok(SIGNES.some(({ id }) => id === signe), signe);
    assert.ok(SIGNES.some(({ id, famille }) => id === signe && famille === 'rubrique-tokens') || repris.some(({ id }) => id === signe), signe);
  }
});

test('une analyse partielle ne rend aucune catégorie tenue, même vide', () => {
  for (const id of ['a-appliquer', 't-integrite-a-faire', 't-structure']) {
    const donnees = donneesDe(id);
    const completes = lireLesCategories(donnees);
    const partielles = lireLesCategories({ ...donnees, partielle: true });
    assert.ok(partielles.every(({ tenue }) => !tenue));
    assert.deepEqual(partielles.map(({ nombre }) => nombre), completes.map(({ nombre }) => nombre));
  }
});

test('les questions précèdent les autres cartes sans changer les objets de Nomenclature', () => {
  const donnees = donneesDe('a-appliquer');
  const avant = JSON.stringify(donnees);
  const [noms] = lireLesCategories(donnees);
  assert.deepEqual(noms.cartes.map(({ sorte }) => sorte), ['question-de-nom', 'question-de-nom', 'question-de-nom', 'renommage', 'renommage', 'renommage', 'renommage']);
  const premiereQuestion = noms.cartes[0];
  const premierRenommage = noms.cartes[3];
  assert.ok(premiereQuestion.sorte === 'question-de-nom' && premiereQuestion.question === donnees.nomenclature?.questions[0]);
  assert.ok(premierRenommage.sorte === 'renommage' && premierRenommage.groupe === donnees.nomenclature?.groupes[0]);
  assert.equal(JSON.stringify(donnees), avant);
});

test('les corrections regroupées comptent une carte et chaque ligne une seule fois', () => {
  const donnees = donneesDe('t-structure');
  const avant = JSON.stringify(donnees);
  const categories = lireLesCategories(donnees);
  const scopes = categories.find(({ id }) => id === 'scopes')!;
  assert.equal(scopes.nombre, 1);
  assert.equal(scopes.cartes[0].sorte, 'correction');
  const cartes = categories.flatMap(({ cartes }) => cartes);
  const idsDeCorrections = cartes.flatMap((carte) => carte.sorte === 'correction' ? carte.correction.lignes.map(({ id }) => id) : []);
  assert.equal(idsDeCorrections.length, 4);
  assert.equal(new Set(idsDeCorrections).size, 4);
  assert.deepEqual([...idsDeCorrections].sort(), donnees.corrections.map(({ id }) => id).sort());
  const idsDeConstats = cartes.flatMap((carte) => carte.sorte === 'constat' ? [carte.constat.id] : []);
  assert.equal(idsDeConstats.length, 6);
  assert.equal(new Set(idsDeConstats).size, 6);
  assert.equal(JSON.stringify(donnees), avant);
});

test('une question de structure reste dans sa catégorie et passe avant les autres constats', () => {
  const donnees = donneesDe('t-structure');
  const valeurs = lireLesCategories(donnees).find(({ id }) => id === 'valeurs')!;
  assert.deepEqual(valeurs.cartes.map(({ estUneQuestion }) => estUneQuestion), [true, false]);
  const crans = lireLesCategories(donneesDe('t-integrite-a-faire')).find(({ id }) => id === 'crans')!;
  assert.deepEqual(crans.cartes.map(({ estUneQuestion }) => estUneQuestion), [true]);
});
