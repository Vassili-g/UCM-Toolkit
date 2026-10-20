/**
 * Index des termes UCM et des termes propres au fichier pour normaliser ses noms.
 *
 * La cible d'un terme personnalisé est résolue vers sa forme terminale : l'index lui applique les remplacements de sa catégorie
 * (termes UCM et personnalisés) jusqu'à ce que rien ne change. Une chaîne `foo` → `bar`, `bar` → `baz` remplace donc `foo`
 * par `baz` dès le premier calcul. Une résolution qui revient sur une règle de sa propre pile est un conflit `cycle` ; la
 * règle garde alors sa cible d'origine. Les cibles UCM restent telles quelles.
 */
import { REGISTRES_ARCHITECTURE } from './architecture.js';
import { CATEGORIES_DE_NOM, type CategorieDeNom } from './conventions.js';
import { termesDuSegment } from './ecriture-des-mots.js';
import { cleDeRegleDuTerme, type ConflitDeVocabulaire, type IndexDuVocabulaire, type Mots, type OrigineDuTerme, type Remplacement, type VocabulaireDuFichier } from './harmonisation.js';
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
    index: { remplacements: (mots, categorie, frontieres) => parCategorie.get(categorie)!.index.remplacements(mots, categorie, frontieres) },
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
    const cleRegle = cleDeRegleDuTerme(par);
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

  const cyclesSimples = cyclesDesRemplacements(entrees);
  conflits.push(...cyclesSimples);
  const bruts = [...entrees.values()].sort((a, b) => b.source.length - a.source.length);
  const resolutions = resoudreLesCibles(bruts, categorie, cyclesSimples, conflits);
  const candidats = bruts.map((entree) => ({ ...entree, par: resolutions.get(entree) ?? entree.par }));
  return {
    index: {
      remplacements(mots: Mots, categorie: CategorieDeNom, frontieres?: ReadonlySet<number>): readonly Remplacement[] {
        return trouverLesRemplacements(candidats, mots, categorie, frontieres).map(({ debut, fin, entree }) => ({
          debut, fin, par: conserverLaCasse(mots.slice(debut, fin), entree.par), origine: entree.origine, cle: entree.cle,
        }));
      },
    },
    conflits,
  };
}

type Trouve = { readonly debut: number; readonly fin: number; readonly entree: Entree };

/** Les entrées trouvées dans `mots`, la plus longue source d'abord, sans chevauchement, ordonnées par position. */
function trouverLesRemplacements(candidats: readonly Entree[], mots: Mots, categorie: CategorieDeNom, frontieres?: ReadonlySet<number>): Trouve[] {
  const prises = new Set<number>();
  const resultats: Trouve[] = [];
  for (const entree of candidats) {
    if (entree.proprietesSeulement && categorie !== 'proprietes') continue;
    for (let debut = 0; debut <= mots.length - entree.source.length; debut++) {
      if (entree.source.some((mot, rang) => prises.has(debut + rang) || mot.toLowerCase() !== mots[debut + rang].toLowerCase())) continue;
      const fin = debut + entree.source.length;
      if (frontieres && !(frontieres.has(debut) && frontieres.has(fin))) continue;
      for (let rang = debut; rang < fin; rang++) prises.add(rang);
      resultats.push({ debut, fin, entree });
    }
  }
  return resultats.sort((a, b) => a.debut - b.debut);
}

/** Les débuts de terme d'une cible écrite en tirets, plus sa longueur : les frontières que le calcul lui donnerait comme segment. */
function frontieresDeLaCible(mots: Mots): ReadonlySet<number> {
  return new Set([...termesDuSegment(mots.join('-'), mots, null).map(([debut]) => debut), mots.length]);
}

function cleDuCycle(termes: readonly Mots[]): string {
  return JSON.stringify(termes.map(cleDesMots).sort());
}

/**
 * La forme terminale de la cible de chaque entrée personnalisée. Une entrée en cycle,
 * ou qui dépend d'un cycle, n'a pas de forme terminale et garde sa cible. Un cycle déjà signalé par `cyclesDesRemplacements`,
 * ou déjà trouvé ici, n'est pas signalé deux fois.
 */
function resoudreLesCibles(
  candidats: readonly Entree[], categorie: CategorieDeNom, cyclesSimples: readonly ConflitDeVocabulaire[], conflits: ConflitDeVocabulaire[],
): Map<Entree, Mots> {
  const signales = new Set(cyclesSimples.flatMap((conflit) => (conflit.type === 'cycle' ? [cleDuCycle(conflit.termes)] : [])));
  const terminales = new Map<Entree, Mots | null>();

  function signaler(boucle: readonly Entree[]): void {
    const termes = boucle.map((entree) => entree.source);
    const cle = cleDuCycle(termes);
    if (signales.has(cle)) return;
    signales.add(cle);
    conflits.push({ type: 'cycle', termes });
  }

  function resoudre(entree: Entree, pile: Entree[]): Mots | null {
    if (entree.origine === 'ucm') return entree.par;
    if (terminales.has(entree)) return terminales.get(entree)!;
    const rang = pile.indexOf(entree);
    if (rang >= 0) {
      signaler(pile.slice(rang));
      return null;
    }
    pile.push(entree);
    let courant = entree.par;
    const utilisees = new Set<Entree>();
    let terminale: Mots | null = courant;
    for (;;) {
      const trouves = trouverLesRemplacements(candidats, courant, categorie, frontieresDeLaCible(courant));
      if (trouves.length === 0) break;
      const suite: string[] = [];
      let curseur = 0;
      for (const { debut, fin, entree: remplacee } of trouves) {
        if (utilisees.has(remplacee)) signaler([entree, remplacee]);
        const cible = utilisees.has(remplacee) ? null : resoudre(remplacee, pile);
        if (cible === null) {
          terminale = null;
          break;
        }
        suite.push(...courant.slice(curseur, debut), ...conserverLaCasse(courant.slice(debut, fin), cible));
        curseur = fin;
      }
      if (terminale === null) break;
      suite.push(...courant.slice(curseur));
      for (const { entree: remplacee } of trouves) utilisees.add(remplacee);
      courant = suite;
      terminale = courant;
    }
    pile.pop();
    terminales.set(entree, terminale);
    return terminale;
  }

  const resolutions = new Map<Entree, Mots>();
  for (const entree of candidats) {
    const terminale = resoudre(entree, []);
    if (terminale !== null && entree.origine === 'personnalise') resolutions.set(entree, terminale);
  }
  return resolutions;
}
