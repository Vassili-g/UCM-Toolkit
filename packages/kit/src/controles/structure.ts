/** Contrôles des scopes et des structures UCM du catalogue. */
import { formeDuChemin, formeReconnue } from '../referentiel/reconnaissance.js';
import { modeDuThemeReconnu, variableDuThemeReconnue } from '../referentiel/theme.js';
import { SUPPORT_DES_VARIABLES, cranDeLaVariable, type ModeDuTheme, type SensDuTheme } from '../emplois/dossiers.js';
import { cheminDansLaCollection, collectionParCle, variableParCle, type CatalogueDeReference, type VariableDuCatalogue } from './catalogue.js';
import type { Constat, Correction, Question } from './constat.js';
import { lesJumelles, lesPrefixes, lireLeSens, modesDuTheme, type SensLu } from './integrite.js';
import { controlerLesModes } from './theme.js';
import { estLaFamilleCouleur, segmentDAxe, tailleReconnue, tokensDuComposantParEtapes, type TokenDuComposant } from './nommage.js';
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
  // Construit au premier alias manquant seulement : le cas courant n'en a aucun. Chaque liste garde l'ordre du catalogue.
  let parCollectionEtSegment: Map<string, VariableDuCatalogue[]> | undefined;
  const voisines = () => {
    if (!parCollectionEtSegment) {
      parCollectionEtSegment = new Map();
      for (const entree of catalogue.variables) {
        const cle = `${entree.collection}\u0000${dernierSegment(entree.nom)}`;
        const liste = parCollectionEtSegment.get(cle);
        if (liste) liste.push(entree); else parCollectionEtSegment.set(cle, [entree]);
      }
    }
    return parCollectionEtSegment;
  };
  for (const variable of catalogue.variables.filter((entree) => entree.etat === 'presente')) {
    const collection = collectionDuCatalogue(catalogue, variable.collection);
    if (!collection) continue;
    for (const mode of collection.modes) {
      const valeur = variable.valeurs?.[mode.id];
      if (!valeur || !('alias' in valeur)) continue;
      if (variableParCle(catalogue, valeur.alias)) continue;
      const voisine = (voisines().get(`${variable.collection}\u0000${dernierSegment(variable.nom)}`) ?? []).find((entree) => entree.cle !== variable.cle
        && memeRoleAilleurs(catalogue, variable, entree)
        && entree.valeurs?.[mode.id] && 'alias' in entree.valeurs[mode.id]
        && variableParCle(catalogue, (entree.valeurs![mode.id] as { alias: string }).alias));
      const cibleVoisine = voisine && 'alias' in voisine.valeurs![mode.id] ? variableParCle(catalogue, (voisine.valeurs![mode.id] as { alias: string }).alias) : undefined;
      resultat.push(constatGenre('C63', `${variable.cle}:${mode.id}:alias-supprime`, 'alias-supprime', {
        variable: variable.nom, cle: variable.cle, mode: mode.nom,
        ...(voisine && cibleVoisine ? { voisine: voisine.nom, cibleDeLaVoisine: cibleVoisine.nom } : {}),
      }));
    }
  }
  return resultat;
}

/**
 * Une voisine cite le même rôle dans une autre palette (N-28) : pour `theme`, le même rôle reconnu sous un autre préfixe ; pour
 * `brands` et `utility`, le même chemin à son premier segment près (la palette). Ailleurs, aucune voisine n'est citée : le kit ne sait
 * pas où est la palette dans le nom.
 */
function memeRoleAilleurs(catalogue: CatalogueDeReference, variable: VariableDuCatalogue, voisine: VariableDuCatalogue): boolean {
  const role = roleCollection(catalogue, variable);
  if (role === 'theme') {
    const reconnu = variableDuThemeReconnue(variable.nom);
    if (!reconnu || variableDuThemeReconnue(voisine.nom) !== reconnu) return false;
    const prefixe = (v: VariableDuCatalogue) => { const chemin = cheminDansLaCollection(v, catalogue); return formeDuChemin(chemin.slice(0, chemin.length - reconnu.split('/').length)); };
    return prefixe(variable) !== prefixe(voisine);
  }
  if (role !== 'brands' && role !== 'utility') return false;
  const chemin = cheminDansLaCollection(variable, catalogue);
  const autre = cheminDansLaCollection(voisine, catalogue);
  return chemin.length > 1 && chemin.length === autre.length && formeDuChemin(chemin.slice(1)) === formeDuChemin(autre.slice(1)) && formeReconnue(chemin[0]) !== formeReconnue(autre[0]);
}

