/**
 * La page du banc d'essai du moteur. Elle rejoue `construireModele` à chaque
 * réglage et dessine les composants avec les couleurs rendues. Ce qu'elle
 * garde dans le stockage local du navigateur (recette modifiée, essai, choix
 * d'affichage) n'est qu'une commodité : un stockage refusé laisse la page
 * fonctionner avec la recette de démonstration.
 */
import { CRANS, PROFILS } from '@ucm-kit/core/referentiel';
import releveBrut from 'ucm-couleur/tailwind-3.4.17.json';
import {
  atteintLeSeuil,
  boutsDe,
  ecrireContraste,
  prereglageTailwind,
  recetteAvecTexteDesBoutons,
  validerRecette,
  type Palette,
  type TexteDesBoutons,
} from 'ucm-couleur';
import {
  CONTOUR_DISCRET,
  ESSAI_VIDE,
  EXIGENCES_DU_KIT,
  MODES,
  USAGES,
  USAGES_DU_NEUTRE,
  VARIABLES_DU_BANC,
  construireModele,
  contraste,
  ecartOk,
  familleTailwindProche,
  harmonisation,
  jeuDuModele,
  lireHexa,
  lireRecette,
  recetteDeDemonstration,
  rgb8VersOklch,
  tableDuBanc,
  type CranDeTable,
  type Essai,
  type Intensite,
  type Jeu,
  type Mesure,
  type Mode,
  type Modele,
  type Neutre,
  type Recette,
  type ReleveTailwind,
  type Teinte,
  type VariableDuBanc,
} from '../modele/modele';

const RELEVE = releveBrut as ReleveTailwind;
const CLE_DU_STOCKAGE = 'ucm-banc-du-moteur';

type Theme = Mode | 'deux';
type Role = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
type Action = 'page' | 'surface';
type Nature = 'texte' | 'nonTexte';

const ROLES: readonly (readonly [Role, string, RegExp])[] = [
  ['primary', 'Marque', /^$/],
  ['neutral', 'Neutre', /slate|gr[ae]y|zinc|neutral|stone|titan|gris/i],
  ['success', 'Succès', /green|grass|emerald|lime|success|vert/i],
  ['warning', 'Avertissement', /amber|orange|yellow|sun|warning|jaune/i],
  ['danger', 'Danger', /red|poppy|danger|error|rouge|rose|crimson/i],
  ['info', 'Information', /sky|blue|cyan|info|bleu|azure/i],
];

type ProfilAffiche = (typeof PROFILS)[number];

interface Etat {
  theme: Theme;
  intensite: ProfilAffiche;
  mesures: boolean;
  action: Action;
  roles: { [R in Role]?: number };
  masquees: number[];
  essai: Essai;
}

interface Memoire {
  readonly etat?: Partial<Etat>;
  readonly recette?: string;
  readonly chargee?: string;
  readonly nom?: string;
}

const etat: Etat = { theme: 'deux', intensite: 'soft', mesures: false, action: 'page', roles: {}, masquees: [], essai: ESSAI_VIDE };
let recetteChargee: Recette = recetteDeDemonstration();
let nomDeLaRecette = 'Démonstration (six palettes au préréglage Tailwind)';
let recette: Recette = recetteChargee;
let modele: Modele;
let modeleDuKit: Modele | undefined;
let erreurDeReglage = '';

// --- Stockage -------------------------------------------------------------

function lireMemoire(): Memoire {
  try {
    const texte = window.localStorage.getItem(CLE_DU_STOCKAGE);
    return texte ? (JSON.parse(texte) as Memoire) : {};
  } catch {
    return {};
  }
}

function ecrireMemoire(): void {
  try {
    const memoire: Memoire = { etat, recette: JSON.stringify(recette), chargee: JSON.stringify(recetteChargee), nom: nomDeLaRecette };
    window.localStorage.setItem(CLE_DU_STOCKAGE, JSON.stringify(memoire));
  } catch {
    // Stockage refusé : la page garde son état en mémoire seulement.
  }
}

