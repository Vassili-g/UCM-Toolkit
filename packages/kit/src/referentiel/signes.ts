/**
 * Les signes : la sorte d’objet qu’une tuile désigne, partagée par tous les plugins UCM.
 *
 * Le kit porte les données (identifiant, famille, libellé, sens, tracé, mot de repli) et ne crée aucun élément DOM.
 * Le tracé est le contenu SVG d’une grille de 16 ; il n’emploie que `path`, `rect`, `circle` et `text`.
 * Un signe repris par une autre famille n’est défini qu’une fois ; la famille qui le reprend le liste dans `REPRISES_DE_SIGNES`.
 */

export type TeinteDeFamille = 'couleurs' | 'tailles' | 'texte' | 'tokens' | 'variants' | 'regles' | 'a11y';

export const FAMILLES_DE_SIGNES = [
  { id: 'types-figma', libelle: 'Type de variable Figma', teinte: null },
  { id: 'usage-couleur', libelle: 'Usage d’une couleur', teinte: 'couleurs' },
  { id: 'usage-nombre', libelle: 'Usage d’un nombre', teinte: 'tailles' },
  { id: 'typographie', libelle: 'Typographie', teinte: 'texte' },
  { id: 'couche', libelle: 'Couche UCM, dans l’ordre de la library', teinte: 'tokens' },
  { id: 'etat-token', libelle: 'État d’un token', teinte: 'tokens' },
  { id: 'objet-figma', libelle: 'Objet de Figma', teinte: 'variants' },
  { id: 'property', libelle: 'Property de composant', teinte: 'variants' },
  { id: 'regles', libelle: 'Règles d’utilisation (.componentRules)', teinte: 'regles' },
  { id: 'proposition', libelle: 'Sorte de proposition', teinte: null },
  { id: 'accessibilite', libelle: 'Accessibilité', teinte: 'a11y' },
  { id: 'palettes', libelle: 'Palettes', teinte: 'couleurs' },
  { id: 'publication', libelle: 'Publication', teinte: null },
] as const satisfies readonly { id: string; libelle: string; teinte: TeinteDeFamille | null }[];

export type IdDeFamilleDeSignes = (typeof FAMILLES_DE_SIGNES)[number]['id'];

export interface SigneDuLangage {
  id: string;
  famille: IdDeFamilleDeSignes;
  libelle: string;
  sens: string;
  /** Contenu SVG sur une grille de 16. Vide quand la tuile porte seule la couleur. */
  trace: string;
  /** Mot d’un texte brut, là où aucun tracé ne se dessine. */
  mot: string;
}

/** Signe défini dans une autre famille, avec le libellé qu’il porte dans celle-ci. */
export interface SigneRepris {
  id: string;
  libelle: string;
}

export interface RepriseDeSigne {
  famille: IdDeFamilleDeSignes;
  reprend: readonly SigneRepris[];
}

const tx = (texte: string, taille = 9, x = 8, y = 11.4, graisse = 650): string =>
  `<text x="${x}" y="${y}" font-size="${taille}" text-anchor="middle" font-weight="${graisse}">${texte}</text>`;
const HEXA = 'M8 1.8 13.4 4.9v6.2L8 14.2 2.6 11.1V4.9z';
const DOC = '<path d="M4 1.8h5.5L12.5 4.8V14.2H4z"/><path d="M9.5 1.8v3h3"/>';
const ETOILE = 'M8 2.4 9.6 6.4 13.6 8 9.6 9.6 8 13.6 6.4 9.6 2.4 8 6.4 6.4z';
const ETOILE_PETITE = 'M8 5.2 8.8 7.2 10.8 8 8.8 8.8 8 10.8 7.2 8.8 5.2 8 7.2 7.2z';
const GOUTTE = '<path d="M8 2s4.6 4.9 4.6 7.9a4.6 4.6 0 0 1-9.2 0C3.4 6.9 8 2 8 2z"/>';
const BASCULE = '<rect x="1.5" y="4.5" width="13" height="7" rx="3.5"/><circle cx="11" cy="8" r="1.8" fill="currentColor"/>';
const TEXTE_T = '<path d="M3.5 4.5V3h9v1.5M8 3v10M6.3 13h3.4"/>';
const EMPLACEMENT = '<rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke-dasharray="2 1.6"/><path d="M8 6v4M6 8h4"/>';

