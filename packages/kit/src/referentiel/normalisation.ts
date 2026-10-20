/**
 * Propose des noms logiques ; le plugin conserve les identifiants techniques des propriétés Figma.
 *
 * Après une modification : relancer `npm test` et changer la version du kit ; aucune vue ni planche n'en tire de données.
 */
import { COLLECTIONS, DESTINATION_DES_PALETTES, FORMES_ANCIENNES_DES_COLLECTIONS, REGISTRES_ARCHITECTURE, type Collection } from './architecture.js';
import { type Casse, type Separateur, type Convention, type NomANormaliser, type ConventionsParCategorie, type CategorieDeNom } from './conventions.js';
import { assembler, capitale, categorieDuSegment, commencerDetectionDesConventions, decouperSegment, motsAvecCasse } from './ecriture-des-mots.js';
import { REGISTRES, REGISTRE_AXES_ETAT } from './vocabulaire.js';
import { termePourCategorie } from './termes.js';
import { formeReconnue } from './reconnaissance.js';

export { assembler, categorieDuSegment, decouperSegment, motsAvecCasse } from './ecriture-des-mots.js';

export type RaisonDeNormalisation = 'casse' | 'separateur' | 'terme-tolere';
export type PropositionDeNom = Omit<NomANormaliser, 'nom'> & {
  readonly ancienNom: string;
  readonly nouveauNom: string;
  readonly raisons: readonly RaisonDeNormalisation[];
};
export type CollisionDeNoms = {
  readonly categorie: CategorieDeNom;
  readonly portee: string;
  readonly nom: string;
  readonly ids: readonly string[];
};
export type ResultatDeNormalisation = {
  readonly propositions: readonly PropositionDeNom[];
  readonly collisions: readonly CollisionDeNoms[];
};

/** Reconnaît une collection après découpage des séparateurs et de la casse, puis parmi les formes d'avant le renommage. */
export function collectionUcmReconnue(nom: string): Collection | undefined {
  const normalise = formeReconnue(nom);
  if ((COLLECTIONS as readonly string[]).includes(normalise)) return normalise as Collection;
  return Object.prototype.hasOwnProperty.call(FORMES_ANCIENNES_DES_COLLECTIONS, normalise) ? FORMES_ANCIENNES_DES_COLLECTIONS[normalise] : undefined;
}

/**
 * La portée de la grammaire pour une sortie de palette : `reference` quand la collection est reconnue comme `primitives`
 * et que le groupe est un seul segment de forme reconnue `color` ; `libre` sinon. Aucune écriture n'est refusée ni changée
 * selon cette portée : une sortie `libre` n'est jamais jugée par `FORMES_DES_CHEMINS`.
 */
export function porteeDeLaGrammaire(nomDeCollection: string, groupe: readonly string[]): 'reference' | 'libre' {
  const reference = collectionUcmReconnue(nomDeCollection) === DESTINATION_DES_PALETTES.collection
    && groupe.length === 1 && formeReconnue(groupe[0]) === formeReconnue(DESTINATION_DES_PALETTES.groupe);
  return reference ? 'reference' : 'libre';
}


/** Remplace les formes tolérées, y compris une suite de mots (`border-radius` → `radius`), comme le moteur d'UCM Nomenclature. */
function remplacerLesTermes(mots: readonly string[], categorie: CategorieDeNom): string[] {
  const registres = [...REGISTRES, ...REGISTRES_ARCHITECTURE].filter((registre) => registre !== REGISTRE_AXES_ETAT || categorie === 'proprietes');
  const formes = registres.flatMap((registre) => registre.termes).map((terme) => termePourCategorie(terme, categorie)).flatMap((terme) => (terme.toleres ?? [])
    .map((tolere) => ({ source: decouperSegment(tolere).map((mot) => mot.toLowerCase()), id: terme.id })))
    .sort((a, b) => b.source.length - a.source.length);
  const resultat: string[] = [];
  for (let rang = 0; rang < mots.length;) {
    const forme = formes.find(({ source }) => source.every((mot, decalage) => mots[rang + decalage]?.toLowerCase() === mot));
    if (!forme) { resultat.push(mots[rang++]); continue; }
    const mot = mots[rang];
    resultat.push(mot === mot.toUpperCase() ? forme.id.toUpperCase() : /^\p{Lu}/u.test(mot) ? capitale(forme.id) : forme.id);
    rang += forme.source.length;
  }
  return resultat;
}

