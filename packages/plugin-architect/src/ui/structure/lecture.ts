/**
 * Ce que l'écran lit dans les constats et les corrections du sandbox : les constats à régler dans la fenêtre Variables de Figma, rangés
 * par intertitre, et les corrections de variables manquantes, de crans, de modes et de scopes que Corrections propose d'écrire. Aucune
 * des deux lectures ne touche au DOM.
 *
 * Les constats que le contrôle de structure du kit rend portent leurs faits sous les clés `variable`, `mode`, `soeurs` et `doublons`.
 * Ceux que le kit ne rend pas encore (cible supprimée, library non activée, mode sans valeur, couleur sans alias) et ceux de C82
 * (`controles/integrite.ts`) portent `genre`. `cle` donne la variable à ouvrir quand le fait `variable` est un nom ; sans elle, l'écran
 * retrouve la variable par son nom entier. Un constat C82 n'a pas `cle` : son identifiant la porte (`C82:<genre>:<clé>[:<mode>]`), et
 * le fait `variable` est le nom sans la collection.
 */
import { MODES, ciblesAdmises, collectionUcmReconnue, modeDuThemeReconnu, variableDuThemeReconnue } from '@ucm-kit/core/referentiel';
import type { TypeDAlerte } from 'ucm-plugin-socle/src/ui/Alerte';
import type { Constat, Correction } from '../../messages/commun';
import { TEXTES } from '../textes';

/** Un morceau de phrase : du texte, ou un chemin que l'écran met en forme. */
export type Morceau = string | { readonly chemin: string };

export type GroupeDeConstat = 'manquantes' | 'alias' | 'modes' | 'valeurs' | 'couches' | 'types' | 'rangement';

/** L'ordre des intertitres de « À faire dans Figma ». */
export const GROUPES: readonly GroupeDeConstat[] = ['manquantes', 'alias', 'modes', 'valeurs', 'couches', 'types', 'rangement'];

/** La collection des variables de palette dans les phrases de C82, que le fait `groupe` ne nomme pas. */
const COLLECTION_DU_THEME = 'theme';

export interface FaitDeConstat {
  readonly etiquette: string;
  readonly valeur: readonly Morceau[];
}

export interface ConstatAFaire {
  readonly id: string;
  readonly type: TypeDAlerte;
  readonly groupe: GroupeDeConstat;
  readonly phrase: readonly Morceau[];
  readonly lieu: readonly Morceau[];
  /** Où le régler dans Figma ; `null` quand le constat n'a pas de geste à dire. */
  readonly statut: string | null;
  readonly faits: readonly FaitDeConstat[];
  /** La variable que « Ouvrir la fiche » désigne ; `null` quand le constat n'en désigne pas une seule. */
  readonly variable: { readonly nom: string; readonly cle: string | null } | null;
}

type GenreDeConstat =
  | 'alias-supprime' | 'library-inactive' | 'sans-valeur-en-mode' | 'valeur-vide' | 'doublons' | 'couleur-sans-alias'
  | 'variable-absente' | 'cran-absent' | 'cran' | 'couche' | 'valeur-directe' | 'mode-du-theme' | 'type' | 'mal-rangee';

const GENRES_DECLARES: readonly GenreDeConstat[] = [
  'alias-supprime', 'library-inactive', 'sans-valeur-en-mode', 'couleur-sans-alias',
  'variable-absente', 'cran-absent', 'cran', 'couche', 'valeur-directe', 'mode-du-theme', 'type', 'mal-rangee',
];

const GROUPE_DU_GENRE: Readonly<Record<GenreDeConstat, GroupeDeConstat>> = {
  'alias-supprime': 'alias',
  'library-inactive': 'alias',
  'sans-valeur-en-mode': 'modes',
  'valeur-vide': 'valeurs',
  doublons: 'valeurs',
  'couleur-sans-alias': 'couches',
  'variable-absente': 'manquantes',
  'cran-absent': 'manquantes',
  cran: 'alias',
  couche: 'couches',
  'valeur-directe': 'couches',
  'mode-du-theme': 'modes',
  type: 'types',
  'mal-rangee': 'rangement',
};

/** Ce que l'écran sait du relevé : le nom entier d'une variable par sa clé, et sa clé par son nom entier. */
export interface Noms {
  nom(cle: string): string | null;
  cle(nom: string): string | null;
}

