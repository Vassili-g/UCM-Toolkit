/**
 * Mesure des opérateurs du stress test F3 et F4 : chaque cas des opérateurs du kit (`packages/kit/tests/stress/f3-composant/`) passe
 * dans les contrôles de la portée, est comparé à son oracle par `comparer`, et le tableau compte par opérateur les attendus, les
 * détectés, les manqués, les faux constats, les corrections inexactes, les exceptions, les cas `mesure` et la durée. Le module
 * réemploie les opérateurs et `comparer` sans recopier un contrôle. Il ne corrige rien : un écart du kit est un résultat, et une
 * exception levée par un contrôle ou par un générateur est comptée sans couper les autres cas.
 *
 * Les cas L, R et K comparent par `cleDeConstat`, tous les autres par `cleDeConstatEtendue`, comme les tests du kit. Un cas de
 * propagation (M2) ajoute les propositions de `proposerLaPropagation` aux constats des contrôles.
 */
import type { Constat } from '../../../../kit/src/controles/constat';
import { proposerLaPropagation } from '../../../../kit/src/controles/index';
import { comparer } from '../../../../kit/tests/stress/commun/comparer';
import type { CasDeStress, ResultatDuCas, SorteDEcart } from '../../../../kit/tests/stress/commun/types';
import { composantDuProfil, PROFIL_P0 } from '../../../../kit/tests/stress/f3-composant/profils';
import { constatsDeLaPortee, copierLeComposant, GRAINE_PAR_DEFAUT } from '../../../../kit/tests/stress/f3-composant/composantDeBase';
import { cleDeConstat, operateursAxes, type CasDeComposant } from '../../../../kit/tests/stress/f3-composant/operateursAxes';
import { operateursCibles } from '../../../../kit/tests/stress/f3-composant/operateursCibles';
import { operateursEntrees } from '../../../../kit/tests/stress/f3-composant/operateursEntrees';
import { cleDeConstatEtendue, modeleDuCas, operateursModele } from '../../../../kit/tests/stress/f3-composant/operateursModele';
import { operateursPeinture } from '../../../../kit/tests/stress/f3-composant/operateursPeinture';
import { operateursRoles } from '../../../../kit/tests/stress/f3-composant/operateursRoles';
import { operateursStructure } from '../../../../kit/tests/stress/f3-composant/operateursStructure';
import { operateursTailles } from '../../../../kit/tests/stress/f3-composant/operateursTailles';
import { operateursTheme } from '../../../../kit/tests/stress/f3-composant/operateursTheme';
import { fauxPositifsCibles, fauxPositifsDesProfils } from '../../../../kit/tests/stress/f3-composant/fauxPositifs';

/** Ce que la mesure sait d'un cas : l'identifiant, l'opérateur, le verdict, l'oracle, et la manière d'obtenir les constats du kit. */
export interface CasAMesurer {
  readonly cas: CasDeStress<unknown>;
  /** Les constats que les contrôles du kit émettent sur ce cas. */
  readonly emettre: () => readonly Constat[];
  readonly cleDe: (constat: Constat) => string;
}

export interface MesureDeCas {
  readonly cas: CasDeStress<unknown>;
  readonly resultat: ResultatDuCas;
  /** Le message d'une exception levée par un contrôle ; un cas qui lève n'a aucun constat émis. */
  readonly exception?: string;
  readonly millisecondes: number;
}

export interface LigneDOperateur {
  operateur: string;
  cas: number;
  attendus: number;
  detectes: number;
  manques: number;
  fauxConstats: number;
  correctionsInexactes: number;
  exceptions: number;
  casMesure: number;
  /** Les écarts des cas `mesure`, comptés à part des colonnes précédentes. */
  enAttente: number;
  millisecondes: number;
}

export const messageDe = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

const ligneVide = (operateur: string): LigneDOperateur => ({
  operateur, cas: 0, attendus: 0, detectes: 0, manques: 0, fauxConstats: 0, correctionsInexactes: 0, exceptions: 0, casMesure: 0, enAttente: 0, millisecondes: 0,
});

/** Passe un cas dans les contrôles et le compare à son oracle ; une exception devient un cas sans constat émis. */
export function mesurerLeCas(entree: CasAMesurer): MesureDeCas {
  const debut = performance.now();
  const { cas } = entree;
  try {
    const resultat = comparer(cas, entree.emettre(), entree.cleDe);
    return { cas, resultat, millisecondes: performance.now() - debut };
  } catch (erreur) {
    const vide: ResultatDuCas = { cas: cas.id, famille: cas.famille, operateur: cas.operateur, verdict: cas.verdict, attendus: cas.attendus.length, detectes: 0, ecarts: [] };
    return { cas, resultat: vide, exception: messageDe(erreur), millisecondes: performance.now() - debut };
  }
}

