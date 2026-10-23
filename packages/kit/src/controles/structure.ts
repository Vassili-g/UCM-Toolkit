/** Contrôles des scopes et des structures UCM du catalogue. */
import { formeReconnue } from '../referentiel/reconnaissance.js';
import { SUPPORT_DES_VARIABLES, VARIABLES_DU_THEME } from '../emplois/dossiers.js';
import type { CatalogueDeReference, VariableDuCatalogue } from './catalogue.js';
import type { Constat, Correction, Question } from './constat.js';
import { controlerLesModes } from './theme.js';
import { segmentDAxe, tokensDuComposant, type TokenDuComposant } from './nommage.js';
import type { ReleveDeComposant } from './releve.js';

/** Les règles de structure qui lisent un composant : valeurs vides et contournements du thème. */
export function controlerLaStructure(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  return [
    ...controlerLesValeursVides(releve, catalogue),
    ...controlerLesContournements(releve, catalogue),
  ];
}

/** Les contrôles qui ne lisent que le catalogue : scopes, échelles et alias de mode. Le mode Tokens les lance sans composant. */
export function controlerLeCatalogue(catalogue: CatalogueDeReference): Constat[] {
  return [
    ...controlerLesScopes(catalogue),
    ...controlerLesEchelles(catalogue),
    ...controlerLesModes(catalogue),
  ];
}

function controlerLesScopes(catalogue: CatalogueDeReference): Constat[] {
  const resultats: Constat[] = [];
  for (const variable of catalogue.variables) {
    if (variable.etat !== 'presente' || variable.scopes === undefined || roleCollection(catalogue, variable) !== 'theme') continue;
    const cle = cleDuTheme(variable.nom);
    if (!cle) continue;
    const attendues = SUPPORT_DES_VARIABLES[cle].portees;
    if (memeEnsemble(variable.scopes, attendues)) continue;
    const id = `C63:${variable.cle}:scopes`;
    const constat: Constat = {
      id, code: 'C63', type: 'corriger', famille: 'liaisons', variants: [], layers: [],
      faits: { variable: variable.nom, scopes: variable.scopes.join(',') },
    };
    const correction: Correction = {
      id, sorte: 'scope', cible: { variable: variable.cle }, avant: variable.scopes.join(','),
      apres: { nom: [...attendues].sort().join(',') },
      aRelire: { regle: `Le chemin ${cle} déclare les scopes de SUPPORT_DES_VARIABLES.`, avant: variable.scopes.join(',') },
    };
    constat.correction = correction;
    resultats.push(constat);
  }
  return resultats;
}

function controlerLesValeursVides(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  const resultats: Constat[] = [];
  const tokens = new Map(tokensDuComposant(releve, catalogue).map((token) => [token.variable.cle, token]));
  for (const collection of catalogue.collections.filter((entree) => entree.role === 'components' && entree.etat === 'lue')) {
    const variables = catalogue.variables.filter((variable) => variable.collection === collection.cle && variable.etat === 'presente');
    const signatures = new Map<string, { variable: VariableDuCatalogue; palette: string; indices: number[] }[]>();
    for (const variable of variables) {
      const token = tokens.get(variable.cle);
      if (!token) continue;
      const indexPalette = token.lecture.findIndex((partie) => partie.role === 'palette');
      if (indexPalette < 0 || indexPalette >= token.segments.length) continue;
      const parties = [...token.segments];
      const palette = parties[indexPalette];
      parties[indexPalette] = '*';
      const signature = parties.map(formeReconnue).join('/');
      const groupe = signatures.get(signature) ?? [];
      groupe.push({ variable, palette, indices: [indexPalette] });
      signatures.set(signature, groupe);
    }
    for (const groupe of signatures.values()) {
      for (const entree of groupe) {
        for (const mode of collection.modes) {
          const valeur = entree.variable.valeurs?.[mode.id];
          if (!valeur || !('valeur' in valeur) || valeur.valeur !== null) continue;
          const soeurs = groupe.filter((candidate) => {
            const valeurSoeur = candidate.variable.valeurs?.[mode.id];
            return candidate.variable.cle !== entree.variable.cle && !!valeurSoeur && 'valeur' in valeurSoeur && valeurSoeur.valeur !== null;
          });
          if (soeurs.length < 2) continue;
          const id = `C63:${entree.variable.cle}:${mode.id}:vide`;
          resultats.push({
            id, code: 'C63', type: 'verifier', famille: 'liaisons', variants: [], layers: [],
            faits: { variable: entree.variable.nom, mode: mode.nom, soeurs: soeurs.length },
            question: { id, candidats: soeurs.map(({ variable }) => ({ cle: variable.cle, nom: variable.nom })), indice: 'Les autres palettes de ce groupe ont une valeur dans ce mode.' },
          });
        }
      }
    }
  }
  return resultats;
}

