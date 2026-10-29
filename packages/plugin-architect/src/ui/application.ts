/**
 * L'application : l'état, les gestes du designer et le rendu des zones. Les
 * zones reçoivent l'application entière ; elles lisent l'état et appellent un
 * geste, sans modifier l'état elles-mêmes.
 */
import { clesDesAncetres, segmentsDeGroupe, type NoeudDeGroupe } from '../groupes';
import { TAILLE_COMPOSANT_PANNEAU_OUVERT, TAILLE_ETROITE, type Disposition } from '../fenetre';
import type { Preferences } from '../preferences';
import { contexteDeColonne, type Resultat } from '../resolution';
import type { IntentionDAnalyse } from '../messages/analyse';
import type { Constat } from '../messages/commun';
import type { MessageDeRapport } from '../messages/rapport';
import { analyseApplicable, calculEnCours, noterLEnvoi, noterLaDemandeDAnalyse, demandeDAnalyseEnCours } from './composant/analyse';
import type { Etat, Filtres } from './etat';
import { PREFIXE_TERME, retenirLesFormes } from './recherche/requete';
import { versSandbox } from './pont';

/** Les zones de l'écran, rendues séparément. */
export type Zone = 'barre' | 'arbre' | 'table' | 'fiche' | 'vue' | 'pied';

export interface Composant {
  readonly element: HTMLElement;
  mettreAJour(): void;
}

/** Ce que la table sait d'un renommage coché : le nom entier après l'application, et la carte de Corrections qui propose chaque segment changé. */
export interface RenommageAffiche {
  readonly nouveau: string;
  /** Le rang d'un segment changé vers la clé de la carte qui le propose. */
  readonly cartes: ReadonlyMap<number, string>;
}

/** Les renommages cochés dans Corrections, que la table montre dans le nom de chaque variable. */
export interface RenommagesCoches {
  de(variable: string): RenommageAffiche | undefined;
  /** Le segment dont la carte vient d'être ouverte, `null` quand aucune carte n'est ciblée. */
  cible(): { readonly variable: string; readonly rang: number } | null;
  /** Ouvre la carte de Corrections qui propose ce segment. */
  ouvrir(variable: string, rang: number): void;
}

