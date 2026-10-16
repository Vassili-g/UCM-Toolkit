/** Ce que l'écran montre d'une analyse, calculé sans DOM pour se tester seul. */
import {
  CATEGORIES_DE_NOM, CATEGORIES_DE_SEGMENT, CONVENTIONS, REGISTRE_CASSES, REGISTRE_SEPARATEURS,
  type CategorieDeNom, type Convention, type RaisonDeNormalisation,
} from '@ucm-kit/core/referentiel';
import type { Analyse } from '../analyse';
import type { ResultatApplication } from '../ecriture';
import { TEXTES, type RaisonAffichee } from './textes';

export interface OptionDEcriture { readonly valeur: string; readonly libelle: string }
export interface LigneDEcriture {
  readonly categorie: CategorieDeNom;
  readonly nom: string;
  readonly detectee: string;
  readonly compte: string;
  readonly choisie: string;
  readonly options: readonly OptionDEcriture[];
}
export interface LigneDeRenommage {
  readonly id: string;
  readonly categorie: string;
  readonly contexte: string;
  readonly ancien: string;
  readonly nouveau: string;
}
export interface GroupeDeRenommages { readonly raison: RaisonAffichee; readonly libelle: string; readonly lignes: readonly LigneDeRenommage[] }
export interface NomBloque { readonly categorie: CategorieDeNom; readonly ancien: string; readonly nouveau: string }
/** Les noms d'une même collision de noms : le designer les lit ensemble. */
export type Doublon = readonly NomBloque[];

/** Une écriture se transmet dans la valeur d'une liste sous la forme `casse|séparateur`. */
export function valeurDEcriture(convention: Convention): string {
  return `${convention.casse}|${convention.separateur}`;
}

export function ecritureDeValeur(valeur: string): Convention {
  const [casse, separateur] = valeur.split('|');
  return { casse, separateur } as Convention;
}

/** Le libellé du registre des conventions ; une combinaison hors registre se compose de ses deux termes. */
export function libelleDEcriture(convention: Convention): string {
  const connue = CONVENTIONS.find((item) => item.convention.casse === convention.casse && item.convention.separateur === convention.separateur);
  if (connue) return connue.libelle.fr;
  const terme = (registre: typeof REGISTRE_CASSES, id: string): string => registre.termes.find((item) => item.id === id)?.libelle.fr ?? id;
  return `${terme(REGISTRE_CASSES, convention.casse)} · ${terme(REGISTRE_SEPARATEURS, convention.separateur)}`;
}

/** Les écritures du registre, puis celles que l'analyse emploie et que le registre ne connaît pas, pour que rien ne disparaisse de la liste. */
function optionsDEcriture(...emplois: readonly (Convention | null)[]): OptionDEcriture[] {
  const options = CONVENTIONS.map((item) => ({ valeur: valeurDEcriture(item.convention), libelle: item.libelle.fr }));
  for (const emploi of emplois) {
    if (emploi && !options.some((option) => option.valeur === valeurDEcriture(emploi))) {
      options.push({ valeur: valeurDEcriture(emploi), libelle: libelleDEcriture(emploi) });
    }
  }
  return options;
}

/** Une ligne par catégorie : l'écriture détectée avec ses comptes, et l'écriture que l'analyse applique. Les noms de palettes et de composants n'ont de ligne que si le fichier en contient. */
export function lignesDEcriture(analyse: Analyse): LigneDEcriture[] {
  return CATEGORIES_DE_NOM.filter((categorie) => !(CATEGORIES_DE_SEGMENT as readonly CategorieDeNom[]).includes(categorie) || analyse.detection[categorie].total > 0).map((categorie) => {
    const detection = analyse.detection[categorie];
    const dominante = detection.dominante;
    const conformes = dominante ? Math.min(detection.comptes.casse[dominante.casse], detection.comptes.separateur[dominante.separateur]) : 0;
    const compte = detection.total === 0 ? TEXTES.ecriture.aucunNom
      : dominante ? TEXTES.ecriture.comptes(conformes, detection.total) : TEXTES.ecriture.nombreDeNoms(detection.total);
    return {
      categorie,
      nom: TEXTES.ecriture.categories[categorie],
      detectee: dominante ? libelleDEcriture(dominante) : TEXTES.ecriture.aucuneDominante,
      compte,
      choisie: valeurDEcriture(analyse.conventions[categorie]!),
      options: optionsDEcriture(dominante, analyse.conventions[categorie]!),
    };
  });
}

