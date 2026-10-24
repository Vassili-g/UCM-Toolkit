// Calcule les données de la maquette du Hub UCM et les écrit dans Maquettes/donnees.js.
// Les couleurs viennent du moteur (`ucm-couleur`) sur la recette de démonstration du hub, dont Terracota est remplacée par Bleu.
// Les crans, variables, garanties et registres viennent du kit ; chaque chemin affiché passe `reconnaitreLeChemin`.
// Lancer à la racine du dépôt : `npx tsx "docs/notes/Recherches/Hub UCM/Mesures/calculer-donnees.mts"`.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  boutsDe, lireHexa, prereglageTailwind, rgb8VersOklch, contraste, atteintLeSeuil, GARANTIES, TABLE_DES_DOSSIERS, VARIABLES_DE_PALETTE, VARIABLES_GLOBALES,
  cranDeLaVariable, cransRequis, sensDuTheme, MODES,
} from 'ucm-couleur';
import {
  construireModele, jeuDuModele, recetteDeDemonstration, tableDuBanc, familleTailwindProche, USAGES, type Jeu, type Modele, type ReleveTailwind,
} from '../../../../../packages/hub/src/modele/modele.ts';
import {
  CIBLES_DES_COLLECTIONS, COLLECTIONS, CONVENTIONS, DEFINITIONS_DES_VARIABLES, FORMES_DES_CHEMINS, PRODUITS, REGISTRES, REGISTRE_STATUTS, REGISTRE_ROLES,
  SIGNAUX_DU_LANGAGE, TYPES_D_ALERTE, reconnaitreLeChemin, type Collection, type ContexteDuChemin, type Registre,
} from '@ucm-kit/core/referentiel';
import { tokenCssVariable } from '@ucm-kit/core/format';

const ici = dirname(fileURLToPath(import.meta.url));
const sortie = resolve(ici, '../Maquettes/donnees.js');
const planche = JSON.parse(readFileSync(resolve(ici, '../../../../../packages/couleur/planche/tailwind-3.4.17.json'), 'utf8')) as ReleveTailwind;

// ---------- La recette : Bleu remplace Terracota ----------
const demo = recetteDeDemonstration();
const bouts = boutsDe(demo);
const REFERENCE_BLEU = '#1E6FD9';
const derive = prereglageTailwind(rgb8VersOklch(lireHexa(REFERENCE_BLEU)!), bouts);
const recette = {
  ...demo,
  palettes: [
    { ...demo.palettes[0], nom: 'Bleu', reference: REFERENCE_BLEU, derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } },
    ...demo.palettes.slice(1),
  ],
};
const modele: Modele = construireModele(recette as typeof demo, undefined, 1);

const ROLES = [
  { id: 'brand', rang: 0 }, { id: 'neutral', rang: 1 }, { id: 'success', rang: 2 },
  { id: 'warning', rang: 3 }, { id: 'danger', rang: 4 }, { id: 'info', rang: 5 },
] as const;
const libelleFrDuRole = (id: string) => REGISTRE_STATUTS.termes.find((terme) => terme.id === id)?.libelle.fr;

const refus: string[] = [];
const contexte = (axes?: ContexteDuChemin['axes']): ContexteDuChemin => ({ themes: 'chemin', ...(axes ? { axes } : {}) });
/** Rend le chemin s'il passe la grammaire ; sinon le note dans `refus`. */
function chemin(collection: Collection, segments: string[], axes?: ContexteDuChemin['axes']): string {
  const texte = `${collection}/${segments.join('/')}`;
  const lu = reconnaitreLeChemin(collection, segments, contexte(axes));
  if (!lu.conforme) refus.push(`${texte} : ${JSON.stringify(lu)}`);
  return texte;
}
const AXES_BOUTON = { palette: ['primary'], style: ['contained'], etat: ['default'] };

