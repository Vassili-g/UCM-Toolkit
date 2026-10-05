/**
 * Les messages qui traversent la frontière sandbox et interface ([UI-07]).
 *
 * Le type contraint les deux sens : les envois du sandbox par `versUi` dans
 * `code.ts`, ceux de l'interface par `versSandbox` dans `ui/pont.ts`. Un
 * message du sandbox entre ici au lot qui le joue dans la galerie :
 * `tests/galerie.test.ts` refuse un membre de `PluginMessage` sans état.
 *
 * `demande` numérote chaque demande de l'interface, d'un seul compteur ; une
 * réponse porte le numéro de la demande qui l'a produite ([UI-08]).
 */
import type { Classement, Recette } from 'ucm-couleur';
import type { Langue } from './i18n/langues';
import type { DemandeDeTaille } from 'ucm-plugin-socle/src/ui/ResizeGrip';

import type { IssueDeLaPage, IssueDuRetrait, ResultatDuDessin } from './ecriture/planche';
import type { IssueDeLaCopie, IssueDeLaDestination, IssueDeLaReprise, IssueDuRetraitDesVariables, ResultatDeLEcriture } from './ecriture/variables';
import type { IssueDuRangement } from './ecriture/recette';
import type { EtatDeLaPlanche, ProfilDuDocument } from './lecture';
import type { VariablesDuFichier } from './lectureDesVariables';
import type { SectionsDeGestion } from './preferences';
import type { Destination } from './variables/destination';

/** Ce que l'interface demande au sandbox. */
export type UiRequest =
  | { type: 'lire-langue' }
  | { type: 'ranger-langue'; selection: number; langue: Langue }
  /** Les sections ouvertes de Gestion ([UI-36]) ; sans réponse : le choix vaut pour la session. */
  | { type: 'ranger-sections'; sections: SectionsDeGestion }
  /**
   * `recherche: 'fichier'` étend la recherche des cadres à toutes les pages,
   * au geste explicite du designer (V8.6) ; sinon, la seule page de la planche.
   */
  | { type: 'lire-etat'; demande: number; recherche?: 'fichier' }
  /**
   * Première écriture : la recette, sous la clé partagée, après validation et
   * contrôle de l'empreinte lue ([REC-10]).
   */
  | { type: 'ranger-recette'; demande: number; recette: Recette; empreinteLue: string | null }
  /**
   * Seconde écriture : les cadres des palettes nommées, calculés par le sandbox
   * depuis la recette rangée, jamais depuis des hexas de l'interface ([ARC-11]).
   */
  | { type: 'dessiner'; demande: number; palettes: string[]; empreinteLue: string | null; etrangersConfirmes: string[] }
  | { type: 'voir-sur-la-planche'; demande: number; page: string; cadres: string[] }
  /**
   * Troisième écriture : « Supprimer définitivement » le cadre d'une palette
   * supprimée, que le sandbox vérifie avant de le retirer ([PLA-27]).
   */
  | { type: 'retirer-cadre'; demande: number; palette: string; cadre: string }
  /**
   * Quatrième écriture : la page des planches, une page du fichier ou une page
   * à créer, vers laquelle le sandbox déplace les cadres possédés ([PLA-29]).
   */
  | { type: 'choisir-page'; demande: number; page: { id: string } | { nom: string } }
  /**
   * Cinquième écriture : les variables des palettes nommées, depuis la
   * recette rangée. `remettre` nomme les palettes dont le designer remet les
   * couleurs que Figma a changées ([VAR-06], [VAR-07]).
   */
  | { type: 'ecrire-variables'; demande: number; palettes: string[]; empreinteLue: string | null; remettre: string[] }
  /** Sixième écriture : la destination des tokens, rangée dans le suivi et confirmée ([VAR-16]). */
  | { type: 'ranger-destination'; demande: number; destination: Destination }
  /** Septième écriture : le retrait des variables d'une palette supprimée ([VAR-11]). */
  | { type: 'retirer-variables'; demande: number; palette: string }
  /**
   * Huitième écriture : « Modifier dans le plugin ». La recette porte la
   * palette reprise ; `source` désigne la palette du fichier, que le sandbox
   * retrouve lui-même avant de ranger la recette et la liaison ensemble
   * ([VAR-13]).
   */
  | { type: 'reprendre-palette'; demande: number; recette: Recette; empreinteLue: string | null; palette: string; source: { collection: string; chemin: string } }
  /**
   * Neuvième écriture : « Copier dans le plugin ». `palette` est
   * l'identifiant de la palette à créer ; `source` désigne la palette de
   * bibliothèque par la clé de sa collection et son chemin. Le sandbox
   * importe ses variables, lit leurs couleurs et range la recette
   * ([VAR-14]).
   */
  | { type: 'copier-palette'; demande: number; empreinteLue: string | null; palette: string; source: { collection: string; chemin: string } }
  | DemandeDeTaille;

