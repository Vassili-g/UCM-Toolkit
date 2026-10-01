/**
 * Textes français de l'interface et des planches. La relecture se trouve dans
 * `docs/notes/Recherches/Plugin Palettes/TEXTES-A-VALIDER.md`.
 * Un message a trois parties : où, quoi, geste.
 *
 * Les clés `soft`, `vivid`, `light`, `dark` et les codes d'emploi restent
 * ceux des données ; seul leur affichage se traduit ici.
 */
import type { ChampDePalette } from '../importation';
import type { EtatDuCadre } from '../planche/fraicheur';
import {
  FORMAT_RECETTE,
  RANGS,
  ecrireArrondi,
  ecrireContraste,
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

export const TEXTES = {
  numeroDeNuance: (numero: number) => `nuance ${numero}`,
  langue: 'Langue',
  langueNonRangee: "Langue non enregistrée. Réessayez.",
  reessayerLangue: 'Réessayer l’enregistrement de la langue',
  titre: 'UCM Palettes',
  titreConfiguration: 'Réglages communs',
  largeurDeLaFenetre: (largeur: number) => `${largeur} px`,
  etiquetteDesOnglets: 'Navigation du plugin',
  // N130. Les clés gardent le nom de leur module (Q6.1) : `ongletPalettes.ts` porte l'onglet Création.
  ongletPalettes: 'Création',
  ongletPlanche: 'Palettes',
  lectureEnCours: 'Chargement des palettes et des réglages…',
  recetteAbsente: 'Créez votre première palette. Les réglages par défaut seront utilisés.',
  choisirUnePalette: 'Choisir une palette',
  // N134 : le sélecteur sans palette choisie, puis l'invitation dessous (maquette Z3.3, D1, texte a).
  selectionnerUnePalette: 'Sélectionner une palette',
  invitationTitre: 'Choisissez une palette',
  invitation: "Sélectionnez une palette ou créez-en une avec « Nouvelle palette ».",
  dessiner: 'Générer sur Figma',
  prete: 'Prête',
  reference: 'Couleur de référence',
  nom: 'Nom de la palette',
  apercu: 'Aperçu des nuances',
  modesDeLApercu: 'Thème de l’aperçu',
  modeClair: 'Thème Light',
  modeSombre: 'Thème Dark',
  titrePromesses: "Contrastes à corriger",
  titreAlertes: 'Points à vérifier',
  titreNotices: 'À savoir',
  // N075, N086 : le bouton de la barre, puis le titre de la carte qu'il ouvre.
  nouvellePalette: 'Nouvelle palette',
  titreDeLaCreation: 'Nouvelle palette',
  creer: 'Créer la palette',
  annuler: 'Annuler',
  gestesDeLaPalette: 'Actions sur la palette',
  dupliquer: 'Dupliquer la palette',
  monter: 'Déplacer vers le haut',
  descendre: 'Déplacer vers le bas',
  supprimer: 'Supprimer la palette',
  recharger: 'Recharger les palettes',
  // N070, N071 : la sortie d'un conflit d'enregistrement (V12.1).
  exporterLeBrouillon: 'Exporter mes modifications',
  conflitEnCours: 'Exportez vos modifications ou rechargez les palettes avant d’enregistrer, d’importer ou de générer.',
  detailTechnique: 'Détail technique',
  ouvrirLesReglages: 'Ouvrir les réglages communs',
  reglagesCommuns: 'Réglages communs',
  retour: "Retour aux palettes",
  // N102 : le bilan d'une palette libre, à la place des résultats Soft et Vivid (W3.5, W6.6).
  paletteLibre: (nombre: number) => `Palette libre · ${nombre} nuances`,
} as const;

/**
 * Le titre de premier rang de l'onglet Création et les titres de ses cartes
 * (N076, N077, N027). La carte d'aperçu ne montre pas son titre : il reste son
 * nom accessible.
 */
export const TEXTES_DE_L_ONGLET = {
  titre: (nom: string) => `Palette ${nom}`,
  configuration: 'Configuration de la palette',
  apercu: 'Aperçu',
  garanties: 'Garanties de contraste',
  derive: 'Color shift',
  sousTitreDeLaDerive: "Ajuster les nuances autour de la référence ◆",
} as const;

/** Le pied de l'onglet Création et son volet ([UI-18]). */
export const TEXTES_DU_PIED = {
  region: 'Bilan de la palette',
  details: 'Détails',
  titre: 'Garanties et alertes',
  fermer: 'Fermer',
  aucun: "Toutes les garanties sont tenues. Aucune alerte.",
} as const;

/**
 * Le bilan du pied ([UI-18]) : « 76 garanties tenues · aucune alerte »,
 * « 2 garanties manquées sur 76 · 1 alerte », « Palette libre · 2 alertes ».
 */
export function bilanDuPied(garanties: number, manquees: number, alertes: number, libre: boolean): string {
  const lesAlertes = alertes === 0 ? 'aucune alerte' : alertes === 1 ? '1 alerte' : `${alertes} alertes`;
  if (libre) return `Palette libre · ${lesAlertes}`;
  if (manquees === 0) return `${garanties} ${garanties === 1 ? 'garantie tenue' : 'garanties tenues'} · ${lesAlertes}`;
  return `${manquees} ${manquees === 1 ? 'garantie manquée' : 'garanties manquées'} sur ${garanties} · ${lesAlertes}`;
}

/** Le titre d'un groupe de messages et son nombre ([VER-14]) : « Promesses à corriger · 2 ». */
export function titreDeGroupe(titre: string, nombre: number): string {
  return `${titre} · ${nombre}`;
}

/** Le libellé du lien qu'un message pose vers un réglage ([VER-15]). */
export const LIBELLES_DES_CIBLES: Record<CibleDAction, string> = {
  reference: 'Couleur de référence',
  // Le nom de la carte qui règle la saturation des profils (Z10.6, N147).
  'intensites-palette': 'Réglage global',
  derive: 'Color shift',
  'luminosite-commune': 'Luminosité des nuances',
  fonds: 'Couleurs de fond',
  'intensites-communes': 'Intensités communes',
  'ajuster-reference': 'Ajuster la référence',
};

/** Les libellés des Réglages communs (section 8.3), dans l'ordre du panneau. */
export const TEXTES_DE_CONFIGURATION = {
  courbes: 'Luminosité des nuances',
  cran: 'Nuance',
  clair: 'Thème Light',
  sombre: 'Thème Dark',
  parts: 'Intensités',
  seuilProfilsConfondus: 'Écart minimal entre soft et vivid',
  fonds: 'Couleurs de fond',
  fondDuMode: { light: 'Fond du thème Light', dark: 'Fond du thème Dark' },
  seuilsDeContraste: "Contrastes minimums",
  seuilTexte: 'Texte',
  seuilNonTexte: 'Éléments graphiques',
  couleursProches: 'Détection des couleurs proches',
  seuilPalettesProches: 'Écart minimal entre deux palettes',
  sansRecette: "Palettes et réglages illisibles. Importez une sauvegarde valide.",
  aideCourbes: "Luminosité de 0 à 1, pour toutes les palettes.",
  aideEcarts: "Un seuil plus élevé signale davantage de couleurs proches. L’écart se mesure en ΔEok.",
  aideMinimums: "Ces seuils changent le résultat des garanties, pas les couleurs ni les niveaux WCAG.",
  retablir: 'Rétablir',
  // N059 : la garantie des courbes ne remplace pas celles des palettes (V9.4).
  garantieCommune: "Vérification sur toutes les teintes. Vérifiez aussi la carte « Garanties de contraste » de chaque palette.",
  // N060, réécrit en W6.4 : « Rétablir » des courbes, quand la liste des nuances vient d'un import.
  courbesSansDefaut: "Aucune courbe par défaut pour cette liste de nuances importée.",
  // N091 : le titre de chaque ligne de la table des courbes, et le nom de la table (W4.3).
  courbeDuMode: { light: 'Light', dark: 'Dark' },
  tableDesCourbes: 'Luminosité de chaque nuance, Light puis Dark',
  // N092 : l'aide de chaque seuil, sous son libellé (W4.4).
  aideSeuilTexte: 'Pour text sur surface, on-solid sur solid et text sur le fond.',
  aideSeuilNonTexte: 'Pour la bordure de champ, l’anneau de focus et le fond plein, état hover.',
  aideProfilsConfondus: 'Mesuré entre les deux profils d’une même nuance.',
  aidePalettesProches: "Compare les nuances 500, 600 et 700 en Light. Utilise Vivid pour deux palettes à deux intensités, sinon les rampes les plus proches.",
  // Les fonds du thème Dark, dans la carte Intensités ([MOT-28], maquette Y2.5).
  fondsSombres: 'Fonds du thème Dark',
  aideFondsSombres: "Intensité conservée à la nuance 50 en Dark. Elle augmente jusqu’à 100 % à la nuance 400. Aucun effet en Light.",
  // La carte « Contenu des planches » ([PLA-28], maquette Y2.3, C1).
  contenu: 'Contenu des planches',
  // N061 : les unités des mesures avancées (V9.8).
  uniteDeContraste: ':1',
  uniteDEcart: 'ΔEok',
} as const;

/** Un nombre de calques, les milliers séparés par une espace fine. */
const milliers = (nombre: number): string => String(nombre).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');

/** La carte « Contenu des planches » des Réglages communs ([PLA-28], maquette Y2.3, C1). */
export const TEXTES_DU_CONTENU = {
  parties: 'Parties d’un cadre',
  themes: 'Thèmes',
  lignes: {
    rampes: { nom: 'En-tête et rampes', aide: 'Nom, référence, et les pastilles que la création des variables lit' },
    note: { nom: 'Note sous les rampes', aide: '◆ et ≈ expliqués' },
    usages: { nom: 'Quelle nuance pour quel usage', aide: 'Les spécimens et leurs garanties, par profil' },
    grilles: { nom: 'Contrastes, nuance par nuance', aide: 'Les grilles de chaque rampe' },
    light: { nom: 'Thème Light', aide: (fond: string) => `Fond ${fond}` },
    dark: { nom: 'Thème Dark', aide: (fond: string) => `Fond ${fond}` },
  },
  auMoinsUnTheme: ' · au moins un thème',
  calques: (nombre: number) => `${milliers(nombre)} calques`,
  toutGenere: 'Tout est généré.',
  effet: (palette: string, complet: number, choisi: number) => `Les cadres déjà générés passeront « À actualiser ». Cadre de ${palette} : ${milliers(complet)} → ${milliers(choisi)} calques.`,
  resume: {
    tout: 'Tout est généré',
    note: 'Sans note',
    usages: 'Sans usages',
    grilles: 'Sans grilles',
    light: 'Thème Dark seul',
    dark: 'Thème Light seul',
  },
} as const;

/** Le choix du préréglage, en tête de « Luminosité des nuances », et ce qu'il changerait (W6.4, N104). */
export const TEXTES_DU_PREREGLAGE = {
  libelle: 'Nombre de nuances',
  option: (nombre: number) => `${nombre} nuances`,
  importee: 'Liste importée : aucun préréglage ne la reconnaît.',
  appliquer: (nombre: number) => `Passer à ${nombre} nuances`,
  annuler: 'Annuler',
  rolesGardes: 'Les rôles gardent leurs numéros.',
} as const;

/** Une liste de numéros en mots : « 1000 et 1050 », « 400, 950 et 1000 ». */
function numerosEcrits(numeros: readonly number[]): string {
  return numeros.length < 2 ? numeros.join('') : `${numeros.slice(0, -1).join(', ')} et ${numeros[numeros.length - 1]}`;
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
    effet.ajoutes.length > 0 ? `ajoute ${numerosEcrits(effet.ajoutes)}` : '',
    effet.retires.length > 0 ? `retire ${numerosEcrits(effet.retires)}` : '',
  ].filter(Boolean).join(' et ');
  const couleurs = effet.changees.length === 0
    ? 'Aucune nuance gardée ne change de couleur.'
    : `${effet.changees.length === 1 ? 'Une palette change' : `${effet.changees.length} palettes changent`} de couleur à une nuance gardée : ${effet.changees.join(', ')}.`;
  const cadres = effet.cadres === 0
    ? ''
    : effet.cadres === 1 ? ' 1 cadre passera « À actualiser ».' : ` ${effet.cadres} cadres passeront « À actualiser ».`;
  return `Passer à ${effet.nombre} nuances ${gestes}. ${TEXTES_DU_PREREGLAGE.rolesGardes} ${couleurs}${cadres}`;
}