// ---------- Les jeux de couleurs ----------
const arrondi = (x: number, d: number) => Number(x.toFixed(d));
function serialiserJeu(jeu: Jeu) {
  return {
    page: jeu.page.hexa,
    carte: jeu.carte.hexa,
    texteDesBoutons: jeu.texteDesBoutons.hexa,
    rampe: jeu.rampe.map((cran, i) => ({ cran: modele.recette.crans[i], hexa: cran.hexa, L: arrondi(cran.L, 3), C: arrondi(cran.C, 3), H: arrondi(cran.H, 1) })),
    v: Object.fromEntries(Object.entries(jeu.v).map(([nom, teinte]) => [nom, { hexa: teinte!.hexa, cran: teinte!.cran ?? null }])),
  };
}
const jeux: Record<string, Record<string, Record<string, ReturnType<typeof serialiserJeu>>>> = {};
for (const { id, rang } of ROLES) {
  const palette = modele.palettes[rang];
  jeux[id] = {};
  for (const intensite of palette.intensites) {
    jeux[id][intensite] = {};
    for (const mode of MODES) jeux[id][intensite][mode] = serialiserJeu(jeuDuModele(modele, rang, intensite, mode)!);
  }
}

const roles = ROLES.map(({ id, rang }) => ({
  id,
  libelle: libelleFrDuRole(id) ?? null,
  nom: modele.palettes[rang].nom,
  reference: modele.palettes[rang].reference,
  intensites: modele.palettes[rang].intensites,
  famille: id === 'brand' ? 'primary' : id,
}));

// ---------- Table, variables, garanties ----------
const sens = Object.fromEntries(MODES.map((mode) => [mode, sensDuTheme(mode, recette.texteDesBoutons[mode])])) as Record<'light' | 'dark', 'normal' | 'inverse'>;
const table = tableDuBanc(recette as typeof demo);
const variables = VARIABLES_DE_PALETTE.map((id) => {
  const texte = DEFINITIONS_DES_VARIABLES.find((definition) => definition.id === id)!;
  return {
    id, libelle: texte.libelle.fr, definition: texte.definition.fr,
    cran: Object.fromEntries(MODES.map((mode) => [mode, cranDeLaVariable(id, mode, sens[mode])])),
  };
});
const fondDeGarantie = (fond: (typeof GARANTIES)[number]['fonds'][number]) => ('variable' in fond ? fond.variable : 'fondDeLaPage' in fond ? 'page' : 'carte');
const garanties = GARANTIES.map((garantie) => ({
  numero: garantie.numero, premier: garantie.premier.variable, fonds: garantie.fonds.map(fondDeGarantie), seuil: garantie.seuil, seuilValeur: recette.seuils[garantie.seuil],
}));

const mesures = modele.mesures.map((mesure) => ({
  regle: mesure.regle, role: ROLES.find((role) => role.rang === mesure.palette)!.id, intensite: mesure.intensite, mode: mesure.mode,
  premier: mesure.premier.nom, second: mesure.second.nom, ratio: arrondi(mesure.ratio, 2), seuil: mesure.seuil ?? null, tenue: mesure.tenue ?? null,
}));

const usages = USAGES.map(({ id, libelle, premier, fond, seuil }) => ({ id, libelle, premier, fond, seuil: seuil ?? null }));