export interface Application {
  readonly etat: Etat;
  /** Branché par l'entrée une fois Nomenclature montée ; vide avant. */
  renommages: RenommagesCoches;
  /** Vrai quand le texte du champ de recherche vient d'un lien de l'écran et non de la frappe du designer : le champ prend alors la bordure bleue. */
  rechercheParLien: boolean;
  /** Rend les zones demandées, toutes par défaut. */
  rendre(zones?: readonly Zone[]): void;
  /** Le résultat d'une variable dans le contexte actif, ou dans celui d'une colonne de mode. */
  resultat(variable: string, mode?: string | null): Resultat;
  /** Le résultat d'une variable dans le contexte B. */
  nouvelleDemande(): number;
  /** Ouvre la fiche de la variable. */
  inspecter(variable: string): void;
  /** Ferme la fiche ; la ligne choisie du tableau perd son fond. */
  fermerLaFiche(): void;
  suivre(variable: string): void;
  ouvrirGroupe(collection: string, segments: readonly string[]): void;
  basculerRepli(cle: string): void;
  /** Replie toutes les sections de l'arbre, sauf celle qui est choisie et ses parents. */
  replierLesAutres(): void;
  /** Choisit le mode que la table lit pour une famille de collections. */
  choisirMode(famille: string, mode: string): void;
  /** Retire le filtre que la collection choisie pose sur la barre latérale. */
  enleverLeFiltre(): void;
  /** Ouvre la Configuration, ou la ferme quand elle est ouverte ; le mode et la fenêtre ne changent pas. */
  ouvrirLaConfiguration(): void;
  /** Vrai tant que la Configuration est ouverte. */
  configurationOuverte(): boolean;
  /** Pose la recherche que le designer tape dans le champ de l'arbre. */
  rechercher(texte: string): void;
  /** Écrit une recherche dans le champ de l'arbre, comme si le designer l'avait tapée, et ferme la fiche. */
  rechercherParLien(texte: string): void;
  /** Filtre le tableau sur un terme et sur les formes que sa fiche énumère. */
  rechercherLeTerme(mot: string, formes: readonly string[]): void;
  filtrer(filtres: Partial<Filtres>): void;
  /** Passe de l'explorateur de tokens à la vue composant, ou l'inverse. Le sandbox donne à la fenêtre la taille de la disposition. */
  changerDisposition(disposition: Disposition): void;
  actualiser(): void;
  /** Lance l'analyse du composant sélectionné ; `actualiser` dit au sandbox de ne reprendre aucun résultat précédent. */
  analyser(intention?: IntentionDAnalyse): void;
  annulerAnalyse(): void;
  /** Écrit dans Figma les corrections cochées ; `liaisons` compte celles qui lient un layer, pour la ligne d'écriture en cours. Sans effet pendant une écriture ou sur une analyse périmée. */
  appliquer(ids: readonly string[], liaisons: number): void;
  /** Sélectionne ces layers dans Figma : seul geste du plugin qui change la sélection. */
  selectionner(layers: readonly string[]): void;
  /** Range le choix de ne plus proposer la correction de ces constats : les constats restent, sans leur correction. */
  ignorerLaProposition(constats: readonly Constat[]): void;
  /** Répond à une question du moteur : `reponse` est la clé du candidat choisi, sinon son nom. Sans effet sur une analyse périmée. */
  repondre(question: string, reponse: string): void;
  /** Retire la réponse à une question : la correction qu'elle avait tirée quitte Corrections. */
  annulerLaReponse(question: string): void;
  /** Ce variant (son identifiant, celui des faits d'un constat C81) sert de modèle : le sandbox propose ses liaisons aux autres variants. Sans effet sur une analyse périmée. */
  servirDeModele(variant: string): void;
  /** Écarte ce constat de À faire dans Figma. Sans effet sur une analyse périmée ou sur une limite de lecture. */
  ignorer(constat: Constat): void;
  /** Rend ce constat à À faire dans Figma. */
  nePlusIgnorer(constat: Constat): void;
  /** Demande la description du composant analysé ; `auRetour` reçoit sa capture en JSON, ou `null` quand le sandbox n'a pu la lire. Une demande plus récente remplace celle-ci, dont la réponse est ignorée. */
  preparerLeRapport(sujet: string, auRetour: (capture: string | null) => void): void;
  /** La réponse du sandbox à `preparerLeRapport`. */
  recevoirLeRapport(message: MessageDeRapport): void;
  /** Ouvre ou ferme le panneau des constats ; la fenêtre prend la taille du mode sans le ranger. */
  basculerLePanneau(): void;
  /** Donne sa largeur à la vue Composant quand la frontière se tire ; la fenêtre ne change pas. */
  poserLaLargeurDeLaVue(largeur: number): void;
  annulerLecture(): void;
  /** Annonce un texte à la zone `aria-live` ; `zoneDeSecours` montre un texte à copier à la main. */
  annoncer(texte: string, zoneDeSecours?: string): void;
  rangerPreferences(preferences: Preferences): void;
  /** Fait défiler la table jusqu'à la variable. */
  montrerDansLaTable: (variable: string) => void;
}

export interface Branchements {
  readonly ouvrirLaConfiguration: () => void;
  /** Absents, la Configuration ne se ferme pas par le bouton de la barre et se lit fermée. */
  readonly fermerLaConfiguration?: () => void;
  readonly configurationOuverte?: () => boolean;
  readonly montrerDansLaTable: (variable: string) => void;
  readonly rendre: (zones: readonly Zone[]) => void;
  readonly annoncer: (texte: string, zoneDeSecours?: string) => void;
  readonly disposer: (disposition: Disposition) => void;
}