// --- Outils ---------------------------------------------------------------

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (texte: string): string => texte.replace(/[&<>"]/g, (c) => ESCAPES[c]);
const hx = (teinte: Teinte | undefined): string => (teinte ? teinte.hexa : 'transparent');
const fixe = (x: number, d = 3): string => x.toFixed(d).replace('.', ',');
const modesAffiches = (): readonly Mode[] => (etat.theme === 'deux' ? MODES : [etat.theme]);
const nomDuMode = (mode: Mode): string => (mode === 'light' ? 'Light' : 'Dark');
const nomDeLIntensite = (intensite: Intensite): string => ({ soft: 'Soft', vivid: 'Vivid', unique: 'Unique' })[intensite];
const visibles = () => modele.palettes.filter((palette) => !etat.masquees.includes(palette.rang));
const encreSur = (teinte: Teinte): string => (contraste(teinte.couleur, [255, 255, 255]) >= contraste(teinte.couleur, [0, 0, 0]) ? '#FFFFFF' : '#000000');

function neutreDuMode(mode: Mode): Neutre {
  return modele.neutres[mode] ?? {
    principal: { hexa: mode === 'light' ? '#000000' : '#FFFFFF', couleur: mode === 'light' ? [0, 0, 0] : [255, 255, 255] },
    desactive: {},
  };
}

// --- Mesures dans les composants ------------------------------------------

interface Prise {
  readonly nom: string;
  readonly premier?: Teinte;
  readonly fond?: Teinte;
  readonly nature?: Nature;
}

interface Jugement {
  readonly nom: string;
  readonly texte: string;
  readonly ok?: boolean;
  readonly titre: string;
}

function juger(prise: Prise): Jugement {
  if (!prise.premier || !prise.fond) return { nom: prise.nom, texte: 'absent', titre: `${prise.nom} : cran absent de la liste des nuances` };
  const ratio = contraste(prise.premier.couleur, prise.fond.couleur);
  const seuil = prise.nature ? recette.seuils[prise.nature] : undefined;
  const ok = seuil === undefined ? undefined : atteintLeSeuil(ratio, seuil);
  const exigence = seuil === undefined ? 'sans seuil' : `seuil ${ecrireContraste(seuil)}`;
  return { nom: prise.nom, texte: ecrireContraste(ratio), ...(ok === undefined ? {} : { ok }), titre: `${prise.nom} : ${prise.premier.hexa} sur ${prise.fond.hexa}, ${ecrireContraste(ratio)} (${exigence})` };
}

/** Un composant et ses contrastes : une pastille par mesure quand « Mesures » est cochée, et toujours pour un échec. */
function cellule(contenu: string, prises: readonly Prise[], legende = ''): string {
  const jugements = prises.map(juger);
  const echec = jugements.some((jugement) => jugement.ok === false);
  const pastilles = jugements
    .filter((jugement) => etat.mesures || jugement.ok === false)
    .map((jugement) => `<i class="pastille ${jugement.ok === false ? 'ko' : jugement.ok ? 'ok' : 'info'}" title="${esc(jugement.titre)}">${esc(jugement.nom)} ${jugement.texte}</i>`)
    .join('');
  return `<div class="cellule${echec ? ' echec' : ''}">${contenu}${legende ? `<span class="legende">${esc(legende)}</span>` : ''}${pastilles ? `<span class="pastilles">${pastilles}</span>` : ''}</div>`;
}

// --- Icônes ---------------------------------------------------------------

const ICONES = {
  info: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 9v5M10 6v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  succes: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 10.2l2.4 2.4 4.6-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  alerte: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3l8 14H2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 8v4M10 14.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  fleche: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  coche: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  fermer: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
} as const;

// --- Composants -----------------------------------------------------------

type Variante = 'contained' | 'outlined' | 'text';
const VARIANTES: readonly Variante[] = ['contained', 'outlined', 'text'];
const ETATS_DU_BOUTON = [['default', 'Repos'], ['hover', 'Survol'], ['focus', 'Focus'], ['pressed', 'Appui'], ['disabled', 'Désactivé']] as const;
type EtatDuBouton = (typeof ETATS_DU_BOUTON)[number][0];

function desactive(jeu: Jeu, variable: VariableDuBanc): Teinte | undefined {
  const neutre = modele.neutres[jeu.mode];
  return (neutre?.desactive as Partial<Record<VariableDuBanc, Teinte>> | undefined)?.[variable] ?? jeu.v[variable];
}

function anneau(fond: Teinte, couleur: Teinte | undefined): string {
  return couleur ? `0 0 0 2px ${fond.hexa}, 0 0 0 4px ${couleur.hexa}` : '';
}

/**
 * Un bouton, selon la correspondance du Button d'UCM Tests : Contained sur
 * `solid`, Outlined sur `page` puis `solid` au survol et à l'appui, Text sur
 * `page` puis `surface`. `action` « surface » écrit le texte au repos en
 * `surface/foreground`, pour un bouton posé sur un fond teinté.
 */
function bouton(jeu: Jeu, variante: Variante, etatDuBouton: EtatDuBouton, fond: Teinte, libelle = 'Valider', action: Action = 'page'): string {
  const v = jeu.v;
  let arrierePlan: Teinte | undefined;
  let texte: Teinte | undefined;
  let contour: Teinte | undefined;
  const actif = etatDuBouton !== 'disabled';
  if (variante === 'contained') {
    arrierePlan = actif ? v[etatDuBouton === 'hover' ? 'solid/hover' : etatDuBouton === 'pressed' ? 'solid/pressed' : 'solid/default'] : desactive(jeu, 'disabled/background');
    texte = actif ? v['solid/foreground'] : desactive(jeu, 'disabled/foreground');
  } else if (variante === 'outlined') {
    if (etatDuBouton === 'hover' || etatDuBouton === 'pressed') {
      arrierePlan = v[etatDuBouton === 'hover' ? 'solid/hover' : 'solid/pressed'];
      texte = v['solid/foreground'];
    } else if (!actif) {
      contour = desactive(jeu, 'disabled/border');
      texte = desactive(jeu, 'disabled/foreground');
    } else {
      contour = v['page/border'];
      texte = v['page/foreground'];
    }
  } else if (etatDuBouton === 'hover' || etatDuBouton === 'pressed') {
    arrierePlan = v[etatDuBouton === 'hover' ? 'surface/hover' : 'surface/pressed'];
    texte = v['surface/foreground'];
  } else {
    texte = actif ? v[action === 'surface' ? 'surface/foreground' : 'page/foreground'] : desactive(jeu, 'disabled/foreground');
  }
  const ombres = [contour ? `inset 0 0 0 1px ${contour.hexa}` : '', etatDuBouton === 'focus' ? anneau(fond, v.ring) : ''].filter(Boolean).join(', ');
  const html = `<span class="bouton" style="background:${hx(arrierePlan)};color:${hx(texte)};${ombres ? `box-shadow:${ombres}` : ''}">${esc(libelle)}${ICONES.fleche}</span>`;
  const prises: Prise[] = [{ nom: 'texte', premier: texte, fond: arrierePlan ?? fond, ...(actif ? { nature: 'texte' as const } : {}) }];
  if (contour) prises.push({ nom: 'contour', premier: contour, fond, ...(actif ? { nature: 'nonTexte' as const } : {}) });
  if (etatDuBouton === 'focus') prises.push({ nom: 'anneau', premier: v.ring, fond, nature: 'nonTexte' });
  return cellule(html, prises);
}

function grilleDeBoutons(jeu: Jeu, fond: Teinte, etats: readonly (readonly [EtatDuBouton, string])[]): string {
  const entete = `<div></div>${etats.map(([, nom]) => `<div class="entete-colonne">${nom}</div>`).join('')}`;
  const lignes = VARIANTES.map((variante) => `<div class="entete-ligne">${variante}</div>${etats.map(([etatDuBouton]) => bouton(jeu, variante, etatDuBouton, fond)).join('')}`).join('');
  return `<div class="grille-boutons" style="grid-template-columns:auto repeat(${etats.length},minmax(0,1fr))">${entete}${lignes}</div>`;
}

type Statut = 'info' | 'succes' | 'alerte';

/** Une Alert : Filled sur `surface/default`, Outlined sur la page avec `page/border`. `contourDiscret` borde la Filled de `surface/divider`. */
function alerte(jeu: Jeu, variante: 'filled' | 'outlined', titre: string, texte: string, statut: Statut, options: { action?: Action; contourDiscret?: boolean; actionJeu?: Jeu } = {}): string {
  const v = jeu.v;
  const action = options.action ?? 'page';
  const filled = variante === 'filled';
  const fond = filled ? v['surface/default'] : jeu.page;
  const encre = filled ? v['surface/foreground'] : v['page/foreground'];
  const bord = filled ? (options.contourDiscret ? v[CONTOUR_DISCRET] : undefined) : v['page/border'];
  const jeuAction = options.actionJeu ?? jeu;
  const texteAction = jeuAction.v[filled && action === 'surface' ? 'surface/foreground' : 'page/foreground'];
  const style = `background:${hx(fond)};color:${hx(encre)};${bord ? `box-shadow:inset 0 0 0 1px ${bord.hexa}` : ''}`;
  const html = `<div class="alerte" style="${style}"><span class="icone">${ICONES[statut]}</span><div class="alerte-texte"><b>${esc(titre)}</b><span>${esc(texte)}</span></div><span class="alerte-action" style="color:${hx(texteAction)}">Action</span></div>`;
  const prises: Prise[] = [
    { nom: 'texte', premier: encre, fond, nature: 'texte' },
    { nom: 'action', premier: texteAction, fond, nature: 'texte' },
  ];
  if (bord) prises.push({ nom: 'contour', premier: bord, fond: filled ? fond : jeu.page, ...(filled ? {} : { nature: 'nonTexte' as const }) });
  return cellule(html, prises);
}

function etiquettes(jeu: Jeu, fond: Teinte): string {
  const v = jeu.v;
  return [
    cellule(`<span class="etiquette" style="background:${hx(v['surface/default'])};color:${hx(v['surface/foreground'])}">Payé</span>`, [{ nom: 'texte', premier: v['surface/foreground'], fond: v['surface/default'], nature: 'texte' }], 'douce'),
    cellule(`<span class="etiquette" style="background:${hx(v['surface/default'])};color:${hx(v['surface/foreground'])};box-shadow:inset 0 0 0 1px ${hx(v['surface/border'])}">Payé</span>`, [{ nom: 'contour', premier: v['surface/border'], fond: v['surface/default'], nature: 'nonTexte' }], 'bordée'),
    cellule(`<span class="etiquette" style="background:${hx(v['surface/default'])};color:${hx(v['surface/foreground'])};box-shadow:inset 0 0 0 1px ${hx(v[CONTOUR_DISCRET])}">Payé</span>`, [{ nom: 'contour', premier: v[CONTOUR_DISCRET], fond: v['surface/default'] }], 'contour discret (essai)'),
    cellule(`<span class="etiquette" style="background:${hx(v['solid/default'])};color:${hx(v['solid/foreground'])}">Nouveau</span>`, [{ nom: 'texte', premier: v['solid/foreground'], fond: v['solid/default'], nature: 'texte' }], 'pleine'),
    cellule(`<span class="compteur" style="background:${hx(v['solid/default'])};color:${hx(v['solid/foreground'])}">12</span>`, [{ nom: 'texte', premier: v['solid/foreground'], fond: v['solid/default'], nature: 'texte' }], 'compteur'),
    cellule(`<span class="point" style="background:${hx(v['solid/default'])}"></span><span>En ligne</span>`, [{ nom: 'point', premier: v['solid/default'], fond, nature: 'nonTexte' }], 'statut'),
  ].join('');
}

function puces(jeu: Jeu, fond: Teinte): string {
  const v = jeu.v;
  const puce = (arrierePlan: Teinte | undefined, texte: Teinte | undefined, contour: Teinte | undefined, legende: string, prises: Prise[]) =>
    cellule(`<span class="puce" style="background:${hx(arrierePlan)};color:${hx(texte)};${contour ? `box-shadow:inset 0 0 0 1px ${contour.hexa}` : ''}">${legende === 'sélectionnée' ? ICONES.coche : ''}Filtre</span>`, prises, legende);
  return [
    puce(undefined, v['page/foreground'], v['page/border'], 'repos', [{ nom: 'texte', premier: v['page/foreground'], fond, nature: 'texte' }, { nom: 'contour', premier: v['page/border'], fond, nature: 'nonTexte' }]),
    puce(v['surface/hover'], v['surface/foreground'], v['page/border'], 'survol', [{ nom: 'texte', premier: v['surface/foreground'], fond: v['surface/hover'], nature: 'texte' }]),
    puce(v['surface/default'], v['surface/foreground'], v['surface/border'], 'sélectionnée', [{ nom: 'texte', premier: v['surface/foreground'], fond: v['surface/default'], nature: 'texte' }, { nom: 'contour', premier: v['surface/border'], fond: v['surface/default'], nature: 'nonTexte' }]),
    puce(v['surface/pressed'], v['surface/foreground'], v['surface/border'], 'appuyée', [{ nom: 'texte', premier: v['surface/foreground'], fond: v['surface/pressed'], nature: 'texte' }, { nom: 'contour', premier: v['surface/border'], fond: v['surface/pressed'], nature: 'nonTexte' }]),
  ].join('');
}

/** Un champ de saisie posé sur la carte, bordé de `page/border`, avec l'anneau au focus. */
function champ(jeu: Jeu, neutre: Neutre, focus: boolean, libelle = 'Montant', valeur = '1 250,00 €'): string {
  const v = jeu.v;
  const carte = jeu.carte;
  return cellule(
    `<label class="champ"><span style="color:${hx(neutre.secondaire ?? neutre.principal)}">${esc(libelle)}</span><span class="saisie" style="background:${carte.hexa};color:${neutre.principal.hexa};box-shadow:inset 0 0 0 1px ${hx(v['page/border'])}${focus ? `, ${anneau(carte, v.ring)}` : ''}">${esc(valeur)}</span></label>`,
    [{ nom: 'contour', premier: v['page/border'], fond: carte, nature: 'nonTexte' }, ...(focus ? [{ nom: 'anneau', premier: v.ring, fond: carte, nature: 'nonTexte' as const }] : [])],
    focus ? 'champ au focus' : 'champ',
  );
}

function formulaire(jeu: Jeu, neutre: Neutre): string {
  const v = jeu.v;
  const carte = jeu.carte;
  const caseCochee = cellule(`<span class="case" style="background:${hx(v['solid/default'])};color:${hx(v['solid/foreground'])}">${ICONES.coche}</span><span>Accepté</span>`, [{ nom: 'case', premier: v['solid/default'], fond: carte, nature: 'nonTexte' }, { nom: 'coche', premier: v['solid/foreground'], fond: v['solid/default'], nature: 'nonTexte' }], 'case cochée');
  const caseVide = cellule(`<span class="case" style="box-shadow:inset 0 0 0 1.5px ${hx(v['page/border'])}"></span><span>Refusé</span>`, [{ nom: 'contour', premier: v['page/border'], fond: carte, nature: 'nonTexte' }], 'case vide');
  const radio = cellule(`<span class="radio" style="box-shadow:inset 0 0 0 1.5px ${hx(v['solid/default'])}"><span style="background:${hx(v['solid/default'])}"></span></span><span>Mensuel</span>`, [{ nom: 'radio', premier: v['solid/default'], fond: carte, nature: 'nonTexte' }], 'radio');
  const interrupteur = cellule(`<span class="interrupteur" style="background:${hx(v['solid/default'])}"><span style="background:${jeu.texteDesBoutons.hexa}"></span></span>`, [{ nom: 'piste', premier: v['solid/default'], fond: carte, nature: 'nonTexte' }, { nom: 'bouton', premier: jeu.texteDesBoutons, fond: v['solid/default'], nature: 'nonTexte' }], 'interrupteur');
  const lien = cellule(`<span class="lien" style="color:${hx(v['page/foreground'])}">Voir le détail</span>`, [{ nom: 'lien', premier: v['page/foreground'], fond: carte, nature: 'texte' }], 'lien sur la carte');
  const progression = cellule(`<span class="progression" style="background:${hx(v['surface/default'])}"><span style="background:${hx(v['solid/default'])}"></span></span>`, [{ nom: 'barre', premier: v['solid/default'], fond: v['surface/default'], nature: 'nonTexte' }], 'progression');
  return [champ(jeu, neutre, false), champ(jeu, neutre, true), caseCochee, caseVide, radio, interrupteur, lien, progression].join('');
}

function navigation(jeu: Jeu, neutre: Neutre): string {
  const v = jeu.v;
  const onglets = cellule(
    `<div class="onglets" style="box-shadow:inset 0 -1px 0 ${hx(v['page/divider'])}"><span style="color:${hx(v['page/foreground'])};box-shadow:inset 0 -2px 0 ${hx(v['solid/default'])}">Comptes</span><span style="color:${hx(neutre.secondaire ?? neutre.principal)}">Cartes</span><span style="color:${hx(neutre.secondaire ?? neutre.principal)}">Virements</span></div>`,
    [{ nom: 'actif', premier: v['page/foreground'], fond: jeu.page, nature: 'texte' }, { nom: 'trait', premier: v['solid/default'], fond: jeu.page, nature: 'nonTexte' }],
    'onglets',
  );
  const bandeau = cellule(
    `<div class="bandeau" style="background:${hx(v['solid/default'])};color:${hx(v['solid/foreground'])}"><span>Virement envoyé.</span><u>Annuler</u>${ICONES.fermer}</div>`,
    [{ nom: 'texte', premier: v['solid/foreground'], fond: v['solid/default'], nature: 'texte' }],
    'bandeau plein',
  );
  const carteTeintee = cellule(
    `<div class="carte-teintee" style="background:${jeu.carte.hexa}"><div style="background:${hx(v['surface/default'])};color:${hx(v['surface/foreground'])};box-shadow:inset 0 -1px 0 ${hx(v[CONTOUR_DISCRET])}">Offre Premium</div><p style="color:${neutre.principal.hexa}">Trois mois offerts.</p><p class="filet" style="background:${hx(v['page/divider'])}"></p><span class="lien" style="color:${hx(v['page/foreground'])}">En savoir plus</span></div>`,
    [{ nom: 'en-tête', premier: v['surface/foreground'], fond: v['surface/default'], nature: 'texte' }, { nom: 'filet', premier: v[CONTOUR_DISCRET], fond: v['surface/default'] }, { nom: 'lien', premier: v['page/foreground'], fond: jeu.carte, nature: 'texte' }],
    'carte à en-tête teinté',
  );
  return [onglets, bandeau, carteTeintee].join('');
}

function panneauDeComposants(jeu: Jeu): string {
  const neutre = neutreDuMode(jeu.mode);
  const page = jeu.page;
  const carte = jeu.carte;
  const statut: Statut = /green|grass|success|vert|emerald|lime/i.test(jeu.palette.nom) ? 'succes' : /red|poppy|danger|amber|orange|warning|sun|yellow/i.test(jeu.palette.nom) ? 'alerte' : 'info';
  const vivid = jeu.intensite === 'soft' ? jeuDuModele(modele, jeu.palette.rang, 'vivid', jeu.mode) : undefined;
  return `<div class="panneau" style="background:${page.hexa};color:${neutre.principal.hexa}">
    <div class="titre-panneau">${nomDuMode(jeu.mode)} · ${nomDeLIntensite(jeu.intensite)}</div>
    <h4>Boutons sur la page</h4>${grilleDeBoutons(jeu, page, ETATS_DU_BOUTON)}
    <div class="zone-carte" style="background:${carte.hexa}"><h4>Boutons sur la carte</h4>${grilleDeBoutons(jeu, carte, [['default', 'Repos'], ['focus', 'Focus']])}</div>
    <h4>Alertes</h4>
    <div class="pile">
      ${alerte(jeu, 'filled', 'Filled, action en page/foreground', 'Le bouton Text garde sa couleur de page.', statut, { action: 'page' })}
      ${alerte(jeu, 'filled', 'Filled, action en surface/foreground', 'Le bouton Text prend le texte du fond teinté.', statut, { action: 'surface' })}
      ${vivid ? alerte(jeu, 'filled', 'Filled Soft, action Vivid', 'Une Alert Soft qui compose un Button Vivid.', statut, { action: 'page', actionJeu: vivid }) : ''}
      ${alerte(jeu, 'filled', 'Filled bordée de surface/divider (essai)', 'Le contour discret encadre le fond teinté.', statut, { contourDiscret: true })}
      ${alerte(jeu, 'outlined', 'Outlined', 'Texte et contour de page.', statut)}
    </div>
    <h4>Étiquettes</h4><div class="rangee">${etiquettes(jeu, page)}</div>
    <h4>Puces de filtre</h4><div class="rangee">${puces(jeu, page)}</div>
    <div class="zone-carte" style="background:${carte.hexa}"><h4>Formulaire sur la carte</h4><div class="rangee">${formulaire(jeu, neutre)}</div></div>
    <h4>Navigation et bandeaux</h4><div class="rangee">${navigation(jeu, neutre)}</div>
  </div>`;
}

function sectionComposants(): string {
  const blocs = visibles().map((palette) => {
    if (!palette.aDesDossiers) return `<div class="bloc-palette"><h3>${esc(palette.nom)}</h3><p class="note">Palette libre ou figée : elle n'a pas de variables de thème.</p></div>`;
    const intensite: Intensite = palette.intensites.includes(etat.intensite) ? etat.intensite : palette.intensites[0];
    const panneaux = modesAffiches().map((mode) => panneauDeComposants(jeuDuModele(modele, palette.rang, intensite, mode)!)).join('');
    return `<div class="bloc-palette"><h3><span class="echantillon" style="background:${palette.reference}"></span>${esc(palette.nom)} <small>${palette.reference} · ${nomDeLIntensite(intensite)}</small></h3><div class="panneaux">${panneaux}</div></div>`;
  });
  return `<section id="composants"><h2>Composants par palette</h2>
    <p class="aide">Chaque palette dessine les mêmes composants dans chaque thème affiché. Un composant entouré de rouge manque un seuil. Cochez « Mesures » pour lire tous les contrastes ; survolez une pastille pour la paire mesurée.</p>
    ${blocs.join('')}</section>`;
}

// --- Écran composé --------------------------------------------------------

function jeuDuRole(role: Role, mode: Mode): Jeu | undefined {
  const rang = etat.roles[role];
  return rang === undefined ? undefined : jeuDuModele(modele, rang, etat.intensite, mode);
}

function ecran(mode: Mode): string {
  const marque = jeuDuRole('primary', mode);
  const gris = jeuDuRole('neutral', mode) ?? marque;
  if (!marque || !gris) return '<p class="note">Choisissez au moins la palette de marque dans les réglages.</p>';
  const neutre = neutreDuMode(mode);
  const page = marque.page;
  const carte = marque.carte;
  const subtil = neutre.secondaire ?? neutre.principal;
  const statuts: readonly (readonly [Role, string, string, Statut])[] = [
    ['success', 'Virement envoyé', 'Le bénéficiaire le recevra demain.', 'succes'],
    ['warning', 'Plafond presque atteint', 'Il reste 120 € ce mois-ci.', 'alerte'],
    ['danger', 'Paiement refusé', 'La carte a expiré le 30 septembre.', 'alerte'],
    ['info', 'Nouveau relevé', 'Votre relevé d’octobre est disponible.', 'info'],
  ];
  const alertes = statuts.map(([role, titre, texte, icone]) => {
    const jeu = jeuDuRole(role, mode);
    return jeu ? alerte(jeu, 'filled', titre, texte, icone, { action: etat.action }) : '';
  }).join('');
  const lignes = [['Loyer', '−950,00 €', 'success', 'Payé'], ['Abonnement', '−12,99 €', 'warning', 'En attente'], ['Remboursement', '+45,00 €', 'info', 'Reçu'], ['Achat en ligne', '−89,90 €', 'danger', 'Refusé']] as const;
  const tableau = lignes.map(([libelle, montant, role, etiquette]) => {
    const jeu = jeuDuRole(role, mode);
    const badge = jeu
      ? cellule(`<span class="etiquette" style="background:${hx(jeu.v['surface/default'])};color:${hx(jeu.v['surface/foreground'])}">${etiquette}</span>`, [{ nom: 'texte', premier: jeu.v['surface/foreground'], fond: jeu.v['surface/default'], nature: 'texte' }])
      : '';
    return `<tr style="box-shadow:inset 0 -1px 0 ${hx(gris.v['page/divider'])}"><td>${libelle}</td><td style="color:${subtil.hexa}">22 oct.</td><td class="montant">${montant}</td><td>${badge}</td></tr>`;
  }).join('');
  const nav = ['Comptes', 'Cartes', 'Virements', 'Épargne'].map((item, rang) => `<span style="${rang === 0 ? `box-shadow:inset 0 -2px 0 ${marque.texteDesBoutons.hexa}` : 'opacity:.85'}">${item}</span>`).join('');
  return `<div class="ecran" style="background:${page.hexa};color:${neutre.principal.hexa}">
    <header style="background:${hx(marque.v['solid/default'])};color:${hx(marque.v['solid/foreground'])}"><b>Banque</b><nav>${nav}</nav></header>
    <div class="ecran-corps">
      <div class="ecran-carte" style="background:${carte.hexa}">
        <h3>Nouveau virement</h3>
        <div class="rangee">${champ(gris, neutre, false, 'Bénéficiaire', 'Camille Martin')}${champ(marque, neutre, true)}</div>
        <p style="color:${subtil.hexa}">Les virements de plus de 1 000 € demandent une confirmation.</p>
        <div class="rangee">${bouton(marque, 'contained', 'default', carte, 'Envoyer')}${bouton(gris, 'outlined', 'default', carte, 'Brouillon')}${bouton(marque, 'text', 'default', carte, 'Annuler')}</div>
      </div>
      <div class="pile">${alertes}</div>
      <div class="ecran-carte" style="background:${carte.hexa}"><h3>Dernières opérations</h3><table>${tableau}</table></div>
    </div>
  </div>`;
}

function sectionEcran(): string {
  const choix = ROLES.map(([role, nom]) => {
    const rang = etat.roles[role];
    return `<span>${nom} : <b>${rang === undefined ? 'aucune' : esc(modele.palettes[rang]?.nom ?? '?')}</b></span>`;
  }).join(' · ');
  return `<section id="ecran"><h2>Écran composé</h2>
    <p class="aide">Une page d'application qui mêle les palettes selon leur rôle : ${choix}. Les rôles et l'action des alertes se règlent dans le panneau de gauche.</p>
    <div class="panneaux">${modesAffiches().map(ecran).join('')}</div></section>`;
}

// --- Bilan et matrices ----------------------------------------------------

function mesuresAffichees(source: Modele = modele): Mesure[] {
  const modes = modesAffiches();
  return source.mesures.filter((mesure) => modes.includes(mesure.mode) && !etat.masquees.includes(mesure.palette));
}

function compter(mesures: readonly Mesure[], garanties: boolean): { manquees: number; jugees: number } {
  const retenues = mesures.filter((mesure) => mesure.regle.startsWith('G') === garanties && mesure.seuil !== undefined);
  return { manquees: retenues.filter((mesure) => mesure.tenue === false).length, jugees: retenues.length };
}

function descriptionDeLEssai(): string[] {
  const lignes: string[] = [];
  const modifiees = MODES.flatMap((mode) => Object.keys(etat.essai.table[mode] ?? {}).map((variable) => `${variable} en ${nomDuMode(mode)}`));
  if (modifiees.length) lignes.push(`crans modifiés : ${modifiees.join(', ')}`);
  if (!etat.essai.exigences.fondsSurvoles) lignes.push('fonds survolés non jugés');
  if (!etat.essai.exigences.fondsAppuyes) lignes.push('fonds appuyés non jugés');
  return lignes;
}

function sectionBilan(): string {
  const mesures = mesuresAffichees();
  const garanties = compter(mesures, true);
  const usages = compter(mesures, false);
  const essai = descriptionDeLEssai();
  const comparaison = essai.length && modeleDuKit
    ? `<p class="essai">Essai en cours (${esc(essai.join(' ; '))}). Avec les règles du kit : ${compter(mesuresAffichees(modeleDuKit), true).manquees} garanties manquées.</p>`
    : '';
  const parPalette = visibles().filter((palette) => palette.aDesDossiers).map((palette) => {
    const siennes = mesures.filter((mesure) => mesure.palette === palette.rang);
    const g = compter(siennes, true);
    const u = compter(siennes, false);
    return `<a class="carte-bilan${g.manquees ? ' ko' : ''}" href="#rampe-${palette.rang}"><span class="echantillon" style="background:${palette.reference}"></span><b>${esc(palette.nom)}</b><span>${g.manquees} / ${g.jugees} garanties manquées</span><span>${u.manquees} usages sous le seuil</span></a>`;
  }).join('');
  const echecs = mesures.filter((mesure) => mesure.tenue === false).sort((a, b) => a.regle.localeCompare(b.regle) || a.ratio - b.ratio);
  const lignes = echecs.slice(0, 80).map((mesure) => `<tr><td><b>${mesure.regle}</b></td><td>${esc(mesure.libelle)}</td><td>${esc(modele.palettes[mesure.palette].nom)}</td><td>${nomDeLIntensite(mesure.intensite)} · ${nomDuMode(mesure.mode)}</td><td>${paire(mesure)}</td><td class="ko">${ecrireContraste(mesure.ratio)} / ${ecrireContraste(mesure.seuil!)}</td></tr>`).join('');
  return `<section id="bilan"><h2>Bilan</h2>
    <div class="chiffres"><div><b>${garanties.manquees}</b> garanties manquées sur ${garanties.jugees}</div><div><b>${usages.manquees}</b> usages non garantis sous le seuil sur ${usages.jugees}</div><div>Seuils : texte ${ecrireContraste(recette.seuils.texte)}, hors texte ${ecrireContraste(recette.seuils.nonTexte)}</div></div>
    ${comparaison}
    <div class="cartes-bilan">${parPalette}</div>
    ${echecs.length ? `<details ${echecs.length <= 20 ? 'open' : ''}><summary>${echecs.length} mesures sous le seuil</summary><table class="liste">${lignes}</table>${echecs.length > 80 ? `<p class="note">Et ${echecs.length - 80} autres : voir les matrices.</p>` : ''}</details>` : '<p class="note">Aucune mesure sous le seuil dans les thèmes affichés.</p>'}
  </section>`;
}

function paire(mesure: Mesure): string {
  const pastille = (teinte: Teinte) => `<span class="mini" style="background:${teinte.hexa}"></span>`;
  return `${pastille(mesure.premier.teinte)}${esc(mesure.premier.nom)} sur ${pastille(mesure.second.teinte)}${esc(mesure.second.nom)}`;
}

function matrice(filtre: (mesure: Mesure) => boolean): string {
  const mesures = mesuresAffichees().filter(filtre);
  const colonnes: string[] = [];
  const titres = new Map<string, Mesure>();
  for (const mesure of mesures) {
    const colonne = `${mesure.mode}/${mesure.cle.split('/').slice(3).join('/')}`;
    if (!titres.has(colonne)) {
      titres.set(colonne, mesure);
      colonnes.push(colonne);
    }
  }
  const index = new Map(mesures.map((mesure) => [mesure.cle, mesure]));
  const lignes = visibles().filter((palette) => palette.aDesDossiers).flatMap((palette) => palette.intensites.map((intensite) => {
    const cellules = colonnes.map((colonne) => {
      const [mode, ...reste] = colonne.split('/');
      const mesure = index.get(`${palette.rang}/${intensite}/${mode}/${reste.join('/')}`);
      if (!mesure) return '<td class="vide"></td>';
      const classe = mesure.tenue === false ? 'ko' : mesure.tenue ? 'ok' : 'info';
      return `<td class="${classe}" title="${esc(`${mesure.libelle} : ${mesure.premier.nom} ${mesure.premier.teinte.hexa} sur ${mesure.second.nom} ${mesure.second.teinte.hexa}`)}"><span class="mini" style="background:${mesure.premier.teinte.hexa}"></span><span class="mini" style="background:${mesure.second.teinte.hexa}"></span>${ecrireContraste(mesure.ratio)}</td>`;
    }).join('');
    return `<tr><th>${esc(palette.nom)} <small>${nomDeLIntensite(intensite)}</small></th>${cellules}</tr>`;
  }));
  const entete = colonnes.map((colonne) => {
    const mesure = titres.get(colonne)!;
    return `<th title="${esc(mesure.libelle)}"><span class="mode-${mesure.mode}">${nomDuMode(mesure.mode)}</span><b>${mesure.regle}</b>${esc(mesure.premier.nom.replace(' (Vivid)', ''))}<br>sur ${esc(mesure.second.nom.replace(' (Soft)', ''))}</th>`;
  }).join('');
  return `<div class="defilement"><table class="matrice"><thead><tr><th></th>${entete}</tr></thead><tbody>${lignes.join('')}</tbody></table></div>`;
}

function sectionGaranties(): string {
  const exigences = etat.essai.exigences;
  return `<section id="garanties"><h2>Garanties du kit</h2>
    <p class="aide">Les sept garanties de <code>@ucm-kit/core/emplois</code>, une colonne par fond. ${exigences.fondsSurvoles ? '' : 'Les fonds survolés ne sont pas jugés. '}${exigences.fondsAppuyes ? '' : 'Les fonds appuyés ne sont pas jugés. '}Survolez une case pour la paire mesurée.</p>
    ${matrice((mesure) => mesure.regle.startsWith('G'))}</section>`;
}

function sectionUsages(): string {
  const liste = [...USAGES.map((usage) => `<li><b>${usage.id}</b> ${esc(usage.libelle)} : <code>${usage.premier}</code> sur <code>${usage.fond}</code>${usage.seuil ? ` (seuil ${usage.seuil === 'texte' ? 'texte' : 'hors texte'})` : ' (sans seuil)'}</li>`), ...USAGES_DU_NEUTRE.map((usage) => `<li><b>${usage.id}</b> ${esc(usage.libelle)}${usage.seuil ? ' (seuil texte)' : ' (sans seuil : WCAG exempte les éléments désactivés)'}</li>`)].join('');
  return `<section id="usages"><h2>Usages non garantis</h2>
    <p class="aide">Les paires que les composants posent et qu'aucune garantie du kit ne juge. Un échec ici signale une règle à ajouter, ou un composant à mapper autrement.</p>
    <details><summary>Les usages mesurés</summary><ul class="usages">${liste}</ul></details>
    ${matrice((mesure) => !mesure.regle.startsWith('G'))}</section>`;
}

// --- Harmonisation --------------------------------------------------------

function courbe(series: readonly { readonly couleur: string; readonly nom: string; readonly valeurs: readonly number[]; readonly hexas: readonly string[] }[], crans: readonly number[], max: number, titre: string, format: (x: number) => string): string {
  const largeur = 520;
  const hauteur = 200;
  const marge = { g: 40, d: 10, h: 14, b: 26 };
  const x = (rang: number) => marge.g + (rang * (largeur - marge.g - marge.d)) / Math.max(1, crans.length - 1);
  const y = (valeur: number) => hauteur - marge.b - (valeur / max) * (hauteur - marge.h - marge.b);
  const graduations = [0, 0.25, 0.5, 0.75, 1].map((part) => `<line x1="${marge.g}" x2="${largeur - marge.d}" y1="${y(part * max)}" y2="${y(part * max)}" class="grad"/><text x="${marge.g - 4}" y="${y(part * max) + 3}" text-anchor="end">${format(part * max)}</text>`).join('');
  const abscisses = crans.map((cran, rang) => `<text x="${x(rang)}" y="${hauteur - 8}" text-anchor="middle">${cran}</text>`).join('');
  const lignes = series.map((serie) => `<polyline fill="none" stroke="${serie.couleur}" stroke-width="2" points="${serie.valeurs.map((valeur, rang) => `${x(rang)},${y(valeur)}`).join(' ')}"/>${serie.valeurs.map((valeur, rang) => `<circle cx="${x(rang)}" cy="${y(valeur)}" r="3.5" fill="${serie.hexas[rang]}" stroke="${serie.couleur}"><title>${esc(serie.nom)} ${crans[rang]} : ${format(valeur)} (${serie.hexas[rang]})</title></circle>`).join('')}`).join('');
  return `<figure class="courbe"><figcaption>${esc(titre)}</figcaption><svg viewBox="0 0 ${largeur} ${hauteur}" role="img" aria-label="${esc(titre)}">${graduations}${abscisses}${lignes}</svg></figure>`;
}

function mediane(valeurs: readonly number[]): number {
  const triees = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(triees.length / 2);
  return triees.length % 2 ? triees[milieu] : (triees[milieu - 1] + triees[milieu]) / 2;
}

function sectionHarmonisation(): string {
  const crans = modele.recette.crans;
  const rangDu500 = Math.max(0, crans.indexOf(500));
  const blocs = modesAffiches().map((mode) => {
    const lignes = harmonisation(modele, etat.intensite, mode).map((ligne) => ({ ...ligne, lectures: ligne.lectures.filter((lecture) => !etat.masquees.includes(lecture.palette)) }));
    if (!lignes.length || !lignes[0].lectures.length) return '';
    const palettes = lignes[0].lectures.map((lecture) => lecture.palette);
    const series = (cle: 'C' | 'L') => palettes.map((rang, k) => ({
      nom: modele.palettes[rang].nom,
      couleur: lignes[rangDu500].lectures[k].hexa,
      valeurs: lignes.map((ligne) => ligne.lectures[k][cle]),
      hexas: lignes.map((ligne) => ligne.lectures[k].hexa),
    }));
    const maxC = Math.max(0.05, ...lignes.flatMap((ligne) => ligne.lectures.map((lecture) => lecture.C))) * 1.1;
    const tableau = lignes.map((ligne) => {
      const mC = mediane(ligne.lectures.map((lecture) => lecture.C));
      const mL = mediane(ligne.lectures.map((lecture) => lecture.L));
      const cellules = ligne.lectures.map((lecture) => {
        const pale = mC > 0.01 && lecture.C < mC * 0.65;
        const vive = mC > 0.01 && lecture.C > mC * 1.6;
        const decalee = Math.abs(lecture.L - mL) > 0.025;
        const marques = [pale ? 'pâle' : '', vive ? 'vive' : '', decalee ? (lecture.L > mL ? 'plus claire' : 'plus sombre') : ''].filter(Boolean);
        return `<td class="${marques.length ? 'ecart' : ''}"><span class="nuance" style="background:${lecture.hexa};color:${encreSur({ hexa: lecture.hexa, couleur: lireHexa(lecture.hexa)! })}">${lecture.hexa}</span><span>L ${fixe(lecture.L)} · C ${fixe(lecture.C)}</span>${marques.length ? `<em>${marques.join(', ')}</em>` : ''}</td>`;
      }).join('');
      return `<tr><th>${ligne.cran}<small>méd. L ${fixe(mL)} · C ${fixe(mC)}</small></th>${cellules}</tr>`;
    }).join('');
    const entete = palettes.map((rang) => `<th>${esc(modele.palettes[rang].nom)}</th>`).join('');
    return `<div class="bloc-harmonisation"><h3>${nomDuMode(mode)} · ${nomDeLIntensite(etat.intensite)}</h3>
      <div class="courbes">${courbe(series('C'), crans, maxC, 'Chroma OKLCH par cran', (x) => fixe(x, 3))}${courbe(series('L'), crans, 1, 'Clarté OKLCH par cran', (x) => fixe(x, 2))}</div>
      <div class="defilement"><table class="harmonisation"><thead><tr><th>Cran</th>${entete}</tr></thead><tbody>${tableau}</tbody></table></div></div>`;
  }).join('');
  return `<section id="harmonisation"><h2>Harmonisation entre palettes</h2>
    <p class="aide">Les palettes colorées d'une même intensité, cran par cran ; les palettes grises n'y entrent pas. Une case marquée s'écarte de la médiane du cran : chroma sous 65 % (pâle) ou au-dessus de 160 % (vive), clarté à plus de 0,025 (plus claire ou plus sombre). C'est ici que se voit un fond d'Alert plus fade que les autres.</p>
    ${blocs}</section>`;
}

// --- Rampes ---------------------------------------------------------------

function tailwindEnDark(rampe: readonly string[], courbeDark: readonly number[]): string[] {
  const clartes = rampe.map((hexa) => rgb8VersOklch(lireHexa(hexa)!).L);
  return courbeDark.map((cible) => {
    let proche = 0;
    clartes.forEach((clarte, rang) => {
      if (Math.abs(clarte - cible) < Math.abs(clartes[proche] - cible)) proche = rang;
    });
    return rampe[proche];
  });
}

function bandeDeNuances(hexas: readonly string[], crans: readonly number[], options: { ancre?: number; titre: (rang: number) => string; ecarts?: readonly number[] }): string {
  return `<div class="bande">${hexas.map((hexa, rang) => {
    const encre = encreSur({ hexa, couleur: lireHexa(hexa)! });
    return `<div class="nuance${rang === options.ancre ? ' ancre' : ''}" style="background:${hexa};color:${encre}" title="${esc(options.titre(rang))}"><b>${crans[rang]}${rang === options.ancre ? ' ◆' : ''}</b><span>${hexa}</span>${options.ecarts ? `<span>ΔE ${fixe(options.ecarts[rang], 3)}</span>` : ''}</div>`;
  }).join('')}</div>`;
}

function sectionRampes(): string {
  const crans = modele.recette.crans;
  const blocs = visibles().map((palette) => {
    const famille = familleTailwindProche(palette.reference, RELEVE);
    const tailwindLight = CRANS.map((cran) => RELEVE[famille][String(cran)].toUpperCase());
    const memesCrans = crans.length === 11 && crans.every((cran, rang) => cran === CRANS[rang]);
    const lignes = palette.intensites.flatMap((intensite) => modesAffiches().map((mode) => {
      const rampe = palette.rampes[intensite]![mode];
      const hexas = rampe.map((cran) => cran.hexa);
      const ancre = palette.ancrage.profil === intensite ? palette.ancrage.rangs[mode] : undefined;
      const tailwind = mode === 'light' ? tailwindLight : tailwindEnDark(tailwindLight, modele.recette.courbes.dark);
      const ecarts = memesCrans ? hexas.map((hexa, rang) => ecartOk(hexa, tailwind[rang])) : undefined;
      return `<div class="ligne-rampe"><span class="etiquette-rampe">${nomDeLIntensite(intensite)} · ${nomDuMode(mode)}</span>${bandeDeNuances(hexas, crans, { ...(ancre === undefined ? {} : { ancre }), titre: (rang) => `${crans[rang]} ${hexas[rang]} : L ${fixe(rampe[rang].L)} C ${fixe(rampe[rang].C)} H ${fixe(rampe[rang].H, 1)}`, ...(ecarts ? { ecarts } : {}) })}</div>
        ${memesCrans ? `<div class="ligne-rampe tailwind"><span class="etiquette-rampe">Tailwind ${famille}</span>${bandeDeNuances(tailwind, crans, { titre: (rang) => `${famille} : ${tailwind[rang]}` })}</div>` : ''}`;
    })).join('');
    return `<div class="bloc-palette" id="rampe-${palette.rang}"><h3><span class="echantillon" style="background:${palette.reference}"></span>${esc(palette.nom)} <small>${palette.reference}${palette.grise ? ' · grise' : ''}${palette.aDesDossiers ? '' : ' · libre ou figée'}</small></h3>${lignes}</div>`;
  }).join('');
  return `<section id="rampes"><h2>Rampes et Tailwind 3.4</h2>
    <p class="aide">Chaque rampe du moteur, avec la famille Tailwind la plus proche par teinte. ◆ marque le cran qui porte la référence exacte. ΔE est l'écart OKLab entre le cran du moteur et celui de Tailwind ; en Dark, Tailwind prend la nuance de clarté la plus proche de la courbe Dark.</p>
    ${blocs}</section>`;
}

// --- Réglages -------------------------------------------------------------

function modifierRecette(changer: (copie: any) => void): void {
  const copie = JSON.parse(JSON.stringify(recette));
  changer(copie);
  const resultat = validerRecette(copie);
  if ('refus' in resultat) {
    erreurDeReglage = `Réglage refusé par la recette : ${resultat.refus.map((refus) => `${refus.regle} ${refus.chemin}`).join(', ')}.`;
  } else {
    erreurDeReglage = '';
    recette = resultat.recette;
  }
  afficherErreur();
  plusTard();
}

function afficherErreur(): void {
  const zone = document.getElementById('erreur-reglage');
  if (zone) zone.textContent = erreurDeReglage;
}

function curseur(id: string, libelle: string, valeur: number, min: number, max: number, pas: number): string {
  return `<label class="curseur"><span>${esc(libelle)}</span><input type="range" data-reglage="${id}" min="${min}" max="${max}" step="${pas}" value="${valeur}"><output>${valeur}</output></label>`;
}

function choixDeCran(mode: Mode, variable: VariableDuBanc, valeur: CranDeTable, kit: CranDeTable): string {
  const options = [...recette.crans.map(String), ...(variable === 'solid/foreground' ? ['texteDesBoutons'] : [])]
    .map((cran) => `<option value="${cran}"${String(valeur) === cran ? ' selected' : ''}>${cran === 'texteDesBoutons' ? 'texte' : cran}</option>`).join('');
  return `<select data-table="${mode}|${variable}" class="${String(valeur) !== String(kit) ? 'modifie' : ''}" title="Kit : ${kit}">${options}</select>`;
}

function rendreReglages(): void {
  const zone = document.getElementById('reglages')!;
  const tableDuKit = tableDuBanc(recette);
  const table = tableDuBanc(recette, etat.essai.table);
  const lignesDeTable = VARIABLES_DU_BANC.map((variable) => `<tr><th>${variable}${variable === CONTOUR_DISCRET ? ' <em>essai</em>' : ''}</th>${MODES.map((mode) => `<td>${choixDeCran(mode, variable, table[mode][variable], tableDuKit[mode][variable])}</td>`).join('')}</tr>`).join('');
  const palettes = recette.palettes.map((palette, rang) => `<li><label><input type="checkbox" data-visible="${rang}"${etat.masquees.includes(rang) ? '' : ' checked'}><span class="echantillon" style="background:${palette.reference}"></span>${esc(palette.nom ?? palette.reference)}</label><input type="color" data-reference="${rang}" value="${palette.reference.toLowerCase()}" title="Référence de la palette"></li>`).join('');
  const optionsDePalette = (choisie: number | undefined) => `<option value=""${choisie === undefined ? ' selected' : ''}>aucune</option>${recette.palettes.map((palette, rang) => `<option value="${rang}"${choisie === rang ? ' selected' : ''}>${esc(palette.nom ?? palette.reference)}</option>`).join('')}`;
  const roles = ROLES.map(([role, nom]) => `<label class="ligne"><span>${nom}</span><select data-role="${role}">${optionsDePalette(etat.roles[role])}</select></label>`).join('');
  const profil = (nom: ProfilAffiche) => {
    const p = recette.profils[nom];
    return `<fieldset><legend>${nom === 'soft' ? 'Soft' : 'Vivid'}</legend>
      ${curseur(`profils.${nom}.part`, 'part de chroma', p.part, 0, 1, 0.01)}
      ${curseur(`profils.${nom}.clairs`, 'clairs (tons clairs du Light)', p.clairs, 0.05, 1, 0.01)}
      ${curseur(`profils.${nom}.enveloppe.p0`, 'enveloppe p0', p.enveloppe.p0, 0, 1, 0.01)}
      ${MODES.map((mode) => (['a', 'b', 'jaunes', 'cyans'] as const).map((cle) => curseur(`profils.${nom}.enveloppe.${mode}.${cle}`, `${nomDuMode(mode)} ${cle}`, p.enveloppe[mode][cle], cle === 'cyans' ? -1 : 0, cle === 'a' || cle === 'b' ? 2 : 1, 0.01)).join('')).join('')}
    </fieldset>`;
  };
  const courbes = MODES.map((mode) => `<fieldset><legend>Courbe ${nomDuMode(mode)}</legend>${recette.courbes[mode].map((clarte, rang) => curseur(`courbes.${mode}.${rang}`, String(recette.crans[rang]), clarte, 0, 1, 0.005)).join('')}</fieldset>`).join('');
  zone.innerHTML = `
    <h2>Réglages</h2>
    <fieldset><legend>Recette</legend>
      <p class="nom-recette">${esc(nomDeLaRecette)}</p>
      <label class="fichier">Charger une recette exportée par Palettes<input type="file" id="fichier" accept=".json,application/json"></label>
      <details><summary>Coller une recette</summary><textarea id="collage" rows="4" placeholder="Le JSON de la recette"></textarea><button type="button" data-geste="coller">Lire</button></details>
      <div class="gestes"><button type="button" data-geste="demonstration">Démonstration</button><button type="button" data-geste="retablir">Rétablir la recette chargée</button><button type="button" data-geste="telecharger">Télécharger la recette modifiée</button></div>
      <p class="aide">On peut aussi déposer un fichier sur la page.</p>
    </fieldset>
    <p id="erreur-reglage" class="erreur">${esc(erreurDeReglage)}</p>
    <fieldset><legend>Exigences (essai)</legend>
      <label class="ligne"><input type="checkbox" data-exigence="fondsSurvoles"${etat.essai.exigences.fondsSurvoles ? ' checked' : ''}> Juger les fonds survolés</label>
      <label class="ligne"><input type="checkbox" data-exigence="fondsAppuyes"${etat.essai.exigences.fondsAppuyes ? ' checked' : ''}> Juger les fonds appuyés</label>
      <label class="ligne"><span>Seuil du texte</span><input type="number" data-seuil="texte" min="1" max="21" step="0.1" value="${recette.seuils.texte}"></label>
      <label class="ligne"><span>Seuil hors texte</span><input type="number" data-seuil="nonTexte" min="1" max="21" step="0.1" value="${recette.seuils.nonTexte}"></label>
    </fieldset>
    <fieldset><legend>Table des dossiers (essai)</legend>
      <p class="aide">Le cran de chaque variable dans le sens que le texte des boutons donne au thème. Une case modifiée est surlignée ; son titre donne le cran du kit.</p>
      <table class="table-dossiers"><thead><tr><th></th><th>Light</th><th>Dark</th></tr></thead><tbody>${lignesDeTable}</tbody></table>
      <button type="button" data-geste="table-du-kit">Rétablir la table du kit</button>
    </fieldset>
    <fieldset><legend>Palettes</legend><ul class="liste-palettes">${palettes}</ul></fieldset>
    <fieldset><legend>Rôles de l'écran composé</legend>${roles}
      <label class="ligne"><span>Action des alertes</span><select data-action><option value="page"${etat.action === 'page' ? ' selected' : ''}>page/foreground</option><option value="surface"${etat.action === 'surface' ? ' selected' : ''}>surface/foreground</option></select></label>
      <p class="aide">La palette du rôle Neutre porte aussi les textes du neutre et les couleurs désactivées.</p>
    </fieldset>
    <fieldset><legend>Thème</legend>
      ${MODES.map((mode) => `<label class="ligne"><span>Texte des boutons ${nomDuMode(mode)}</span><select data-texte="${mode}"><option value="blanc"${recette.texteDesBoutons[mode] === 'blanc' ? ' selected' : ''}>blanc</option><option value="noir"${recette.texteDesBoutons[mode] === 'noir' ? ' selected' : ''}>noir</option></select></label>`).join('')}
      ${MODES.map((mode) => `<label class="ligne"><span>Fond ${nomDuMode(mode)}</span><input type="color" data-fond="${mode}" value="${recette.fonds[mode].toLowerCase()}"></label>`).join('')}
      ${curseur('intensiteDesFondsSombres', 'intensité des fonds sombres', recette.intensiteDesFondsSombres, 0, 1, 0.01)}
    </fieldset>
    <details><summary>Profils du moteur</summary>${profil('soft')}${profil('vivid')}</details>
    <details><summary>Courbes de clarté</summary>${courbes}</details>`;
}

/** Écrit une valeur à un chemin pointé d'un objet copié. */
function ecrireAuChemin(objet: any, chemin: string, valeur: number): void {
  const segments = chemin.split('.');
  let curseurObjet = objet;
  for (const segment of segments.slice(0, -1)) curseurObjet = curseurObjet[segment];
  curseurObjet[segments[segments.length - 1]] = valeur;
}

function changerTable(mode: Mode, variable: VariableDuBanc, valeur: string): void {
  const kit = tableDuBanc(recette)[mode][variable];
  const cran: CranDeTable = valeur === 'texteDesBoutons' ? 'texteDesBoutons' : Number(valeur);
  const modeModifie = { ...(etat.essai.table[mode] ?? {}) } as Record<string, CranDeTable>;
  if (String(cran) === String(kit)) delete modeModifie[variable];
  else modeModifie[variable] = cran;
  etat.essai = { ...etat.essai, table: { ...etat.essai.table, [mode]: modeModifie } };
}

function changerReference(rang: number, hexa: string): void {
  modifierRecette((copie: Recette & { palettes: Palette[] }) => {
    const palette = copie.palettes[rang] as any;
    palette.reference = hexa.toUpperCase();
    delete palette.originale;
    const bouts = boutsDe(copie);
    for (const profil of PROFILS) {
      if (palette.derive[profil]?.origine === 'tailwind') {
        palette.derive[profil] = { ...palette.derive[profil], ...prereglageTailwind(rgb8VersOklch(lireHexa(hexa)!), bouts) };
      }
    }
  });
}

function brancherReglages(): void {
  const zone = document.getElementById('reglages')!;
  zone.addEventListener('input', (evenement) => {
    const cible = evenement.target as HTMLInputElement;
    if (cible.dataset.reglage) {
      const valeur = Number(cible.value);
      const sortie = cible.nextElementSibling;
      if (sortie) sortie.textContent = String(valeur);
      modifierRecette((copie) => ecrireAuChemin(copie, cible.dataset.reglage!, valeur));
    }
  });
  zone.addEventListener('change', (evenement) => {
    const cible = evenement.target as HTMLInputElement & HTMLSelectElement;
    const d = cible.dataset;
    if (d.table) {
      const [mode, variable] = d.table.split('|') as [Mode, VariableDuBanc];
      changerTable(mode, variable, cible.value);
      cible.classList.toggle('modifie', String(tableDuBanc(recette)[mode][variable]) !== cible.value);
      plusTard();
    } else if (d.exigence) {
      etat.essai = { ...etat.essai, exigences: { ...etat.essai.exigences, [d.exigence]: cible.checked } };
      plusTard();
    } else if (d.seuil) {
      modifierRecette((copie) => { copie.seuils[d.seuil!] = Number(cible.value); });
    } else if (d.visible !== undefined) {
      const rang = Number(d.visible);
      etat.masquees = cible.checked ? etat.masquees.filter((autre) => autre !== rang) : [...etat.masquees, rang];
      plusTard();
    } else if (d.reference !== undefined) {
      changerReference(Number(d.reference), cible.value);
    } else if (d.role) {
      const role = d.role as Role;
      etat.roles = { ...etat.roles };
      if (cible.value === '') delete etat.roles[role];
      else etat.roles[role] = Number(cible.value);
      plusTard();
    } else if (d.action !== undefined) {
      etat.action = cible.value as Action;
      plusTard();
    } else if (d.texte) {
      const resultat = recetteAvecTexteDesBoutons(recette, d.texte as Mode, cible.value as TexteDesBoutons);
      if ('refus' in resultat) {
        erreurDeReglage = 'La courbe refuse ce texte des boutons : elle ne serait plus monotone.';
      } else {
        erreurDeReglage = '';
        recette = resultat.recette;
      }
      rendreReglages();
      plusTard();
    } else if (d.fond) {
      modifierRecette((copie) => { copie.fonds[d.fond!] = cible.value.toUpperCase(); });
    } else if (cible.id === 'fichier' && cible.files?.[0]) {
      lireFichier(cible.files[0]);
    }
  });
  zone.addEventListener('click', (evenement) => {
    const geste = (evenement.target as HTMLElement).closest<HTMLElement>('[data-geste]')?.dataset.geste;
    if (geste === 'demonstration') charger(recetteDeDemonstration(), 'Démonstration (six palettes au préréglage Tailwind)');
    else if (geste === 'retablir') {
      recette = recetteChargee;
      erreurDeReglage = '';
      rendreReglages();
      plusTard();
    } else if (geste === 'telecharger') telecharger();
    else if (geste === 'table-du-kit') {
      etat.essai = { ...etat.essai, table: {} };
      rendreReglages();
      plusTard();
    } else if (geste === 'coller') {
      const texte = (document.getElementById('collage') as HTMLTextAreaElement).value;
      lireTexte(texte, 'Recette collée');
    }
  });
}

function telecharger(): void {
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(new Blob([JSON.stringify(recette)], { type: 'application/json' }));
  lien.download = 'recette-du-banc.json';
  lien.click();
  URL.revokeObjectURL(lien.href);
}

function lireTexte(texte: string, nom: string): void {
  const lu = lireRecette(texte);
  if ('erreur' in lu) {
    erreurDeReglage = lu.erreur;
    afficherErreur();
    return;
  }
  charger(lu.recette, nom);
}

function lireFichier(fichier: File): void {
  const lecteur = new FileReader();
  lecteur.onload = () => lireTexte(String(lecteur.result), fichier.name);
  lecteur.readAsText(fichier);
}

function devinerRoles(source: Recette): Etat['roles'] {
  const roles: Etat['roles'] = {};
  const prises = new Set<number>();
  for (const [role, , motif] of ROLES) {
    if (role === 'primary') continue;
    const rang = source.palettes.findIndex((palette, k) => !prises.has(k) && motif.test(palette.nom ?? ''));
    if (rang >= 0) {
      roles[role] = rang;
      prises.add(rang);
    }
  }
  const marque = source.palettes.findIndex((_, k) => !prises.has(k));
  if (marque >= 0) roles.primary = marque;
  return roles;
}

function charger(nouvelle: Recette, nom: string): void {
  recetteChargee = nouvelle;
  recette = nouvelle;
  nomDeLaRecette = nom;
  etat.roles = devinerRoles(nouvelle);
  etat.masquees = [];
  erreurDeReglage = '';
  rendreReglages();
  plusTard();
}

// --- Commandes et rendu ---------------------------------------------------

function rendreCommandes(): void {
  const zone = document.getElementById('commandes')!;
  const bascule = (cle: 'theme' | 'intensite', options: readonly (readonly [string, string])[]) =>
    `<div class="bascule">${options.map(([valeur, nom]) => `<button type="button" data-bascule="${cle}" data-valeur="${valeur}" aria-pressed="${etat[cle] === valeur}">${nom}</button>`).join('')}</div>`;
  zone.innerHTML = `
    <b class="marque">Banc du moteur</b>
    ${bascule('theme', [['light', 'Light'], ['dark', 'Dark'], ['deux', 'Les deux']])}
    ${bascule('intensite', [['soft', 'Soft'], ['vivid', 'Vivid']])}
    <label class="mesures"><input type="checkbox" id="mesures"${etat.mesures ? ' checked' : ''}> Mesures</label>
    <nav>${[['bilan', 'Bilan'], ['ecran', 'Écran'], ['composants', 'Composants'], ['garanties', 'Garanties'], ['usages', 'Usages'], ['harmonisation', 'Harmonisation'], ['rampes', 'Rampes']].map(([id, nom]) => `<a href="#${id}">${nom}</a>`).join('')}</nav>`;
}

function brancherCommandes(): void {
  const zone = document.getElementById('commandes')!;
  zone.addEventListener('click', (evenement) => {
    const bouton = (evenement.target as HTMLElement).closest<HTMLButtonElement>('[data-bascule]');
    if (!bouton) return;
    const cle = bouton.dataset.bascule as 'theme' | 'intensite';
    (etat as any)[cle] = bouton.dataset.valeur;
    rendreCommandes();
    plusTard(0);
  });
  zone.addEventListener('change', (evenement) => {
    if ((evenement.target as HTMLElement).id === 'mesures') {
      etat.mesures = (evenement.target as HTMLInputElement).checked;
      plusTard(0);
    }
  });
}

function rendreContenu(): void {
  const essaiVide = !descriptionDeLEssai().length;
  try {
    modele = construireModele(recette, etat.essai, etat.roles.neutral);
    modeleDuKit = essaiVide ? undefined : construireModele(recette, { ...ESSAI_VIDE, exigences: EXIGENCES_DU_KIT }, etat.roles.neutral);
  } catch (erreur) {
    document.getElementById('contenu')!.innerHTML = `<p class="erreur">Le moteur a échoué sur cette recette : ${esc(String(erreur))}</p>`;
    return;
  }
  const contenu = document.getElementById('contenu')!;
  contenu.innerHTML = modele.palettes.length
    ? [sectionBilan(), sectionEcran(), sectionComposants(), sectionGaranties(), sectionUsages(), sectionHarmonisation(), sectionRampes()].join('')
    : '<p class="note">Cette recette n’a aucune palette.</p>';
  ecrireMemoire();
}

let minuteur: number | undefined;
function plusTard(delai = 120): void {
  window.clearTimeout(minuteur);
  minuteur = window.setTimeout(rendreContenu, delai);
}

function demarrer(): void {
  const memoire = lireMemoire();
  if (memoire.etat) Object.assign(etat, memoire.etat, { essai: { ...ESSAI_VIDE, ...memoire.etat.essai } });
  const chargee = memoire.chargee ? lireRecette(memoire.chargee) : undefined;
  const courante = memoire.recette ? lireRecette(memoire.recette) : undefined;
  if (chargee && 'recette' in chargee) {
    recetteChargee = chargee.recette;
    nomDeLaRecette = memoire.nom ?? 'Recette enregistrée';
  }
  recette = courante && 'recette' in courante ? courante.recette : recetteChargee;
  if (!memoire.etat?.roles) etat.roles = devinerRoles(recette);
  rendreCommandes();
  brancherCommandes();
  rendreReglages();
  brancherReglages();
  document.addEventListener('dragover', (evenement) => evenement.preventDefault());
  document.addEventListener('drop', (evenement) => {
    evenement.preventDefault();
    const fichier = evenement.dataTransfer?.files[0];
    if (fichier) lireFichier(fichier);
  });
  rendreContenu();
}

demarrer();