function genreDe(constat: Constat): GenreDeConstat | null {
  const { genre, soeurs, doublons } = constat.faits;
  if (typeof genre === 'string' && (GENRES_DECLARES as readonly string[]).includes(genre)) return genre as GenreDeConstat;
  if (typeof soeurs === 'number') return 'valeur-vide';
  if (typeof doublons === 'number') return 'doublons';
  return null;
}

const fait = (constat: Constat, cle: string): string => String(constat.faits[cle] ?? '');

/** La clé de la variable qu'un identifiant C82 nomme ; la clé et le mode peuvent contenir des « : », donc la coupe se cherche dans le relevé. */
function cleDeLIdentifiant(constat: Constat, genre: GenreDeConstat, noms: Noms): string | null {
  const debut = `C82:${genre}:`;
  if (constat.code !== 'C82' || !constat.id.startsWith(debut)) return null;
  const reste = constat.id.slice(debut.length);
  const deuxPoints: number[] = [];
  for (let rang = reste.indexOf(':'); rang >= 0; rang = reste.indexOf(':', rang + 1)) deuxPoints.push(rang);
  return [reste.length, ...deuxPoints.reverse()].map((fin) => reste.slice(0, fin)).find((cle) => noms.nom(cle) !== null) ?? null;
}

interface VariableLue {
  readonly nom: string;
  readonly cle: string | null;
  /** Vrai quand le relevé connaît la variable : `nom` porte alors sa collection. */
  readonly entier: boolean;
}

/** Le nom entier d'une variable : celui du relevé quand la clé le connaît, sinon le fait tel que le contrôle l'écrit. */
function variableDe(constat: Constat, genre: GenreDeConstat, noms: Noms): VariableLue | null {
  const brut = fait(constat, 'variable');
  const cle = typeof constat.faits.cle === 'string' ? constat.faits.cle : cleDeLIdentifiant(constat, genre, noms);
  const connu = cle ? noms.nom(cle) : null;
  const nom = connu ?? (brut === '' ? null : brut);
  if (nom === null) return null;
  return { nom, cle: connu === null ? noms.cle(nom) : cle, entier: connu !== null };
}

interface Lecture {
  readonly constat: Constat;
  readonly variable: VariableLue | null;
  /** Les candidats d'une question, en chemins. */
  readonly candidats: readonly { readonly chemin: string }[];
}

/** Les genres dont le fait `variable` n'est pas une variable à ouvrir : un rôle, une liste ou rien. */
const SANS_VARIABLE: readonly GenreDeConstat[] = ['doublons', 'variable-absente', 'cran-absent', 'mode-du-theme'];

const libelleDuMode = (nom: string): string => TEXTES.libelleDuMode(modeDuThemeReconnu(nom) ?? nom);

/** Le nom entier d'une variable de C82 : celui du relevé, sinon la collection que le constat dit, sinon le nom seul. */
function nomEntierDe({ variable }: Lecture, collection: string): string {
  if (variable === null) return '';
  return variable.entier ? variable.nom : `${collection}/${variable.nom}`;
}

/** Les collections de couleur que la couche de la variable admet pour cible, d'après le nom entier du relevé ; `null` si le relevé ne la connaît pas. */
function ciblesAttenduesDe({ variable }: Lecture): string | null {
  if (!variable?.entier) return null;
  const couche = collectionUcmReconnue(variable.nom.split('/')[0]);
  return couche ? TEXTES.attendues(ciblesAdmises(couche, 'couleur')) : null;
}

