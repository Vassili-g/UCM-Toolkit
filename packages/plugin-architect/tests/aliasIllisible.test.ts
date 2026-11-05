/**
 * Un alias dont la cible n'a pas pu être lue (la library refuse l'accès, ou ne rend ni l'identifiant ni la clé) n'est pas un alias
 * vers une variable supprimée : la lecture le range en `manquees` avec `introuvable` ou `refusee`, et le mode Tokens ne le signale
 * pas en C63 `alias-supprime`. Seule une cible que Figma rend encore sans qu'elle soit locale (`supprimee`) le fait.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import { controlerLeCatalogue } from '@ucm-kit/core/controles';
import { ESPACE_ARCHITECT, CLE_ARCHITECTURE_DU_FICHIER, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { catalogueDuFichier } from '../src/catalogue';
import { lireLeReleve } from '../src/lecture';
import type { PluginMessage } from '../src/messages';
import { oublierLAcquisition } from '../src/sandbox/acquisition';
import { catalogueDeFigma, reinitialiserLAnalyse } from '../src/sandbox/analyse';
import { annulees, traiter as traiterLArbre } from '../src/sandbox/arbre';
import type { Contexte } from '../src/sandbox/contexte';
import { oublierLaLectureGardee, traiter } from '../src/sandbox/structure';
import { collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const couleur = { r: 0.2, g: 0.4, b: 0.6, a: 1 };

const DANGER_CLAIR = 'VariableID:cle-danger/5:1';
const DANGER_SOMBRE = 'VariableID:cle-danger/5:2';
const SUCCES_CLAIR = 'VariableID:cle-succes/5:3';
const SUCCES_SOMBRE = 'VariableID:cle-succes/5:4';

/**
 * Le fichier du mainteneur : le thème local vise des variables de la library de palettes. Celles de `Success` se lisent par leur
 * identifiant ; celles de `Danger` ne se lisent pas, selon `issue` (`introuvable` : ni identifiant ni import ; `refusee` : la
 * lecture lève).
 */
function fichierDuMainteneur(issue: 'introuvable' | 'refusee') {
  const palettes = [
    variableFigma(SUCCES_CLAIR, 'pal', 'Success/Soft/Light/200', 'COLOR', { 'pal:Valeur': couleur }, true),
    variableFigma(SUCCES_SOMBRE, 'pal', 'Success/Soft/Dark/200', 'COLOR', { 'pal:Valeur': couleur }, true),
  ];
  return portDeTest(
    [collectionFigma('th', 'Theme', ['Light', 'Dark'], ['danger', 'succes'])],
    [
      variableFigma('danger', 'th', 'Danger/Soft/Scale/200', 'COLOR', { 'th:Light': alias(DANGER_CLAIR), 'th:Dark': alias(DANGER_SOMBRE) }),
      variableFigma('succes', 'th', 'Success/Soft/Scale/200', 'COLOR', { 'th:Light': alias(SUCCES_CLAIR), 'th:Dark': alias(SUCCES_SOMBRE) }),
    ],
    palettes,
    [collectionFigma('pal', 'Palettes', ['Valeur'], [SUCCES_CLAIR, SUCCES_SOMBRE], true)],
    issue === 'refusee' ? { refusees: new Set([DANGER_CLAIR, DANGER_SOMBRE]) } : {},
  );
}

function contexteDe(port: ReturnType<typeof portDeTest>['port'], envoyes: PluginMessage[]): Contexte {
  const figma = {
    root: {
      name: 'Fichier', documentColorProfile: 'SRGB',
      getSharedPluginData: (espace: string, cle: string) => (espace === ESPACE_ARCHITECT && cle === CLE_ARCHITECTURE_DU_FICHIER ? texteDeLArchitectureDuFichier(true) : ''),
      getSharedPluginDataKeys: () => [],
    },
    variables: port,
  } as unknown as PluginAPI;
  return { figma, envoyer: (message) => envoyes.push(message), surveillerLeDocument: () => {} };
}

