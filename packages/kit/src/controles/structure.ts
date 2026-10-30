/** Contrôles des scopes et des structures UCM du catalogue. */
import { formeDuChemin, formeReconnue } from '../referentiel/reconnaissance.js';
import { variableDuThemeReconnue } from '../referentiel/theme.js';
import { SUPPORT_DES_VARIABLES } from '../emplois/dossiers.js';
import { cheminDansLaCollection, collectionParCle, variableParCle, type CatalogueDeReference, type VariableDuCatalogue } from './catalogue.js';
import type { Constat, Correction, Question } from './constat.js';
import { controlerLesModes } from './theme.js';
import { estLaFamilleCouleur, segmentDAxe, tokensDuComposantParEtapes, type TokenDuComposant } from './nommage.js';
import type { ReleveDeComposant } from './releve.js';

/** Les règles de structure qui lisent un composant : valeurs vides et contournements du thème. */
export function controlerLaStructure(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  const calcul = controlerLaStructureParEtapes(releve, catalogue);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

/** Cède dans les valeurs vides et les contournements ; les contrôles du catalogue restent distincts. */
export function* controlerLaStructureParEtapes(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const vides = yield* controlerLesValeursVides(releve, catalogue);
  const contournements = yield* controlerLesContournements(releve, catalogue);
  return [...vides, ...contournements];
}

/** Les contrôles qui ne lisent que le catalogue : scopes, échelles et alias de mode. Le mode Tokens les lance sans composant. */
export function controlerLeCatalogue(catalogue: CatalogueDeReference): Constat[] {
  return [
    ...controlerLesAliasesManquants(catalogue),
    ...controlerLesLibrariesInactives(catalogue),
    ...controlerLesModesSansValeur(catalogue),
    ...controlerLesCouleursSansAlias(catalogue),
    ...controlerLesScopes(catalogue),
    ...controlerLesEchelles(catalogue),
    ...controlerLesModes(catalogue),
  ];
}

/**
 * Les alias dont la cible n'est pas dans le catalogue : un constat `alias-supprime` par variable présente et par mode. L'Exporter la
 * lance seule, sur un catalogue qui ne porte que les variables locales du fichier.
 */
export function controlerLesAliasesManquants(catalogue: CatalogueDeReference): Constat[] {
  const resultat: Constat[] = [];
  const derniers = new Map<string, string | undefined>();
  const dernierSegment = (nom: string) => {
    if (!derniers.has(nom)) derniers.set(nom, nom.split('/').at(-1));
    return derniers.get(nom);
  };
  for (const variable of catalogue.variables.filter((entree) => entree.etat === 'presente')) {
    const collection = collectionDuCatalogue(catalogue, variable.collection);
    if (!collection) continue;
    for (const mode of collection.modes) {
      const valeur = variable.valeurs?.[mode.id];
      if (!valeur || !('alias' in valeur)) continue;
      if (variableParCle(catalogue, valeur.alias)) continue;
      const voisine = catalogue.variables.find((entree) => entree.cle !== variable.cle && entree.collection === variable.collection
        && dernierSegment(entree.nom) === dernierSegment(variable.nom)
        && entree.valeurs?.[mode.id] && 'alias' in entree.valeurs[mode.id]
        && catalogue.variables.some(({ cle }) => cle === (entree.valeurs![mode.id] as { alias: string }).alias));
      const cibleVoisine = voisine && 'alias' in voisine.valeurs![mode.id] ? catalogue.variables.find(({ cle }) => cle === (voisine.valeurs![mode.id] as { alias: string }).alias) : undefined;
      resultat.push(constatGenre('C63', `${variable.cle}:${mode.id}:alias-supprime`, 'alias-supprime', {
        variable: variable.nom, cle: variable.cle, mode: mode.nom,
        ...(voisine && cibleVoisine ? { voisine: voisine.nom, cibleDeLaVoisine: cibleVoisine.nom } : {}),
      }));
    }
  }
  return resultat;
}

function controlerLesLibrariesInactives(catalogue: CatalogueDeReference): Constat[] {
  if (!catalogue.library) return [];
  return catalogue.variables.flatMap((variable) => {
    if (variable.etat !== 'presente') return [];
    const collection = collectionDuCatalogue(catalogue, variable.collection);
    if (!collection) return [];
    return collection.modes.flatMap((mode) => {
      const valeur = variable.valeurs?.[mode.id];
      if (!valeur || !('alias' in valeur)) return [];
      const cible = catalogue.variables.find(({ cle }) => cle === valeur.alias);
      const collectionCible = cible && collectionDuCatalogue(catalogue, cible.collection);
      if (!cible || (cible.etat !== 'inaccessible' && collectionCible?.etat !== 'inaccessible')) return [];
      return [constatGenre('C63', `${variable.cle}:${mode.id}:library-inactive`, 'library-inactive', {
        variable: variable.nom, cle: variable.cle, mode: mode.nom, library: catalogue.library!.nom,
      })];
    });
  });
}

function controlerLesModesSansValeur(catalogue: CatalogueDeReference): Constat[] {
  return catalogue.variables.flatMap((variable) => {
    if (variable.etat !== 'presente') return [];
    const collection = collectionDuCatalogue(catalogue, variable.collection);
    if (!collection) return [];
    return collection.modes.flatMap((mode) => variable.valeurs?.[mode.id] === undefined
      ? [constatGenre('C63', `${variable.cle}:${mode.id}:sans-valeur-en-mode`, 'sans-valeur-en-mode', {
        variable: variable.nom, cle: variable.cle, mode: mode.nom,
      })]
      : []);
  });
}

function controlerLesCouleursSansAlias(catalogue: CatalogueDeReference): Constat[] {
  return catalogue.variables.flatMap((variable) => {
    if (variable.etat !== 'presente' || variable.type !== 'COLOR' || roleCollection(catalogue, variable) !== 'components'
      || !variable.nom.split('/').some(estLaFamilleCouleur)) return [];
    const collection = collectionDuCatalogue(catalogue, variable.collection);
    if (!collection) return [];
    return collection.modes.flatMap((mode) => {
      const entree = variable.valeurs?.[mode.id];
      if (!entree || !('valeur' in entree) || entree.valeur === null) return [];
      return [constatGenre('C63', `${variable.cle}:${mode.id}:couleur-sans-alias`, 'couleur-sans-alias', {
        variable: variable.nom, cle: variable.cle, mode: mode.nom, valeur: String(entree.valeur),
      })];
    });
  });
}

function constatGenre(code: `C${number}`, id: string, genre: string, faits: Constat['faits']): Constat {
  return { id: `${code}:${id}`, code, type: 'verifier', famille: 'liaisons', variants: [], layers: [], faits: { ...faits, genre } };
}

function controlerLesScopes(catalogue: CatalogueDeReference): Constat[] {
  const resultats: Constat[] = [];
  for (const variable of catalogue.variables) {
    if (variable.etat !== 'presente' || variable.scopes === undefined || roleCollection(catalogue, variable) !== 'theme') continue;
    const cle = variableDuThemeReconnue(variable.nom);
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

function* controlerLesValeursVides(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const resultats: Constat[] = [];
  const lus = yield* tokensDuComposantParEtapes(releve, catalogue);
  const tokens = new Map<string, TokenDuComposant>();
  for (const token of lus) {
    yield;
    tokens.set(token.variable.cle, token);
  }
  for (const collection of catalogue.collections) {
    yield;
    if (collection.role !== 'components' || collection.etat !== 'lue') continue;
    const signatures = new Map<string, { variable: VariableDuCatalogue; palette: string; indices: number[] }[]>();
    let parcourues = 0;
    for (const variable of catalogue.variables) {
      parcourues += 1;
      if (parcourues % 256 === 0) yield;
      if (variable.collection !== collection.cle || variable.etat !== 'presente') continue;
      const token = tokens.get(variable.cle);
      if (!token) continue;
      const indexPalette = token.lecture.findIndex((partie) => partie.role === 'palette');
      if (indexPalette < 0 || indexPalette >= token.segments.length) continue;
      const parties = [...token.segments];
      const palette = parties[indexPalette];
      parties[indexPalette] = '*';
      const signature = formeDuChemin(parties);
      const groupe = signatures.get(signature) ?? [];
      groupe.push({ variable, palette, indices: [indexPalette] });
      signatures.set(signature, groupe);
    }
    for (const groupe of signatures.values()) {
      yield;
      for (const entree of groupe) {
        yield;
        for (const mode of collection.modes) {
          yield;
          const valeur = entree.variable.valeurs?.[mode.id];
          if (!valeur || !('valeur' in valeur) || valeur.valeur !== null) continue;
          const soeurs: typeof groupe = [];
          for (const candidate of groupe) {
            yield;
            const valeurSoeur = candidate.variable.valeurs?.[mode.id];
            if (candidate.variable.cle !== entree.variable.cle && !!valeurSoeur && 'valeur' in valeurSoeur && valeurSoeur.valeur !== null) soeurs.push(candidate);
          }
          if (soeurs.length < 2) continue;
          const id = `C63:${entree.variable.cle}:${mode.id}:vide`;
          const candidats: { cle: string; nom: string }[] = [];
          for (const soeur of soeurs) {
            yield;
            candidats.push({ cle: soeur.variable.cle, nom: soeur.variable.nom });
          }
          resultats.push({
            id, code: 'C63', type: 'verifier', famille: 'liaisons', variants: [], layers: [],
            faits: { variable: entree.variable.nom, mode: mode.nom, soeurs: soeurs.length },
            question: { id, candidats, indice: 'Les autres palettes de ce groupe ont une valeur dans ce mode.' },
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
    const echelle = catalogue.variables.filter((variable) => {
      if (variable.collection !== collection.cle || variable.etat !== 'presente' || variable.type !== 'FLOAT') return false;
      const chemin = cheminDansLaCollection(variable, catalogue);
      return formeReconnue(chemin[0] ?? '') === 'sizing' && nombre(chemin[1] ?? '') !== undefined;
    });
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

function* controlerLesContournements(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const tokens = yield* tokensDuComposantParEtapes(releve, catalogue);
  const parCle = new Map<string, TokenDuComposant>();
  for (const token of tokens) {
    yield;
    parCle.set(token.variable.cle, token);
  }
  const resultats: Constat[] = [];
  let parcourues = 0;
  for (const variable of catalogue.variables) {
    parcourues += 1;
    if (parcourues % 256 === 0) yield;
    if (variable.etat !== 'presente' || roleCollection(catalogue, variable) !== 'components') continue;
    const token = parCle.get(variable.cle);
    const palette = token && segmentDAxe(token, 'palette');
    if (!token || !palette) continue;
    const collection = collectionParCle(catalogue, variable.collection);
    if (!collection) continue;
    for (const mode of collection.modes) {
      yield;
      const valeur = variable.valeurs?.[mode.id];
      if (!valeur || !('alias' in valeur)) continue;
      const cible = yield* chercherVariable(catalogue, (entree) => entree.cle === valeur.alias);
      const collectionCible = cible && collectionParCle(catalogue, cible.collection);
      if (!cible || roleCollection(catalogue, cible) !== 'brands') continue;
      let contientUnMode = false;
      for (const partie of cible.nom.split('/')) {
        yield;
        for (const modeCible of collectionCible?.modes ?? []) {
          yield;
          if (formeReconnue(modeCible.nom) === formeReconnue(partie)) { contientUnMode = true; break; }
        }
        if (contientUnMode) break;
      }
      if (!contientUnMode) continue;
      const themeTargets: VariableDuCatalogue[] = [];
      for (const soeur of tokens) {
        yield;
        if (soeur.variable.cle === variable.cle || signatureSansPalette(soeur) !== signatureSansPalette(token) || segmentDAxe(soeur, 'palette') === palette) continue;
        const collectionSoeur = collectionParCle(catalogue, soeur.variable.collection);
        const alias = soeur.variable.valeurs?.[mode.id];
        if (!alias || !('alias' in alias)) continue;
        const theme = yield* chercherVariable(catalogue, (entree) => entree.cle === alias.alias && roleCollection(catalogue, entree) === 'theme');
        const paletteSoeur = segmentDAxe(soeur, 'palette');
        if (!theme || !paletteSoeur || !collectionSoeur) continue;
        const nomCible = remplacerSegment(theme.nom, paletteSoeur, palette);
        let vues = 0;
        for (const entree of catalogue.variables) {
          vues += 1;
          if (vues % 256 === 0) yield;
          if (entree.nom === nomCible && roleCollection(catalogue, entree) === 'theme') themeTargets.push(entree);
        }
      }
      const parCible = new Map<string, VariableDuCatalogue>();
      for (const cibleTheme of themeTargets) {
        yield;
        parCible.set(cibleTheme.cle, cibleTheme);
      }
      const uniques = [...parCible.values()];
      const id = `C63:${variable.cle}:${mode.id}:theme`;
      const constat: Constat = { id, code: 'C63', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits: { variable: variable.nom, mode: mode.nom, cible: cible.nom } };
      if (uniques.length === 1) constat.correction = {
        id, sorte: 'alias-de-mode', cible: { variable: variable.cle, mode: mode.id }, avant: valeur.alias,
        apres: { cle: uniques[0].cle, nom: uniques[0].nom },
        aRelire: { axes: { mode: mode.nom }, regle: 'Un composant UCM vise le thème, pas une primitive à segment de mode.', avant: valeur.alias },
      };
      else {
        const candidats: { cle: string; nom: string }[] = [];
        for (const candidat of uniques) {
          yield;
          candidats.push({ cle: candidat.cle, nom: candidat.nom });
        }
        constat.question = { id, candidats };
      }
      resultats.push(constat);
    }
  }
  return resultats;
}

function signatureSansPalette(token: TokenDuComposant): string {
  const segments = [...token.segments];
  const rang = token.lecture.findIndex((segment) => segment.role === 'palette');
  if (rang >= 0 && rang < segments.length) segments[rang] = '*';
  return formeDuChemin(segments);
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
function roleCollection(catalogue: CatalogueDeReference, variable: VariableDuCatalogue) { return collectionParCle(catalogue, variable.collection)?.role; }
function memeEnsemble(gauche: readonly string[], droite: readonly string[]): boolean {
  return gauche.length === droite.length && gauche.every((valeur) => droite.includes(valeur));
}
/** Cède toutes les 256 variables parcourues, comme les autres parcours linéaires du catalogue. */
function* chercherVariable(catalogue: CatalogueDeReference, predicat: (variable: VariableDuCatalogue) => boolean): Generator<void, VariableDuCatalogue | undefined> {
  let parcourues = 0;
  for (const variable of catalogue.variables) {
    parcourues += 1;
    if (parcourues % 256 === 0) yield;
    if (predicat(variable)) return variable;
  }
  return undefined;
}
function collectionDuCatalogue(catalogue: CatalogueDeReference, cle: string) { return collectionParCle(catalogue, cle); }
