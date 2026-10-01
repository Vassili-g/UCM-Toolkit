/**
 * La traduction anglaise de `fr.ts`, clé pour clé : le français validé reste
 * la référence de chaque constat et de chaque geste. Les planches n'emploient
 * que `fr.ts` ; leurs entrées sont traduites ici pour garder un catalogue
 * complet. Un message a trois parties : où, quoi, geste ([VER-09]).
 *
 * Les clés `soft`, `vivid`, `light`, `dark` et les codes d'emploi restent
 * ceux des données ; seul leur affichage se traduit ici.
 */
import type { ChampDePalette } from '../importation';
import type { EtatDuCadre } from '../planche/fraicheur';
import {
  FORMAT_RECETTE,
  RANGS,
  ecrireArrondi as arrondiFrancais,
  ecrireContraste as contrasteFrancais,
  niveauxWcag,
  type Alerte,
  type Ancrage,
  type Association,
  type Bout,
  type CauseDeLaBorne,
  type Emploi,
  type EmploiDUnCran,
  type EtatDePaire,
  type GrandeurDuColorShift,
  type ManqueDeGarantie,
  type MembrePaire,
  type Mode,
  type NiveauxWcag,
  type Palette,
  type Intensite,
  type Profil,
  type Recette,
  type Refus,
  type RegleRecette,
} from 'ucm-couleur';

import type { CibleDAction, GroupeDePromesses } from '../presentation';

const ecrireArrondi = (valeur: number, precision: number): string => arrondiFrancais(valeur, precision).replace(',', '.');
const ecrireContraste = (valeur: number): string => contrasteFrancais(valeur).replace(',', '.');

export const TEXTES = {
  numeroDeNuance: (numero: number) => `shade ${numero}`,
  langue: 'Language',
  langueNonRangee: "Language not saved. Try again.",
  reessayerLangue: 'Save language again',
  titre: 'UCM Palettes',
  titreConfiguration: "Shared settings",
  largeurDeLaFenetre: (largeur: number) => `${largeur} px`,
  etiquetteDesOnglets: "Plugin navigation",
  // N130. Les clés portent le nom de leur module (Q6.1).
  ongletCreation: "Create",
  ongletGestion: 'Palettes',
  lectureEnCours: "Loading palettes and settings…",
  recetteAbsente: "Create your first palette. The default settings will be used.",
  choisirUnePalette: "Choose a palette",
  // N134 : le sélecteur sans palette choisie, puis l'invitation dessous (maquette Z3.3, D1, texte a).
  selectionnerUnePalette: "Select a palette",
  invitationTitre: "Choose a palette",
  invitation: "Select a palette or choose “New palette”.",
  dessiner: "Generate in Figma",
  prete: "Ready",
  reference: "Reference colour",
  nom: "Palette name",
  apercu: "Shade preview",
  modesDeLApercu: "Preview theme",
  modeClair: "Light theme",
  modeSombre: "Dark theme",
  titrePromesses: "Contrasts to fix",
  titreAlertes: "Points to check",
  titreNotices: "Notes",
  // N075, N086 : le bouton de la barre, puis le titre de la carte qu'il ouvre.
  nouvellePalette: "New palette",
  titreDeLaCreation: "New palette",
  creer: "Create palette",
  annuler: "Cancel",
  gestesDeLaPalette: "Palette actions",
  dupliquer: "Duplicate palette",
  monter: "Move up",
  descendre: "Move down",
  supprimer: "Delete palette",
  recharger: "Reload palettes",
  // N070, N071 : la sortie d'un conflit d'enregistrement (V12.1).
  exporterLeBrouillon: "Export my changes",
  conflitEnCours: "Export your changes or reload the palettes before saving, importing or generating.",
  detailTechnique: "Technical details",
  ouvrirLesReglages: "Open shared settings",
  reglagesCommuns: "Shared settings",
  retour: "Back to palettes",
  // N102 : le bilan d'une palette libre, à la place des résultats Soft et Vivid (W3.5, W6.6).
  paletteLibre: (nombre: number) => `Freeform palette · ${nombre} shades`,
} as const;

/**
 * Le titre de premier rang de l'onglet Création et les titres de ses cartes
 * (N076, N077, N027). La carte d'aperçu ne montre pas son titre : il reste son
 * nom accessible.
 */
export const TEXTES_DE_L_ONGLET = {
  titre: (nom: string) => `Palette ${nom}`,
  configuration: "Palette settings",
  apercu: "Preview",
  garanties: "Contrast guarantees",
  derive: "Color shift",
  sousTitreDeLaDerive: "Adjust shades around the reference ◆",
  sousTitreDesGaranties: "The contrast of each use",
} as const;

/** Le pied de l'onglet Création et son volet ([UI-18]). */
export const TEXTES_DU_PIED = {
  region: "Palette summary",
  details: "Details",
  titre: "Guarantees and alerts",
  fermer: "Close",
  aucun: "All guarantees met. No alerts.",
} as const;

/**
 * Le bilan du pied ([UI-18]) : « 76 guarantees met · no alerts »,
 * « 2 of 76 guarantees unmet · 1 alert », « Free palette · 2 alerts ».
 */
export function bilanDuPied(garanties: number, manquees: number, alertes: number, libre: boolean): string {
  const lesAlertes = alertes === 0 ? "no alerts" : alertes === 1 ? "1 alert" : `${alertes} alerts`;
  if (libre) return `Free palette · ${lesAlertes}`;
  if (manquees === 0) return `${garanties} ${garanties === 1 ? "guarantee met" : "guarantees met"} · ${lesAlertes}`;
  return `${manquees} of ${garanties} ${garanties === 1 ? "guarantee" : "guarantees"} unmet · ${lesAlertes}`;
}

/** Le titre d'un groupe de messages et son nombre ([VER-14]) : « Promesses à corriger · 2 ». */
export function titreDeGroupe(titre: string, nombre: number): string {
  return `${titre} · ${nombre}`;
}

/** Le libellé du lien qu'un message pose vers un réglage ([VER-15]). */
export const LIBELLES_DES_CIBLES: Record<CibleDAction, string> = {
  reference: "Reference colour",
  'intensites-palette': "Global adjustment",
  derive: "Color shift",
  'luminosite-commune': "Shade lightness",
  fonds: "Background colours",
  'intensites-communes': "Shared intensities",
  'ajuster-reference': "Adjust reference colour",
};

/** Les libellés des Réglages communs (section 8.3), dans l'ordre du panneau. */
export const TEXTES_DE_CONFIGURATION = {
  courbes: "Shade lightness",
  cran: "Shade",
  clair: "Light theme",
  sombre: "Dark theme",
  parts: "Intensities",
  seuilProfilsConfondus: "Minimum difference between Soft and Vivid",
  fonds: "Background colours",
  fondDuMode: { light: "Light theme background", dark: "Dark theme background" },
  seuilsDeContraste: "Minimum contrast",
  seuilTexte: "Text",
  seuilNonTexte: "Graphical elements",
  couleursProches: "Similar colour detection",
  seuilPalettesProches: "Minimum difference between two palettes",
  sansRecette: "Could not read palettes and settings. Import a valid backup.",
  aideCourbes: "Lightness from 0 to 1, for all palettes.",
  aideEcarts: "A higher threshold flags more similar colours. Differences are measured in ΔEok.",
  aideMinimums: "These thresholds change guarantee results, not colours or WCAG levels.",
  retablir: "Reset",
  // N059 : la garantie des courbes ne remplace pas celles des palettes (V9.4).
  garantieCommune: "Checked across all hues. Also check each palette’s “Contrast guarantees” card.",
  // N060, réécrit en W6.4 : « Rétablir » des courbes, quand la liste des nuances vient d'un import.
  courbesSansDefaut: "No default curves for this imported shade list.",
  // N091 : le titre de chaque ligne de la table des courbes, et le nom de la table (W4.3).
  courbeDuMode: { light: 'Light', dark: 'Dark' },
  tableDesCourbes: "Lightness of each shade, Light then Dark",
  // N092 : l'aide de chaque seuil, sous son libellé (W4.4).
  aideSeuilTexte: "For text on surface, on-solid on solid, and text on the background.",
  aideSeuilNonTexte: "For input borders, focus rings and solid fills in the hover state.",
  aideProfilsConfondus: "Measured between the two profiles of the same shade.",
  aidePalettesProches: "Compares shades 500, 600 and 700 in Light. Uses Vivid for two palettes with two intensities, otherwise the closest colour scales.",
  // Les fonds du thème Dark, dans la carte Intensités ([MOT-28], maquette Y2.5).
  fondsSombres: "Dark theme backgrounds",
  aideFondsSombres: "Intensity kept at shade 50 in Dark. It rises to 100% at shade 400. No effect in Light.",
  // La carte « Contenu des planches » ([PLA-28], maquette Y2.3, C1).
  contenu: "Board content",
  // N061 : les unités des mesures avancées (V9.8).
  uniteDeContraste: ':1',
  uniteDEcart: 'ΔEok',
} as const;

/** Un nombre de calques, les milliers séparés par une espace fine. */
const milliers = (nombre: number): string => String(nombre).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** La carte « Contenu des planches » des Réglages communs ([PLA-28], maquette Y2.3, C1). */
export const TEXTES_DU_CONTENU = {
  parties: "Frame sections",
  themes: "Themes",
  lignes: {
    rampes: { nom: "Heading and colour scales", aide: "Name, reference colour and swatches used to create variables" },
    note: { nom: "Note below the colour scales", aide: "Explanation of ◆ and ≈" },
    usages: { nom: "Which shade to use", aide: "Examples and their guarantees, by profile" },
    grilles: { nom: "Contrast, shade by shade", aide: "Grids for each colour scale" },
    light: { nom: "Light theme", aide: (fond: string) => `Background ${fond}` },
    dark: { nom: "Dark theme", aide: (fond: string) => `Background ${fond}` },
  },
  auMoinsUnTheme: " · at least one theme",
  calques: (nombre: number) => `${milliers(nombre)} layers`,
  toutGenere: "All sections are generated.",
  effet: (palette: string, complet: number, choisi: number) => `Existing frames will be marked “Update needed”. Frame for ${palette}: ${milliers(complet)} → ${milliers(choisi)} layers.`,
  resume: {
    tout: "All sections included",
    note: "No note",
    usages: "No usage examples",
    grilles: "No grids",
    light: "Dark theme only",
    dark: "Light theme only",
  },
} as const;

/** Le choix du préréglage, en tête de « Luminosité des nuances », et ce qu'il changerait (W6.4, N104). */
export const TEXTES_DU_PREREGLAGE = {
  libelle: "Number of shades",
  option: (nombre: number) => `${nombre} shades`,
  importee: "Imported shade list: no matching preset.",
  appliquer: (nombre: number) => `Switch to ${nombre} shades`,
  annuler: "Cancel",
  rolesGardes: "Roles keep their shade numbers.",
} as const;

