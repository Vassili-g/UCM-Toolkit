/** Préparation des noms et normalisation par lots, sans accès au document Figma. */
import type { CategorieDeNom, ConventionsParCategorie } from './conventions.js';
import { assembler, categorieDuSegment, commencerDetectionDesConventions, decouperSegment, motsAvecCasse, termesDuSegment } from './ecriture-des-mots.js';
import type { ChangementDeTerme, CleDeRegle, Collision, IndexDuVocabulaire, Lexique, Mots, NomLu, Occurrence, OccurrenceDeTerme, PlageDeTerme, PreparationDuLexique, Renommage, ResultatDuLexique } from './harmonisation.js';
import { naturesDesNoms } from './natures.js';
import { collectionUcmReconnue } from './normalisation.js';

const TAILLE_D_UN_LOT = 200;

/**
 * Ajoute les noms sans analyse ; `terminer` indexe et détecte par lots de deux cents noms.
 * `ordinaires` : les termes que le fichier traite comme des mots ordinaires, jamais comme des noms (voir `naturesDesNoms`).
 */
export function commencerLexique(options: { readonly ordinaires?: ReadonlySet<string> } = {}): PreparationDuLexique {
  const recus: NomLu[] = [];
  return {
    ajouter(noms) { for (const nom of noms) recus.push(nom); },
    *terminer(): Generator<void, Lexique> {
      const noms = new Map<string, NomLu>();
      const mots = new Map<string, Mots>();
      const occurrences = new Map<string, Occurrence[]>();
      const occurrencesDesTermes = new Map<string, OccurrenceDeTerme[]>();
      const termes = new Map<string, (readonly PlageDeTerme[])[]>();
      const plagesParSegment = new Map<string, readonly PlageDeTerme[]>();
      const portees = new Map<string, string[]>();
      const detection = commencerDetectionDesConventions();
      let traites = 0;
      // La nature d'un segment dépend de tous les noms du fichier : elle se calcule avant le premier lot,
      // en un seul pas (`naturesDesNoms` ne cède pas). Les noms sont lus par lots avant ce calcul.
      const lus: NomLu[] = [];
      for (const nom of recus) {
        lus.push({ ...nom });
        if (++traites % TAILLE_D_UN_LOT === 0) yield;
      }
      const natures = naturesDesNoms(lus, { ordinaires: options.ordinaires });
      const ordinaires = options.ordinaires ?? new Set<string>();
      const estOrdinaire = (decoupe: Mots): boolean => {
        if (decoupe.length < 2 || ordinaires.size === 0) return false;
        const minuscules = decoupe.map((mot) => mot.toLowerCase());
        return ordinaires.has(minuscules.join('-')) || ordinaires.has(minuscules.join(''));
      };
      traites = 0;
      for (const nom of recus) {
        noms.set(nom.id, nom);
        const ids = portees.get(nom.portee) ?? [];
        ids.push(nom.id);
        portees.set(nom.portee, ids);
        const naturesDuNom = natures.get(nom.id);
        const plagesDuNom: (readonly PlageDeTerme[])[] = [];
        nom.nom.split('/').forEach((segment, rangSegment) => {
          let decoupe = mots.get(segment);
          if (!decoupe) {
            decoupe = decouperSegment(segment);
            mots.set(segment, decoupe);
          }
          decoupe.forEach((mot, rangMot) => {
            const cle = mot.toLowerCase();
            const places = occurrences.get(cle) ?? [];
            places.push({ nomId: nom.id, rangSegment, rangMot });
            occurrences.set(cle, places);
          });
          const nature = naturesDuNom?.[rangSegment] ?? null;
          const cleDePlages = `${nature}\0${segment}`;
          let plages = plagesParSegment.get(cleDePlages);
          if (!plages) {
            // Un nom que le fichier traite comme un terme reste entier : il perd sa nature, pas son unité.
            plages = !nature && estOrdinaire(decoupe) ? [[0, decoupe.length] as const] : termesDuSegment(decoupe, nature);
            plagesParSegment.set(cleDePlages, plages);
          }
          plagesDuNom.push(plages);
          if (nom.categorie === 'collections') return;
          for (const [debut, fin] of plages) {
            const cle = decoupe.slice(debut, fin).map((mot) => mot.toLowerCase()).join('-');
            const places = occurrencesDesTermes.get(cle) ?? [];
            places.push({ nomId: nom.id, rangSegment, rangMot: debut, longueur: fin - debut });
            occurrencesDesTermes.set(cle, places);
          }
        });
        termes.set(nom.id, plagesDuNom);
        detection.ajouter(nom, mots);
        if (++traites % TAILLE_D_UN_LOT === 0) yield;
      }
      return { noms, mots, occurrences, natures, termes, occurrencesDesTermes, portees, detection: detection.resultat() };
    },
  };
}

