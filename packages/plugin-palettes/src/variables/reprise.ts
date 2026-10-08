/**
 * La reprise d'une palette du fichier ([VAR-13]) : ce que « Modifier dans le
 * plugin » lit d'elle, et la liaison que le suivi en garde. Une palette
 * reprise garde ses variables d'origine, avec leurs liaisons : le plugin
 * les renomme sous le segment de leur thème ou de leur intensité, et crée
 * sous leur chemin ce que la palette porte de plus. Pur : ni Figma, ni DOM.
 */
import { MODES, type CouleursFigees, type Intensite, type Mode, type Palette } from 'ucm-couleur';

import { nuanceDeReference, type GroupeRange, type PaletteDuFichier, type PaletteGroupee } from './detection';
import { cleDuPlan, type EntreeDuPlan } from './plan';
import type { CollectionLue, ModeLu, VariableLue } from './releve';
import type { PaletteSuivie, VariableSuivie } from './suivi';

/**
 * Le mode de la collection que chaque thème vise. Light vise le mode dont le
 * nom contient « light », sans casse, sinon le premier mode qui porte une
 * couleur directe. Dark vise un autre mode dont le nom contient « dark » ;
 * sans lui, le thème Dark ne s'écrit pas.
 */
export function modesDeLaReprise(
  modes: readonly ModeLu[],
  couleurs?: { readonly [mode: string]: readonly (string | null)[] },
): { readonly light: ModeLu | null; readonly dark: ModeLu | null } {
  const nomme = (mot: string): ModeLu | undefined => modes.find((mode) => mode.nom.toLowerCase().includes(mot));
  const porteUneCouleur = (mode: ModeLu): boolean => couleurs === undefined || (couleurs[mode.id] ?? []).some((couleur) => couleur !== null);
  const light = (nomme('light') && porteUneCouleur(nomme('light')!))
    ? nomme('light')!
    : modes.find(porteUneCouleur) ?? nomme('light') ?? modes[0] ?? null;
  const dark = modes.find((mode) => mode !== light && mode.nom.toLowerCase().includes('dark') && porteUneCouleur(mode)) ?? null;
  return { light, dark };
}

/** Les couleurs qu'une palette du fichier porte dans chaque thème, dans l'ordre de ses nuances ; `null` pour un alias. */
export interface CouleursDeLaReprise {
  readonly nuances: readonly number[];
  readonly light: readonly (string | null)[];
  /** `null` quand la collection n'a pas de mode Dark. */
  readonly dark: readonly (string | null)[] | null;
}

export function couleursDeLaReprise(palette: PaletteDuFichier): CouleursDeLaReprise {
  const { light, dark } = modesDeLaReprise(palette.modes, palette.couleurs);
  const sans = palette.nuances.map(() => null);
  return {
    nuances: palette.nuances,
    light: light ? palette.couleurs[light.id] ?? sans : sans,
    dark: dark ? palette.couleurs[dark.id] ?? sans : null,
  };
}

/**
 * La nuance colorée en Light la plus proche de la nuance de référence du
 * fichier ; à distance égale, la plus sombre. `null` quand aucune nuance ne
 * porte de couleur en Light. Le plugin ancre la référence de la palette
 * reprise à la couleur de cette nuance.
 */
export function nuanceDAncrage(lues: CouleursDeLaReprise, reference: number): { readonly nuance: number; readonly rang: number } | null {
  const colorees = lues.nuances.map((nuance, rang) => ({ nuance, rang })).filter(({ rang }) => lues.light[rang] !== null);
  if (colorees.length === 0) return null;
  return colorees.reduce((choisie, candidate) => {
    const ecart = Math.abs(candidate.nuance - reference) - Math.abs(choisie.nuance - reference);
    return ecart < 0 || (ecart === 0 && candidate.nuance > choisie.nuance) ? candidate : choisie;
  });
}

/** Le mode de reprise des couleurs ; le même type que `ModeDeReprise` de `src/edition.ts`, qui importe ce module. */
type ModeDeLaRepriseGroupee = 'recalculees' | 'telles-quelles';