/** Une liste de numéros en mots : « 1000 et 1050 », « 400, 950 et 1000 ». */
function numerosEcrits(numeros: readonly number[]): string {
  return numeros.length < 2 ? numeros.join('') : `${numeros.slice(0, -1).join(', ')} and ${numeros[numeros.length - 1]}`;
}

/** Ce que le passage à un préréglage changerait, avant sa confirmation (W6.4, N104). */
export function effetEcrit(effet: {
  readonly nombre: number;
  readonly ajoutes: readonly number[];
  readonly retires: readonly number[];
  readonly changees: readonly string[];
  readonly cadres: number;
}): string {
  const gestes = [
    effet.ajoutes.length > 0 ? `adds ${numerosEcrits(effet.ajoutes)}` : '',
    effet.retires.length > 0 ? `removes ${numerosEcrits(effet.retires)}` : '',
  ].filter(Boolean).join(" and ");
  const couleurs = effet.changees.length === 0
    ? "The colours of all retained shades stay the same."
    : `${effet.changees.length === 1 ? "One palette changes" : `${effet.changees.length} palettes change`} colour at a retained shade: ${effet.changees.join(', ')}.`;
  const cadres = effet.cadres === 0
    ? ''
    : effet.cadres === 1 ? " 1 frame will be marked “Update needed”." : ` ${effet.cadres} frames will be marked “Update needed”.`;
  return `Switching to ${effet.nombre} shades ${gestes}. ${TEXTES_DU_PREREGLAGE.rolesGardes} ${couleurs}${cadres}`;
}

/** La tête des Réglages communs : la palette ouverte et le thème de son aperçu (V9.3, N055). */
export function paletteDeLApercu(nom: string, mode: Mode): string {
  return `Open palette: ${nom} · ${mode === 'light' ? "Light theme" : "Dark theme"}`;
}

/** La légende du tracé des courbes (V9.4, N056). */
export function legendeDesCourbes(reference: { readonly nom: string; readonly crans: { readonly [M in Mode]: number } } | null): string {
  const traits = "Solid line: Light theme · dashed: Dark theme.";
  if (!reference) return traits;
  return `${traits} ◆: reference colour for “${reference.nom}”, inserted at shade ${reference.crans.light} in the Light theme and ${reference.crans.dark} in the Dark theme, at its own lightness.`;
}

/** Le résumé replié de la carte « Minimums des promesses » (V9.2, N057). */
export function resumeDesMinimums(texte: number, nonTexte: number): string {
  return `Text ${nombreEcrit(texte)}:1 · Graphical elements ${nombreEcrit(nonTexte)}:1`;
}

/** Le résumé replié de la carte « Détection des couleurs proches » (V9.2, N057). */
export function resumeDesEcarts(profilsConfondus: number, palettesProches: number): string {
  return `Soft and Vivid ${nombreEcrit(profilsConfondus)} · Two palettes ${nombreEcrit(palettesProches)}`;
}

/** Le nom accessible de « Rétablir », qui nomme la carte (V9.5, N058). */
export function retablirLaCarte(titre: string): string {
  return `Reset to defaults: ${titre}`;
}

/** La portée d'un groupe de réglages, avant toute saisie ([ENT-07]). */
export function palettesConcernees(nombre: number): string {
  if (nombre === 0) return "No palettes affected";
  return nombre === 1 ? "1 palette affected" : `${nombre} palettes affected`;
}

/** Un nombre tel que les réglages l'affichent, à virgule. */
export function nombreEcrit(valeur: number): string {
  return String(valeur).replace('.', ".");
}

/** Une saisie qui n'est pas un nombre. */
export function nombreInvalide(saisie: string): string {
  return `“${saisie}”: invalid number. Example: 0.5.`;
}

/** Un contraste mesuré avec son unité : « 4,31:1 ». */
export function contrasteEcrit(valeur: number): string {
  return `${ecrireContraste(valeur)}:1`;
}

/** Un seuil de contraste : « 4,5 », « 3 ». */
const seuilEcrit = (valeur: number): string => ecrireArrondi(valeur, 1).replace(/\.0$/, '');

/** La courbe qui ne tient plus la garantie des courbes ([ENT-10]). */
export function constatDeGarantie(manque: ManqueDeGarantie): Constat {
  return {
    ou: `${NOM_DU_MODE[manque.mode]} theme, shade ${manque.cran}, profile ${manque.profil}`,
    quoi: `Contrast against shade 50: ${contrasteEcrit(manque.contraste)}, minimum ${seuilEcrit(manque.seuil)}:1. Hue: ${manque.teinte}°.`,
    geste: `Move shade ${manque.cran} further from shade 50 in lightness.`,
  };
}

/** Les réglages propres à une palette (section 8.1, [ENT-09]). */
export const TEXTES_AVANCES = {
  avance: "Settings for this palette",
} as const;

/** Les intensités sous le nuancier (section 8.1). */
export const TEXTES_DES_INTENSITES = {
  libelle: (profil: string) => `${profil} intensity`,
  repere: (part: string) => `Reference colour intensity: ${part}`,
  detailDeLaReference: "Reference colour intensity",
} as const;

/** D'où viennent les saturations d'une palette grise (T4) ; aucune ligne pour les autres. */
export function origineDesParts(grise: boolean): string | null {
  return grise ? "Grey reference: Soft and Vivid stay grey." : null;
}

/**
 * Le choix du profil qui porte la référence exacte d'une palette à deux
 * intensités, dans la carte « Deux intensités » (N028, N029, [ENT-11], Y2.6).
 */
export const TEXTES_DE_LA_BASE = {
  libelle: "Exact reference in",
  auto: 'Auto',
  choixAutomatique: (profil: Profil) => `Auto selected ${NOM_DU_PROFIL[profil]}`,
  choixAVenir: (profil: Profil) => `Auto will select ${NOM_DU_PROFIL[profil]}`,
} as const;

/** Les textes de la carte « Réglage global ». */
export const TEXTES_DES_REGLAGES = {
  titre: "Global adjustment",
  sousTitre: "Palette hue, saturation and lightness",
  regler: "Adjust",
  cible: "Profile to adjust",
  lesDeux: "Both",
  deuxProfils: "Soft and Vivid",
  grandeurs: { teinte: "Hue", saturation: "Saturation", luminosite: "Lightness" },
  retablir: "Reset",
  retablirLa: (grandeur: string) => `Reset ${grandeur.toLowerCase()}`,
  etiquette: (grandeur: string, profil: string) => `${profil} ${grandeur.toLowerCase()}`,
  avertissementAvant: "This adjustment will change your reference colour.",
  avertissementApres: "Your reference colour has changed.",
  neutre: "Reference colour unchanged.",
  grise: "Grey palette: no hue to adjust.",
  porteurFige: (profil: Profil) => `Reference in ${NOM_DU_PROFIL[profil]}. Changing profile will change its colour.`,
} as const;

/** Une teinte réglée, signée, au centième : « +6° », « −12,5° ». */
export function teinteReglee(valeur: number): string {
  return `${valeur > 0 ? '+' : valeur < 0 ? '−' : ''}${nombreEcrit(Math.abs(valeur))}°`;
}

/** Une luminosité réglée, signée, au millième : « +0,02 », « −0,005 ». */
export function luminositeReglee(valeur: number): string {
  return `${valeur > 0 ? '+' : valeur < 0 ? '−' : ''}${nombreEcrit(Math.abs(valeur))}`;
}

/** Une saturation, en pour cent entiers : « 45 % ». */
export function saturationReglee(valeur: number): string {
  return `${Math.round(valeur * 100)}%`;
}

/**
 * Le résumé de la carte repliée (N146, recette v7) : son état seul, sans les
 * valeurs réglées, puis les points à vérifier.
 */
export function resumeDesReglages(modifie: boolean, points: number): string {
  return `${modifie ? "Adjusted" : "No adjustment"}${pointsAVerifier(points)}`;
}

/** Le choix des intensités d'une palette, en deux cartes ([ENT-14], maquettes Y2.1 et Y2.6). */
export const TEXTES_DES_INTENSITES_DE_PALETTE = {
  libelle: "Intensities",
  // Le titre nomme la carte de la création, le segment celui de la configuration (N131).
  une: { titre: "One intensity", segment: "One", texte: "A single variant at the reference colour’s intensity." },
  deux: { titre: "Two intensities", segment: "Two", texte: "A muted Soft variant and a more saturated Vivid variant." },
  partDeLaReference: (part: string) => `Intensity: ${part}`,
} as const;

/** Le choix du modèle et les numéros d'une palette libre (W6.5, maquette W3.5, N103). */
export const TEXTES_DU_MODELE = {
  libelle: "Model",
  modele: 'Standard',
  libre: "Freeform",
  aideLibre: "No roles or guarantees",
  nuances: (nombre: number) => `Shades · ${nombre} of up to 13`,
  puce: (numero: number) => `Shade ${numero}`,
} as const;

/** Les libellés de la carte « Color shift » (section 12). */
export const TEXTES_DE_LA_DERIVE = {
  aide: "Hatched zones exceed contrast or lightness limits.",
  grise: "Grey palette: only lightness can be adjusted.",
  sansSegmentClair: "No shades lighter than the reference. Adjust the dark shades.",
  sansSegmentSombre: "No shades darker than the reference. Adjust the light shades.",
  grandeurs: { teinte: "Hue", saturation: "Saturation", clarte: "Lightness" },
  onglets: "Adjusted quantity",
  prereglage: "Hue preset",
  tailwind: "Tailwind hue",
  constante: "Constant hue",
  libre: "Custom",
  lien: "Sync Soft and Vivid",
  profilRegle: "Profile to edit",
  aligner: "Align",
  annuler: "Cancel",
  confirmationDuLien: "Replace Soft’s Color shift with Vivid’s? Hue, saturation and lightness will be copied.",
  toutRetablir: "Reset all",
  boutonTailwind: 'Tailwind',
  retablir: "Reset",
  bout: { clair: "Light shades", sombre: "Dark shades" },
  rampeSans: "off",
  rampeAvec: "on",
  titreDeLaRampeSans: "Ramp without Color shift",
  titreDeLaRampeAvec: "Ramp with Color shift",
} as const;

/** Un décalage du Color shift, signé : « −7,5° », « −40 % », « +0,020 ». */
export function decalageEcrit(grandeur: GrandeurDuColorShift, valeur: number): string {
  if (grandeur === 'teinte') return angleEcrit(valeur);
  const signe = valeur > 0 ? '+' : valeur < 0 ? '−' : '';
  return grandeur === 'saturation' ? `${signe}${Math.round(Math.abs(valeur) * 100)}%` : `${signe}${ecrireArrondi(Math.abs(valeur), 3)}`;
}