/** Les couches dans l’ordre de la library : primitives en haut, components en bas. */
const pile = (etage: number): string =>
  [2, 6, 10, 14]
    .map((y, rang) =>
      rang === etage
        ? `<rect x="1.5" y="${y - 1.8}" width="13" height="3.6" rx="1" stroke="none" fill="currentColor"/>`
        : `<path d="M3 ${y}h10" stroke-width="1" opacity=".55"/>`,
    )
    .join('');

/** Le padding comme Figma le dessine : un cadre léger, les côtés concernés en trait épais. */
const CADRE_LEGER =
  '<rect x="2.5" y="2.5" width="11" height="11" rx="1" stroke-width="1" opacity=".45" stroke-dasharray="1.6 1.4"/><rect x="6.2" y="6.2" width="3.6" height="3.6" rx=".5" fill="currentColor" stroke="none" opacity=".55"/>';
const COTES = { haut: 'M2.5 2.5h11', bas: 'M2.5 13.5h11', gauche: 'M2.5 2.5v11', droite: 'M13.5 2.5v11' } as const;
const padding = (...cotes: (keyof typeof COTES)[]): string =>
  CADRE_LEGER + cotes.map((cote) => `<path d="${COTES[cote]}" stroke-width="2.2"/>`).join('');

type Entree = readonly [id: string, libelle: string, trace: string, sens: string];

const famille = (id: IdDeFamilleDeSignes, entrees: readonly Entree[]): SigneDuLangage[] =>
  entrees.map(([signe, libelle, trace, sens]) => ({ id: signe, famille: id, libelle, sens, trace, mot: libelle }));

