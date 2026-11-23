/**
 * Le même fichier, jugé sous ses noms Figma (ce que voit UCM Architect) et sous ses chemins publiés (ce que `ucm check` lit dans
 * `tokens.json`), rend les mêmes constats. L'export passe chaque segment par `normalizeName` : il met en minuscules et perd la
 * frontière de casse (`onSolid` devient `onsolid`), alors que le référentiel reconnaît `on-solid`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogueDepuisTokens, controlerLIntegriteUcm, controlerLeCatalogue, type Constat } from '../src/controles/index.js';
import { normalizeName } from '../src/format/names.js';
import { tokensAnonymises } from './fixtures/tokensDeLiens.js';

type Arbre = Record<string, unknown>;
const OBJET = (valeur: unknown): valeur is Arbre => valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur);

/** Renomme chaque clé de groupe, chaque segment d'alias et chaque axe de `com.ucm.axes` par `renommer`. */
function renommerLesSegments(arbre: Arbre, renommer: (segment: string) => string): Arbre {
  const alias = (valeur: unknown): unknown => typeof valeur === 'string' && /^\{[^{}]+\}$/.test(valeur)
    ? `{${valeur.slice(1, -1).split('.').map(renommer).join('.')}}` : valeur;
  const visiter = (noeud: unknown): unknown => {
    if (!OBJET(noeud)) return alias(noeud);
    const sortie: Arbre = {};
    for (const [cle, valeur] of Object.entries(noeud)) {
      if (cle === '$extensions' && OBJET(valeur)) {
        const extensions: Arbre = { ...valeur };
        if (OBJET(extensions['com.ucm.modes'])) extensions['com.ucm.modes'] = Object.fromEntries(Object.entries(extensions['com.ucm.modes']).map(([mode, cible]) => [mode, alias(cible)]));
        if (OBJET(extensions['com.ucm.axes'])) extensions['com.ucm.axes'] = Object.fromEntries(Object.entries(extensions['com.ucm.axes']).map(([axe, declaration]) => [renommer(axe), declaration]));
        sortie[cle] = extensions;
      } else if (cle.startsWith('$')) sortie[cle] = alias(valeur);
      else sortie[renommer(cle)] = visiter(valeur);
    }
    return sortie;
  };
  return visiter(arbre) as Arbre;
}

/** Les constats, sans leurs noms : un code, son genre et l'écart qu'il nomme. */
function constatsDe(tokens: Arbre): string[] {
  const { catalogue } = catalogueDepuisTokens(tokens, 'ucm');
  const constats: Constat[] = [...controlerLIntegriteUcm(catalogue), ...controlerLeCatalogue(catalogue)];
  return constats.map((constat) => `${constat.code}:${constat.faits.genre ?? ''}:${constat.faits.ecart ?? ''}`).sort();
}

/** Le nom que la fixture porte, et celui que le designer lui donne dans Figma. */
const RENOMMAGES: Readonly<Record<string, string>> = {
  cobalt: 'onSolid',
  ambre: 'textOnSolid',
  orchidee: 'BgSurface',
  sapin: 'primaryStrong',
  granite: 'cornerRadiusXl',
  prairie: 'bgCanvasAlt',
};

const enMinuscules = (renommage: Readonly<Record<string, string>>): Record<string, string> =>
  Object.fromEntries(Object.entries(renommage).map(([cle, valeur]) => [cle, valeur.toLowerCase()]));

const SCENARIOS: readonly { nom: string; figma: Readonly<Record<string, string>> }[] = [
  { nom: 'aucun renommage', figma: {} },
  { nom: 'une palette `onSolid`', figma: { cobalt: 'onSolid' } },
  { nom: 'une palette `textOnSolid`', figma: { ambre: 'textOnSolid' } },
  { nom: 'une palette `BgSurface`', figma: { orchidee: 'BgSurface' } },
  { nom: 'une palette `primaryStrong`', figma: { sapin: 'primaryStrong' } },
  { nom: 'la palette neutre `cornerRadiusXl`', figma: { granite: 'cornerRadiusXl' } },
  { nom: 'une palette de statut `bgCanvasAlt`', figma: { prairie: 'bgCanvasAlt' } },
  { nom: 'les six segments ensemble', figma: RENOMMAGES },
  { nom: 'les six segments en minuscules', figma: enMinuscules(RENOMMAGES) },
  { nom: 'une famille `primaryStrong` et une charte `BgSurface`', figma: { primary: 'primaryStrong', identity: 'BgSurface' } },
  { nom: 'un statut `onSolid` et un profil `textOnSolid`', figma: { success: 'onSolid', soft: 'textOnSolid' } },
];

for (const { nom, figma } of SCENARIOS) {
  test(`N6. ${nom} : mêmes constats sous les noms Figma et sous les chemins publiés`, () => {
    const sousFigma = renommerLesSegments(tokensAnonymises(), (segment) => figma[segment] ?? segment);
    const publie = renommerLesSegments(sousFigma, normalizeName);
    assert.deepEqual(constatsDe(publie), constatsDe(sousFigma));
  });
}
