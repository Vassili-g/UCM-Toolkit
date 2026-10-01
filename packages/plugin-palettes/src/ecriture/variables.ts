/**
 * Écrit les palettes dans les variables de couleur du fichier ([VAR-07] à
 * [VAR-11], [VAR-16]), range la destination des tokens, et retire les
 * variables d'une palette supprimée. Avec `src/lectureDesVariables.ts`,
 * c'est le seul fichier qui appelle `figma.variables` ([ARC-13]).
 *
 * L'écriture part de la recette rangée, jamais de couleurs envoyées par
 * l'interface. Le plugin reconnaît ses variables par l'identifiant que le
 * suivi garde, jamais par leur nom. Il ne renomme ni ne déplace une
 * variable, et n'en retire que sur « Supprimer les variables… ».
 */
import { lireEtat, ESPACE_PARTAGE } from '../lecture';
import { lireLeSuiviRange, variableLue } from '../lectureDesVariables';
import { validerLaDestination, type Destination, type RefusDeDestination } from '../variables/destination';
import { etatDesTokens } from '../variables/etat';
import { planDesVariables, type EntreeDuPlan, type ModeDuPlan } from '../variables/plan';
import { couleurPourFigma, type VariableLue } from '../variables/releve';
import { CLES_DE_LA_VARIABLE, CLE_VARIABLES, suiviFutur, texteDuSuivi, type PaletteSuivie, type SuiviDesVariables, type VariableSuivie } from '../variables/suivi';

/** L'API que l'écriture des variables emploie. */
export interface FigmaDesVariablesEcrites {
  readonly root: {
    getSharedPluginData(espace: string, cle: string): string;
    setSharedPluginData(espace: string, cle: string, valeur: string): void;
    readonly documentColorProfile: DocumentNode['documentColorProfile'];
  };
  readonly variables: Pick<VariablesAPI, 'getLocalVariableCollectionsAsync' | 'getLocalVariablesAsync' | 'createVariableCollection' | 'createVariable'>;
  commitUndo(): void;
}

/** Ce que l'interface demande : des identifiants de palette, l'empreinte lue, et les palettes dont le designer remet les couleurs. */
export interface DemandeDEcriture {
  readonly palettes: readonly string[];
  readonly empreinteLue: string | null;
  /** Les palettes « Modifiés dans Figma » dont le designer a choisi « Remettre les couleurs du plugin » ([VAR-06]). */
  readonly remettre: readonly string[];
}

/** Ce que l'écriture a fait d'une palette. */
export type IssueDeLaPalette =
  /** `creees` variables sont nées, `ecrites` valeurs ont changé ; zéro et zéro pour une palette déjà à jour. */
  | { readonly palette: string; readonly issue: 'ecrite'; readonly creees: number; readonly ecrites: number }
  /** Des couleurs ont été changées dans Figma, et le designer n'a pas choisi de les remettre : rien n'est écrit ([VAR-06]). */
  | { readonly palette: string; readonly issue: 'modifiee'; readonly couleurs: number }
  /** Une variable de ce nom existe dans la collection sans être celle du plugin : rien n'est créé ([VAR-08]). */
  | { readonly palette: string; readonly issue: 'nom-pris'; readonly nom: string }
  /** La collection que la destination désigne n'est plus dans le fichier. */
  | { readonly palette: string; readonly issue: 'collection-introuvable' }
  /** Figma a refusé un mode Light ou Dark, selon l'offre du fichier ([VAR-10]). */
  | { readonly palette: string; readonly issue: 'modes-refuses'; readonly message: string }
  /** Figma a levé au milieu de la palette : les variables que cette écriture venait de créer pour elle sont retirées. */
  | { readonly palette: string; readonly issue: 'interrompue'; readonly message: string }
  /** La recette rangée ne contient pas cette palette. */
  | { readonly palette: string; readonly issue: 'absente' };

export type ResultatDeLEcriture =
  | { readonly issue: 'ecrites'; readonly palettes: readonly IssueDeLaPalette[] }
  /** La recette rangée n'est plus celle que l'interface a lue : rien n'est écrit. */
  | { readonly issue: 'recette-changee' }
  | { readonly issue: 'sans-recette' }
  /** Le suivi vient d'une version plus récente du plugin : rien n'est écrit. */
  | { readonly issue: 'suivi-futur' };