/** La tête des Réglages communs : la palette ouverte et le thème de son aperçu (V9.3, N055). */
export function paletteDeLApercu(nom: string, mode: Mode): string {
  return `Palette ouverte : ${nom} · ${mode === 'light' ? 'Thème Light' : 'Thème Dark'}`;
}

/** La légende du tracé des courbes (V9.4, N056). */
export function legendeDesCourbes(reference: { readonly nom: string; readonly crans: { readonly [M in Mode]: number } } | null): string {
  const traits = 'Trait plein : Thème Light · tireté : Thème Dark.';
  if (!reference) return traits;
  return `${traits} ◆ : la référence de « ${reference.nom} », insérée à la nuance ${reference.crans.light} en Thème Light et ${reference.crans.dark} en Thème Dark, à sa propre luminosité.`;
}

/** Le résumé replié de la carte « Minimums des promesses » (V9.2, N057). */
export function resumeDesMinimums(texte: number, nonTexte: number): string {
  return `Texte ${nombreEcrit(texte)}:1 · Éléments graphiques ${nombreEcrit(nonTexte)}:1`;
}

/** Le résumé replié de la carte « Détection des couleurs proches » (V9.2, N057). */
export function resumeDesEcarts(profilsConfondus: number, palettesProches: number): string {
  return `Soft et Vivid ${nombreEcrit(profilsConfondus)} · Deux palettes ${nombreEcrit(palettesProches)}`;
}

/** Le nom accessible de « Rétablir », qui nomme la carte (V9.5, N058). */
export function retablirLaCarte(titre: string): string {
  return `Rétablir les valeurs par défaut : ${titre}`;
}

/** La portée d'un groupe de réglages, avant toute saisie ([ENT-07]). */
export function palettesConcernees(nombre: number): string {
  if (nombre === 0) return 'Aucune palette concernée';
  return nombre === 1 ? '1 palette concernée' : `${nombre} palettes concernées`;
}

/** Un nombre tel que les réglages l'affichent, à virgule. */
export function nombreEcrit(valeur: number): string {
  return String(valeur).replace('.', ',');
}

/** Une saisie qui n'est pas un nombre. */
export function nombreInvalide(saisie: string): string {
  return `« ${saisie} » : nombre invalide. Exemple : 0,5 ou 0.5.`;
}

/** Un contraste mesuré avec son unité : « 4,31:1 ». */
export function contrasteEcrit(valeur: number): string {
  return `${ecrireContraste(valeur)}:1`;
}

/** Un seuil de contraste : « 4,5 », « 3 ». */
const seuilEcrit = (valeur: number): string => ecrireArrondi(valeur, 1).replace(/,0$/, '');

/** La courbe qui ne tient plus la garantie des courbes ([ENT-10]). */
export function constatDeGarantie(manque: ManqueDeGarantie): Constat {
  return {
    ou: `Thème ${NOM_DU_MODE[manque.mode]}, nuance ${manque.cran}, profil ${manque.profil}`,
    quoi: `Contraste avec la nuance 50 : ${contrasteEcrit(manque.contraste)}, minimum ${seuilEcrit(manque.seuil)}:1. Teinte : ${manque.teinte}°.`,
    geste: `Éloignez la luminosité de la nuance ${manque.cran} de celle de la nuance 50.`,
  };
}

/** Les réglages propres à une palette (section 8.1, [ENT-09]). */
export const TEXTES_AVANCES = {
  avance: 'Réglages de cette palette',
  reprendre: "Reprendre les intensités communes",
} as const;

/** Les intensités sous le nuancier (section 8.1). */
export const TEXTES_DES_INTENSITES = {
  libelle: (profil: string) => `Intensité ${profil}`,
  repere: (part: string) => `Intensité de la couleur de référence : ${part}`,
  detailDeLaReference: 'Intensité de la couleur de référence',
} as const;

/**
 * D'où viennent les saturations d'une palette, quand une ligne le dit : ses
 * parts propres, ou un gris pur (T4). Sans l'un ni l'autre, aucune ligne (T3).
 */
export function origineDesParts(propres: boolean, grise: boolean): string | null {
  if (propres) return 'Intensités personnalisées : les intensités communes ne s’appliquent plus.';
  if (grise) return 'Référence grise : Soft et Vivid restent gris.';
  return null;
}

/**
 * Le choix du profil qui porte la référence exacte d'une palette à deux
 * intensités, dans la carte « Deux intensités » (N028, N029, [ENT-11], Y2.6).
 */
export const TEXTES_DE_LA_BASE = {
  libelle: 'Référence exacte dans',
  auto: 'Auto',
  choixAutomatique: (profil: Profil) => `Auto a choisi ${NOM_DU_PROFIL[profil]}`,
  choixAVenir: (profil: Profil) => `Auto choisira ${NOM_DU_PROFIL[profil]}`,
} as const;

/** Les textes de la carte « Réglage global ». */
export const TEXTES_DES_REGLAGES = {
  titre: 'Réglage global',
  sousTitre: "Teinte, saturation et luminosité de la palette",
  regler: 'Régler',
  cible: 'Profil à régler',
  lesDeux: 'Les deux',
  deuxProfils: 'Soft et Vivid',
  grandeurs: { teinte: 'Teinte', saturation: 'Saturation', luminosite: 'Luminosité' },
  retablir: 'Rétablir',
  retablirLa: (grandeur: string) => `Rétablir la ${grandeur.toLowerCase()}`,
  etiquette: (grandeur: string, profil: string) => `${grandeur} de ${profil}`,
  avertissementAvant: "Ce réglage modifiera votre couleur de référence.",
  avertissementApres: "Votre couleur de référence a été modifiée.",
  neutre: "Couleur de référence inchangée.",
  grise: "Palette grise : aucune teinte à régler.",
  porteurFige: (profil: Profil) => `Référence dans ${NOM_DU_PROFIL[profil]}. Changer de profil modifiera sa couleur.`,
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
  return `${Math.round(valeur * 100)} %`;
}

/**
 * Le résumé de la carte repliée (N146, recette v7) : son état seul, sans les
 * valeurs réglées, puis les points à vérifier.
 */
export function resumeDesReglages(modifie: boolean, points: number): string {
  return `${modifie ? 'Réglé' : 'Aucun réglage'}${pointsAVerifier(points)}`;
}

/** Le choix des intensités d'une palette, en deux cartes ([ENT-14], maquettes Y2.1 et Y2.6). */
export const TEXTES_DES_INTENSITES_DE_PALETTE = {
  libelle: 'Intensités',
  // Le titre nomme la carte de la création, le segment celui de la configuration (N131).
  une: { titre: 'Une intensité', segment: 'Une', texte: 'Une seule variante, à l’intensité de la couleur de référence.' },
  deux: { titre: 'Deux intensités', segment: 'Deux', texte: 'Une variante douce « Soft » et une variante vive « Vivid ».' },
  partDeLaReference: (part: string) => `Intensité : ${part}`,
} as const;

/** Le choix du modèle et les numéros d'une palette libre (W6.5, maquette W3.5, N103). */
export const TEXTES_DU_MODELE = {
  libelle: 'Modèle',
  modele: 'Standard',
  libre: 'Libre',
  aideLibre: 'Sans rôles ni garanties',
  nuances: (nombre: number) => `Nuances · ${nombre} sur 13 au plus`,
  puce: (numero: number) => `Nuance ${numero}`,
} as const;

/** Les libellés de la carte « Color shift » (section 12). */
export const TEXTES_DE_LA_DERIVE = {
  aide: "Plus une nuance est loin de la référence, plus l’effet est fort. Les zones hachurées dépassent les limites de contraste ou de luminosité.",
  grise: "Palette grise : seule la luminosité se règle.",
  sansSegmentClair: "Aucune nuance plus claire que la référence. Réglez les nuances sombres.",
  sansSegmentSombre: "Aucune nuance plus sombre que la référence. Réglez les nuances claires.",
  grandeurs: { teinte: 'Teinte', saturation: 'Saturation', clarte: 'Luminosité' },
  onglets: 'Grandeur réglée',
  prereglage: 'Préréglage de la teinte',
  tailwind: 'Teinte Tailwind',
  constante: 'Teinte constante',
  libre: 'Personnalisé',
  lien: 'Synchroniser Soft et Vivid',
  profilRegle: 'Profil à modifier',
  aligner: 'Aligner',
  annuler: 'Annuler',
  confirmationDuLien: "Remplacer le Color shift de Soft par celui de Vivid ? Teinte, saturation et luminosité seront copiées.",
  toutRetablir: 'Tout rétablir',
  boutonTailwind: 'Tailwind',
  retablir: 'Rétablir',
  bout: { clair: 'Nuances claires', sombre: 'Nuances sombres' },
  rampeSans: 'sans',
  rampeAvec: 'avec',
  titreDeLaRampeSans: 'Rampe sans Color shift',
  titreDeLaRampeAvec: 'Rampe avec Color shift',
} as const;