/**
 * Un alias dont la cible ou la collection cible est inaccessible. La library choisie dans les réglages donne `library-inactive` par
 * variable et par mode, avec le nom de la library à activer. Sans library choisie, le kit ne sait pas laquelle activer : il rend une
 * information `cible-inaccessible` par collection cible, qui compte les cibles et les alias concernés, sans geste (Q-F2-8).
 */
function controlerLesLibrariesInactives(catalogue: CatalogueDeReference): Constat[] {
  if (!catalogue.library) return controlerLesCiblesInaccessibles(catalogue);
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

function controlerLesCiblesInaccessibles(catalogue: CatalogueDeReference): Constat[] {
  const parCollection = new Map<string, { nom: string; cibles: Set<string>; alias: number }>();
  for (const variable of catalogue.variables) {
    if (variable.etat !== 'presente') continue;
    const collection = collectionDuCatalogue(catalogue, variable.collection);
    if (!collection) continue;
    for (const mode of collection.modes) {
      const valeur = variable.valeurs?.[mode.id];
      if (!valeur || !('alias' in valeur)) continue;
      const cible = variableParCle(catalogue, valeur.alias);
      const collectionCible = cible && collectionDuCatalogue(catalogue, cible.collection);
      if (!cible || !collectionCible || (cible.etat !== 'inaccessible' && collectionCible.etat !== 'inaccessible')) continue;
      const entree = parCollection.get(collectionCible.cle) ?? { nom: collectionCible.nom, cibles: new Set<string>(), alias: 0 };
      entree.cibles.add(cible.cle);
      entree.alias += 1;
      parCollection.set(collectionCible.cle, entree);
    }
  }
  return [...parCollection].map(([cle, { nom, cibles, alias }]) => ({
    ...constatGenre('C63', `${cle}:cible-inaccessible`, 'cible-inaccessible', { collection: nom, cibles: cibles.size, alias }), type: 'info' as const,
  }));
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
            if (candidate.variable.cle !== entree.variable.cle && !!valeurSoeur && ('alias' in valeurSoeur || valeurSoeur.valeur !== null)) soeurs.push(candidate);
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

/** L'écart sous lequel deux valeurs d'une échelle sont la même : le calcul décimal de Figma n'est pas exact (`0,1 + 0,2` et `0,3`). */
const TOLERANCE_D_ECHELLE = 1e-6;
const PROFONDEUR_DES_ALIAS = 16;

/** Le cran d'une échelle : un nombre (`1,5`) ou une taille du registre (`md`). */
function estUnCranDEchelle(segment: string): boolean {
  return nombre(segment) !== undefined || tailleReconnue(segment) !== undefined;
}

/**
 * La valeur d'un cran d'échelle dans un mode, alias suivis (Q-F2-8). Un alias vers une autre collection prend le mode de même nom,
 * sinon le premier mode de la cible, comme la fenêtre Variables de Figma. Une cible absente, inaccessible, en boucle ou qui n'est pas un
 * nombre ne donne aucune valeur : le cran ne joue pas dans la comparaison.
 */
function valeurDeLEchelle(catalogue: CatalogueDeReference, variable: VariableDuCatalogue, idDeMode: string, nomDuMode: string): number | undefined {
  let courante = variable;
  let id = idDeMode;
  let nomCourant = nomDuMode;
  for (let pas = 0; pas <= PROFONDEUR_DES_ALIAS; pas++) {
    const valeur = courante.valeurs?.[id];
    if (!valeur) return undefined;
    if ('valeur' in valeur) return typeof valeur.valeur === 'number' && Number.isFinite(valeur.valeur) ? valeur.valeur : undefined;
    const cible = variableParCle(catalogue, valeur.alias);
    if (!cible || cible.etat !== 'presente' || cible.type !== 'FLOAT') return undefined;
    const modes = collectionParCle(catalogue, cible.collection)?.modes ?? [];
    const memeMode = modes.find((mode) => mode.id === id) ?? modes.find((mode) => formeReconnue(mode.nom) === formeReconnue(nomCourant)) ?? modes[0];
    if (!memeMode) return undefined;
    courante = cible;
    id = memeMode.id;
    nomCourant = memeMode.nom;
  }
  return undefined;
}

/**
 * Les doublons d'une échelle : deux crans du même groupe de `layout` (`sizing/1`, `radius/md`) qui valent la même chose dans un mode,
 * à 1e-6 près, une fois les alias résolus. Un groupe est le chemin sans son dernier segment, et un cran un nombre ou une taille du
 * registre ; une propriété (`padding/x`) n'est pas un cran. Seules les variables FLOAT comptent.
 */
function controlerLesEchelles(catalogue: CatalogueDeReference): Constat[] {
  const resultats: Constat[] = [];
  for (const collection of catalogue.collections.filter((entree) => entree.role === 'layout' && entree.etat === 'lue')) {
    const echelles = new Map<string, { nom: string; crans: VariableDuCatalogue[] }>();
    for (const variable of catalogue.variables) {
      if (variable.collection !== collection.cle || variable.etat !== 'presente' || variable.type !== 'FLOAT') continue;
      const chemin = cheminDansLaCollection(variable, catalogue);
      if (chemin.length < 2 || !estUnCranDEchelle(chemin[chemin.length - 1])) continue;
      const forme = formeDuChemin(chemin.slice(0, -1));
      const echelle = echelles.get(forme);
      if (echelle) echelle.crans.push(variable); else echelles.set(forme, { nom: forme, crans: [variable] });
    }
    for (const { nom, crans } of echelles.values()) {
      for (const mode of collection.modes) {
        const lues = crans.flatMap((variable) => {
          const valeur = valeurDeLEchelle(catalogue, variable, mode.id, mode.nom);
          return valeur === undefined ? [] : [{ variable, valeur }];
        }).sort((a, b) => a.valeur - b.valeur);
        let groupe: typeof lues = [];
        const rendre = (): void => {
          if (groupe.length < 2) return;
          const valeur = Number(groupe[0].valeur.toFixed(6));
          const id = `C63:${collection.cle}:${nom}:${mode.id}:${valeur}`;
          resultats.push({
            id, code: 'C63', type: 'verifier', famille: 'tailles', variants: [], layers: [],
            faits: { mode: mode.nom, valeur, doublons: groupe.length, echelle: nom },
            question: { id, candidats: groupe.map(({ variable: { cle, nom: nomDuCran } }) => ({ cle, nom: nomDuCran })), indice: 'Une échelle de dimensions croît d’un cran à l’autre.' },
          });
        };
        for (const entree of lues) {
          if (groupe.length > 0 && entree.valeur - groupe[groupe.length - 1].valeur > TOLERANCE_D_ECHELLE) { rendre(); groupe = []; }
          groupe.push(entree);
        }
        rendre();
      }
    }
  }
  return resultats;
}

/** Un token de `components` qui vise `brands` par une variable à segment de mode, dans un mode : C63 `theme` l'accuse. */
export interface ContournementDuTheme {
  readonly variable: VariableDuCatalogue;
  readonly palette: string;
  readonly mode: { readonly id: string; readonly nom: string };
  readonly alias: string;
  readonly cible: VariableDuCatalogue;
  readonly partieDeMode: string;
}

/** Les alias de `components` vers `brands` dont la cible porte un segment de mode, un par variable et par mode. Les contrôles des couches s'en servent pour ne pas accuser deux fois la même liaison. */
export function* contournementsDuTheme(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, ContournementDuTheme[]> {
  const tokens = yield* tokensDuComposantParEtapes(releve, catalogue);
  const parCle = new Map<string, TokenDuComposant>();
  for (const token of tokens) {
    yield;
    parCle.set(token.variable.cle, token);
  }
  const resultats: ContournementDuTheme[] = [];
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
      let partieDeMode: string | undefined;
      for (const partie of cible.nom.split('/')) {
        yield;
        for (const modeCible of collectionCible?.modes ?? []) {
          yield;
          if (formeReconnue(modeCible.nom) === formeReconnue(partie)) { partieDeMode = partie; break; }
        }
        if (partieDeMode !== undefined) break;
      }
      if (partieDeMode === undefined) continue;
      resultats.push({ variable, palette, mode, alias: valeur.alias, cible, partieDeMode });
    }
  }
  return resultats;
}

function* controlerLesContournements(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const contournements = yield* contournementsDuTheme(releve, catalogue);
  const resultats: Constat[] = [];
  const lectures: LecturesDeThemes = new Map();
  for (const { variable, palette, mode, alias, cible, partieDeMode } of contournements) {
    yield;
    const id = `C63:${variable.cle}:${mode.id}:theme`;
    const constat: Constat = { id, code: 'C63', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits: { variable: variable.nom, mode: mode.nom, cible: cible.nom } };
    const modeDuTheme = modeDuThemeReconnu(partieDeMode);
    const cran = nombre(cible.nom.split('/').at(-1) ?? '');
    const { candidats: trouves, sens } = modeDuTheme && cran !== undefined
      ? variablesDeLaPaletteAuCran(catalogue, palette, modeDuTheme, cran, lectures)
      : { candidats: [], sens: 'inconnu' as SensLu };
    // Le cran vient de la table du kit et du sens lu dans le fichier. La recette de Palettes n'est pas lue (reste à faire dans Architect).
    if (trouves.length === 1 && sens !== 'partage') constat.correction = {
      id, sorte: 'alias-de-mode', cible: { variable: variable.cle, mode: mode.id }, avant: alias,
      apres: { cle: trouves[0].cle, nom: trouves[0].nom },
      aRelire: { axes: { mode: mode.nom }, regle: 'Un composant UCM vise le thème, pas une primitive à segment de mode.', avant: alias },
    };
    else constat.question = { id, candidats: trouves.map(({ cle, nom }) => ({ cle, nom })) };
    resultats.push(constat);
  }
  return resultats;
}

type LecturesDeThemes = Map<string, ReturnType<typeof lesPrefixes>>;

/**
 * Les variables de `theme` de la palette dont le rôle vise ce cran dans ce mode (table du kit, sens lu par `lireLeSens`). Un sens
 * `partage` ou inconnu réunit les deux tables : le cran ne tranche pas, la question n'a aucune présélection.
 */
function variablesDeLaPaletteAuCran(
  catalogue: CatalogueDeReference, palette: string, mode: ModeDuTheme, cran: number, lectures: LecturesDeThemes,
): { candidats: VariableDuCatalogue[]; sens: SensLu } {
  const candidats = new Map<string, VariableDuCatalogue>();
  let sens: SensLu = 'inconnu';
  for (const theme of catalogue.collections.filter((entree) => entree.role === 'theme' && entree.etat === 'lue')) {
    const modeLu = modesDuTheme(theme).find((entree) => entree.ucm === mode);
    if (!modeLu) continue;
    let lecture = lectures.get(theme.cle);
    if (!lecture) { lecture = lesPrefixes(catalogue, theme); lectures.set(theme.cle, lecture); }
    const prefixe = lecture.prefixes.get(formeDuChemin([palette]));
    if (!prefixe) continue;
    sens = lireLeSens(mode, lesJumelles(catalogue, prefixe, modeLu).vise);
    const sensLus: readonly SensDuTheme[] = sens === 'normal' || sens === 'inverse' ? [sens] : ['normal', 'inverse'];
    // Un rôle écrit deux fois occupe le cran avec deux variables : la correction n'a plus un seul candidat.
    const occupants = [...prefixe.presentes, ...prefixe.doublons.map(({ role, variable }) => [role, variable] as const)];
    for (const [role, variable] of occupants) {
      if (variable.distante || !sensLus.some((lu) => cranDeLaVariable(role, mode, lu) === cran)) continue;
      candidats.set(variable.cle, variable);
    }
  }
  return { candidats: [...candidats.values()], sens };
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
