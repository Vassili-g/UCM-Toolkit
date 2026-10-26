/** Contrôles des rôles peints et des alias de mode du thème UCM. */
import { formeReconnue } from '../referentiel/reconnaissance.js';
import {
  TABLE_DES_DOSSIERS, VARIABLES_DU_THEME,
  type ModeDuTheme, type SensDuTheme,
} from '../emplois/dossiers.js';
import type { CatalogueDeReference, VariableDuCatalogue } from './catalogue.js';
import type { Constat, Correction, Question } from './constat.js';
import type { LayerLu, LiaisonLue, ReleveDeComposant, VariantLu } from './releve.js';

/** Détecte une couleur `surface/foreground` sans fond de surface dans un composant. Les alias de mode sont dans `controlerLesModes`. */
export function controlerLeTheme(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  const calcul = controlerLeThemeParEtapes(releve, catalogue);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

/** Cède dans les liaisons, les fonds ancêtres et les candidats ; C60 reste dans `controlerLesModes`. */
export function* controlerLeThemeParEtapes(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const resultats: Constat[] = [];
  for (const variant of releve.variants) {
    yield;
    const layers = new Map<string, LayerLu>();
    for (const layer of variant.layers) {
      yield;
      layers.set(layer.id, layer);
    }
    for (const layer of variant.layers) {
      yield;
      for (const liaison of liaisonsDuLayer(layer)) {
        yield;
        if (!liaison) continue;
        const variable = yield* trouverVariable(catalogue, liaison.variable.cle);
        if (!variable || collection(catalogue, variable)?.role !== 'theme' || cleDuTheme(variable.nom) !== 'surface/foreground') continue;
        if (yield* aUnFondDeSurface(layer, layers, catalogue)) continue;
        const constat: Constat = {
          id: `C59:${variant.id}:${layer.id}${liaison.surcharge ? `>${liaison.surcharge.id}` : ''}:${liaison.champ}:${liaison.indice ?? liaison.plage?.debut ?? ''}`,
          code: 'C59', type: 'corriger', famille: 'liaisons', variants: [variant.id], layers: [layer.id],
          faits: {
            variable: variable.nom, champ: liaison.champ, calque: liaison.surcharge?.nom ?? layer.nom,
            ...(liaison.surcharge ? { surcharge: liaison.surcharge.id } : {}),
            ...(liaison.indice === undefined ? {} : { indice: liaison.indice }),
            ...(liaison.plage ? { plageDebut: liaison.plage.debut, plageFin: liaison.plage.fin } : {}),
          },
        };
        const cibleNom = remplacerSuffixe(variable.nom, 'surface/foreground', 'page/foreground');
        const candidats: VariableDuCatalogue[] = [];
        let parcourues = 0;
        for (const entree of catalogue.variables) {
          parcourues += 1;
          if (parcourues % 256 === 0) yield;
          if (entree.nom === cibleNom && entree.collection === variable.collection && entree.etat === 'presente') candidats.push(entree);
        }
        if (candidats.length === 1) constat.correction = correctionDeLiaison(constat, layer, liaison, variable, candidats[0], 'Un texte lié à surface/foreground doit être posé sur un fond de surface visible.');
        else {
          const choix: { cle: string; nom: string }[] = [];
          for (const candidat of candidats) {
            yield;
            choix.push({ cle: candidat.cle, nom: candidat.nom });
          }
          constat.question = { id: constat.id, candidats: choix };
        }
        resultats.push(constat);
      }
    }
  }
  return resultats;
}

function* aUnFondDeSurface(layer: LayerLu, layers: ReadonlyMap<string, LayerLu>, catalogue: CatalogueDeReference): Generator<void, boolean> {
  let courant: LayerLu | undefined = layer;
  const visites = new Set<string>();
  while (courant && !visites.has(courant.id)) {
    yield;
    visites.add(courant.id);
    for (const peinture of courant.peintures) {
      yield;
      if (peinture.champ !== 'fills' || !peinture.visible) continue;
      for (const liaison of courant.liaisons) {
        yield;
        if (liaison.surcharge || liaison.champ !== 'fills' || liaison.indice !== peinture.indice) continue;
        if (yield* estFondDeSurface(liaison, catalogue)) return true;
      }
    }
    courant = courant.parent ? layers.get(courant.parent) : undefined;
  }
  return false;
}

/** Une liaison illisible peut être un fond de surface : C59 ne l'accuse pas sur ce qu'il n'a pas lu. */
function* estFondDeSurface(liaison: LiaisonLue, catalogue: CatalogueDeReference): Generator<void, boolean> {
  if (liaison.illisible) return true;
  const variable = yield* trouverVariable(catalogue, liaison.variable.cle);
  return !!variable && collection(catalogue, variable)?.role === 'theme' && /^surface\/(default|hover|pressed)$/.test(cleDuTheme(variable.nom) ?? '');
}

/** Les alias de mode du thème, sans composant. */
export function controlerLesModes(catalogue: CatalogueDeReference): Constat[] {
  const resultats: Constat[] = [];
  for (const theme of catalogue.collections.filter((entree) => entree.role === 'theme' && entree.etat === 'lue')) {
    for (const variable of catalogue.variables.filter((entree) => entree.collection === theme.cle && entree.etat === 'presente')) {
      const cleTheme = cleDuTheme(variable.nom);
      if (!cleTheme) continue;
      for (const mode of theme.modes) {
        const valeur = variable.valeurs?.[mode.id];
        if (!valeur || !('alias' in valeur)) continue;
        const cible = catalogue.variables.find((entree) => entree.cle === valeur.alias);
        if (!cible) continue;
        const collectionCible = collection(catalogue, cible);
        if (!collectionCible) continue;
        const segmentMode = cible.nom.split('/').findIndex((segment) => collectionCible.modes.some((modeCible) => formeReconnue(modeCible.nom) === formeReconnue(segment)));
        if (segmentMode < 0) continue;
        const modeCible = collectionCible.modes.find((entree) => formeReconnue(entree.nom) === formeReconnue(cible.nom.split('/')[segmentMode]));
        const modeUcm = modeUcmDepuisNom(mode.nom);
        const modeActuel = modeCible && modeUcmDepuisNom(modeCible.nom);
        if (!modeUcm || !modeActuel || modeActuel === modeUcm) continue;
        const id = `C60:${variable.cle}:${mode.id}`;
        const constat: Constat = { id, code: 'C60', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits: { variable: variable.nom, mode: mode.nom, cible: cible.nom } };
        const cycle = aliasEnBoucle(catalogue, cible.cle, modeCible.nom);
        const nomsCibles = cycle ? [] : nomsDeCiblesAttendues(cible, modeCible.nom, modeUcm, cleTheme, collectionCible.modes);
        const candidats = catalogue.variables.filter((entree) => entree.collection === cible.collection && entree.etat === 'presente' && nomsCibles.includes(entree.nom));
        if (candidats.length === 1 && !cycle && !aliasEnBoucle(catalogue, candidats[0].cle, mode.nom, variable.cle)) {
          constat.correction = {
            id, sorte: 'alias-de-mode', cible: { variable: variable.cle, mode: mode.id }, avant: valeur.alias,
            apres: { cle: candidats[0].cle, nom: candidats[0].nom },
            aRelire: { axes: { mode: mode.nom }, regle: `La cible de ${cleTheme} suit le mode ${mode.nom} et sa valeur dans TABLE_DES_DOSSIERS.`, avant: valeur.alias },
          };
        } else constat.question = question(constat, candidats);
        resultats.push(constat);
      }
    }
  }
  return resultats;
}

function nomsDeCiblesAttendues(cible: VariableDuCatalogue, modeActuel: string, modeVise: ModeDuTheme, cle: string, modes: readonly { id: string; nom: string }[]): string[] {
  const cranActuel = Number(cible.nom.split('/').at(-1));
  if (!Number.isFinite(cranActuel)) return [];
  const sensPossibles = (['normal', 'inverse'] as const).filter((sens) => TABLE_DES_DOSSIERS[modeUcmDepuisNom(modeActuel) ?? 'light'][sens][cle as keyof typeof TABLE_DES_DOSSIERS.light.normal] === cranActuel);
  const rangMode = cible.nom.split('/').findIndex((segment) => modes.some((mode) => formeReconnue(mode.nom) === formeReconnue(segment)));
  if (rangMode < 0) return [];
  const noms = new Set<string>();
  for (const sens of sensPossibles) {
    const cran = valeurDuDossier(modeVise, sens, cle);
    if (typeof cran !== 'number') continue;
    const segments = cible.nom.split('/');
    segments[rangMode] = modeVise;
    segments[segments.length - 1] = String(cran);
    noms.add(segments.join('/'));
  }
  return [...noms];
}

function valeurDuDossier(mode: ModeDuTheme, sens: SensDuTheme, cle: string): number | 'texteDesBoutons' | undefined {
  if (!Object.prototype.hasOwnProperty.call(TABLE_DES_DOSSIERS[mode][sens], cle)) return undefined;
  return TABLE_DES_DOSSIERS[mode][sens][cle as keyof typeof TABLE_DES_DOSSIERS.light.normal];
}

function modeUcmDepuisNom(nom: string): ModeDuTheme | undefined {
  const mode = formeReconnue(nom);
  return mode === 'light' || mode === 'dark' ? mode : undefined;
}

function aliasEnBoucle(catalogue: CatalogueDeReference, cle: string, nomMode: string, source?: string): boolean {
  const visitees = new Set<string>();
  let courante: string | undefined = cle;
  while (courante) {
    if (courante === source) return true;
    if (visitees.has(courante)) return true;
    visitees.add(courante);
    const variable = catalogue.variables.find((entree) => entree.cle === courante);
    if (!variable?.valeurs) return false;
    const modes = collection(catalogue, variable)?.modes ?? [];
    const idMode = modes.find((mode) => formeReconnue(mode.nom) === formeReconnue(nomMode))?.id;
    const valeurs = idMode ? [variable.valeurs[idMode]] : Object.values(variable.valeurs);
    const alias = valeurs.find((entree): entree is { alias: string } => !!entree && 'alias' in entree);
    courante = alias?.alias;
  }
  return false;
}

/** Cède toutes les 256 variables parcourues : un parcours bref ne doit pas coûter une tranche par variable. */
function* trouverVariable(catalogue: CatalogueDeReference, cle: string): Generator<void, VariableDuCatalogue | undefined> {
  let parcourues = 0;
  for (const variable of catalogue.variables) {
    parcourues += 1;
    if (parcourues % 256 === 0) yield;
    if (variable.cle === cle) return variable;
  }
  return undefined;
}

function* liaisonsDuLayer(layer: LayerLu): Generator<LiaisonLue | undefined> {
  yield* layer.liaisons;
  for (const plage of layer.texte?.plages ?? []) {
    yield;
    yield* plage.liaisons;
  }
}
function cleDuTheme(nom: string): string | undefined {
  return [...VARIABLES_DU_THEME].sort((a, b) => b.length - a.length).find((cle) => nom === cle || nom.endsWith(`/${cle}`));
}
function remplacerSuffixe(nom: string, suffixe: string, remplacement: string): string {
  return nom.endsWith(suffixe) ? `${nom.slice(0, -suffixe.length)}${remplacement}` : nom;
}
function collection(catalogue: CatalogueDeReference, variable: VariableDuCatalogue) { return catalogue.collections.find((entree) => entree.cle === variable.collection); }
function question(constat: Constat, candidats: readonly VariableDuCatalogue[]): Question { return { id: constat.id, candidats: candidats.map(({ cle, nom }) => ({ cle, nom })) }; }
function correctionDeLiaison(constat: Constat, layer: LayerLu, liaison: LiaisonLue, avant: VariableDuCatalogue, apres: VariableDuCatalogue, regle: string): Correction {
  return {
    id: constat.id, sorte: 'liaison',
    cible: { layer: liaison.surcharge?.id ?? layer.id, champ: liaison.champ, ...(liaison.indice === undefined ? {} : { indice: liaison.indice }), ...(liaison.plage ? { plage: liaison.plage } : {}), variable: avant.cle },
    avant: avant.nom, apres: { cle: apres.cle, nom: apres.nom },
    aRelire: { regle, avant: avant.nom },
  };
}