/** Un décalage du Color shift, signé : « −7,5° », « −40 % », « +0,020 ». */
export function decalageEcrit(grandeur: GrandeurDuColorShift, valeur: number): string {
  if (grandeur === 'teinte') return angleEcrit(valeur);
  const signe = valeur > 0 ? '+' : valeur < 0 ? '−' : '';
  return grandeur === 'saturation' ? `${signe}${Math.round(Math.abs(valeur) * 100)} %` : `${signe}${ecrireArrondi(Math.abs(valeur), 3)}`;
}

/** Une grandeur à un bout, nom d'un curseur, d'un champ et d'une poignée : « Teinte, nuances claires ». */
export function grandeurAuBout(grandeur: GrandeurDuColorShift, bout: Bout): string {
  return `${TEXTES_DE_LA_DERIVE.grandeurs[grandeur]}, ${TEXTES_DE_LA_DERIVE.bout[bout].toLowerCase()}`;
}

/** Le bouton d'un bout ([DER-09]) : la teinte Tailwind, ou zéro pour la saturation et la luminosité. */
export function retablirAuBout(grandeur: GrandeurDuColorShift, bout: Bout): string {
  const nuances = TEXTES_DE_LA_DERIVE.bout[bout].toLowerCase();
  return grandeur === 'teinte' ? `Ramener la teinte Tailwind des ${nuances}` : `Rétablir la ${TEXTES_DE_LA_DERIVE.grandeurs[grandeur].toLowerCase()} des ${nuances}`;
}

/** Une plage sûre : « −0,050 à +0,040 ». */
const plageEcrite = (grandeur: GrandeurDuColorShift, bas: number, haut: number): string => `${decalageEcrit(grandeur, bas)} à ${decalageEcrit(grandeur, haut)}`;

/**
 * Ce qu'une poignée ou une réglette annonce ([DER-09]) : la valeur, la teinte
 * absolue pour la teinte, puis la plage sûre quand elle est calculée.
 */
export function valeurDePoignee(grandeur: GrandeurDuColorShift, valeur: number, teinte: number, plage: { readonly bas: number; readonly haut: number } | null): string {
  const lue = grandeur === 'teinte' ? `Décalage de ${angleEcrit(valeur)}, teinte obtenue : ${Math.round(teinte) % 360}°` : decalageEcrit(grandeur, valeur);
  return plage ? `${lue}. Plage sûre de ${plageEcrite(grandeur, plage.bas, plage.haut)}` : lue;
}

/** La ligne de la plage sûre ([DER-22]) : « Plage sûre · nuances claires −0,050 à +0,040 · nuances sombres −0,150 à +0,055 ». */
export function plageSure(grandeur: GrandeurDuColorShift, plages: readonly { readonly bout: Bout; readonly bas: number; readonly haut: number }[]): string {
  return ['Plage sûre', ...plages.map(({ bout, bas, haut }) => `${TEXTES_DE_LA_DERIVE.bout[bout].toLowerCase()} ${plageEcrite(grandeur, bas, haut)}`)].join(' · ');
}

/** Un membre d'une paire jugée, tel que la butée le nomme : « text 700 », « fond ». */
function membreEcrit(membre: MembrePaire, designation: { readonly nature: 'cran'; readonly cran: number } | { readonly nature: 'fond' }): string {
  if ('fond' in membre) return 'fond';
  return designation.nature === 'cran' ? `${membre.emploi} ${designation.cran}` : membre.emploi;
}

/** Ce qui arrête une borne, un pas au-delà ([DER-22]). */
function auDela(cause: CauseDeLaBorne): string {
  if (cause.nature === 'ordre') return 'Au-delà, l’écart de luminosité entre deux nuances serait inférieur à 0,01.';
  const { promesse } = cause;
  const ou = promesse.profil === 'unique' ? NOM_DU_MODE[promesse.mode] : `${NOM_DU_PROFIL[promesse.profil]}, ${NOM_DU_MODE[promesse.mode]}`;
  const paire = `${membreEcrit(promesse.paire.premier, promesse.premier)} / ${membreEcrit(promesse.paire.second, promesse.second)}`;
  return `Au-delà, ${paire} (${ou}) tomberait à ${contrasteEcrit(promesse.contraste)}, sous ${seuilEcrit(promesse.seuil)}:1.`;
}

/** La butée d'un bout ([DER-22]) : « Luminosité, nuances claires : limite atteinte à −0,050. Au-delà, … ». */
export function buteeDuColorShift(grandeur: GrandeurDuColorShift, bout: Bout, borne: number, cause: CauseDeLaBorne): string {
  return `${grandeurAuBout(grandeur, bout)} : limite atteinte à ${decalageEcrit(grandeur, borne)}. ${auDela(cause)}`;
}

/** Un bout dont la valeur rangée est sortie de sa plage sûre ([DER-23]). */
export function horsDeLaPlage(bout: Bout): string {
  return `${TEXTES_DE_LA_DERIVE.bout[bout]} : valeur hors limites après un autre réglage. Ramenez-la dans la plage sûre.`;
}

/** La ligne de la plage sûre du réglage global : « Plage sûre · teinte −30° à +12° · luminosité −0,05 à +0,02 ». */
export function plageSureDuReglage(plages: readonly { readonly grandeur: string; readonly bas: string; readonly haut: string }[]): string {
  return ['Plage sûre', ...plages.map(({ grandeur, bas, haut }) => `${grandeur.toLowerCase()} ${bas} à ${haut}`)].join(' · ');
}

/** La butée d'un curseur du réglage global : « Luminosité de Soft : limite atteinte à −0,03. Au-delà, … ». */
export function buteeDuReglage(etiquette: string, borne: string, cause: CauseDeLaBorne): string {
  return `${etiquette} : limite atteinte à ${borne}. ${auDela(cause)}`;
}

/** Le repère Tailwind d'une réglette ([DER-06]). */
export function repereTailwind(angle: number): string {
  return `Décalage Tailwind : ${angleEcrit(angle)}`;
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
  return grandeur === 'saturation' ? `${signe}${Math.round(Math.abs(valeur) * 100)} %` : `${signe}${nombreEcrit(Math.round(Math.abs(valeur) * 1000) / 1000)}`;
}

/** L'étiquette d'une poignée ([DER-03]) : la valeur signée, et la teinte absolue pour la teinte. */
export function etiquetteDePoignee(grandeur: GrandeurDuColorShift, valeur: number, teinte: number): string {
  return grandeur === 'teinte' ? `Décalage ${angleEcrit(valeur)} · teinte ${Math.round(teinte) % 360}°` : decalageEcrit(grandeur, valeur);
}

/** L'infobulle du pivot ([DER-02]) : la teinte de la référence, et la nuance qui la porte dans chaque thème. */
export function infobulleDuPivot(teinte: number, ancrage: Ancrage): string {
  const nuances = `${ancrage.crans.light} en Thème Light, ${ancrage.crans.dark} en Thème Dark`;
  return `Couleur de référence : teinte ${Math.round(teinte) % 360}°. ${ancrage.profil === 'unique' ? `Nuance ${nuances}` : `${NOM_DU_PROFIL[ancrage.profil]} · nuance ${nuances}`}.`;
}

/** Le nom d'une copie de palette. */
export function nomDeLaCopie(nom: string): string {
  return `Copie de ${nom}`;
}

/** Un hexa que le champ refuse : il le dit sous le champ, l'aperçu ne change pas. */
export function hexaInvalide(saisie: string): string {
  return `« ${saisie} » : code hexadécimal invalide. Exemple : #1E6FD9.`;
}

/** La confirmation d'une suppression ([ENT-03]). */
export function confirmationDeSuppression(nom: string): string {
  return `Supprimer « ${nom} » du plugin ? Son cadre Figma restera, sans mise à jour.`;
}

/**
 * Le refus d'un enregistrement : les palettes et réglages enregistrés ont
 * changé depuis leur lecture ([REC-10]). Le plugin ne sait pas qui les a
 * changés.
 */
export function recetteModifieeAilleurs(): Constat {
  return {
    ou: 'Modifications non enregistrées',
    quoi: 'Les palettes ou réglages du fichier ont changé. Votre dernière modification n’est pas enregistrée.',
    geste: 'Exportez vos modifications pour les garder, puis rechargez les palettes.',
  };
}

/** Un enregistrement que le sandbox refuse pour une recette invalide : l'interface en est la cause. */
export function rangementInvalide(refus: readonly Refus[]): Constat {
  return {
    ou: 'Échec de l’enregistrement',
    quoi: refus.length > 0
      ? `Le plugin n’a pas pu enregistrer votre modification. Détail : ${texteDuRefus(refus[0])}`
      : 'Le plugin n’a pas pu enregistrer votre modification.',
    geste: 'Rechargez les palettes, puis refaites votre modification.',
  };
}

/** Le nom qu'une palette affiche : son nom, ou son hexa de référence. */
export function nomDeLaPalette(palette: Palette): string {
  return palette.nom?.trim() ? palette.nom : palette.reference;
}

/** Le verdict d'une palette ([VER-07]) : « Prête » quand tout est respecté, sinon le nombre à corriger. */
export function verdict(manquees: number): string {
  if (manquees === 0) return TEXTES.prete;
  return manquees === 1 ? '1 contraste à corriger' : `${manquees} contrastes à corriger`;
}

/** Le bilan des promesses respectées sur le total évalué ([VER-07], [PLA-07]). */
export function bilanDesPromesses(respectees: number, total: number): string {
  return `${respectees}/${total} garanties tenues`;
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
  return `Référence : ${avecLeNom(ancrage.profil, `nuance ${ancrage.crans[mode]}`)}`;
}

/** Le nombre de points à vérifier qu'une carte repliée annonce ([UI-12]). */
function pointsAVerifier(nombre: number): string {
  if (nombre === 0) return '';
  return nombre === 1 ? ' · 1 point à vérifier' : ` · ${nombre} points à vérifier`;
}

/**
 * Le résumé de la carte Color shift ([UI-12], recette v7) : son état seul,
 * sans les valeurs réglées, la synchronisation des deux intensités, puis les
 * points à vérifier. `lien` vaut `null` à une intensité : rien à synchroniser
 * ([ENT-14]).
 */
