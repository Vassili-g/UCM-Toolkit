/**
 * Ce que chaque commande de copie met dans le presse-papiers. Un nombre reste
 * sans unité, un booléen s'écrit `true` ou `false`, une chaîne vide reste
 * vide. Une couleur se copie en composantes exactes ou en hexadécimal à 8 bits,
 * et la seconde forme annonce son arrondi.
 *
 * La référence publiée n'est proposée qu'avec une correspondance vérifiée
 * (`referencePubliee`) : un nom Figma ne donne pas une référence DTCG.
 */
import type { Index } from './indexation';
import { composantesDeCouleur, hexaDeCouleur, texteDeValeur, type ValeurSource } from './modele';
import type { Etape, Resultat } from './resolution';

export type FormatDeCopie = 'nom' | 'valeur' | 'hexa' | 'composantes' | 'chaine' | 'source' | 'reference';

export interface Copie {
  readonly format: FormatDeCopie;
  /** `null` quand la copie est impossible ; `raison` dit alors pourquoi. */
  readonly texte: string | null;
  readonly raison?: 'non-resolu' | 'pas-une-couleur' | 'sans-correspondance';
  /** Vrai quand le texte copié arrondit la donnée source. */
  readonly arrondi?: boolean;
}

/** Le nom complet d'une variable, collection comprise, pour un texte lisible hors de Figma. */
export function nomComplet(index: Index, variable: string): string {
  const trouvee = index.variables.get(variable);
  if (!trouvee) return variable;
  const collection = index.collections.get(trouvee.collection);
  return `${collection?.nom ?? trouvee.collection} / ${trouvee.nom}`;
}

/** Le nom d'un mode, ou son identifiant quand le relevé ne le déclare pas. */
export function nomDeMode(index: Index, mode: string): string {
  const collection = index.collections.get(index.collectionDuMode.get(mode) ?? '');
  return collection?.modes.find((candidat) => candidat.id === mode)?.nom ?? mode;
}

/** Une valeur source en texte : un alias nomme sa cible. */
export function texteDeSource(index: Index, source: ValeurSource): string {
  return source.nature === 'alias' ? `→ ${nomComplet(index, source.cible)}` : texteDeValeur(source);
}

/** La chaîne en texte, une étape par ligne, avec le constat quand elle n'aboutit pas. */
export function texteDeChaine(index: Index, resultat: Resultat, constat: string | null): string {
  const lignes = resultat.etapes.map((etape: Etape) => `${nomComplet(index, etape.variable)} [${nomDeMode(index, etape.mode)}]`);
  const fin = resultat.statut === 'resolu' ? texteDeValeur(resultat.valeur) : constat ?? resultat.statut;
  return [...lignes, fin].join('\n→ ');
}

/** Le texte de chaque format de copie pour un résultat. `reference` vient d'une correspondance vérifiée, sinon `null`. */
export function copier(index: Index, variable: string, resultat: Resultat, format: FormatDeCopie, options: { constat?: string | null; reference?: string | null } = {}): Copie {
  switch (format) {
    case 'nom':
      return { format, texte: index.variables.get(variable)?.nom ?? variable };
    case 'chaine':
      return { format, texte: texteDeChaine(index, resultat, options.constat ?? null) };
    case 'source': {
      const premiere = resultat.etapes[0];
      return premiere ? { format, texte: JSON.stringify(premiere.source) } : { format, texte: null, raison: 'non-resolu' };
    }
    case 'reference':
      return options.reference ? { format, texte: options.reference } : { format, texte: null, raison: 'sans-correspondance' };
    case 'valeur':
      if (resultat.statut !== 'resolu') return { format, texte: null, raison: 'non-resolu' };
      if (resultat.valeur.nature === 'couleur') return { format, texte: composantesDeCouleur(resultat.valeur.couleur) };
      return { format, texte: texteDeValeur(resultat.valeur) };
    case 'composantes':
    case 'hexa': {
      if (resultat.statut !== 'resolu') return { format, texte: null, raison: 'non-resolu' };
      if (resultat.valeur.nature !== 'couleur') return { format, texte: null, raison: 'pas-une-couleur' };
      if (format === 'composantes') return { format, texte: composantesDeCouleur(resultat.valeur.couleur) };
      const { hexa, arrondi } = hexaDeCouleur(resultat.valeur.couleur);
      return { format, texte: hexa, arrondi };
    }
  }
}
