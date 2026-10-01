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
  type DeriveRangee,
  type Emploi,
  type EmploiDUnCran,
  type EtatDePaire,
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
  langueNonRangee: 'Your language choice could not be saved. Try again to keep it for your next session.',
  reessayerLangue: 'Save language again',
  titre: 'UCM Palettes',
  titreConfiguration: "Shared settings",
  largeurDeLaFenetre: (largeur: number) => `${largeur} px`,
  etiquetteDesOnglets: "Plugin navigation",
  // N130. Les clés gardent le nom de leur module (Q6.1) : `ongletPalettes.ts` porte l'onglet Création.
  ongletPalettes: "Create",
  ongletPlanche: 'Palettes',
  lectureEnCours: "Loading palettes and settings…",
  recetteAbsente: "Create your first palette. The default settings will be used.",
  choisirUnePalette: "Choose a palette",
  // N134 : le sélecteur sans palette choisie, puis l'invitation dessous (maquette Z3.3, D1, texte a).
  selectionnerUnePalette: "Select a palette",
  invitationTitre: "Choose a palette",
  invitation: "Select a palette from the list to edit it, or choose “New palette” to create one.",
  dessiner: "Generate in Figma",
  prete: "Ready",
  reference: "Reference colour",
  nom: "Palette name",
  apercu: "Shade preview",
  modesDeLApercu: "Preview theme",
  modeClair: "Light theme",
  modeSombre: "Dark theme",
  titrePromesses: "Unmet contrast requirements",
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
  retour: "Back to palettes and board",
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
  derive: "Hue shift",
} as const;

/** Le pied de l'onglet Création et son volet ([UI-18]). */
export const TEXTES_DU_PIED = {
  region: "Palette summary",
  details: "Details",
  titre: "Guarantees and alerts",
  fermer: "Close",
  aucun: "No unmet guarantee, no alert.",
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
  'intensites-palette': "Hue, saturation, lightness",
  derive: "Hue shift",
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
  seuilsDeContraste: "Minimum contrast requirements",
  seuilTexte: "Text",
  seuilNonTexte: "Graphical elements",
  couleursProches: "Similar colour detection",
  seuilPalettesProches: "Minimum difference between two palettes",
  sansRecette: "The saved palettes and settings could not be read. Import a valid backup to access the settings.",
  aideCourbes: "Set the lightness of each shade between 0 and 1. Changes apply to all palettes.",
  aideEcarts: "This threshold flags colours that are too similar. Increase it to flag more similarities. Unit: ΔEok, the distance between two colours in Oklab.",
  aideMinimums: "These values set the minimum contrast for your requirements. Changing them affects the results, without changing the colours or WCAG levels.",
  retablir: "Reset",
  // N059 : la garantie des courbes ne remplace pas celles des palettes (V9.4).
  garantieCommune: "This check covers the shared curves across all hues. For an individual palette, see its “Contrast guarantees” card.",
  // N060, réécrit en W6.4 : « Rétablir » des courbes, quand la liste des nuances vient d'un import.
  courbesSansDefaut: "This shade list was imported. There are no default curves for it.",
  // N091 : le titre de chaque ligne de la table des courbes, et le nom de la table (W4.3).
  courbeDuMode: { light: 'Light', dark: 'Dark' },
  tableDesCourbes: "Lightness of each shade, Light then Dark",
  // N092 : l'aide de chaque seuil, sous son libellé (W4.4).
  aideSeuilTexte: "For text on surface, on-solid on solid, and text on the background.",
  aideSeuilNonTexte: "For input borders, focus rings and solid fills in the hover state.",
  aideProfilsConfondus: "Measured between the two profiles of the same shade.",
  aidePalettesProches: "Measured on shades 500, 600 and 700 in the Light theme: Vivid against Vivid for palettes with two intensities, otherwise the closest colour scale.",
  // Les fonds du thème Dark, dans la carte Intensités ([MOT-28], maquette Y2.5).
  fondsSombres: "Dark theme backgrounds",
  aideFondsSombres: "Fraction of intensity retained by Dark theme shades 50 to 300, starting at shade 50 and rising to 1 at shade 400. The Light theme is unchanged.",
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
  return `Enter a number, for example 0.5. “${saisie}” is not accepted.`;
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
    quoi: `This curve gives a contrast of ${contrasteEcrit(manque.contraste)} against shade 50 at a hue of ${manque.teinte}°. The required minimum is ${seuilEcrit(manque.seuil)}:1.`,
    geste: `Increase the lightness difference between shades ${manque.cran} and 50. If you keep these values, check the contrast of each palette.`,
  };
}