function raisonAffichee(raisons: readonly RaisonDeNormalisation[]): RaisonAffichee {
  if (raisons.includes('terme-tolere')) return 'terme';
  const casse = raisons.includes('casse');
  const separateur = raisons.includes('separateur');
  return casse && separateur ? 'casse-separateur' : separateur ? 'separateur' : 'casse';
}

const ORDRE_DES_GROUPES: readonly RaisonAffichee[] = ['casse-separateur', 'casse', 'separateur', 'terme'];

/** Les propositions rangées par raison, dans l'ordre de l'inventaire ; un groupe vide n'existe pas. */
export function grouperLesRenommages(analyse: Analyse): GroupeDeRenommages[] {
  const entrees = new Map(analyse.inventaire.entrees.map((entree) => [entree.nom.id, entree]));
  const lignes = analyse.normalisation.propositions.map((proposition) => {
    const contexte = entrees.get(proposition.id)?.contexte;
    return {
      raison: raisonAffichee(proposition.raisons),
      ligne: {
        id: proposition.id,
        categorie: TEXTES.ecriture.categories[proposition.categorie],
        contexte: [contexte?.collection, contexte?.composant, contexte?.axe].filter(Boolean).join(' · '),
        ancien: proposition.ancienNom,
        nouveau: proposition.nouveauNom,
      },
    };
  });
  return ORDRE_DES_GROUPES
    .map((raison) => ({ raison, libelle: TEXTES.liste.groupes[raison], lignes: lignes.filter((item) => item.raison === raison).map((item) => item.ligne) }))
    .filter((groupe) => groupe.lignes.length > 0);
}

/** Dans chaque collision, les noms qui voulaient changer ; l'occupant de la destination reste en place. */
export function doublonsDeLAnalyse(analyse: Analyse): Doublon[] {
  const noms = new Map(analyse.inventaire.entrees.map((entree) => [entree.nom.id, entree.nom]));
  return analyse.normalisation.collisions
    .map((collision) => collision.ids.flatMap((id) => {
      const nom = noms.get(id);
      return nom && nom.nom !== collision.nom ? [{ categorie: collision.categorie, ancien: nom.nom, nouveau: collision.nom }] : [];
    }))
    .filter((doublon) => doublon.length > 0);
}

export function nombreDeNomsBloques(doublons: readonly Doublon[]): number {
  return doublons.reduce((total, doublon) => total + doublon.length, 0);
}

/** Le titre dit le nombre de noms proposés ; l'aide dit quoi faire, ou pourquoi il n'y a rien à faire. */
export function bilanDeLAnalyse(analyse: Analyse): { titre: string; aide: string } {
  const propositions = analyse.normalisation.propositions.length;
  const aide = propositions > 0 ? TEXTES.aide
    : analyse.normalisation.collisions.length > 0 ? TEXTES.rienAFaireSaufDoublons : TEXTES.rienAFaire;
  return { titre: TEXTES.titreDuBilan(propositions), aide };
}

export function texteDApplication(resultat: ResultatApplication): string {
  if (resultat.statut === 'applique') return TEXTES.fin.modifies(resultat.renommages.length);
  return resultat.statut === 'partiel' ? TEXTES.fin.partiel : TEXTES.fin.refuse;
}

export function texteDeSelection(nombre: number): string {
  return nombre === 0 ? TEXTES.pied.aucunNomCoche : TEXTES.pied.nomsCoches(nombre);
}