function phraseDe(genre: GenreDeConstat, lecture: Lecture): readonly Morceau[] {
  const { constat } = lecture;
  switch (genre) {
    case 'alias-supprime':
      return [TEXTES.aliasSupprime];
    case 'library-inactive':
      return [TEXTES.libraryInactive];
    case 'sans-valeur-en-mode':
      return [TEXTES.sansValeurEnMode(fait(constat, 'mode'))];
    case 'valeur-vide':
      return [TEXTES.valeurVide];
    case 'doublons':
      return [TEXTES.crans(Number(constat.faits.doublons), fait(constat, 'valeur'))];
    case 'couleur-sans-alias':
      return [TEXTES.couleurSansAlias];
    case 'variable-absente': {
      const raison = fait(constat, 'raison');
      const suite = raison === 'sans-jumelle' ? TEXTES.sansJumelle : raison === 'prefixes-multiples' ? TEXTES.prefixesMultiples : '';
      return [TEXTES.paletteSansLeRole.debut, { chemin: fait(constat, 'variable') }, `${TEXTES.paletteSansLeRole.fin}${suite}`];
    }
    case 'cran-absent': {
      const { debut, fin } = TEXTES.rampeSansCran(fait(constat, 'cran'));
      return [debut, { chemin: fait(constat, 'rampe') }, fin];
    }
    case 'cran':
      return [TEXTES.cranSansSens];
    case 'couche': {
      const attendues = ciblesAttenduesDe(lecture);
      return [attendues === null ? TEXTES.coucheVisee(fait(constat, 'coucheCible')) : TEXTES.coucheAttendue(fait(constat, 'coucheCible'), attendues)];
    }
    case 'valeur-directe':
      return [TEXTES.valeurDirecte];
    case 'mode-du-theme': {
      const collection = fait(constat, 'collection');
      const manque = fait(constat, 'manque');
      return [manque === 'les-deux'
        ? TEXTES.modesDuThemeManquants(collection, TEXTES.libelleDuMode('light'), TEXTES.libelleDuMode('dark'))
        : TEXTES.modeDuThemeManquant(collection, TEXTES.libelleDuMode(manque))];
    }
    case 'type':
      return [TEXTES.variableDuThemeSansCouleur];
    case 'mal-rangee':
      return [TEXTES.variableDuThemeMalRangee(fait(constat, 'collection'))];
  }
}

function statutDe(genre: GenreDeConstat, lecture: Lecture): string | null {
  const { constat } = lecture;
  switch (genre) {
    case 'alias-supprime':
      return TEXTES.autreCible;
    case 'library-inactive':
      return TEXTES.activerLaLibrary(fait(constat, 'library'));
    case 'sans-valeur-en-mode':
      return TEXTES.donnerUneValeurEnMode(fait(constat, 'mode'));
    case 'valeur-vide':
      return TEXTES.donnerUneValeur;
    case 'couleur-sans-alias':
      return TEXTES.lierALaCouleur;
    case 'doublons':
      return null;
    case 'variable-absente':
      return fait(constat, 'raison') === 'sans-ecriture' ? TEXTES.choisirLEcriture : TEXTES.creerLaVariable(fait(constat, 'variable'));
    case 'cran-absent':
      return TEXTES.ajouterLeCran;
    case 'cran':
      return TEXTES.choisirLaCible;
    case 'couche': {
      const attendues = ciblesAttenduesDe(lecture);
      return attendues === null ? TEXTES.autreCible : TEXTES.choisirUneCibleDans(attendues);
    }
    case 'valeur-directe': {
      const attendues = ciblesAttenduesDe(lecture);
      return attendues === null ? TEXTES.lierAUneCouleur : TEXTES.lierALaCouleurDe(attendues);
    }
    case 'mode-du-theme': {
      const collection = fait(constat, 'collection');
      const manque = fait(constat, 'manque');
      return manque === 'les-deux'
        ? TEXTES.nommerLesModes(TEXTES.libelleDuMode('light'), TEXTES.libelleDuMode('dark'))
        : TEXTES.ajouterUnMode(TEXTES.libelleDuMode(manque), collection);
    }
    case 'type':
      return TEXTES.recreerEnCouleur;
    case 'mal-rangee':
      return TEXTES.deplacerDansLeTheme;
  }
}

function faitsDe(genre: GenreDeConstat, { constat, candidats }: Lecture): readonly FaitDeConstat[] {
  if (genre === 'cran' && candidats.length > 0) {
    return [{ etiquette: TEXTES.enMode(libelleDuMode(fait(constat, 'mode'))), valeur: candidats.flatMap((candidat, rang) => (rang === 0 ? [candidat] : [TEXTES.ou, candidat])) }];
  }
  if (genre === 'couche') {
    return [{ etiquette: TEXTES.enMode(fait(constat, 'mode')), valeur: [TEXTES.vise, { chemin: fait(constat, 'cible') }] }];
  }
  const voisine = fait(constat, 'voisine');
  const cible = fait(constat, 'cibleDeLaVoisine');
  if (genre !== 'alias-supprime' || voisine === '' || cible === '') return [];
  return [
    { etiquette: TEXTES.enMode(fait(constat, 'mode')), valeur: [TEXTES.viseUneVariableSupprimee] },
    { etiquette: TEXTES.sesVoisines, valeur: [{ chemin: voisine }, TEXTES.vise, { chemin: cible }] },
  ];
}