// ---------- La grille des composants (cadre 2) ----------
type Pastille = { fond?: string; texte?: string; contour?: string; anneau?: string; mesure: number | null; seuil: 'texte' | 'nonTexte' | null; libelle: string };
const COLONNES = ['default', 'hover', 'pressed', 'focus', 'disabled'] as const;
function grille(role: string, mode: 'light' | 'dark', intensite: string) {
  const jeu = jeuxBrut(role, mode, intensite);
  const neutre = jeuxBrut('neutral', mode, 'unique');
  const v = (nom: string): string => (nom.startsWith('disabled/') ? neutre.v[nom]!.hexa : nom === 'page' ? jeu.page : jeu.v[nom as keyof typeof jeu.v]!.hexa);
  const rapport = (a: string, b: string) => arrondi(contraste(lireHexa(a)!, lireHexa(b)!), 2);
  const encre = mode === 'light' ? '#1E1E1E' : '#F5F5F5';
  const cellule = (fond: string | undefined, texte: string | undefined, contour: string | undefined, mesure: [string, string] | null, seuil: 'texte' | 'nonTexte' | null, libelle: string, anneau?: string): Pastille => ({
    ...(fond ? { fond: v(fond) } : {}), ...(texte ? { texte: texte.startsWith('#') ? texte : v(texte) } : {}), ...(contour ? { contour: v(contour) } : {}), ...(anneau ? { anneau: v(anneau) } : {}),
    mesure: mesure ? rapport(v(mesure[0]), v(mesure[1])) : null, seuil, libelle,
  });
  const etats = ['default', 'hover', 'pressed'] as const;
  const par = <T,>(f: (etat: (typeof etats)[number]) => T) => Object.fromEntries(etats.map((e) => [e, f(e)])) as Record<(typeof etats)[number], T>;
  const rangees: { nom: string; cellules: Partial<Record<(typeof COLONNES)[number], Pastille>> }[] = [];
  const ajouter = (nom: string, c: Partial<Record<(typeof COLONNES)[number], Pastille>>) => rangees.push({ nom, cellules: c });
  const plein = par((e) => cellule(`solid/${e}`, 'solid/foreground', undefined, ['solid/foreground', `solid/${e}`], 'texte', `solid/${e}`));
  ajouter('plein', {
    ...plein, focus: cellule('solid/default', 'solid/foreground', undefined, ['ring', 'page'], 'nonTexte', 'ring', 'ring'),
    disabled: cellule('disabled/background', 'disabled/foreground', undefined, ['disabled/foreground', 'disabled/background'], null, 'disabled'),
  });
  const soft = par((e) => cellule(`surface/${e}`, 'surface/foreground', undefined, ['surface/foreground', `surface/${e}`], 'texte', `surface/${e}`));
  ajouter('soft', {
    ...soft, focus: cellule('surface/default', 'surface/foreground', undefined, ['ring', 'page'], 'nonTexte', 'ring', 'ring'),
    disabled: cellule('disabled/background', 'disabled/foreground', undefined, ['disabled/foreground', 'disabled/background'], null, 'disabled'),
  });
  ajouter('contour', {
    default: cellule(undefined, 'page/foreground', 'page/border', ['page/foreground', 'page'], 'texte', 'page/foreground'),
    hover: cellule('solid/hover', 'solid/foreground', 'solid/hover', ['solid/foreground', 'solid/hover'], 'texte', 'solid/hover'),
    pressed: cellule('solid/pressed', 'solid/foreground', 'solid/pressed', ['solid/foreground', 'solid/pressed'], 'texte', 'solid/pressed'),
    focus: cellule(undefined, 'page/foreground', 'page/border', ['ring', 'page'], 'nonTexte', 'ring', 'ring'),
    disabled: cellule(undefined, 'disabled/foreground', 'disabled/border', ['disabled/foreground', 'page'], null, 'disabled'),
  });
  ajouter('sans fond', {
    default: cellule(undefined, 'page/foreground', undefined, ['page/foreground', 'page'], 'texte', 'page/foreground'),
    hover: cellule('surface/hover', 'surface/foreground', undefined, ['surface/foreground', 'surface/hover'], 'texte', 'surface/hover'),
    pressed: cellule('surface/pressed', 'surface/foreground', undefined, ['surface/foreground', 'surface/pressed'], 'texte', 'surface/pressed'),
    focus: cellule(undefined, 'page/foreground', undefined, ['ring', 'page'], 'nonTexte', 'ring', 'ring'),
    disabled: cellule(undefined, 'disabled/foreground', undefined, ['disabled/foreground', 'page'], null, 'disabled'),
  });
  const champ = (contourNom: string, mesure: [string, string], seuil: 'nonTexte' | null, libelle: string, anneau?: string) =>
    cellule('page', encre, contourNom, mesure, seuil, libelle, anneau);
  ajouter('champ', {
    default: champ('page/border', ['page/border', 'page'], 'nonTexte', 'page/border'), hover: champ('page/border', ['page/border', 'page'], 'nonTexte', 'page/border'),
    pressed: champ('page/border', ['page/border', 'page'], 'nonTexte', 'page/border'), focus: champ('page/border', ['ring', 'page'], 'nonTexte', 'ring', 'ring'),
    disabled: cellule('disabled/background', 'disabled/foreground', 'disabled/border', ['disabled/border', 'page'], null, 'disabled'),
  });
  const lien = cellule(undefined, 'page/foreground', undefined, ['page/foreground', 'page'], 'texte', 'page/foreground');
  ajouter('lien', { default: lien, hover: lien, pressed: lien, disabled: cellule(undefined, 'disabled/foreground', undefined, ['disabled/foreground', 'page'], null, 'disabled') });
  ajouter('badge', { default: cellule('surface/default', 'surface/foreground', undefined, ['surface/foreground', 'surface/default'], 'texte', 'surface/default') });
  const caseACocher = par((e) => cellule(`solid/${e}`, 'solid/foreground', undefined, ['solid/foreground', `solid/${e}`], 'nonTexte', `solid/${e}`));
  ajouter('case', {
    ...caseACocher, focus: cellule('solid/default', 'solid/foreground', undefined, ['ring', 'page'], 'nonTexte', 'ring', 'ring'),
    disabled: cellule('disabled/background', 'disabled/foreground', 'disabled/border', ['disabled/foreground', 'disabled/background'], null, 'disabled'),
  });
  ajouter('interrupteur', {
    ...caseACocher, focus: cellule('solid/default', 'solid/foreground', undefined, ['ring', 'page'], 'nonTexte', 'ring', 'ring'),
    disabled: cellule('disabled/background', 'disabled/foreground', 'disabled/border', ['disabled/foreground', 'disabled/background'], null, 'disabled'),
  });
  ajouter('alerte', { default: cellule('surface/default', 'surface/foreground', undefined, ['surface/foreground', 'surface/default'], 'texte', 'surface/default') });
  return { page: jeu.page, encre, rangees };
}
function jeuxBrut(role: string, mode: string, intensite: string) {
  const portee = jeux[role][intensite] ? intensite : Object.keys(jeux[role])[0];
  return jeux[role][portee][mode];
}
const grilles = Object.fromEntries(['brand', 'warning'].map((role) => [role, grille(role, 'light', 'vivid')]));

