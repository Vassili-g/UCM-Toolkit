/**
 * L'application : l'état, les gestes du designer et le rendu des zones. Les
 * zones reçoivent l'application entière ; elles lisent l'état et appellent un
 * geste, sans modifier l'état elles-mêmes.
 */
import { copier as texteACopier, type FormatDeCopie } from '../copie';
import { cleDeGroupe, clesDesAncetres, segmentsDeGroupe } from '../groupes';
import { modesDeFamille } from '../indexation';
import type { Preferences } from '../preferences';
import { contexteDeColonne, type Resultat } from '../resolution';
import { memoriser, revenir, type Etat, type Filtres, type Onglet } from './etat';
import { versSandbox } from './pont';
import { copierTexte } from './pressePapiers';
import { TEXTES, titreDeConstat } from './textes';

/** Les zones de l'écran, rendues séparément. */
export type Zone = 'barre' | 'arbre' | 'table' | 'inspecteur' | 'vue' | 'pied';

export interface Composant {
  readonly element: HTMLElement;
  mettreAJour(): void;
}

export interface Application {
  readonly etat: Etat;
  /**
   * Les sections que les intégrations ajoutent à l'inspecteur. Une section
   * rend `null` quand son intégration est désactivée ou sans donnée.
   */
  readonly sectionsDeLInspecteur: Array<(variable: string) => HTMLElement | null>;
  /** Rend les zones demandées, toutes par défaut. */
  rendre(zones?: readonly Zone[]): void;
  /** Le résultat d'une variable dans le contexte actif, ou dans celui d'une colonne de mode. */
  resultat(variable: string, mode?: string | null): Resultat;
  /** Le résultat d'une variable dans le contexte B. */
  resultatB(variable: string): Resultat;
  nouvelleDemande(): number;
  inspecter(variable: string, options?: { memoriser?: boolean }): void;
  suivre(variable: string): void;
  ouvrirGroupe(collection: string, segments: readonly string[]): void;
  basculerRepli(cle: string): void;
  retour(): void;
  rechercher(texte: string): void;
  filtrer(filtres: Partial<Filtres>): void;
  changerContexte(famille: string, mode: string, cote: 'A' | 'B'): void;
  changerOnglet(onglet: Onglet): void;
  actualiser(): void;
  annulerLecture(): void;
  copier(variable: string, format: FormatDeCopie, reference?: string | null): Promise<void>;
  /** Annonce un texte à la zone `aria-live` ; `zoneDeSecours` montre un texte à copier à la main. */
  annoncer(texte: string, zoneDeSecours?: string): void;
  rangerPreferences(preferences: Preferences): void;
  /** Enregistre la position de défilement de la table, que Retour restaure. */
  lireDefilement: () => number;
  /** Fait défiler la table jusqu'à la variable. */
  montrerDansLaTable: (variable: string) => void;
}

export interface Branchements {
  readonly lireDefilement: () => number;
  readonly montrerDansLaTable: (variable: string) => void;
  readonly rendre: (zones: readonly Zone[]) => void;
  readonly annoncer: (texte: string, zoneDeSecours?: string) => void;
}

export function creerApplication(etat: Etat, branchements: () => Branchements): Application {
  let compteur = 0;
  const toutes: readonly Zone[] = ['barre', 'arbre', 'table', 'inspecteur', 'vue', 'pied'];

  const app: Application = {
    etat,
    sectionsDeLInspecteur: [],
    rendre(zones = toutes) {
      branchements().rendre(zones);
    },
    resultat(variable, mode = null) {
      const { resolveur, index, contexte } = etat;
      if (!resolveur || !index) throw new Error('aucun relevé');
      return resolveur.resoudre(variable, mode ? contexteDeColonne(index, contexte, mode) : contexte);
    },
    resultatB(variable) {
      if (!etat.resolveur) throw new Error('aucun relevé');
      return etat.resolveur.resoudre(variable, etat.contexteB);
    },
    nouvelleDemande: () => {
      compteur += 1;
      return compteur;
    },
    inspecter(variable, options = {}) {
      if (options.memoriser !== false && etat.position.inspectee !== variable) memoriserAvecDefilement();
      etat.position = { ...etat.position, inspectee: variable };
      app.rendre(['table', 'inspecteur', 'vue', 'barre']);
    },
    suivre(cible) {
      const variable = etat.index?.variables.get(cible);
      memoriserAvecDefilement();
      if (!variable) {
        etat.position = { ...etat.position, inspectee: cible };
        app.rendre();
        return;
      }
      for (const cle of clesDesAncetres(variable)) etat.replies.delete(cle);
      etat.position = { ...etat.position, collection: variable.collection, groupe: segmentsDeGroupe(variable.nom), recherche: '', inspectee: cible, defilement: 0 };
      etat.onglet = 'table';
      app.rendre();
      branchements().montrerDansLaTable(cible);
    },
    ouvrirGroupe(collection, segments) {
      memoriserAvecDefilement();
      etat.position = { ...etat.position, collection, groupe: [...segments], recherche: '', defilement: 0 };
      app.rendre(['barre', 'arbre', 'table', 'vue', 'pied']);
    },
    basculerRepli(cle) {
      if (etat.replies.has(cle)) etat.replies.delete(cle);
      else etat.replies.add(cle);
      app.rendre(['arbre']);
    },
    retour() {
      if (!revenir(etat)) return;
      const { collection, groupe } = etat.position;
      if (collection) for (let profondeur = 0; profondeur <= groupe.length; profondeur += 1) etat.replies.delete(cleDeGroupe(collection, groupe.slice(0, profondeur)));
      app.rendre();
    },
    rechercher(texte) {
      etat.position = { ...etat.position, recherche: texte, defilement: 0 };
      app.rendre(['arbre', 'table', 'vue', 'pied']);
    },
    filtrer(filtres) {
      etat.position = { ...etat.position, filtres: { ...etat.position.filtres, ...filtres }, defilement: 0 };
      app.rendre(['table', 'vue']);
    },
    changerContexte(famille, mode, cote) {
      if (!etat.index || !modesDeFamille(etat.index, famille).some((candidat) => candidat.mode.id === mode)) return;
      if (cote === 'A') etat.contexte = { ...etat.contexte, [famille]: mode };
      else etat.contexteB = { ...etat.contexteB, [famille]: mode };
      app.rendre(['barre', 'table', 'inspecteur', 'vue']);
    },
    changerOnglet(onglet) {
      etat.onglet = onglet;
      app.rendre(['vue', 'table']);
    },
    actualiser() {
      const demande = app.nouvelleDemande();
      etat.lecture = { statut: 'en-cours', demande, phase: 'collections', fait: 0, total: 1 };
      versSandbox({ type: 'lire-releve', demande });
      app.rendre(['barre', 'pied', 'table']);
    },
    annulerLecture() {
      if (etat.lecture.statut !== 'en-cours') return;
      versSandbox({ type: 'annuler', demande: etat.lecture.demande });
    },
    async copier(variable, format, reference = null) {
      if (!etat.index) return;
      const resultat = app.resultat(variable);
      const constat = resultat.statut === 'resolu' ? null : titreDeConstat(resultat.statut);
      const copie = texteACopier(etat.index, variable, resultat, format, { constat, reference });
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
    lireDefilement: () => branchements().lireDefilement(),
    montrerDansLaTable: (variable) => branchements().montrerDansLaTable(variable),
  };

  function memoriserAvecDefilement(): void {
    etat.position = { ...etat.position, defilement: branchements().lireDefilement() };
    memoriser(etat);
  }

  return app;
}