/**
 * Ce que la reprise d'une palette groupée tire des couleurs du fichier : la
 * référence de la palette neuve et les réglages qui s'y ajoutent.
 */
export interface CouleursDeLaRepriseGroupee {
  /** Les nuances des groupes, en ordre croissant. */
  readonly nuances: readonly number[];
  /** La référence de la palette neuve, en hexa. */
  readonly reference: string;
  /** Les champs de la palette neuve qui s'ajoutent à sa référence : ses couleurs figées et leurs nuances en mode `telles-quelles`, rien en mode `recalculees`. */
  readonly reglages: Partial<Palette>;
}

/** Le groupe qui porte l'ancrage : Soft en Light, ou le seul groupe Light. */
function groupeDAncrage(groupee: PaletteGroupee): GroupeRange {
  return groupee.groupes.find((groupe) => (groupe.intensite === null || groupe.intensite === 'soft') && (groupe.theme === null || groupe.theme === 'light')) ?? groupee.groupes[0];
}

/**
 * Les couleurs figées d'une palette groupée ([VAR-13]), lues dans chaque
 * groupe : `crans` porte les seules nuances que le thème Light colore dans
 * chaque intensité, et `figees` leurs couleurs. Les thèmes d'une forme dans le
 * chemin se lisent dans le mode Light de la collection, comme dans le suivi ;
 * ceux d'une forme en modes, dans ses modes Light et Dark. Un alias du thème
 * Dark prend la couleur de Light. `themes-chemin` donne la forme d'une
 * intensité, les deux autres formes `{ soft, vivid }`. La référence est la
 * couleur de la nuance d'ancrage du groupe Soft en Light, parmi ces nuances.
 */
function couleursFigeesDeLaGroupee(groupee: PaletteGroupee): CouleursDeLaRepriseGroupee | null {
  const { palette: ancre } = groupeDAncrage(groupee);
  const viser = modesDeLaReprise(ancre.modes, ancre.couleurs);
  const enModes = groupee.forme === 'intensites-themes-modes';
  const lire = (intensite: GroupeRange['intensite'], theme: Mode): readonly (string | null)[] | null => {
    const groupe = groupee.groupes.find((candidat) => candidat.intensite === intensite && (candidat.theme === theme || candidat.theme === null));
    const mode = enModes ? viser[theme] : viser.light;
    return groupe && mode ? groupe.palette.couleurs[mode.id] ?? null : null;
  };
  const lues: { readonly light: readonly (string | null)[]; readonly dark: readonly (string | null)[] | null }[] = [];
  for (const intensite of groupee.forme === 'themes-chemin' ? [null] : (['soft', 'vivid'] as const)) {
    const light = lire(intensite, 'light');
    if (!light) return null;
    lues.push({ light, dark: lire(intensite, 'dark') });
  }
  const colorees = ancre.nuances.map((nuance, rang) => ({ nuance, rang })).filter(({ rang }) => lues.every(({ light }) => light[rang] !== null));
  const ancrage = nuanceDAncrage({ nuances: colorees.map(({ nuance }) => nuance), light: colorees.map(({ rang }) => lues[0].light[rang]), dark: null }, ancre.reference);
  if (!ancrage) return null;
  const figees = lues.map(({ light, dark }): CouleursFigees => {
    const claires = colorees.map(({ rang }) => light[rang]!.slice(0, 7));
    return dark ? { light: claires, dark: colorees.map(({ rang }, place) => (dark[rang] ?? claires[place]).slice(0, 7)) } : { light: claires };
  });
  return {
    nuances: ancre.nuances,
    reference: lues[0].light[colorees[ancrage.rang].rang]!,
    reglages: { crans: colorees.map(({ nuance }) => nuance), figees: groupee.forme === 'themes-chemin' ? figees[0] : { soft: figees[0], vivid: figees[1] } },
  };
}

