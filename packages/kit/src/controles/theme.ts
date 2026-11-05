/** Contrôles des rôles peints et des alias de mode du thème UCM. */
import { formeDuChemin, formeReconnue, termeReconnu } from '../referentiel/reconnaissance.js';
import { CIBLES_ABSOLUES_DU_NEUTRE, cranDeLaVariable, type ModeDuTheme, type VariableDuTheme } from '../emplois/dossiers.js';
import { REGISTRE_COULEURS_ABSOLUES } from '../referentiel/architecture.js';
import { GARANTIES, etatDuFond } from '../emplois/garanties.js';
import { modeDuThemeReconnu, variableDuThemeReconnue } from '../referentiel/theme.js';
import { cheminDansLaCollection, collectionParCle, variableParCle, type CatalogueDeReference, type VariableDuCatalogue } from './catalogue.js';
import type { Constat, Correction, Question } from './constat.js';
import { lesJumelles, lesPrefixes, lireLeSens, type ModeLu, type SensLu } from './integrite.js';
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
        if (!variable || collection(catalogue, variable)?.role !== 'theme' || variableDuThemeReconnue(variable.nom) !== 'surface/foreground') continue;
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
        const cibleForme = formeDuNomRemplace(variable.nom, 'surface/foreground', 'page/foreground');
        const candidats: VariableDuCatalogue[] = [];
        let parcourues = 0;
        for (const entree of catalogue.variables) {
          parcourues += 1;
          if (parcourues % 256 === 0) yield;
          if (entree.collection === variable.collection && entree.etat === 'presente' && formeDuChemin(entree.nom) === cibleForme) candidats.push(entree);
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

/** Les fonds de `surface` que les garanties jugent, `subtle` excepté : un texte de surface se pose sur eux. */
const FONDS_DE_SURFACE: ReadonlySet<string> = new Set(
  GARANTIES.flatMap((garantie) => garantie.fonds).flatMap((fond) => ('variable' in fond && fond.variable.startsWith('surface/') && etatDuFond(fond) !== 'subtle' ? [fond.variable] : [])),
);

/** Une liaison illisible peut être un fond de surface : C59 ne l'accuse pas sur ce qu'il n'a pas lu. */
function* estFondDeSurface(liaison: LiaisonLue, catalogue: CatalogueDeReference): Generator<void, boolean> {
  if (liaison.illisible) return true;
  const variable = yield* trouverVariable(catalogue, liaison.variable.cle);
  return !!variable && collection(catalogue, variable)?.role === 'theme' && FONDS_DE_SURFACE.has(variableDuThemeReconnue(variable.nom) ?? '');
}

/**
 * Les alias de mode du thème, sans composant. La branche de mode d'une cible se lit dans son chemin (`primary/dark/300`, comme
 * l'écrit UCM Palettes), que les modes de la collection cible s'appellent Light et Dark ou portent des noms de marque. Une
 * cible qui vise la branche de l'autre mode reçoit une correction quand le sens de la palette et la table donnent une seule
 * variable dans la bonne branche, sinon une question qui porte le genre `branche-de-mode`. Le texte des boutons ne reçoit jamais de correction.
 */
export function controlerLesModes(catalogue: CatalogueDeReference): Constat[] {
  const resultats: Constat[] = [];
  for (const theme of catalogue.collections.filter((entree) => entree.role === 'theme' && entree.etat === 'lue')) {
    let lecture: ReturnType<typeof lesPrefixes> | undefined;
    // Deux modes de `theme` qui se lisent comme le même mode (`Light` en double) : aucune branche n'est la bonne, `mode-du-theme` le dit.
    const modesUcm = theme.modes.map((entree) => modeDuThemeReconnu(entree.nom));
    for (const variable of catalogue.variables.filter((entree) => entree.collection === theme.cle && entree.etat === 'presente')) {
      const cleTheme = variableDuThemeReconnue(variable.nom);
      if (!cleTheme) continue;
      for (const mode of theme.modes) {
        const valeur = variable.valeurs?.[mode.id];
        if (!valeur || !('alias' in valeur)) continue;
        const cible = variableParCle(catalogue, valeur.alias);
        if (!cible) continue;
        const collectionCible = collection(catalogue, cible);
        if (!collectionCible) continue;
        const segmentsCible = cible.nom.split('/');
        const branchesDeMarque = collectionCible.role === 'brands' || collectionCible.role === 'utility';
        const rangMode = segmentsCible.findIndex((segment) => modeDuThemeReconnu(segment) !== undefined
          && (branchesDeMarque || collectionCible.modes.some((modeCible) => formeReconnue(modeCible.nom) === formeReconnue(segment))));
        if (rangMode < 0) continue;
        const modeUcm = modeDuThemeReconnu(mode.nom);
        const modeActuel = modeDuThemeReconnu(segmentsCible[rangMode]);
        if (!modeUcm || !modeActuel || modeActuel === modeUcm || modesUcm.filter((reconnu) => reconnu === modeUcm).length > 1) continue;
        const id = `C60:${variable.cle}:${mode.id}`;
        const constat: Constat = { id, code: 'C60', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits: { variable: variable.nom, mode: mode.nom, cible: cible.nom } };
        const cycle = aliasEnBoucle(catalogue, cible.cle, segmentsCible[rangMode]);
        lecture ??= lesPrefixes(catalogue, theme);
        const sens = sensDeLaPalette(catalogue, lecture, variable, cleTheme, { id: mode.id, nom: mode.nom, ucm: modeUcm });
        const formesCibles = cycle ? [] : formesDeCiblesAttendues(cible, rangMode, modeActuel, modeUcm, cleTheme, sens);
        const candidats = catalogue.variables.filter((entree) => entree.collection === cible.collection && entree.etat === 'presente' && formesCibles.includes(formeDuChemin(entree.nom)));
        if (candidats.length === 1 && cleTheme !== 'solid/foreground' && !cycle && !aliasEnBoucle(catalogue, candidats[0].cle, mode.nom, variable.cle)) {
          constat.correction = {
            id, sorte: 'alias-de-mode', cible: { variable: variable.cle, mode: mode.id }, avant: valeur.alias,
            apres: { cle: candidats[0].cle, nom: candidats[0].nom },
            aRelire: { axes: { mode: mode.nom }, regle: `La cible de ${cleTheme} suit le mode ${mode.nom} et sa valeur dans TABLE_DES_DOSSIERS.`, avant: valeur.alias },
          };
        } else {
          constat.faits.genre = 'branche-de-mode';
          constat.question = question(constat, candidats);
        }
        resultats.push(constat);
      }
    }
  }
  return resultats;
}

/** Le sens que les autres variables du groupe établissent dans ce mode ; `null` pour une variable hors palette, dont la cible ne dépend pas du sens. */
function sensDeLaPalette(catalogue: CatalogueDeReference, lecture: ReturnType<typeof lesPrefixes>, variable: VariableDuCatalogue, role: VariableDuTheme, mode: ModeLu): SensLu | null {
  const chemin = cheminDansLaCollection(variable, catalogue);
  const groupe = chemin.slice(0, chemin.length - role.split('/').length);
  const prefixe = lecture.prefixes.get(formeDuChemin(groupe));
  return prefixe && groupe.length > 0 ? lireLeSens(mode.ucm, lesJumelles(catalogue, prefixe, mode).vise) : null;
}

/**
 * Les formes reconnues des noms attendus dans la bonne branche : comme la reconnaissance du fichier, elles ne dépendent ni de la casse
 * ni du séparateur. Un sens établi donne le cran de la table sans regarder le cran actuel, qui peut être celui de l'autre branche ou
 * celui du mode de la variable. Sans sens établi, un sens reste candidat quand sa table donne le cran actuel dans l'une des deux branches.
 */
function formesDeCiblesAttendues(
  cible: VariableDuCatalogue, rangMode: number, modeActuel: ModeDuTheme, modeVise: ModeDuTheme, role: VariableDuTheme, sens: SensLu | null,
): string[] {
  const segments = cible.nom.split('/').map(formeReconnue);
  const dernier = segments[segments.length - 1];
  if (rangMode === segments.length - 1) return [];
  const dansLaBonneBranche = (fin: string): string => {
    const copie = [...segments];
    copie[rangMode] = modeVise;
    copie[copie.length - 1] = fin;
    return copie.join('/');
  };
  if (role.startsWith('elevation/')) return [dansLaBonneBranche(dernier)];
  if (role in CIBLES_ABSOLUES_DU_NEUTRE) return [dansLaBonneBranche(CIBLES_ABSOLUES_DU_NEUTRE[role as keyof typeof CIBLES_ABSOLUES_DU_NEUTRE][modeVise])];
  if (role === 'solid/foreground') return termeReconnu(REGISTRE_COULEURS_ABSOLUES, dernier) ? ['white', 'black'].map(dansLaBonneBranche) : [];
  const cranActuel = Number(dernier);
  if (!Number.isFinite(cranActuel)) return [];
  const possibles = sens === 'normal' || sens === 'inverse' ? [sens] : (['normal', 'inverse'] as const).filter((candidat) =>
    cranDeLaVariable(role, modeActuel, candidat) === cranActuel || cranDeLaVariable(role, modeVise, candidat) === cranActuel);
  const formes = new Set<string>();
  for (const candidat of possibles) {
    const cran = cranDeLaVariable(role, modeVise, candidat);
    if (typeof cran === 'number') formes.add(dansLaBonneBranche(String(cran)));
  }
  return [...formes];
}

function aliasEnBoucle(catalogue: CatalogueDeReference, cle: string, nomMode: string, source?: string): boolean {
  const visitees = new Set<string>();
  let courante: string | undefined = cle;
  while (courante) {
    if (courante === source) return true;
    if (visitees.has(courante)) return true;
    visitees.add(courante);
    const variable = variableParCle(catalogue, courante);
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
/** La forme de `nom` dont la fin `suffixe` devient `remplacement`. */
function formeDuNomRemplace(nom: string, suffixe: string, remplacement: string): string {
  const prefixe = nom.split('/').slice(0, -suffixe.split('/').length);
  return prefixe.length === 0 ? remplacement : `${formeDuChemin(prefixe)}/${remplacement}`;
}
function collection(catalogue: CatalogueDeReference, variable: VariableDuCatalogue) { return collectionParCle(catalogue, variable.collection); }
function question(constat: Constat, candidats: readonly VariableDuCatalogue[]): Question { return { id: constat.id, candidats: candidats.map(({ cle, nom }) => ({ cle, nom })) }; }
function correctionDeLiaison(constat: Constat, layer: LayerLu, liaison: LiaisonLue, avant: VariableDuCatalogue, apres: VariableDuCatalogue, regle: string): Correction {
  return {
    id: constat.id, sorte: 'liaison',
    cible: { layer: liaison.surcharge?.id ?? layer.id, champ: liaison.champ, ...(liaison.indice === undefined ? {} : { indice: liaison.indice }), ...(liaison.plage ? { plage: liaison.plage } : {}), variable: avant.cle },
    avant: avant.nom, apres: { cle: apres.cle, nom: apres.nom },
    aRelire: { regle, avant: avant.nom },
  };
}