/**
 * Une ligne par opérateur, dans l'ordre d'apparition, puis le total. Les écarts d'un cas `mesure` vont dans `enAttente` seulement ;
 * un doublon compte comme un faux constat et une question inexacte comme une correction inexacte.
 */
export function agreger(mesures: readonly MesureDeCas[]): LigneDOperateur[] {
  const lignes = new Map<string, LigneDOperateur>();
  const total = ligneVide('Total');
  const compter = (ligne: LigneDOperateur, { resultat, exception, millisecondes }: MesureDeCas): void => {
    const nombre = (...sortes: SorteDEcart[]): number => resultat.ecarts.filter((ecart) => sortes.includes(ecart.sorte)).length;
    ligne.cas++;
    ligne.attendus += resultat.attendus;
    ligne.detectes += resultat.detectes;
    ligne.millisecondes += millisecondes;
    if (exception !== undefined) ligne.exceptions++;
    if (resultat.verdict === 'mesure') {
      ligne.casMesure++;
      ligne.enAttente += resultat.ecarts.length;
      return;
    }
    ligne.manques += nombre('manque');
    ligne.fauxConstats += nombre('faux-constat', 'doublon');
    ligne.correctionsInexactes += nombre('correction-inexacte', 'question-inexacte');
  };
  for (const mesure of mesures) {
    const ligne = lignes.get(mesure.cas.operateur) ?? ligneVide(mesure.cas.operateur);
    lignes.set(mesure.cas.operateur, ligne);
    compter(ligne, mesure);
    compter(total, mesure);
  }
  return [...lignes.values(), total];
}

const ENTETE = ['Opérateur', 'Cas', 'Attendus', 'Détectés', 'Manqués', 'Faux constats', 'Corrections inexactes', 'Exceptions', 'Cas mesure', 'En attente'];

/** Le tableau en Markdown. `avecDuree` ajoute la colonne des millisecondes, que le fichier écrit omet pour rester déterministe. */
export function tableau(lignes: readonly LigneDOperateur[], avecDuree: boolean): string {
  const entete = avecDuree ? [...ENTETE, 'Durée (ms)'] : ENTETE;
  const rangees = lignes.map((l) => {
    const colonnes = [l.operateur, l.cas, l.attendus, l.detectes, l.manques, l.fauxConstats, l.correctionsInexactes, l.exceptions, l.casMesure, l.enAttente];
    return (avecDuree ? [...colonnes, Math.round(l.millisecondes)] : colonnes).map(String);
  });
  return [entete, entete.map(() => '---'), ...rangees].map((rangee) => `| ${rangee.join(' | ')} |`).join('\n');
}

/** Les écarts nommés, un par ligne : cas | sorte | détail | question. Les cas `mesure` vont dans leur propre liste. */
export function detailTexte(mesures: readonly MesureDeCas[]): string {
  const ligne = ({ cas, resultat }: MesureDeCas): string[] =>
    resultat.ecarts.map((ecart) => `- ${cas.id} | ${ecart.sorte} | ${ecart.detail}${cas.question ? ` | ${cas.question}` : ''}`);
  const attendus = mesures.filter(({ cas }) => cas.verdict === 'attendu').flatMap(ligne);
  const exceptions = mesures.filter((mesure) => mesure.exception !== undefined).map(({ cas, exception }) => `- ${cas.id} | exception | ${exception}`);
  const enAttente = mesures.filter(({ cas }) => cas.verdict === 'mesure').flatMap(ligne);
  return [
    `Écarts (${attendus.length + exceptions.length}) : cas | sorte | détail`, ...attendus, ...exceptions, '',
    `En attente (${enAttente.length}) : cas | sorte | détail | question`, ...enAttente, '',
  ].join('\n');
}

export function rapportTexte(mesures: readonly MesureDeCas[], graine: number): string {
  return [`Opérateurs du stress test F3 et F4 (graine ${graine}, profil ${PROFIL_P0.id} ; A0 sur les 96 profils)`, '', tableau(agreger(mesures), false), '', detailTexte(mesures)].join('\n');
}

