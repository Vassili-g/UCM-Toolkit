/**
 * Les interactions déclarées du stress test F2 (section C, 8 couples de la section 3.4 du plan, 3 profils chacun, soit 24 cas).
 * Un couple pose deux dégradations des opérateurs R, K, M, L, S, Y et Q sur la même zone, et son oracle est écrit pour le couple, pas
 * par l'union des oracles de ses deux membres : I1 à I8 suivent l'ordre du tableau du plan. Le cas `I<n>-<rang>` est le couple n sur
 * le profil de rang 1 (P0), 2 (p37) ou 3 (`profilTire`).
 *
 * Les opérateurs R, K, M, L, S et Y lisent la carte de P0 par le nom de palette (`primary`, `secondary`) ; un profil minimal n'a pas
 * `secondary`, et les rampes de `brands` du profil tiré sont distantes. Les couples écrivent donc leurs dégradations d'après la
 * carte du profil, dans la palette de travail : `primary` quand ses rampes sont locales, `neutral` (rampes de `utility`, jamais
 * distantes) sinon. Un cran de rampe n'est retiré que s'il est visé par un seul rôle dans le mode, pour qu'aucun autre alias ne
 * perde sa cible. I5 (C60) reste dans `primary` sur tous les profils, car C60 ne lit pas `distante`. I8 pose la library lui-même.
 */
import { SUPPORT_DES_VARIABLES, VARIABLES_DE_PALETTE, type ModeDuTheme } from '../../../src/emplois/dossiers.js';
import { ciblesAdmises } from '../../../src/referentiel/architecture.js';
import { MODES_DU_THEME, paletteDeCarte, tousLesRoles, type PaletteDeCarte, type RoleDeCarte } from './carte.js';
import {
  Registre, attendu, attenduDeVariableAbsente, attendusDAliasSupprime, autreMode, autreSens, cleComplete, cranDeLaCarte, cranDeTable, cranVoisin, nomDuMode,
  type CasDeStructure, type Degradation,
} from './cas.js';
import { FAUTES } from './operateursNoms.js';
import { GRAINE_PAR_DEFAUT, PROFIL_P0, PROFIL_P37, profilTire, themeDuProfil, type ThemeDeBase } from './themeUcm.js';

/** Le nombre de couples du plan, et la forme de leur identifiant. */
export const COUPLES = ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8'] as const;

const LIBRARY = { nom: 'Bibliothèque des marques', cle: 'lib-marques' } as const;
const ROLES_A_CRAN = VARIABLES_DE_PALETTE.filter((role) => role !== 'solid/foreground');

/** Le rôle, la rampe de rôles et le mode de travail d'un couple, lus dans la carte du profil. */
interface Contexte {
  readonly base: ThemeDeBase;
  readonly palette: PaletteDeCarte;
  readonly nomDuMode: (mode: ModeDuTheme) => string;
}

function contexteDe(base: ThemeDeBase, identifiant: string): Contexte {
  return { base, palette: paletteDeCarte(base.carte, identifiant), nomDuMode: (mode) => nomDuMode(base, mode) };
}

/** `primary` quand ses rampes de `brands` sont locales ; `neutral`, dont les rampes sont dans `utility`, sinon. */
const paletteDeTravail = (base: ThemeDeBase): string => (base.profil.rampes === 'locales' ? 'primary' : 'neutral');

/** Le cran que la carte fait viser à ce rôle dans ce mode ; `undefined` pour une couleur absolue ou une élévation. */
function cranVise(role: RoleDeCarte, mode: ModeDuTheme): number | undefined {
  const vise = role.cibles[mode].vise;
  return vise && 'cran' in vise ? vise.cran : undefined;
}

/** Le nombre de rôles de la carte (palettes et globales) qui visent cette variable dans ce mode. */
function viseurs(base: ThemeDeBase, cle: string, mode: ModeDuTheme): number {
  return tousLesRoles(base.carte).filter(({ role }) => role.cibles[mode].cle === cle).length;
}