/** Les réglages propres à une palette (section 8.1, [ENT-09]). */
export const TEXTES_AVANCES = {
  avance: "Settings for this palette",
  reprendre: "Use shared intensity settings",
} as const;

/** Les intensités sous le nuancier (section 8.1). */
export const TEXTES_DES_INTENSITES = {
  libelle: (profil: string) => `${profil} intensity`,
  repere: (part: string) => `Reference colour intensity: ${part}`,
  detailDeLaReference: "Reference colour intensity",
} as const;

/**
 * D'où viennent les saturations d'une palette, quand une ligne le dit : ses
 * parts propres, ou un gris pur (T4). Sans l'un ni l'autre, aucune ligne (T3).
 */
export function origineDesParts(propres: boolean, grise: boolean): string | null {
  if (propres) return "This palette uses its own intensities. Changes to the shared intensity settings no longer apply to it.";
  if (grise) return "Your reference colour is a pure grey. Soft and Vivid are grey.";
  return null;
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

/**
 * La carte « Teinte, saturation, luminosité » (Z10.6, maquette Z10.4, forme
 * A). Le titre et les deux avertissements sont validés ; les autres textes
 * attendent la validation (N143 à N146).
 */
export const TEXTES_DES_REGLAGES = {
  titre: "Hue, saturation, lightness",
  regler: "Adjust",
  cible: "Profile to adjust",
  lesDeux: "Both",
  deuxProfils: "Soft and Vivid",
  grandeurs: { teinte: "Hue", saturation: "Saturation", luminosite: "Lightness" },
  retablir: "Reset",
  retablirLa: (grandeur: string) => `Reset ${grandeur.toLowerCase()}`,
  etiquette: (grandeur: string, profil: string) => `${profil} ${grandeur.toLowerCase()}`,
  avertissementAvant: "Warning: this adjustment will change your reference colour.",
  avertissementApres: "Warning: your reference colour has been changed.",
  neutre: "This adjustment doesn't change the reference colour.",
  pied: "The hue shift is applied afterwards.",
  porteurFige: (profil: Profil) => `Reference in ${NOM_DU_PROFIL[profil]}, fixed by the adjustments. Changing profile will change your reference colour.`,
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
 * Le résumé de la carte repliée (N146) : les réglages de chaque profil, ou
 * « Aucun réglage », puis la saturation de chaque profil. Un profil sans nom
 * est la rampe d'une palette à une intensité.
 */
export function resumeDesReglages(
  reglages: readonly { readonly nom: string; readonly teinte: number; readonly clarte: number }[],
  saturations: readonly { readonly nom: string; readonly part: number }[],
  points: number,
): string {
  const regles = reglages.filter(({ teinte, clarte }) => teinte !== 0 || clarte !== 0)
    .map(({ nom, teinte, clarte }) => [nom, teinte !== 0 ? teinteReglee(teinte) : '', clarte !== 0 ? luminositeReglee(clarte) : ''].filter(Boolean).join(' '));
  const saturation = saturations.map(({ nom, part }) => `${nom || "Saturation"} ${saturationReglee(part)}`).join(' · ');
  return `${regles.length > 0 ? regles.join(' · ') : "No adjustment"} · ${saturation}${pointsAVerifier(points)}`;
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

/** Les libellés de l'éditeur de dérive (section 12). */
export const TEXTES_DE_LA_DERIVE = {
  regler: "Hue shift settings",
  grisDesactive: "This palette is entirely grey. There is no hue to adjust.",
  sansSegmentClair: "The reference colour is lighter than every shade. Only the dark end hue control is available.",
  sansSegmentSombre: "The reference colour is darker than every shade. Only the light end hue control is available.",
  prereglage: "Hue shift",
  tailwind: 'Tailwind',
  constante: "Constant hue",
  libre: "Custom",
  lien: "Sync Soft and Vivid hue shifts",
  profilRegle: "Profile to edit",
  aligner: "Apply to Soft",
  annuler: "Cancel",
  confirmationDuLien: "The Vivid hue shift will be applied to Soft. Both profiles will then share the same settings.",
  bout: { clair: "Light shades", sombre: "Dark shades" },
  deriveAuBout: { clair: "Hue offset for light shades", sombre: "Hue offset for dark shades" },
  ramenerAuPrereglage: { clair: "Reset light shades to the Tailwind hue shift", sombre: "Reset dark shades to the Tailwind hue shift" },
} as const;

/** Ce qu'une poignée annonce au lecteur d'écran ([DER-09]) : l'angle et la teinte absolue. */
export function valeurDePoignee(angle: number, teinte: number): string {
  return `Offset ${angleEcrit(angle)}, resulting hue: ${Math.round(teinte) % 360}°`;
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

/** Une graduation du graphe : « +30° », « 0° ». */
export function graduation(degres: number): string {
  return `${degres > 0 ? '+' : degres < 0 ? '−' : ''}${Math.abs(degres)}°`;
}

/** L'étiquette d'une poignée ([DER-03]) : l'angle signé et la teinte absolue. */
export function etiquetteDePoignee(angle: number, teinte: number): string {
  return `Offset ${angleEcrit(angle)} · hue ${Math.round(teinte) % 360}°`;
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
  return `Enter a 6-digit hex colour code, for example #1E6FD9. “${saisie}” is not accepted.`;
}

/** La confirmation d'une suppression ([ENT-03]). */
export function confirmationDeSuppression(nom: string): string {
  return `Palette “${nom}” will be deleted from the plugin. Its frame will remain on the board, but you will no longer be able to update it.`;
}

/**
 * Le refus d'un enregistrement : les palettes et réglages enregistrés ont
 * changé depuis leur lecture ([REC-10]). Le plugin ne sait pas qui les a
 * changés.
 */
export function recetteModifieeAilleurs(): Constat {
  return {
    ou: "Changes not saved",
    quoi: "The palettes or settings in this file have changed since they were loaded. Your latest change was not saved.",
    geste: "Export your changes to keep them, then reload the palettes to retrieve the file’s version.",
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

const ORIGINES: Record<DeriveRangee['origine'], string> = { tailwind: 'Tailwind', constante: "Constant hue", libre: "Custom" };

/** Le nombre de points à vérifier qu'une carte repliée annonce ([UI-12]). */
function pointsAVerifier(nombre: number): string {
  if (nombre === 0) return '';
  return nombre === 1 ? " · 1 point to check" : ` · ${nombre} points to check`;
}

/** Le résumé de la carte Dérive de teinte (N041) : le préréglage et la synchronisation. */
export function resumeDeLaDerive(palette: Palette, grise: boolean, points: number): string {
  if (grise) return "Disabled for a grey palette";
  const { lien, soft, vivid } = palette.derive;
  // Une palette à une intensité n'a qu'une dérive : rien à synchroniser ([ENT-14]).
  if (palette.intensites === 1) return `${ORIGINES[vivid.origine]}${pointsAVerifier(points)}`;
  const reglage = lien ? `${ORIGINES[vivid.origine]} · synced` : `Soft ${ORIGINES[soft.origine]} · Vivid ${ORIGINES[vivid.origine]} · not synced`;
  return `${reglage}${pointsAVerifier(points)}`;
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
  legende: "Solid line: default · dashed: hover · dotted: active · dash-dot: active-hover. Each state moves both text and background forward by one shade.",
  onSolid: "on-solid is the theme’s page background, neutral.50 in the design system.",
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
  aucunRole: "No role in the model uses this shade.",
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
    quoi: `This pairing falls below the required minimum contrast of ${seuilEcrit(groupe.seuil)}:1.`,
    geste: "Adjust this palette’s intensity or hue shift, then check the pairing again. You can adjust lightness in the shared settings.",
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
        quoi: "Soft and Vivid are very similar at these shades.",
        geste: "Increase the difference between Soft and Vivid intensities. Use this palette’s settings if it has custom intensities; otherwise, use the shared settings.",
        mesures: [`Smallest difference: ${ecrireArrondi(plusProche, 3)} ΔEok, against a minimum of ${ecrireArrondi(alerte.seuil, 2)} ΔEok`],
      };
    }
    case 'palettes-proches':
      return {
        ou: `Palettes to compare: ${contexte.nomDe(alerte.palettes[0])} and ${contexte.nomDe(alerte.palettes[1])}`,
        quoi: "Vivid shades 500, 600 and 700 are very similar in these two palettes in the Light theme.",
        geste: "If these palettes need to be distinct, change their reference colours. You can also delete the duplicate palette.",
        mesures: [`Average difference: ${ecrireArrondi(alerte.distance, 3)} ΔEok, against a minimum of ${ecrireArrondi(alerte.seuil, 2)} ΔEok`],
      };
    case 'reference-plus-terne':
      return {
        ou: `${contexte.nomDe(alerte.palette)}: reference colour ${referenceLue(contexte, alerte.palette)}`,
        quoi: `The shades generated around your reference colour use a higher intensity. Reference intensity: ${ecrireArrondi(alerte.part, 2)}; Soft: ${ecrireArrondi(alerte.partSoft, 2)}.`,
        geste: "Reduce the intensities in “Settings for this palette” to get closer to the reference colour.",
      };
    case 'reference-plus-vive':
      return {
        ou: `${contexte.nomDe(alerte.palette)}: reference colour ${referenceLue(contexte, alerte.palette)}`,
        quoi: `The Vivid shades generated around your reference colour use a lower intensity. Reference intensity: ${ecrireArrondi(alerte.part, 2)}; Vivid: ${ecrireArrondi(alerte.partVivid, 2)}.`,
        geste: "Increase the Vivid intensity in “Settings for this palette” to get closer to the reference colour.",
      };
    case 'fond-hors-courbe': {
      const sens = alerte.mode === 'light' ? "darker" : "lighter";
      return {
        ou: `Background for ${NOM_DU_MODE[alerte.mode]} theme: ${contexte.recette.fonds[alerte.mode]}`,
        quoi: `This background is ${sens} than shade 50. Check the contrast requirements against this background. Lightness: ${ecrireArrondi(alerte.clarte, 3)}, compared with ${ecrireArrondi(alerte.cran, 3)}.`,
        geste: "Check the contrast calculated against your background. If it is too low, use the shared settings to move its lightness closer to shade 50.",
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
 * `palettes[1].derive.soft.clair` « Palette 2, dérive de teinte, soft, côté
 * clair ». Un chemin que la table ne connaît pas s'écrit tel quel.
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
  forme: (champ) => `${champ}: a value is missing or its format is not recognised.`,
  'cle-inconnue': (champ) => `${champ}: this setting is not recognised by this version of the plugin.`,
  'crans-croissants': (_, valeur) => (valeur
    ? `Shades: number ${valeur} is invalid. Use unique whole numbers in ascending order.`
    : "Add at least two shade numbers and sort them in ascending order."),
  'courbes-longueur': (champ, valeur) => `${champ} contains ${valeur} values. Enter a lightness value for each shade.`,
  'courbes-bornes': (champ, valeur) => `${champ}: enter a lightness between 0 and 1. Received: ${valeur}.`,
  'courbe-claire-decroissante': (champ, valeur) => `${champ}: lightness must be lower than the previous shade. Received: ${valeur}.`,
  'courbe-sombre-croissante': (champ, valeur) => `${champ}: lightness must be higher than the previous shade. Received: ${valeur}.`,
  'parts-bornes': (champ, valeur) => `${champ}: enter an intensity between 0 and 1. Received: ${valeur}.`,
  'parts-ordre': (champ) => `${champ}: Soft intensity must be less than or equal to Vivid intensity.`,
  'gamut-inconnu': (_, valeur) => `Colour space “${valeur}” is not supported. Use sRGB.`,
  'hexa-invalide': (champ, valeur) => `${champ}: replace “${valeur}” with a 6-digit hex colour code, for example #1E6FD9.`,
  'seuils-positifs': (champ, valeur) => `${champ}: enter a number greater than 0. Received: ${valeur}.`,
  'derives-nombre': (_, valeur) => `The Tailwind preset must contain at least two colour families. Found: ${valeur}.`,
  'derives-noms': (_, valeur) => `Tailwind preset: the name “${valeur}” is used twice. Give each colour family a different name.`,
  'derives-teintes': (champ, valeur) => `${champ}: enter a hue from 0° inclusive to 360° exclusive. Received: ${valeur}°.`,
  'derives-teintes-claires': (_, valeur) => `Tailwind preset: two colour families use the same hue at the light end (${valeur}°). Give them different hues.`,
  'derive-bornes': (champ, valeur) => `${champ}: enter an offset between −90° and +90°. Received: ${valeur}°.`,
  'derive-lien': (champ) => `${champ}: linked profiles, but different Color shifts. Give them the same values or turn off the sync.`,
  // Les trois règles du format 7 ([MOT-30]).
  'derive-saturation': (champ, valeur) => `${champ}: saturation shift ${valeur}, outside −1 to 1. Correct this field in the imported file.`,
  'derive-clarte': (champ, valeur) => `${champ}: lightness shift ${valeur}, outside −0.15 to 0.15. Correct this field in the imported file.`,
  'derive-nulle': (champ) => `${champ}: both shifts are zero. Remove this field from the imported file.`,
  'origine-inconnue': (champ, valeur) => `${champ}: the origin “${valeur}” is not recognised. Have this field checked in the imported file.`,
  'identifiant-forme': (_, valeur) => `Palette ID “${valeur}” has an unexpected format. Have this ID checked in the imported file.`,
  'identifiants-uniques': (_, valeur) => `Two palettes use the ID “${valeur}”. Give each palette a different ID in the imported file.`,
  'base-inconnue': (champ, valeur) => `${champ}: “${valeur}” is not recognised. Use soft or vivid, or remove this field for automatic selection. Have this field checked in the imported file.`,
  'crans-emplois': (_, valeur) => `Shade ${valeur} is missing. Add it: the plugin needs it for usage examples and contrast checks.`,
  // N101 : les quatre règles du format 3 (W6.3, W7.2).
  'crans-libres-nombre': (champ, valeur) => `${champ}: choose between 4 and 13 shades. Found: ${valeur}.`,
  'crans-libres-numeros': (champ, valeur) => `${champ}: “${valeur}” is not accepted. Use a multiple of 50 between 50 and 1050, greater than the previous number.`,
  'base-libre': (champ) => `${champ}: a freeform palette has no base palette. Remove this field from the imported file.`,
  'originale-identique': (champ) => `${champ}: this is identical to the reference colour. Remove this field from the imported file.`,
  // Les quatre règles du format 4 ([ENT-14], [MOT-28], [PLA-28]).
  'intensites-valeur': (champ, valeur) => `${champ}: “${valeur}” is not accepted. Use 1 for a single intensity, or remove this field for Soft and Vivid.`,
  'intensites-incompatible': (champ) => `${champ}: a single-intensity palette has no base palette, custom intensities or freeform shades, and its hue shifts stay linked. Remove this field from the imported file.`,
  'fonds-sombres-bornes': (champ, valeur) => `${champ}: enter an intensity between 0 and 1. Received: ${valeur}.`,
  'contenu-sans-theme': (champ) => `${champ}: keep at least one theme, Light or Dark.`,
  // Les huit règles du format 5 (Z10.5, N141).
  'reglages-bornes': (champ, valeur) => `${champ}: “${valeur}” is out of range. Hue goes from −30° to +30°, lightness from −0.05 to +0.02, saturation from 0 to 1.`,
  'reglage-nul': (champ) => `${champ}: a zero adjustment is not saved. Remove this field from the imported file.`,
  'reglages-intensites': (champ) => `${champ}: this adjustment does not match the palette’s number of intensities. Remove this field from the imported file.`,
  'porteur-base': (champ) => `${champ}: the base palette already sets the profile that holds the reference. Remove this field from the imported file.`,
  'porteur-manquant': (champ) => `${champ}: set the profile that holds the reference, soft or vivid, in the imported file.`,
  'reglages-sans-originale': (champ) => `${champ}: these adjustments move the reference, but the original colour is missing. Have this field checked in the imported file.`,
  'depart-sans-reglage': (champ) => `${champ}: no adjustment starts from this colour. Remove this field from the imported file.`,
  'depart-identique': (champ) => `${champ}: it is identical to the original colour. Remove this field from the imported file.`,
};

/** Le texte d'un refus de [REC-05]. */
export function texteDuRefus(refus: Refus): string {
  return REFUS[refus.regle](nommerChamp(refus.chemin), nombre(refus.valeur));
}

/** Le blocage d'une recette enregistrée par une version plus récente du plugin. */
export function recetteFuture(version: number): Constat {
  return {
    ou: `Backup format ${version}`,
    quoi: `This backup requires a newer version of UCM Palettes. Your plugin supports format ${FORMAT_RECETTE} and cannot generate the board.`,
    geste: "Update UCM Palettes. You can export the current data to keep it before importing another backup or resetting the plugin.",
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
    geste: "Import a valid backup. To keep the current data, export it before choosing “Reset palettes and settings”.",
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
  sansEcart: "This backup contains the same palettes and settings.",
  importSansDessin: "Importing will replace the palettes and settings in this Figma file. The board will stay as it is until you next update it.",
  confirmationDuDepart: "All palettes will be removed from the plugin and settings will return to their defaults. Export your data first if you want to keep it.",
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
    nature.minimums ? "Minimum contrast requirements: guarantee results may change without changing the colours." : null,
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
    geste: "Correct the indicated file, then try importing again. You can also choose another backup.",
  };
}

/** Un fichier importé d'une version que ce plugin ne lit pas. */
export function importFutur(fichier: string, version: number): Constat {
  return {
    ou: `Could not import: ${fichier}, format ${version}`,
    quoi: `This backup requires a newer version of the plugin, which currently supports format ${FORMAT_RECETTE}. Your current palettes and settings are kept.`,
    geste: "Install a newer version of UCM Palettes, then import this backup again.",
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
  plancheSansPalette: "Create a palette in the “Create” tab to generate its board here.",
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
    quoi: `The plugin searched for ${seul ? "this frame" : "these frames"} on page ${nomDeLaPage ? `“${nomDeLaPage}”` : "used for the board"} only. A frame that was deleted, or cut and pasted onto another page, is no longer there. Generating the palette creates a new frame.`,
    geste: "Search the entire file before generating to avoid creating a duplicate.",
  };
}

/** Une génération refusée : Figma n'a pas pu lire le cadre existant d'une palette (V8.6, N052). */
export function lectureImpossible(noms: readonly string[]): Constat {
  return {
    ou: `Could not read frame: ${citer(noms)}`,
    quoi: `Figma could not read the existing frame for ${noms.length === 1 ? "this palette" : "these palettes"}. No palettes were generated, to avoid creating duplicate frames.`,
    geste: "Refresh the Palettes tab, then try generating again.",
  };
}

/** Un suivi des cadres écrit par une version plus récente du plugin (V8.8, N053). */
export function suiviFutur(): Constat {
  return {
    ou: "Board from a newer version",
    quoi: "The frames in this file were generated by a newer version of UCM Palettes. This version cannot read or update them.",
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
  return `Generating ${nombre} palettes will add more than 1,500 layers per palette. Confirm to start generating.`;
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
    quoi: "The palettes or settings have changed since they were loaded. Generation was cancelled to avoid creating a board that differs from the preview.",
    geste: "Reload the palettes, check the preview, then generate again.",
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
      ? "Move this layer outside the frame to keep it. Otherwise, confirm the replacement."
      : "Move these layers outside the frame to keep them. Otherwise, confirm the replacement.",
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
    quoi: "The plugin updates only the original frame. The colours in this copy may be out of date.",
    geste: "Update the palette, then duplicate its original frame to get a new copy.",
  };
}

/** L'information d'un document Display P3 (section 6.7, E11). */
export function noticeDisplayP3(): Constat {
  return {
    ou: "Display P3 Figma file",
    quoi: "In this Display P3 file, the eyedropper may show a different code from the sRGB code on the card.",
    geste: "To get the palette’s sRGB code, copy the hex code on the card.",
  };
}

/** Les couleurs d'une palette que la planche peint autrement que l'aperçu (L6.14). */
export function ecartDePeinture(nom: string, ecarts: readonly { readonly nom: string; readonly apercu: string | null; readonly peint: string }[]): ConstatIllustre {
  const [premier] = ecarts;
  const compte = ecarts.length === 1 ? "1 colour does not match" : `${ecarts.length} colours do not match`;
  return {
    ou: `Preview and board differ: ${nom}`,
    quoi: `${compte} the preview.`,
    geste: "Update the palette on the board. If the difference persists, send this message to the plugin maintainer.",
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
  resume: (mode: Mode, profil: string | null) => (profil ? `${NOM_DU_MODE[mode]} theme · ${profil}` : `${NOM_DU_MODE[mode]} theme`),
  profil: "Preview profile",
  vue: "Test interface view",
  vues: { ecran: "Screen", etats: "States" },
  ecran: "Team screen using the palette",
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
  aucuneGarantieManquee: "All guarantees met, before and after.",
  appliquer: "Apply",
  annuler: "Cancel",
  ajusteeDepuis: (hexa: string) => `Adjusted from ${hexa}`,
  telleQuelle: "Reference colour used as is.",
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
    quoi: "The colour you entered becomes the new reference. The palette no longer keeps the original colour from the adjustment.",
    geste: "To restore it, undo with Ctrl+Z or enter it again.",
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