/** Une grandeur à un bout, nom d'un curseur, d'un champ et d'une poignée : « Teinte, nuances claires ». */
export function grandeurAuBout(grandeur: GrandeurDuColorShift, bout: Bout): string {
  return `${TEXTES_DE_LA_DERIVE.grandeurs[grandeur]}, ${TEXTES_DE_LA_DERIVE.bout[bout].toLowerCase()}`;
}

/** Le bouton d'un bout ([DER-09]) : la teinte Tailwind, ou zéro pour la saturation et la luminosité. */
export function retablirAuBout(grandeur: GrandeurDuColorShift, bout: Bout): string {
  const nuances = TEXTES_DE_LA_DERIVE.bout[bout].toLowerCase();
  return grandeur === 'teinte' ? `Reset ${nuances} to the Tailwind hue` : `Reset ${nuances} ${TEXTES_DE_LA_DERIVE.grandeurs[grandeur].toLowerCase()}`;
}

/** Une plage sûre : « −0,050 à +0,040 ». */
const plageEcrite = (grandeur: GrandeurDuColorShift, bas: number, haut: number): string => `${decalageEcrit(grandeur, bas)} to ${decalageEcrit(grandeur, haut)}`;

/**
 * Ce qu'une poignée ou une réglette annonce ([DER-09]) : la valeur, la teinte
 * absolue pour la teinte, puis la plage sûre quand elle est calculée.
 */
export function valeurDePoignee(grandeur: GrandeurDuColorShift, valeur: number, teinte: number, plage: { readonly bas: number; readonly haut: number } | null): string {
  const lue = grandeur === 'teinte' ? `Offset ${angleEcrit(valeur)}, resulting hue: ${Math.round(teinte) % 360}°` : decalageEcrit(grandeur, valeur);
  return plage ? `${lue}. Safe range ${plageEcrite(grandeur, plage.bas, plage.haut)}` : lue;
}

/** Un membre d'une paire jugée, tel que la butée le nomme : « text 700 », « fond ». */
function membreEcrit(membre: MembrePaire, designation: { readonly nature: 'cran'; readonly cran: number } | { readonly nature: 'fond' }): string {
  if ('fond' in membre) return "background";
  return designation.nature === 'cran' ? `${membre.emploi} ${designation.cran}` : membre.emploi;
}

/** Ce qui arrête une borne, un pas au-delà ([DER-22]). */
function auDela(cause: CauseDeLaBorne): string {
  if (cause.nature === 'ordre') return "Beyond this, the lightness gap between two shades would be less than 0.01.";
  const { promesse } = cause;
  const ou = promesse.profil === 'unique' ? NOM_DU_MODE[promesse.mode] : `${NOM_DU_PROFIL[promesse.profil]}, ${NOM_DU_MODE[promesse.mode]}`;
  const paire = `${membreEcrit(promesse.paire.premier, promesse.premier)} / ${membreEcrit(promesse.paire.second, promesse.second)}`;
  return `Beyond it, ${paire} (${ou}) would drop to ${contrasteEcrit(promesse.contraste)}, below ${seuilEcrit(promesse.seuil)}:1.`;
}

/** La butée d'un bout ([DER-22]) : « Luminosité, nuances claires : limite atteinte à −0,050. Au-delà, … ». */
export function buteeDuColorShift(grandeur: GrandeurDuColorShift, bout: Bout, borne: number, cause: CauseDeLaBorne): string {
  return `${grandeurAuBout(grandeur, bout)}: limit reached at ${decalageEcrit(grandeur, borne)}. ${auDela(cause)}`;
}

/** Un bout dont la valeur rangée est sortie de sa plage sûre ([DER-23]). */
export function horsDeLaPlage(bout: Bout): string {
  return `${TEXTES_DE_LA_DERIVE.bout[bout]}: out of range after another adjustment. Move the value back into the safe range.`;
}

/** La ligne de la plage sûre du réglage global : « Plage sûre · teinte −30° à +12° · luminosité −0,05 à +0,02 ». */
export function plageSureDuReglage(plages: readonly { readonly grandeur: string; readonly bas: string; readonly haut: string }[]): string {
  return ["Safe range", ...plages.map(({ grandeur, bas, haut }) => `${grandeur.toLowerCase()} ${bas} to ${haut}`)].join(' · ');
}

/** La butée d'un curseur du réglage global : « Luminosité de Soft : limite atteinte à −0,03. Au-delà, … ». */
export function buteeDuReglage(etiquette: string, borne: string, cause: CauseDeLaBorne): string {
  return `${etiquette}: limit reached at ${borne}. ${auDela(cause)}`;
}

/** Le repère Tailwind d'une réglette ([DER-06]). */
export function repereTailwind(angle: number): string {
  return `Tailwind offset: ${angleEcrit(angle)}`;
}

/** Un angle signé, au dixième : « −7,5° », « +5,1° », « 0,0° ». */
export function angleEcrit(degres: number): string {
  const signe = degres > 0 ? '+' : degres < 0 ? '−' : '';
  return `${signe}${ecrireArrondi(Math.abs(degres), 1)}°`;
}

/** Une graduation du graphe : « +30° », « −50 % », « +0,05 ». */
export function graduation(grandeur: GrandeurDuColorShift, valeur: number): string {
  const signe = valeur > 0 ? '+' : valeur < 0 ? '−' : '';
  if (grandeur === 'teinte') return `${signe}${Math.abs(valeur)}°`;
  return grandeur === 'saturation' ? `${signe}${Math.round(Math.abs(valeur) * 100)}%` : `${signe}${nombreEcrit(Math.round(Math.abs(valeur) * 1000) / 1000)}`;
}

/** L'étiquette d'une poignée ([DER-03]) : la valeur signée, et la teinte absolue pour la teinte. */
export function etiquetteDePoignee(grandeur: GrandeurDuColorShift, valeur: number, teinte: number): string {
  return grandeur === 'teinte' ? `Offset ${angleEcrit(valeur)} · hue ${Math.round(teinte) % 360}°` : decalageEcrit(grandeur, valeur);
}

/** L'infobulle du pivot ([DER-02]) : la teinte de la référence, et la nuance qui la porte dans chaque thème. */
export function infobulleDuPivot(teinte: number, ancrage: Ancrage): string {
  const nuances = `${ancrage.crans.light} in the Light theme, ${ancrage.crans.dark} in the Dark theme`;
  return `Reference colour: hue ${Math.round(teinte) % 360}°. ${ancrage.profil === 'unique' ? `Shade ${nuances}` : `${NOM_DU_PROFIL[ancrage.profil]} · shade ${nuances}`}.`;
}

/** Le nom d'une copie de palette. */
export function nomDeLaCopie(nom: string): string {
  return `Copy of ${nom}`;
}

/** Un hexa que le champ refuse : il le dit sous le champ, l'aperçu ne change pas. */
export function hexaInvalide(saisie: string): string {
  return `“${saisie}”: invalid hex code. Example: #1E6FD9.`;
}

/** La confirmation d'une suppression ([ENT-03]). */
export function confirmationDeSuppression(nom: string): string {
  return `Delete “${nom}” from the plugin? Its Figma frame will stay, without updates.`;
}

/**
 * Le refus d'un enregistrement : les palettes et réglages enregistrés ont
 * changé depuis leur lecture ([REC-10]). Le plugin ne sait pas qui les a
 * changés.
 */
export function recetteModifieeAilleurs(): Constat {
  return {
    ou: "Changes not saved",
    quoi: "The file’s palettes or settings have changed. Your latest change was not saved.",
    geste: "Export your changes to keep them, then reload the palettes.",
  };
}

/** Un enregistrement que le sandbox refuse pour une recette invalide : l'interface en est la cause. */
export function rangementInvalide(refus: readonly Refus[]): Constat {
  return {
    ou: "Could not save changes",
    quoi: refus.length > 0
      ? `The plugin could not save your change. Details: ${texteDuRefus(refus[0])}`
      : "The plugin could not save your change.",
    geste: "Reload the palettes, then make your change again.",
  };
}

/** Le nom qu'une palette affiche : son nom, ou son hexa de référence. */
export function nomDeLaPalette(palette: Palette): string {
  return palette.nom?.trim() ? palette.nom : palette.reference;
}

/** Le verdict d'une palette ([VER-07]) : « Prête » quand tout est respecté, sinon le nombre à corriger. */
export function verdict(manquees: number): string {
  if (manquees === 0) return TEXTES.prete;
  return manquees === 1 ? "1 unmet contrast requirement" : `${manquees} unmet contrast requirements`;
}

/** Le bilan des promesses respectées sur le total évalué ([VER-07], [PLA-07]). */
export function bilanDesPromesses(respectees: number, total: number): string {
  return `${respectees}/${total} contrast requirements met`;
}

const NOM_DU_MODE: Record<Mode, string> = { light: 'Light', dark: 'Dark' };

/** Le nom d'affichage d'un profil ; la clé `soft` ou `vivid` reste celle des données. */
export const NOM_DU_PROFIL: Record<Profil, string> = { soft: 'Soft', vivid: 'Vivid' };

/**
 * Le nom d'une intensité suivi de `suite` : « Vivid · nuance 600 ». La rampe
 * d'une palette à une intensité n'a pas de nom ([ENT-14]) : `suite` seule.
 */
export function avecLeNom(intensite: Intensite, suite: string): string {
  return intensite === 'unique' ? suite : `${NOM_DU_PROFIL[intensite]} · ${suite}`;
}

/** L'intensité et la nuance qui portent la référence exacte dans un mode ([MOT-17]). */
export function ligneDeLaReference(ancrage: Ancrage, mode: Mode): string {
  return `Reference: ${avecLeNom(ancrage.profil, `shade ${ancrage.crans[mode]}`)}`;
}

/** Le nombre de points à vérifier qu'une carte repliée annonce ([UI-12]). */
function pointsAVerifier(nombre: number): string {
  if (nombre === 0) return '';
  return nombre === 1 ? " · 1 point to check" : ` · ${nombre} points to check`;
}

/**
 * Le résumé de la carte Color shift ([UI-12], recette v7) : son état seul,
 * sans les valeurs réglées, la synchronisation des deux intensités, puis les
 * points à vérifier. `lien` vaut `null` à une intensité : rien à synchroniser
 * ([ENT-14]).
 */
export function resumeDeLaDerive(modifie: boolean, lien: boolean | null, points: number): string {
  const etat = modifie ? "Adjusted" : "No adjustment";
  return `${lien === null ? etat : `${etat} · ${lien ? "synced" : "not synced"}`}${pointsAVerifier(points)}`;
}

/** Le nom français d'un rôle, sous son nom en police de code (N030) ; la clé reste celle des données. */
export const NOM_DU_ROLE: Record<Emploi, string> = {
  solid: "solid fill",
  'on-solid': "text on solid fill",
  text: "coloured text",
  surface: "subtle background",
  'surface-card': "card background",
  'border-control': "input border",
  'border-decorative': "separator",
  focus: "focus ring",
};