/**
 * Le point unique des couleurs d'une palette groupée. `recalculees` : la
 * référence est la couleur de la nuance d'ancrage du groupe Soft en Light (ou
 * du seul groupe Light), sans autre réglage. `telles-quelles` : les couleurs
 * du fichier, figées (`couleursFigeesDeLaGroupee`). Rend `null` quand aucune
 * nuance ne porte de couleur en Light.
 */
export function couleursDeLaRepriseGroupee(groupee: PaletteGroupee, mode: ModeDeLaRepriseGroupee): CouleursDeLaRepriseGroupee | null {
  if (mode === 'telles-quelles') return couleursFigeesDeLaGroupee(groupee);
  const { palette } = groupeDAncrage(groupee);
  const lues = couleursDeLaReprise(palette);
  const ancre = nuanceDAncrage(lues, palette.reference);
  if (!ancre) return null;
  return { nuances: lues.nuances, reference: lues.light[ancre.rang]!, reglages: {} };
}

/**
 * Le suivi d'une palette reprise : ses clés désignent les variables
 * d'origine, par identifiant, et la dernière couleur écrite prend la couleur
 * lue. Une palette reprise telle quelle est donc « À jour » sans écriture.
 * Une variable qui porte un alias dans un thème n'y est pas suivie : le
 * plugin n'écrase pas un alias.
 */
export function suiviDeLaReprise(palette: PaletteDuFichier): PaletteSuivie {
  const viser = modesDeLaReprise(palette.modes, palette.couleurs);
  const couleurs = couleursDeLaReprise(palette);
  const variables: { [cle: string]: VariableSuivie } = {};
  const modes: { light?: string; dark?: string } = {};
  for (const mode of MODES) {
    const cible = viser[mode];
    const lues = mode === 'light' ? couleurs.light : couleurs.dark;
    if (!cible || !lues) continue;
    modes[mode] = cible.id;
    palette.nuances.forEach((nuance, rang) => {
      const lue = lues[rang];
      if (lue !== null) variables[cleDuPlan('unique', mode, nuance)] = { id: palette.variables[rang], ecrite: lue };
    });
  }
  return {
    collection: palette.collection,
    groupe: palette.chemin.split('/').slice(0, -1).join('/'),
    modes,
    variables,
    liaison: 'reprise',
    chemin: palette.chemin,
  };
}

/**
 * Le suivi d'une palette groupée reprise : chaque variable de chaque groupe
 * est rangée sous la clé que le plan lui donne, pour qu'une mise à jour des
 * tokens ne renomme ni ne crée rien. Comme dans le plan, l'intensité qui
 * porte les variables d'origine s'écrit sous `unique` (ici Soft, que
 * `intensite` consigne) et l'autre sous son nom. Le chemin consigné est la
 * racine : le dernier segment nomme la palette. Les thèmes d'une forme dans
 * le chemin se lisent dans le mode Light de la collection ; ceux d'une forme
 * en modes, dans les modes Light et Dark.
 */
export function suiviDeLaRepriseGroupee(groupee: PaletteGroupee): PaletteSuivie {
  const { palette: ancre } = groupeDAncrage(groupee);
  const viser = modesDeLaReprise(ancre.modes, ancre.couleurs);
  const themesEnModes = groupee.forme === 'intensites-themes-modes';
  const modes: { light?: string; dark?: string } = {};
  if (viser.light) modes.light = viser.light.id;
  if (themesEnModes && viser.dark) modes.dark = viser.dark.id;
  const variables: { [cle: string]: VariableSuivie } = {};
  for (const { intensite, theme, palette } of groupee.groupes) {
    const rangee: Intensite = intensite === null || intensite === 'soft' ? 'unique' : intensite;
    // Une forme dans le chemin lit chaque groupe dans le mode Light, pour son thème ; une forme en modes lit les deux modes du groupe.
    const lectures: readonly (readonly [Mode, string | undefined])[] = themesEnModes
      ? MODES.map((mode) => [mode, modes[mode]] as const)
      : [[theme ?? 'light', modes.light]];
    for (const [mode, cible] of lectures) {
      const lues = cible === undefined ? undefined : palette.couleurs[cible];
      if (!lues) continue;
      palette.nuances.forEach((nuance, rang) => {
        const lue = lues[rang];
        if (lue !== null) variables[cleDuPlan(rangee, mode, nuance)] = { id: palette.variables[rang], ecrite: lue };
      });
    }
  }
  return {
    collection: groupee.collection,
    groupe: groupee.racine.split('/').slice(0, -1).join('/'),
    modes,
    variables,
    liaison: 'reprise',
    chemin: groupee.racine,
    ...(groupee.forme === 'themes-chemin' ? {} : { intensite: 'soft' as const }),
  };
}