function lieuDe(genre: GenreDeConstat, lecture: Lecture): readonly Morceau[] {
  const { constat, variable, candidats } = lecture;
  switch (genre) {
    case 'doublons':
      return candidats.flatMap((morceau, rang) => (rang === 0 ? [morceau] : [TEXTES.et, morceau]));
    case 'couleur-sans-alias':
      return variable ? [{ chemin: variable.nom }, `, ${fait(constat, 'valeur')}`] : [];
    case 'variable-absente': {
      const groupe = fait(constat, 'groupe');
      return [{ chemin: groupe === '' ? COLLECTION_DU_THEME : `${COLLECTION_DU_THEME}/${groupe}` }];
    }
    case 'cran-absent':
      return fait(constat, 'variables').split(', ').flatMap((nom, rang): Morceau[] => [...(rang === 0 ? [] : [TEXTES.virgule]), { chemin: `${COLLECTION_DU_THEME}/${nom}` }]);
    case 'couche':
    case 'valeur-directe':
      return variable ? [{ chemin: variable.nom }, `, ${fait(constat, 'mode')}`] : [];
    case 'mode-du-theme':
      return [{ chemin: fait(constat, 'collection') }];
    case 'type':
      return variable ? [{ chemin: nomEntierDe(lecture, COLLECTION_DU_THEME) }] : [];
    case 'mal-rangee':
      return variable ? [{ chemin: nomEntierDe(lecture, fait(constat, 'collection')) }] : [];
    default:
      return variable ? [{ chemin: variable.nom }] : [];
  }
}

/** Les constats à régler dans Figma : ceux que le contrôle ne corrige pas, rangés par intertitre dans l'ordre où le sandbox les rend. */
export function lireLesConstats(constats: readonly Constat[], noms: Noms): readonly ConstatAFaire[] {
  const lus: ConstatAFaire[] = [];
  for (const constat of constats) {
    if (constat.correction) continue;
    const genre = genreDe(constat);
    if (genre === null) continue;
    // Un cran sans correction ni question n'a pas de phrase au contrôle : il ne se montre pas.
    if (genre === 'cran' && !constat.question) continue;
    const variable = variableDe(constat, genre, noms);
    const candidats = (constat.question?.candidats ?? []).map(({ cle, nom }) => ({ chemin: (cle ? noms.nom(cle) : null) ?? nom }));
    const lecture: Lecture = { constat, variable, candidats };
    lus.push({
      id: constat.id,
      type: constat.type,
      groupe: GROUPE_DU_GENRE[genre],
      phrase: phraseDe(genre, lecture),
      lieu: lieuDe(genre, lecture),
      statut: statutDe(genre, lecture),
      faits: faitsDe(genre, lecture),
      variable: SANS_VARIABLE.includes(genre) || variable === null ? null : { nom: variable.nom, cle: variable.cle },
    });
  }
  return GROUPES.flatMap((groupe) => lus.filter((lu) => lu.groupe === groupe));
}

/** Une ligne d'une carte de corrections : le nom entier avant et le nom entier après. */
export interface LigneDeCorrection {
  readonly id: string;
  readonly avant: string;
  readonly apres: string;
}

export interface CarteDeModes {
  readonly sorte: 'modes';
  readonly cle: string;
  readonly mode: string;
  readonly variable: string;
  readonly cran: string;
  readonly lignes: readonly LigneDeCorrection[];
}

export interface CarteDeScopes {
  readonly sorte: 'scopes';
  readonly cle: string;
  readonly dossier: string;
  /** Les rôles de la carte, dossier et nom (`Disabled/border`), dans l'ordre où ils viennent : le scope dépend du rôle, pas du dossier. */
  readonly roles: readonly string[];
  readonly avant: readonly string[];
  readonly apres: readonly string[];
  readonly lignes: readonly LigneDeCorrection[];
}

/** Le cran visé, ou la couleur absolue d'`utility/neutral` quand la table n'en donne pas. */
export type CibleVisee = number | string;

