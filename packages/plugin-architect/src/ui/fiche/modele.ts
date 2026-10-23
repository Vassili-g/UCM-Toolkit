/**
 * Ce que dit la fiche d'une variable : sa chaîne d'alias dans les modes
 * affichés, le renommage que Corrections propose pour elle, et les variables
 * qui la visent. La fiche se calcule du relevé et du résultat de Nomenclature ;
 * aucun message ne part au sandbox.
 */
import { nomDeMode } from '../../copie';
import { dependantsDirects } from '../../indexation';
import { espaceDuReleve, type ValeurTerminale } from '../../modele';
import type { Application } from '../application';
import { constatDeChaine } from '../chaine';
import { TEXTES } from '../textes';
import { PREFIXE_VISE } from '../recherche/requete';
import { texteAffiche } from '../valeurs';

/** Une étape de la chaîne : la variable, sa collection, et son mode quand la collection en a plusieurs. */
export interface EtapeDeFiche {
  readonly nom: string;
  readonly collection: string;
  readonly mode: string | null;
}

export type FinDeChaine =
  | { readonly sorte: 'valeur'; readonly valeur: ValeurTerminale; readonly texte: string }
  | { readonly sorte: 'echec'; readonly statut: string; readonly detail: string | null };

/** Le renommage coché pour cette variable : son nom entier après l'application, les segments qui arrivent, et le segment que la carte de Corrections propose. */
export interface RenommageDeFiche {
  readonly nouveau: string;
  readonly ajouts: readonly string[];
  readonly regle: { readonly rang: number; readonly avant: string; readonly apres: string } | null;
}

export interface FicheDeVariable {
  readonly id: string;
  readonly nom: string;
  /** « Interface, couleur » : la collection et le type. */
  readonly origine: string;
  readonly description: string;
  readonly etapes: readonly EtapeDeFiche[];
  readonly fin: FinDeChaine;
  readonly renommage: RenommageDeFiche | null;
  /** Les variables qui visent celle-ci, par leur nom actuel, et la recherche qui les montre toutes. */
  readonly utilisee: { readonly total: number; readonly noms: readonly string[]; readonly recherche: string };
}

/** Le nombre de noms que la fiche liste sous « Utilisée par » ; le lien montre les autres dans le tableau. */
export const NOMS_LISTES_AU_PLUS = 10;

export function modeleDeLaFiche(app: Application, id: string): FicheDeVariable | null {
  const { index } = app.etat;
  const variable = index?.variables.get(id);
  if (!index || !variable) return null;
  const resultat = app.resultat(id);
  const etapes = resultat.etapes.map((etape, rang): EtapeDeFiche => {
    const collection = index.collections.get(etape.collection);
    const nom = index.variables.get(etape.variable)?.nom ?? etape.variable;
    return {
      // La variable ouverte porte son nom seul ; les cibles des alias se disent avec leur collection, qui ne figure pas dans leur nom.
      nom: rang === 0 ? nom : `${collection?.nom ?? etape.collection}/${nom}`,
      collection: collection?.nom ?? etape.collection,
      mode: collection && collection.modes.length > 1 ? nomDeMode(index, etape.mode) : null,
    };
  });
  const constat = constatDeChaine(app, resultat);
  const fin: FinDeChaine =
    resultat.statut === 'resolu'
      ? { sorte: 'valeur', valeur: resultat.valeur, texte: texteAffiche(resultat.valeur, espaceDeLaFiche(app)) }
      : { sorte: 'echec', statut: TEXTES.statut[resultat.statut], detail: constat?.detail ?? null };

  const coche = app.renommages.de(id);
  const segments = variable.nom.split('/');
  const nouveaux = coche?.nouveau.split('/') ?? [];
  const rangs = coche ? [...coche.cartes.keys()].sort((a, b) => a - b) : [];
  const renommage: RenommageDeFiche | null = coche
    ? { nouveau: coche.nouveau, ajouts: rangs.map((rang) => nouveaux[rang]), regle: rangs.length > 0 ? { rang: rangs[0], avant: segments[rangs[0]] ?? '', apres: nouveaux[rangs[0]] } : null }
    : null;

  const sources = dependantsDirects(index, id).map((source) => index.variables.get(source)?.nom).filter((nom): nom is string => nom !== undefined);
  return {
    id,
    nom: variable.nom,
    origine: TEXTES.origineDeLaFiche(index.collections.get(variable.collection)?.nom ?? variable.collection, TEXTES.types[variable.type]),
    description: variable.description,
    etapes,
    fin,
    renommage,
    utilisee: { total: sources.length, noms: sources.slice(0, NOMS_LISTES_AU_PLUS), recherche: `${PREFIXE_VISE}${variable.nom}` },
  };
}

function espaceDeLaFiche(app: Application) {
  return app.etat.index ? espaceDuReleve(app.etat.index.releve) : 'srgb';
}
