/**
 * Les opérateurs de dégradation des tailles en dur (Z1 à Z8, constat C29, famille F4) des stress tests F3 et F4.
 *
 * Chaque cas durcit un champ numérique de `Root` (ou d'un layer ajouté) : il retire la liaison du champ et lui donne une valeur
 * en `valeursEnDur`, puis pose les tokens que le cas veut face à cette valeur. Les tokens de taille de la base portent des valeurs
 * qui voisinent celles des cas ; le token de la propriété pour la taille du variant est donc réécrit (`ecrire`) ou écarté
 * (`neutraliser`, valeur 500) pour que seuls les tokens du cas répondent.
 *
 * L'oracle vient du plan (section 3.3, Z) et de la SPEC d'Architect : un token proche diffère de la valeur lue d'au plus
 * `min(2, 0,1 × max(|v|, 1))` px, au plus le plus proche de chaque côté, jamais pour 0 ; un proche n'est jamais une correction ; un
 * exact unique donne une correction ; plusieurs exacts donnent une question. Les propriétés de `components` d'un champ sont écrites
 * ici (`PROPRIETES_DU_CHAMP`), d'après le registre des propriétés, sans lire `corrections.ts`. La borne de proximité (`borneDeProximite`)
 * est recalculée de même, indépendamment de `candidatsDeLongueur.ts`.
 *
 * Les cas portent la famille `F4`. Les cas qui dépendent d'une question non confirmée (Q-F3-11, Q-F3-13, Q-F3-14, Q-08) portent
 * `mesure`. `Z5-6` (token sans segment de taille) porte `mesure` sous son propre identifiant : le plan n'y attend aucune correction,
 * alors que la règle « une seule réponse exacte donne une correction » (section 2.2) en attendrait une. Un cas Z2 déclare sa borne
 * dans `entree.borne`, un cas Z6 dit dans `entree.recherche` si le constat porte `recherche: incomplete` (`ConstatAttendu` n'a pas ce fait).
 */
import type { LayerLu, VariableDuCatalogue } from '../../../src/controles/index.js';
import type { ConstatAttendu } from '../commun/types.js';
import type { JetonDeCarte, NomDeLayer, ProprieteDeTaille, VariantDeCarte } from './carte.js';
import { construireLeComposant, GRAINE_PAR_DEFAUT, type ComposantDeBase } from './composantDeBase.js';
import {
  attendu, axeDeSegment, Degradation, jetonTaille, Registre, type CasDeComposant, type EntreeDeCas, type ResultatDeCas,
} from './operateursAxes.js';
import { ajouterUnLayer, delier } from './operateursPeinture.js';
import { JEUX_DE_VARIANTS } from './profils.js';

const CODES_DE_Z: readonly string[] = ['C29'];

/** Écarte un token de la recherche : sa valeur n'est proche d'aucune valeur des cas. */
const VALEUR_ECARTEE = 500;

export interface EntreeDeTaille extends EntreeDeCas {
  /** Z2 : la borne de proximité, en pixels, que le cas vise. */
  readonly borne?: number;
  /** Z6 : le constat attendu dit-il que la recherche est incomplète ? */
  readonly recherche?: 'incomplete' | 'ordinaire';
}

export const entreeDeTaille = (cas: CasDeComposant): EntreeDeTaille => cas.entree as EntreeDeTaille;

/** La règle de proximité de la SPEC d'Architect : au plus `min(2, 0,1 × max(|v|, 1))` px, jamais pour une valeur nulle. */
export function borneDeProximite(valeur: number): number {
  return valeur === 0 ? 0 : Math.min(2, 0.1 * Math.max(Math.abs(valeur), 1));
}

// ---------------------------------------------------------------------------------------------------------------------------
// Champs et propriétés

/** Les propriétés de `components` qui portent la valeur d'un champ : l'inventaire 4.3 et le registre des propriétés. */
export const PROPRIETES_DU_CHAMP: Readonly<Record<string, readonly string[]>> = {
  paddingLeft: ['padding-left', 'padding-x'], paddingRight: ['padding-right', 'padding-x'],
  paddingTop: ['padding-top', 'padding-y'], paddingBottom: ['padding-bottom', 'padding-y'],
  itemSpacing: ['gap'], counterAxisSpacing: [],
  cornerRadius: ['radius'], topLeftRadius: ['radius'], topRightRadius: ['radius'], bottomLeftRadius: ['radius'], bottomRightRadius: ['radius'],
  strokeWeight: ['border-width'],
};