export function resumeDeLaDerive(modifie: boolean, lien: boolean | null, points: number): string {
  const etat = modifie ? 'Réglé' : 'Aucun réglage';
  return `${lien === null ? etat : `${etat} · ${lien ? 'synchronisé' : 'désynchronisé'}`}${pointsAVerifier(points)}`;
}

/** Le nom français d'un rôle, sous son nom en police de code (N030) ; la clé reste celle des données. */
export const NOM_DU_ROLE: Record<Emploi, string> = {
  solid: 'fond plein',
  'on-solid': 'texte sur fond plein',
  text: 'texte coloré',
  surface: 'fond léger',
  'surface-card': 'fond de carte',
  'border-control': 'bordure de champ',
  'border-decorative': 'séparateur',
  focus: 'anneau de focus',
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
  const nom = profil === 'unique' ? 'Garanties' : NOM_DU_PROFIL[profil];
  return manquees === 0 ? `${nom} ✓` : `${nom} ✗ ${manquees}`;
}

/** Le même résultat, pour l'assistance technique ([UI-09]). */
export function resultatDuProfilEnMots(profil: Intensite, manquees: number): string {
  const verdict = manquees === 0
    ? 'toutes les garanties sont respectées'
    : manquees === 1 ? '1 garantie manquée' : `${manquees} garanties manquées`;
  return profil === 'unique' ? `${verdict[0].toUpperCase()}${verdict.slice(1)}` : `${NOM_DU_PROFIL[profil]} : ${verdict}`;
}

/** Les textes de la carte « Garanties de contraste » ([UI-09], N031 à N038). */
export const TEXTES_DES_GARANTIES = {
  theme: (mode: Mode) => `Thème ${NOM_DU_MODE[mode]}`,
  profils: 'Profil des garanties',
  textes: 'Textes lisibles',
  visibles: 'Éléments visibles',
  minimum: (seuil: number) => `minimum ${seuilEcrit(seuil)}:1`,
  sur: 'sur',
  fond: 'fond',
  legende: "Trait plein : default · tireté : hover · pointillé : active · tiret-point : active-hover. À chaque état, le texte et le fond passent à la nuance suivante.",
  onSolid: "on-solid utilise la couleur du fond de page (neutral.50).",
  decoratif: (numero: number) => `${numero} · séparateur, sans minimum de contraste`,
  specimenBouton: 'Bouton',
  specimenTexte: 'Texte',
  autreTheme: (mode: Mode, nombre: number) => (nombre === 1
    ? `Thème ${NOM_DU_MODE[mode]} : 1 garantie manquée`
    : `Thème ${NOM_DU_MODE[mode]} : ${nombre} garanties manquées`),
  voirLeTheme: (mode: Mode) => `Voir le thème ${NOM_DU_MODE[mode]}`,
  echec: (etat: EtatDePaire, contraste: number, seuil: number) =>
    `État ${NOM_DE_L_ETAT[etat]} : ${contrasteEcrit(contraste)} pour un minimum de ${seuilEcrit(seuil)}:1`,
  numeros: (premier: string, second: string) => `${premier} / ${second}`,
  resultat: (tenue: boolean, contraste: number) => `${tenue ? '✓' : '✗'} ${ecrireContraste(contraste)}`,
} as const;

/** Les textes du détail d'une nuance ([UI-10], N039). */
export const TEXTES_DU_DETAIL = {
  titre: (profil: Intensite, numero: number) => (profil === 'unique' ? `Nuance ${numero}` : `${NOM_DU_PROFIL[profil]} · ${numero}`),
  reference: '◆ Votre couleur de référence exacte',
  sertA: 'Sert à',
  // Une nuance qu'aucun rôle ne vise ; « libre » désigne une palette sortie du modèle (N102).
  sansRole: 'Sans rôle',
  aucunRole: "Aucun usage prédéfini pour cette nuance.",
  contrastes: 'Contrastes de la nuance',
  fondDuTheme: 'Fond du thème',
  blanc: 'Blanc',
  noir: 'Noir',
  oklch: 'OKLCH',
  titreDuFond: 'on-solid · fond du thème',
  fondDePage: (debut: number, fin: number) => `Fond de page du thème, neutral.50 du design system. Il se pose en texte sur solid ${debut} à ${fin}.`,
  garantie: (tenue: boolean, sens: string, contraste: number) => `${tenue ? '✓' : '✗'} ${sens} : ${contrasteEcrit(contraste)}`,
  sur: (partenaire: string) => `sur ${partenaire}`,
  dessus: (partenaire: string) => `${partenaire} dessus`,
} as const;

/** Les textes du sélecteur de couleur embarqué (W4.1) ; N087 à N090. */
export const TEXTES_DU_SELECTEUR = {
  // N087 : les deux commandes graphiques, et leur valeur lue.
  zone: 'Saturation et luminosité',
  valeurDeLaZone: (saturation: number, luminosite: number) => `Saturation ${saturation} %, luminosité ${luminosite} %`,
  teinte: 'Teinte',
  valeurDeLaTeinte: (degres: number) => `${degres}°`,
  // N088 : le menu de format et les champs du code.
  format: 'Format du code',
  formats: { hex: 'Hex', rgb: 'RGB', hsl: 'HSL' },
  champs: {
    hex: ['Code hexadécimal'],
    rgb: ['Rouge, de 0 à 255', 'Vert, de 0 à 255', 'Bleu, de 0 à 255'],
    hsl: ['Teinte, en degrés', 'Saturation, en %', 'Luminosité, en %'],
  },
  // N089 : le titre des pastilles proposées.
  nuancesDeLaPalette: 'Nuances de la palette ouverte',
  fondsProposes: 'Fonds par défaut et premières nuances',
  // N090 : le nom de chaque pastille proposée.
  fondParDefaut: (mode: Mode) => `Fond ${NOM_DU_MODE[mode]} par défaut`,
  blanc: 'Blanc',
  nuance: (profil: string, numero: number) => `${profil} ${numero}`,
  // N114 : les deux onglets du sélecteur de la couleur de référence (X2.7, R3).
  pastille: (titre: string, hexa: string) => `${titre}, ${hexa}`,
} as const;

/** Les textes du nuancier et de son détail ([UI-04]). */
export const TEXTES_DU_NUANCIER = {
  fond: 'Fond',
  // N081, N082 : le fond est un réglage commun, que la pastille ouvre.
  fondCommun: 'Ce fond s’applique à toutes les palettes.',
  modifierLeFond: (mode: Mode, hexa: string) => `Modifier le fond du thème ${NOM_DU_MODE[mode]}, actuellement ${hexa}`,
  reference: 'Référence',
  copier: 'Copier le code',
  copie: 'Code copié',
  etiquetteDeNuance: (profil: Intensite, numero: number, hexa: string) => (profil === 'unique'
    ? `Nuance ${numero}, couleur ${hexa}`
    : `Profil ${NOM_DU_PROFIL[profil]}, nuance ${numero}, couleur ${hexa}`),
  memeCouleur: (numero: number) => `Même couleur que la nuance ${numero}.`,
  tresProche: (profil: string) => `Très proche de ${profil}`,
  oklch: (L: number, C: number, H: number) => `L ${ecrireArrondi(L, 3)} · C ${ecrireArrondi(C, 3)} · H ${Math.round(H) % 360}°`,
  revenirAuTheme: (mode: Mode) => `Revenir au thème ${NOM_DU_MODE[mode]}`,
  fondCourt: 'fond',
  etiquetteDuFond: (hexa: string) => `on-solid, fond du thème, couleur ${hexa}`,
} as const;

const ETATS_DU_DECALAGE = ['', ', état hover', ', état active', ', état active-hover'];

/** Un emploi et son état : « Texte coloré (text), état hover ». */
export function emploiEcrit({ emploi, decalage }: EmploiDUnCran): string {
  return `${NOM_DE_L_EMPLOI[emploi]}${ETATS_DU_DECALAGE[decalage] ?? ` (décalage de ${decalage} nuances)`}`;
}

function membre(membrePaire: MembrePaire): string {
  return 'fond' in membrePaire ? 'fond de page' : emploiEcrit(membrePaire);
}

/** Une association et son état : « Texte coloré (text) sur Fond léger (surface), état hover ». */
export function associationEcrite(association: Association, etat: EtatDePaire): string {
  const second = association.second === 'fond' ? 'fond de page' : NOM_DE_L_EMPLOI[association.second];
  return `${NOM_DE_L_EMPLOI[association.premier]} sur ${second}${ETATS_DU_DECALAGE[etat]}`;
}

/** Ce qu'un badge de niveau juge ([VER-13]) : un texte courant, un grand texte ou un élément graphique. */
export type Jugement = 'texte' | 'grandTexte' | 'graphique';

