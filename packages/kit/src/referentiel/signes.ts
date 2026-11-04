/**
 * Les signes : la sorte d’objet qu’une tuile désigne, partagée par tous les plugins UCM.
 *
 * Le kit porte les données (identifiant, famille, libellé, sens, tracé, mot de repli) et ne crée aucun élément DOM.
 * Le tracé est le contenu SVG d’une grille de 16, ou de la `grille` que le signe déclare ; il n’emploie que `path`, `rect`, `circle` et `text`.
 * Un signe repris par une autre famille n’est défini qu’une fois ; la famille qui le reprend le liste dans `REPRISES_DE_SIGNES`.
 */

export type TeinteDeFamille = 'couleurs' | 'tailles' | 'texte' | 'tokens' | 'variants' | 'regles' | 'a11y';

/** Comment le socle pose les signes d’une famille. */
export interface PoseDeFamille {
  /** La fonction du socle qui pose le signe. */
  fonction: string;
  /** Les tailles admises. */
  tailles: string;
  /** La règle de teinte : quand le signe prend la couleur de la famille, quand il reste gris. */
  teinte: string;
  /** Le nom accessible attendu. */
  nom: string;
}

const TAILLES_DE_TUILE = '14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.';
const NOM_DE_TUILE = 'Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role="img"` et `aria-label`.';
const teinteDe = (nom: string): string => `Avec \`informe: true\`, la tuile prend la couleur « ${nom} ». Sans lui, elle reste grise : réserver la couleur à un signe qui porte une information.`;
const GRIS = 'La famille n’a pas de teinte : `informe` ne change rien et la tuile reste grise.';
const poseDeTuile = (teinte: string, supplement = ''): PoseDeFamille => ({
  fonction: `\`creerSigne(id, options)\` du socle (\`packages/plugin-socle/src/ui/Signe.ts\`).${supplement}`,
  tailles: TAILLES_DE_TUILE,
  teinte,
  nom: NOM_DE_TUILE,
});

export const FAMILLES_DE_SIGNES = [
  { id: 'types-figma', libelle: 'Type de variable Figma', teinte: null, pose: poseDeTuile(GRIS) },
  { id: 'usage-couleur', libelle: 'Usage d’une couleur', teinte: 'couleurs', pose: poseDeTuile(teinteDe('couleurs'), ' Pour montrer la valeur d’une couleur de token, passer `valeur` (et `clair` si elle est claire) : la tuile se remplit, `usage-stroke` devient un anneau, et la valeur prend le pas sur la teinte.') },
  { id: 'usage-nombre', libelle: 'Usage d’un nombre', teinte: 'tailles', pose: poseDeTuile(teinteDe('tailles')) },
  { id: 'typographie', libelle: 'Typographie', teinte: 'texte', pose: poseDeTuile(teinteDe('texte')) },
  { id: 'couche', libelle: 'Couche UCM, dans l’ordre de la library', teinte: 'tokens', pose: poseDeTuile(teinteDe('tokens')) },
  { id: 'etat-token', libelle: 'État d’un token', teinte: 'tokens', pose: poseDeTuile(teinteDe('tokens'), ' `a-creer` reçoit la classe `signe-absent`.') },
  { id: 'rubrique-tokens', libelle: 'Rubrique du mode Tokens', teinte: 'tokens', pose: poseDeTuile(teinteDe('tokens'), ' Pour `a-creer`, `cran`, `rompue`, `mode` et `scope`, reprises par cette famille, passer `famille: "rubrique-tokens"` pour en prendre la teinte.') },
  { id: 'objet-figma', libelle: 'Objet de Figma', teinte: 'variants', pose: poseDeTuile(teinteDe('variants')) },
  { id: 'property', libelle: 'Property de composant', teinte: 'variants', pose: poseDeTuile(teinteDe('variants'), ' Pour `type-boolean`, `text` et `slot`, reprises par cette famille, passer `famille: "property"`.') },
  { id: 'regles', libelle: 'Règles d’utilisation (.componentRules)', teinte: 'regles', pose: poseDeTuile(teinteDe('regles'), ' Pour `prop-variant` et `type-boolean`, reprises par cette famille, passer `famille: "regles"`.') },
  { id: 'type-de-terme', libelle: 'Type de terme de Nomenclature', teinte: 'regles', pose: poseDeTuile(teinteDe('regles'), ' Pour `palette`, `component`, `question` et `applique`, reprises par cette famille, passer `famille: "type-de-terme"`.') },
  { id: 'proposition', libelle: 'Sorte de proposition', teinte: null, pose: poseDeTuile(GRIS) },
  { id: 'accessibilite', libelle: 'Accessibilité', teinte: 'a11y', pose: poseDeTuile(teinteDe('a11y')) },
  { id: 'palettes', libelle: 'Palettes', teinte: 'couleurs', pose: poseDeTuile(teinteDe('couleurs'), ' Pour `mode`, repris par cette famille, passer `famille: "palettes"`.') },
  { id: 'publication', libelle: 'Publication', teinte: null, pose: poseDeTuile(GRIS) },
  {
    id: 'verdict-palettes',
    libelle: 'Verdicts et repères de Palettes',
    teinte: 'couleurs',
    pose: poseDeTuile(teinteDe('couleurs'), ' Les verdicts « tenu », « à corriger » et « bloquant » ne sont pas dans cette famille : ils prennent les icônes d’alerte du socle (`creerIcone`).'),
  },
  {
    id: 'pictogramme-palettes',
    libelle: 'Pictogrammes des cartes de Palettes',
    teinte: null,
    pose: {
      fonction: '`creerSvgDuSigne(id, largeur)` du socle pose le tracé sur sa grille de 44 × 28 ; UCM Palettes le ramène à 38 × 24 px (`creerGlyphe`, `packages/plugin-palettes/src/ui/glyphes.ts`).',
      tailles: '38 × 24 px dans l’en-tête d’une carte titrée. La grille est de 44 sur 28 (champs `grille` et `hauteur`) : le trait de 1,8 se règle dans la feuille du plugin.',
      teinte: 'Chaque forme porte un rôle, la classe `glyphe-*` de son attribut `class`, et la feuille du plugin la peint de ses rôles de couleur. Sans cette feuille, le tracé reste dans la couleur du texte.',
      nom: 'Le pictogramme est décoratif (`aria-hidden`) : le titre de la carte le nomme.',
    },
  },
  {
    id: 'interface',
    libelle: 'Interface des plugins',
    teinte: null,
    pose: {
      fonction:
        '`creerSvgDuSigne(id, taille)` pour un tracé, `creerChevron(sens)` pour `chevron`, `creerGlyphe(id)` ou `glypheDe(id)` pour les sept signes dont le champ `glyphe` donne le caractère (`fermer`, `avant-apres`, `menu`, `ajouter`, `retirer`, `separateur`, `ecart`) ; tout vient de `packages/plugin-socle/src/ui/Signe.ts` et `Chevron.ts`. Le champ `glyphe` du signe donne le caractère qu’un texte écrit à la place du dessin. `creerSigne` ne pose pas ces signes dans une tuile.',
      tailles: 'Un tracé prend le côté en pixels que l’appelant donne ; `creerChevron` pose 12 px. Un glyphe prend la taille du texte autour.',
      teinte: GRIS + ' Le signe prend la couleur du texte qui l’entoure (`currentColor`).',
      nom: 'Le signe est décoratif (`aria-hidden`) : le bouton qui le porte garde son nom accessible, par exemple « Fermer » ou « Réglages ».',
    },
  },
] as const satisfies readonly { id: string; libelle: string; teinte: TeinteDeFamille | null; pose: PoseDeFamille }[];