const messageDe = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

/** Le mode d'une collection qui porte ce nom, sans casse ni espaces autour. */
function modeNomme(collection: VariableCollection, nom: string): string | undefined {
  return collection.modes.find((mode) => mode.name.trim().toLowerCase() === nom.toLowerCase())?.modeId;
}

/**
 * Écrit les palettes demandées, dans l'ordre de la recette ([VAR-07]).
 * Chaque palette réussit ou échoue seule : une palette arrêtée n'empêche pas
 * les suivantes. Le suivi se range après les valeurs, et un seul
 * `commitUndo` clôt l'écriture.
 */
export async function ecrireLesVariables(figma: FigmaDesVariablesEcrites, demande: DemandeDEcriture): Promise<ResultatDeLEcriture> {
  const etat = lireEtat(figma.root);
  if (etat.classement.etat !== 'courante') return { issue: 'sans-recette' };
  if (etat.empreinte !== demande.empreinteLue) return { issue: 'recette-changee' };
  const recette = etat.classement.recette;
  const rangee = lireLeSuiviRange(figma.root);
  if (suiviFutur(rangee)) return { issue: 'suivi-futur' };

  const [collectionsLocales, variablesLocales] = await Promise.all([
    figma.variables.getLocalVariableCollectionsAsync(),
    figma.variables.getLocalVariablesAsync('COLOR'),
  ]);
  const profil = figma.root.documentColorProfile;
  const collections = new Map(collectionsLocales.map((collection) => [collection.id, collection]));
  const locales = new Map(variablesLocales.map((variable) => [variable.id, variable]));
  const lues = new Map<string, VariableLue>(variablesLocales.map((variable) => [variable.id, variableLue(variable, profil)]));
  const remettre = new Set(demande.remettre);

  let destination: Destination = rangee.destination;
  const suivies: { [id: string]: PaletteSuivie } = { ...rangee.palettes };
  /** Vrai dès qu'une collection, un mode, une variable ou une valeur a changé : le suivi se range et l'écriture se clôt. */
  let ecrit = false;

  function ecrireLaPalette(id: string): IssueDeLaPalette {
    const palette = recette.palettes.find((candidate) => candidate.id === id);
    if (!palette) return { palette: id, issue: 'absente' };
    const plan = planDesVariables(recette, palette, destination);
    const suivie = suivies[id];
    const tokens = etatDesTokens(plan, suivie, lues, destination);
    if (tokens.etat === 'modifies' && !remettre.has(id)) return { palette: id, issue: 'modifiee', couleurs: tokens.modifiees.length };

    // La collection du suivi, tant que la destination n'a pas changé ; sinon celle de la destination ([VAR-09]).
    const garde = suivie && !tokens.destinationChangee && collections.has(suivie.collection) ? suivie : undefined;
    let collection: VariableCollection;
    if (garde) collection = collections.get(garde.collection)!;
    else if ('id' in destination.collection) {
      const designee = collections.get(destination.collection.id);
      if (!designee) return { palette: id, issue: 'collection-introuvable' };
      collection = designee;
    } else {
      collection = figma.variables.createVariableCollection(destination.collection.nom);
      collections.set(collection.id, collection);
      // La collection créée devient la destination : la palette suivante la rejoint au lieu d'en créer une autre.
      destination = { ...destination, collection: { id: collection.id } };
      ecrit = true;
    }

    // Les modes que le plan écrit ([VAR-10]).
    const modes: { [M in ModeDuPlan]?: string } = {};
    const existe = (mode: string | undefined): mode is string => mode !== undefined && collection.modes.some((candidat) => candidat.modeId === mode);
    if (destination.themes === 'chemin') {
      modes.unique = existe(garde?.modes.unique) ? garde!.modes.unique : collection.defaultModeId;
    } else {
      try {
        // Une collection sans variable et à un seul mode est neuve : son mode se renomme, plutôt que d'en ajouter un.
        const neuve = collection.variableIds.length === 0 && collection.modes.length === 1;
        let light = existe(garde?.modes.light) ? garde!.modes.light : modeNomme(collection, 'Light');
        if (light === undefined) {
          if (neuve) {
            collection.renameMode(collection.defaultModeId, 'Light');
            light = collection.defaultModeId;
          } else light = collection.addMode('Light');
          ecrit = true;
        }
        let dark = existe(garde?.modes.dark) ? garde!.modes.dark : modeNomme(collection, 'Dark');
        if (dark === undefined) {
          dark = collection.addMode('Dark');
          ecrit = true;
        }
        modes.light = light;
        modes.dark = dark;
      } catch (erreur) {
        return { palette: id, issue: 'modes-refuses', message: messageDe(erreur) };
      }
    }

    // La variable de chaque entrée : celle que le suivi désigne, quand elle existe encore.
    const variableDuNom = new Map<string, Variable>();
    for (const entree of plan) {
      const connue = garde?.variables[entree.cle];
      const variable = connue ? locales.get(connue.id) : undefined;
      if (variable && !variableDuNom.has(entree.nom)) variableDuNom.set(entree.nom, variable);
    }
    const aCreer = [...new Set(plan.map((entree) => entree.nom))].filter((nom) => !variableDuNom.has(nom));
    // Avant toute création : un nom déjà pris dans la collection arrête la palette ([VAR-08]).
    const dansLaCollection = new Set(variablesLocales.filter((variable) => variable.variableCollectionId === collection.id).map((variable) => variable.name));
    const pris = aCreer.find((nom) => dansLaCollection.has(nom));
    if (pris !== undefined) return { palette: id, issue: 'nom-pris', nom: pris };

    const creees: Variable[] = [];
    const ecrites: { [cle: string]: VariableSuivie } = {};
    let valeurs = 0;
    try {
      for (const nom of aCreer) {
        const variable = figma.variables.createVariable(nom, collection, 'COLOR');
        // Une primitive ne paraît dans aucun sélecteur de calque (D14).
        variable.scopes = [];
        creees.push(variable);
        variableDuNom.set(nom, variable);
        ecrit = true;
      }
      const neuves = new Set(creees);
      for (const entree of plan) {
        const variable = variableDuNom.get(entree.nom)!;
        const mode = modes[entree.mode]!;
        if (neuves.has(variable) || lues.get(variable.id)?.valeurs[mode] !== entree.hexa) {
          const couleur = couleurPourFigma(entree.hexa, profil);
          // Thèmes dans le chemin : la même valeur dans tous les modes de la collection ([VAR-10]).
          for (const cible of entree.mode === 'unique' ? collection.modes.map((candidat) => candidat.modeId) : [mode]) variable.setValueForMode(cible, couleur);
          valeurs += 1;
          ecrit = true;
        }
        ecrites[entree.cle] = { id: variable.id, ecrite: entree.hexa };
      }
      for (const variable of creees) {
        const premiere = plan.find((entree: EntreeDuPlan) => variableDuNom.get(entree.nom) === variable)!;
        variable.setSharedPluginData(ESPACE_PARTAGE, CLES_DE_LA_VARIABLE.palette, id);
        variable.setSharedPluginData(ESPACE_PARTAGE, CLES_DE_LA_VARIABLE.cle, premiere.cle);
      }
    } catch (erreur) {
      for (const variable of creees) {
        try {
          variable.remove();
        } catch {
          // Une variable que Figma refuse de retirer reste dans le fichier, hors du suivi.
        }
      }
      // Les valeurs déjà écrites dans des variables suivies le restent : le suivi les retient, pour ne pas les lire comme changées dans Figma.
      const gardees = Object.fromEntries(Object.entries(ecrites).filter(([, variable]) => !creees.some((creee) => creee.id === variable.id)));
      if (garde && Object.keys(gardees).length > 0) suivies[id] = { ...garde, variables: { ...garde.variables, ...gardees } };
      return { palette: id, issue: 'interrompue', message: messageDe(erreur) };
    }

    // Une clé d'un plan plus ancien reste suivie tant que la destination n'a pas changé : ses variables restent celles du plugin.
    suivies[id] = { collection: collection.id, groupe: destination.groupe, modes, variables: { ...(garde?.variables ?? {}), ...ecrites }, liaison: 'destination' };
    return { palette: id, issue: 'ecrite', creees: creees.length, ecrites: valeurs };
  }

  const demandees = new Set(demande.palettes);
  const dansLOrdre = [...recette.palettes.map((palette) => palette.id).filter((id) => demandees.has(id)), ...demande.palettes.filter((id) => !recette.palettes.some((palette) => palette.id === id))];
  const palettes = dansLOrdre.map(ecrireLaPalette);

  const suivant: SuiviDesVariables = { ...rangee, destination, palettes: suivies };
  if (ecrit || texteDuSuivi(suivant) !== texteDuSuivi(rangee)) {
    figma.root.setSharedPluginData(ESPACE_PARTAGE, CLE_VARIABLES, texteDuSuivi(suivant));
    figma.commitUndo();
  }
  return { issue: 'ecrites', palettes };
}

