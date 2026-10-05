/**
 * Écrit les palettes dans les variables de couleur du fichier ([VAR-07] à
 * [VAR-11], [VAR-16]), range la destination des tokens, et retire les
 * variables d'une palette supprimée. Avec `src/lectureDesVariables.ts`,
 * c'est le seul fichier qui appelle `figma.variables` ([ARC-13]).
 *
 * L'écriture part de la recette rangée, jamais de couleurs envoyées par
 * l'interface. Le plugin reconnaît ses variables par l'identifiant que le
 * suivi garde, jamais par leur nom. Il ne retire une variable que sur
 * « Supprimer les variables… ». Une palette reprise du fichier s'écrit dans
 * sa collection d'origine, sous le groupe configuré s'il diffère de son
 * groupe de référence, puis sous le dernier segment de son chemin d'origine.
 * Elle seule renomme des variables ([VAR-13]).
 */
import { aUneIntensite, jsonCanonique, profilPorteur, validerRecette, type Recette, type Refus } from 'ucm-couleur';

import { CLE_RECETTE, ESPACE_PARTAGE, empreinteDuTexte, lireEtat } from '../lecture';
import { ajouter, nouvellePalette, reprendreDuFichier } from '../edition';
import { collectionLue, lireLeSuiviRange, variableLue, variablesDeLaBibliotheque, type FigmaDesBibliotheques } from '../lectureDesVariables';
import { variablesDeLaRampe } from '../variables/bibliotheques';
import { validerLaDestination, type Destination, type RefusDeDestination } from '../variables/destination';
import { SEUIL_DE_PALETTE, nuanceDeReference, palettesDuFichier, type PaletteDuFichier } from '../variables/detection';
import { etatDesTokens } from '../variables/etat';
import { origineDeLaReprise, suiviDeLaReprise, variableDeLEntree, type OrigineDeLaReprise } from '../variables/reprise';
import { cheminDeLaReprise, planDesVariables, type EntreeDuPlan, type ModeDuPlan } from '../variables/plan';
import { couleurPourFigma, type VariableLue } from '../variables/releve';
import { CLES_DE_LA_VARIABLE, CLE_VARIABLES, suiviFutur, texteDuSuivi, variablesSuivies, type PaletteSuivie, type SuiviDesVariables, type VariableSuivie } from '../variables/suivi';

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
  | { readonly palette: string; readonly issue: 'mode-introuvable'; readonly mode: ModeDuPlan }
  /** Figma a refusé un mode Light ou Dark, selon l'offre du fichier ([VAR-10]). */
  | { readonly palette: string; readonly issue: 'modes-refuses'; readonly message: string }
  /** Figma a levé au milieu de la palette : les variables que cette écriture venait de créer pour elle sont retirées. */
  | { readonly palette: string; readonly issue: 'interrompue'; readonly message: string }
  /** La recette rangée ne contient pas cette palette. */
  | { readonly palette: string; readonly issue: 'absente' };