export function creerApplication(etat: Etat, branchements: () => Branchements): Application {
  let compteur = 0;
  let rapportAttendu: { readonly demande: number; readonly auRetour: (capture: string | null) => void } | null = null;
  const toutes: readonly Zone[] = ['barre', 'arbre', 'table', 'fiche', 'vue', 'pied'];

  const app: Application = {
    etat,
    renommages: { de: () => undefined, cible: () => null, ouvrir: () => {} },
    rechercheParLien: false,
    rendre(zones = toutes) {
      branchements().rendre(zones);
    },
    resultat(variable, mode = null) {
      const { resolveur, index, contexte } = etat;
      if (!resolveur || !index) throw new Error('aucun relevé');
      return resolveur.resoudre(variable, mode ? contexteDeColonne(index, contexte, mode) : contexte);
    },
    nouvelleDemande: () => {
      compteur += 1;
      return compteur;
    },
    inspecter(variable) {
      etat.position = { ...etat.position, inspectee: variable };
      app.rendre(['table', 'fiche', 'vue', 'barre']);
    },
    fermerLaFiche() {
      if (etat.position.inspectee === null) return;
      etat.position = { ...etat.position, inspectee: null };
      app.rendre(['table', 'fiche', 'vue', 'barre']);
    },
    suivre(cible) {
      const variable = etat.index?.variables.get(cible);
      if (!variable) {
        etat.position = { ...etat.position, inspectee: cible };
        app.rendre();
        return;
      }
      for (const cle of clesDesAncetres(variable)) etat.replies.delete(cle);
      etat.position = { ...etat.position, collection: variable.collection, groupe: segmentsDeGroupe(variable.nom), recherche: '', inspectee: cible };
      app.rendre();
      branchements().montrerDansLaTable(cible);
    },
    ouvrirGroupe(collection, segments) {
      etat.position = { ...etat.position, collection, groupe: [...segments], recherche: '' };
      etat.filtreDeLaBarre = true;
      app.rendre(['barre', 'arbre', 'table', 'vue', 'pied']);
    },
    replierLesAutres() {
      const { collection, groupe } = etat.position;
      const garde = (noeud: NoeudDeGroupe): boolean => noeud.collection === collection && noeud.segments.every((segment, rang) => segment === groupe[rang]);
      const replier = (noeud: NoeudDeGroupe): void => {
        if (noeud.enfants.length > 0 && !garde(noeud)) etat.replies.add(noeud.cle);
        for (const enfant of noeud.enfants) replier(enfant);
      };
      for (const arbre of etat.arbres) replier(arbre);
      app.rendre(['arbre']);
    },
    choisirMode(famille, mode) {
      etat.contexte = { ...etat.contexte, [famille]: mode };
      app.rendre(['table', 'fiche', 'vue']);
    },
    enleverLeFiltre() {
      etat.filtreDeLaBarre = false;
      app.rendre(['barre']);
    },
    ouvrirLaConfiguration() {
      const branchement = branchements();
      if (branchement.configurationOuverte?.()) branchement.fermerLaConfiguration?.();
      else branchement.ouvrirLaConfiguration();
    },
    configurationOuverte() {
      return branchements().configurationOuverte?.() ?? false;
    },
    basculerRepli(cle) {
      if (etat.replies.has(cle)) etat.replies.delete(cle);
      else etat.replies.add(cle);
      app.rendre(['arbre']);
    },
    rechercher(texte) {
      app.rechercheParLien = false;
      etat.position = { ...etat.position, recherche: texte };
      app.rendre(['arbre', 'table', 'vue', 'pied']);
    },
    rechercherParLien(texte) {
      app.rechercheParLien = true;
      etat.position = { ...etat.position, recherche: texte, inspectee: null };
      app.rendre();
    },
    rechercherLeTerme(mot, formes) {
      retenirLesFormes(mot, formes);
      app.rechercherParLien(`${PREFIXE_TERME}${mot}`);
    },
    filtrer(filtres) {
      etat.position = { ...etat.position, filtres: { ...etat.position.filtres, ...filtres } };
      app.rendre(['table', 'vue']);
    },
    changerDisposition(disposition) {
      if (etat.disposition === disposition) return;
      versSandbox({ type: 'changer-disposition', disposition });
      branchements().disposer(disposition);
    },
    actualiser() {
      const demande = app.nouvelleDemande();
      etat.lecture = { statut: 'en-cours', demande, phase: 'collections', fait: 0, total: 1 };
      versSandbox({ type: 'lire-releve', demande });
      app.rendre(['barre', 'pied', 'table']);
    },
    analyser(intention = 'analyser') {
      if (demandeDAnalyseEnCours(etat) !== null) return;
      const demande = app.nouvelleDemande();
      const mesurer = (globalThis as typeof globalThis & { UCM_ARCHITECT_MESURER?: boolean }).UCM_ARCHITECT_MESURER === true;
      noterLaDemandeDAnalyse(etat, demande, mesurer);
      const capturer = (globalThis as typeof globalThis & { UCM_ARCHITECT_CAPTURER?: boolean }).UCM_ARCHITECT_CAPTURER === true;
      versSandbox({ type: 'analyser', demande, intention, ...(mesurer ? { mesurer: true } : {}), ...(capturer ? { capturer: true } : {}) });
      app.rendre(['vue', 'barre']);
    },
    annulerAnalyse() {
      const demande = demandeDAnalyseEnCours(etat);
      if (demande !== null) versSandbox({ type: 'annuler-analyse', demande });
      else if (etat.analyse && calculEnCours(etat.analyse)) versSandbox({ type: 'annuler-analyse', analyse: etat.analyse.identite });
    },
    appliquer(ids, liaisons) {
      const { analyse } = etat;
      if (!analyse || !analyseApplicable(analyse) || analyse.ecriture !== null || ids.length === 0) return;
      noterLEnvoi(etat, ids, liaisons);
      versSandbox({ type: 'appliquer-corrections', analyse: analyse.identite, ids });
      app.rendre(['barre', 'vue']);
    },
    selectionner(layers) {
      const { analyse } = etat;
      if (analyse && !analyse.perimee && layers.length > 0) versSandbox({ type: 'selectionner', analyse: analyse.identite, layers });
    },
    ignorerLaProposition(constats) {
      const { analyse } = etat;
      if (!analyse || !analyseApplicable(analyse)) return;
      for (const constat of constats) versSandbox({ type: 'ignorer', analyse: analyse.identite, constat: constat.id, portee: 'proposition' });
    },
    repondre(question, reponse) {
      const { analyse } = etat;
      if (analyse && analyseApplicable(analyse)) versSandbox({ type: 'repondre', analyse: analyse.identite, question, reponse });
    },
    annulerLaReponse(question) {
      const { analyse } = etat;
      if (analyse && analyseApplicable(analyse)) versSandbox({ type: 'annuler-reponse', analyse: analyse.identite, question });
    },
    servirDeModele(variant) {
      const { analyse } = etat;
      if (analyse && analyseApplicable(analyse)) versSandbox({ type: 'servir-de-modele', analyse: analyse.identite, variant });
    },
    ignorer(constat) {
      const { analyse } = etat;
      if (analyse && analyseApplicable(analyse) && constat.limite !== true) versSandbox({ type: 'ignorer', analyse: analyse.identite, constat: constat.id, portee: 'constat' });
    },
    nePlusIgnorer(constat) {
      const { analyse } = etat;
      if (analyse && analyseApplicable(analyse)) versSandbox({ type: 'ne-plus-ignorer', analyse: analyse.identite, constat: constat.id });
    },
    preparerLeRapport(sujet, auRetour) {
      const demande = app.nouvelleDemande();
      rapportAttendu = { demande, auRetour };
      versSandbox({ type: 'preparer-le-rapport', demande, sujet });
    },
    recevoirLeRapport(message) {
      if (rapportAttendu === null || rapportAttendu.demande !== message.demande) return;
      const { auRetour } = rapportAttendu;
      rapportAttendu = null;
      auRetour(message.type === 'rapport-pret' ? message.capture : null);
    },
    basculerLePanneau() {
      etat.panneau = { ...etat.panneau, ouvert: !etat.panneau.ouvert };
      // La library choisie dit si l'analyse peut partir : le panneau la demande à son ouverture.
      if (etat.panneau.ouvert) versSandbox({ type: 'lire-configuration' });
      const taille = etat.panneau.ouvert ? TAILLE_COMPOSANT_PANNEAU_OUVERT : TAILLE_ETROITE;
      versSandbox({ type: 'resize', largeur: taille.largeur, hauteur: taille.hauteur, fin: false });
      app.rendre(['barre', 'vue']);
    },
    poserLaLargeurDeLaVue(largeur) {
      etat.panneau = { ...etat.panneau, largeurDeLaVue: largeur };
      app.rendre(['vue']);
    },
    annulerLecture() {
      if (etat.lecture.statut !== 'en-cours') return;
      versSandbox({ type: 'annuler', demande: etat.lecture.demande });
    },
    annoncer(texte, zoneDeSecours) {
      branchements().annoncer(texte, zoneDeSecours);
    },
    rangerPreferences(preferences) {
      etat.preferences = preferences;
      versSandbox({ type: 'ranger-preferences', preferences });
    },
    montrerDansLaTable: (variable) => branchements().montrerDansLaTable(variable),
  };

  return app;
}