/** Le nom d'un emploi en une phrase, son identifiant entre parenthèses : « Fond plein (solid) ». */
export const NOM_DE_L_EMPLOI = Object.fromEntries(
  (Object.keys(NOM_DU_ROLE) as Emploi[]).map((emploi) => [emploi, `${NOM_DU_ROLE[emploi][0].toUpperCase()}${NOM_DU_ROLE[emploi].slice(1)} (${emploi})`]),
) as Record<Emploi, string>;

/** L'état d'une paire, sous son spécimen, dans le vocabulaire des composants (N033, N100, W5.7). */
export const NOM_DE_L_ETAT: Record<EtatDePaire, string> = { ...RANGS };

/**
 * Le résultat d'une intensité (N035) : « Vivid ✓ », « Vivid ✗ 2 », et pour la
 * rampe d'une palette à une intensité « Garanties ✓ », « Garanties ✗ 2 ».
 */
export function resultatDuProfil(profil: Intensite, manquees: number): string {
  const nom = profil === 'unique' ? "Guarantees" : NOM_DU_PROFIL[profil];
  return manquees === 0 ? `${nom} ✓` : `${nom} ✗ ${manquees}`;
}

/** Le même résultat, pour l'assistance technique ([UI-09]). */
export function resultatDuProfilEnMots(profil: Intensite, manquees: number): string {
  const verdict = manquees === 0
    ? "all guarantees met"
    : manquees === 1 ? "1 unmet guarantee" : `${manquees} unmet guarantees`;
  return profil === 'unique' ? `${verdict[0].toUpperCase()}${verdict.slice(1)}` : `${NOM_DU_PROFIL[profil]}: ${verdict}`;
}

/** Les textes de la carte « Garanties de contraste » ([UI-09], N031 à N038). */
export const TEXTES_DES_GARANTIES = {
  theme: (mode: Mode) => `${NOM_DU_MODE[mode]} theme`,
  profils: "Guarantee profile",
  textes: "Readable text",
  visibles: "Visible elements",
  minimum: (seuil: number) => `minimum ${seuilEcrit(seuil)}:1`,
  sur: "on",
  fond: "background",
  legende: "Solid: default · dashed: hover · dotted: active · dash-dot: active-hover. Each state moves text and background to the next shade.",
  onSolid: "on-solid uses the page background colour (neutral.50).",
  decoratif: (numero: number) => `${numero} · separator, no minimum contrast`,
  specimenBouton: "Button",
  specimenTexte: "Text",
  autreTheme: (mode: Mode, nombre: number) => (nombre === 1
    ? `${NOM_DU_MODE[mode]} theme: 1 unmet guarantee`
    : `${NOM_DU_MODE[mode]} theme: ${nombre} unmet guarantees`),
  voirLeTheme: (mode: Mode) => `View ${NOM_DU_MODE[mode]} theme`,
  echec: (etat: EtatDePaire, contraste: number, seuil: number) =>
    `State ${NOM_DE_L_ETAT[etat]}: ${contrasteEcrit(contraste)} against a minimum of ${seuilEcrit(seuil)}:1`,
  numeros: (premier: string, second: string) => `${premier} / ${second}`,
  resultat: (tenue: boolean, contraste: number) => `${tenue ? '✓' : '✗'} ${ecrireContraste(contraste)}`,
} as const;

/** Les textes du détail d'une nuance ([UI-10], N039). */
export const TEXTES_DU_DETAIL = {
  titre: (profil: Intensite, numero: number) => (profil === 'unique' ? `Shade ${numero}` : `${NOM_DU_PROFIL[profil]} · ${numero}`),
  reference: "◆ Your exact reference colour",
  sertA: "Used for",
  // Une nuance qu'aucun rôle ne vise ; « libre » désigne une palette sortie du modèle (N102).
  sansRole: "No role",
  aucunRole: "No predefined use for this shade.",
  contrastes: "Shade contrast",
  fondDuTheme: "Theme background",
  blanc: "White",
  noir: "Black",
  oklch: 'OKLCH',
  titreDuFond: "on-solid · theme background",
  fondDePage: (debut: number, fin: number) => `The theme’s page background, neutral.50 in the design system. Used as text on solid shades ${debut} to ${fin}.`,
  garantie: (tenue: boolean, sens: string, contraste: number) => `${tenue ? '✓' : '✗'} ${sens}: ${contrasteEcrit(contraste)}`,
  sur: (partenaire: string) => `on ${partenaire}`,
  dessus: (partenaire: string) => `${partenaire} on top`,
} as const;

/** Les textes du sélecteur de couleur embarqué (W4.1) ; N087 à N090. */
export const TEXTES_DU_SELECTEUR = {
  // N087 : les deux commandes graphiques, et leur valeur lue.
  zone: "Saturation and brightness",
  valeurDeLaZone: (saturation: number, luminosite: number) => `Saturation ${saturation}%, brightness ${luminosite}%`,
  teinte: "Hue",
  valeurDeLaTeinte: (degres: number) => `${degres}°`,
  // N088 : le menu de format et les champs du code.
  format: "Colour format",
  formats: { hex: 'Hex', rgb: 'RGB', hsl: 'HSL' },
  champs: {
    hex: ["Hex colour code"],
    rgb: ["Red, 0 to 255", "Green, 0 to 255", "Blue, 0 to 255"],
    hsl: ["Hue, in degrees", "Saturation, in %", "Lightness, in %"],
  },
  // N089 : le titre des pastilles proposées.
  nuancesDeLaPalette: "Shades from the open palette",
  fondsProposes: "Default backgrounds and first shades",
  // N090 : le nom de chaque pastille proposée.
  fondParDefaut: (mode: Mode) => `Default background: ${NOM_DU_MODE[mode]}`,
  blanc: "White",
  nuance: (profil: string, numero: number) => `${profil} ${numero}`,
  // N114 : les deux onglets du sélecteur de la couleur de référence (X2.7, R3).
  pastille: (titre: string, hexa: string) => `${titre}, ${hexa}`,
} as const;

/** Les textes du nuancier et de son détail ([UI-04]). */
export const TEXTES_DU_NUANCIER = {
  fond: "Background",
  // N081, N082 : le fond est un réglage commun, que la pastille ouvre.
  fondCommun: "This background applies to all palettes.",
  modifierLeFond: (mode: Mode, hexa: string) => `Edit background for ${NOM_DU_MODE[mode]} theme, currently ${hexa}`,
  reference: "Reference",
  copier: "Copy code",
  copie: "Code copied",
  etiquetteDeNuance: (profil: Intensite, numero: number, hexa: string) => (profil === 'unique'
    ? `Shade ${numero}, colour ${hexa}`
    : `Profile ${NOM_DU_PROFIL[profil]}, shade ${numero}, colour ${hexa}`),
  memeCouleur: (numero: number) => `Same colour as shade ${numero}.`,
  tresProche: (profil: string) => `Very close to ${profil}`,
  oklch: (L: number, C: number, H: number) => `L ${ecrireArrondi(L, 3)} · C ${ecrireArrondi(C, 3)} · H ${Math.round(H) % 360}°`,
  revenirAuTheme: (mode: Mode) => `Back to ${NOM_DU_MODE[mode]} theme`,
  fondCourt: "background",
  etiquetteDuFond: (hexa: string) => `on-solid, theme background, colour ${hexa}`,
} as const;

const ETATS_DU_DECALAGE = ['', ", hover state", ", active state", ", active-hover state"];

/** Un emploi et son état : « Texte coloré (text), état hover ». */
export function emploiEcrit({ emploi, decalage }: EmploiDUnCran): string {
  return `${NOM_DE_L_EMPLOI[emploi]}${ETATS_DU_DECALAGE[decalage] ?? ` (offset of ${decalage} shades)`}`;
}

function membre(membrePaire: MembrePaire): string {
  return 'fond' in membrePaire ? "page background" : emploiEcrit(membrePaire);
}

/** Une association et son état : « Texte coloré (text) sur Fond léger (surface), état hover ». */
export function associationEcrite(association: Association, etat: EtatDePaire): string {
  const second = association.second === 'fond' ? "page background" : NOM_DE_L_EMPLOI[association.second];
  return `${NOM_DE_L_EMPLOI[association.premier]} on ${second}${ETATS_DU_DECALAGE[etat]}`;
}

/** Ce qu'un badge de niveau juge ([VER-13]) : un texte courant, un grand texte ou un élément graphique. */
export type Jugement = 'texte' | 'grandTexte' | 'graphique';

const NOM_DU_JUGEMENT: Record<Jugement, string> = {
  texte: "Normal text",
  grandTexte: "Large text",
  graphique: "Graphical elements",
};

/** Un niveau WCAG écrit : le badge visible, l'étiquette que l'assistance technique lit, et sa réussite. */
export interface NiveauEcrit {
  readonly ecrit: string;
  readonly etiquette: string;
  readonly atteint: boolean;
}

/**
 * Le badge d'un contraste ([VER-13]), lu dans `niveauxWcag` aux seuils fixes
 * du WCAG, jamais aux minimums réglés : « AAA », « AA », ou « AA ✗ » sous le
 * premier niveau. Un élément graphique n'a que AA (critère 1.4.11).
 */
export function niveauEcrit(valeur: number, jugement: Jugement): NiveauEcrit {
  const niveaux: NiveauxWcag = niveauxWcag(valeur);
  const nom = NOM_DU_JUGEMENT[jugement];
  const niveau = jugement === 'graphique' ? (niveaux.graphique ? 'AA' : null) : niveaux[jugement];
  if (niveau === 'AAA') return { ecrit: 'AAA', etiquette: `${nom}: AAA met`, atteint: true };
  if (niveau === 'AA') {
    const suite = jugement === 'graphique' ? '' : ", AAA not met";
    return { ecrit: 'AA', etiquette: `${nom}: AA met${suite}`, atteint: true };
  }
  return { ecrit: 'AA ✗', etiquette: `${nom}: AA not met`, atteint: false };
}

/** Ce que le badge d'une garantie juge : un texte pour une paire au minimum texte, un élément graphique sinon. */
export function jugementDuSeuil(seuil: 'texte' | 'nonTexte'): Jugement {
  return seuil === 'texte' ? 'texte' : 'graphique';
}

/** Un message qui montre aussi des mesures, une par ligne, ou un détail technique replié. */
export interface ConstatIllustre extends Constat {
  /** Une mesure par intensité : « Vivid : 4,31:1 · À corriger ». */
  readonly mesures?: readonly string[];
  /** Un texte technique, l'erreur de Figma par exemple, montré replié sous le message. */
  readonly detail?: string;
}