/** Une ligne de crans : la variable en cause, la cible lue et la cible attendue. */
export interface LigneDeCran extends LigneDeCorrection {
  readonly variable: string;
}

/** Une carte de crans : un rôle dans un mode, un seul cran lu et un seul cran attendu. */
export interface CarteDeCrans {
  readonly sorte: 'crans';
  readonly cle: string;
  readonly role: string;
  readonly mode: string;
  readonly lu: CibleVisee;
  readonly attendu: CibleVisee;
  readonly lignes: readonly LigneDeCran[];
}

/** Une ligne de variables manquantes : le nom créé et la cible de chaque mode. */
export interface LigneDeCreation {
  readonly id: string;
  readonly nom: string;
  readonly cibles: readonly { readonly mode: string; readonly cible: string }[];
}

/** Une carte de variables manquantes : un rôle, les crans qu'il vise dans chaque mode, ses scopes. */
export interface CarteDeVariables {
  readonly sorte: 'variables';
  readonly cle: string;
  /** L'identifiant du kit : `surface/subtle`. */
  readonly role: string;
  readonly crans: readonly { readonly mode: string; readonly valeur: CibleVisee }[];
  readonly scopes: readonly string[];
  readonly lignes: readonly LigneDeCreation[];
}

export interface CorrectionsLues {
  readonly variables: readonly CarteDeVariables[];
  readonly crans: readonly CarteDeCrans[];
  readonly modes: readonly CarteDeModes[];
  readonly scopes: readonly CarteDeScopes[];
}

const segments = (nom: string): string[] => nom.split('/');

/** Les rangs des segments qui diffèrent entre deux noms ; tous les segments quand les noms n'ont pas la même longueur. */
export function segmentsQuiChangent(avant: string, apres: string): readonly number[] {
  const a = segments(avant);
  const b = segments(apres);
  if (a.length !== b.length) return a.map((_, rang) => rang);
  return a.flatMap((segment, rang) => (segment === b[rang] ? [] : [rang]));
}

/** Les scopes d'une liste de l'API, dans l'ordre de la fenêtre Edit variable. */
function scopesDe(liste: string | null): string[] {
  if (liste === null || liste === '') return [];
  return liste.split(',').sort((a, b) => TEXTES.rangDeScope(a) - TEXTES.rangDeScope(b));
}

/** Light avant Dark, quelle que soit l'écriture du mode dans le fichier ; un mode inconnu vient après. */
const rangDuMode = (nom: string): number => {
  const rang = (MODES as readonly string[]).indexOf(modeDuThemeReconnu(nom) ?? '');
  return rang < 0 ? MODES.length : rang;
};

/** Les crans visés dans chaque mode, tels que les faits `cran:<mode>` d'un constat de variable absente les disent. */
function cransDe(constat: Constat): { nom: string; valeur: CibleVisee }[] {
  return Object.entries(constat.faits).flatMap(([cle, valeur]) => (cle.startsWith('cran:') ? [{ nom: cle.slice('cran:'.length), valeur }] : []));
}

interface CarteEnCours<Ligne> {
  readonly cle: string;
  readonly lignes: Ligne[];
}

/**
 * Les corrections de variables manquantes (une carte par rôle et par couple de crans), de crans (une carte par rôle, par mode, par cran
 * lu et par cran attendu), de modes (une carte chacune) et de scopes (une carte par dossier, par scope voulu et par scope actuel).
 * `constats` donne les faits qu'une correction ne porte pas : le rôle d'une variable créée et ses crans, le mode d'un cran. Une
 * correction `variable` sans son constat ne se montre pas ; une correction d'alias de mode sans le sien est une carte de modes.
 */