/** L'issue de « Enregistrer », dans la carte « Destination des tokens » ([VAR-16]). */
export type IssueDeLaDestination =
  | { readonly issue: 'rangee'; readonly destination: Destination }
  | { readonly issue: 'invalide'; readonly refus: RefusDeDestination }
  | { readonly issue: 'suivi-futur' };

/**
 * Valide la destination, la range dans le suivi et la marque confirmée
 * ([VAR-16]). Une collection désignée par son identifiant doit être une
 * collection locale du fichier. Aucune variable ne bouge ([VAR-02]).
 */
export async function rangerLaDestination(figma: FigmaDesVariablesEcrites, valeur: unknown): Promise<IssueDeLaDestination> {
  const rangee = lireLeSuiviRange(figma.root);
  if (suiviFutur(rangee)) return { issue: 'suivi-futur' };
  const validee = validerLaDestination(valeur);
  if ('refus' in validee) return { issue: 'invalide', refus: validee.refus };
  const { destination } = validee;
  if ('id' in destination.collection) {
    const visee = destination.collection.id;
    const locales = await figma.variables.getLocalVariableCollectionsAsync();
    if (!locales.some((collection) => collection.id === visee)) return { issue: 'invalide', refus: 'collection' };
  }
  figma.root.setSharedPluginData(ESPACE_PARTAGE, CLE_VARIABLES, texteDuSuivi({ ...rangee, destination, confirmee: true }));
  figma.commitUndo();
  return { issue: 'rangee', destination };
}