/**
 * Un groupe de promesses manquées ([VER-06]) : l'association, le thème et
 * l'état, puis le résultat de chaque intensité et le minimum demandé.
 */
export function constatDeGroupe(groupe: GroupeDePromesses, nom: string): ConstatIllustre {
  const resultat = (promesse: GroupeDePromesses['resultats'][number]) => {
    const mesure = `${contrasteEcrit(promesse.contraste)} · ${promesse.verdict === 'tenue' ? "Met" : "Needs adjustment"}`;
    return promesse.profil === 'unique' ? mesure : `${NOM_DU_PROFIL[promesse.profil]}: ${mesure}`;
  };
  return {
    ou: `${associationEcrite(groupe.association, groupe.etat)} · ${nom}, ${NOM_DU_MODE[groupe.mode]} theme`,
    quoi: `Contrast too low. Minimum: ${seuilEcrit(groupe.seuil)}:1.`,
    geste: "Change the global adjustment or Color shift, then check the contrast.",
    mesures: groupe.resultats.map(resultat),
  };
}

/** Ce que la mise en mots d'une alerte lit de la recette. */
export interface ContexteDAlerte {
  readonly recette: Recette;
  readonly nomDe: (id: string) => string;
}

const referenceLue = (contexte: ContexteDAlerte, id: string): string =>
  contexte.recette.palettes.find((palette) => palette.id === id)?.reference ?? '';

/**
 * Une alerte de la section 11.3. Le titre et l'action ne portent aucune
 * mesure : la mesure et son unité se lisent dans `mesures`.
 */
export function constatDAlerte(alerte: Alerte, contexte: ContexteDAlerte): ConstatIllustre {
  switch (alerte.code) {
    case 'profils-confondus': {
      const plusProche = Math.min(...alerte.crans.map((cran) => cran.distance));
      const crans = alerte.crans.map((cran) => `${NOM_DU_MODE[cran.mode]} ${cran.cran}`).join(', ');
      return {
        ou: `${contexte.nomDe(alerte.palette)}: shades ${crans}`,
        quoi: "Soft and Vivid are almost identical at these shades.",
        geste: "Separate the Soft and Vivid saturation values in “Global adjustment”.",
        mesures: [`Smallest difference: ${ecrireArrondi(plusProche, 3)} ΔEok, against a minimum of ${ecrireArrondi(alerte.seuil, 2)} ΔEok`],
      };
    }
    case 'palettes-proches':
      return {
        ou: `Palettes to compare: ${contexte.nomDe(alerte.palettes[0])} and ${contexte.nomDe(alerte.palettes[1])}`,
        quoi: "Shades 500, 600 and 700 in these palettes are very similar in Light.",
        geste: "Change a reference colour or delete the duplicate palette.",
        mesures: [`Average difference: ${ecrireArrondi(alerte.distance, 3)} ΔEok, against a minimum of ${ecrireArrondi(alerte.seuil, 2)} ΔEok`],
      };
    case 'reference-plus-terne':
      return {
        ou: `${contexte.nomDe(alerte.palette)}: reference colour ${referenceLue(contexte, alerte.palette)}`,
        quoi: `The reference is less vivid than Soft. Intensity: ${ecrireArrondi(alerte.part, 2)}, against ${ecrireArrondi(alerte.partSoft, 2)}.`,
        geste: "Lower saturation in “Global adjustment” to get closer to the reference.",
      };
    case 'reference-plus-vive':
      return {
        ou: `${contexte.nomDe(alerte.palette)}: reference colour ${referenceLue(contexte, alerte.palette)}`,
        quoi: `The reference is more vivid than Vivid. Intensity: ${ecrireArrondi(alerte.part, 2)}, against ${ecrireArrondi(alerte.partVivid, 2)}.`,
        geste: "Increase Vivid saturation in “Global adjustment” to get closer to the reference.",
      };
    case 'fond-hors-courbe': {
      const sens = alerte.mode === 'light' ? "darker" : "lighter";
      return {
        ou: `Background for ${NOM_DU_MODE[alerte.mode]} theme: ${contexte.recette.fonds[alerte.mode]}`,
        quoi: `This background is ${sens} than shade 50. Lightness: ${ecrireArrondi(alerte.clarte, 3)}, against ${ecrireArrondi(alerte.cran, 3)}.`,
        geste: "Check the guarantees. If any fail, move the background closer to shade 50 in the shared settings.",
      };
    }
  }
}

/** Le nombre de palettes que le fichier porte. */
export function palettesDuFichier(nombre: number): string {
  if (nombre === 0) return "This file contains no palettes.";
  return nombre === 1 ? "This file contains 1 palette." : `This file contains ${nombre} palettes.`;
}

/** Un message en trois parties. */
export interface Constat {
  readonly ou: string;
  readonly quoi: string;
  readonly geste: string;
}

/** Un nombre écrit à la française : virgule décimale. */
function nombre(valeur: string | number | undefined): string {
  return typeof valeur === 'number' ? String(valeur).replace('.', ".") : String(valeur ?? '');
}

const rangEcrit = (rang: number): string => {
  const n = rang + 1;
  const suffixe = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffixe}`;
};

const MODES: Record<string, string> = { light: "of the Light theme", dark: "of the Dark theme" };
const FONDS: Record<string, string> = { light: "Light theme background", dark: "Dark theme background" };
const CLES_DE_PALETTE: Record<string, string> = {
  id: "palette ID",
  nom: "palette name",
  reference: "reference colour",
  derive: "Color shift",
  parts: "custom intensities",
  base: "base palette",
  intensites: "intensities",
  crans: "freeform palette shades",
  originale: "original reference colour",
  clair: "light shades",
  sombre: "dark shades",
  saturation: "saturation",
  clarte: "lightness",
  lien: "Soft and Vivid sync",
  origine: "setting origin",
};
/** Les parties d'un cadre, dans un chemin `contenuDesPlanches.…` ([PLA-28]). */
const PARTIES_DU_CONTENU: Record<string, string> = {
  note: "note below the colour scales",
  usages: "usage examples",
  grilles: "contrast grids",
  light: "Light theme",
  dark: "Dark theme",
};
const NOMS_DES_SEUILS: Record<string, string> = {
  texte: "text",
  nonTexte: "graphical elements",
  profilsConfondus: "minimum difference between Soft and Vivid",
  palettesProches: "minimum difference between two palettes",
};

/**
 * Le chemin d'un champ en mots du designer : `crans[3]` devient « 4e nuance »,
 * `palettes[1].derive.soft.clair` « Palette 2, Color shift, soft, teinte,
 * nuances claires ». Un chemin que la table ne connaît pas s'écrit tel quel.
 */
export function nommerChamp(chemin: string): string {
  if (chemin === '') return "Palettes and settings";
  let trouve = /^crans\[(\d+)\]$/.exec(chemin);
  if (trouve) return `${rangEcrit(Number(trouve[1]))} shade`;
  trouve = /^courbes\.(light|dark)(?:\[(\d+)\])?$/.exec(chemin);
  if (trouve) return `Lightness ${MODES[trouve[1]]}${trouve[2] ? `, ${rangEcrit(Number(trouve[2]))} shade` : ''}`;
  trouve = /^profils\.(soft|vivid)\.part$/.exec(chemin);
  if (trouve) return `Intensity of ${trouve[1]}`;
  trouve = /^fonds\.(light|dark)$/.exec(chemin);
  if (trouve) return FONDS[trouve[1]];
  trouve = /^seuils\.(\w+)$/.exec(chemin);
  if (trouve) return `Minimum or threshold: ${NOMS_DES_SEUILS[trouve[1]] ?? trouve[1]}`;
  trouve = /^contenuDesPlanches\.(\w+)$/.exec(chemin);
  if (trouve) return `Board content, ${PARTIES_DU_CONTENU[trouve[1]] ?? trouve[1]}`;
  trouve = /^derives\[(\d+)\]$/.exec(chemin);
  if (trouve) return `Tailwind preset, colour family ${Number(trouve[1]) + 1}`;
  trouve = /^palettes\[(\d+)\]\.crans\[(\d+)\]$/.exec(chemin);
  if (trouve) return `Palette ${Number(trouve[1]) + 1}, ${rangEcrit(Number(trouve[2]))} shade`;
  trouve = /^palettes\[(\d+)\]\.derive\.(soft|vivid)\.(clair|sombre)$/.exec(chemin);
  if (trouve) return `Palette ${Number(trouve[1]) + 1}, Color shift, ${trouve[2]}, hue, ${CLES_DE_PALETTE[trouve[3]]}`;
  trouve = /^palettes\[(\d+)\]((?:\.\w+)*)$/.exec(chemin);
  if (trouve) {
    const suite = trouve[2].split('.').filter(Boolean).map((cle) => CLES_DE_PALETTE[cle] ?? cle);
    return [`Palette ${Number(trouve[1]) + 1}`, ...suite].join(', ');
  }
  const connus: Record<string, string> = {
    crans: "Shade numbers",
    profils: "Profile intensities",
    gamut: "Colour space",
    formatVersion: "Backup format version",
    derives: "Tailwind preset",
    intensiteDesFondsSombres: "Dark theme backgrounds",
    contenuDesPlanches: "Board content",
    palettes: 'Palettes',
  };
  return connus[chemin] ?? chemin;
}

/** Le texte d'un refus de validation, où et quoi sur la même ligne. */
const REFUS: Record<RegleRecette, (champ: string, valeur: string) => string> = {
  forme: (champ) => `${champ}: missing value or invalid format.`,
  'cle-inconnue': (champ) => `${champ}: unknown setting in this plugin version.`,
  'crans-croissants': (_, valeur) => (valeur
    ? `Shades: number ${valeur} is invalid. Use unique whole numbers in ascending order.`
    : "Add at least two shade numbers and sort them in ascending order."),
  'courbes-longueur': (champ, valeur) => `${champ}: ${valeur} values. Provide one lightness value per shade.`,
  'courbes-bornes': (champ, valeur) => `${champ}: ${valeur}. Enter lightness from 0 to 1.`,
  'courbe-claire-decroissante': (champ, valeur) => `${champ}: ${valeur}. Use a lower lightness than the previous shade.`,
  'courbe-sombre-croissante': (champ, valeur) => `${champ}: ${valeur}. Use a higher lightness than the previous shade.`,
  'parts-bornes': (champ, valeur) => `${champ}: ${valeur}. Enter intensity from 0 to 1.`,
  'parts-ordre': (champ) => `${champ}: keep Soft intensity at or below Vivid.`,
  'gamut-inconnu': (_, valeur) => `Colour space “${valeur}” is not supported. Use sRGB.`,
  'hexa-invalide': (champ, valeur) => `${champ}: invalid “${valeur}”. Use a hex code such as #1E6FD9.`,
  'seuils-positifs': (champ, valeur) => `${champ}: ${valeur}. Enter a number greater than 0.`,
  'derives-nombre': (champ, valeur) => `Tailwind preset: ${valeur} colour families. At least two are required.`,
  'derives-noms': (champ, valeur) => `Tailwind preset: duplicate “${valeur}”. Rename one colour family.`,
  'derives-teintes': (champ, valeur) => `${champ}: ${valeur}°. Enter a hue from 0° inclusive to 360° exclusive.`,
  'derives-teintes-claires': (champ, valeur) => `Tailwind preset: duplicate light-end hue ${valeur}°. Change one hue.`,
  'derive-bornes': (champ, valeur) => `${champ}: ${valeur}°. Enter an offset from −90° to +90°.`,
  'derive-lien': (champ) => `${champ}: different Color shifts with sync enabled. Match their values or turn off sync.`,
  // Les trois règles du format 7 ([MOT-30]).
  'derive-saturation': (champ, valeur) => `${champ}: ${valeur}. Enter a saturation shift from −1 to 1.`,
  'derive-clarte': (champ, valeur) => `${champ}: ${valeur}. Enter a lightness shift from −0.15 to 0.15.`,
  'derive-nulle': (champ) => `${champ}: both shifts are zero. Remove this field from the file.`,
  'origine-inconnue': (champ, valeur) => `${champ}: unknown origin “${valeur}”. Have this field corrected in the file.`,
  'identifiant-forme': (champ, valeur) => `Invalid ID “${valeur}”. Use p- followed by eight characters from 0–9 and a–f.`,
  'identifiants-uniques': (champ, valeur) => `Duplicate ID “${valeur}”. Give each palette a unique ID.`,
  'base-inconnue': (champ, valeur) => `${champ}: invalid “${valeur}”. Use soft or vivid, or remove the field for automatic selection.`,
  'crans-emplois': (champ, valeur) => `Add shade ${valeur}, required for usage examples and contrast checks.`,
  // N101 : les quatre règles du format 3 (W6.3, W7.2).
  'crans-libres-nombre': (champ, valeur) => `${champ}: ${valeur} shades. Choose a count from 4 to 13.`,
  'crans-libres-numeros': (champ, valeur) => `${champ}: “${valeur}” is not accepted. Use a multiple of 50 between 50 and 1050, greater than the previous number.`,
  'base-libre': (champ) => `${champ}: no effect on a freeform palette. Remove this field from the file.`,
  'originale-identique': (champ) => `${champ}: identical to the reference. Remove this field from the file.`,
  // Les quatre règles du format 4 ([ENT-14], [MOT-28], [PLA-28]).
  'intensites-valeur': (champ, valeur) => `${champ}: invalid “${valeur}”. Use 1, or remove this field for Soft and Vivid.`,
  'intensites-incompatible': (champ) => `${champ}: incompatible with one intensity. Remove base, parts and crans from the file, then enable Color shift sync.`,
  'fonds-sombres-bornes': (champ, valeur) => `${champ}: ${valeur}. Enter intensity from 0 to 1.`,
  'contenu-sans-theme': (champ) => `${champ}: keep at least one theme, Light or Dark.`,
  // Les huit règles du format 5 (Z10.5, N141).
  'reglages-bornes': (champ, valeur) => `${champ}: “${valeur}” is out of range. Hue goes from −30° to +30°, lightness from −0.05 to +0.02, saturation from 0 to 1.`,
  'reglage-nul': (champ) => `${champ}: zero adjustment. Remove this field from the file.`,
  'reglages-intensites': (champ) => `${champ}: incompatible with the number of intensities. Remove this field from the file.`,
  'porteur-base': (champ) => `${champ}: profile already defined by base. Remove this field from the file.`,
  'porteur-manquant': (champ) => `${champ}: enter soft or vivid to locate the reference.`,
  'reglages-sans-originale': (champ) => `${champ}: original colour missing. Have the backup corrected.`,
  'depart-sans-reglage': (champ) => `${champ}: no associated adjustment. Remove this field from the file.`,
  'depart-identique': (champ) => `${champ}: identical to the original colour. Remove this field from the file.`,
};

