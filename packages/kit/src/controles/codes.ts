/**
 * Le catalogue des codes de constat : la seule liste des `C7` à `C82` que les contrôles du kit et ceux d'UCM Architect rendent.
 *
 * Chaque code y figure une fois. `Constat.code` ne prend que ces valeurs : un code absent d'ici ne compile pas, et
 * `tests/codesDesConstats.test.ts` relève les codes écrits dans `packages/kit/src/` et `packages/plugin-architect/src/` pour exiger
 * qu'ils soient au catalogue et qu'aucune entrée ne reste sans emploi. Un code déjà publié ne change pas de sens ; un contrôle
 * nouveau prend le numéro suivant.
 *
 * `familles` et `types` listent ce que les contrôles rendent aujourd'hui, pas ce que le type de `Constat` permet. Un code a plusieurs
 * familles quand il juge plusieurs natures de champ (C80 : couleur ou taille). Les codes que le moteur de l'exporteur donne à ses
 * points (C30, C34, C35, C41, C42, C44) prennent aussi `bloquant` quand le point a la sévérité `danger`.
 */
import type { TypeDAlerte } from '../referentiel/signaux.js';
import type { Constat } from './constat.js';

type FamilleDeConstat = Constat['famille'];

interface EntreeDuCatalogue {
  readonly code: `C${number}`;
  readonly familles: readonly FamilleDeConstat[];
  readonly types: readonly TypeDAlerte[];
  /** Ce que le code contrôle, en une phrase. */
  readonly sens: string;
}