const NOM_DU_JUGEMENT: Record<Jugement, string> = {
  texte: 'Texte courant',
  grandTexte: 'Grand texte',
  graphique: 'Éléments graphiques',
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
  if (niveau === 'AAA') return { ecrit: 'AAA', etiquette: `${nom} : AAA atteint`, atteint: true };
  if (niveau === 'AA') {
    const suite = jugement === 'graphique' ? '' : ', AAA non atteint';
    return { ecrit: 'AA', etiquette: `${nom} : AA atteint${suite}`, atteint: true };
  }
  return { ecrit: 'AA ✗', etiquette: `${nom} : AA non atteint`, atteint: false };
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
    const mesure = `${contrasteEcrit(promesse.contraste)} · ${promesse.verdict === 'tenue' ? 'Respectée' : 'À corriger'}`;
    return promesse.profil === 'unique' ? mesure : `${NOM_DU_PROFIL[promesse.profil]} : ${mesure}`;
  };
  return {
    ou: `${associationEcrite(groupe.association, groupe.etat)} · ${nom}, thème ${NOM_DU_MODE[groupe.mode]}`,
    quoi: `Contraste insuffisant. Minimum : ${seuilEcrit(groupe.seuil)}:1.`,
    geste: 'Modifiez le réglage global ou le Color shift, puis vérifiez le contraste.',
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
        ou: `${contexte.nomDe(alerte.palette)} : nuances ${crans}`,
        quoi: 'Soft et Vivid sont presque identiques sur ces nuances.',
        geste: 'Écartez les saturations de Soft et Vivid dans « Réglage global ».',
        mesures: [`Écart le plus faible : ${ecrireArrondi(plusProche, 3)} ΔEok, pour un minimum de ${ecrireArrondi(alerte.seuil, 2)} ΔEok`],
      };
    }
    case 'palettes-proches':
      return {
        ou: `Palettes à comparer : ${contexte.nomDe(alerte.palettes[0])} et ${contexte.nomDe(alerte.palettes[1])}`,
        quoi: 'Les nuances 500, 600 et 700 de ces palettes sont très proches en Light.',
        geste: 'Changez une couleur de référence ou supprimez la palette en double.',
        mesures: [`Écart moyen : ${ecrireArrondi(alerte.distance, 3)} ΔEok, pour un minimum de ${ecrireArrondi(alerte.seuil, 2)} ΔEok`],
      };
    case 'reference-plus-terne':
      return {
        ou: `${contexte.nomDe(alerte.palette)} : couleur de référence ${referenceLue(contexte, alerte.palette)}`,
        quoi: `La référence est moins vive que Soft. Intensité : ${ecrireArrondi(alerte.part, 2)}, contre ${ecrireArrondi(alerte.partSoft, 2)}.`,
        geste: 'Baissez la saturation dans « Réglage global » pour vous rapprocher de la référence.',
      };
    case 'reference-plus-vive':
      return {
        ou: `${contexte.nomDe(alerte.palette)} : couleur de référence ${referenceLue(contexte, alerte.palette)}`,
        quoi: `La référence est plus vive que Vivid. Intensité : ${ecrireArrondi(alerte.part, 2)}, contre ${ecrireArrondi(alerte.partVivid, 2)}.`,
        geste: 'Augmentez la saturation de Vivid dans « Réglage global » pour vous rapprocher de la référence.',
      };
    case 'fond-hors-courbe': {
      const sens = alerte.mode === 'light' ? 'plus sombre' : 'plus clair';
      return {
        ou: `Fond du thème ${NOM_DU_MODE[alerte.mode]} : ${contexte.recette.fonds[alerte.mode]}`,
        quoi: `Ce fond est ${sens} que la nuance 50. Luminosité : ${ecrireArrondi(alerte.clarte, 3)}, contre ${ecrireArrondi(alerte.cran, 3)}.`,
        geste: 'Vérifiez les garanties. Si elles échouent, rapprochez le fond de la nuance 50 dans les réglages communs.',
      };
    }
  }
}

/** Le nombre de palettes que le fichier porte. */
export function palettesDuFichier(nombre: number): string {
  if (nombre === 0) return 'Ce fichier ne contient aucune palette.';
  return nombre === 1 ? 'Ce fichier contient 1 palette.' : `Ce fichier contient ${nombre} palettes.`;
}

/** Un message en trois parties. */
export interface Constat {
  readonly ou: string;
  readonly quoi: string;
  readonly geste: string;
}

/** Un nombre écrit à la française : virgule décimale. */
function nombre(valeur: string | number | undefined): string {
  return typeof valeur === 'number' ? String(valeur).replace('.', ',') : String(valeur ?? '');
}

const rangEcrit = (rang: number): string => (rang === 0 ? '1re' : `${rang + 1}e`);

const MODES: Record<string, string> = { light: 'du thème Light', dark: 'du thème Dark' };
const FONDS: Record<string, string> = { light: 'Fond du thème Light', dark: 'Fond du thème Dark' };
const CLES_DE_PALETTE: Record<string, string> = {
  id: 'identifiant de la palette',
  nom: 'nom de la palette',
  reference: 'couleur de référence',
  derive: 'Color shift',
  parts: 'intensités personnalisées',
  base: 'palette de base',
  intensites: 'intensités',
  crans: 'nuances de la palette libre',
  originale: 'couleur de référence d’origine',
  clair: 'nuances claires',
  sombre: 'nuances sombres',
  saturation: 'saturation',
  clarte: 'luminosité',
  lien: 'synchronisation de Soft et Vivid',
  origine: 'origine du réglage',
};
/** Les parties d'un cadre, dans un chemin `contenuDesPlanches.…` ([PLA-28]). */
const PARTIES_DU_CONTENU: Record<string, string> = {
  note: 'note sous les rampes',
  usages: 'usages',
  grilles: 'grilles de contrastes',
  light: 'thème Light',
  dark: 'thème Dark',
};
const NOMS_DES_SEUILS: Record<string, string> = {
  texte: 'texte',
  nonTexte: 'éléments graphiques',
  profilsConfondus: 'écart minimal entre soft et vivid',
  palettesProches: 'écart minimal entre deux palettes',
};

/**
 * Le chemin d'un champ en mots du designer : `crans[3]` devient « 4e nuance »,
 * `palettes[1].derive.soft.clair` « Palette 2, Color shift, soft, teinte,
 * nuances claires ». Un chemin que la table ne connaît pas s'écrit tel quel.
 */
export function nommerChamp(chemin: string): string {
  if (chemin === '') return 'Palettes et réglages';
  let trouve = /^crans\[(\d+)\]$/.exec(chemin);
  if (trouve) return `${rangEcrit(Number(trouve[1]))} nuance`;
  trouve = /^courbes\.(light|dark)(?:\[(\d+)\])?$/.exec(chemin);
  if (trouve) return `Luminosité ${MODES[trouve[1]]}${trouve[2] ? `, ${rangEcrit(Number(trouve[2]))} nuance` : ''}`;
  trouve = /^profils\.(soft|vivid)\.part$/.exec(chemin);
  if (trouve) return `Intensité de ${trouve[1]}`;
  trouve = /^fonds\.(light|dark)$/.exec(chemin);
  if (trouve) return FONDS[trouve[1]];
  trouve = /^seuils\.(\w+)$/.exec(chemin);
  if (trouve) return `Minimum ou seuil : ${NOMS_DES_SEUILS[trouve[1]] ?? trouve[1]}`;
  trouve = /^contenuDesPlanches\.(\w+)$/.exec(chemin);
  if (trouve) return `Contenu des planches, ${PARTIES_DU_CONTENU[trouve[1]] ?? trouve[1]}`;
  trouve = /^derives\[(\d+)\]$/.exec(chemin);
  if (trouve) return `Préréglage Tailwind, gamme ${Number(trouve[1]) + 1}`;
  trouve = /^palettes\[(\d+)\]\.crans\[(\d+)\]$/.exec(chemin);
  if (trouve) return `Palette ${Number(trouve[1]) + 1}, ${rangEcrit(Number(trouve[2]))} nuance`;
  trouve = /^palettes\[(\d+)\]\.derive\.(soft|vivid)\.(clair|sombre)$/.exec(chemin);
  if (trouve) return `Palette ${Number(trouve[1]) + 1}, Color shift, ${trouve[2]}, teinte, ${CLES_DE_PALETTE[trouve[3]]}`;
  trouve = /^palettes\[(\d+)\]((?:\.\w+)*)$/.exec(chemin);
  if (trouve) {
    const suite = trouve[2].split('.').filter(Boolean).map((cle) => CLES_DE_PALETTE[cle] ?? cle);
    return [`Palette ${Number(trouve[1]) + 1}`, ...suite].join(', ');
  }
  const connus: Record<string, string> = {
    crans: 'Numéros des nuances',
    profils: 'Intensités des profils',
    gamut: 'Espace de couleur',
    formatVersion: 'Version du format de sauvegarde',
    derives: 'Préréglage Tailwind',
    intensiteDesFondsSombres: 'Fonds du thème Dark',
    contenuDesPlanches: 'Contenu des planches',
    palettes: 'Palettes',
  };
  return connus[chemin] ?? chemin;
}

/** Le texte d'un refus de validation, où et quoi sur la même ligne. */
const REFUS: Record<RegleRecette, (champ: string, valeur: string) => string> = {
  forme: (champ) => `${champ} : valeur absente ou format invalide.`,
  'cle-inconnue': (champ) => `${champ} : réglage inconnu de cette version du plugin.`,
  'crans-croissants': (_, valeur) => (valeur
    ? `Nuances : le numéro ${valeur} n’est pas valide. Utilisez des nombres entiers, sans doublon, du plus petit au plus grand.`
    : 'Ajoutez au moins deux numéros de nuance et classez-les du plus petit au plus grand.'),
  'courbes-longueur': (champ, valeur) => `${champ} : ${valeur} valeurs. Ajoutez une luminosité par nuance.`,
  'courbes-bornes': (champ, valeur) => `${champ} : ${valeur}. Saisissez une luminosité entre 0 et 1.`,
  'courbe-claire-decroissante': (champ, valeur) => `${champ} : ${valeur}. Choisissez une luminosité plus basse que la nuance précédente.`,
  'courbe-sombre-croissante': (champ, valeur) => `${champ} : ${valeur}. Choisissez une luminosité plus haute que la nuance précédente.`,
  'parts-bornes': (champ, valeur) => `${champ} : ${valeur}. Saisissez une intensité entre 0 et 1.`,
  'parts-ordre': (champ) => `${champ} : gardez une intensité Soft inférieure ou égale à Vivid.`,
  'gamut-inconnu': (_, valeur) => `L’espace de couleur « ${valeur} » n’est pas pris en charge. Utilisez sRGB.`,
  'hexa-invalide': (champ, valeur) => `${champ} : « ${valeur} » invalide. Utilisez un code hexadécimal comme #1E6FD9.`,
  'seuils-positifs': (champ, valeur) => `${champ} : ${valeur}. Saisissez un nombre supérieur à 0.`,
  'derives-nombre': (champ, valeur) => `Préréglage Tailwind : ${valeur} gammes. Il en faut au moins deux.`,
  'derives-noms': (champ, valeur) => `Préréglage Tailwind : « ${valeur} » en double. Renommez une gamme.`,
  'derives-teintes': (champ, valeur) => `${champ} : ${valeur}°. Saisissez une teinte de 0° inclus à 360° exclu.`,
  'derives-teintes-claires': (champ, valeur) => `Préréglage Tailwind : teinte claire ${valeur}° en double. Changez une des teintes.`,
  'derive-bornes': (champ, valeur) => `${champ} : ${valeur}°. Saisissez un décalage entre −90° et +90°.`,
  'derive-lien': (champ) => `${champ} : Color shift différents malgré la synchronisation. Alignez leurs valeurs ou désactivez la synchronisation.`,
  // Les trois règles du format 7 ([MOT-30]).
  'derive-saturation': (champ, valeur) => `${champ} : ${valeur}. Saisissez un décalage de saturation entre −1 et 1.`,
  'derive-clarte': (champ, valeur) => `${champ} : ${valeur}. Saisissez un décalage de luminosité entre −0,15 et 0,15.`,
  'derive-nulle': (champ) => `${champ} : deux décalages à zéro. Retirez ce champ du fichier.`,
  'origine-inconnue': (champ, valeur) => `${champ} : origine « ${valeur} » inconnue. Faites corriger ce champ dans le fichier.`,
  'identifiant-forme': (champ, valeur) => `Identifiant « ${valeur} » invalide. Utilisez p- suivi de huit caractères parmi 0–9 et a–f.`,
  'identifiants-uniques': (champ, valeur) => `Identifiant « ${valeur} » en double. Donnez un identifiant unique à chaque palette.`,
  'base-inconnue': (champ, valeur) => `${champ} : « ${valeur} » invalide. Indiquez soft ou vivid, ou retirez le champ pour le choix automatique.`,
  'crans-emplois': (champ, valeur) => `Ajoutez la nuance ${valeur}, nécessaire aux usages et aux contrastes.`,
  // N101 : les quatre règles du format 3 (W6.3, W7.2).
  'crans-libres-nombre': (champ, valeur) => `${champ} : ${valeur} nuances. Choisissez un nombre entre 4 et 13.`,
  'crans-libres-numeros': (champ, valeur) => `${champ} : « ${valeur} » n’est pas accepté. Utilisez un multiple de 50 entre 50 et 1050, plus grand que le numéro précédent.`,
  'base-libre': (champ) => `${champ} : sans effet sur une palette libre. Retirez ce champ du fichier.`,
  'originale-identique': (champ) => `${champ} : identique à la référence. Retirez ce champ du fichier.`,
  // Les quatre règles du format 4 ([ENT-14], [MOT-28], [PLA-28]).
  'intensites-valeur': (champ, valeur) => `${champ} : « ${valeur} » invalide. Indiquez 1, ou retirez ce champ pour avoir Soft et Vivid.`,
  'intensites-incompatible': (champ) => `${champ} : incompatible avec une seule intensité. Retirez base, parts et crans du fichier, puis activez la synchronisation du Color shift.`,
  'fonds-sombres-bornes': (champ, valeur) => `${champ} : ${valeur}. Saisissez une intensité entre 0 et 1.`,
  'contenu-sans-theme': (champ) => `${champ} : gardez au moins un thème, Light ou Dark.`,
  // Les huit règles du format 5 (Z10.5, N141).
  'reglages-bornes': (champ, valeur) => `${champ} : « ${valeur} » sort des bornes. La teinte va de −30° à +30°, la luminosité de −0,05 à +0,02, la saturation de 0 à 1.`,
  'reglage-nul': (champ) => `${champ} : réglage à zéro. Retirez ce champ du fichier.`,
  'reglages-intensites': (champ) => `${champ} : incompatible avec le nombre d’intensités. Retirez ce champ du fichier.`,
  'porteur-base': (champ) => `${champ} : profil déjà défini par base. Retirez ce champ du fichier.`,
  'porteur-manquant': (champ) => `${champ} : indiquez soft ou vivid pour situer la référence.`,
  'reglages-sans-originale': (champ) => `${champ} : couleur d’origine manquante. Faites corriger la sauvegarde.`,
  'depart-sans-reglage': (champ) => `${champ} : aucun réglage associé. Retirez ce champ du fichier.`,
  'depart-identique': (champ) => `${champ} : identique à la couleur d’origine. Retirez ce champ du fichier.`,
};