export type ResultatDeLEcriture =
  | { readonly issue: 'interrompue'; readonly message: string }
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
  try {
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
    if (lireEtat(figma.root).empreinte !== demande.empreinteLue) return { issue: 'recette-changee' };
    const profil = figma.root.documentColorProfile;
    const collections = new Map(collectionsLocales.map((collection) => [collection.id, collection]));
    const locales = new Map(variablesLocales.map((variable) => [variable.id, variable]));
    const lues = new Map<string, VariableLue>(variablesLocales.map((variable) => [variable.id, variableLue(variable, profil)]));
    const remettre = new Set(demande.remettre);

    let destination: Destination = rangee.destination;
    const suivies: { [id: string]: PaletteSuivie } = { ...rangee.palettes };
    /** Vrai dès qu'une collection, un mode, une variable ou une valeur a changé : le suivi se range et l'écriture se clôt. */
    let ecrit = false;

    /**
     * Écrit une palette reprise dans sa collection d'origine ([VAR-13]). Les
     * variables d'origine prennent le nom que le plan leur donne, sous le
     * groupe retenu par le plan et le segment de leur thème ou de leur
     * intensité ; une entrée du plan sans variable en crée une sous ce chemin,
     * et le mode Dark se trouve ou
     * se crée quand le plan écrit ce thème en mode. Une entrée sans nom ne
     * crée rien : sa variable disparue quitte le suivi. Un mode suivi disparu
     * refuse la palette avant toute mutation.
     */
    function ecrireLaReprise(id: string, suivie: PaletteSuivie, plan: readonly EntreeDuPlan[], origine: OrigineDeLaReprise | null, destination: Destination, palette: Recette['palettes'][number], intensite: PaletteSuivie['intensite']): IssueDeLaPalette {
      const collection = collections.get(suivie.collection);
      if (!collection) return { palette: id, issue: 'collection-introuvable' };
      const modes: { [M in ModeDuPlan]?: string } = { ...suivie.modes };
      const disparu = plan.find((entree) => modes[entree.mode] !== undefined && !collection.modes.some((mode) => mode.modeId === modes[entree.mode]));
      if (disparu) return { palette: id, issue: 'mode-introuvable', mode: disparu.mode };
      if (origine?.suivies.size === 0 && plan.length > 0) {
        if (!plan.some((entree) => entree.mode === 'dark')) delete modes.dark;
        if (!collection.modes.some((mode) => mode.modeId === modes.light)) modes.light = collection.defaultModeId;
      }
      if (modes.dark === undefined && plan.some((entree) => entree.mode === 'dark')) {
        try {
          const nomme = modeNomme(collection, 'Dark');
          if (nomme !== undefined && nomme !== modes.light) modes.dark = nomme;
          else {
            modes.dark = collection.addMode('Dark');
            ecrit = true;
          }
        } catch (erreur) {
          return { palette: id, issue: 'modes-refuses', message: messageDe(erreur) };
        }
      }
      const variableDuNom = new Map<string, Variable>();
      const creees: Variable[] = [];
      const gardees: { [cle: string]: VariableSuivie } = {};
      const chemin = origine ? cheminDeLaReprise(destination, suivie, recette, palette, origine) : suivie.chemin;
      /** Les clés dont le mode a quitté la collection : elles quittent le suivi. */
      const sansMode = new Set<string>();
      let valeurs = 0;
      /** Le suivi d'après : les clés écrites, celles d'un plan plus ancien dont la variable existe encore, et le chemin d'origine, que les noms ne rendent plus après un renommage. */
      const suivant = (retenues: { readonly [cle: string]: VariableSuivie }): PaletteSuivie => ({
        ...suivie,
        groupe: destination.groupe,
        modes,
        ...(chemin !== undefined ? { chemin } : {}),
        ...(intensite ? { intensite } : {}),
        variables: {
          ...Object.fromEntries(Object.entries(suivie.variables).filter(([cle, variable]) => !sansMode.has(cle) && locales.has(variable.id))),
          ...retenues,
        },
      });
      try {
        for (const entree of plan) {
          const mode = modes[entree.mode];
          if (mode === undefined || !collection.modes.some((candidat) => candidat.modeId === mode)) {
            sansMode.add(entree.cle);
            continue;
          }
          const presente = variableDeLEntree(entree, suivie, origine);
          let variable = locales.get(suivie.variables[entree.cle]?.id ?? '') ?? (presente ? locales.get(presente.id) : undefined) ?? variableDuNom.get(entree.nom);
          const couleur = couleurPourFigma(entree.hexa, profil);
          if (!variable) {
            if (entree.nom === '') continue;
            variable = figma.variables.createVariable(entree.nom, collection, 'COLOR');
            // Une primitive ne paraît dans aucun sélecteur de calque (D14).
            variable.scopes = [];
            creees.push(variable);
            // Une variable neuve porte sa couleur dans tous les modes de la collection, avant ce que le plan écrit dans chacun.
            for (const cible of collection.modes) variable.setValueForMode(cible.modeId, couleur);
            valeurs += 1;
            ecrit = true;
          } else {
            // Un renommage garde l'identifiant de la variable, donc ses liaisons.
            if (entree.nom !== '' && variable.name !== entree.nom) {
              variable.name = entree.nom;
              ecrit = true;
            }
            if (creees.includes(variable) || lues.get(variable.id)?.valeurs[mode] !== entree.hexa) {
              variable.setValueForMode(mode, couleur);
              valeurs += 1;
              ecrit = true;
            }
          }
          if (entree.nom !== '') variableDuNom.set(entree.nom, variable);
          gardees[entree.cle] = { id: variable.id, ecrite: entree.hexa };
        }
        for (const variable of creees) {
          const premiere = plan.find((entree) => variableDuNom.get(entree.nom) === variable)!;
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
        // Les valeurs déjà écrites dans les variables présentes le restent : le suivi les retient, pour ne pas les lire comme changées dans Figma.
        const presentes = Object.fromEntries(Object.entries(gardees).filter(([, variable]) => !creees.some((creee) => creee.id === variable.id)));
        suivies[id] = { ...suivant({}), variables: { ...suivie.variables, ...presentes } };
        return { palette: id, issue: 'interrompue', message: messageDe(erreur) };
      }
      suivies[id] = suivant(gardees);
      return { palette: id, issue: 'ecrite', creees: creees.length, ecrites: valeurs };
    }

    function ecrireLaPalette(id: string): IssueDeLaPalette {
      const palette = recette.palettes.find((candidate) => candidate.id === id);
      if (!palette) return { palette: id, issue: 'absente' };
      const suivie = suivies[id];
      const origine = suivie?.liaison === 'reprise' ? origineDeLaReprise(suivie, [...lues.values()]) : null;
      const plan = planDesVariables(recette, palette, destination, suivie, origine);
      const tokens = etatDesTokens(plan, suivie, lues, destination);
      if (tokens.modifiees.length > 0 && !remettre.has(id)) return { palette: id, issue: 'modifiee', couleurs: tokens.modifiees.length };
      if (suivie?.liaison === 'reprise') return ecrireLaReprise(id, suivie, plan, origine, destination, palette, suivie.intensite ?? (aUneIntensite(palette) ? undefined : profilPorteur(recette, palette)));

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
      const dansLaCollection = new Set(variablesLocales.filter((variable) => variable.variableCollectionId === collection.id).map((variable) => variable.name.toLowerCase()));
      const pris = aCreer.find((nom) => dansLaCollection.has(nom.toLowerCase()));
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
          const valeursLues = lues.get(variable.id)?.valeurs;
          const differente = entree.mode === 'unique'
            ? collection.modes.some((cible) => valeursLues?.[cible.modeId] !== entree.hexa)
            : valeursLues?.[mode] !== entree.hexa;
          if (neuves.has(variable) || differente) {
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
      if (suivie?.liaison === 'destination' && !garde) {
        const actuelles = new Set(Object.values(ecrites).map((variable) => variable.id));
        const anciennes = Object.fromEntries(Object.entries(suivie.variables).filter(([, variable]) => locales.has(variable.id) && !actuelles.has(variable.id)));
        if (Object.keys(anciennes).length > 0) {
          let rang = 1;
          while (suivies[`ancienne:${id}:${rang}`]) rang += 1;
          suivies[`ancienne:${id}:${rang}`] = { ...suivie, variables: anciennes, sortieAnterieureDe: id };
        }
      }
      suivies[id] = { collection: collection.id, groupe: destination.groupe, modes, variables: { ...(garde?.variables ?? {}), ...ecrites }, liaison: 'destination' };
      return { palette: id, issue: 'ecrite', creees: creees.length, ecrites: valeurs };
    }

    const demandees = new Set(demande.palettes);
    const dansLOrdre = [...recette.palettes.map((palette) => palette.id).filter((id) => demandees.has(id)), ...demande.palettes.filter((id) => !recette.palettes.some((palette) => palette.id === id))];
    const palettes = dansLOrdre.map((id) => {
      try {
        return ecrireLaPalette(id);
      } catch (erreur) {
        return { palette: id, issue: 'interrompue', message: messageDe(erreur) } as const;
      }
    });

    const suivant: SuiviDesVariables = { ...rangee, destination, palettes: suivies };
    if (ecrit || texteDuSuivi(suivant) !== texteDuSuivi(rangee)) {
      figma.root.setSharedPluginData(ESPACE_PARTAGE, CLE_VARIABLES, texteDuSuivi(suivant));
      figma.commitUndo();
    }
    return { issue: 'ecrites', palettes };
  } catch (erreur) {
    return { issue: 'interrompue', message: messageDe(erreur) };
  }
}

/** L'issue de « Enregistrer », dans la carte « Destination des tokens » ([VAR-16]). */
export type IssueDeLaDestination =
  | { readonly issue: 'interrompue'; readonly message: string }
  | { readonly issue: 'rangee'; readonly destination: Destination }
  | { readonly issue: 'invalide'; readonly refus: RefusDeDestination }
  | { readonly issue: 'suivi-futur' };

/**
 * Valide la destination, la range dans le suivi et la marque confirmée
 * ([VAR-16]). Une collection désignée par son identifiant doit être une
 * collection locale du fichier. Aucune variable ne bouge ([VAR-02]).
 */
export async function rangerLaDestination(figma: FigmaDesVariablesEcrites, valeur: unknown): Promise<IssueDeLaDestination> {
  try {
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
  } catch (erreur) {
    return { issue: 'interrompue', message: messageDe(erreur) };
  }
}

/** L'issue de « Supprimer les variables… », sur la carte d'une palette supprimée ([VAR-11]). */
export type IssueDuRetraitDesVariables =
  | { readonly issue: 'interrompue'; readonly retirees: number; readonly message: string }
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
  let retirees = 0;
  try {
    const rangee = lireLeSuiviRange(figma.root);
    if (suiviFutur(rangee)) return { issue: 'suivi-futur' };
    const { classement } = lireEtat(figma.root);
    if (classement.etat !== 'courante') return { issue: 'refuse' };
    if (classement.recette.palettes.some((palette) => palette.id === demande.palette)) return { issue: 'refuse' };
    const suivie = rangee.palettes[demande.palette];
    if (!suivie) return { issue: 'retirees', retirees: 0 };

    let interruption: unknown;
    const restantes = { ...suivie.variables };
    if (suivie.liaison === 'destination') {
      const locales = new Map((await figma.variables.getLocalVariablesAsync('COLOR')).map((variable) => [variable.id, variable]));
      for (const id of new Set(Object.values(suivie.variables).map((variable) => variable.id))) {
        const variable = locales.get(id);
        try {
          if (variable) {
            variable.remove();
            retirees += 1;
          }
          for (const [cle, suivie] of Object.entries(restantes)) if (suivie.id === id) delete restantes[cle];
        } catch (erreur) {
          interruption = erreur;
          break;
        }
      }
    }
    const palettes = Object.fromEntries(Object.entries(rangee.palettes).filter(([id]) => id !== demande.palette));
    if (interruption !== undefined) palettes[demande.palette] = { ...suivie, variables: restantes };
    figma.root.setSharedPluginData(ESPACE_PARTAGE, CLE_VARIABLES, texteDuSuivi({ ...rangee, palettes }));
    figma.commitUndo();
    return interruption !== undefined ? { issue: 'interrompue', retirees, message: messageDe(interruption) } : { issue: 'retirees', retirees };
  } catch (erreur) {
    return { issue: 'interrompue', retirees, message: messageDe(erreur) };
  }
}