/** Le texte d'un refus de [REC-05]. */
export function texteDuRefus(refus: Refus): string {
  return REFUS[refus.regle](nommerChamp(refus.chemin), nombre(refus.valeur));
}

/** Le blocage d'une recette enregistrée par une version plus récente du plugin. */
export function recetteFuture(version: number): Constat {
  return {
    ou: `Backup format ${version}`,
    quoi: `This plugin supports format ${FORMAT_RECETTE}. This newer backup blocks generation.`,
    geste: "Update UCM Palettes. Export your data before replacing or resetting it.",
  };
}

/** Le nombre d'erreurs d'une validation : plusieurs erreurs peuvent porter sur le même champ. */
const erreursDeValidation = (refus: readonly Refus[]): string =>
  (refus.length === 1 ? "1 validation error" : `${refus.length} validation errors`);

/** Le blocage d'une recette enregistrée que la validation refuse. */
export function recetteIllisible(refus: readonly Refus[]): Constat {
  return {
    ou: "Could not read palettes and settings",
    quoi: `Generation is unavailable: ${erreursDeValidation(refus)}. First error: ${texteDuRefus(refus[0])}`,
    geste: "Export your data to keep it. Import a valid backup or reset palettes and settings.",
  };
}

/** Les gestes des palettes et réglages en fichier (section 10.1, [REC-11]). */
export const TEXTES_DE_LA_RECETTE = {
  exporter: "Export palettes and settings",
  importer: "Import palettes and settings",
  repartir: "Reset palettes and settings",
  exporterLeRapport: "Export verification report",
  confirmerLImport: "Replace with this backup",
  confirmerLeDepart: "Reset",
  annuler: "Cancel",
  sansEcart: "Identical palettes and settings.",
  importSansDessin: "Import replaces palettes and settings. Figma frames stay unchanged.",
  confirmationDuDepart: "All palettes will be removed from the plugin and settings reset. Export them first to keep a copy.",
  titre: "Palettes and settings",
} as const;

/** Le titre de la confirmation d'un import ([REC-08]). */
export function titreDeLImport(fichier: string): string {
  return `Replace palettes and settings with “${fichier}”?`;
}

/** Une ligne de l'écart d'import : des palettes par leur nom, ou des réglages communs. */
export function ligneDEcart(genre: 'ajoutees' | 'retirees' | 'modifiees' | 'parametres', noms: readonly string[]): string {
  const titres = {
    ajoutees: noms.length === 1 ? "Palette to add" : "Palettes to add",
    retirees: noms.length === 1 ? "Palette to remove" : "Palettes to remove",
    modifiees: noms.length === 1 ? "Palette to change" : "Palettes to change",
    parametres: noms.length === 1 ? "Shared setting to change" : "Shared settings to change",
  };
  return `${titres[genre]}: ${noms.join(', ')}.`;
}

/** Le nom d'un réglage commun dans l'écart d'import. */
export const NOMS_DES_PARAMETRES = {
  crans: "shade numbers",
  courbes: "shade lightness",
  profils: "colour intensities",
  fonds: "background colours used for contrast",
  seuils: "minimums and detection thresholds",
  derives: "Tailwind preset",
  gamut: "colour space",
  intensiteDesFondsSombres: "Dark theme backgrounds",
  contenuDesPlanches: "board content",
} as const;

/** Le nom d'un seuil dans l'écart d'import, plutôt que « minimums et seuils de détection » d'un bloc (V12.2, N072). */
export const SEUILS_DE_L_IMPORT: Record<keyof Recette['seuils'], string> = {
  texte: "text minimum",
  nonTexte: "visible element minimum",
  profilsConfondus: "minimum difference between Soft and Vivid",
  palettesProches: "minimum difference between two palettes",
};

const NOMS_DES_CHAMPS: Record<ChampDePalette, string> = {
  nom: "name",
  reference: "reference colour",
  intensites: "number of intensities",
  base: "base palette",
  parts: "custom intensities",
  deriveTeinte: "Color shift, hue",
  deriveSaturation: "Color shift, saturation",
  deriveClarte: "Color shift, lightness",
  // N101 : les deux champs du format 3.
  crans: "freeform palette shades",
  originale: "original reference colour",
  // N142 : le champ du format 5.
  reglages: "hue, saturation and lightness",
};

/** Les valeurs modifiées de chaque palette, palette de base comprise (V12.2, N072). */
export function ligneDesValeurs(palettes: readonly { readonly nom: string; readonly champs: readonly ChampDePalette[] }[]): string {
  const titre = palettes.length === 1 ? "Palette to change" : "Palettes to change";
  return `${titre}: ${palettes.map(({ nom, champs }) => `${nom} (${champs.map((champ) => NOMS_DES_CHAMPS[champ]).join(', ')})`).join("; ")}.`;
}

/** Ce que l'import change, par nature : couleurs, minimums, signalements (V12.2, N073). */
export function lignesDeNature(nature: { readonly couleurs: boolean; readonly minimums: boolean; readonly detection: boolean }): string[] {
  return [
    nature.couleurs ? "Colours: shades in the affected palettes will change." : null,
    nature.minimums ? "Minimum contrast: guarantees may change, colours stay the same." : null,
    nature.detection ? "Similar colour detection: only the warnings may change." : null,
  ].filter((ligne): ligne is string => ligne !== null);
}

/** Ce que l'import ferait aux cadres déjà générés (V12.2, N074). */
export function consequenceSurLaPlanche(aMettreAJour: readonly string[], orphelins: readonly string[]): string {
  if (aMettreAJour.length === 0 && orphelins.length === 0) return "On the board: no up-to-date frames are affected.";
  const parties = [
    aMettreAJour.length === 0 ? null : `${aMettreAJour.length === 1 ? "1 frame will be marked" : `${aMettreAJour.length} frames will be marked`} “Update needed” (${aMettreAJour.join(', ')})`,
    orphelins.length === 0 ? null : `${orphelins.length === 1 ? "1 frame will remain" : `${orphelins.length} frames will remain`} without a palette (${orphelins.join(', ')})`,
  ].filter((partie): partie is string => partie !== null);
  return `On the board: ${parties.join("; ")}.`;
}

/** Un fichier importé qui ne se lit pas : la recette enregistrée reste intacte ([REC-08]). */
export function importInvalide(fichier: string, refus: readonly Refus[]): Constat {
  return {
    ou: `Could not import: ${fichier}`,
    quoi: `This file contains ${erreursDeValidation(refus)}. First error: ${texteDuRefus(refus[0])} Your current palettes and settings are kept.`,
    geste: "Correct this file or import another backup.",
  };
}

/** Un fichier importé d'une version que ce plugin ne lit pas. */
export function importFutur(fichier: string, version: number): Constat {
  return {
    ou: `Could not import: ${fichier}, format ${version}`,
    quoi: `Supported format: ${FORMAT_RECETTE}. This backup is newer. Your palettes and settings are kept.`,
    geste: "Update UCM Palettes, then import this file again.",
  };
}