type SegmentNormalise = {
  readonly nouveau: string;
  readonly regles: readonly { readonly cle: CleDeRegle; readonly priorite: number }[];
  readonly termes: readonly ChangementDeTerme[];
};

function normaliserSegment(segment: string, categorie: CategorieDeNom, conventions: ConventionsParCategorie,
  index: IndexDuVocabulaire, decoupe: Mots, plages: readonly PlageDeTerme[]): SegmentNormalise {
  if (decoupe.length === 0) return { nouveau: segment, regles: [], termes: [] };
  const choix = conventions[categorie] ?? { casse: 'inchangee', separateur: 'inchange' };
  // Un remplacement ne coupe pas un terme : `wrap` ne touche pas `ScaleWrap` (un élément), `radius` remplace `Border-radius` en entier.
  const frontieres = new Set([...plages.map(([debut]) => debut), decoupe.length]);
  const remplacements = index.remplacements(decoupe, categorie, frontieres);
  const termes: ChangementDeTerme[] = [];
  const regles: { cle: CleDeRegle; priorite: number }[] = [];
  const remplaces: string[] = [];
  let curseur = 0;
  for (const remplacement of remplacements) {
    remplaces.push(...decoupe.slice(curseur, remplacement.debut), ...remplacement.par);
    termes.push({ avant: decoupe.slice(remplacement.debut, remplacement.fin), apres: remplacement.par, origine: remplacement.origine });
    regles.push({ cle: remplacement.cle as CleDeRegle, priorite: remplacement.origine === 'ucm' ? 0 : 1 });
    curseur = remplacement.fin;
  }
  remplaces.push(...decoupe.slice(curseur));
  const ecritSansTerme = assembler(segment, motsAvecCasse(decoupe, choix.casse), choix.separateur);
  if (ecritSansTerme !== segment) regles.push({ cle: `ecriture:${categorie}`, priorite: 3 });
  return {
    nouveau: assembler(segment, motsAvecCasse(remplaces, choix.casse), choix.separateur),
    regles, termes,
  };
}

function cheminDeGroupe(portee: string, segments: readonly string[], rang: number): string {
  return `${portee}\0${segments.slice(0, rang + 1).join('/')}`;
}

