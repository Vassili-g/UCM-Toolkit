/** Le domaine configuration : le niveau d'accessibilité, la library choisie, et ce que l'analyse en lit. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { CLES_D_ARCHITECT, ESPACE_ARCHITECT, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { journaliserLesCreations } from '../src/ecriture/journal';
import { creerPortDeRegles } from '../src/ecriture/noms';
import type { PluginMessage } from '../src/messages';
import { retenirLesLiaisons } from '../src/sandbox/bibliotheque';
import { CLE_DU_NIVEAU, libraryDeReference, lireLeNiveau, traiter } from '../src/sandbox/configuration';
import type { Contexte } from '../src/sandbox/contexte';
import { commencerUneAnalyse, correctionsDeLAnalyse, prendreLaPlaceDUneEcriture, reinitialiserLAnalyse } from '../src/sandbox/analyse';
import { atelierDEcriture, type VariableDEcriture } from './figmaDeTest';

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

// L'annulation de la structure depuis l'Historique

const creee = (extras: Partial<VariableDEcriture> = {}): VariableDEcriture => ({ id: 'V:9', key: 'k-9', name: 'components/alert/size/padding-x', scopes: [], valuesByMode: {}, collection: 'C:3', type: 'FLOAT', ...extras });

function banqueDeStructure(options: { declaration?: string; locales?: VariableDEcriture[]; avecJournal?: boolean } = {}) {
  const a = atelierDEcriture({ locales: options.locales ?? [creee()], ...(options.declaration === undefined ? {} : { declaration: options.declaration }) });
  const envoyes: PluginMessage[] = [];
  const figma = a.api as unknown as PluginAPI;
  const contexte: Contexte = { figma, envoyer: (m) => envoyes.push(m), surveillerLeDocument() {} };
  if (options.avecJournal !== false) {
    journaliserLesCreations(creerPortDeRegles(figma), [{ variable: 'V:9', nom: 'components/alert/size/padding-x', collection: 'C:3' }], { heure: () => 'h', lot: () => 'lot1' });
  }
  const annulee = () => envoyes.filter((m) => m.type === 'structure-annulee').at(-1) as Extract<PluginMessage, { type: 'structure-annulee' }>;
  return { a, contexte, envoyes, annulee };
}

test('annuler-structure défait le dernier lot, périme l’analyse et dit la limite des autres fichiers', async () => {
  reinitialiserLAnalyse();
  const b = banqueDeStructure();
  const identite = commencerUneAnalyse('jeu', ['n'], b.contexte);
  await traiter({ type: 'annuler-structure', demande: 5 }, b.contexte);
  assert.deepEqual(b.annulee(), { type: 'structure-annulee', demande: 5, refus: null, journal: 'lu', defaites: 1, sautees: [], restantes: 0, limiteDesUsages: true });
  assert.deepEqual(b.a.locales(), []);
  assert.equal(correctionsDeLAnalyse(identite), null);
  assert.equal(b.envoyes.filter((m) => m.type === 'perime').length, 1);
  reinitialiserLAnalyse();
});

test('annuler-structure sans journal ne touche à rien et ne périme rien', async () => {
  reinitialiserLAnalyse();
  const b = banqueDeStructure({ avecJournal: false });
  commencerUneAnalyse('jeu', ['n'], b.contexte);
  await traiter({ type: 'annuler-structure', demande: 1 }, b.contexte);
  assert.deepEqual([b.annulee().journal, b.annulee().defaites, b.annulee().refus], ['absent', 0, null]);
  assert.equal(b.a.locales().length, 1);
  assert.equal(b.envoyes.some((m) => m.type === 'perime'), false);
  reinitialiserLAnalyse();
});

test('annuler-structure : une variable devenue la cible d’un alias est sautée en usage-ajoute et reste au journal', async () => {
  const utilisatrice: VariableDEcriture = { id: 'V:10', key: 'k-10', name: 'components/alert/size/autre', scopes: [], valuesByMode: { m: { type: 'VARIABLE_ALIAS', id: 'V:9' } }, collection: 'C:3', type: 'FLOAT' };
  const b = banqueDeStructure({ locales: [creee(), utilisatrice] });
  await traiter({ type: 'annuler-structure', demande: 2 }, b.contexte);
  assert.deepEqual(b.annulee().sautees, [{ variable: 'V:9', sorte: 'creation', motif: 'usage-ajoute' }]);
  assert.deepEqual([b.annulee().defaites, b.annulee().restantes], [0, 1]);
  assert.equal(b.a.locales().length, 2);
});

test('annuler-structure : un fichier qu’on ne peut pas parcourir saute usage-illisible', async () => {
  const b = banqueDeStructure();
  (b.a.api as unknown as { loadAllPagesAsync(): Promise<void> }).loadAllPagesAsync = async () => { throw new Error('page illisible'); };
  await traiter({ type: 'annuler-structure', demande: 3 }, b.contexte);
  assert.deepEqual(b.annulee().sautees.map(({ motif }) => motif), ['usage-illisible']);
  assert.equal(b.a.locales().length, 1);
});

test('annuler-structure : une autre opération en cours rend occupe, un fichier hors UCM rend hors-ucm, rien n’est touché', async () => {
  const occupe = banqueDeStructure();
  const place = prendreLaPlaceDUneEcriture({ sujet: 'autre', generation: 0 });
  await traiter({ type: 'annuler-structure', demande: 1 }, occupe.contexte);
  assert.equal(occupe.annulee().refus, 'occupe');
  if ('liberer' in place) place.liberer();
  assert.equal(occupe.a.locales().length, 1);

  const hors = banqueDeStructure({ declaration: texteDeLArchitectureDuFichier(false) });
  await traiter({ type: 'annuler-structure', demande: 2 }, hors.contexte);
  assert.equal(hors.annulee().refus, 'hors-ucm');
  assert.equal(hors.a.locales().length, 1);

  // La place est rendue : une annulation suivante passe.
  await traiter({ type: 'annuler-structure', demande: 3 }, occupe.contexte);
  assert.equal(occupe.annulee().defaites, 1);
});