/** Ce que « Modifier dans le plugin » demande : la recette qui porte la palette reprise, et la palette du fichier qu'elle reprend. */
export interface DemandeDeReprise {
  readonly recette: unknown;
  readonly empreinteLue: string | null;
  /** L'identifiant de la palette reprise, dans la recette demandée. */
  readonly palette: string;
  /** La palette du fichier : sa collection et le chemin commun de ses variables. */
  readonly source: { readonly collection: string; readonly chemin: string };
}

/** L'issue de « Modifier dans le plugin » ([VAR-13]). */
export type IssueDeLaReprise =
  | { readonly issue: 'interrompue'; readonly message: string }
  /** La recette et la liaison sont rangées ensemble ; `empreinte` est celle de la recette rangée. */
  | { readonly issue: 'reprise'; readonly empreinte: string }
  /** La recette rangée n'est plus celle que l'interface a lue ([REC-10]). */
  | { readonly issue: 'modifiee-ailleurs' }
  | { readonly issue: 'invalide'; readonly refus: readonly Refus[] }
  /** Le fichier ne porte plus cette palette dans ses variables, ou le plugin la tient déjà pour sienne. */
  | { readonly issue: 'palette-introuvable' }
  | { readonly issue: 'suivi-futur' };

/**
 * Reprend une palette du fichier ([VAR-13]) : range la recette qui la porte
 * et la liaison de reprise de son suivi, ensemble, sous un seul
 * `commitUndo`. Le sandbox relit les variables et retrouve lui-même la
 * palette du fichier : la liaison ne vient jamais de l'interface. Aucune
 * variable n'est écrite.
 */