// ---------- Les chemins et la chaîne de l'inspecteur ----------
const cheminTheme = (famille: string, variable: string, profil?: string) => [famille, ...(profil ? [profil] : []), ...variable.split('/')];
const cranDe = (variable: string, mode: 'light' | 'dark') => cranDeLaVariable(variable as never, mode, sens[mode]);
const bleu = modele.palettes[0];
const profilBleu = 'vivid';
function chaine(variable: string, mode: 'light' | 'dark', propriete: 'background' | 'text') {
  const cran = cranDe(variable, mode);
  const jeu = jeux.brand[profilBleu][mode];
  const composant = chemin('components', ['button', 'colors', 'primary', 'contained', 'default', propriete], AXES_BOUTON);
  const theme = chemin('theme', cheminTheme('primary', variable));
  if (cran === 'texteDesBoutons') {
    const absolu = recette.texteDesBoutons[mode] === 'blanc' ? 'white' : 'black';
    return [
      { chemin: composant }, { chemin: theme, variable: true },
      { chemin: chemin('utility', ['neutral', mode, absolu]) },
      { chemin: chemin('primitives', ['colors', modele.palettes[1].nom.toLowerCase(), absolu]) },
      { hexa: jeu.v[variable as keyof typeof jeu.v]!.hexa },
    ];
  }
  return [
    { chemin: composant }, { chemin: theme, variable: true },
    { chemin: chemin('brands', ['primary', mode, String(cran)]) },
    { chemin: chemin('primitives', ['colors', bleu.nom.toLowerCase(), profilBleu, mode, String(cran)]) },
    { hexa: jeu.v[variable as keyof typeof jeu.v]!.hexa },
  ];
}
const inspecteur = {
  mode: 'dark',
  variable: 'solid/default',
  chaines: { fond: chaine('solid/default', 'dark', 'background'), texte: chaine('solid/foreground', 'dark', 'text') },
};