/** Vrai quand aucune couleur de `components` ne vise ce rôle : le retirer ne casse alors aucun alias de composant. */
const sansComposant = (base: ThemeDeBase, role: RoleDeCarte): boolean => base.carte.composant.jetons.every((jeton) => jeton.cible.cle !== role.cle);

/** Les segments d'une rampe tels que le kit les cite : le nom de la rampe sans cran et sans la collection redite. */
function cheminDeLaRampe(base: ThemeDeBase, palette: PaletteDeCarte, mode: ModeDuTheme, cran: number): string {
  const segments = palette.rampes[mode][cran].nom.split('/').slice(0, -1);
  return (base.profil.collectionRedite ? segments.slice(1) : segments).join('/');
}

const premier = <T>(valeurs: readonly T[], quoi: string, base: ThemeDeBase): T => {
  if (valeurs.length === 0) throw new Error(`${quoi} : aucun candidat sur ${base.profil.id}`);
  return valeurs[0];
};

/** La collection `brands` aux modes Light et Dark (la place « modes » de C60), comme `operateursModes.ts`. */
function placerLesModesDeMarque(base: ThemeDeBase, degradation: Degradation): void {
  const brands = degradation.catalogue.collections.find((collection) => collection.cle === base.carte.collections.brands.cle)!;
  MODES_DU_THEME.forEach((mode, rang) => degradation.fixer(brands.modes[rang], 'nom', base.carte.modes[mode].nom));
}

type Couple = (registre: Registre, contexte: Contexte) => void;

const LIGHT: ModeDuTheme = 'light';

/** I1. R1 d'un rôle et retrait du cran qu'il vise : `cran-absent` de la rampe, aucune création du rôle. */
const retraitDuRoleEtDeSonCran: Couple = (registre, { base, palette, nomDuMode: nomDe }) => {
  const role = premier(ROLES_A_CRAN.map((id) => palette.roles[id]).filter((candidat) =>
    cranVise(candidat, LIGHT) !== undefined
    && viseurs(base, candidat.cibles[LIGHT].cle, LIGHT) === 1 && sansComposant(base, candidat)), 'I1', base);
  const cran = cranDeLaCarte(role, LIGHT);
  const degradation = registre.degrader();
  degradation.retirerLaVariable(role.cle);
  degradation.retirerLaVariable(role.cibles[LIGHT].cle);
  degradation.zone({ palette: palette.id, role: role.role, mode: 'les-deux' });
  registre.ajouter('I1', degradation, {
    description: `I1 ${palette.id} ${role.role} retiré avec son cran ${cran} de ${nomDe(LIGHT)}`,
    attendus: [attendu('C82', 'cran-absent', `${cheminDeLaRampe(base, palette, LIGHT, cran)}/${cran}`, '', 'a-faire')],
  });
};

/**
 * I2. R1 d'un rôle (`surface/hover`) et Q1 sur un rôle voisin (`surface/pressed`) qui prend une faute de ce rôle : une question qui
 * nomme `surface/hover`, sans création de `surface/hover`. `surface/pressed` n'a plus de variable sous son nom, donc l'oracle lui
 * garde la création exacte de R1.
 */