/** Les libellés de la génération et de l'onglet Palettes (section 13.2). */
export const TEXTES_DU_DESSIN = {
  dessiner: "Generate in Figma",
  // Le premier geste d'une fiche, selon l'état du cadre ([UI-05]).
  actualiserSurFigma: "Update in Figma",
  aJour: "Up to date",
  perimee: "Update needed",
  redessinerQuandMeme: "Replace frame and contents",
  voirSurLaPlanche: "Show in Figma",
  reessayer: "Try again",
  confirmer: "Generate in Figma",
  annuler: "Cancel",
  plancheSansPalette: "Create a palette in the “Create” tab, then generate it here.",
  versLesPalettes: "Create a palette",
  // N009, N010, puis N043 à N047 ; un cadre jamais généré a sa pastille (Y2.2).
  pasEncore: "Not yet in Figma",
  introuvable: "Frame not found",
  illisible: "Could not read frame",
  // Les deux autres gestes d'une fiche, après le premier (Y1.9).
  afficher: "Show",
  modifier: "Edit",
  actualiser: "Refresh",
  chercherPartout: "Search entire file",
  palettesEtReglages: "Palettes and settings",
  themeDesFiches: "Card theme",
} as const;

/**
 * L'état d'un cadre de palette, tel que la pastille d'une fiche de l'onglet
 * Palettes l'écrit ([PLA-20], V8.2, maquette Y2.2).
 */
export function etatDuCadreEcrit(etat: EtatDuCadre): string {
  return {
    'a-jour': TEXTES_DU_DESSIN.aJour,
    perimee: TEXTES_DU_DESSIN.perimee,
    'jamais-dessinee': TEXTES_DU_DESSIN.pasEncore,
    introuvable: TEXTES_DU_DESSIN.introuvable,
    illisible: TEXTES_DU_DESSIN.illisible,
  }[etat];
}

/**
 * Le premier geste d'une fiche de l'onglet Palettes ([UI-05]) : « Générer sur
 * Figma » sans cadre ou pour un cadre introuvable, « Actualiser sur Figma »
 * quand le cadre a changé. Un cadre à jour ou illisible n'en a pas : `null`.
 */
export function premierGesteDeLaFiche(etat: EtatDuCadre): string | null {
  if (etat === 'a-jour' || etat === 'illisible') return null;
  return etat === 'perimee' ? TEXTES_DU_DESSIN.actualiserSurFigma : TEXTES_DU_DESSIN.dessiner;
}

/** La page d'un cadre rangé hors de la page de la planche (V8.6, N048). */
export function pageDuCadre(nom: string): string {
  return `Page “${nom}”`;
}

/** Le nombre de palettes d'un geste global, au singulier pour une seule (Q5.5). */
function nombreDePalettes(nombre: number): string {
  return nombre === 1 ? '1 palette' : `${nombre} palettes`;
}

/** Le geste qui génère les palettes qui ne sont pas à jour (V8.4, Y1.8). */
export function genererLesPalettesPasAJour(nombre: number): string {
  return `Update all (${nombreDePalettes(nombre)})`;
}

/** Le geste qui génère toutes les palettes (V8.4, Y1.8). */
export function genererToutesLesPalettes(nombre: number): string {
  return `Generate all (${nombreDePalettes(nombre)})`;
}

/** La ligne technique de la carte « Palettes et réglages » (V8.5, N050). */
export function detailsTechniques(empreinte: string | null, versionDuSuivi: number): string {
  return `Palettes and settings format: ${FORMAT_RECETTE} · fingerprint: ${empreinte ?? "none"} · frame tracking: version ${versionDuSuivi}`;
}

/** Un cadre introuvable après une recherche bornée à la page de la planche (V8.6, N051). */
export function rechercheBornee(nomDeLaPage: string | null, introuvables: readonly string[]): Constat {
  const seul = introuvables.length === 1;
  return {
    ou: seul ? `Frame not found: ${citer(introuvables)}` : `Frames not found: ${citer(introuvables)}`,
    quoi: `Search limited to ${nomDeLaPage ? `page “${nomDeLaPage}”` : "the board page"}. Generating again would create ${seul ? "another frame" : "more frames"}.`,
    geste: "Search the entire file before generating to avoid creating a duplicate.",
  };
}

/** Une génération refusée : Figma n'a pas pu lire le cadre existant d'une palette (V8.6, N052). */
export function lectureImpossible(noms: readonly string[]): Constat {
  return {
    ou: `Could not read frame: ${citer(noms)}`,
    quoi: `Figma cannot read ${noms.length === 1 ? "this frame" : "these frames"}. Generation cancelled to avoid duplicates.`,
    geste: "Refresh the Palettes tab, then try generating again.",
  };
}

/** Un suivi des cadres écrit par une version plus récente du plugin (V8.8, N053). */
export function suiviFutur(): Constat {
  return {
    ou: "Board from a newer version",
    quoi: "These frames need a newer plugin version. Reading and updating are unavailable.",
    geste: "Update the plugin to generate the palettes.",
  };
}

/** Le nombre de palettes, en tête de l'onglet Palettes ([UI-02]). */
export function enTeteDeLaPlanche(nombre: number): string {
  if (nombre === 0) return "No palettes";
  return nombre === 1 ? '1 palette' : `${nombre} palettes`;
}

/** La progression d'une génération, à la place de son bouton ([UI-05], [PLA-24]). */
export function progressionDuDessin(fait: number, total: number, nom: string): string {
  return total === 1 ? `Generating “${nom}”…` : `Palette ${fait + 1} of ${total}: generating “${nom}”…`;
}

/** La confirmation avant de générer beaucoup de palettes ([PLA-24], D-I). */
export function confirmationDuDessin(nombre: number): string {
  return `Generate ${nombre} palettes? Each palette may add more than 1,500 layers.`;
}

/** Le blocage d'une police indisponible ([PLA-22]). */
export function policeIndisponible(style: string): Constat {
  return {
    ou: `Font unavailable: ${style}`,
    quoi: `Figma could not load ${style}. No palettes were generated on the board.`,
    geste: "Activate or install the Inter font, then try again.",
  };
}

/**
 * Une génération interrompue : le cadre en cours n'est pas posé, et l'ancien
 * cadre de cette palette reste en place. Une génération de plusieurs palettes
 * nomme celles déjà créées et celles qui attendent (V8.4, N054) ; « Réessayer »
 * reprend à la palette fautive. L'erreur de Figma se lit dans le détail
 * technique.
 */
export function dessinInterrompu(nom: string, message: string, creees: readonly string[] = [], restantes: readonly string[] = []): ConstatIllustre {
  const conservees = creees.length === 0 ? '' : `; ${creees.length === 1 ? `the frame for ${citer(creees)} is kept` : `the frames for ${citer(creees)} are kept`}`;
  const suite = creees.length === 0 && restantes.length === 0
    ? "no new palette frames were created"
    : `the frame for this palette was not created${conservees}`;
  const attente = restantes.length === 0 ? '' : ` ${restantes.length === 1 ? `${citer(restantes)} has not been generated yet` : `${citer(restantes)} have not been generated yet`}.`;
  return {
    ou: `Generation interrupted: ${nom}`,
    quoi: `Generation stopped: ${suite}.${attente}`,
    geste: restantes.length === 0 ? "Try generating the palette again." : "Try again: generation will resume at this palette.",
    detail: `Error details: ${message}`,
  };
}

/** Une génération refusée : la recette enregistrée n'est plus celle que l'aperçu montre (E13). */
export function dessinSurUneAutreRecette(): Constat {
  return {
    ou: "The file’s data has changed",
    quoi: "Palettes or settings have changed. Generation cancelled: the preview is out of date.",
    geste: "Reload the palettes, then check the preview before generating.",
  };
}

const citer = (noms: readonly string[]): string => noms.map((nom) => `“${nom}”`).join(', ');

/** Les calques qu'une mise à jour retirerait, à confirmer avant la génération ([PLA-03], D-H). */
export function constatDesCalquesEtrangers(nom: string, calques: readonly string[]): Constat {
  const seul = calques.length === 1;
  return {
    ou: `Content added to the frame for “${nom}”`,
    quoi: seul
      ? `Updating will delete the layer ${citer(calques)} that you added to this frame.`
      : `Updating will delete the ${calques.length} layers you added to this frame: ${citer(calques)}.`,
    geste: seul
      ? "Move this layer out of the frame to keep it, or confirm its deletion."
      : "Move these layers out of the frame to keep them, or confirm their deletion.",
  };
}

/** La carte d'une palette supprimée dont le cadre reste dans Figma ([ENT-03], [PLA-27], N079, N080, N083, N084). */
export const TEXTES_DE_LA_PALETTE_SUPPRIMEE = {
  texte: "Palette deleted from the plugin. This frame will no longer be updated.",
  supprimer: "Delete permanently",
  enConflit: "Export your changes or reload the palettes before deleting a frame.",
  supprime: (nom: string) => `Frame “${nom}” deleted. Press Ctrl+Z in Figma to restore it.`,
} as const;

/** Le sandbox a refusé « Supprimer définitivement » : le fichier a changé depuis la lecture ([PLA-27], N085). */
export function suppressionRefusee(nom: string): Constat {
  return {
    ou: `Frame not deleted: ${nom}`,
    quoi: "The file has changed since it was last read. This frame no longer belongs to a deleted palette.",
    geste: "Refresh the Palettes tab.",
  };
}

/** La copie d'un cadre de palette, faite par le designer ([PLA-25], E15). */
export function copieDeCadre(nom: string): Constat {
  return {
    ou: `Copy of frame “${nom}”`,
    quoi: "This copy does not receive palette updates.",
    geste: "Update the original frame, then duplicate it.",
  };
}

/** L'information d'un document Display P3 (section 6.7, E11). */
export function noticeDisplayP3(): Constat {
  return {
    ou: "Display P3 Figma file",
    quoi: "The eyedropper reads a Display P3 code, which differs from the card’s sRGB code.",
    geste: "Copy the hex code on the card to get sRGB.",
  };
}

/** Les couleurs d'une palette que la planche peint autrement que l'aperçu (L6.14). */
export function ecartDePeinture(nom: string, ecarts: readonly { readonly nom: string; readonly apercu: string | null; readonly peint: string }[]): ConstatIllustre {
  const [premier] = ecarts;
  const compte = ecarts.length === 1 ? "1 colour does not match" : `${ecarts.length} colours do not match`;
  return {
    ou: `Preview and board differ: ${nom}`,
    quoi: `${compte} the preview.`,
    geste: "Update the palette in Figma. If the difference persists, send this message to the plugin maintainer.",
    detail: `Example, ${premier.nom}: ${premier.apercu ?? "missing colour"} in the preview, ${premier.peint} on the board.`,
  };
}