function proposer(nom: NomANormaliser, conventions: ConventionsParCategorie, termesUcm: boolean): PropositionDeNom | undefined {
  const raisons = new Set<RaisonDeNormalisation>();
  const nouveauNom = nom.nom.split('/').map((segment, rang) => {
    if (!segment) return segment;
    const categorie = categorieDuSegment(nom, rang);
    const choix = conventions[categorie] ?? { casse: 'inchangee', separateur: 'inchange' };
    const originaux = decouperSegment(segment);
    if (originaux.length === 0) return segment;
    const mots = termesUcm ? remplacerLesTermes(originaux, categorie) : originaux;
    if (mots.some((mot, rang) => mot !== originaux[rang])) raisons.add('terme-tolere');
    const avecCasse = motsAvecCasse(mots, choix.casse);
    if (avecCasse.some((mot, rang) => mot !== mots[rang])) raisons.add('casse');
    const avecSeparateurs = assembler(segment, avecCasse, choix.separateur);
    if (avecSeparateurs !== assembler(segment, avecCasse, 'inchange')) raisons.add('separateur');
    return avecSeparateurs;
  }).join('/');
  if (nouveauNom === nom.nom) return undefined;
  const { nom: ancienNom, ...identite } = nom;
  return { ...identite, ancienNom, nouveauNom, raisons: ['casse', 'separateur', 'terme-tolere'].filter((raison) => raisons.has(raison as RaisonDeNormalisation)) as RaisonDeNormalisation[] };
}

/** Compare toutes les destinations d'une portée, puis retire les propositions bloquées jusqu'à stabilisation. */
export function normaliserLesNoms(
  noms: readonly NomANormaliser[],
  conventions: ConventionsParCategorie,
  options: { readonly termesUcm?: boolean; readonly nonRenommables?: readonly string[] } = {},
): ResultatDeNormalisation {
  const propositions = new Map<number, PropositionDeNom>();
  const nonRenommables = new Set(options.nonRenommables);
  noms.forEach((nom, rang) => {
    if (nonRenommables.has(nom.id)) return;
    const proposition = proposer(nom, conventions, options.termesUcm === true);
    if (proposition) propositions.set(rang, proposition);
  });
  const collisions = new Map<string, CollisionDeNoms>();
  let retrait: boolean;
  do {
    retrait = false;
    const destinations = new Map<string, number[]>();
    noms.forEach((nom, rang) => {
      const cible = propositions.get(rang)?.nouveauNom ?? nom.nom;
      const cle = JSON.stringify([nom.categorie, nom.portee, cible]);
      const groupe = destinations.get(cle) ?? [];
      groupe.push(rang);
      destinations.set(cle, groupe);
    });
    for (const [cle, rangs] of destinations) {
      if (rangs.length < 2 || !rangs.some((rang) => propositions.has(rang))) continue;
      const premier = noms[rangs[0]];
      const nom = propositions.get(rangs[0])?.nouveauNom ?? premier.nom;
      collisions.set(cle, { categorie: premier.categorie, portee: premier.portee, nom, ids: rangs.map((rang) => noms[rang].id) });
      for (const rang of rangs) retrait = propositions.delete(rang) || retrait;
    }
  } while (retrait);
  return { propositions: [...propositions.values()], collisions: [...collisions.values()] };
}

export type ConventionDetectee = {
  readonly dominante: Convention | null;
  readonly casse: Casse | null;
  readonly separateur: Separateur | null;
  readonly comptes: { readonly casse: Readonly<Record<Casse, number>>; readonly separateur: Readonly<Record<Separateur, number>> };
  readonly total: number;
};

/** Compte un vote par nom et par dimension non ambiguë. Les égalités suivent l'ordre des registres. */
export function detecterLesConventions(noms: readonly NomANormaliser[]): Record<CategorieDeNom, ConventionDetectee> {
  const detection = commencerDetectionDesConventions();
  const mots = new Map<string, readonly string[]>();
  for (const nom of noms) {
    for (const segment of nom.nom.split('/')) if (!mots.has(segment)) mots.set(segment, decouperSegment(segment));
    detection.ajouter(nom, mots);
  }
  return detection.resultat();
}