function proposer(nom: NomLu, lexique: Lexique, conventions: ConventionsParCategorie,
  index: IndexDuVocabulaire, cache: Map<string, SegmentNormalise>, groupesFiges: ReadonlySet<string>): Renommage | undefined {
  if (nom.categorie === 'collections') {
    const canonique = collectionUcmReconnue(nom.nom);
    if (!canonique || canonique === nom.nom) return undefined;
    return { id: nom.id, categorie: nom.categorie, portee: nom.portee, ancienNom: nom.nom,
      nouveauNom: canonique, regles: [`collection:${nom.id}`], termes: [] };
  }
  const regles: { readonly cle: CleDeRegle; readonly priorite: number }[] = [];
  const termes: ChangementDeTerme[] = [];
  const segments = nom.nom.split('/');
  const nouveauNom = segments.map((segment, rang) => {
    if (!segment) return segment;
    // Un dossier partagé avec un nom non renommable garde son texte : le renommer couperait le dossier en deux.
    if (rang < segments.length - 1 && groupesFiges.has(cheminDeGroupe(nom.portee, segments, rang))) return segment;
    const categorie = categorieDuSegment(nom, rang);
    const choix = conventions[categorie];
    const decoupe = lexique.mots.get(segment) ?? decouperSegment(segment);
    const plages = lexique.termes.get(nom.id)?.[rang] ?? termesDuSegment(decoupe, lexique.natures.get(nom.id)?.[rang] ?? null);
    const cle = JSON.stringify([segment, categorie, choix?.casse, choix?.separateur, plages]);
    let resultat = cache.get(cle);
    if (!resultat) {
      resultat = normaliserSegment(segment, categorie, conventions, index, decoupe, plages);
      cache.set(cle, resultat);
    }
    regles.push(...resultat.regles);
    termes.push(...resultat.termes);
    return resultat.nouveau;
  }).join('/');
  if (nouveauNom === nom.nom) return undefined;
  const uniques = [...new Map(regles.map((regle) => [regle.cle, regle])).values()];
  uniques.sort((a, b) => a.priorite - b.priorite);
  return { id: nom.id, categorie: nom.categorie, portee: nom.portee, ancienNom: nom.nom,
    nouveauNom, regles: uniques.map((regle) => regle.cle), termes };
}

function cleDestination(nom: NomLu, cible: string): string {
  return JSON.stringify([nom.categorie, nom.portee, cible]);
}

function* trierParEtapes<T>(entrees: T[], valeur: (entree: T) => number): Generator<void, T[]> {
  let source = entrees;
  let cible = new Array<T>(entrees.length);
  let operations = 0;
  for (let largeur = 1; largeur < entrees.length; largeur *= 2) {
    for (let debut = 0; debut < entrees.length; debut += largeur * 2) {
      const milieu = Math.min(debut + largeur, entrees.length);
      const fin = Math.min(debut + largeur * 2, entrees.length);
      let gauche = debut;
      let droite = milieu;
      for (let rang = debut; rang < fin; rang++) {
        cible[rang] = droite >= fin || (gauche < milieu && valeur(source[gauche]) <= valeur(source[droite]))
          ? source[gauche++] : source[droite++];
        if (++operations % TAILLE_D_UN_LOT === 0) yield;
      }
    }
    [source, cible] = [cible, source];
  }
  return source;
}

/**
 * Calcule les destinations d'une portée avec tous ses occupants et retire les renommages bloqués jusqu'à stabilité.
 * Un segment de groupe dont le chemin est partagé avec un nom non renommable de la même portée garde son texte.
 */