export function rapportJson(mesures: readonly MesureDeCas[], graine: number): unknown {
  return {
    graine, profil: PROFIL_P0.id, lignes: agreger(mesures).map(({ millisecondes: _ignoree, ...ligne }) => ligne),
    cas: mesures.map(({ cas, resultat, exception }) => ({
      id: cas.id, operateur: cas.operateur, verdict: cas.verdict, ...(cas.question ? { question: cas.question } : {}),
      attendus: resultat.attendus, detectes: resultat.detectes, ...(exception === undefined ? {} : { exception }),
      ecarts: resultat.ecarts.map((ecart) => ({ sorte: ecart.sorte, detail: ecart.detail })),
    })),
  };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Les opérateurs du kit

const OPERATEURS_A_CLE_SIMPLE: readonly string[] = ['L1', 'L2', 'L3', 'L4', 'L5', 'R1', 'R2', 'K1', 'K2', 'K3', 'K4'];

function casDuKit(cas: CasDeComposant): CasAMesurer {
  return {
    cas,
    cleDe: OPERATEURS_A_CLE_SIMPLE.includes(cas.operateur) ? cleDeConstat : cleDeConstatEtendue,
    emettre: () => {
      const copie = copierLeComposant(cas.entree.composant);
      const modele = modeleDuCas(cas);
      return [...constatsDeLaPortee(copie.releve, copie.catalogue), ...(modele === undefined ? [] : proposerLaPropagation(copie.releve, copie.catalogue, modele))];
    },
  };
}

/** Un groupe de cas : son nom, et le générateur que la mesure appelle une seule fois, pour attraper une exception du générateur. */
export interface GroupeDeCas {
  readonly nom: string;
  readonly generer: () => CasDeComposant[];
}

export function groupesDuKit(graine: number = GRAINE_PAR_DEFAUT): GroupeDeCas[] {
  const base = composantDuProfil(PROFIL_P0, graine);
  return [
    { nom: 'L', generer: () => operateursAxes(base, graine) },
    { nom: 'R', generer: () => operateursRoles(base, graine) },
    { nom: 'K', generer: () => operateursCibles(base, graine) },
    { nom: 'M', generer: () => operateursModele(base, graine) },
    { nom: 'U', generer: () => operateursPeinture(base, graine) },
    { nom: 'T', generer: () => operateursTheme(base, graine) },
    { nom: 'S', generer: () => operateursStructure(base, graine) },
    { nom: 'Z', generer: () => operateursTailles(base, graine) },
    { nom: 'X', generer: () => operateursEntrees(base, graine) },
    { nom: 'A0', generer: () => fauxPositifsDesProfils(undefined, graine) },
    { nom: 'A1-A9', generer: () => fauxPositifsCibles(base, graine) },
  ];
}

export interface Filtre {
  /** Un opérateur (`K4`) ou une lettre (`K`). */
  readonly operateur?: string;
  readonly cas?: string;
}

/**
 * Mesure les groupes un à un. Un générateur qui lève est compté comme une exception de son groupe (un cas sans identifiant, nommé
 * d'après le groupe), sans couper les autres.
 */
export function mesurerLesGroupes(groupes: readonly GroupeDeCas[], filtre: Filtre = {}): MesureDeCas[] {
  const mesures: MesureDeCas[] = [];
  for (const groupe of groupes) {
    let cas: CasDeComposant[];
    try {
      cas = groupe.generer();
    } catch (erreur) {
      const vide: CasDeStress<unknown> = { id: `${groupe.nom}-generateur`, famille: 'F3', operateur: groupe.nom, verdict: 'attendu', entree: null, attendus: [] };
      mesures.push({ cas: vide, resultat: { cas: vide.id, famille: 'F3', operateur: groupe.nom, verdict: 'attendu', attendus: 0, detectes: 0, ecarts: [] }, exception: messageDe(erreur), millisecondes: 0 });
      continue;
    }
    for (const entree of cas) {
      if (filtre.operateur !== undefined && entree.operateur !== filtre.operateur && !entree.operateur.startsWith(filtre.operateur)) continue;
      if (filtre.cas !== undefined && entree.id !== filtre.cas) continue;
      mesures.push(mesurerLeCas(casDuKit(entree)));
    }
  }
  return mesures;
}

export const mesurerLesOperateurs = (graine: number = GRAINE_PAR_DEFAUT, filtre: Filtre = {}): MesureDeCas[] => mesurerLesGroupes(groupesDuKit(graine), filtre);
export { GRAINE_PAR_DEFAUT };