export async function reprendreLaPalette(figma: FigmaDesVariablesEcrites, demande: DemandeDeReprise): Promise<IssueDeLaReprise> {
  try {
    const rangee = lireLeSuiviRange(figma.root);
    if (suiviFutur(rangee)) return { issue: 'suivi-futur' };
    const validee = validerRecette(demande.recette);
    if ('refus' in validee) return { issue: 'invalide', refus: validee.refus };
    const { recette } = validee;
    if (!recette.palettes.some((palette) => palette.id === demande.palette)) return { issue: 'palette-introuvable' };
    const avant = lireEtat(figma.root);
    if (avant.empreinte !== demande.empreinteLue) return { issue: 'modifiee-ailleurs' };

    const profil = figma.root.documentColorProfile;
    const [collections, variables] = await Promise.all([
      figma.variables.getLocalVariableCollectionsAsync(),
      figma.variables.getLocalVariablesAsync('COLOR'),
    ]);
    if (lireEtat(figma.root).empreinte !== demande.empreinteLue) return { issue: 'modifiee-ailleurs' };
    // Les variables que le plugin tient pour siennes sous la recette d'avant ne se reprennent pas.
    const presentes = new Set(avant.classement.etat === 'courante' ? avant.classement.recette.palettes.map((palette) => palette.id) : []);
    const source = palettesDuFichier(variables.map((variable) => variableLue(variable, profil)), collections.map(collectionLue), variablesSuivies(rangee, presentes))
      .find((candidate) => candidate.collection === demande.source.collection && candidate.chemin === demande.source.chemin);
    if (!source) return { issue: 'palette-introuvable' };

    const texte = jsonCanonique(recette);
    figma.root.setSharedPluginData(ESPACE_PARTAGE, CLE_RECETTE, texte);
    figma.root.setSharedPluginData(ESPACE_PARTAGE, CLE_VARIABLES, texteDuSuivi({ ...rangee, palettes: { ...rangee.palettes, [demande.palette]: suiviDeLaReprise(source) } }));
    figma.commitUndo();
    return { issue: 'reprise', empreinte: empreinteDuTexte(texte) as string };
  } catch (erreur) {
    return { issue: 'interrompue', message: messageDe(erreur) };
  }
}