export function lireLesCorrections(corrections: readonly Correction[], noms: Noms, constats: readonly Constat[] = []): CorrectionsLues {
  const parId = new Map(constats.map((constat) => [constat.id, constat] as const));
  const variables = new Map<string, Omit<CarteDeVariables, 'sorte' | 'lignes'> & CarteEnCours<LigneDeCreation>>();
  const crans = new Map<string, Omit<CarteDeCrans, 'sorte' | 'lignes'> & CarteEnCours<LigneDeCran>>();
  const modes: CarteDeModes[] = [];
  const scopes = new Map<string, { dossier: string; roles: string[]; avant: string[]; apres: string[]; lignes: LigneDeCorrection[] }>();
  for (const correction of corrections) {
    const cle = correction.cible.variable;
    const nom = (cle ? noms.nom(cle) : null) ?? cle ?? '';
    const constat = parId.get(correction.id);
    if (correction.sorte === 'variable' && correction.creation && constat) {
      const role = String(constat.faits.variable ?? '');
      const visees = cransDe(constat).sort((a, b) => rangDuMode(a.nom) - rangDuMode(b.nom));
      const cibles = Object.values(correction.creation.alias);
      const parMode = cransDe(constat).map(({ nom: mode }, rang) => ({ mode, cible: cibles[rang] })).sort((a, b) => rangDuMode(a.mode) - rangDuMode(b.mode));
      const regroupe = [role, ...visees.map(({ valeur }) => valeur), correction.creation.scopes.join(',')].join('|');
      const carte = variables.get(regroupe) ?? {
        cle: regroupe,
        role,
        crans: visees.map(({ nom: mode, valeur }) => ({ mode: TEXTES.libelleDuMode(modeDuThemeReconnu(mode) ?? mode), valeur })),
        scopes: [...correction.creation.scopes],
        lignes: [],
      };
      carte.lignes.push({
        id: correction.id,
        nom: `${correction.apres.collection ? `${correction.apres.collection}/` : ''}${correction.apres.nom}`,
        cibles: parMode.flatMap(({ mode, cible }) => (cible ? [{ mode: TEXTES.libelleDuMode(modeDuThemeReconnu(mode) ?? mode), cible: noms.nom(cible.cle) ?? cible.nom }] : [])),
      });
      variables.set(regroupe, carte);
    } else if (correction.sorte === 'alias-de-mode' && constat?.faits.genre === 'cran') {
      const nu = String(constat.faits.variable ?? '');
      const role = variableDuThemeReconnue(nu) ?? nu;
      const mode = TEXTES.libelleDuMode(modeDuThemeReconnu(String(constat.faits.mode ?? '')) ?? String(constat.faits.mode ?? ''));
      const lu = constat.faits.avant as CibleVisee;
      const attendu = constat.faits.attendu as CibleVisee;
      const regroupe = [role, mode, attendu, lu].join('|');
      const carte = crans.get(regroupe) ?? { cle: regroupe, role, mode, lu, attendu, lignes: [] };
      carte.lignes.push({
        id: correction.id,
        avant: (correction.avant ? noms.nom(correction.avant) : null) ?? correction.avant ?? '',
        apres: (correction.apres.cle ? noms.nom(correction.apres.cle) : null) ?? correction.apres.nom,
        variable: (cle ? noms.nom(cle) : null) ?? `${COLLECTION_DU_THEME}/${nu}`,
      });
      crans.set(regroupe, carte);
    } else if (correction.sorte === 'alias-de-mode') {
      const avant = (correction.avant ? noms.nom(correction.avant) : null) ?? correction.avant ?? '';
      const apres = (correction.apres.cle ? noms.nom(correction.apres.cle) : null) ?? correction.apres.nom;
      modes.push({
        sorte: 'modes',
        cle: correction.id,
        mode: correction.aRelire.axes?.mode ?? correction.cible.mode ?? '',
        variable: nom,
        cran: segments(apres).at(-1) ?? '',
        lignes: [{ id: correction.id, avant, apres }],
      });
    } else if (correction.sorte === 'scope') {
      const avant = scopesDe(correction.avant);
      const apres = scopesDe(correction.apres.nom);
      const dossier = segments(nom).at(-2) ?? '';
      const regroupe = `${dossier}|${apres.join(',')}|${avant.join(',')}`;
      const carte = scopes.get(regroupe) ?? { dossier, roles: [], avant, apres, lignes: [] };
      const role = segments(nom).slice(-2).join('/');
      if (!carte.roles.includes(role)) carte.roles.push(role);
      carte.lignes.push({ id: correction.id, avant: nom, apres: nom });
      scopes.set(regroupe, carte);
    }
  }
  return {
    variables: [...variables.values()].map((carte) => ({ sorte: 'variables' as const, ...carte })),
    crans: [...crans.values()].map((carte) => ({ sorte: 'crans' as const, ...carte })),
    modes,
    scopes: [...scopes].map(([regroupe, carte]) => ({ sorte: 'scopes' as const, cle: regroupe, ...carte })),
  };
}