function controlerLesEchelles(catalogue: CatalogueDeReference): Constat[] {
  const resultats: Constat[] = [];
  for (const collection of catalogue.collections.filter((entree) => entree.role === 'layout' && entree.etat === 'lue')) {
    const echelle = catalogue.variables.filter((variable) => variable.collection === collection.cle && variable.etat === 'presente'
      && variable.type === 'FLOAT' && formeReconnue(variable.nom.split('/')[0] ?? '') === 'sizing'
      && nombre(variable.nom.split('/')[1] ?? '') !== undefined);
    for (const mode of collection.modes) {
      const parValeur = new Map<number, VariableDuCatalogue[]>();
      for (const variable of echelle) {
        const valeur = variable.valeurs?.[mode.id];
        if (!valeur || !('valeur' in valeur) || typeof valeur.valeur !== 'number') continue;
        const groupe = parValeur.get(valeur.valeur) ?? [];
        groupe.push(variable);
        parValeur.set(valeur.valeur, groupe);
      }
      for (const [valeur, groupe] of parValeur) {
        if (groupe.length < 2) continue;
        const id = `C63:${collection.cle}:sizing:${mode.id}:${valeur}`;
        resultats.push({
          id, code: 'C63', type: 'verifier', famille: 'tailles', variants: [], layers: [],
          faits: { mode: mode.nom, valeur, doublons: groupe.length },
          question: { id, candidats: groupe.map(({ cle, nom }) => ({ cle, nom })), indice: 'Une échelle de dimensions croît d’un cran à l’autre.' },
        });
      }
    }
  }
  return resultats;
}

function controlerLesContournements(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  const tokens = tokensDuComposant(releve, catalogue);
  const parCle = new Map(tokens.map((token) => [token.variable.cle, token]));
  const resultats: Constat[] = [];
  for (const variable of catalogue.variables) {
    if (variable.etat !== 'presente' || roleCollection(catalogue, variable) !== 'components') continue;
    const token = parCle.get(variable.cle);
    const palette = token && segmentDAxe(token, 'palette');
    if (!token || !palette) continue;
    const collection = catalogue.collections.find((entree) => entree.cle === variable.collection);
    if (!collection) continue;
    for (const mode of collection.modes) {
      const valeur = variable.valeurs?.[mode.id];
      if (!valeur || !('alias' in valeur)) continue;
      const cible = catalogue.variables.find((entree) => entree.cle === valeur.alias);
      const collectionCible = catalogue.collections.find((entree) => entree.cle === cible?.collection);
      if (!cible || roleCollection(catalogue, cible) !== 'brands' || !cible.nom.split('/').some((partie) => collectionCible?.modes.some((modeCible) => formeReconnue(modeCible.nom) === formeReconnue(partie)))) continue;
      const pairs = tokens.filter((soeur) => soeur.variable.cle !== variable.cle
        && signatureSansPalette(soeur) === signatureSansPalette(token)
        && segmentDAxe(soeur, 'palette') !== palette);
      const themeTargets = pairs.flatMap((soeur) => {
        const collectionSoeur = catalogue.collections.find((entree) => entree.cle === soeur.variable.collection);
        const alias = soeur.variable.valeurs?.[mode.id];
        if (!alias || !('alias' in alias)) return [];
        const theme = catalogue.variables.find((entree) => entree.cle === alias.alias && roleCollection(catalogue, entree) === 'theme');
        const paletteSoeur = segmentDAxe(soeur, 'palette');
        if (!theme || !paletteSoeur || !collectionSoeur) return [];
        const nomCible = remplacerSegment(theme.nom, paletteSoeur, palette);
        return catalogue.variables.filter((entree) => entree.nom === nomCible && roleCollection(catalogue, entree) === 'theme');
      });
      const uniques = dedupliquer(themeTargets);
      const id = `C63:${variable.cle}:${mode.id}:theme`;
      const constat: Constat = { id, code: 'C63', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits: { variable: variable.nom, mode: mode.nom, cible: cible.nom } };
      if (uniques.length === 1) constat.correction = {
        id, sorte: 'alias-de-mode', cible: { variable: variable.cle, mode: mode.id }, avant: valeur.alias,
        apres: { cle: uniques[0].cle, nom: uniques[0].nom },
        aRelire: { axes: { mode: mode.nom }, regle: 'Un composant UCM vise le thème, pas une primitive à segment de mode.', avant: valeur.alias },
      };
      else constat.question = { id, candidats: uniques.map(({ cle, nom }) => ({ cle, nom })) };
      resultats.push(constat);
    }
  }
  return resultats;
}

function signatureSansPalette(token: TokenDuComposant): string {
  const segments = [...token.segments];
  const rang = token.lecture.findIndex((segment) => segment.role === 'palette');
  if (rang >= 0 && rang < segments.length) segments[rang] = '*';
  return segments.map(formeReconnue).join('/');
}
function remplacerSegment(nom: string, ancien: string, nouveau: string): string {
  const segments = nom.split('/');
  const rang = segments.findIndex((segment) => formeReconnue(segment) === formeReconnue(ancien));
  if (rang >= 0) segments[rang] = nouveau;
  return segments.join('/');
}
function nombre(texte: string): number | undefined {
  if (!/^\d+(?:[.,]\d+)?$/.test(texte)) return undefined;
  const resultat = Number(texte.replace(',', '.'));
  return Number.isFinite(resultat) ? resultat : undefined;
}
function cleDuTheme(nom: string): keyof typeof SUPPORT_DES_VARIABLES | undefined {
  return [...VARIABLES_DU_THEME].sort((a, b) => b.length - a.length).find((cle) => nom === cle || nom.endsWith(`/${cle}`)) as keyof typeof SUPPORT_DES_VARIABLES | undefined;
}
function roleCollection(catalogue: CatalogueDeReference, variable: VariableDuCatalogue) { return catalogue.collections.find((entree) => entree.cle === variable.collection)?.role; }
function memeEnsemble(gauche: readonly string[], droite: readonly string[]): boolean {
  return gauche.length === droite.length && gauche.every((valeur) => droite.includes(valeur));
}
function dedupliquer(variables: readonly VariableDuCatalogue[]): VariableDuCatalogue[] { return [...new Map(variables.map((variable) => [variable.cle, variable])).values()]; }