const retraitEtFauteDuVoisin: Couple = (registre, { base, palette }) => {
  const retire = palette.roles['surface/hover'];
  const voisin = palette.roles['surface/pressed'];
  const segments = voisin.nom.split('/');
  const dernierDuRetire = retire.nom.split('/').at(-1)!;
  const faute = [...segments.slice(0, -1), FAUTES.retiree(dernierDuRetire)].join('/');
  const degradation = registre.degrader();
  degradation.retirerLaVariable(retire.cle);
  degradation.fixer(degradation.variable(voisin.cle), 'nom', faute);
  degradation.zone({ palette: palette.id, role: 'surface/hover', mode: 'les-deux' });
  degradation.zone({ palette: palette.id, role: 'surface/pressed', mode: 'les-deux' });
  const { attendu: absente, detail } = attenduDeVariableAbsente(base, palette, voisin);
  registre.ajouter('I2', degradation, {
    description: `I2 ${palette.id} ${retire.role} retiré, ${voisin.role} devient ${faute}`,
    attendus: [attendu('C82', 'variable-inconnue', faute, '', 'question'), absente],
    details: detail ? [detail] : [],
    verifications: [{
      pour: `C82|variable-inconnue|${faute}|`,
      verifier: (constat) => (constat.question?.candidats.some((candidat) => candidat.nom === retire.nom) ? undefined : `la question ne nomme pas ${retire.nom}`),
    }],
    hypothese: 'H4',
  });
};

/** Les rôles dont le cran déplacé d'un pas n'est pas celui de l'autre table : le sens se lit alors sans ambiguïté dans les autres rôles. */
function rolesDeplacables(palette: PaletteDeCarte, mode: ModeDuTheme): RoleDeCarte[] {
  return ROLES_A_CRAN.map((id) => palette.roles[id]).filter((role) => {
    const cran = cranVise(role, mode);
    return cran !== undefined && cranDeTable(role.role, mode, autreSens(palette.sens[mode])) !== cranVoisin(cran);
  });
}

/** I3. K1 sur deux rôles votants de la même palette : le sens reste celui des rôles qui n'ont pas bougé, donc chaque correction vise le cran de la table. */
const deuxCransDeplaces: Couple = (registre, { base, palette, nomDuMode: nomDe }) => {
  const roles = rolesDeplacables(palette, LIGHT).slice(0, 2);
  if (roles.length < 2) throw new Error(`I3 : moins de deux rôles déplaçables sur ${base.profil.id}`);
  const degradation = registre.degrader();
  const attendus = roles.map((role) => {
    const deplace = palette.rampes[LIGHT][cranVoisin(cranDeLaCarte(role, LIGHT))].cle;
    degradation.viser(role.cle, LIGHT, deplace);
    degradation.zone({ palette: palette.id, role: role.role, mode: LIGHT });
    return { constat: attendu('C82', 'cran', role.nom, nomDe(LIGHT), 'correction', { apres: { cle: role.cibles[LIGHT].cle } }), deplace };
  });
  registre.ajouter('I3', degradation, {
    description: `I3 ${palette.id} ${roles.map(({ role }) => role).join(' et ')} déplacés d'un pas en ${LIGHT}`,
    attendus: attendus.map(({ constat }) => constat),
    details: attendus.map(({ constat, deplace }) => ({ pour: cleComplete(constat), avant: deplace })),
  });
};

/** I4. K1 puis L1 sur la même variable : le cran déplacé est supprimé, donc l'alias n'a plus de cible et `alias-supprime` est le seul constat. */
const cranDeplaceEtCibleSupprimee: Couple = (registre, { base, palette, nomDuMode: nomDe }) => {
  const role = premier(ROLES_A_CRAN.map((id) => palette.roles[id]).filter((candidat) => {
    const cran = cranVise(candidat, LIGHT);
    return cran !== undefined && viseurs(base, palette.rampes[LIGHT][cranVoisin(cran)].cle, LIGHT) === 0;
  }), 'I4', base);
  const cible = palette.rampes[LIGHT][cranVoisin(cranDeLaCarte(role, LIGHT))];
  const degradation = registre.degrader();
  degradation.viser(role.cle, LIGHT, cible.cle);
  degradation.retirerLaVariable(cible.cle);
  degradation.zone({ palette: palette.id, role: role.role, mode: LIGHT });
  registre.ajouter('I4', degradation, {
    description: `I4 ${palette.id} ${role.role} déplacé vers ${cible.nom} en ${LIGHT}, puis cette cible supprimée`,
    attendus: [attendu('C63', 'alias-supprime', role.nom, nomDe(LIGHT), 'a-faire')],
  });
};