/** Le texte d'un refus de [REC-05]. */
export function texteDuRefus(refus: Refus): string {
  return REFUS[refus.regle](nommerChamp(refus.chemin), nombre(refus.valeur));
}

/** Le blocage d'une recette enregistrée par une version plus récente du plugin. */
export function recetteFuture(version: number): Constat {
  return {
    ou: `Sauvegarde au format ${version}`,
    quoi: `Ce plugin accepte le format ${FORMAT_RECETTE}. Cette sauvegarde plus récente bloque la génération.`,
    geste: 'Mettez UCM Palettes à jour. Exportez vos données avant tout remplacement ou toute réinitialisation.',
  };
}

/** Le nombre d'erreurs d'une validation : plusieurs erreurs peuvent porter sur le même champ. */
const erreursDeValidation = (refus: readonly Refus[]): string =>
  (refus.length === 1 ? '1 erreur de validation' : `${refus.length} erreurs de validation`);

/** Le blocage d'une recette enregistrée que la validation refuse. */
export function recetteIllisible(refus: readonly Refus[]): Constat {
  return {
    ou: 'Palettes et réglages illisibles',
    quoi: `La génération est indisponible : ${erreursDeValidation(refus)}. Première erreur : ${texteDuRefus(refus[0])}`,
    geste: 'Exportez vos données pour les garder. Importez une sauvegarde valide ou réinitialisez les palettes et les réglages.',
  };
}

/** Les gestes des palettes et réglages en fichier (section 10.1, [REC-11]). */
export const TEXTES_DE_LA_RECETTE = {
  exporter: 'Exporter les palettes et les réglages',
  importer: 'Importer les palettes et les réglages',
  repartir: 'Réinitialiser les palettes et les réglages',
  exporterLeRapport: 'Exporter le rapport de vérification',
  confirmerLImport: 'Remplacer par cette sauvegarde',
  confirmerLeDepart: 'Réinitialiser',
  annuler: 'Annuler',
  sansEcart: "Palettes et réglages identiques.",
  importSansDessin: "L’import remplace les palettes et les réglages. Les cadres Figma restent inchangés.",
  confirmationDuDepart: "Toutes les palettes seront retirées du plugin et les réglages réinitialisés. Exportez-les d’abord pour les garder.",
  titre: 'Palettes et réglages',
} as const;

/** Le titre de la confirmation d'un import ([REC-08]). */
export function titreDeLImport(fichier: string): string {
  return `Remplacer les palettes et les réglages par « ${fichier} » ?`;
}

/** Une ligne de l'écart d'import : des palettes par leur nom, ou des réglages communs. */
export function ligneDEcart(genre: 'ajoutees' | 'retirees' | 'modifiees' | 'parametres', noms: readonly string[]): string {
  const titres = {
    ajoutees: noms.length === 1 ? 'Palette à ajouter' : 'Palettes à ajouter',
    retirees: noms.length === 1 ? 'Palette à retirer' : 'Palettes à retirer',
    modifiees: noms.length === 1 ? 'Palette à modifier' : 'Palettes à modifier',
    parametres: noms.length === 1 ? 'Réglage commun à modifier' : 'Réglages communs à modifier',
  };
  return `${titres[genre]} : ${noms.join(', ')}.`;
}

/** Le nom d'un réglage commun dans l'écart d'import. */
export const NOMS_DES_PARAMETRES = {
  crans: 'numéros des nuances',
  courbes: 'luminosité des nuances',
  profils: 'intensités des couleurs',
  fonds: 'couleurs de fond pour les contrastes',
  seuils: 'minimums et seuils de détection',
  derives: 'préréglage Tailwind',
  gamut: 'espace de couleur',
  intensiteDesFondsSombres: 'fonds du thème Dark',
  contenuDesPlanches: 'contenu des planches',
} as const;

/** Le nom d'un seuil dans l'écart d'import, plutôt que « minimums et seuils de détection » d'un bloc (V12.2, N072). */
export const SEUILS_DE_L_IMPORT: Record<keyof Recette['seuils'], string> = {
  texte: 'minimum des textes',
  nonTexte: 'minimum des éléments visibles',
  profilsConfondus: 'écart minimal entre Soft et Vivid',
  palettesProches: 'écart minimal entre deux palettes',
};

const NOMS_DES_CHAMPS: Record<ChampDePalette, string> = {
  nom: 'nom',
  reference: 'couleur de référence',
  intensites: 'nombre d’intensités',
  base: 'palette de base',
  parts: 'intensités propres',
  deriveTeinte: 'Color shift, teinte',
  deriveSaturation: 'Color shift, saturation',
  deriveClarte: 'Color shift, luminosité',
  // N101 : les deux champs du format 3.
  crans: 'nuances de la palette libre',
  originale: 'couleur de référence d’origine',
  // N142 : le champ du format 5.
  reglages: 'teinte, saturation et luminosité',
};

/** Les valeurs modifiées de chaque palette, palette de base comprise (V12.2, N072). */
export function ligneDesValeurs(palettes: readonly { readonly nom: string; readonly champs: readonly ChampDePalette[] }[]): string {
  const titre = palettes.length === 1 ? 'Palette à modifier' : 'Palettes à modifier';
  return `${titre} : ${palettes.map(({ nom, champs }) => `${nom} (${champs.map((champ) => NOMS_DES_CHAMPS[champ]).join(', ')})`).join(' ; ')}.`;
}

/** Ce que l'import change, par nature : couleurs, minimums, signalements (V12.2, N073). */
export function lignesDeNature(nature: { readonly couleurs: boolean; readonly minimums: boolean; readonly detection: boolean }): string[] {
  return [
    nature.couleurs ? 'Couleurs : les nuances des palettes concernées changent.' : null,
    nature.minimums ? 'Contrastes minimums : les garanties peuvent changer, les couleurs restent identiques.' : null,
    nature.detection ? 'Détection des couleurs proches : seuls les signalements peuvent changer.' : null,
  ].filter((ligne): ligne is string => ligne !== null);
}

/** Ce que l'import ferait aux cadres déjà générés (V12.2, N074). */
export function consequenceSurLaPlanche(aMettreAJour: readonly string[], orphelins: readonly string[]): string {
  if (aMettreAJour.length === 0 && orphelins.length === 0) return 'Sur la planche : aucun cadre à jour n’est touché.';
  const parties = [
    aMettreAJour.length === 0 ? null : `${aMettreAJour.length === 1 ? '1 cadre passera' : `${aMettreAJour.length} cadres passeront`} « À actualiser » (${aMettreAJour.join(', ')})`,
    orphelins.length === 0 ? null : `${orphelins.length === 1 ? '1 cadre restera' : `${orphelins.length} cadres resteront`} sans palette (${orphelins.join(', ')})`,
  ].filter((partie): partie is string => partie !== null);
  return `Sur la planche : ${parties.join(' ; ')}.`;
}

/** Un fichier importé qui ne se lit pas : la recette enregistrée reste intacte ([REC-08]). */
export function importInvalide(fichier: string, refus: readonly Refus[]): Constat {
  return {
    ou: `Import impossible : ${fichier}`,
    quoi: `Ce fichier contient ${erreursDeValidation(refus)}. Première erreur : ${texteDuRefus(refus[0])} Vos palettes et vos réglages actuels sont conservés.`,
    geste: 'Corrigez ce fichier ou importez une autre sauvegarde.',
  };
}