export type { IssueDeLaCopie, IssueDeLaDestination, IssueDeLaPage, IssueDeLaReprise, IssueDuRetrait, IssueDuRetraitDesVariables, ResultatDeLEcriture, ResultatDuDessin };

/** Ce que le sandbox envoie à l'interface. */
export type PluginMessage =
  | { type: 'etat-refuse'; demande: number; message: string }
  /** Les préférences, lues avant le premier rendu : la langue et les sections ouvertes de Gestion. */
  | { type: 'langue'; langue: Langue; sections: SectionsDeGestion }
  | { type: 'langue-rangee'; selection: number; reussie: boolean }
  /**
   * L'état du fichier, en réponse à `lire-etat` : la recette classée
   * ([REC-03]), l'empreinte du texte rangé, `null` sans recette, le profil
   * de couleur du document, les cadres de la planche, et les variables du
   * fichier : collections locales, variables de couleur et suivi ([VAR-04]).
   */
  | { type: 'etat'; demande: number; classement: Classement; texte: string; empreinte: string | null; profil: ProfilDuDocument; planche: EtatDeLaPlanche; variables: VariablesDuFichier }
  /** L'issue d'un rangement : la nouvelle empreinte, ou le refus ([REC-10]). */
  | { type: 'rangement'; demande: number; issue: IssueDuRangement }
  /** Le cadre en cours de dessin ([PLA-24]). */
  | { type: 'progression'; demande: number; fait: number; total: number; nom: string }
  | { type: 'dessin'; demande: number; resultat: ResultatDuDessin }
  /** L'issue de « Supprimer définitivement », en réponse à `retirer-cadre`. */
  | { type: 'retrait'; demande: number; issue: IssueDuRetrait }
  /** L'issue de « Enregistrer » dans la carte « Page des planches », en réponse à `choisir-page`. */
  | { type: 'page-choisie'; demande: number; issue: IssueDeLaPage }
  /** Ce que l'écriture a fait de chaque palette, en réponse à `ecrire-variables`. */
  | { type: 'variables-ecrites'; demande: number; resultat: ResultatDeLEcriture }
  /** L'issue de « Enregistrer » dans la carte « Destination des tokens », en réponse à `ranger-destination`. */
  | { type: 'destination-rangee'; demande: number; issue: IssueDeLaDestination }
  /** L'issue de « Supprimer les variables… », en réponse à `retirer-variables`. */
  | { type: 'variables-retirees'; demande: number; issue: IssueDuRetraitDesVariables }
  /** L'issue de « Modifier dans le plugin », en réponse à `reprendre-palette`. */
  | { type: 'reprise'; demande: number; issue: IssueDeLaReprise }
  /** L'issue de « Copier dans le plugin », en réponse à `copier-palette`. */
  | { type: 'copie'; demande: number; issue: IssueDeLaCopie };