/**
 * I5. K1 puis M1 sur la même variable : l'alias vise l'autre branche de mode à un cran qu'aucune table ne donne. Le plan attend un seul
 * constat, C60, avec la correction vers la bonne branche au cran de la table pour le mode du rôle.
 */
const cranDeplaceDansLAutreBranche: Couple = (registre, { base, nomDuMode: nomDe }) => {
  const palette = paletteDeCarte(base.carte, 'primary');
  const autre = autreMode(LIGHT);
  const role = premier(ROLES_A_CRAN.map((id) => palette.roles[id]).filter((candidat) => {
    const cran = cranVise(candidat, autre);
    return cran !== undefined && (['normal', 'inverse'] as const).every((sens) => cranDeTable(candidat.role, autre, sens) !== cranVoisin(cran));
  }), 'I5', base);
  const deplace = palette.rampes[autre][cranVoisin(cranDeLaCarte(role, autre))].cle;
  const degradation = registre.degrader();
  placerLesModesDeMarque(base, degradation);
  degradation.viser(role.cle, LIGHT, deplace);
  degradation.zone({ palette: palette.id, role: role.role, mode: LIGHT });
  const constat = attendu('C60', null, role.nom, nomDe(LIGHT), 'correction', { apres: { cle: role.cibles[LIGHT].cle } });
  registre.ajouter('I5', degradation, {
    description: `I5 ${palette.id} ${role.role} en ${LIGHT} vise la branche ${autre} à un cran qu'aucune table ne donne`,
    attendus: [constat], details: [{ pour: cleComplete(constat), avant: deplace }],
  });
};

/** I6. S1 et Y2 sur la même variable : une valeur directe dans un mode et des scopes faux, donc `valeur-directe` et C63 `scopes` avec sa correction. */
const valeurDirecteEtScopesFaux: Couple = (registre, { base, palette, nomDuMode: nomDe }) => {
  const role = palette.roles['surface/border'];
  const degradation = registre.degrader();
  degradation.ecrireLaValeur(role.cle, base.carte.modes[LIGHT].id, { valeur: { r: 0.2, g: 0.4, b: 0.6, a: 1 } });
  degradation.fixer(degradation.variable(role.cle), 'scopes', ['ALL_SCOPES']);
  degradation.zone({ palette: palette.id, role: role.role, mode: LIGHT });
  const scopes = attendu('C63', null, role.nom, '', 'correction', { apres: { nom: [...SUPPORT_DES_VARIABLES[role.role].portees].sort().join(',') } });
  registre.ajouter('I6', degradation, {
    description: `I6 ${palette.id} ${role.role} en couleur directe en ${LIGHT} avec les scopes ALL_SCOPES`,
    attendus: [attendu('C82', 'valeur-directe', role.nom, nomDe(LIGHT), 'a-faire'), scopes],
    details: [{ pour: cleComplete(scopes), avant: 'ALL_SCOPES' }],
  });
};

/** I7. K1 puis Y1 sur la même variable : l'alias passe de `theme` vers `primitives`, couche non admise, donc `couche` est le seul constat. */
const cranDeplaceEtCoucheInterdite: Couple = (registre, { base, palette, nomDuMode: nomDe }) => {
  if (ciblesAdmises('theme', 'couleur').includes('primitives')) throw new Error('I7 : theme admet primitives pour cible');
  const role = palette.roles['surface/default'];
  const primitive = premier(base.catalogue.variables.filter((variable) => variable.collection === base.carte.collections.primitives.cle), 'I7', base);
  const degradation = registre.degrader();
  degradation.viser(role.cle, LIGHT, palette.rampes[LIGHT][cranVoisin(cranDeLaCarte(role, LIGHT))].cle);
  degradation.viser(role.cle, LIGHT, primitive.cle);
  degradation.zone({ palette: palette.id, role: role.role, mode: LIGHT });
  registre.ajouter('I7', degradation, {
    description: `I7 ${palette.id} ${role.role} déplacé d'un cran puis aliasé vers ${primitive.nom} de primitives en ${LIGHT}`,
    attendus: [attendu('C82', 'couche', role.nom, nomDe(LIGHT), 'a-faire')],
  });
};