/**
 * Ce que le fichier porte autour d'une palette reprise : le plan y lit le
 * nom de chaque variable, et l'écriture la variable qu'une entrée vise.
 */
export interface OrigineDeLaReprise {
  /** Le chemin commun des variables d'origine à la reprise, sans leur nuance : celui que le suivi garde, sinon celui de leurs noms. */
  readonly chemin: string;
  /** Les variables de couleur de la collection, par nom. */
  readonly parNom: ReadonlyMap<string, VariableLue>;
  /** Les variables que le suivi de la palette désigne et que le fichier porte encore, par identifiant. */
  readonly suivies: ReadonlyMap<string, VariableLue>;
}

/**
 * Vrai pour une clé du suivi qui désigne une variable d'origine : la rampe
 * Light sous `unique`, et le thème Dark quand la collection le porte en
 * mode. Les autres clés désignent des variables créées sous leur chemin.
 */
function estDOrigine(suivie: PaletteSuivie, cle: string): boolean {
  return cle.startsWith('unique/light/') || (suivie.modes.dark !== undefined && cle.startsWith('unique/dark/'));
}

/**
 * L'origine d'une palette reprise, relue dans les variables d'aujourd'hui.
 * `null` quand le fichier ne porte plus aucune variable d'origine : le
 * chemin où créer n'est plus connu.
 */
export function origineDeLaReprise(suivie: PaletteSuivie, variables: readonly VariableLue[]): OrigineDeLaReprise | null {
  const lues = new Map(variables.map((variable) => [variable.id, variable]));
  const suivies = new Map<string, VariableLue>();
  const origine: string[] = [];
  for (const [cle, variable] of Object.entries(suivie.variables)) {
    const lue = lues.get(variable.id);
    if (!lue) continue;
    suivies.set(lue.id, lue);
    if (estDOrigine(suivie, cle)) origine.push(lue.nom);
  }
  const parNom = new Map(variables.filter((variable) => variable.collection === suivie.collection).map((variable) => [variable.nom, variable]));
  if (origine.length === 0) {
    return suivie.chemin ? { chemin: suivie.chemin, parNom, suivies } : null;
  }
  const cheminRange = suivie.chemin;
  const profondeur = cheminRange ? cheminRange.split('/').length : 0;
  const prefixesActuels = profondeur > 0
    ? origine.map((nom) => nom.split('/').slice(0, profondeur).join('/'))
    : [];
  const cheminActuel = prefixesActuels[0];
  const memeCheminIgnoreLaCasse = cheminRange !== undefined
    && cheminActuel !== undefined
    && prefixesActuels.every((prefixe) => prefixe === cheminActuel)
    && cheminActuel.split('/').every((segment, rang) => segment.toLowerCase() === cheminRange.split('/')[rang]?.toLowerCase());
  return {
    chemin: memeCheminIgnoreLaCasse ? cheminActuel : cheminRange ?? cheminCommun(origine),
    parNom,
    suivies,
  };
}

/**
 * La variable qu'une entrée du plan écrit, quand le fichier la porte : celle
 * que le suivi désigne sous sa clé, sinon une variable de la palette qui
 * porte déjà son nom, pour un thème en mode que le suivi ne désigne pas
 * encore.
 */
