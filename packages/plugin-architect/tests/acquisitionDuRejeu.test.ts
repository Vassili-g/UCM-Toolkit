/**
 * D1.4, parité sur le rejeu : les fichiers réels du rejeu (`packages/kit/tests/stress/rejeu-fichiers/`) deviennent des objets de
 * Figma, puis un Actualiser et un `lire-structure` les lisent. Le message `structure` doit être le même, constats, corrections,
 * ignorés et ordre compris, que `lire-structure` reprenne l'acquisition du relevé ou relise Figma. Une source absente se saute.
 * Les tests n’écrivent aucun nom du fichier : ils comptent. La conversion perd des valeurs (types composés), donc ses constats ne sont pas ceux du rejeu du kit.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test, { beforeEach } from 'node:test';

import type { CatalogueDeReference, VariableDuCatalogue } from '@ucm-kit/core/controles';
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { catalogueDepuisTokens } from '../../kit/tests/stress/rejeu-fichiers/dtcg';
import { oublierLesPassagesDuModeTokens, passagesDuModeTokens, type CollectionFigma, type VariableFigma } from '../src/lecture';
import type { PluginMessage } from '../src/messages';
import { oublierLAcquisition, perimerLAcquisition } from '../src/sandbox/acquisition';
import { annulees, traiter as traiterLArbre } from '../src/sandbox/arbre';
import type { Contexte } from '../src/sandbox/contexte';
import { ACCES_DE_FIGMA, oublierLaLectureGardee, traiterAvec } from '../src/sandbox/structure';
import { collectionFigma, variableFigma } from './figmaDeTest';

const racine = join(__dirname, '..', '..', '..');
const SOURCES = [
  { nom: 'premier fichier', chemin: join(racine, 'docs/notes/Archives/Plugin Architect/1 Architecture globale/Mesures/tokens-slice-exemple.json') },
  { nom: 'second fichier', chemin: join(racine, '..', 'intencial-library/src/tokens/tokens.json') },
];

beforeEach(() => {
  oublierLAcquisition();
  oublierLaLectureGardee();
  oublierLesPassagesDuModeTokens();
  annulees.clear();
});

const identifiant = (cle: string): string => `VariableID:${cle}`;

function valeurDeFigma(variable: VariableDuCatalogue, valeur: { alias: string } | { valeur: unknown }): unknown {
  if ('alias' in valeur) return { type: 'VARIABLE_ALIAS', id: identifiant(valeur.alias) };
  return valeur.valeur;
}

/** Le fichier de Figma qui porte ce catalogue : une collection par collection, une variable locale par variable, la déclaration UCM. */
function figmaDepuis(catalogue: CatalogueDeReference) {
  const variables: VariableFigma[] = catalogue.variables.map((variable) => {
    const valeurs: Record<string, unknown> = {};
    for (const [mode, valeur] of Object.entries(variable.valeurs ?? {})) {
      const posee = valeurDeFigma(variable, valeur);
      if (posee !== null && posee !== undefined) valeurs[`${variable.collection}:${mode}`] = posee;
    }
    const brute = variableFigma(identifiant(variable.cle), variable.collection, variable.nom, variable.type, valeurs);
    return { ...brute, scopes: variable.scopes ?? ['ALL_SCOPES'], getSharedPluginData: () => '' } as VariableFigma;
  });
  const collections: CollectionFigma[] = catalogue.collections.map((collection) => collectionFigma(
    collection.cle, collection.nom, collection.modes.map((mode) => mode.id),
    variables.filter((variable) => variable.variableCollectionId === collection.cle).map((variable) => variable.id),
  ));
  const donnees = new Map<string, string>([[`${ESPACE_ARCHITECT}/${CLE_ARCHITECTURE_DU_FICHIER}`, texteDeLArchitectureDuFichier(true)]]);
  const appels: Record<string, number> = {};
  const compter = (nom: string): void => { appels[nom] = (appels[nom] ?? 0) + 1; };
  const parId = new Map(variables.map((variable) => [variable.id, variable]));
  const collectionParId = new Map(collections.map((collection) => [collection.id, collection]));
  const figma = {
    root: {
      name: 'Rejeu', documentColorProfile: 'SRGB',
      getSharedPluginData: (espace: string, cle: string) => donnees.get(`${espace}/${cle}`) ?? '',
      getSharedPluginDataKeys: (espace: string) => [...donnees.keys()].filter((cle) => cle.startsWith(`${espace}/`)).map((cle) => cle.slice(espace.length + 1)),
      setSharedPluginData: (espace: string, cle: string, valeur: string) => { donnees.set(`${espace}/${cle}`, valeur); },
    },
    variables: {
      async getLocalVariableCollectionsAsync() { compter('getLocalVariableCollectionsAsync'); return collections; },
      async getLocalVariablesAsync() { compter('getLocalVariablesAsync'); return variables; },
      async getVariableByIdAsync(id: string) { compter('getVariableByIdAsync'); return parId.get(id) ?? null; },
      async getVariableCollectionByIdAsync(id: string) { compter('getVariableCollectionByIdAsync'); return collectionParId.get(id) ?? null; },
      async importVariableByKeyAsync() { compter('importVariableByKeyAsync'); throw new Error('Clé absente'); },
    },
  };
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: figma as unknown as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument: () => {} };
  return { appels, envoyes, contexte, nombreDeVariables: variables.length };
}