/** I8. R1 sur une rampe de library (L3) : `variable-absente` avec la raison `cible-de-library`, sans correction. */
const retraitSurUneRampeDeLibrary: Couple = (registre, { base }) => {
  const palette = paletteDeCarte(base.carte, 'primary');
  const role = palette.roles['surface/subtle'];
  const degradation = registre.degrader();
  degradation.fixer(degradation.catalogue, 'library', { ...LIBRARY });
  for (const mode of MODES_DU_THEME) for (const cible of Object.values(palette.rampes[mode])) degradation.fixer(degradation.variable(cible.cle), 'distante', true);
  degradation.retirerLaVariable(role.cle);
  degradation.zone({ palette: palette.id, role: role.role, mode: 'les-deux' });
  const { attendu: absente } = attenduDeVariableAbsente(base, palette, role, 'cible-de-library');
  registre.ajouter('I8', degradation, {
    description: `I8 ${palette.id} ${role.role} retiré, la rampe de ${palette.id} est de library`,
    attendus: [absente, ...attendusDAliasSupprime(base, role.cle)],
  });
};

/** Les couples, dans l'ordre du tableau de la section 3.4 du plan. */
const CAS_DES_COUPLES: readonly { readonly id: (typeof COUPLES)[number]; readonly couple: Couple; readonly palette: (base: ThemeDeBase) => string }[] = [
  { id: 'I1', couple: retraitDuRoleEtDeSonCran, palette: paletteDeTravail },
  { id: 'I2', couple: retraitEtFauteDuVoisin, palette: paletteDeTravail },
  { id: 'I3', couple: deuxCransDeplaces, palette: paletteDeTravail },
  { id: 'I4', couple: cranDeplaceEtCibleSupprimee, palette: paletteDeTravail },
  { id: 'I5', couple: cranDeplaceDansLAutreBranche, palette: () => 'primary' },
  { id: 'I6', couple: valeurDirecteEtScopesFaux, palette: paletteDeTravail },
  { id: 'I7', couple: cranDeplaceEtCoucheInterdite, palette: paletteDeTravail },
  { id: 'I8', couple: retraitSurUneRampeDeLibrary, palette: () => 'primary' },
];

/** Un couple sur le thème de base donné, dans la palette de travail du couple ou dans `palette`. Le cas porte l'identifiant `<couple>-1`. */
export function unCouple(id: (typeof COUPLES)[number], base: ThemeDeBase, palette?: string): CasDeStructure {
  const { couple, palette: parDefaut } = CAS_DES_COUPLES.find((entree) => entree.id === id)!;
  const registre = new Registre(base);
  couple(registre, contexteDe(base, palette ?? parDefaut(base)));
  return { ...registre.cas[0], id: `${id}-1` };
}

/** Les trois profils des combinaisons : P0, p37 et le profil large tiré de la graine. */
export function themesDesInteractions(graine: number = GRAINE_PAR_DEFAUT): ThemeDeBase[] {
  return [PROFIL_P0, PROFIL_P37, profilTire(graine)].map((profil) => themeDuProfil(profil, graine));
}

/** Les 24 interactions déclarées : chaque couple sur chaque profil, `I<n>-<rang du profil>`. */
export function interactions(graine: number = GRAINE_PAR_DEFAUT): CasDeStructure[] {
  const themes = themesDesInteractions(graine);
  return CAS_DES_COUPLES.flatMap(({ id, couple, palette }) => themes.map((base, rang): CasDeStructure => {
    const registre = new Registre(base, graine);
    couple(registre, contexteDe(base, palette(base)));
    return { ...registre.cas[0], id: `${id}-${rang + 1}` };
  }));
}