export function* normaliserParEtapes(lexique: Lexique, conventions: ConventionsParCategorie, index: IndexDuVocabulaire,
  options: { readonly nonRenommables?: readonly string[]; readonly portees?: readonly string[] } = {}): Generator<void, ResultatDuLexique> {
  const portees = options.portees && new Set(options.portees);
  const nonRenommables = new Set(options.nonRenommables);
  const cache = new Map<string, SegmentNormalise>();
  const noms: NomLu[] = [];
  const propositions = new Map<number, Renommage>();
  const groupesFiges = new Set<string>();
  for (const id of nonRenommables) {
    const protege = lexique.noms.get(id);
    if (!protege || (portees && !portees.has(protege.portee))) continue;
    const segments = protege.nom.split('/');
    for (let rang = 0; rang < segments.length - 1; rang++) groupesFiges.add(cheminDeGroupe(protege.portee, segments, rang));
  }
  const destinations = new Map<string, Set<number>>();
  let examines = 0;
  for (const nom of lexique.noms.values()) {
    if (portees && !portees.has(nom.portee)) {
      if (++examines % TAILLE_D_UN_LOT === 0) yield;
      continue;
    }
    const rang = noms.length;
    noms.push(nom);
    if (!nonRenommables.has(nom.id)) {
      const proposition = proposer(nom, lexique, conventions, index, cache, groupesFiges);
      if (proposition) propositions.set(rang, proposition);
    }
    const cle = cleDestination(nom, propositions.get(rang)?.nouveauNom ?? nom.nom);
    const groupe = destinations.get(cle) ?? new Set<number>();
    groupe.add(rang);
    destinations.set(cle, groupe);
    if (++examines % TAILLE_D_UN_LOT === 0) yield;
  }

  const collisions = new Map<string, Collision>();
  let aExaminer: Iterable<string> = destinations.keys();
  let inspections = 0;
  while (true) {
    const retraits = new Set<number>();
    for (const cle of aExaminer) {
      const groupe = destinations.get(cle);
      if (++inspections % TAILLE_D_UN_LOT === 0) yield;
      if (!groupe || groupe.size < 2) continue;
      const aTrier: number[] = [];
      for (const rang of groupe) {
        aTrier.push(rang);
        if (++inspections % TAILLE_D_UN_LOT === 0) yield;
      }
      const rangs = yield* trierParEtapes(aTrier, (rang) => rang);
      const ids: string[] = [];
      let contientProposition = false;
      for (const rang of rangs) {
        ids.push(noms[rang].id);
        if (propositions.has(rang)) {
          contientProposition = true;
          retraits.add(rang);
        }
        if (++inspections % TAILLE_D_UN_LOT === 0) yield;
      }
      if (!contientProposition) continue;
      const premier = noms[rangs[0]];
      const nom = propositions.get(rangs[0])?.nouveauNom ?? premier.nom;
      collisions.set(cle, {
        categorie: premier.categorie, portee: premier.portee, nom, ids,
      });
    }
    const suivantes = new Set<string>();
    for (const rang of retraits) {
      const proposition = propositions.get(rang)!;
      propositions.delete(rang);
      destinations.get(cleDestination(noms[rang], proposition.nouveauNom))!.delete(rang);
      const origine = cleDestination(noms[rang], noms[rang].nom);
      const groupe = destinations.get(origine) ?? new Set<number>();
      groupe.add(rang);
      destinations.set(origine, groupe);
      suivantes.add(origine);
      if (++inspections % TAILLE_D_UN_LOT === 0) yield;
    }
    if (suivantes.size === 0) break;
    const avecRang: { cle: string; rang: number }[] = [];
    for (const cle of suivantes) {
      let premier = Number.POSITIVE_INFINITY;
      for (const rang of destinations.get(cle) ?? []) {
        if (rang < premier) premier = rang;
        if (++inspections % TAILLE_D_UN_LOT === 0) yield;
      }
      avecRang.push({ cle, rang: premier });
      if (++inspections % TAILLE_D_UN_LOT === 0) yield;
    }
    const ordre = yield* trierParEtapes(avecRang, (entree) => entree.rang);
    aExaminer = (function* () { for (const entree of ordre) yield entree.cle; })();
  }
  return { renommages: [...propositions.values()], collisions: [...collisions.values()] };
}

/** Termine la normalisation par étapes. */
export function normaliserLeLexique(...memes: Parameters<typeof normaliserParEtapes>): ResultatDuLexique {
  const calcul = normaliserParEtapes(...memes);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

/** Rend les portées contenant une suite de mots dans un même segment. */
export function porteesTouchees(lexique: Lexique, termes: readonly Mots[]): readonly string[] {
  const touchees = new Set<string>();
  for (const terme of termes) {
    if (terme.length === 0) continue;
    const occurrences = lexique.occurrences.get(terme[0].toLowerCase()) ?? [];
    for (const occurrence of occurrences) {
      const nom = lexique.noms.get(occurrence.nomId);
      if (!nom) continue;
      const segment = nom.nom.split('/')[occurrence.rangSegment];
      const mots = lexique.mots.get(segment) ?? [];
      if (terme.every((mot, rang) => mots[occurrence.rangMot + rang]?.toLowerCase() === mot.toLowerCase())) touchees.add(nom.portee);
    }
  }
  return [...lexique.portees.keys()].filter((portee) => touchees.has(portee));
}