/** Les textes que la planche porte dans le document (section 9, récit R1 de W3.6), N093 à N099. */
export const TEXTES_DE_LA_PLANCHE = {
  // N093 : les titres des sections d'un thème ; une palette à une intensité a « La rampe », et des usages sans profil.
  rampes: "Both colour scales",
  rampe: "Colour scale",
  titreDesUsages: (profil: string | null) => (profil ? `Which shade to use · ${profil}` : "Which shade to use"),
  contrastes: "Contrast, shade by shade",
  // N094 : chaque usage, son nom et ce qu'il habille ; l'anneau porte l'état focus.
  usages: {
    'surface-card': { titre: "Card backgrounds", exemples: "card, panel, table header" },
    surface: { titre: "Subtle backgrounds", exemples: "soft button, badge, callout" },
    text: { titre: "Coloured text", exemples: "link, accent text" },
    solid: { titre: "Solid fills", exemples: "primary button, solid badge" },
    'border-control': { titre: "Input borders", exemples: "input, checkbox" },
    focus: { titre: "Focus ring", exemples: "keyboard focus" },
    'border-decorative': { titre: "Separators", exemples: "divider, card border" },
  },
  etatFocus: "focus · focus state",
  // N095 : les libellés des spécimens ; celui de `surface` ne se lit plus comme un profil (Y2.7).
  specimens: { surface: "Subtle background", lien: "Coloured link", bouton: "Button", champ: "Input", carte: "Card" },
  // N096 : les repères dans une pastille, et la note des profils confondus.
  reperage: '◆',
  confondu: '≈',
  noteDuRepere: "◆: the exact reference colour.",
  noteDesConfondus: "≈: Soft and Vivid are almost identical at this shade.",
  fond: "background",
  mode: { light: "Light theme", dark: "Dark theme" },
} as const;

/**
 * La section « Interface de test » de l'onglet Création ([UI-14]) : l'écran
 * « Membres de l'équipe », sur le modèle de Radix Themes, et la grille des
 * composants par état (N108, N113).
 */
export const TEXTES_DE_L_INTERFACE_DE_TEST = {
  titre: "Test interface",
  sousTitreDeLaCarte: "The palette on a sample screen",
  resume: (mode: Mode, profil: string | null) => (profil ? `${NOM_DU_MODE[mode]} theme · ${profil}` : `${NOM_DU_MODE[mode]} theme`),
  profil: "Preview profile",
  vue: "Test interface view",
  vues: { ecran: "Screen", etats: "States" },
  ecran: "Screen using the palette colours",
  etats: "Palette components by state",
  equipe: {
    organisation: 'Studio Nord',
    navigation: ["Settings", "Members", "Billing", "Integrations"],
    titre: "Team members",
    sousTitre: "4 members · 1 pending invitation",
    inviter: "Invite",
    icone: 'ⓘ',
    encart: "The invitation for camille@nord.studio expires in 2 days.",
    renvoyer: "Resend",
    membres: [
      { nom: 'Alex Martin', role: "Administrator", plein: true },
      { nom: 'Camille Roy', role: "Guest", plein: false },
      { nom: 'Inès Diallo', role: "Member", plein: false },
    ],
    roleParDefaut: "Default role",
    membre: "Member",
    coche: '✓',
    notifier: "Notify by email",
    acces: "Guest access",
    boutons: ["Cancel", "Draft", "Save"],
  },
  composants: {
    etats: ['default', 'hover', 'active', 'focus'],
    carte: "Card",
    plein: "Solid button",
    soft: "Soft button",
    contour: "Outline button",
    sansFond: "Ghost button",
    champ: "Input",
    lien: "Link",
    badge: 'Badge',
    action: 'Action',
    texte: "Text",
    lienColore: "Coloured link",
    nouveau: "New",
    sansEtat: '—',
  },
} as const;

/** Le panneau « Ajuster la référence » et sa trace dans la configuration (W7, X7). */
export const TEXTES_DE_L_AJUSTEMENT = {
  lien: "Adjust reference colour",
  titre: "Adjust reference colour",
  originale: "Original",
  proposition: "Proposed",
  plusSombre: "One step darker",
  plusClair: "One step lighter",
  code: "Proposed colour code",
  garanties: "Guarantees",
  aucuneGarantieManquee: "All guarantees met before and after.",
  appliquer: "Apply",
  annuler: "Cancel",
  ajusteeDepuis: (hexa: string) => `Adjusted from ${hexa}`,
  telleQuelle: "Reference colour unchanged.",
  revenir: "Restore original",
  colonnes: { garantie: "Guarantee", theme: "Theme", avant: "Before", apres: "After" },
  sur: "on",
  fond: "background",
} as const;

/** Un rôle dans la phrase qui dit pourquoi ajuster, avec son article (N136). */
const ROLE_DANS_LA_PHRASE: Record<Emploi, string> = {
  solid: "solid fills",
  'on-solid': "text on solid fills",
  text: "coloured text",
  surface: "subtle backgrounds",
  'surface-card': "card backgrounds",
  'border-control': "input borders",
  'border-decorative': "separators",
  focus: "focus rings",
};

/**
 * La phrase en tête de la modale « Ajuster la référence » (Z5.2, rédaction a,
 * N136) : une idée par phrase, le premier rôle manqué de chaque thème, sans
 * ratio. En Light, une garantie manquée dit une couleur trop claire ; en
 * Dark, trop sombre.
 */
export function pourquoiAjuster(manques: readonly { readonly mode: Mode; readonly emploi: Emploi }[]): string {
  const phrases = manques.map(({ mode, emploi }) => `In the ${NOM_DU_MODE[mode]} theme, it is too ${mode === 'light' ? "light" : "dark"} for ${ROLE_DANS_LA_PHRASE[emploi]}.`);
  return ["The palette uses your colour as it is.", ...phrases].join(' ');
}

/**
 * Le thème et l'intensité d'une garantie de la modale (N137) : « Light ·
 * Vivid » dans la colonne Thème, « Thème Light · Vivid » en titre de groupe
 * sous 552 px.
 */
export function themeDeLaGarantie(mode: Mode, profil: Intensite, enTitre: boolean): string {
  const theme = enTitre ? `${NOM_DU_MODE[mode]} theme` : NOM_DU_MODE[mode];
  return profil === 'unique' ? theme : `${theme} · ${NOM_DU_PROFIL[profil]}`;
}

/** Une garantie avant ou après la proposition : « ✓ 3,03:1 », « ✗ 2,92:1 » (N138). */
export function resultatDeLaGarantie(tenue: boolean, contraste: number): string {
  return `${tenue ? '✓' : '✗'} ${contrasteEcrit(contraste)}`;
}

/**
 * La ligne sous les pas (N139) : la nuance que la proposition vise, puis ce
 * que chaque pas voisin changerait, « Nuance 600 dans les deux thèmes · un
 * pas plus clair : 700 en Dark ».
 */
export function nuancesDeLAjustement(
  crans: { readonly [M in Mode]: number },
  voisins: readonly { readonly sens: -1 | 1; readonly changements: readonly { readonly mode: Mode; readonly numero: number }[] }[],
): string {
  const visee = crans.light === crans.dark ? `Shade ${crans.light} in both themes` : `Shade ${crans.light} in Light, ${crans.dark} in Dark`;
  const pas = voisins.map(({ sens, changements }) => `one step ${sens < 0 ? "darker" : "lighter"}: ${changements.map(({ mode, numero }) => `${numero} in ${NOM_DU_MODE[mode]}`).join(', ')}`);
  return [visee, ...pas].join(' · ');
}

/**
 * La ligne sous le code d'une référence qui manque des garanties, avant
 * « Ajuster la référence » (maquette Z3.1, lien b ; N135). Des manques dans
 * les deux thèmes se comptent ensemble.
 */
export function garantiesManqueesDeLaReference(manques: { readonly [M in Mode]: number }): string {
  const total = manques.light + manques.dark;
  const themes = (['light', 'dark'] as const).filter((mode) => manques[mode] > 0).map((mode) => `in the ${NOM_DU_MODE[mode]} theme`);
  return `${total} ${total === 1 ? "unmet guarantee" : "unmet guarantees"} ${themes.join(" and ")}`;
}

/** Le bilan d'un profil avant et après la proposition : « Vivid ✗ 2 → ✓ », ou « Soft ✓ inchangé ». */
export function bilanDeLAjustement(profil: Intensite, avant: number, apres: number): string {
  const resultat = (manquees: number) => (manquees === 0 ? '✓' : `✗ ${manquees}`);
  const nom = profil === 'unique' ? "Guarantees" : NOM_DU_PROFIL[profil];
  return avant === apres
    ? `${nom} ${resultat(avant)} unchanged`
    : `${nom} ${resultat(avant)} → ${resultat(apres)}`;
}

/** Un code saisi dans la configuration remplace une référence ajustée : l'originale n'est plus gardée (section 3 de la conception). */
export function originaleRetiree(originale: string): Constat {
  return {
    ou: `Original colour removed: ${originale}`,
    quoi: "The new reference replaces the original colour.",
    geste: "To restore it, press Ctrl+Z or enter it again.",
  };
}

/** La nuance de la référence, une fois si les deux thèmes s'accordent (V10.1). */
function nuancesDeLaReference(ancrage: Ancrage): string {
  const { light, dark } = ancrage.crans;
  return light === dark ? `shade ${light}` : `shade ${light} in the Light theme, ${dark} in the Dark theme`;
}

/**
 * La ligne de la référence sous le nom de la palette (V10.1, N062) : elle
 * nomme le profil porteur d'une palette à deux intensités seulement ([PLA-18]).
 */
export function enTeteDeLaReference(hexa: string, ancrage: Ancrage): string {
  return `Reference colour ${hexa} · ${avecLeNom(ancrage.profil, nuancesDeLaReference(ancrage))}`;
}

/** L'en-tête d'un thème ([PLA-09], N098). */
export function enTeteDuTheme(mode: Mode, fond: string): string {
  return `${TEXTES_DE_LA_PLANCHE.mode[mode]} · background ${fond}`;
}

/** Le verdict d'un thème, en tête de sa section : ses garanties manquées, chaque intensité comptée (N098). */
export function verdictDuTheme(manquees: number): string {
  if (manquees === 0) return "✓ All guarantees met";
  return manquees === 1 ? "1 unmet guarantee" : `${manquees} unmet guarantees`;
}

/** La légende des grilles, en une ligne ([PLA-16], N099). */
export function legendeDesContrastes(seuils: Recette['seuils']): string {
  return `Row: background · column: text · bold from ${seuilEcrit(seuils.texte)}:1 · regular from ${seuilEcrit(seuils.nonTexte)}:1 · faded below · AA from 4.5:1 · AAA from 7:1`;
}