type Fichier = ReturnType<typeof figmaDepuis>;
const lireLeReleve = (f: Fichier, demande: number) => traiterLArbre({ type: 'lire-releve', demande }, f.contexte);
const lireLaStructure = (f: Fichier, demande: number) => traiterAvec(ACCES_DE_FIGMA)({ type: 'lire-structure', demande }, f.contexte);
const structureEnvoyee = (f: Fichier) => {
  const message = f.envoyes.filter((envoye) => envoye.type === 'structure').at(-1);
  assert.ok(message && message.type === 'structure');
  return message;
};

for (const source of SOURCES) {
  test(`${source.nom} du rejeu : lire-structure rend le même message avec l’acquisition du relevé et avec une lecture de Figma`, async (contexte) => {
    if (!existsSync(source.chemin)) { contexte.skip('source absente'); return; }
    const { catalogue } = catalogueDepuisTokens(JSON.parse(readFileSync(source.chemin, 'utf8')));

    const avec = figmaDepuis(catalogue);
    await lireLeReleve(avec, 1);
    await lireLaStructure(avec, 2);
    const appelsAvec = { ...avec.appels };
    const lectureAvec = passagesDuModeTokens().filter((passage) => passage.phase === 'lire-structure').at(-1)?.appels;

    perimerLAcquisition();
    oublierLesPassagesDuModeTokens();
    const sans = figmaDepuis(catalogue);
    await lireLeReleve(sans, 1);
    perimerLAcquisition();
    await lireLaStructure(sans, 2);
    const lectureSans = passagesDuModeTokens().filter((passage) => passage.phase === 'lire-structure').at(-1)?.appels;

    const a = structureEnvoyee(avec);
    const b = structureEnvoyee(sans);
    assert.deepEqual(a, b, 'le message complet est le même, ordre compris');
    assert.equal(appelsAvec.getLocalVariablesAsync, 1, 'un getLocalVariablesAsync pour tout l’Actualiser');
    assert.equal(lectureAvec?.getVariableByIdAsync, undefined, 'avec l’acquisition, lire-structure ne lit aucune variable par identifiant');
    assert.ok((lectureSans?.getVariableByIdAsync ?? 0) >= avec.nombreDeVariables, 'sans elle, il relit chaque variable');

    console.log(`${source.nom} : ${avec.nombreDeVariables} variables, ${a.constats.length} constats, ${a.corrections.length} corrections ; ` +
      `lectures par identifiant ${lectureAvec?.getVariableByIdAsync ?? 0} contre ${lectureSans?.getVariableByIdAsync ?? 0}`);
  });
}