/** La propriété de la base dont le token donne sa valeur au champ. `counterAxisSpacing` emprunte `gap` : il n'a pas de propriété. */
const PROPRIETE_DE_BASE: Readonly<Record<string, ProprieteDeTaille>> = {
  paddingLeft: 'padding-x', paddingRight: 'padding-x', paddingTop: 'padding-y', paddingBottom: 'padding-y',
  itemSpacing: 'gap', counterAxisSpacing: 'gap',
  cornerRadius: 'radius', topLeftRadius: 'radius', topRightRadius: 'radius', bottomLeftRadius: 'radius', bottomRightRadius: 'radius',
  strokeWeight: 'border-width',
};

/** Durcit un champ : retire la liaison de la base si le champ en porte une, puis écrit sa valeur lue. */
function durcir(degradation: Degradation, variant: string, champ: string, valeur: number, nomDuLayer: NomDeLayer = 'Root'): LayerLu {
  const layer = degradation.layer(variant, nomDuLayer);
  const liee = degradation.carte.liaisons.find((liaison) => liaison.variant === variant && liaison.nomDuLayer === nomDuLayer && liaison.champ === champ);
  if (liee) delier(degradation, liee);
  degradation.inserer(layer.valeursEnDur, { champ, valeur });
  degradation.zones.push({ variant, layer: layer.id, champ });
  return layer;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Tokens

const collectionDesComposants = (degradation: Degradation) => degradation.catalogue.collections.find((collection) => collection.role === 'components')!;

type ValeurDeToken = number | string | { readonly alias: string };

/** Écrit les valeurs de la variable, une par mode de `components` ; une seule valeur vaut pour tous les modes. */
function ecrire(degradation: Degradation, variable: VariableDuCatalogue, valeurs: ValeurDeToken | readonly ValeurDeToken[]): void {
  const modes = collectionDesComposants(degradation).modes;
  const liste = Array.isArray(valeurs) ? valeurs as readonly ValeurDeToken[] : modes.map(() => valeurs as ValeurDeToken);
  degradation.fixer(variable, 'valeurs', Object.fromEntries(modes.map((mode, rang) => {
    const valeur = liste[rang];
    return [mode.id, typeof valeur === 'object' ? { alias: valeur.alias } : { valeur }];
  })));
}

const neutraliser = (degradation: Degradation, variable: VariableDuCatalogue): void => ecrire(degradation, variable, VALEUR_ECARTEE);

interface ChangementDeNom {
  readonly composant?: string; readonly famille?: string; readonly element?: string; readonly etat?: string;
  readonly taille?: string; readonly sansTaille?: true; readonly propriete?: string;
}

/** Le nom d'un token voisin d'un token de taille de la base (`jeu/size/<taille>/<propriété>`), dans l'ordre de la grammaire. */
function nomDeToken(nomDeBase: string, changement: ChangementDeNom): string {
  const segments = nomDeBase.split('/');
  const milieu = segments.slice(2, -1);
  return [
    changement.composant ?? segments[0], changement.famille ?? segments[1], ...(changement.element ? [changement.element] : []),
    ...(changement.taille !== undefined ? [changement.taille] : changement.sansTaille ? [] : milieu),
    ...(changement.etat ? [changement.etat] : []), changement.propriete ?? segments[segments.length - 1],
  ].join('/');
}

// ---------------------------------------------------------------------------------------------------------------------------
// Cas

interface Contexte {
  readonly degradation: Degradation;
  readonly base: ComposantDeBase;
  readonly variant: VariantDeCarte;
  readonly layer: LayerLu;
  readonly champ: string;
  readonly valeur: number;
  /** Le token de la base pour la propriété du champ et la taille du variant. */
  readonly jeton: JetonDeCarte;
  readonly variable: VariableDuCatalogue;
}

const lieuDe = (contexte: Contexte) => ({ variant: contexte.variant.id, layer: contexte.layer.id, champ: contexte.champ, token: '' });
const constat = (contexte: Contexte, forme: ConstatAttendu['forme'], plus: Parameters<typeof attendu>[3] = {}): ConstatAttendu =>
  attendu('C29', forme, lieuDe(contexte), plus);
const correctionVers = (contexte: Contexte, variable: { cle: string; nom: string }): ConstatAttendu =>
  constat(contexte, 'correction', { apres: { cle: variable.cle, nom: variable.nom } });
const questionSur = (contexte: Contexte, variables: readonly { nom: string }[]): ConstatAttendu =>
  constat(contexte, 'question', { candidats: variables.map((variable) => variable.nom) });

function ajouter(registre: Registre, operateur: string, degradation: Degradation, resultat: ResultatDeCas, extra: Pick<EntreeDeTaille, 'borne' | 'recherche'> = {}): void {
  const rang = registre.cas.length;
  registre.ajouter(operateur, degradation, resultat);
  const cas = registre.cas[rang];
  registre.cas[rang] = { ...cas, codesJuges: CODES_DE_Z, entree: { ...cas.entree, ...extra } as EntreeDeCas };
}

export function operateursTailles(base: ComposantDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeComposant[] {
  const registre = new Registre(base, graine, 'F4');
  const carte = base.carte;
  const axeTaille = axeDeSegment(carte, 'taille');
  const axeEtat = axeDeSegment(carte, 'etat');
  const bases: { deuxModes?: ComposantDeBase; badge?: ComposantDeBase } = {};

  /** Ouvre un cas : un variant tiré, le champ durci à `valeur` (ou à la valeur du token de la base pour une fonction). */
  const ouvrir = (
    operateur: string, champ: string, valeur: number | ((jeton: JetonDeCarte) => number), depart: ComposantDeBase = base,
  ): Contexte | undefined => {
    const variant = registre.tirer(operateur, depart.carte.variants);
    const jeton = jetonTaille(depart.carte, variant, PROPRIETE_DE_BASE[champ]);
    if (!jeton) return undefined;
    const lue = typeof valeur === 'function' ? valeur(jeton) : valeur;
    const degradation = new Degradation(depart);
    const layer = durcir(degradation, variant.id, champ, lue);
    return { degradation, base: depart, variant, layer, champ, valeur: lue, jeton, variable: degradation.variable(jeton.cle) };
  };
  const clone = (contexte: Contexte, nom: string, valeurs: ValeurDeToken | readonly ValeurDeToken[], changements: Partial<Omit<VariableDuCatalogue, 'cle'>> = {}): VariableDuCatalogue => {
    const copie = contexte.degradation.cloner(contexte.variable, changements);
    contexte.degradation.fixer(copie, 'nom', nom);
    ecrire(contexte.degradation, copie, valeurs);
    return copie;
  };
  const nomVoisin = (contexte: Contexte, changement: ChangementDeNom): string => nomDeToken(contexte.jeton.nom, changement);
  const resultat = (description: string, attendus: ConstatAttendu[], mesure?: string): ResultatDeCas =>
    ({ description, attendus, ...(mesure ? { verdict: 'mesure' as const, question: mesure } : {}) });
  const decrire = (operateur: string, contexte: Contexte, suite: string): string =>
    `${operateur} : ${contexte.champ} = ${contexte.valeur} du variant ${contexte.variant.nom}, ${suite}`;

  // Z1. Une valeur exacte en dur par champ : le token de la propriété pour la taille du variant porte la même valeur.
  for (const champ of ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing', 'counterAxisSpacing', 'cornerRadius',
    'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'strokeWeight']) {
    const contexte = ouvrir('Z1', champ, (jeton) => jeton.pixels!);
    if (!contexte) continue;
    // `counterAxisSpacing` n'a pas de propriété du registre : aucun token ne peut le dire, même à valeur égale.
    ajouter(registre, 'Z1', contexte.degradation, resultat(decrire('Z1', contexte, `token ${contexte.jeton.nom}`),
      [champ === 'counterAxisSpacing' ? constat(contexte, 'a-faire') : correctionVers(contexte, contexte.jeton)]));
  }

  // Z2. Une valeur proche : un token à la borne, juste en deçà, juste au-delà, côté inférieur puis supérieur ; les deux côtés ensemble.
  const arrondi = (nombre: number): number => Number(nombre.toFixed(6));
  for (const valeur of [0.5, 4, 10, 16, 30, 100]) {
    const borne = borneDeProximite(valeur);
    const distances: readonly (readonly [libelle: string, distance: number])[] = [
      ['à la borne', borne], ['juste en deçà de la borne', borne - 0.01], ['juste au-delà de la borne', borne + 0.01],
    ];
    for (const [libelle, distance] of distances) {
      for (const cote of ['inférieur', 'supérieur'] as const) {
        const contexte = ouvrir('Z2', 'cornerRadius', valeur);
        if (!contexte) continue;
        ecrire(contexte.degradation, contexte.variable, arrondi(cote === 'inférieur' ? valeur - distance : valeur + distance));
        const proche = distance <= borne;
        ajouter(registre, 'Z2', contexte.degradation, resultat(
          decrire('Z2', contexte, `borne ${borne} px, token ${libelle}, côté ${cote}`),
          [proche ? questionSur(contexte, [contexte.jeton]) : constat(contexte, 'a-faire')],
        ), { borne });
      }
    }
    const contexte = ouvrir('Z2', 'cornerRadius', valeur);
    if (!contexte) continue;
    ecrire(contexte.degradation, contexte.variable, arrondi(valeur - borne));
    const autre = clone(contexte, nomVoisin(contexte, { sansTaille: true }), arrondi(valeur + borne));
    ajouter(registre, 'Z2', contexte.degradation, resultat(
      decrire('Z2', contexte, `borne ${borne} px, un token à la borne de chaque côté`),
      [questionSur(contexte, [contexte.jeton, autre])],
    ), { borne });
  }

  // Z3. Flottants : 12 + δ face à un token de 12, puis un token de 12 + δ face à une valeur de 12 ; 0,1 + 0,2 face à 0,3.
  const deltas = [1e-12, 1e-9, 1e-6, 0.01];
  const exacteAUnMicron = (delta: number): boolean => delta <= 1e-6;
  for (const sens of ['valeur', 'token'] as const) {
    for (const delta of deltas) {
      const contexte = ouvrir('Z3', 'cornerRadius', sens === 'valeur' ? 12 + delta : 12);
      if (!contexte) continue;
      ecrire(contexte.degradation, contexte.variable, sens === 'valeur' ? 12 : 12 + delta);
      const exact = exacteAUnMicron(delta);
      ajouter(registre, 'Z3', contexte.degradation, resultat(
        decrire('Z3', contexte, `${sens === 'valeur' ? 'valeur lue' : 'token'} décalé de ${delta} px`),
        [exact ? correctionVers(contexte, contexte.jeton) : questionSur(contexte, [contexte.jeton])], exact ? 'Q-F3-11' : undefined,
      ));
    }
  }
  {
    const contexte = ouvrir('Z3', 'cornerRadius', 0.1 + 0.2);
    if (contexte) {
      ecrire(contexte.degradation, contexte.variable, 0.3);
      ajouter(registre, 'Z3', contexte.degradation, resultat(decrire('Z3', contexte, 'token à 0,3'), [correctionVers(contexte, contexte.jeton)], 'Q-F3-11'));
    }
  }

  // Z4. Plusieurs candidats.
  {
    // 1. Deux exacts, `padding-left` et `padding-x`.
    const contexte = ouvrir('Z4', 'paddingLeft', 12);
    if (contexte) {
      ecrire(contexte.degradation, contexte.variable, 12);
      const gauche = clone(contexte, nomVoisin(contexte, { propriete: 'padding-left' }), 12);
      ajouter(registre, 'Z4', contexte.degradation, resultat(decrire('Z4', contexte, 'deux exacts, padding-x et padding-left'), [questionSur(contexte, [contexte.jeton, gauche])]));
    }
  }
  {
    // 2. Un exact et un proche : le proche n'est montré que sans exact, donc l'exact seul est une correction.
    const contexte = ouvrir('Z4', 'cornerRadius', 12);
    if (contexte) {
      ecrire(contexte.degradation, contexte.variable, 12);
      clone(contexte, nomVoisin(contexte, { sansTaille: true }), 13);
      ajouter(registre, 'Z4', contexte.degradation, resultat(decrire('Z4', contexte, 'un exact (12) et un proche (13)'), [correctionVers(contexte, contexte.jeton)]));
    }
  }
  {
    // 3. Deux proches du même côté à égalité : Q-F3-11 les montre tous les deux.
    const contexte = ouvrir('Z4', 'cornerRadius', 12);
    if (contexte) {
      ecrire(contexte.degradation, contexte.variable, 11);
      const autre = clone(contexte, nomVoisin(contexte, { sansTaille: true }), 11);
      ajouter(registre, 'Z4', contexte.degradation, resultat(decrire('Z4', contexte, 'deux proches à égalité (11 et 11)'), [questionSur(contexte, [contexte.jeton, autre])], 'Q-F3-11'));
    }
  }
  {
    // 4. Un proche de chaque côté.
    const contexte = ouvrir('Z4', 'cornerRadius', 12);
    if (contexte) {
      ecrire(contexte.degradation, contexte.variable, 11);
      const autre = clone(contexte, nomVoisin(contexte, { sansTaille: true }), 13);
      ajouter(registre, 'Z4', contexte.degradation, resultat(decrire('Z4', contexte, 'un proche de chaque côté (11 et 13)'), [questionSur(contexte, [contexte.jeton, autre])]));
    }
  }
  {
    // 5. Trois proches du même côté : le plus proche seul.
    const contexte = ouvrir('Z4', 'cornerRadius', 12);
    if (contexte) {
      ecrire(contexte.degradation, contexte.variable, 11.5);
      clone(contexte, nomVoisin(contexte, { sansTaille: true }), 11.2);
      clone(contexte, nomVoisin(contexte, { sansTaille: true, element: 'root' }), 10.9);
      ajouter(registre, 'Z4', contexte.degradation, resultat(decrire('Z4', contexte, 'trois proches du même côté (11,5, 11,2 et 10,9)'), [questionSur(contexte, [contexte.jeton])]));
    }
  }
  {
    // 6. Deux exacts, dont un d'élément qui nomme le layer : les deux sont compatibles, donc une question.
    const contexte = ouvrir('Z4', 'cornerRadius', 12);
    if (contexte) {
      ecrire(contexte.degradation, contexte.variable, 12);
      const element = clone(contexte, nomVoisin(contexte, { element: 'root' }), 12);
      ajouter(registre, 'Z4', contexte.degradation, resultat(decrire('Z4', contexte, 'deux exacts, dont un d\'élément root'), [questionSur(contexte, [contexte.jeton, element])]));
    }
  }

  // Z5. Portée du token : valeur 12, token de la base écarté sauf quand le cas le réécrit.
  const unCas5 = (champ = 'cornerRadius', depart: ComposantDeBase = base): Contexte | undefined => ouvrir('Z5', champ, 12, depart);
  {
    const contexte = unCas5();
    if (contexte && axeTaille) {
      neutraliser(contexte.degradation, contexte.variable);
      const autre = axeTaille.valeurs.find((valeur) => valeur !== contexte.variant.valeurs[axeTaille.propriete])!;
      const jetonDeLAutre = jetonTaille(carte, contexte.variant, 'radius', { [axeTaille.propriete]: autre });
      if (jetonDeLAutre) {
        ecrire(contexte.degradation, contexte.degradation.variable(jetonDeLAutre.cle), 12);
        ajouter(registre, 'Z5', contexte.degradation, resultat(decrire('Z5', contexte, `seul token à 12 : celui de la taille ${autre}`), [constat(contexte, 'a-faire')]));
      }
    }
  }
  if (axeEtat) {
    const contexte = unCas5();
    if (contexte) {
      neutraliser(contexte.degradation, contexte.variable);
      const etat = contexte.variant.valeurs[axeEtat.propriete]?.toLowerCase() === 'hover' ? 'disabled' : 'hover';
      clone(contexte, nomVoisin(contexte, { etat }), 12);
      ajouter(registre, 'Z5', contexte.degradation, resultat(decrire('Z5', contexte, `seul token à 12 : celui de l'état ${etat}`), [constat(contexte, 'a-faire')]));
    }
  }
  {
    const contexte = unCas5();
    if (contexte) {
      neutraliser(contexte.degradation, contexte.variable);
      clone(contexte, nomVoisin(contexte, { composant: 'alert' }), 12);
      ajouter(registre, 'Z5', contexte.degradation, resultat(decrire('Z5', contexte, 'seul token à 12 : celui du composant alert'), [constat(contexte, 'a-faire')]));
    }
  }
  for (const [element, nomme] of [['root', true], ['icon', false]] as const) {
    const contexte = unCas5();
    if (contexte) {
      neutraliser(contexte.degradation, contexte.variable);
      const token = clone(contexte, nomVoisin(contexte, { element }), 12);
      ajouter(registre, 'Z5', contexte.degradation, resultat(
        decrire('Z5', contexte, `seul token à 12 : élément ${element}, ${nomme ? 'nomme' : 'ne nomme pas'} le layer Root`),
        [nomme ? correctionVers(contexte, token) : constat(contexte, 'a-faire')],
      ));
    }
  }
  {
    // Le plan attend « C29 » sans correction pour ce cas ; le code dit qu'un segment absent vaut pour toutes les valeurs de l'axe.
    const contexte = unCas5();
    if (contexte) {
      neutraliser(contexte.degradation, contexte.variable);
      clone(contexte, nomVoisin(contexte, { sansTaille: true }), 12);
      ajouter(registre, 'Z5', contexte.degradation, resultat(decrire('Z5', contexte, 'seul token à 12 : sans segment de taille'), [constat(contexte, 'a-faire')], 'Z5-6'));
    }
  }
  {
    // Un axe hors liste : `Type` n'a pas de segment lu. Le jeu est celui de badge-9, avec les réglages de la base.
    bases.badge ??= construireLeComposant({ ...base.spec, ...JEUX_DE_VARIANTS['badge-9'] });
    const contexte = unCas5('cornerRadius', bases.badge);
    const axeType = axeDeSegment(bases.badge.carte, 'style');
    if (contexte && axeType) {
      neutraliser(contexte.degradation, contexte.variable);
      const valeurDeType = contexte.variant.valeurs[axeType.propriete].toLowerCase();
      clone(contexte, nomVoisin(contexte, { element: valeurDeType }), 12);
      ajouter(registre, 'Z5', contexte.degradation, resultat(decrire('Z5', contexte, `seul token à 12 : segment ${valeurDeType} de l'axe ${axeType.propriete}`), [constat(contexte, 'a-faire')], 'Q-08'));
    }
  }
  {
    const contexte = unCas5();
    const layout = contexte?.degradation.variableParNom('sizing/12');
    if (contexte && layout) {
      ecrire(contexte.degradation, contexte.variable, { alias: layout.cle });
      ajouter(registre, 'Z5', contexte.degradation, resultat(decrire('Z5', contexte, 'token alias de layout/sizing/12, résolu'), [correctionVers(contexte, contexte.jeton)]));
    }
  }
  {
    // Alias en cycle : le token vise un second token qui le vise en retour.
    const contexte = unCas5();
    if (contexte) {
      const autre = clone(contexte, nomVoisin(contexte, { sansTaille: true }), 12);
      ecrire(contexte.degradation, contexte.variable, { alias: autre.cle });
      ecrire(contexte.degradation, autre, { alias: contexte.variable.cle });
      ajouter(registre, 'Z5', contexte.degradation, resultat(decrire('Z5', contexte, 'deux tokens en alias l\'un de l\'autre'), [constat(contexte, 'a-faire')]));
    }
  }
  {
    // Six variables de layout en chaîne : la douzième valeur se trouve au septième niveau.
    const contexte = unCas5();
    const modele = contexte?.degradation.variableParNom('sizing/12');
    if (contexte && modele) {
      const maillons: VariableDuCatalogue[] = [];
      for (let rang = 6; rang >= 1; rang--) {
        const suivant = maillons[0];
        const maillon = contexte.degradation.cloner(modele, { nom: `sizing/chaine-${rang}`, valeurs: { '50:0': suivant ? { alias: suivant.cle } : { valeur: 12 } } });
        maillons.unshift(maillon);
      }
      ecrire(contexte.degradation, contexte.variable, { alias: maillons[0].cle });
      ajouter(registre, 'Z5', contexte.degradation, resultat(decrire('Z5', contexte, 'alias sur six niveaux de layout'), [constat(contexte, 'a-faire')]));
    }
  }
  {
    const contexte = unCas5();
    if (contexte) {
      contexte.degradation.fixer(contexte.variable, 'type', 'STRING');
      ecrire(contexte.degradation, contexte.variable, '12');
      ajouter(registre, 'Z5', contexte.degradation, resultat(decrire('Z5', contexte, 'token de type STRING'), [constat(contexte, 'a-faire')]));
    }
  }
  for (const egaux of [false, true]) {
    bases.deuxModes ??= construireLeComposant({ ...base.spec, modesDeTaille: 2 });
    const contexte = unCas5('cornerRadius', bases.deuxModes);
    if (contexte) {
      ecrire(contexte.degradation, contexte.variable, [12, egaux ? 12 : 16]);
      ajouter(registre, 'Z5', contexte.degradation, resultat(
        decrire('Z5', contexte, egaux ? 'token à deux modes égaux (12 et 12)' : 'token à deux modes divergents (12 et 16)'),
        [egaux ? correctionVers(contexte, contexte.jeton) : constat(contexte, 'a-faire')], egaux ? undefined : 'Q-F3-14',
      ));
    }
  }

  // Z6. Recherche incomplète : le token de la base porte 12, valeur exacte, sauf mention contraire.
  const unCas6 = (): Contexte | undefined => ouvrir('Z6', 'cornerRadius', 12);
  {
    const contexte = unCas6();
    if (contexte) {
      ecrire(contexte.degradation, contexte.variable, 12);
      contexte.degradation.retirer(contexte.degradation.catalogue.collections, collectionDesComposants(contexte.degradation));
      ajouter(registre, 'Z6', contexte.degradation, resultat(decrire('Z6', contexte, 'collection components absente du catalogue'), [constat(contexte, 'a-faire')]), { recherche: 'incomplete' });
    }
  }
  {
    const contexte = unCas6();
    if (contexte) {
      ecrire(contexte.degradation, contexte.variable, 12);
      contexte.degradation.fixer(collectionDesComposants(contexte.degradation), 'etat', 'inaccessible');
      ajouter(registre, 'Z6', contexte.degradation, resultat(decrire('Z6', contexte, 'collection components inaccessible'), [constat(contexte, 'a-faire')]), { recherche: 'incomplete' });
    }
  }
  for (const etat of ['non-chargee', 'inaccessible'] as const) {
    const contexte = unCas6();
    if (contexte) {
      ecrire(contexte.degradation, contexte.variable, 12);
      contexte.degradation.fixer(contexte.variable, 'etat', etat);
      ajouter(registre, 'Z6', contexte.degradation, resultat(decrire('Z6', contexte, `token candidat ${etat}`), [constat(contexte, 'a-faire')]), { recherche: 'incomplete' });
    }
  }
  {
    // Une variable non chargée qui n'est pas candidate (le gap du même variant) ne rend pas la recherche incomplète.
    const contexte = unCas6();
    const gap = contexte && jetonTaille(carte, contexte.variant, 'gap');
    if (contexte && gap) {
      ecrire(contexte.degradation, contexte.variable, 12);
      contexte.degradation.fixer(contexte.degradation.variable(gap.cle), 'etat', 'non-chargee');
      ajouter(registre, 'Z6', contexte.degradation, resultat(decrire('Z6', contexte, 'token gap non chargé, hors propriété du champ'), [correctionVers(contexte, contexte.jeton)]), { recherche: 'ordinaire' });
    }
  }

  // Z7. Périmètre du layer : ce que C29 juge ou non selon le layer et la lecture.
  const sansToken = (operateur: string, champ: string, valeur: number): Contexte | undefined => {
    const contexte = ouvrir(operateur, champ, valeur);
    if (contexte) neutraliser(contexte.degradation, contexte.variable);
    return contexte;
  };
  const surUnLayerAjoute = (
    description: string, spec: { nom: string; type: string; visible?: boolean; parent?: string | null }, jugee: boolean, enveloppe?: { visible: boolean },
  ): void => {
    const contexte = sansToken('Z7', 'cornerRadius', 20);
    if (!contexte) return;
    // Le champ de Root reste lié : seul le layer ajouté porte une valeur en dur. On retire donc celle que `ouvrir` a durcie.
    const racine = contexte.layer;
    const dure = racine.valeursEnDur.find((entree) => entree.champ === 'cornerRadius' && entree.valeur === 20)!;
    contexte.degradation.retirer(racine.valeursEnDur, dure);
    const parent = enveloppe ? ajouterUnLayer(contexte.degradation, contexte.variant.id, { nom: 'Wrap', type: 'FRAME', visible: enveloppe.visible }) : undefined;
    const layer = ajouterUnLayer(contexte.degradation, contexte.variant.id, { ...spec, ...(parent ? { parent: parent.id } : {}) });
    contexte.degradation.inserer(layer.valeursEnDur, { champ: 'cornerRadius', valeur: 20 });
    const sur: Contexte = { ...contexte, layer };
    ajouter(registre, 'Z7', sur.degradation, resultat(`Z7 : ${description}, cornerRadius = 20 du variant ${contexte.variant.nom}`, jugee ? [constat(sur, 'a-faire')] : []));
  };
  surUnLayerAjoute('layer masqué', { nom: 'Box', type: 'FRAME', visible: false }, false);
  surUnLayerAjoute('ancêtre masqué', { nom: 'Box', type: 'FRAME' }, false, { visible: false });
  surUnLayerAjoute('instance imbriquée', { nom: 'Nested', type: 'INSTANCE' }, false);
  surUnLayerAjoute('instance sans parent', { nom: 'Orphan', type: 'INSTANCE', parent: null }, true);
  {
    const contexte = sansToken('Z7', 'cornerRadius', 0);
    if (contexte) ajouter(registre, 'Z7', contexte.degradation, resultat(decrire('Z7', contexte, 'valeur nulle'), []));
  }
  {
    const contexte = sansToken('Z7', 'cornerRadius', 20);
    if (contexte) {
      contexte.degradation.inserer(contexte.degradation.releve.lecture.manquees, { layer: contexte.layer.id, champ: 'cornerRadius', motif: 'lecture refusée' });
      ajouter(registre, 'Z7', contexte.degradation, resultat(decrire('Z7', contexte, 'lecture manquée sur ce champ'), []));
    }
  }
  {
    const contexte = sansToken('Z7', 'cornerRadius', 20);
    if (contexte) {
      contexte.degradation.inserer(contexte.degradation.releve.lecture.manquees, { layer: contexte.layer.id, champ: 'paddingLeft', motif: 'lecture refusée' });
      ajouter(registre, 'Z7', contexte.degradation, resultat(decrire('Z7', contexte, 'lecture manquée sur paddingLeft, un autre champ du même layer'), [constat(contexte, 'a-faire')]));
    }
  }
  for (const champ of ['width', 'height']) {
    // Le relevé donne déjà la boîte calculée de chaque layer ; le cas la change sur Label, sans lier ni durcir rien d'autre.
    const variant = registre.tirer('Z7', carte.variants);
    const degradation = new Degradation(base);
    const layer = degradation.layer(variant.id, 'Label');
    degradation.fixer(layer.valeursEnDur.find((entree) => entree.champ === champ)!, 'valeur', 20);
    degradation.zones.push({ variant: variant.id, layer: layer.id, champ });
    ajouter(registre, 'Z7', degradation, resultat(`Z7 : ${champ === 'width' ? 'largeur' : 'hauteur'} fixe de Label = 20 du variant ${variant.nom}`, []));
  }
  for (const valeur of [-4, 4096]) {
    const contexte = sansToken('Z7', 'cornerRadius', valeur);
    if (contexte) ajouter(registre, 'Z7', contexte.degradation, resultat(decrire('Z7', contexte, 'valeur hors de l\'ordre courant'), [constat(contexte, 'a-faire')]));
  }
  {
    // Deux variants portent un layer de même identifiant : chacun donne son C29, sans correction (un identifiant ne départage pas).
    const [premier, second] = [registre.tirer('Z7', carte.variants), carte.variants.at(-1)!];
    const variants = premier.id === second.id ? [carte.variants[0], carte.variants[1]] : [premier, second];
    if (variants[1]) {
      const degradation = new Degradation(base);
      const attendus: ConstatAttendu[] = [];
      for (const variant of variants) {
        const layer = ajouterUnLayer(degradation, variant.id, { nom: 'Box', type: 'FRAME' });
        degradation.zones.pop();
        degradation.fixer(layer, 'id', 'partage:1');
        degradation.zones.push({ variant: variant.id, layer: 'partage:1', champ: 'paddingLeft' });
        degradation.inserer(layer.valeursEnDur, { champ: 'paddingLeft', valeur: 20 });
        attendus.push(attendu('C29', 'a-faire', { variant: variant.id, layer: 'partage:1', champ: 'paddingLeft', token: '' }));
      }
      ajouter(registre, 'Z7', degradation, resultat(`Z7 : même identifiant de layer dans les variants ${variants[0].nom} et ${variants[1].nom}`, attendus));
    }
  }

  // Z8. Écriture du token : dix propriétés × deux familles, une valeur de 20 que seul le token du cas porte.
  const proprietes: readonly (readonly [propriete: string, champ: string, sorte: 'correction' | 'borderRadius' | 'aucun'])[] = [
    ['padding-x', 'paddingLeft', 'correction'], ['padding-left', 'paddingLeft', 'correction'], ['padding', 'paddingLeft', 'aucun'],
    ['gap', 'itemSpacing', 'correction'], ['border-width', 'strokeWeight', 'correction'], ['border-radius', 'cornerRadius', 'borderRadius'],
    ['radius', 'cornerRadius', 'correction'], ['border-width-top', 'strokeWeight', 'aucun'], ['icon-size', 'itemSpacing', 'aucun'],
    ['spacing', 'itemSpacing', 'aucun'],
  ];
  for (const famille of ['size', 'sizes']) {
    for (const [propriete, champ, sorte] of proprietes) {
      const contexte = ouvrir('Z8', champ, 20);
      if (!contexte) continue;
      neutraliser(contexte.degradation, contexte.variable);
      const token = clone(contexte, nomVoisin(contexte, { famille, propriete }), 20);
      const lit = sorte !== 'aucun';
      ajouter(registre, 'Z8', contexte.degradation, resultat(
        decrire('Z8', contexte, `token ${token.nom}`),
        [lit ? correctionVers(contexte, token) : constat(contexte, 'a-faire')],
        (famille === 'sizes' && lit) || sorte === 'borderRadius' ? 'Q-F3-13' : undefined,
      ));
    }
  }
  return registre.cas;
}
