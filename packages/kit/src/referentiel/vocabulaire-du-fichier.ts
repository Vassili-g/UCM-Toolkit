/** Index des termes UCM et des termes propres au fichier pour normaliser ses noms. */
import { REGISTRES_ARCHITECTURE } from './architecture.js';
import { CATEGORIES_DE_NOM, type CategorieDeNom } from './conventions.js';
import type { ConflitDeVocabulaire, IndexDuVocabulaire, Mots, OrigineDuTerme, Remplacement, VocabulaireDuFichier } from './harmonisation.js';
import { decouperSegment } from './normalisation.js';
import { REGISTRES, REGISTRE_AXES_ETAT } from './vocabulaire.js';
import { termePourCategorie } from './termes.js';

type Entree = {
  readonly source: Mots;
  readonly par: Mots;
  readonly origine: OrigineDuTerme;
  readonly cle: string;
  readonly proprietesSeulement: boolean;
};

function cleDesMots(mots: Mots): string {
  return JSON.stringify(mots.map((mot) => mot.toLowerCase()));
}

function casseDuMot(source: string, cible: string): string {
  if (source === source.toUpperCase() && /\p{L}/u.test(source)) return cible.toUpperCase();
  if (/^\p{Lu}/u.test(source)) return cible.replace(/^\p{L}/u, (lettre) => lettre.toUpperCase());
  return cible;
}

function conserverLaCasse(source: Mots, cible: Mots): Mots {
  return cible.map((mot, rang) => casseDuMot(source[rang] ?? source[source.length - 1] ?? '', mot));
}

function cyclesDesRemplacements(entrees: ReadonlyMap<string, Entree>): ConflitDeVocabulaire[] {
  const visites = new Set<string>();
  const cycles: ConflitDeVocabulaire[] = [];
  for (const depart of entrees.keys()) {
    if (visites.has(depart)) continue;
    const chemin: string[] = [];
    const positions = new Map<string, number>();
    let courant: string | undefined = depart;
    while (courant !== undefined && !visites.has(courant) && !positions.has(courant)) {
      positions.set(courant, chemin.length);
      chemin.push(courant);
      const suivant = cleDesMots(entrees.get(courant)!.par);
      courant = entrees.has(suivant) ? suivant : undefined;
    }
    const debut = courant === undefined ? undefined : positions.get(courant);
    if (debut !== undefined) {
      cycles.push({ type: 'cycle', termes: chemin.slice(debut).map((cle) => entrees.get(cle)!.source) });
    }
    for (const cle of chemin) visites.add(cle);
  }
  return cycles;
}

/** Indexe les formes tolérées par UCM, puis les remplacements du fichier ; signale les règles incompatibles. */
export function indexerVocabulaire(vocabulaire: VocabulaireDuFichier): { readonly index: IndexDuVocabulaire; readonly conflits: readonly ConflitDeVocabulaire[] } {
  const parCategorie = new Map(CATEGORIES_DE_NOM.map((categorie) => [categorie, indexerPourCategorie(vocabulaire, categorie)]));
  return {
    index: { remplacements: (mots, categorie) => parCategorie.get(categorie)!.index.remplacements(mots, categorie) },
    conflits: [...new Map([...parCategorie.values()].flatMap(({ conflits }) => conflits).map((conflit) => [JSON.stringify(conflit), conflit])).values()],
  };
}

function indexerPourCategorie(vocabulaire: VocabulaireDuFichier, categorie: CategorieDeNom): { readonly index: IndexDuVocabulaire; readonly conflits: readonly ConflitDeVocabulaire[] } {
  const ecarts = new Set(vocabulaire.ecartsUcm.map((id) => id.toLowerCase()));
  const canoniquesUcm = new Map<string, Mots>();
  const entrees = new Map<string, Entree>();
  const conflits: ConflitDeVocabulaire[] = [];

  for (const registre of [...REGISTRES, ...REGISTRES_ARCHITECTURE]) {
    for (const original of registre.termes) {
      if (ecarts.has(original.id.toLowerCase())) continue;
      const terme = termePourCategorie(original, categorie);
      const canonique = decouperSegment(terme.id);
      canoniquesUcm.set(cleDesMots(canonique), canonique);
      for (const tolere of terme.toleres ?? []) {
        const source = decouperSegment(tolere);
        const cle = cleDesMots(source);
        if (cle === cleDesMots(canonique)) continue;
        const entree: Entree = {
          source, par: canonique, origine: 'ucm', cle: `terme:${original.id}`,
          proprietesSeulement: registre === REGISTRE_AXES_ETAT,
        };
        if (!entrees.has(cle)) entrees.set(cle, entree);
      }
    }
  }

  for (const personnalise of vocabulaire.personnalises) {
    const par = personnalise.terme;
    const cleRegle = `terme:${par.join('-').toLowerCase()}`;
    for (const source of personnalise.remplace) {
      const cle = cleDesMots(source);
      if (cle === cleDesMots(par)) continue;
      const precedente = entrees.get(cle);
      const termeUcm = canoniquesUcm.get(cle) ?? (precedente?.origine === 'ucm' ? precedente.par : undefined);
      if (termeUcm) {
        if (cleDesMots(termeUcm) !== cleDesMots(par)) {
          conflits.push({ type: 'contredit-ucm', terme: par, remplace: source, termeUcm });
        }
        continue;
      }
      if (precedente) {
        if (cleDesMots(precedente.par) !== cleDesMots(par)) {
          conflits.push({ type: 'deja-remplace', remplace: source, par });
        }
        continue;
      }
      entrees.set(cle, { source, par, origine: 'personnalise', cle: cleRegle, proprietesSeulement: false });
    }
  }

  conflits.push(...cyclesDesRemplacements(entrees));
  const candidats = [...entrees.values()].sort((a, b) => b.source.length - a.source.length);
  return {
    index: {
      remplacements(mots: Mots, categorie: CategorieDeNom): readonly Remplacement[] {
        const prises = new Set<number>();
        const resultats: Remplacement[] = [];
        for (const entree of candidats) {
          if (entree.proprietesSeulement && categorie !== 'proprietes') continue;
          for (let debut = 0; debut <= mots.length - entree.source.length; debut++) {
            if (entree.source.some((mot, rang) => prises.has(debut + rang) || mot.toLowerCase() !== mots[debut + rang].toLowerCase())) continue;
            const fin = debut + entree.source.length;
            for (let rang = debut; rang < fin; rang++) prises.add(rang);
            resultats.push({ debut, fin, par: conserverLaCasse(mots.slice(debut, fin), entree.par), origine: entree.origine, cle: entree.cle });
          }
        }
        return resultats.sort((a, b) => a.debut - b.debut);
      },
    },
    conflits,
  };
}