export const CODES_DES_CONSTATS = [
  { code: 'C7', familles: ['variants'], types: ['verifier'], sens: 'Aucun token du composant ne prévoit la valeur d’un axe que des variants portent.' },
  { code: 'C8', familles: ['tokens', 'variants'], types: ['corriger'], sens: 'Un segment de nom, de token ou de variant, s’écrit autrement que la forme que UCM attend.' },
  { code: 'C9', familles: ['tokens'], types: ['verifier'], sens: 'Un token et un variant nomment la même valeur d’axe avec deux écritures.' },
  { code: 'C10', familles: ['tailles'], types: ['corriger'], sens: 'Le segment de taille d’un token, ou la valeur de taille d’un variant, s’écrit autrement que la forme que UCM attend.' },
  { code: 'C12', familles: ['variants'], types: ['verifier'], sens: 'Une valeur de variant n’existe dans les tokens que sous une autre écriture, avec un seul candidat.' },
  { code: 'C13', familles: ['variants'], types: ['verifier'], sens: 'Une valeur de variant n’existe dans les tokens que sous une autre écriture, avec plusieurs candidats.' },
  { code: 'C15', familles: ['liaisons'], types: ['corriger'], sens: 'Un layer est lié au token d’une autre valeur d’axe que celle de son variant, hors axe d’état.' },
  { code: 'C16', familles: ['liaisons'], types: ['corriger'], sens: 'Un layer est lié au token d’un autre état que celui de son variant.' },
  { code: 'C17', familles: ['liaisons'], types: ['corriger'], sens: 'Le rôle du token lié ne convient pas au layer.' },
  { code: 'C18', familles: ['liaisons'], types: ['verifier'], sens: 'Le token lié n’a pas le scope que le champ du layer demande.' },
  { code: 'C19', familles: ['liaisons'], types: ['corriger'], sens: 'Un layer est lié à un token d’un autre composant.' },
  { code: 'C20', familles: ['liaisons'], types: ['corriger'], sens: 'Un token du composant vise, dans les couches de référence, une couche ou une cible que son rôle n’admet pas.' },
  { code: 'C21', familles: ['liaisons'], types: ['verifier'], sens: 'Un layer est lié à un token que les autres variants ne lient pas.' },
  { code: 'C22', familles: ['liaisons'], types: ['corriger'], sens: 'Le nom du token lié porte une autre valeur d’axe que celle du variant.' },
  { code: 'C24', familles: ['liaisons'], types: ['corriger'], sens: 'Un layer lie un token d’un autre rôle que celui qu’il attend, ou ne reprend pas la liaison du variant modèle.' },
  { code: 'C25', familles: ['liaisons'], types: ['corriger'], sens: 'Une peinture unie visible n’est liée à aucun token.' },
  { code: 'C29', familles: ['tailles'], types: ['corriger'], sens: 'Une longueur écrite en dur n’est liée à aucune variable.' },
  { code: 'C30', familles: ['liaisons', 'tailles', 'typographie', 'tokens'], types: ['corriger', 'bloquant'], sens: 'Le moteur de l’exporteur relève une valeur ou une liaison de variable à corriger dans Figma.' },
  { code: 'C31', familles: ['variants'], types: ['verifier', 'info'], sens: 'Une combinaison de valeurs d’axes n’existe dans aucun variant.' },
  { code: 'C32', familles: ['tokens'], types: ['verifier'], sens: 'Un token du composant n’est lu par aucun variant, ou son nom ne se lit pas.' },
  { code: 'C33', familles: ['variants'], types: ['verifier'], sens: 'Un variant n’a aucun token d’une famille que les autres variants ont.' },
  { code: 'C34', familles: ['variants'], types: ['verifier', 'bloquant'], sens: 'Le moteur de l’exporteur relève un variant ou une valeur d’axe que le composant ne définit pas ou n’écrit pas comme UCM.' },
  { code: 'C35', familles: ['visibilite'], types: ['verifier', 'bloquant'], sens: 'Le moteur de l’exporteur relève un layer masqué ou une propriété qui pilote la visibilité d’un layer.' },
  { code: 'C41', familles: ['liaisons', 'tailles', 'typographie', 'tokens'], types: ['bloquant'], sens: 'Le moteur de l’exporteur ne retrouve pas une variable que le composant lie.' },
  { code: 'C42', familles: ['export'], types: ['bloquant', 'verifier', 'info'], sens: 'Le moteur de l’exporteur relève un point d’export qu’aucune autre règle ne reconnaît, et l’analyse l’emploie aussi pour une lecture arrêtée.' },
  { code: 'C43', familles: ['regles'], types: ['corriger'], sens: 'Le composant n’a pas d’instance de règles d’usage.' },
  { code: 'C44', familles: ['regles'], types: ['corriger', 'bloquant'], sens: 'Le moteur de l’exporteur relève une règle d’usage invalide.' },
  { code: 'C45', familles: ['regles'], types: ['corriger'], sens: 'Une règle d’usage et les propriétés du composant ne se correspondent pas.' },
  { code: 'C49', familles: ['contraste'], types: ['corriger', 'verifier', 'info'], sens: 'Le texte ou l’icône a un contraste sous le seuil sur son fond, ou un texte mesure moins de 12 px.' },
  { code: 'C50', familles: ['contraste'], types: ['corriger', 'verifier', 'info'], sens: 'Un contour ou un anneau de focus a un contraste sous le seuil, ou le variant n’a pas d’anneau.' },
  { code: 'C51', familles: ['contraste'], types: ['verifier'], sens: 'L’anneau de focus est plus fin ou plus proche du layer que la recommandation.' },
  { code: 'C52', familles: ['contraste'], types: ['corriger', 'verifier'], sens: 'La zone cliquable est plus petite que la cible minimale ou la cible tactile recommandée.' },
  { code: 'C53', familles: ['contraste'], types: ['info'], sens: 'Des variants désactivés sont exclus des mesures d’accessibilité.' },
  { code: 'C59', familles: ['liaisons'], types: ['corriger'], sens: 'Un texte lié à un foreground de surface n’a aucune surface posée dessous.' },
  { code: 'C60', familles: ['liaisons'], types: ['corriger'], sens: 'Le mode d’une variable de thème est lié à la branche de l’autre mode.' },
  { code: 'C63', familles: ['liaisons', 'tailles', 'variants'], types: ['corriger', 'verifier', 'info'], sens: 'La structure d’une variable ou des axes de style s’écarte de la règle UCM.' },
  { code: 'C64', familles: ['typographie'], types: ['verifier', 'info'], sens: 'Le text style d’un layer diffère de celui des layers de même nom dans les autres variants.' },
  { code: 'C65', familles: ['typographie'], types: ['verifier'], sens: 'Un champ de typographie n’est pas lié à une variable de la collection typography, comme il l’est dans les autres variants.' },
  { code: 'C66', familles: ['typographie'], types: ['verifier'], sens: 'Une icône n’est pas une instance du composant Icon, ou sa taille ou sa couleur diffère de ce que le variant prévoit.' },
  { code: 'C67', familles: ['regles'], types: ['corriger', 'info'], sens: 'La propriété d’échange d’instance qui pilote l’icône manque, ou ses icônes permises ne sont pas lues.' },
  { code: 'C80', familles: ['liaisons', 'tailles'], types: ['corriger'], sens: 'Un layer lie une couleur ou une taille directement à une variable qui n’est pas un token du composant.' },
  { code: 'C81', familles: ['liaisons', 'tailles'], types: ['corriger'], sens: 'Un variant lie des layers que d’autres variants gardent en dur.' },
  { code: 'C82', familles: ['liaisons'], types: ['corriger', 'verifier', 'info'], sens: 'Le thème UCM, ou le lien de `brands` ou de `utility` vers `primitives`, s’écarte de sa définition : variable, cran, palette, couche, scope ou mode absent ou faux.' },
] as const satisfies readonly EntreeDuCatalogue[];

export type CodeDeConstat = (typeof CODES_DES_CONSTATS)[number]['code'];