/** L'API que la copie d'une palette de bibliothèque emploie. */
export interface FigmaDeLaCopie extends FigmaDesBibliotheques {
  readonly root: FigmaDesVariablesEcrites['root'];
  readonly variables: Pick<VariablesAPI, 'importVariableByKeyAsync' | 'getVariableCollectionByIdAsync'>;
  commitUndo(): void;
}

/** Ce que « Copier dans le plugin » demande : l'identifiant de la palette à créer, et la palette de bibliothèque à copier. */
export interface DemandeDeCopie {
  readonly empreinteLue: string | null;
  /** L'identifiant, tiré par l'interface, de la palette que la copie crée. */
  readonly palette: string;
  /** La palette de bibliothèque : la clé de sa collection et le chemin commun de ses variables. */
  readonly source: { readonly collection: string; readonly chemin: string };
}

/** L'issue de « Copier dans le plugin » ([VAR-14]). */
export type IssueDeLaCopie = (
  /** La recette porte la palette copiée ; `importees` variables de la bibliothèque ont rejoint le fichier. */
  | { readonly issue: 'copiee'; readonly empreinte: string; readonly importees: number }
  /** La recette rangée n'est plus celle que l'interface a lue ([REC-10]). */
  | { readonly issue: 'modifiee-ailleurs' }
  /** La bibliothèque ne porte plus cette palette. */
  | { readonly issue: 'palette-introuvable' }
  /** Aucune des variables importées ne porte de couleur dans le thème Light : rien à copier. */
  | { readonly issue: 'sans-couleur' }
  /** Figma a levé en listant ou en important les variables de la bibliothèque. */
  | { readonly issue: 'bibliotheque-illisible'; readonly message: string }
  | { readonly issue: 'invalide'; readonly refus: readonly Refus[] }
) & { readonly importsEffectues?: readonly string[] };