export type IdDeFamilleDeSignes = (typeof FAMILLES_DE_SIGNES)[number]['id'];

export interface SigneDuLangage {
  id: string;
  famille: IdDeFamilleDeSignes;
  libelle: string;
  sens: string;
  /** Contenu SVG sur la grille du signe. Vide quand la tuile porte seule la couleur. */
  trace: string;
  /** Côté de la grille du tracé, 16 quand il manque. Un tracé plein copié d’une icône de 512 la garde, faute de se tracer au trait. */
  grille?: number;
  /** Hauteur de la grille quand elle diffère de sa largeur `grille` (44 × 28 pour un pictogramme de carte). Elle vaut `grille` quand elle manque. */
  hauteur?: number;
  /** Mot d’un texte brut, là où aucun tracé ne se dessine. */
  mot: string;
  /** Le caractère qu’un texte écrit à la place du dessin. Sept signes de la famille `interface`, `ecart` et les trois signes de `verdict-palettes` en ont un. */
  glyphe?: string;
  /** Quand employer le signe, et le signe à prendre à sa place quand il ne convient pas. */
  emploi: string;
}

/** Signe défini dans une autre famille, avec le libellé qu’il porte dans celle-ci. */
export interface SigneRepris {
  id: string;
  libelle: string;
  /** L’emploi du signe dans la famille qui le reprend, quand il diffère de celui de sa famille d’origine. */
  emploi?: string;
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

const famille = (id: IdDeFamilleDeSignes, entrees: readonly Entree[]): Omit<SigneDuLangage, 'emploi'>[] =>
  entrees.map(([signe, libelle, trace, sens]) => ({ id: signe, famille: id, libelle, sens, trace, mot: libelle }));

/** Engrenage de Font Awesome Free Solid 6.7.2 (gear, f013), plein, sur sa grille de 512. */
const ENGRENAGE = '<path d="M495.9 166.6c3.2 8.7.5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6.3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z" fill="currentColor" stroke="none"/>';

/**
 * Quand employer chaque signe, et le signe à prendre à sa place quand il ne convient pas ; un identifiant entre accents graves
 * désigne un autre signe. Un signe sans entrée fait échouer le chargement du module.
 */
const EMPLOIS: Readonly<Record<string, string>> = {
  'type-color': 'Une variable de type Color, dans une liste de types. Pour la couleur d’un layer, prendre `usage-fill`.',
  'type-number': 'Une variable de type Number. Pour dire ce que le nombre règle, prendre le signe de la famille « Usage d’un nombre ».',
  'type-string': 'Une variable de type String. Pour un layer texte, prendre `text`.',
  'type-boolean': 'Une variable de type Boolean, et une property booléenne de composant que la famille « Property » reprend. Pour un état de la library, prendre `variable`.',
  'usage-fill': 'La couleur qui peint le fond d’un layer. Pour un contour, prendre `usage-stroke`.',
  'usage-texte': 'La couleur qui peint un texte. Pour la police ou le corps, prendre un signe de « Typographie ».',
  'usage-icone': 'La couleur qui peint une icône. Pour sa taille, prendre `taille-icone`.',
  'usage-stroke': 'La couleur qui peint un contour. Pour son épaisseur, prendre `stroke-weight`.',
  'usage-effet': 'La couleur d’une ombre ou d’un autre effet. Pour un fond, prendre `usage-fill`.',
  'usage-inconnue': 'Une couleur dont la valeur ne se résout pas. Une couleur lue se montre par son usage, jamais par ce signe.',
  padding: 'Un padding identique sur les quatre côtés. Si un côté diffère, prendre `padding-x`, `padding-y` ou le côté seul.',
  'padding-x': 'Un padding à gauche et à droite. Pour un seul côté, prendre `padding-left` ou `padding-right`.',
  'padding-y': 'Un padding en haut et en bas. Pour un seul côté, prendre `padding-top` ou `padding-bottom`.',
  'padding-top': 'Un padding en haut seulement. Pour haut et bas ensemble, prendre `padding-y`.',
  'padding-right': 'Un padding à droite seulement. Pour gauche et droite ensemble, prendre `padding-x`.',
  'padding-bottom': 'Un padding en bas seulement. Pour haut et bas ensemble, prendre `padding-y`.',
  'padding-left': 'Un padding à gauche seulement. Pour gauche et droite ensemble, prendre `padding-x`.',
  gap: 'L’espace entre les enfants d’un auto layout. Pour l’espace entre le bord et le contenu, prendre `padding`.',
  width: 'Une largeur fixée. Pour une hauteur, prendre `height`.',
  height: 'Une hauteur fixée. Pour une largeur, prendre `width`.',
  'taille-icone': 'Le côté d’une icône. Pour la largeur d’un layer quelconque, prendre `width`.',
  radius: 'Le rayon des coins d’un layer. Pour l’épaisseur du contour, prendre `stroke-weight`.',
  'stroke-weight': 'L’épaisseur d’un contour. Pour sa couleur, prendre `usage-stroke`.',
  opacity: 'L’opacité d’un layer. Pour une couleur, prendre le signe de son usage.',
  'text-style': 'Un style de texte de Figma, qui réunit police, corps et interligne. Pour un seul réglage, prendre le signe de ce réglage.',
  'font-family': 'La famille de police d’un texte. Pour son corps, prendre `font-size`.',
  'font-size': 'Le corps d’un texte. Pour l’interligne, prendre `line-height`.',
  'font-weight': 'La graisse d’un texte. Pour la famille de police, prendre `font-family`.',
  'line-height': 'La hauteur de ligne d’un texte. Pour l’espace entre les lettres, prendre `letter-spacing`.',
  'letter-spacing': 'L’espace entre les lettres. Pour l’interligne, prendre `line-height`.',
  'couche-primitives': 'La collection des valeurs brutes, première de la library. Pour une collection qui les lit, prendre `couche-layout`.',
  'couche-layout': 'Les collections layout, typography, brands et utility, qui lisent primitives. Pour les rôles de couleur par mode, prendre `couche-theme`.',
  'couche-theme': 'La collection des rôles de couleur par mode. Pour les tokens d’un composant, prendre `couche-components`.',
  'couche-components': 'La collection des tokens d’un composant, dernière de la library. Pour une valeur partagée, prendre `couche-layout`.',
  variable: 'Une variable liée à un layer, sans dire d’où elle vient. Pour sa provenance, prendre `library` ou `local`.',
  existe: 'La variable que le plugin propose existe déjà. Pour une variable à ajouter, prendre `a-creer`.',
  'a-creer': 'La préparation créera la variable. Pour une variable déjà présente, prendre `existe`.',
  'en-dur': 'Une valeur écrite dans le layer, sans variable. Pour une chaîne dont un maillon manque, prendre `rompue`.',
  alias: 'Une variable qui renvoie à une autre. Pour une chaîne dont un maillon manque, prendre `rompue`.',
  library: 'Une variable d’une library publiée. Pour une variable de ce fichier, prendre `local`.',
  local: 'Une variable de ce fichier. Pour une variable d’une library publiée, prendre `library`.',
  rompue: 'Une chaîne d’alias dont une variable est introuvable. Pour une valeur sans variable, prendre `en-dur`.',
  ecart: 'Figma rend une autre valeur que celle de la chaîne. Pour un changement de valeur proposé, prendre `avant-apres`. En texte, le caractère « ≠ » (champ glyphe) remplace le dessin.',
  mode: 'Un mode d’une collection, Light ou Dark. Pour une palette entière, prendre `palette`.',
  scope: 'Le scope d’une variable, au sens de Figma. Pour la collection qui la range, prendre `rangement`.',
  nom: 'Le nom d’une variable, dans la rubrique « Noms » du mode Tokens. Pour le dossier qui la range, prendre `rangement`.',
  valeurs: 'Une valeur vide, ou deux variables de même valeur. Pour une valeur écrite dans le layer, prendre `en-dur`.',
  couches: 'L’ordre des couches, où chacune lit celle du dessus. Pour une couche seule, prendre son signe de la famille « Couche UCM ».',
  types: 'Le type Figma d’une variable, en rubrique. Pour un type précis, prendre son signe de « Type de variable Figma ».',
  rangement: 'Le dossier ou la collection où la variable est rangée. Pour son nom, prendre `nom`.',
  'component-set': 'Le jeu de variants d’un composant. Pour un composant seul, prendre `component`.',
  component: 'Un composant principal. Pour une copie posée dans un frame, prendre `instance`.',
  variant: 'Un variant du jeu, en plein. Pour une copie du composant, prendre `instance`, au contour seul.',
  instance: 'Une instance d’un composant, y compris imbriquée. Pour le composant principal, prendre `component`.',
  frame: 'Un frame. Pour un group, prendre `group`.',
  group: 'Un group de layers. Pour un frame, prendre `frame`.',
  text: 'Un layer texte, et une property texte de composant que la famille « Property » reprend. Pour le style d’un texte, prendre `text-style`.',
  vector: 'Un tracé vectoriel. Pour la couleur d’une icône, prendre `usage-icone`.',
  slot: 'Un emplacement à remplir, et une property slot que la famille « Property » reprend. Pour échanger une instance, prendre `prop-swap`.',
  selection: 'Les layers que le plugin a sélectionnés. Pour un objet précis, prendre son signe de « Objet de Figma ».',
  'prop-variant': 'Une property de variant, comme Severity. Pour une property qui échange une instance, prendre `prop-swap`.',
  'prop-swap': 'Une property d’échange d’instance. Pour une property de variant, prendre `prop-variant`.',
  regles: 'L’instance .componentRules posée à côté du composant. Pour une ligne de règle, prendre le signe de son tag.',
  'tag-usage': 'Le tag @usage, qui dit quand employer le composant. Pour un emploi précis, prendre `tag-do` ou `tag-dont`.',
  'tag-do': 'Un emploi recommandé, en gris. Pour un emploi à éviter, prendre `tag-dont`.',
  'tag-dont': 'Un emploi à éviter, en gris. Pour un emploi recommandé, prendre `tag-do`.',
  'tag-pairs': 'Un composant qui va avec celui-ci. Pour les icônes admises, prendre `tag-icons`.',
  'tag-icons': 'Les icônes qu’un composant admet. Pour la couleur d’une icône, prendre `usage-icone`.',
  'tag-default': 'La valeur par défaut d’une property. Pour une valeur imposée, prendre `strict`.',
  modifiable: 'Une valeur que le développeur peut changer. Pour une valeur imposée, prendre `strict`.',
  strict: 'Une valeur imposée. Pour une valeur que le développeur peut changer, prendre `modifiable`.',
  'a-completer': 'Un texte d’aide pas encore rédigé. Un texte rédigé ne porte aucun signe.',
  remplace: 'Un terme de Nomenclature qui en remplace un autre. Pour un terme qu’aucune règle ne décide, prendre `sans-regle`.',
  'sans-regle': 'Un terme qu’aucune règle ne décide. Pour un terme qui en remplace un autre, prendre `remplace`.',
  correction: 'Une proposition que le plugin applique lui-même. Pour un choix du designer, prendre `question`.',
  question: 'Une proposition où le designer choisit. Pour une action dans Figma, prendre `a-faire`.',
  'a-faire': 'Une proposition où le designer agit dans Figma, hors du plugin. Pour une correction que le plugin applique, prendre `correction`.',
  modele: 'Les liaisons d’un variant copiées aux autres. Pour une correction ordinaire, prendre `correction`.',
  ignore: 'Un constat que le plugin ne proposera plus. Pour une question remise à plus tard, prendre `plus-tard`.',
  'plus-tard': 'Une question qui attend. Pour un constat écarté, prendre `ignore`.',
  applique: 'Une écriture réussie. Pour une écriture annulée, prendre `defait`.',
  defait: 'Une écriture que le designer a annulée par Ctrl+Z. Pour une écriture réussie, prendre `applique`.',
  perime: 'Le composant a changé depuis l’analyse. Pour relire l’état de Figma, prendre `synchroniser`.',
  information: 'Un fait que l’analyse n’a pas mesuré, sans geste attendu. Pour un constat à corriger, prendre `correction`.',
  contraste: 'Un texte ou une icône sur son fond. Pour le contour du focus, prendre `focus`.',
  focus: 'Le contour du focus clavier. Pour la surface tactile, prendre `cible`.',
  cible: 'La surface qu’un doigt touche. Pour le contour du focus, prendre `focus`.',
  palette: 'Une palette de primitives. Pour un pas de cette palette, prendre `cran`.',
  cran: 'Un pas de palette, de 50 à 950. Pour la palette entière, prendre `palette`.',
  contrat: 'Le .contract.json publié. Pour les tokens, prendre `dtcg`.',
  dtcg: 'Les tokens exportés. Pour la feuille CSS, prendre `css`.',
  css: 'La feuille des custom properties. Pour les tokens DTCG, prendre `dtcg`.',
  fusion: 'La demande de fusion ouverte, pull request ou merge request. Pour le numéro du kit, prendre `version`.',
  version: 'Le numéro de @ucm-kit/core. Pour une demande de fusion, prendre `fusion`.',
  'carte-apercu': 'Le pictogramme de la carte Aperçu de Création. Pour une palette seule, prendre `palette`.',
  'carte-reglage-global': 'Le pictogramme de la carte du Réglage global. Pour le pictogramme du Color shift, prendre `carte-color-shift`.',
  'carte-color-shift': 'Le pictogramme de la carte du Color shift. Pour le Réglage global, prendre `carte-reglage-global`.',
  'carte-garanties': 'Le pictogramme de la carte des garanties. Pour un verdict de garantie, prendre l’icône d’alerte du socle.',
  'carte-interface-de-test': 'Le pictogramme de la carte de l’Interface de test. Pour une autre carte, prendre le pictogramme de cette carte.',
  'carte-fonds': 'Le pictogramme de la carte des fonds. Pour la couleur d’une nuance, prendre `palette`.',
  'carte-intensites': 'Le pictogramme de la carte des intensités, Soft et Vivid. Pour les modes Light et Dark, prendre `mode`.',
  'carte-courbes': 'Le pictogramme de la carte des courbes. Pour un cran seul, prendre `cran`.',
  'carte-minimums': 'Le pictogramme de la carte des minimums de contraste. Pour une paire de contraste seule, prendre `contraste`.',
  'carte-proches': 'Le pictogramme de la carte des couleurs proches. Pour deux profils confondus à un cran, prendre `confondus`.',
  'carte-contenu': 'Le pictogramme d’un cadre de la planche. Pour la planche entière, prendre `palette`.',
  butee: 'Une valeur arrêtée sur sa borne, dans la ligne fixe sous une réglette. Pour une garantie manquée, prendre l’icône d’alerte « bloquant » du socle. En texte, le caractère « ⊣ » (champ glyphe) remplace le dessin.',
  reference: 'La référence d’une palette, à son cran. Pour la palette entière, prendre `palette`. En texte, le caractère « ◆ » (champ glyphe) remplace le dessin.',
  confondus: 'Soft et Vivid presque identiques à un cran. Pour deux valeurs différentes, prendre `ecart`. En texte, le caractère « ≈ » (champ glyphe) remplace le dessin.',
  chevron: 'Une section qui se plie ou une liste qui s’ouvre ; le lecteur le tourne pour les trois autres sens. Pour séparer deux niveaux d’un chemin, prendre `separateur`.',
  fermer: 'Fermer un panneau, un message ou une fenêtre. Pour retirer un élément d’une liste, prendre `retirer`. En texte, le caractère « × » (champ glyphe) remplace le dessin.',
  'lien-externe': 'Ouvrir une page hors du plugin. Pour une action dans le plugin, prendre l’icône de cette action.',
  reglages: 'Ouvrir la configuration du plugin. Pour les autres actions d’une ligne, prendre `menu`.',
  poignee: 'Le coin que le designer tire pour redimensionner la fenêtre. Pour replier une section, prendre `chevron`.',
  loupe: 'Lancer une recherche. Pour restreindre une liste par une catégorie, écrire le filtre en toutes lettres.',
  'tout-replier': 'Replier toutes les sections sauf celle qui est ouverte. Pour une seule section, prendre `chevron`.',
  'panneau-lateral': 'Montrer ou masquer le panneau latéral. Pour fermer une fenêtre, prendre `fermer`.',
  synchroniser: 'Relire l’état de Figma. Pour dire qu’une analyse est périmée, prendre `perime`.',
  menu: 'Ouvrir les autres actions d’une ligne. Pour une action unique, prendre l’icône de cette action. En texte, le caractère « ⋯ » (champ glyphe) remplace le dessin.',
  ajouter: 'Ajouter un élément. Pour retirer un élément, prendre `retirer`. En texte, le caractère « + » (champ glyphe) remplace le dessin.',
  retirer: 'Retirer un élément d’une liste. Pour fermer une fenêtre, prendre `fermer`. En texte, le caractère « − » (champ glyphe) remplace le dessin.',
  'avant-apres': 'Aller d’une valeur d’avant à la valeur d’après. Pour un écart de rendu avec Figma, prendre `ecart`. En texte, le caractère « → » (champ glyphe) remplace le dessin.',
  separateur: 'Séparer deux niveaux d’un chemin. Pour une section qui se plie, prendre `chevron`. En texte, le caractère « › » (champ glyphe) remplace le dessin.',
  vide: 'Une vue sans rien à montrer. Pour un terme sans règle, prendre `sans-regle`.',
};

/**
 * Les pictogrammes des cartes de Palettes, sur une grille de 44 × 28. Chaque forme porte son rôle dans `class`, que la feuille
 * du plugin peint. Les rôles sans cerne (`stroke="none"`) ou à bouts droits (`butt`) annulent ce que le `svg` de `svgDuSigne`
 * pose par défaut, pour que la feuille retrouve les formes que le plugin dessinait avant.
 */
const nb = (valeur: number): number => Math.round(valeur * 100) / 100;
const ATTRIBUTS_DE_ROLE: Readonly<Record<string, string>> = { 'aplat-pale': ' stroke="none"', 'aplat-marque': ' stroke="none"', losange: ' stroke="none"', axe: ' stroke-linecap="butt"' };
const roleDe = (role: string): string => `class="glyphe-${role}"${ATTRIBUTS_DE_ROLE[role] ?? ''}`;
const formeRect = (x: number, y: number, largeur: number, hauteur: number, role: string, rx = 1): string => `<rect ${roleDe(role)} x="${nb(x)}" y="${nb(y)}" width="${nb(largeur)}" height="${nb(hauteur)}" rx="${rx}"/>`;
const formeRond = (cx: number, cy: number, r: number, role: string): string => `<circle ${roleDe(role)} cx="${nb(cx)}" cy="${nb(cy)}" r="${nb(r)}"/>`;
const formeChemin = (d: string, role: string, extra = ''): string => `<path ${roleDe(role)}${extra} d="${d}"/>`;
const formeLigne = (x1: number, y1: number, x2: number, y2: number, role: string, extra = ''): string => formeChemin(`M${x1} ${y1}L${x2} ${y2}`, role, extra);
const PASTILLES = [0, 1, 2, 3, 4];
/** Six pastilles en escalier, à `y` pour la première : une rampe, du clair au sombre. */
const rampe = (y: number, role: string): string => [0, 1, 2, 3, 4, 5].map((rang) => formeRect(3 + rang * 6.6, y + rang * 2.2, 4.6, 4, role)).join('');

const pictogrammes: Omit<SigneDuLangage, 'emploi'>[] = (
  [
    // Une surface, une rangée de pastilles dont la troisième, de marque, porte le losange de la référence.
    ['carte-apercu', 'aperçu', 'La carte Aperçu de Création : les nuances sur leur fond, la référence repérée.', formeRect(4, 3, 36, 22, 'fond', 2) + PASTILLES.map((rang) => formeRect(8 + rang * 6, 7, 4.6, 8, rang === 2 ? 'aplat-marque' : 'aplat-pale')).join('') + formeChemin('M22.3 17.5 L24.8 20 L22.3 22.5 L19.8 20 Z', 'losange')],
    // Une rampe pâle, puis la même translatée, de marque.
    ['carte-reglage-global', 'réglage global', 'La carte du Réglage global : une rampe, et la même rampe décalée.', rampe(6, 'aplat-pale') + rampe(13, 'aplat-marque')],
    // Deux bouts qui pivotent autour du losange de la référence.
    ['carte-color-shift', 'Color shift', 'La carte du Color shift : deux bouts de rampe qui pivotent autour de la référence.', formeLigne(4, 14, 40, 14, 'axe') + formeChemin('M4 5L22 14L40 22', 'trait-marque') + formeRond(4, 5, 2.6, 'point') + formeRond(40, 22, 2.6, 'point') + formeChemin('M22 10 L26 14 L22 18 L18 14 Z', 'losange')],
    // Un texte posé sur un fond plein, et la coche de la garantie tenue.
    ['carte-garanties', 'garanties', 'La carte des garanties : un texte sur son fond, et la coche de la garantie tenue.', formeRect(4, 6, 20, 16, 'aplat-marque', 2) + formeLigne(9, 14, 19, 14, 'fond') + formeChemin('M28 14L32 19L40 8', 'trait')],
    // Une fenêtre : sa barre, une ligne de texte et un bouton plein.
    ['carte-interface-de-test', 'Interface de test', 'La carte de l’Interface de test : une fenêtre, sa barre, une ligne et un bouton.', formeRect(4, 4, 36, 20, 'fond', 2) + formeLigne(4, 9, 40, 9, 'trait') + formeLigne(9, 14, 25, 14, 'trait') + formeRect(9, 17, 14, 4, 'aplat-marque', 2)],
    // Une page, et la pastille de son fond dans un coin.
    ['carte-fonds', 'fonds', 'La carte des fonds : une page, et la pastille de son fond.', formeRect(4, 4, 36, 20, 'fond', 2) + formeRect(27, 13, 10, 8, 'aplat-marque', 1.5)],
    // Soft et Vivid : un rond cerné, un rond plein.
    ['carte-intensites', 'intensités', 'La carte des intensités : Soft en rond cerné, Vivid en rond plein.', formeRond(14, 14, 7, 'trait-marque') + formeRond(30, 14, 7, 'aplat-marque')],
    // La courbe de luminosité qui descend du clair au sombre, au-dessus de sa base.
    ['carte-courbes', 'courbes', 'La carte des courbes : la luminosité qui descend du clair au sombre.', formeLigne(4, 24, 40, 24, 'axe') + formeChemin('M4 5 C 16 6, 26 20, 40 21', 'trait-marque') + formeRond(4, 5, 2, 'aplat-marque') + formeRond(40, 21, 2, 'aplat-marque')],
    // Des contrastes en barres, et le minimum en ligne tiretée.
    ['carte-minimums', 'minimums', 'La carte des minimums de contraste : des barres, et le minimum en ligne tiretée.', formeRect(7, 10, 5, 14, 'aplat-marque') + formeRect(15, 14, 5, 10, 'aplat-marque') + formeRect(23, 7, 5, 17, 'aplat-marque') + formeRect(31, 17, 5, 7, 'aplat-pale') + formeLigne(4, 13, 40, 13, 'trait', ' stroke-dasharray="3 2"')],
    // Deux couleurs proches : deux ronds qui se recouvrent.
    ['carte-proches', 'couleurs proches', 'La carte des couleurs proches : deux ronds qui se recouvrent.', formeRond(17, 14, 8, 'trait') + formeRond(27, 14, 8, 'trait-marque')],
    // Un cadre de la planche : une rangée de pastilles, puis deux lignes de texte.
    ['carte-contenu', 'contenu de la planche', 'Un cadre de la planche : des pastilles, puis deux lignes de texte.', formeRect(4, 3, 36, 22, 'fond', 2) + PASTILLES.map((rang) => formeRect(8 + rang * 6, 7, 4.6, 5, 'aplat-marque')).join('') + formeLigne(8, 16, 36, 16, 'trait') + formeLigne(8, 21, 28, 21, 'trait')],
  ] as const
).map(([id, libelle, sens, trace]) => ({ id, famille: 'pictogramme-palettes' as const, libelle, sens, trace, grille: 44, hauteur: 28, mot: libelle }));

const SIGNES_SANS_EMPLOI: readonly Omit<SigneDuLangage, 'emploi'>[] = [
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
  ...famille('rubrique-tokens', [
    ['nom', 'nom', '<text x="8" y="11" font-size="7.5" text-anchor="middle" font-weight="650">a/b</text>', 'Le nom d’une variable, en segments séparés par des barres obliques.'],
    ['valeurs', 'valeurs', `<path d="${HEXA}"/><path d="M5.6 6.9h4.8M5.6 9.1h4.8"/>`, 'Une valeur vide, ou deux variables de même valeur.'],
    ['couches', 'couches', '<path d="M1.8 2.5h7.5M1.8 6.2h7.5M1.8 9.8h7.5M1.8 13.5h7.5"/><path d="M12.8 13V3.5M11.2 5.1l1.6-1.6 1.6 1.6"/>', 'L’ordre des couches. Chaque couche lit celle du dessus.'],
    ['types', 'types', '<rect x="2" y="2.2" width="5" height="5" rx="1"/><circle cx="11.5" cy="4.7" r="2.5"/><path d="M8 9.2l3.2 5H4.8z"/>', 'Le type Figma d’une variable (Color, Number, String, Boolean).'],
    ['rangement', 'rangement', '<path d="M1.8 4.2a1 1 0 0 1 1-1h3.4l1.5 1.8h5.5a1 1 0 0 1 1 1v6.8a1 1 0 0 1-1 1H2.8a1 1 0 0 1-1-1z"/>', 'Le dossier ou la collection où la variable est rangée.'],
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
    ['prop-swap', 'instance swap', '<path d="M8 4.6 11.4 8 8 11.4 4.6 8z"/><path d="M2.3 6.2A6 6 0 0 1 11 2.6M13.7 9.8A6 6 0 0 1 5 13.4"/>', 'Property d’échange d’instance.'],
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
  ...famille('type-de-terme', [
    ['remplace', 'remplace', '<path d="M2.5 4.5h7M2.5 11.5h7M9.5 4.5 13 8l-3.5 3.5M13 8H6"/>', 'Le terme remplace un autre terme.'],
    ['sans-regle', 'sans règle', '<circle cx="8" cy="8" r="5.5" stroke-dasharray="2.2 2"/>', 'Aucune règle ne décide ce terme.'],
  ]),
  ...famille('proposition', [
    ['correction', 'correction', '<path d="M10.4 2.1a3.4 3.4 0 0 0-3.9 4.6L2.3 10.9a1.4 1.4 0 0 0 2 2l4.2-4.2a3.4 3.4 0 0 0 4.6-3.9l-2.1 2.1-1.9-.5-.5-1.9z"/>', 'Le plugin l’applique.'],
    ['question', 'question', tx('?', 12, 8, 12.4, 700), 'Le designer choisit. Le type de terme « À trancher » la reprend en ambre : la teinte vient du lecteur, pas du tracé.'],
    ['a-faire', 'à faire dans Figma', '<path d="M3.5 2.5 12.8 7.6 8.6 8.8 6.6 13z"/>', 'Le designer agit dans Figma.'],
    ['modele', 'copie d’un modèle', '<rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/>', 'Les liaisons d’un variant juste copiées aux autres.'],
    ['ignore', 'ignoré', '<path d="M1.8 8s2.3-4.2 6.2-4.2S14.2 8 14.2 8s-2.3 4.2-6.2 4.2S1.8 8 1.8 8z"/><circle cx="8" cy="8" r="1.8"/><path d="M2.8 13.2 13.2 2.8"/>', 'Le constat ne sera plus proposé.'],
    ['plus-tard', 'plus tard', '<circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/>', 'La question attend.'],
    ['applique', 'appliqué', '<path d="m3 8.5 3.2 3.2L13 4.5"/>', 'L’écriture a réussi.'],
    ['defait', 'défait', '<path d="M5.5 3.5 2.5 6.5l3 3M2.5 6.5h7a4 4 0 0 1 0 8H7"/>', 'Le designer a fait Ctrl+Z.'],
    ['perime', 'analyse périmée', '<path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.3v3h-3"/>', 'Le composant a changé depuis l’analyse.'],
    ['information', 'information', '<circle cx="8" cy="8" r="5.8"/><path d="M8 7.2v4.2"/><circle cx="8" cy="4.8" r=".6" fill="currentColor" stroke="none"/>', 'Ce que l’analyse n’a pas mesuré ; aucun geste attendu.'],
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
  ...famille('verdict-palettes', [
    ['butee', 'butée', '<path d="M2.5 8h9M12.5 3.5v9"/>', 'Une valeur qui s’arrête sur la borne que le calcul de la palette impose.'],
    ['reference', 'référence', '<path d="M8 2.2 13.8 8 8 13.8 2.2 8z" fill="currentColor"/>', 'La couleur de référence de la palette, à son cran.'],
    ['confondus', 'presque identiques', '<path d="M2 6.2q1.5-2 3 0t3 0 3 0 3 0M2 10.8q1.5-2 3 0t3 0 3 0 3 0"/>', 'Soft et Vivid se confondent à un cran.'],
  ]),
  ...pictogrammes,
  ...famille('interface', [
    ['chevron', 'chevron', '<path d="M4 6 8 10 12 6"/>', 'Un tracé qui pointe vers le bas ; le lecteur le tourne pour les trois autres sens.'],
    ['fermer', 'fermer', '<path d="M4.8 4.8l6.4 6.4M11.2 4.8l-6.4 6.4"/>', 'Ferme le panneau, le message ou la fenêtre.'],
    ['lien-externe', 'lien externe', '<path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3"/>', 'Ouvre une page hors du plugin.'],
    ['reglages', 'réglages', ENGRENAGE, 'Ouvre la configuration du plugin.'],
    ['poignee', 'poignée de taille', '<path d="M15 6 L6 15 M15 11 L11 15"/>', 'Coin que le designer tire pour changer la taille de la fenêtre.'],
    ['loupe', 'loupe', '<circle cx="6.8" cy="6.8" r="4.9"/><path d="m10.5 10.5 4.3 4.3"/>', 'Recherche.'],
    ['tout-replier', 'tout replier', '<path d="M4 2.5l4 3.5 4-3.5M4 13.5l4-3.5 4 3.5"/>', 'Replie toutes les sections sauf celle qui est ouverte.'],
    ['panneau-lateral', 'panneau latéral', '<rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><path d="M10 2.5v11"/>', 'Montre ou masque le panneau latéral.'],
    ['synchroniser', 'synchroniser', '<path d="M13.5 6.5A5.5 5.5 0 0 0 3.2 5M2.5 2.5v2.7h2.7M2.5 9.5A5.5 5.5 0 0 0 12.8 11M13.5 13.5v-2.7h-2.7"/>', 'Relit l’état de Figma.'],
    ['menu', 'menu', '<circle cx="3" cy="8" r=".9" fill="currentColor"/><circle cx="8" cy="8" r=".9" fill="currentColor"/><circle cx="13" cy="8" r=".9" fill="currentColor"/>', 'Ouvre les autres actions d’une ligne.'],
    ['ajouter', 'ajouter', '<path d="M8 3v10M3 8h10"/>', 'Ajoute un élément.'],
    ['retirer', 'retirer', '<path d="M3 8h10"/>', 'Retire un élément.'],
    ['avant-apres', 'avant, après', '<path d="M3.2 8h8.8M8.8 4.8 12 8l-3.2 3.2"/>', 'Va d’une valeur d’avant à la valeur d’après.'],
    ['separateur', 'séparateur de chemin', '<path d="m6 3.5 4.5 4.5L6 12.5"/>', 'Sépare deux niveaux d’un chemin.'],
    ['vide', 'vide', '<path d="M8 1.5 14.5 8 8 14.5 1.5 8z" stroke-dasharray="1.1 1.1"/>', 'Rien à montrer dans cette vue.'],
  ]).map((signe) => (signe.id === 'reglages' ? { ...signe, grille: 512 } : signe)),
];

/**
 * Comment le socle pose les icônes d’alerte. Leurs formes restent dans `packages/plugin-socle/src/ui/Alerte.ts`, car la forme dit un type
 * d’alerte (`TYPES_D_ALERTE`) et non un objet ; le kit documente seulement leur pose.
 */
export const POSE_DES_ALERTES: PoseDeFamille = {
  fonction:
    '`creerIcone(type)` pose l’icône dans un élément DOM ; `svgDeLAlerte(type, taille)` rend le même SVG en texte pour un rendu sans document, comme le hub ; `creerGravite(type)` pose l’icône avec le mot du type. Pour une sortie texte, `texteDuType(type, sortie)` rend le repli de `TYPES_D_ALERTE`.',
  tailles: '12 px, la taille de `creerIcone` et de `svgDeLAlerte` par défaut ; `svgDeLAlerte` accepte une autre taille.',
  teinte: 'La couleur vient du type (`poserTon`) : une alerte est toujours teintée. L’encre du trait et du point est `--texte-sur-ton`.',
  nom: 'L’icône est décorative (`aria-hidden`) : le mot du type (« Bloquant », « À corriger »…) porte le sens, jamais la couleur ni la forme seules.',
};

const GLYPHES_DES_SIGNES: Readonly<Record<string, string>> = {
  fermer: '×',
  'avant-apres': '→',
  menu: '⋯',
  ajouter: '+',
  retirer: '−',
  separateur: '›',
  ecart: '≠',
  butee: '⊣',
  reference: '◆',
  confondus: '≈',
};

export const SIGNES: readonly SigneDuLangage[] = SIGNES_SANS_EMPLOI.map((signe) => {
  const emploi = EMPLOIS[signe.id];
  if (!emploi) throw new Error(`Le signe « ${signe.id} » n’a pas d’emploi : ajouter son entrée à EMPLOIS.`);
  const glyphe = GLYPHES_DES_SIGNES[signe.id];
  return glyphe === undefined ? { ...signe, emploi } : { ...signe, emploi, glyphe };
});

/** Les signes qu’une famille montre sans les définir : la définition reste dans leur famille d’origine. */
export const REPRISES_DE_SIGNES: readonly RepriseDeSigne[] = [
  {
    famille: 'property',
    reprend: [
      { id: 'type-boolean', libelle: 'boolean property', emploi: 'Une property booléenne de composant. Pour une property de variant, prendre `prop-variant`.' },
      { id: 'text', libelle: 'text property', emploi: 'Une property texte de composant. Pour une property booléenne, prendre `type-boolean`.' },
      { id: 'slot', libelle: 'slot property', emploi: 'Une property slot de composant. Pour une property d’échange d’instance, prendre `prop-swap`.' },
    ],
  },
  {
    famille: 'regles',
    reprend: [
      { id: 'prop-variant', libelle: '@prop', emploi: 'Le tag @prop, qui décrit une property de variant. Pour une property booléenne, prendre `type-boolean`.' },
      { id: 'type-boolean', libelle: '@boolean', emploi: 'Le tag @boolean, qui décrit une property booléenne. Pour une property de variant, prendre `prop-variant`.' },
    ],
  },
  { famille: 'usage-couleur', reprend: [{ id: 'type-color', libelle: 'Couleurs', emploi: 'La rubrique des couleurs d’un composant. Pour l’usage d’une couleur, prendre le signe de cet usage.' }] },
  { famille: 'proposition', reprend: [{ id: 'a-creer', libelle: 'préparation', emploi: 'La proposition de préparation, où le plugin crée la variable. Pour une variable à ajouter dans une liste, prendre `ajouter`.' }] },
  {
    famille: 'type-de-terme',
    reprend: [
      { id: 'palette', libelle: 'palette', emploi: 'Un terme de Nomenclature qui désigne une palette. Pour un terme qui désigne un composant, prendre `component`.' },
      { id: 'component', libelle: 'composant', emploi: 'Un terme de Nomenclature qui désigne un composant. Pour un terme qui désigne une palette, prendre `palette`.' },
      { id: 'question', libelle: 'à trancher', emploi: 'Un terme que le designer doit trancher, en ambre : la teinte vient du lecteur, pas du tracé. Pour un terme conforme, prendre `applique`.' },
      { id: 'applique', libelle: 'conforme', emploi: 'Un terme qui suit déjà sa règle. Pour un terme à remplacer, prendre `remplace`.' },
    ],
  },
  { famille: 'interface', reprend: [{ id: 'ecart', libelle: 'différent', emploi: 'Dire que deux valeurs sont différentes, en caractère (`creerGlyphe`). Pour un constat de rendu avec Figma, prendre `ecart` dans sa famille « État d’un token ».' }] },
  { famille: 'palettes', reprend: [{ id: 'mode', libelle: 'Light, Dark', emploi: 'Les modes Light et Dark d’une palette. Pour les modes d’une collection de variables, prendre `mode` dans « État d’un token ».' }] },
  {
    famille: 'rubrique-tokens',
    reprend: [
      { id: 'a-creer', libelle: 'Variables manquantes', emploi: 'La rubrique des variables que la préparation créera. Pour une variable à ajouter dans une liste, prendre `ajouter`.' },
      { id: 'cran', libelle: 'Crans', emploi: 'La rubrique des crans de palette. Pour un cran seul, prendre `cran` dans « Palettes ».' },
      { id: 'rompue', libelle: 'Alias', emploi: 'La rubrique des alias, où se lisent les chaînes rompues. Pour une chaîne seule, prendre `rompue`.' },
      { id: 'mode', libelle: 'Modes', emploi: 'La rubrique des modes d’une collection. Pour un mode seul, prendre `mode` dans « État d’un token ».' },
      { id: 'scope', libelle: 'Scopes', emploi: 'La rubrique des scopes d’une variable. Pour un scope seul, prendre `scope` dans « État d’un token ».' },
    ],
  },
];

/** Le SVG complet d’un signe, prêt à poser dans une tuile. Lève une erreur pour un identifiant inconnu. */
export function svgDuSigne(id: string, taille = 16): string {
  const signe = SIGNES.find((candidat) => candidat.id === id);
  if (!signe) throw new Error(`Signe inconnu : « ${id} ». Les identifiants admis sont ceux de SIGNES.`);
  const largeur = signe.grille ?? 16;
  const hauteur = signe.hauteur ?? largeur;
  const hauteurRendue = Math.round(((taille * hauteur) / largeur) * 100) / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largeur} ${hauteur}" width="${taille}" height="${hauteurRendue}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${signe.trace}</svg>`;
}

/** Le caractère qu’un texte écrit à la place du signe. Lève une erreur pour un signe sans glyphe. */
export function glypheDuSigne(id: string): string {
  const glyphe = SIGNES.find((candidat) => candidat.id === id)?.glyphe;
  if (glyphe === undefined) throw new Error(`Le signe « ${id} » n’a pas de glyphe dans le kit.`);
  return glyphe;
}