export const SIGNES: readonly SigneDuLangage[] = [
  ...famille('types-figma', [
    ['type-color', 'Color', GOUTTE, 'Variable de type Color.'],
    ['type-number', 'Number', '<path d="M6.2 2.5 5 13.5M11 2.5l-1.2 11M2.8 6h10.7M2.5 10h10.7"/>', 'Variable de type Number.'],
    ['type-string', 'String', '<path d="M4.5 4.5C3.4 5.3 3 6.5 3 8v3h2.6V8H3M10 4.5C8.9 5.3 8.5 6.5 8.5 8v3h2.6V8H8.5"/>', 'Variable de type String.'],
    ['type-boolean', 'Boolean', BASCULE, 'Variable de type Boolean.'],
  ]),
  ...famille('usage-couleur', [
    ['usage-fill', 'fill', '', 'Couleur de fond d’un layer.'],
    ['usage-texte', 'texte', tx('A', 9.5), 'Couleur d’un texte.'],
    ['usage-icone', 'icône', `<path d="${ETOILE}" fill="currentColor" stroke="none"/>`, 'Couleur d’une icône. L’étoile est le signe de l’icône.'],
    ['usage-stroke', 'stroke', '', 'Couleur d’un contour.'],
    ['usage-effet', 'shadow', '<rect x="2.5" y="2.5" width="8.5" height="8.5" rx="1.5"/><path d="M13.5 5.5v7a1 1 0 0 1-1 1h-7"/>', 'Couleur d’un effet.'],
    ['usage-inconnue', 'couleur non lue', '<path d="M8 2s4.6 4.9 4.6 7.9a4.6 4.6 0 0 1-9.2 0C3.4 6.9 8 2 8 2z" stroke-dasharray="2 1.6"/>', 'Couleur dont la valeur ne se résout pas.'],
  ]),
  ...famille('usage-nombre', [
    ['padding', 'padding', padding('haut', 'bas', 'gauche', 'droite'), 'Les quatre côtés.'],
    ['padding-x', 'padding-x', padding('gauche', 'droite'), 'Left et right.'],
    ['padding-y', 'padding-y', padding('haut', 'bas'), 'Top et bottom.'],
    ['padding-top', 'padding-top', padding('haut'), 'Top seul.'],
    ['padding-right', 'padding-right', padding('droite'), 'Right seul.'],
    ['padding-bottom', 'padding-bottom', padding('bas'), 'Bottom seul.'],
    ['padding-left', 'padding-left', padding('gauche'), 'Left seul.'],
    ['gap', 'gap', '<rect x="2" y="3" width="4" height="10" rx="1"/><rect x="10" y="3" width="4" height="10" rx="1"/><path d="M7 8h2"/>', 'Écart entre les enfants d’un auto layout.'],
    ['width', 'width', '<path d="M2 4v8M14 4v8M4.3 8h7.4M5.8 6.5 4.3 8l1.5 1.5M10.2 6.5 11.7 8l-1.5 1.5"/>', 'Largeur fixée.'],
    ['height', 'height', '<path d="M4 2h8M4 14h8M8 4.3v7.4M6.5 5.8 8 4.3l1.5 1.5M6.5 10.2 8 11.7l1.5-1.5"/>', 'Hauteur fixée.'],
    ['taille-icone', 'taille d’icône', `<path d="M2 5.5V2h3.5M10.5 2H14v3.5M14 10.5V14h-3.5M5.5 14H2v-3.5"/><path d="${ETOILE_PETITE}" fill="currentColor" stroke="none"/>`, 'Côté d’une icône.'],
    ['radius', 'radius', '<path d="M3 13.5V8.5a5.5 5.5 0 0 1 5.5-5.5h5"/>', 'Rayon des coins.'],
    ['stroke-weight', 'stroke weight', '<path d="M2.5 3.8h11" stroke-width="1"/><path d="M2.5 7.8h11" stroke-width="1.9"/><path d="M2.5 12.2h11" stroke-width="2.8"/>', 'Épaisseur d’un contour.'],
    ['opacity', 'opacity', '<rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M2.5 2.5h5.5v5.5H2.5zM8 8h5.5v5.5H8z" fill="currentColor" stroke="none"/>', 'Opacité d’un layer.'],
  ]),
  ...famille('typographie', [
    ['text-style', 'text style', tx('Aa', 10.5, 8, 12), 'Style de texte de Figma.'],
    ['font-family', 'font family', tx('Ag', 10.5, 8, 11.6), 'Famille de police.'],
    ['font-size', 'font size', tx('A', 5.5, 4.6, 12) + tx('A', 10.5, 10.6, 12), 'Corps du texte.'],
    ['font-weight', 'font weight', tx('B', 11, 8, 12, 900), 'Graisse.'],
    ['line-height', 'line height', '<path d="M2 4h7M2 8h7M2 12h7M12.5 3v10M11 4.5 12.5 3 14 4.5M11 11.5l1.5 1.5 1.5-1.5"/>', 'Hauteur de ligne.'],
    ['letter-spacing', 'letter spacing', tx('AV', 7, 8, 8.5) + '<path d="M2.5 12.5h11M4 11l-1.5 1.5L4 14M12 11l1.5 1.5L12 14"/>', 'Espace entre les lettres.'],
  ]),
  ...famille('couche', [
    ['couche-primitives', 'primitives', pile(0), 'Valeurs brutes. Première collection.'],
    ['couche-layout', 'layout, typography, brands, utility', pile(1), 'Valeurs partagées, lues dans primitives.'],
    ['couche-theme', 'theme', pile(2), 'Rôles de couleur par mode.'],
    ['couche-components', 'components', pile(3), 'Tokens d’un composant. Dernière collection.'],
  ]),
  ...famille('etat-token', [
    ['variable', 'variable liée', `<path d="${HEXA}"/>`, 'Une variable est liée. Signe de Figma.'],
    ['existe', 'existe', `<path d="${HEXA}"/><path d="m5.6 8.1 1.6 1.6 3.2-3.4"/>`, 'La variable proposée existe déjà.'],
    ['a-creer', 'à créer', `<path d="${HEXA}" stroke-dasharray="2.2 1.6"/><path d="M8 5.6v4.8M5.6 8h4.8"/>`, 'La préparation créera la variable.'],
    ['en-dur', 'valeur en dur', `<path d="${HEXA}" stroke-dasharray="2.2 1.6"/><path d="m4.5 11.5 7-7"/>`, 'Aucune variable. La valeur est écrite dans le layer.'],
    ['alias', 'alias', '<circle cx="3.5" cy="8" r="1.7" fill="currentColor"/><circle cx="12.5" cy="8" r="1.7" fill="currentColor"/><path d="M5.6 8h4.8"/>', 'La variable renvoie à une autre.'],
    ['library', 'library', '<path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h8.5v10H4.5A1.5 1.5 0 0 0 3 13.5zM3 13.5A1.5 1.5 0 0 0 4.5 15H13"/>', 'Vient d’une library publiée.'],
    ['local', 'locale', DOC, 'Vient de ce fichier.'],
    ['rompue', 'chaîne rompue', '<path d="M6.5 9.5 5 11a2.1 2.1 0 0 1-3-3l1.5-1.5M9.5 6.5 11 5a2.1 2.1 0 0 1 3 3l-1.5 1.5M5.5 2.5l.5 2M2.5 5.5l2 .5M10.5 13.5 10 11.5M13.5 10.5l-2-.5"/>', 'Une variable de la chaîne est introuvable.'],
    ['ecart', 'écart avec Figma', '<path d="M3 6.3h10M3 9.7h10M10.5 3l-5 10"/>', 'Figma rend une autre valeur que la chaîne.'],
    ['mode', 'mode', '<circle cx="8" cy="8" r="5.6"/><path d="M8 2.4a5.6 5.6 0 0 0 0 11.2z" fill="currentColor" stroke="none"/>', 'Mode d’une collection : Light, Dark.'],
    ['scope', 'scope', '<circle cx="8" cy="8" r="4.3"/><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3"/>', 'Scope de la variable, comme Figma le nomme.'],
  ]),
  ...famille('objet-figma', [
    ['component-set', 'component set', '<rect x="1.2" y="1.2" width="13.6" height="13.6" rx="2" stroke-dasharray="2 1.6"/><path d="M8 3.6 9.4 5 8 6.4 6.6 5zM8 9.6 9.4 11 8 12.4 6.6 11zM5 6.6 6.4 8 5 9.4 3.6 8zM11 6.6 12.4 8 11 9.4 9.6 8z"/>', 'Le jeu de variants : le cadre en pointillés de Figma autour du component.'],
    ['component', 'component', '<path d="M8 1.8 10.1 3.9 8 6 5.9 3.9zM8 10l2.1 2.1L8 14.2l-2.1-2.1zM3.9 5.9 6 8l-2.1 2.1L1.8 8zM12.1 5.9 14.2 8l-2.1 2.1L10 8z"/>', 'Un composant principal. Signe de Figma.'],
    ['variant', 'variant', '<path d="M8 2.3 13.7 8 8 13.7 2.3 8z" fill="currentColor"/>', 'Un variant du jeu.'],
    ['instance', 'instance', '<path d="M8 2.3 13.7 8 8 13.7 2.3 8z"/>', 'Une instance, dont un composant imbriqué. Signe de Figma.'],
    ['frame', 'frame', '<path d="M5 2v12M11 2v12M2 5h12M2 11h12"/>', 'Un frame.'],
    ['group', 'group', '<rect x="2.5" y="2.5" width="11" height="11" rx="1" stroke-dasharray="2 1.6"/>', 'Un group.'],
    ['text', 'text', TEXTE_T, 'Un layer texte.'],
    ['vector', 'vector', '<path d="M8 2 12.5 9 8 14 3.5 9z"/><circle cx="8" cy="9" r="1.2"/><path d="M8 2v5.8"/>', 'Un tracé vectoriel.'],
    ['slot', 'slot', EMPLACEMENT, 'Un emplacement à remplir.'],
    ['selection', 'sélection de Figma', '<rect x="3.5" y="3.5" width="9" height="9"/><path d="M2 2h3v3H2zM11 2h3v3h-3zM2 11h3v3H2zM11 11h3v3h-3z" fill="currentColor" stroke="none"/>', 'Les layers que le plugin a sélectionnés.'],
  ]),
  ...famille('property', [
    ['prop-variant', 'variant property', '<path d="M8 2.3 13.7 8 8 13.7 2.3 8z"/><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none"/>', 'Property de variant : Severity, Variant.'],
    ['prop-boolean', 'boolean property', BASCULE, 'Property vrai ou faux.'],
    ['prop-text', 'text property', TEXTE_T, 'Property de texte.'],
    ['prop-swap', 'instance swap', '<path d="M8 4.6 11.4 8 8 11.4 4.6 8z"/><path d="M2.3 6.2A6 6 0 0 1 11 2.6M13.7 9.8A6 6 0 0 1 5 13.4"/>', 'Property d’échange d’instance.'],
    ['prop-slot', 'slot property', EMPLACEMENT, 'Property de slot.'],
  ]),
  ...famille('regles', [
    ['regles', 'instance de règles', '<rect x="3" y="2" width="10" height="12" rx="1.5"/><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3"/>', 'L’instance .componentRules posée à côté du composant.'],
    ['tag-usage', '@usage', '<path d="M2.5 4h11M2.5 8h11M2.5 12h7"/>', 'Quand employer le composant. Section GÉNÉRAL.'],
    ['tag-do', '@do', '<circle cx="8" cy="8" r="5.8"/><path d="m5.3 8.2 1.8 1.8 3.6-3.8"/>', 'Un emploi recommandé. Gris : le vert dit un changement.'],
    ['tag-dont', '@dont', '<circle cx="8" cy="8" r="5.8"/><path d="m5.9 5.9 4.2 4.2M10.1 5.9l-4.2 4.2"/>', 'Un emploi à éviter. Gris : le rouge dit un retrait.'],
    ['tag-pairs', '@pairs', '<circle cx="6" cy="8" r="4"/><circle cx="10" cy="8" r="4"/>', 'Un composant qui va avec celui-ci.'],
    ['tag-icons', '@icons', `<path d="${ETOILE}"/>`, 'Icônes admises. L’étoile de l’icône. Section ICONES.'],
    ['tag-default', '@default', '<path d="M8 14.5V9.5M4.8 9.5h6.4L10 7.3V3H6v4.3z"/>', 'Valeur par défaut d’une property.'],
    ['modifiable', 'modifiable', '<path d="M10.5 2.5l3 3-8 8h-3v-3zM9 4l3 3"/>', 'Le développeur peut changer la valeur.'],
    ['strict', 'strict', '<rect x="3.5" y="7" width="9" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>', 'La valeur est imposée.'],
    ['a-completer', '[À compléter]', tx('…', 11, 8, 10.5), 'Texte d’aide pas encore rédigé. Il ne part pas dans le contrat.'],
  ]),
  ...famille('proposition', [
    ['correction', 'correction', '<path d="M10.4 2.1a3.4 3.4 0 0 0-3.9 4.6L2.3 10.9a1.4 1.4 0 0 0 2 2l4.2-4.2a3.4 3.4 0 0 0 4.6-3.9l-2.1 2.1-1.9-.5-.5-1.9z"/>', 'Le plugin l’applique.'],
    ['question', 'question', tx('?', 12, 8, 12.4, 700), 'Le designer choisit.'],
    ['a-faire', 'à faire dans Figma', '<path d="M3.5 2.5 12.8 7.6 8.6 8.8 6.6 13z"/>', 'Le designer agit dans Figma.'],
    ['modele', 'copie d’un modèle', '<rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/>', 'Les liaisons d’un variant juste copiées aux autres.'],
    ['ignore', 'ignoré', '<path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.7 9h6.6l.7-9M6.7 7v4.5M9.3 7v4.5"/>', 'Le constat ne sera plus proposé.'],
    ['plus-tard', 'plus tard', '<circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/>', 'La question attend.'],
    ['applique', 'appliqué', '<path d="m3 8.5 3.2 3.2L13 4.5"/>', 'L’écriture a réussi.'],
    ['defait', 'défait', '<path d="M5.5 3.5 2.5 6.5l3 3M2.5 6.5h7a4 4 0 0 1 0 8H7"/>', 'Le designer a fait Ctrl+Z.'],
    ['perime', 'analyse périmée', '<path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.3v3h-3"/>', 'Le composant a changé depuis l’analyse.'],
  ]),
  ...famille('accessibilite', [
    ['contraste', 'paire de contraste', '<rect x="2" y="2" width="8" height="8" rx="1" fill="currentColor"/><rect x="6" y="6" width="8" height="8" rx="1"/>', 'Un texte ou une icône sur son fond.'],
    ['focus', 'anneau de focus', '<rect x="4.5" y="4.5" width="7" height="7" rx="1.5"/><rect x="1.5" y="1.5" width="13" height="13" rx="3" stroke-dasharray="2 1.6"/>', 'Le contour du focus clavier.'],
    ['cible', 'cible tactile', '<circle cx="8" cy="8" r="2" fill="currentColor"/><circle cx="8" cy="8" r="5.7"/>', 'La surface qu’un doigt touche.'],
  ]),
  ...famille('palettes', [
    ['palette', 'palette', '<rect x="1.5" y="4" width="4.3" height="8" rx="1" fill="currentColor" opacity=".35" stroke="none"/><rect x="5.85" y="4" width="4.3" height="8" fill="currentColor" opacity=".65" stroke="none"/><rect x="10.2" y="4" width="4.3" height="8" rx="1" fill="currentColor" stroke="none"/>', 'Une palette de primitives.'],
    ['cran', 'cran', '<path d="M2 13.5h3v-3h3v-3h3v-3h3"/>', 'Un pas de la palette : 50 à 950.'],
  ]),
  ...famille('publication', [
    ['contrat', 'contrat de composant', DOC + tx('{}', 5.5, 8.2, 12), 'Le .contract.json publié.'],
    ['dtcg', 'tokens DTCG', '<path d="M8 1.5 13.5 4.4 8 7.3 2.5 4.4z"/><path d="m2.5 8 5.5 2.9L13.5 8M2.5 11.6l5.5 2.9 5.5-2.9"/>', 'Les tokens exportés.'],
    ['css', 'feuille CSS', DOC + tx('#', 6, 8.2, 12.2), 'La feuille des custom properties.'],
    ['fusion', 'demande de fusion', '<circle cx="4" cy="3.5" r="1.6"/><circle cx="4" cy="12.5" r="1.6"/><circle cx="12" cy="12.5" r="1.6"/><path d="M4 5.1v5.8M4 6.5c0 3.5 8 2 8 4.4"/>', 'La pull request ou la merge request ouverte.'],
    ['version', 'version du kit', '<path d="M2 2h6l6 6-6 6-6-6z"/><circle cx="5.5" cy="5.5" r="1"/>', 'Le numéro de @ucm-kit/core.'],
  ]),
];

/** Les signes qu’une famille montre sans les définir : la définition reste dans leur famille d’origine. */
export const REPRISES_DE_SIGNES: readonly RepriseDeSigne[] = [
  {
    famille: 'regles',
    reprend: [
      { id: 'prop-variant', libelle: '@prop' },
      { id: 'prop-boolean', libelle: '@boolean' },
    ],
  },
  { famille: 'usage-couleur', reprend: [{ id: 'type-color', libelle: 'Couleurs' }] },
  { famille: 'proposition', reprend: [{ id: 'a-creer', libelle: 'préparation' }] },
  { famille: 'palettes', reprend: [{ id: 'mode', libelle: 'Light, Dark' }] },
];

/** Le SVG complet d’un signe, prêt à poser dans une tuile. Lève une erreur pour un identifiant inconnu. */
export function svgDuSigne(id: string, taille = 16): string {
  const signe = SIGNES.find((candidat) => candidat.id === id);
  if (!signe) throw new Error(`Signe inconnu : « ${id} ». Les identifiants admis sont ceux de SIGNES.`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${taille}" height="${taille}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${signe.trace}</svg>`;
}
