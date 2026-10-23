/**
 * L'application : l'état, les gestes du designer et le rendu des zones. Les
 * zones reçoivent l'application entière ; elles lisent l'état et appellent un
 * geste, sans modifier l'état elles-mêmes.
 */
import { copier as texteACopier, type FormatDeCopie } from '../copie';
import { versSrgb } from '../espace';
import { clesDesAncetres, segmentsDeGroupe, type NoeudDeGroupe } from '../groupes';
import { espaceDuReleve } from '../modele';
import { TAILLE_COMPOSANT_PANNEAU_OUVERT, TAILLE_ETROITE, type Disposition } from '../fenetre';
import type { Preferences } from '../preferences';
import { contexteDeColonne, type Resultat } from '../resolution';
import type { Constat } from '../messages/commun';
import { noterLEnvoi } from './composant/analyse';
import type { Etat, Filtres } from './etat';
import { PREFIXE_TERME, retenirLesFormes } from './recherche/requete';
import { versSandbox } from './pont';
import { copierTexte } from './pressePapiers';
import { TEXTES, titreDeConstat } from './textes';

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
  /** Ouvre la fenêtre de configuration de Nomenclature. */
  ouvrirLaConfiguration(): void;
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
  /** Lance l'analyse du composant sélectionné. */
  analyser(): void;
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
  /** Le variant affiché (son identifiant) sert de modèle : le sandbox propose ses liaisons aux autres variants. Sans effet sur une analyse périmée. */
  servirDeModele(variant: string): void;
  /** Écarte ce constat de À faire dans Figma. Sans effet sur une analyse périmée ou sur une limite de lecture. */
  ignorer(constat: Constat): void;
  /** Rend ce constat à À faire dans Figma. */
  nePlusIgnorer(constat: Constat): void;
  /** Ouvre ou ferme le panneau des constats ; la fenêtre prend la taille du mode sans le ranger. */
  basculerLePanneau(): void;
  /** Donne sa largeur à la vue Composant quand la frontière se tire ; la fenêtre ne change pas. */
  poserLaLargeurDeLaVue(largeur: number): void;
  annulerLecture(): void;
  copier(variable: string, format: FormatDeCopie, reference?: string | null): Promise<void>;
  /** Annonce un texte à la zone `aria-live` ; `zoneDeSecours` montre un texte à copier à la main. */
  annoncer(texte: string, zoneDeSecours?: string): void;
  rangerPreferences(preferences: Preferences): void;
  /** Fait défiler la table jusqu'à la variable. */
  montrerDansLaTable: (variable: string) => void;
}

export interface Branchements {
  readonly ouvrirLaConfiguration: () => void;
  readonly montrerDansLaTable: (variable: string) => void;
  readonly rendre: (zones: readonly Zone[]) => void;
  readonly annoncer: (texte: string, zoneDeSecours?: string) => void;
  readonly disposer: (disposition: Disposition) => void;
}

export function creerApplication(etat: Etat, branchements: () => Branchements): Application {
  let compteur = 0;
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
      // La Configuration vit dans la barre latérale du mode Tokens : le mode Composant n'en a pas.
      if (etat.disposition === 'etroite') app.changerDisposition('large');
      branchements().ouvrirLaConfiguration();
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
    analyser() {
      versSandbox({ type: 'analyser' });
    },
    appliquer(ids, liaisons) {
      const { analyse } = etat;
      if (!analyse || analyse.perimee || analyse.ecriture !== null || ids.length === 0) return;
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
      if (!analyse || analyse.perimee) return;
      for (const constat of constats) versSandbox({ type: 'ignorer', analyse: analyse.identite, constat: constat.id, portee: 'proposition' });
    },
    repondre(question, reponse) {
      const { analyse } = etat;
      if (analyse && !analyse.perimee) versSandbox({ type: 'repondre', analyse: analyse.identite, question, reponse });
    },
    annulerLaReponse(question) {
      const { analyse } = etat;
      if (analyse && !analyse.perimee) versSandbox({ type: 'annuler-reponse', analyse: analyse.identite, question });
    },
    servirDeModele(variant) {
      const { analyse } = etat;
      if (analyse && !analyse.perimee) versSandbox({ type: 'servir-de-modele', analyse: analyse.identite, variant });
    },
    ignorer(constat) {
      const { analyse } = etat;
      if (analyse && !analyse.perimee && constat.limite !== true) versSandbox({ type: 'ignorer', analyse: analyse.identite, constat: constat.id, portee: 'constat' });
    },
    nePlusIgnorer(constat) {
      const { analyse } = etat;
      if (analyse && !analyse.perimee) versSandbox({ type: 'ne-plus-ignorer', analyse: analyse.identite, constat: constat.id });
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
    async copier(variable, format, reference = null) {
      if (!etat.index) return;
      const resultat = app.resultat(variable);
      const constat = resultat.statut === 'resolu' ? null : titreDeConstat(resultat.statut);
      const espace = espaceDuReleve(etat.index.releve);
      const copie = texteACopier(etat.index, variable, resultat, format, { constat, reference, versSrgb: (couleur) => versSrgb(couleur, espace) });
      if (copie.texte === null) {
        app.annoncer(TEXTES.copieImpossible[copie.raison ?? 'non-resolu']);
        return;
      }
      const issue = await copierTexte(copie.texte);
      if (issue === 'refusee') {
        app.annoncer(TEXTES.copieRefusee, copie.texte);
        return;
      }
      app.annoncer(copie.arrondi ? TEXTES.copieArrondie(copie.texte) : TEXTES.copieReussie(format === 'chaine' ? TEXTES.copies.chaine : copie.texte === '' ? TEXTES.chaineVide : copie.texte));
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