/** Un fichier importé d'une version que ce plugin ne lit pas. */
export function importFutur(fichier: string, version: number): Constat {
  return {
    ou: `Import impossible : ${fichier}, format ${version}`,
    quoi: `Format accepté : ${FORMAT_RECETTE}. Cette sauvegarde est plus récente. Vos palettes et réglages sont conservés.`,
    geste: 'Mettez UCM Palettes à jour, puis réimportez ce fichier.',
  };
}

/** Les libellés de la génération et de l'onglet Palettes (section 13.2). */
export const TEXTES_DU_DESSIN = {
  dessiner: 'Générer sur Figma',
  // Le premier geste d'une fiche, selon l'état du cadre ([UI-05]).
  actualiserSurFigma: 'Actualiser sur Figma',
  aJour: 'À jour',
  perimee: 'À actualiser',
  redessinerQuandMeme: 'Remplacer le cadre et son contenu',
  voirSurLaPlanche: 'Afficher dans Figma',
  reessayer: 'Réessayer',
  confirmer: 'Générer sur Figma',
  annuler: 'Annuler',
  plancheSansPalette: "Créez une palette dans l’onglet « Création », puis générez-la ici.",
  versLesPalettes: 'Créer une palette',
  // N009, N010, puis N043 à N047 ; un cadre jamais généré a sa pastille (Y2.2).
  pasEncore: 'Pas encore sur Figma',
  introuvable: 'Cadre introuvable',
  illisible: 'Lecture impossible',
  // Les deux autres gestes d'une fiche, après le premier (Y1.9).
  afficher: 'Afficher',
  modifier: 'Modifier',
  actualiser: 'Actualiser',
  chercherPartout: 'Chercher dans tout le fichier',
  palettesEtReglages: 'Palettes et réglages',
  themeDesFiches: 'Thème des fiches',
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
  return `Page « ${nom} »`;
}

/** Le nombre de palettes d'un geste global, au singulier pour une seule (Q5.5). */
function nombreDePalettes(nombre: number): string {
  return nombre === 1 ? '1 palette' : `${nombre} palettes`;
}

/** Le geste qui génère les palettes qui ne sont pas à jour (V8.4, Y1.8). */
export function genererLesPalettesPasAJour(nombre: number): string {
  return `Actualiser tout (${nombreDePalettes(nombre)})`;
}

/** Le geste qui génère toutes les palettes (V8.4, Y1.8). */
export function genererToutesLesPalettes(nombre: number): string {
  return `Générer tout (${nombreDePalettes(nombre)})`;
}

/** La ligne technique de la carte « Palettes et réglages » (V8.5, N050). */
export function detailsTechniques(empreinte: string | null, versionDuSuivi: number): string {
  return `Format des palettes et réglages : ${FORMAT_RECETTE} · empreinte : ${empreinte ?? 'aucune'} · suivi des cadres : version ${versionDuSuivi}`;
}

/** Un cadre introuvable après une recherche bornée à la page de la planche (V8.6, N051). */
export function rechercheBornee(nomDeLaPage: string | null, introuvables: readonly string[]): Constat {
  const seul = introuvables.length === 1;
  return {
    ou: seul ? `Cadre introuvable : ${citer(introuvables)}` : `Cadres introuvables : ${citer(introuvables)}`,
    quoi: `Recherche limitée à la page ${nomDeLaPage ? `« ${nomDeLaPage} »` : 'de la planche'}. Une nouvelle génération créerait ${seul ? 'un autre cadre' : 'd’autres cadres'}.`,
    geste: 'Cherchez dans tout le fichier avant de générer, pour ne pas créer de doublon.',
  };
}

/** Une génération refusée : Figma n'a pas pu lire le cadre existant d'une palette (V8.6, N052). */
export function lectureImpossible(noms: readonly string[]): Constat {
  return {
    ou: `Lecture impossible : ${citer(noms)}`,
    quoi: `Figma ne peut pas lire ${noms.length === 1 ? 'ce cadre' : 'ces cadres'}. Génération annulée pour éviter les doublons.`,
    geste: 'Actualisez l’onglet Palettes, puis relancez la génération.',
  };
}

/** Un suivi des cadres écrit par une version plus récente du plugin (V8.8, N053). */
export function suiviFutur(): Constat {
  return {
    ou: 'Planche d’une version plus récente',
    quoi: 'Ces cadres nécessitent une version plus récente du plugin. Lecture et mise à jour indisponibles.',
    geste: 'Mettez le plugin à jour pour générer les palettes.',
  };
}

/** Le nombre de palettes, en tête de l'onglet Palettes ([UI-02]). */
export function enTeteDeLaPlanche(nombre: number): string {
  if (nombre === 0) return 'Aucune palette';
  return nombre === 1 ? '1 palette' : `${nombre} palettes`;
}

/** La progression d'une génération, à la place de son bouton ([UI-05], [PLA-24]). */
export function progressionDuDessin(fait: number, total: number, nom: string): string {
  return total === 1 ? `Génération de « ${nom} »…` : `Palette ${fait + 1} sur ${total} : génération de « ${nom} »…`;
}

/** La confirmation avant de générer beaucoup de palettes ([PLA-24], D-I). */
export function confirmationDuDessin(nombre: number): string {
  return `Générer ${nombre} palettes ? Chaque palette peut ajouter plus de 1 500 calques.`;
}

