/**
 * Propose des noms logiques ; le plugin conserve les identifiants techniques des propriétés Figma.
 *
 * Après une modification : relancer `npm test` et changer la version du kit ; aucune vue ni planche n'en tire de données.
 */
import { COLLECTIONS, REGISTRES_ARCHITECTURE, type Collection } from './architecture.js';
import { CATEGORIES_DE_NOM, type Casse, type Separateur, type Convention, type NomANormaliser, type ConventionsParCategorie, type CategorieDeNom } from './conventions.js';
import { REGISTRES, REGISTRE_AXES_ETAT } from './vocabulaire.js';

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

/** Reconnaît une collection après découpage des séparateurs et de la casse. */
export function collectionUcmReconnue(nom: string): Collection | undefined {
  const normalise = decouperSegment(nom).map((mot) => mot.toLowerCase()).join('-');
  return (COLLECTIONS as readonly string[]).includes(normalise) ? normalise as Collection : undefined;
}

function frontieres(segment: string): string {
  return segment.replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1\0$2').replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1\0$2');
}

const termesDecomposables = [...REGISTRES, ...REGISTRES_ARCHITECTURE].flatMap((registre) => registre.termes).map((terme) => terme.id);
const decompositions = new Map([...termesDecomposables, ...COLLECTIONS].flatMap((terme) => {
  const mots = frontieres(terme).split(/[-_\s\0]+/u);
  return mots.length > 1 ? [[mots.join('').toLowerCase(), mots] as const] : [];
}));

/** Découpe un segment, sans deviner les mots d'une forme soudée absente du registre. */
export function decouperSegment(segment: string): string[] {
  const mots = frontieres(segment).split(/[-_\s\0]+/u).filter(Boolean);
  const decomposition = mots.length === 1 ? decompositions.get(segment.toLowerCase()) : undefined;
  if (!decomposition) return mots;
  let debut = 0;
  return decomposition.map((mot) => {
    const morceau = segment.slice(debut, debut + mot.length);
    debut += mot.length;
    return morceau;
  });
}

function capitale(mot: string): string {
  return mot.replace(/^./u, (lettre) => lettre.toUpperCase());
}

function motsAvecCasse(mots: readonly string[], casse: Casse): string[] {
  if (casse === 'inchangee') return [...mots];
  return mots.map((mot, rang) => {
    const minuscule = mot.toLowerCase();
    return casse === 'PascalCase' || (casse === 'initiale' && rang === 0) || (casse === 'camelCase' && rang > 0)
      ? capitale(minuscule) : minuscule;
  });
}

function assembler(segment: string, mots: readonly string[], separateur: Separateur): string {
  if (separateur === 'inchange') {
    if (frontieres(segment).split(/[-_\s\0]+/u).filter(Boolean).length !== mots.length) return mots.join('');
    let rang = 0;
    return frontieres(segment).replace(/[^-_\s\0]+/gu, () => mots[rang++] ?? '').replace(/\0/g, '');
  }
  const jonction = { tiret: '-', 'tiret-bas': '_', espace: ' ', soude: '', camelCase: '' }[separateur];
  return mots.join(jonction);
}

function remplacerLesTermes(mots: readonly string[], categorie: CategorieDeNom): string[] {
  const registres = REGISTRES.filter((registre) => registre !== REGISTRE_AXES_ETAT || categorie === 'proprietes');
  return mots.map((mot) => {
    const terme = registres.flatMap((registre) => registre.termes).find((terme) => terme.toleres?.includes(mot.toLowerCase()));
    if (!terme) return mot;
    if (mot === mot.toUpperCase()) return terme.id.toUpperCase();
    return /^\p{Lu}/u.test(mot) ? capitale(terme.id) : terme.id;
  });
}

/** La catégorie d'un segment : celle que le nom lui assigne, sinon celle du nom. */
function categorieDuSegment(nom: NomANormaliser, rang: number): CategorieDeNom {
  return nom.categoriesDesSegments?.[rang] ?? nom.categorie;
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

function dominante<T extends string>(comptes: Record<T, number>): T | null {
  let gagnant: T | null = null;
  for (const valeur of Object.keys(comptes) as T[]) {
    if (comptes[valeur] > 0 && (gagnant === null || comptes[valeur] > comptes[gagnant])) gagnant = valeur;
  }
  return gagnant;
}

/** Compte un vote par nom et par dimension non ambiguë. Les égalités suivent l'ordre des registres. */
export function detecterLesConventions(noms: readonly NomANormaliser[]): Record<CategorieDeNom, ConventionDetectee> {
  return Object.fromEntries(CATEGORIES_DE_NOM.map((categorie) => {
    const comptes = {
      casse: { minuscules: 0, initiale: 0, camelCase: 0, PascalCase: 0, inchangee: 0 },
      separateur: { tiret: 0, 'tiret-bas': 0, soude: 0, camelCase: 0, espace: 0, inchange: 0 },
    };
    // Un nom compte dans la catégorie de chacun de ses segments, et ne vote qu'avec ceux-là.
    const selection = noms.flatMap((nom) => {
      const segments = nom.nom.split('/').filter((segment, rang) => categorieDuSegment(nom, rang) === categorie);
      return segments.length > 0 ? [segments] : [];
    });
    for (const tous of selection) {
      const segments = tous.filter((segment) => /\p{L}/u.test(segment));
      const candidatsCasse: Casse[] = ['minuscules', 'initiale', 'camelCase', 'PascalCase'];
      const compatibles = candidatsCasse.filter((casse) => segments.every((segment) => {
        const mots = decouperSegment(segment);
        return assembler(segment, motsAvecCasse(mots, casse), 'inchange') === segment;
      }));
      if (compatibles.length === 1) comptes.casse[compatibles[0]]++;
      const separateurs = new Set<Separateur>();
      for (const segment of segments) {
        if (segment.includes('-')) separateurs.add('tiret');
        if (segment.includes('_')) separateurs.add('tiret-bas');
        if (/\s/u.test(segment)) separateurs.add('espace');
        if (frontieres(segment).includes('\0')) separateurs.add('camelCase');
        if (!/[-_\s\0]/u.test(frontieres(segment)) && decouperSegment(segment).length > 1) separateurs.add('soude');
      }
      if (separateurs.size === 1) comptes.separateur[[...separateurs][0]]++;
    }
    const casse = dominante<Casse>(comptes.casse);
    const separateur = dominante<Separateur>(comptes.separateur);
    return [categorie, { dominante: casse && separateur ? { casse, separateur } : null, casse, separateur, comptes, total: selection.length }];
  })) as Record<CategorieDeNom, ConventionDetectee>;
}