/** L'issue de « Supprimer les variables… », sur la carte d'une palette supprimée ([VAR-11]). */
export type IssueDuRetraitDesVariables =
  /** `retirees` variables ont quitté le fichier, et la palette a quitté le suivi. */
  | { readonly issue: 'retirees'; readonly retirees: number }
  /** Rien n'est écrit : la recette ne se lit pas, ou contient de nouveau la palette. */
  | { readonly issue: 'refuse' }
  | { readonly issue: 'suivi-futur' };

/**
 * Retire du fichier les variables que le suivi garde pour une palette
 * supprimée, et la palette du suivi, dans une seule écriture close par un
 * seul `commitUndo` ([VAR-11]). Le sandbox relit tout : il ne retire rien
 * quand la recette rangée contient encore la palette. Une palette reprise du
 * fichier garde ses variables d'origine : seul son suivi est oublié.
 */
export async function retirerLesVariables(figma: FigmaDesVariablesEcrites, demande: { readonly palette: string }): Promise<IssueDuRetraitDesVariables> {
  const rangee = lireLeSuiviRange(figma.root);
  if (suiviFutur(rangee)) return { issue: 'suivi-futur' };
  const { classement } = lireEtat(figma.root);
  if (classement.etat !== 'courante') return { issue: 'refuse' };
  if (classement.recette.palettes.some((palette) => palette.id === demande.palette)) return { issue: 'refuse' };
  const suivie = rangee.palettes[demande.palette];
  if (!suivie) return { issue: 'retirees', retirees: 0 };

  let retirees = 0;
  if (suivie.liaison === 'destination') {
    const locales = new Map((await figma.variables.getLocalVariablesAsync('COLOR')).map((variable) => [variable.id, variable]));
    for (const id of new Set(Object.values(suivie.variables).map((variable) => variable.id))) {
      const variable = locales.get(id);
      if (!variable) continue;
      variable.remove();
      retirees += 1;
    }
  }
  const palettes = Object.fromEntries(Object.entries(rangee.palettes).filter(([id]) => id !== demande.palette));
  figma.root.setSharedPluginData(ESPACE_PARTAGE, CLE_VARIABLES, texteDuSuivi({ ...rangee, palettes }));
  figma.commitUndo();
  return { issue: 'retirees', retirees };
}