// ---------- L'arbre des tokens (cadre 6) ----------
const FAMILLES_THEME = [
  { famille: 'primary', role: 'brand', profils: [profilBleu] as string[] },
  { famille: 'neutral', role: 'neutral', profils: [] as string[] },
  ...(['success', 'warning', 'danger', 'info'] as const).map((role) => ({ famille: role as string, role: role as string, profils: ['soft', 'vivid'] })),
];
const crans = (mode: 'light' | 'dark') => cransRequis(mode, sens[mode]);
const comptes = { primitives: 0, brands: 0, utility: 0, theme: 0 };
for (const { id, rang } of ROLES) {
  const palette = modele.palettes[rang];
  const nom = palette.nom.toLowerCase();
  for (const intensite of palette.intensites) for (const mode of MODES) {
    comptes.primitives += modele.recette.crans.length;
    if (comptes.primitives < 3) chemin('primitives', ['colors', nom, ...(intensite === 'unique' ? [] : [intensite]), mode, '500']);
  }
  void id;
}
for (const mode of MODES) {
  comptes.brands += crans(mode).length;
  comptes.utility += crans(mode).length + 2 + 2 + 4 * 2 * crans(mode).length;
}
const variablesDeTheme = (famille: string, profil?: string) => VARIABLES_DE_PALETTE.map((variable) => cheminTheme(famille, variable, profil));
for (const { famille, profils } of FAMILLES_THEME) {
  for (const profil of profils.length ? profils : [undefined]) comptes.theme += variablesDeTheme(famille, profil).length;
}
comptes.theme += 4 + 3 + 2;
// Une branche dépliée : theme/primary jusqu'aux variables de Bleu.
const branche = VARIABLES_DE_PALETTE.map((variable) => {
  const cheminTheme_ = chemin('theme', cheminTheme('primary', variable));
  const alias = Object.fromEntries(MODES.map((mode) => {
    const cran = cranDe(variable, mode);
    if (cran === 'texteDesBoutons') return [mode, chemin('utility', ['neutral', mode, recette.texteDesBoutons[mode] === 'blanc' ? 'white' : 'black'])];
    return [mode, chemin('brands', ['primary', mode, String(cran)])];
  }));
  return {
    variable, chemin: cheminTheme_, alias, css: tokenCssVariable(cheminTheme_.replace(/\//g, '.')),
    valeurs: Object.fromEntries(MODES.map((mode) => [mode, jeux.brand[profilBleu][mode].v[variable]!.hexa])),
  };
});
const constats = [
  { type: 'bloquant', texte: 'Variable attendue absente du fichier.', chemin: chemin('theme', cheminTheme('primary', 'surface/border')) },
  { type: 'corriger', texte: `Vise le cran ${cranDe('solid/hover', 'light')} en Light, la table dit ${cranDe('solid/hover', 'light')}.`, chemin: chemin('theme', cheminTheme('primary', 'solid/hover')), cranFichier: 600, cranTable: cranDe('solid/hover', 'light') },
  { type: 'verifier', texte: 'Nom que la grammaire des chemins ne reconnaît pas.', chemin: 'theme/primary/solid/rest' },
  { type: 'bloquant', texte: 'Alias qui ne se résout pas.', chemin: chemin('theme', cheminTheme('primary', 'page/divider')), alias: chemin('brands', ['secondary', 'light', '300']) },
];
const lectureDuNomRefuse = reconnaitreLeChemin('theme', ['primary', 'solid', 'rest'], contexte());

// ---------- Palettes et Tailwind (cadre 5) ----------
const famille = familleTailwindProche(modele.palettes[0].reference, planche);
const tailwind = { famille, crans: Object.entries(planche[famille]).map(([cran, hexa]) => ({ cran, hexa })) };

// ---------- Règles (cadre 7) ----------
const termes = (registre: Registre) => registre.termes.map((terme) => ({ id: terme.id, libelle: terme.libelle.fr, definition: terme.definition.fr, toleres: terme.toleres ?? [] }));
const ficheStatut = REGISTRE_STATUTS.termes.find((terme) => terme.id === 'warning')!;
const formesDeStatut = Object.entries(FORMES_DES_CHEMINS).flatMap(([collection, formes]) =>
  formes.filter((forme) => forme.positions.some((place) => place.registre.id === REGISTRE_STATUTS.id)).map((forme) => ({ collection, forme: forme.id })));
const exemplesDeWarning = [
  chemin('utility', ['warning', 'vivid', 'light', '600']),
  chemin('theme', ['warning', 'vivid', 'solid', 'default']),
];
const regles = {
  sections: [
    { nom: 'Collections', fiches: COLLECTIONS.map((id) => ({ id, resume: `vise ${CIBLES_DES_COLLECTIONS[id].join(', ') || 'aucune collection'}` })) },
    { nom: 'Grammaire des chemins', fiches: Object.entries(FORMES_DES_CHEMINS).flatMap(([collection, formes]) => formes.map((forme) => ({ id: forme.id, resume: collection }))) },
    { nom: 'Registres', fiches: REGISTRES.flatMap((registre) => registre.termes.map((terme) => ({ id: terme.id, registre: registre.id, resume: terme.libelle.fr }))) },
    { nom: 'Conventions', fiches: CONVENTIONS.map((convention) => ({ id: convention.id, resume: convention.libelle.fr })) },
    { nom: 'Table des dossiers et garanties', fiches: [...VARIABLES_DE_PALETTE.map((id) => ({ id, resume: 'variable du thème' })), ...GARANTIES.map((garantie) => ({ id: `G${garantie.numero}`, resume: 'garantie' }))] },
    { nom: 'Langage visuel', fiches: [...SIGNAUX_DU_LANGAGE.map((signal) => ({ id: signal.id, resume: signal.libelle })), ...TYPES_D_ALERTE.map((type) => ({ id: type.id, resume: type.libelle }))] },
    { nom: 'Produits', fiches: PRODUITS.map((produit) => ({ id: produit.id, resume: produit.id })) },
  ].map((section) => ({ ...section, total: section.fiches.length })),
  statuts: termes(REGISTRE_STATUTS),
  ficheWarning: { ...ficheStatut, libelle: ficheStatut.libelle.fr, definition: ficheStatut.definition.fr, formes: formesDeStatut, exemples: exemplesDeWarning },
  roles: termes(REGISTRE_ROLES).map((terme) => terme.id),
};

// ---------- Écriture ----------
const donnees = {
  recette: { fonds: recette.fonds, texteDesBoutons: recette.texteDesBoutons, seuils: recette.seuils, crans: recette.crans },
  roles, jeux, sens, table, variables, garanties, mesures, usages, grilles, inspecteur,
  arbre: { comptes, branche, constats, lectureDuNomRefuse },
  tailwind, regles,
  alertes: TYPES_D_ALERTE.map((type) => ({ id: type.id, libelle: type.libelle })),
  cranEssaiSurfaceHover: { kit: cranDe('surface/hover', 'light'), essai: 300 },
};
writeFileSync(sortie, `// Généré par Mesures/calculer-donnees.mts depuis le moteur et le kit ; ne pas modifier à la main.\nwindow.DONNEES = ${JSON.stringify(donnees, null, 1)};\n`);
void VARIABLES_GLOBALES;
void atteintLeSeuil;
void bouts;
console.log(`donnees.js écrit : ${Math.round(JSON.stringify(donnees).length / 1024)} Ko`);
console.log('comptes', comptes);
console.log('chemins refusés :', refus.length ? refus : 'aucun');
console.log('nom refusé voulu :', JSON.stringify(lectureDuNomRefuse));
console.log('tailwind', famille);
for (const mode of MODES) for (const role of ['brand', 'warning']) {
  const m = mesures.filter((mesure) => mesure.role === role && mesure.mode === mode && mesure.intensite === 'vivid' && mesure.regle.startsWith('G') && mesure.tenue === false);
  console.log(role, mode, 'garanties non tenues', m.map((x) => `${x.regle} ${x.premier}/${x.second} ${x.ratio}`));
}
const sous = (role: string) => grilles[role].rangees.flatMap((rangee) => Object.entries(rangee.cellules).filter(([, c]) => c!.seuil && c!.mesure !== null && c!.mesure < (c!.seuil === 'texte' ? 4.5 : 3)).map(([colonne, c]) => `${rangee.nom}/${colonne} ${c!.mesure}`));
console.log('sous le seuil, brand:', sous('brand'), 'warning:', sous('warning'));