type Structure = Extract<PluginMessage, { type: 'structure' }>;
const structureDe = (envoyes: PluginMessage[]): Structure => envoyes.filter((message): message is Structure => message.type === 'structure').at(-1)!;
const aliasSupprimes = (message: Structure) => message.constats.filter(({ faits }) => faits.genre === 'alias-supprime').map(({ faits }) => [faits.variable, faits.mode]);

beforeEach(() => {
  reinitialiserLAnalyse();
  oublierLAcquisition();
  oublierLaLectureGardee();
  annulees.clear();
});

for (const issue of ['introuvable', 'refusee'] as const) {
  test(`lire-structure : une cible ${issue} n’est pas un alias vers une variable supprimée`, async () => {
    const { port } = fichierDuMainteneur(issue);
    const envoyes: PluginMessage[] = [];
    await traiter({ type: 'lire-structure', demande: 1 }, contexteDe(port, envoyes));
    assert.deepEqual(aliasSupprimes(structureDe(envoyes)), []);
  });

  test(`lire-structure après le relevé : une cible ${issue} n’est pas un alias vers une variable supprimée`, async () => {
    const { port } = fichierDuMainteneur(issue);
    const envoyes: PluginMessage[] = [];
    const contexte = contexteDe(port, envoyes);
    await traiterLArbre({ type: 'lire-releve', demande: 1 }, contexte);
    await traiter({ type: 'lire-structure', demande: 2 }, contexte);
    assert.deepEqual(aliasSupprimes(structureDe(envoyes)), []);
  });
}

test('le catalogue du fichier garde une cible non lue en variable inaccessible, du type de la variable qui la vise', async () => {
  const { port } = fichierDuMainteneur('introuvable');
  const issue = await lireLeReleve(port, 'Fichier', 1, { annulee: () => false }, () => 1);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.deepEqual(issue.releve.manquees.map(({ id, issue: motif }) => [id, motif]), [[DANGER_CLAIR, 'introuvable'], [DANGER_SOMBRE, 'introuvable']]);
  const catalogue = catalogueDuFichier(issue.releve, 'ucm');
  const inaccessibles = catalogue.variables.filter(({ etat }) => etat === 'inaccessible');
  assert.deepEqual(inaccessibles.map(({ cle, type }) => [cle, type]), [[DANGER_CLAIR, 'COLOR'], [DANGER_SOMBRE, 'COLOR']]);
  assert.deepEqual(controlerLeCatalogue(catalogue).filter(({ faits }) => faits.genre === 'alias-supprime'), []);
});

test('une cible supprimée, que Figma rend encore sans qu’elle soit locale, reste signalée', async () => {
  const supprimee = variableFigma('supprimee', 'th', 'Danger/Soft/Light/200', 'COLOR', { 'th:Light': couleur });
  const { port } = portDeTest(
    [collectionFigma('th', 'Theme', ['Light'], ['danger'])],
    [variableFigma('danger', 'th', 'Danger/Soft/Scale/200', 'COLOR', { 'th:Light': alias('supprimee') })],
    [supprimee],
  );
  const envoyes: PluginMessage[] = [];
  await traiter({ type: 'lire-structure', demande: 1 }, contexteDe(port, envoyes));
  assert.deepEqual(aliasSupprimes(structureDe(envoyes)), [['Danger/Soft/Scale/200', 'Light']]);
});

test('le catalogue du mode Composant, replié sur le fichier, garde une cible non lue hors du constat de suppression', async () => {
  const { port } = fichierDuMainteneur('introuvable');
  const figma = {
    root: contexteDe(port, []).figma.root, currentPage: { id: 'page-1', backgrounds: [] }, clientStorage: { getAsync: async () => undefined }, variables: port,
  } as unknown as PluginAPI;
  const releve = { variants: [] } as never;
  const catalogue = await catalogueDeFigma(releve, { leve: false }, { figma } as unknown as Contexte);
  assert.deepEqual(catalogue.variables.filter(({ etat }) => etat === 'inaccessible').map(({ cle }) => cle), [DANGER_CLAIR, DANGER_SOMBRE]);
  assert.deepEqual(controlerLeCatalogue(catalogue).filter(({ faits }) => faits.genre === 'alias-supprime'), []);
});
