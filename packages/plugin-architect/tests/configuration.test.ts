/** Le domaine configuration : le niveau d'accessibilité, la library choisie, et ce que l'analyse en lit. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { CLES_D_ARCHITECT, ESPACE_ARCHITECT } from '@ucm-kit/core/referentiel';

import type { PluginMessage } from '../src/messages';
import { retenirLesLiaisons } from '../src/sandbox/bibliotheque';
import { CLE_DU_NIVEAU, libraryDeReference, lireLeNiveau, traiter } from '../src/sandbox/configuration';
import type { Contexte } from '../src/sandbox/contexte';

interface Collection { key: string; name: string; libraryName: string; variables: { key: string; name: string; resolvedType: string }[] }

function banc(collections: Collection[], options: { donnees?: Map<string, string>; sansTeamLibrary?: boolean; stockageQuiLeve?: boolean } = {}) {
  const stockage = new Map<string, unknown>();
  const donnees = options.donnees ?? new Map<string, string>();
  const envoyes: PluginMessage[] = [];
  const figma = {
    clientStorage: {
      async getAsync(cle: string) { if (options.stockageQuiLeve) throw new Error('stockage'); return stockage.get(cle); },
      async setAsync(cle: string, valeur: unknown) { if (options.stockageQuiLeve) throw new Error('stockage'); stockage.set(cle, valeur); },
    },
    root: {
      getSharedPluginData(espace: string, cle: string) { return donnees.get(`${espace}/${cle}`) ?? ''; },
      setSharedPluginData(espace: string, cle: string, valeur: string) { donnees.set(`${espace}/${cle}`, valeur); },
    },
    ...(options.sansTeamLibrary ? {} : {
      teamLibrary: {
        async getAvailableLibraryVariableCollectionsAsync() { return collections.map(({ key, name, libraryName }) => ({ key, name, libraryName })); },
        async getVariablesInLibraryCollectionAsync(cle: string) { return collections.find((c) => c.key === cle)!.variables; },
      },
    }),
  };
  const contexte: Contexte = { figma: figma as unknown as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument() {} };
  const derniere = () => envoyes.filter((m) => m.type === 'configuration').at(-1) as Extract<PluginMessage, { type: 'configuration' }>;
  return { contexte, stockage, donnees, derniere, figma: figma as unknown as PluginAPI };
}

const deux: Collection[] = [
  { key: 'a1', name: 'theme', libraryName: 'Alpha', variables: [{ key: 'va', name: 'x', resolvedType: 'COLOR' }] },
  { key: 'b1', name: 'theme', libraryName: 'Beta', variables: [{ key: 'vb', name: 'x', resolvedType: 'COLOR' }] },
];
const CLE_RANGEE = `${ESPACE_ARCHITECT}/${CLES_D_ARCHITECT.libraryChoisie}`;

test('sans niveau rangé, la configuration dit AA ; un niveau rangé est relu', async () => {
  const b = banc(deux);
  await traiter({ type: 'lire-configuration' }, b.contexte);
  assert.equal(b.derniere().niveau, 'AA');
  await traiter({ type: 'ranger-niveau', niveau: 'AAA' }, b.contexte);
  assert.equal(b.stockage.get(CLE_DU_NIVEAU), 'AAA');
  assert.equal(b.derniere().niveau, 'AAA');
  assert.equal(await lireLeNiveau(b.figma), 'AAA');
});

test('le niveau est une préférence : rien n’est écrit dans le document, et un stockage illisible rend AA', async () => {
  const b = banc(deux);
  await traiter({ type: 'ranger-niveau', niveau: 'AAA' }, b.contexte);
  assert.equal(b.donnees.size, 0);
  const casse = banc(deux, { stockageQuiLeve: true });
  await traiter({ type: 'ranger-niveau', niveau: 'AAA' }, casse.contexte);
  assert.equal(casse.derniere().niveau, 'AA');
  assert.equal(CLE_DU_NIVEAU, `${ESPACE_ARCHITECT}.${CLES_D_ARCHITECT.niveauDeContraste}`);
});

test('plusieurs libraries sans liaison : aucune choisie, chaque candidate à zéro liaison', async () => {
  retenirLesLiaisons(new Map());
  const b = banc(deux);
  await traiter({ type: 'lire-configuration' }, b.contexte);
  assert.equal(b.derniere().library, null);
  assert.deepEqual(b.derniere().candidates, [{ cle: 'Alpha', nom: 'Alpha', liaisons: 0 }, { cle: 'Beta', nom: 'Beta', liaisons: 0 }]);
});

test('les liaisons de la dernière analyse désignent la library et ordonnent les candidates', async () => {
  retenirLesLiaisons(new Map([['va', 1], ['vb', 5]]));
  const b = banc(deux);
  await traiter({ type: 'lire-configuration' }, b.contexte);
  assert.equal(b.derniere().library?.nom, 'Beta');
  assert.deepEqual(b.derniere().candidates.map((c) => [c.nom, c.liaisons]), [['Beta', 5], ['Alpha', 1]]);
  retenirLesLiaisons(new Map());
});

test('le choix rangé est écrit dans le document, partagé, et prime sur les liaisons', async () => {
  retenirLesLiaisons(new Map([['vb', 5]]));
  const b = banc(deux);
  await traiter({ type: 'ranger-library', cle: 'Alpha' }, b.contexte);
  assert.equal(b.donnees.get(CLE_RANGEE), 'Alpha');
  assert.equal(b.derniere().library?.nom, 'Alpha');
  assert.equal(b.stockage.size, 0);
  retenirLesLiaisons(new Map());
});

test('une library rangée qui n’est plus lisible : library null, aucune exception', async () => {
  const donnees = new Map([[CLE_RANGEE, 'Disparue']]);
  const b = banc(deux, { donnees });
  await traiter({ type: 'lire-configuration' }, b.contexte);
  assert.equal(b.derniere().library, null);
  const sans = banc(deux, { donnees, sansTeamLibrary: true });
  await traiter({ type: 'lire-configuration' }, sans.contexte);
  assert.deepEqual([sans.derniere().library, sans.derniere().candidates], [null, []]);
});

test('une seule library lisible est celle de référence, une rangée lisible la remplace', () => {
  const collection = (library: string) => ({ cle: library, nom: 't', library, variables: [] });
  assert.equal(libraryDeReference([collection('Alpha')], new Map(), null), 'Alpha');
  assert.equal(libraryDeReference([collection('Alpha'), collection('Beta')], new Map(), 'Beta'), 'Beta');
  assert.equal(libraryDeReference([collection('Alpha')], new Map(), 'Disparue'), 'Alpha');
});
