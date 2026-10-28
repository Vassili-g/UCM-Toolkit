/**
 * Réunit les messages des domaines en `UiRequest` (interface vers sandbox) et
 * `PluginMessage` (sandbox vers interface). Ajouter un domaine ajoute une
 * ligne à chacune des deux tables ci-dessous, et une à la table de `code.ts`.
 *
 * `tests/galerie.test.ts` refuse un membre de `PluginMessage` sans état de
 * galerie où le regarder.
 */
import type { DemandeDAccessibilite, MessageDAccessibilite } from './accessibilite';
import type { DemandeDAnalyse, MessageDAnalyse } from './analyse';
import type { DemandeDArbre, MessageDArbre } from './arbre';
import type { DemandeDeBibliotheque, MessageDeBibliotheque } from './bibliotheque';
import type { DemandeDeCommun, MessageDeCommun } from './commun';
import type { DemandeDeComposant, MessageDeComposant } from './composant';
import type { DemandeDeConfiguration, MessageDeConfiguration } from './configuration';
import type { DemandeDeCorrections, MessageDeCorrections } from './corrections';
import type { DemandeDeFiche, MessageDeFiche } from './fiche';
import type { DemandeDIgnores, MessageDIgnores } from './ignores';
import type { DemandeDeNomenclature, MessageDeNomenclature } from './nomenclature';
import type { DemandeDePreparation, MessageDePreparation } from './preparation';
import type { DemandeDeQuestions, MessageDeQuestions } from './questions';
import type { DemandeDeRecherche, MessageDeRecherche } from './recherche';
import type { DemandeDeRapport, MessageDeRapport } from './rapport';
import type { DemandeDeRegles, MessageDeRegles } from './regles';
import type { DemandeDeStructure, MessageDeStructure } from './structure';

export type { IdentiteDAnalyse, SujetSelectionne } from './commun';

/** Les demandes de chaque domaine, par identifiant de domaine. */
export interface DemandesParDomaine {
  commun: DemandeDeCommun;
  arbre: DemandeDArbre;
  recherche: DemandeDeRecherche;
  fiche: DemandeDeFiche;
  bibliotheque: DemandeDeBibliotheque;
  nomenclature: DemandeDeNomenclature;
  structure: DemandeDeStructure;
  composant: DemandeDeComposant;
  analyse: DemandeDAnalyse;
  corrections: DemandeDeCorrections;
  questions: DemandeDeQuestions;
  ignores: DemandeDIgnores;
  accessibilite: DemandeDAccessibilite;
  regles: DemandeDeRegles;
  preparation: DemandeDePreparation;
  configuration: DemandeDeConfiguration;
  rapport: DemandeDeRapport;
}

/** Les messages de chaque domaine, par identifiant de domaine. */
export interface MessagesParDomaine {
  commun: MessageDeCommun;
  arbre: MessageDArbre;
  recherche: MessageDeRecherche;
  fiche: MessageDeFiche;
  bibliotheque: MessageDeBibliotheque;
  nomenclature: MessageDeNomenclature;
  structure: MessageDeStructure;
  composant: MessageDeComposant;
  analyse: MessageDAnalyse;
  corrections: MessageDeCorrections;
  questions: MessageDeQuestions;
  ignores: MessageDIgnores;
  accessibilite: MessageDAccessibilite;
  regles: MessageDeRegles;
  preparation: MessageDePreparation;
  configuration: MessageDeConfiguration;
  rapport: MessageDeRapport;
}

export type Domaine = keyof DemandesParDomaine;

/** Ce que l'interface demande au sandbox. */
export type UiRequest = DemandesParDomaine[Domaine];

/** Ce que le sandbox envoie à l'interface. */
export type PluginMessage = MessagesParDomaine[Domaine];