/** Le blocage d'une police indisponible ([PLA-22]). */
export function policeIndisponible(style: string): Constat {
  return {
    ou: `Police indisponible : ${style}`,
    quoi: `Figma n’a pas pu charger ${style}. Aucune palette n’a été générée sur la planche.`,
    geste: 'Activez ou installez la police Inter, puis réessayez.',
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
  const conservees = creees.length === 0 ? '' : ` ; ${creees.length === 1 ? `celle de ${citer(creees)} est conservée` : `celles de ${citer(creees)} sont conservées`}`;
  const suite = creees.length === 0 && restantes.length === 0
    ? 'aucun nouveau cadre créé'
    : `cadre non créé${conservees}`;
  const attente = restantes.length === 0 ? '' : ` ${restantes.length === 1 ? `${citer(restantes)} n’a pas encore été générée` : `${citer(restantes)} n’ont pas encore été générées`}.`;
  return {
    ou: `Génération interrompue : ${nom}`,
    quoi: `La génération s’est arrêtée : ${suite}.${attente}`,
    geste: restantes.length === 0 ? 'Réessayez de générer la palette.' : 'Réessayez : la génération reprend à cette palette.',
    detail: `Détail de l’erreur : ${message}`,
  };
}

/** Une génération refusée : la recette enregistrée n'est plus celle que l'aperçu montre (E13). */
export function dessinSurUneAutreRecette(): Constat {
  return {
    ou: 'Les données du fichier ont changé',
    quoi: 'Les palettes ou réglages ont changé. Génération annulée : l’aperçu n’est plus à jour.',
    geste: 'Rechargez les palettes, puis vérifiez l’aperçu avant de générer.',
  };
}

const citer = (noms: readonly string[]): string => noms.map((nom) => `« ${nom} »`).join(', ');

/** Les calques qu'une mise à jour retirerait, à confirmer avant la génération ([PLA-03], D-H). */
export function constatDesCalquesEtrangers(nom: string, calques: readonly string[]): Constat {
  const seul = calques.length === 1;
  return {
    ou: `Contenu ajouté dans le cadre de « ${nom} »`,
    quoi: seul
      ? `La mise à jour supprimera le calque ${citer(calques)} que vous avez ajouté dans ce cadre.`
      : `La mise à jour supprimera les ${calques.length} calques que vous avez ajoutés dans ce cadre : ${citer(calques)}.`,
    geste: seul
      ? 'Sortez ce calque du cadre pour le garder, ou confirmez sa suppression.'
      : 'Sortez ces calques du cadre pour les garder, ou confirmez leur suppression.',
  };
}

/** La carte d'une palette supprimée dont le cadre reste dans Figma ([ENT-03], [PLA-27], N079, N080, N083, N084). */
export const TEXTES_DE_LA_PALETTE_SUPPRIMEE = {
  texte: 'Palette supprimée du plugin. Ce cadre ne sera plus mis à jour.',
  supprimer: 'Supprimer définitivement',
  enConflit: 'Exportez vos modifications ou rechargez les palettes avant de supprimer un cadre.',
  supprime: (nom: string) => `Cadre « ${nom} » supprimé. Ctrl+Z dans Figma le rétablit.`,
} as const;

/** Le sandbox a refusé « Supprimer définitivement » : le fichier a changé depuis la lecture ([PLA-27], N085). */
export function suppressionRefusee(nom: string): Constat {
  return {
    ou: `Cadre non supprimé : ${nom}`,
    quoi: 'Le fichier a changé depuis la dernière lecture : ce cadre n’est plus celui d’une palette supprimée.',
    geste: 'Actualisez l’onglet Palettes.',
  };
}

/** La copie d'un cadre de palette, faite par le designer ([PLA-25], E15). */
export function copieDeCadre(nom: string): Constat {
  return {
    ou: `Copie du cadre « ${nom} »`,
    quoi: 'Cette copie ne reçoit pas les mises à jour de la palette.',
    geste: 'Actualisez le cadre d’origine, puis dupliquez-le.',
  };
}

/** L'information d'un document Display P3 (section 6.7, E11). */
export function noticeDisplayP3(): Constat {
  return {
    ou: 'Fichier Figma en Display P3',
    quoi: 'La pipette lit un code Display P3, différent du code sRGB de la carte.',
    geste: 'Copiez le code hexadécimal sur la carte pour obtenir le sRGB.',
  };
}

/** Les couleurs d'une palette que la planche peint autrement que l'aperçu (L6.14). */
export function ecartDePeinture(nom: string, ecarts: readonly { readonly nom: string; readonly apercu: string | null; readonly peint: string }[]): ConstatIllustre {
  const [premier] = ecarts;
  const compte = ecarts.length === 1 ? '1 couleur ne correspond pas' : `${ecarts.length} couleurs ne correspondent pas`;
  return {
    ou: `Différence entre l’aperçu et la planche : ${nom}`,
    quoi: `${compte} à l’aperçu.`,
    geste: 'Actualisez la palette sur Figma. Si l’écart persiste, envoyez ce message au mainteneur du plugin.',
    detail: `Exemple, ${premier.nom} : ${premier.apercu ?? 'couleur absente'} dans l’aperçu, ${premier.peint} sur la planche.`,
  };
}

/** Les textes que la planche porte dans le document (section 9, récit R1 de W3.6), N093 à N099. */
export const TEXTES_DE_LA_PLANCHE = {
  // N093 : les titres des sections d'un thème ; une palette à une intensité a « La rampe », et des usages sans profil.
  rampes: 'Les deux rampes',
  rampe: 'La rampe',
  titreDesUsages: (profil: string | null) => (profil ? `Quelle nuance pour quel usage · ${profil}` : 'Quelle nuance pour quel usage'),
  contrastes: 'Contrastes, nuance par nuance',
  // N094 : chaque usage, son nom et ce qu'il habille ; l'anneau porte l'état focus.
  usages: {
    'surface-card': { titre: 'Fonds de carte', exemples: 'carte, panneau, en-tête de tableau' },
    surface: { titre: 'Fonds légers', exemples: 'bouton soft, badge, encart' },
    text: { titre: 'Textes colorés', exemples: 'lien, texte d’accent' },
    solid: { titre: 'Fonds pleins', exemples: 'bouton principal, badge plein' },
    'border-control': { titre: 'Bordures de champ', exemples: 'champ de saisie, case' },
    focus: { titre: 'Anneau de focus', exemples: 'focus clavier' },
    'border-decorative': { titre: 'Séparateurs', exemples: 'filet, bordure de carte' },
  },
  etatFocus: 'focus · état focus',
  // N095 : les libellés des spécimens ; celui de `surface` ne se lit plus comme un profil (Y2.7).
  specimens: { surface: 'Fond léger', lien: 'Lien coloré', bouton: 'Bouton', champ: 'Champ', carte: 'Carte' },
  // N096 : les repères dans une pastille, et la note des profils confondus.
  reperage: '◆',
  confondu: '≈',
  noteDuRepere: '◆ : la couleur de référence exacte.',
  noteDesConfondus: '≈ : Soft et Vivid presque identiques à cette nuance.',
  fond: 'fond',
  mode: { light: 'Thème Light', dark: 'Thème Dark' },
} as const;

/**
 * La section « Interface de test » de l'onglet Création ([UI-14]) : l'écran
 * « Membres de l'équipe », sur le modèle de Radix Themes, et la grille des
 * composants par état (N108, N113).
 */
export const TEXTES_DE_L_INTERFACE_DE_TEST = {
  titre: 'Interface de test',
  resume: (mode: Mode, profil: string | null) => (profil ? `Thème ${NOM_DU_MODE[mode]} · ${profil}` : `Thème ${NOM_DU_MODE[mode]}`),
  profil: 'Profil peint',
  vue: 'Vue de l’interface de test',
  vues: { ecran: 'Écran', etats: 'États' },
  ecran: "Écran avec les couleurs de la palette",
  etats: 'Composants de la palette, par état',
  equipe: {
    organisation: 'Studio Nord',
    navigation: ['Paramètres', 'Membres', 'Facturation', 'Intégrations'],
    titre: 'Membres de l’équipe',
    sousTitre: '4 membres · 1 invitation en attente',
    inviter: 'Inviter',
    icone: 'ⓘ',
    encart: 'L’invitation de camille@nord.studio expire dans 2 jours.',
    renvoyer: 'Renvoyer',
    membres: [
      { nom: 'Alex Martin', role: 'Administrateur', plein: true },
      { nom: 'Camille Roy', role: 'Invitée', plein: false },
      { nom: 'Inès Diallo', role: 'Membre', plein: false },
    ],
    roleParDefaut: 'Rôle par défaut',
    membre: 'Membre',
    coche: '✓',
    notifier: 'Notifier par e-mail',
    acces: 'Accès invité',
    boutons: ['Annuler', 'Brouillon', 'Enregistrer'],
  },
  composants: {
    etats: ['default', 'hover', 'active', 'focus'],
    carte: 'Carte',
    plein: 'Bouton plein',
    soft: 'Bouton soft',
    contour: 'Bouton contour',
    sansFond: 'Bouton sans fond',
    champ: 'Champ',
    lien: 'Lien',
    badge: 'Badge',
    action: 'Action',
    texte: 'Texte',
    lienColore: 'Lien coloré',
    nouveau: 'Nouveau',
    sansEtat: '—',
  },
} as const;

/** Le panneau « Ajuster la référence » et sa trace dans la configuration (W7, X7). */
export const TEXTES_DE_L_AJUSTEMENT = {
  lien: 'Ajuster la référence',
  titre: 'Ajuster la référence',
  originale: 'Originale',
  proposition: 'Proposition',
  plusSombre: 'Un pas plus sombre',
  plusClair: 'Un pas plus clair',
  code: 'Code de la proposition',
  garanties: 'Garanties',
  aucuneGarantieManquee: "Toutes les garanties sont tenues avant et après.",
  appliquer: 'Appliquer',
  annuler: 'Annuler',
  ajusteeDepuis: (hexa: string) => `Ajustée depuis ${hexa}`,
  telleQuelle: "Couleur de référence inchangée.",
  revenir: 'Revenir à l’originale',
  colonnes: { garantie: 'Garantie', theme: 'Thème', avant: 'Avant', apres: 'Après' },
  sur: 'sur',
  fond: 'fond',
} as const;

/** Un rôle dans la phrase qui dit pourquoi ajuster, avec son article (N136). */
const ROLE_DANS_LA_PHRASE: Record<Emploi, string> = {
  solid: 'les fonds pleins',
  'on-solid': 'le texte sur fond plein',
  text: 'le texte coloré',
  surface: 'les fonds légers',
  'surface-card': 'les fonds de carte',
  'border-control': 'les bordures de champ',
  'border-decorative': 'les séparateurs',
  focus: 'les anneaux de focus',
};

/**
 * La phrase en tête de la modale « Ajuster la référence » (Z5.2, rédaction a,
 * N136) : une idée par phrase, le premier rôle manqué de chaque thème, sans
 * ratio. En Light, une garantie manquée dit une couleur trop claire ; en
 * Dark, trop sombre.
 */
export function pourquoiAjuster(manques: readonly { readonly mode: Mode; readonly emploi: Emploi }[]): string {
  const phrases = manques.map(({ mode, emploi }) => `En Thème ${NOM_DU_MODE[mode]}, elle est trop ${mode === 'light' ? 'claire' : 'sombre'} pour ${ROLE_DANS_LA_PHRASE[emploi]}.`);
  return ['La palette utilise votre couleur telle quelle.', ...phrases].join(' ');
}

/**
 * Le thème et l'intensité d'une garantie de la modale (N137) : « Light ·
 * Vivid » dans la colonne Thème, « Thème Light · Vivid » en titre de groupe
 * sous 552 px.
 */
export function themeDeLaGarantie(mode: Mode, profil: Intensite, enTitre: boolean): string {
  const theme = enTitre ? `Thème ${NOM_DU_MODE[mode]}` : NOM_DU_MODE[mode];
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
  const visee = crans.light === crans.dark ? `Nuance ${crans.light} dans les deux thèmes` : `Nuance ${crans.light} en Light, ${crans.dark} en Dark`;
  const pas = voisins.map(({ sens, changements }) => `un pas ${sens < 0 ? 'plus sombre' : 'plus clair'} : ${changements.map(({ mode, numero }) => `${numero} en ${NOM_DU_MODE[mode]}`).join(', ')}`);
  return [visee, ...pas].join(' · ');
}

/**
 * La ligne sous le code d'une référence qui manque des garanties, avant
 * « Ajuster la référence » (maquette Z3.1, lien b ; N135). Des manques dans
 * les deux thèmes se comptent ensemble.
 */
export function garantiesManqueesDeLaReference(manques: { readonly [M in Mode]: number }): string {
  const total = manques.light + manques.dark;
  const themes = (['light', 'dark'] as const).filter((mode) => manques[mode] > 0).map((mode) => `en Thème ${NOM_DU_MODE[mode]}`);
  return `${total} ${total === 1 ? 'garantie manquée' : 'garanties manquées'} ${themes.join(' et ')}`;
}

/** Le bilan d'un profil avant et après la proposition : « Vivid ✗ 2 → ✓ », ou « Soft ✓ inchangé ». */
export function bilanDeLAjustement(profil: Intensite, avant: number, apres: number): string {
  const resultat = (manquees: number) => (manquees === 0 ? '✓' : `✗ ${manquees}`);
  const nom = profil === 'unique' ? 'Garanties' : NOM_DU_PROFIL[profil];
  return avant === apres
    ? `${nom} ${resultat(avant)} inchangé`
    : `${nom} ${resultat(avant)} → ${resultat(apres)}`;
}

/** Un code saisi dans la configuration remplace une référence ajustée : l'originale n'est plus gardée (section 3 de la conception). */
export function originaleRetiree(originale: string): Constat {
  return {
    ou: `Couleur d’origine retirée : ${originale}`,
    quoi: 'La nouvelle référence remplace la couleur d’origine.',
    geste: 'Pour la retrouver, faites Ctrl+Z ou saisissez-la à nouveau.',
  };
}

/** La nuance de la référence, une fois si les deux thèmes s'accordent (V10.1). */
function nuancesDeLaReference(ancrage: Ancrage): string {
  const { light, dark } = ancrage.crans;
  return light === dark ? `nuance ${light}` : `nuance ${light} en Thème Light, ${dark} en Thème Dark`;
}

/**
 * La ligne de la référence sous le nom de la palette (V10.1, N062) : elle
 * nomme le profil porteur d'une palette à deux intensités seulement ([PLA-18]).
 */
export function enTeteDeLaReference(hexa: string, ancrage: Ancrage): string {
  return `Couleur de référence ${hexa} · ${avecLeNom(ancrage.profil, nuancesDeLaReference(ancrage))}`;
}

/** L'en-tête d'un thème ([PLA-09], N098). */
export function enTeteDuTheme(mode: Mode, fond: string): string {
  return `${TEXTES_DE_LA_PLANCHE.mode[mode]} · fond ${fond}`;
}

/** Le verdict d'un thème, en tête de sa section : ses garanties manquées, chaque intensité comptée (N098). */
export function verdictDuTheme(manquees: number): string {
  if (manquees === 0) return '✓ Toutes les garanties tenues';
  return manquees === 1 ? '1 garantie manquée' : `${manquees} garanties manquées`;
}

/** La légende des grilles, en une ligne ([PLA-16], N099). */
export function legendeDesContrastes(seuils: Recette['seuils']): string {
  return `Ligne : fond · colonne : texte · gras dès ${seuilEcrit(seuils.texte)}:1 · maigre dès ${seuilEcrit(seuils.nonTexte)}:1 · effacé en dessous · AA dès 4,5:1 · AAA dès 7:1`;
}