/**
 * Copie une palette de bibliothèque dans le plugin ([VAR-14]) : importe les
 * variables de cette seule palette, lit leurs couleurs, puis la reprend en
 * mode `recalculees` et range la recette, sous un seul `commitUndo`. La
 * copie n'a pas de liaison de reprise : elle s'écrira dans la destination
 * des tokens, jamais dans la bibliothèque.
 */
export async function copierLaPalette(figma: FigmaDeLaCopie, demande: DemandeDeCopie): Promise<IssueDeLaCopie> {
  const importsEffectues: string[] = [];
  const echouer = (issue: IssueDeLaCopie): IssueDeLaCopie => importsEffectues.length > 0 ? { ...issue, importsEffectues } : issue;
  try {
    const avant = lireEtat(figma.root);
    if (avant.empreinte !== demande.empreinteLue) return { issue: 'modifiee-ailleurs' };
    if (avant.classement.etat !== 'courante' && avant.classement.etat !== 'absente') return { issue: 'invalide', refus: [] };
    const recette: Recette = avant.classement.recette;
    const provisoire = nouvellePalette(recette, demande.palette, '#000000', 1);
    if (!provisoire) return { issue: 'invalide', refus: [] };
    const controle = validerRecette(ajouter(recette, provisoire));
    if ('refus' in controle) return { issue: 'invalide', refus: controle.refus };
    const { teamLibrary } = figma;
    if (!teamLibrary) return { issue: 'bibliotheque-illisible', message: 'figma.teamLibrary' };

    let importees: Variable[];
    let nuances: number[];
    try {
      const rampe = variablesDeLaRampe(await variablesDeLaBibliotheque({ teamLibrary }, demande.source.collection), demande.source.chemin);
      if (rampe.size < SEUIL_DE_PALETTE) return { issue: 'palette-introuvable' };
      nuances = [...rampe.keys()].sort((a, b) => a - b);
      if (lireEtat(figma.root).empreinte !== demande.empreinteLue) return { issue: 'modifiee-ailleurs' };
      const lectures = await Promise.allSettled(nuances.map((nuance) => figma.variables.importVariableByKeyAsync(rampe.get(nuance)!.cle)));
      importees = lectures.flatMap((lecture) => lecture.status === 'fulfilled' ? [lecture.value] : []);
      importsEffectues.push(...importees.map((variable) => variable.name));
      const refusee = lectures.find((lecture) => lecture.status === 'rejected');
      if (refusee?.status === 'rejected') return echouer({ issue: 'bibliotheque-illisible', message: messageDe(refusee.reason) });
    } catch (erreur) {
      return echouer({ issue: 'bibliotheque-illisible', message: messageDe(erreur) });
    }

    const profil = figma.root.documentColorProfile;
    let collection: VariableCollection | null;
    try {
      collection = await figma.variables.getVariableCollectionByIdAsync(importees[0].variableCollectionId);
    } catch (erreur) {
      return echouer({ issue: 'bibliotheque-illisible', message: messageDe(erreur) });
    }
    if (!collection) return echouer({ issue: 'palette-introuvable' });
    if (lireEtat(figma.root).empreinte !== demande.empreinteLue) return echouer({ issue: 'modifiee-ailleurs' });
    const { modes, nom } = collectionLue(collection);
    const lues = importees.map((variable) => variableLue(variable, profil));
    const source: PaletteDuFichier = {
      collection: collection.id,
      nomDeLaCollection: nom,
      chemin: demande.source.chemin,
      nuances,
      variables: lues.map((variable) => variable.id),
      modes,
      couleurs: Object.fromEntries(modes.map((mode) => [mode.id, lues.map((variable) => variable.valeurs[mode.id] ?? null)])),
      reference: nuanceDeReference(nuances),
    };
    const palette = reprendreDuFichier(recette, demande.palette, source, 'recalculees');
    if (!palette) return echouer({ issue: 'sans-couleur' });
    const validee = validerRecette(ajouter(recette, palette));
    if ('refus' in validee) return echouer({ issue: 'invalide', refus: validee.refus });
    const texte = jsonCanonique(validee.recette);
    figma.root.setSharedPluginData(ESPACE_PARTAGE, CLE_RECETTE, texte);
    figma.commitUndo();
    return { issue: 'copiee', empreinte: empreinteDuTexte(texte) as string, importees: importees.length };
  } catch (erreur) {
    return echouer({ issue: 'bibliotheque-illisible', message: messageDe(erreur) });
  }
}