export function variableDeLEntree(entree: Pick<EntreeDuPlan, 'cle' | 'nom'>, suivie: PaletteSuivie, origine: OrigineDeLaReprise | null): VariableLue | undefined {
  if (!origine) return undefined;
  const connue = suivie.variables[entree.cle];
  const designee = connue ? origine.suivies.get(connue.id) : undefined;
  if (designee) return designee;
  const homonyme = origine.parNom.get(entree.nom);
  return homonyme && origine.suivies.has(homonyme.id) ? homonyme : undefined;
}

/** Les thèmes qu'une liaison de reprise écrit : ceux dont le suivi garde un mode. */
export function themesDeLaReprise(suivie: PaletteSuivie): Mode[] {
  return MODES.filter((mode) => suivie.modes[mode] !== undefined);
}

/** Le chemin commun à des noms de variables, sans leur dernier segment ; vide quand ils n'en partagent aucun. */
export function cheminCommun(noms: readonly string[]): string {
  if (noms.length === 0) return '';
  const segments = noms.map((nom) => nom.split('/'));
  const commun: string[] = [];
  for (let rang = 0; segments.every((liste) => rang < liste.length - 1 && liste[rang] === segments[0][rang]); rang += 1) commun.push(segments[0][rang]);
  return commun.join('/');
}

/**
 * La palette du fichier qu'une liaison de reprise désigne, relue dans les
 * variables d'aujourd'hui : c'est elle que la bascule « Recalculées · Telles
 * quelles » de Création reprend de nouveau ([UI-34]). `null` quand sa
 * collection ou toutes ses variables ont quitté le fichier.
 */
export function sourceDeLaReprise(
  suivie: PaletteSuivie,
  fichier: { readonly collections: readonly CollectionLue[]; readonly variables: readonly VariableLue[] },
): PaletteDuFichier | null {
  const collection = fichier.collections.find((candidate) => candidate.id === suivie.collection);
  if (!collection) return null;
  const lues = new Map(fichier.variables.map((variable) => [variable.id, variable]));
  const parNuance = new Map<number, VariableLue>();
  for (const [cle, variable] of Object.entries(suivie.variables)) {
    if (!estDOrigine(suivie, cle)) continue;
    const nuance = Number(cle.slice(cle.lastIndexOf('/') + 1));
    const lue = lues.get(variable.id);
    if (lue && Number.isFinite(nuance) && !parNuance.has(nuance)) parNuance.set(nuance, lue);
  }
  if (parNuance.size === 0) return null;
  const nuances = [...parNuance.keys()].sort((a, b) => a - b);
  // Les modes que la liaison écrit, dans l'ordre de la collection.
  const modes = collection.modes.filter((mode) => mode.id === suivie.modes.light || mode.id === suivie.modes.dark);
  const darkSepare = suivie.modes.dark === undefined && Object.keys(suivie.variables).some((cle) => cle.startsWith('unique/dark/'));
  const dark = darkSepare ? nuances.map((nuance) => {
    const variable = suivie.variables[`unique/dark/${nuance}`];
    return variable && suivie.modes.light ? lues.get(variable.id)?.valeurs[suivie.modes.light] ?? null : null;
  }) : null;
  const modeDark = 'ucm-dark-chemin';
  return {
    collection: collection.id,
    nomDeLaCollection: collection.nom,
    chemin: suivie.chemin ?? cheminCommun(nuances.map((nuance) => parNuance.get(nuance)!.nom)),
    nuances,
    variables: nuances.map((nuance) => parNuance.get(nuance)!.id),
    modes: dark ? [...modes, { id: modeDark, nom: 'Dark' }] : modes,
    couleurs: {
      ...Object.fromEntries(modes.map((mode) => [mode.id, nuances.map((nuance) => parNuance.get(nuance)!.valeurs[mode.id] ?? null)])),
      ...(dark ? { [modeDark]: dark } : {}),
    },
    reference: nuanceDeReference(nuances),
  };
}
