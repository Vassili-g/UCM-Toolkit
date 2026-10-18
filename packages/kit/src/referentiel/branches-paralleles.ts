/** Détecte les segments qui occupent la même place dans deux branches parallèles, ou entre un alias et sa cible. */
import type { Lexique } from './harmonisation.js';
import { memeConcept, opposes, termeConnu, termeOuVarianteConnu } from './termes-connus.js';

const TAILLE_D_UN_LOT = 200;
const SEPARATEUR = '\u0001';
const BRANCHES_MAXIMALES_PAR_CLE = 12;
const ENTREES_MAXIMALES_PAR_CLE = 200;
const NOMS_MINIMAUX_SANS_TERME_CONNU = 2;
const lettres = /\p{L}/u;
const PART_MINIMALE_DE_SOUS_CHEMINS_COMMUNS = 0.8;
const chiffresOuCran = /^\d|(^|[^\d])\d{2,3}($|[^\d])/u;

export type PaireDeBranches = { readonly mots: readonly [string, string]; readonly noms: ReadonlySet<string>; readonly nomsDuMot: readonly [ReadonlySet<string>, ReadonlySet<string>] };

type Candidate = { readonly mots: readonly [string, string]; readonly couples: Set<string>; readonly nomsDuMot: readonly [Set<string>, Set<string>] };

function ajouter(candidats: Map<string, Candidate>, a: string, ida: string, b: string, idb: string): void {
  if (a === b) return;
  const ordonne = a < b;
  const mots = ordonne ? [a, b] as const : [b, a] as const;
  const cle = mots.join(SEPARATEUR);
  const candidat = candidats.get(cle) ?? { mots, couples: new Set<string>(), nomsDuMot: [new Set<string>(), new Set<string>()] as const };
  candidat.couples.add(ida < idb ? `${ida}${SEPARATEUR}${idb}` : `${idb}${SEPARATEUR}${ida}`);
  candidat.nomsDuMot[0].add(ordonne ? ida : idb);
  candidat.nomsDuMot[1].add(ordonne ? idb : ida);
  candidats.set(cle, candidat);
}

function frereDansUneMemeBranche(a: ReadonlySet<string> | undefined, b: ReadonlySet<string> | undefined): boolean {
  if (!a || !b) return false;
  const [petit, grand] = a.size <= b.size ? [a, b] : [b, a];
  for (const parent of petit) if (grand.has(parent)) return true;
  return false;
}

/**
 * Pour chaque couple de noms de même longueur qui ne diffèrent que de deux segments, le premier segment qui diffère
 * désigne deux branches frères et le second le mot rapproché. Les deux branches doivent compter au moins deux noms
 * identiques à leur branche sœur, sinon la différence n'est qu'une coïncidence. Un alias et sa cible de même longueur
 * qui ne diffèrent que d'un segment rapprochent aussi ce segment. Deux mots qui coexistent sous un même parent sont des frères, jamais une paire de branches. Chaque mot garde son meilleur partenaire, sans ex aequo.
 */
export function* detecterBranchesParalleles(lexique: Lexique): Generator<void, readonly PaireDeBranches[]> {
  let operations = 0;
  const identiques = new Map<string, Set<string>>();
  const parents = new Map<string, Set<string>>();
  const masques = new Map<string, { branche: string; mot: string; id: string }[]>();
  for (const nom of lexique.noms.values()) {
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
    if (nom.categorie === 'collections') continue;
    const segments = nom.nom.split('/').map((segment) => segment.toLowerCase());
    for (let b = 0; b < segments.length; b++) {
      const prefixe = segments.slice(0, b).join('/');
      const base = [nom.portee, segments.length, b, prefixe].join(SEPARATEUR);
      (parents.get(segments[b]) ?? parents.set(segments[b], new Set()).get(segments[b])!).add(`${nom.portee}${SEPARATEUR}${prefixe}`);
      const reste = segments.slice(b + 1);
      const cleIdentique = `${base}${SEPARATEUR}${reste.join('/')}`;
      (identiques.get(cleIdentique) ?? identiques.set(cleIdentique, new Set()).get(cleIdentique)!).add(segments[b]);
      for (let j = 0; j < reste.length; j++) {
        if (!lettres.test(reste[j])) continue;
        const cle = `${base}${SEPARATEUR}${j}${SEPARATEUR}${reste.map((segment, rang) => rang === j ? '*' : segment).join('/')}`;
        (masques.get(cle) ?? masques.set(cle, []).get(cle)!).push({ branche: segments[b], mot: reste[j], id: nom.id });
      }
    }
  }
  const brancheDeLaCle = (cle: string): string => cle.split(SEPARATEUR).slice(0, 4).filter((_, rang) => rang !== 1).join(SEPARATEUR);
  const tailles = new Map<string, number>();
  const nombreIdentiques = new Map<string, number>();
  for (const [cle, branches] of identiques) {
    for (const branche of branches) {
      const cleDeTaille = `${brancheDeLaCle(cle)}${SEPARATEUR}${branche}`;
      tailles.set(cleDeTaille, (tailles.get(cleDeTaille) ?? 0) + 1);
    }
    if (branches.size < 2 || branches.size > BRANCHES_MAXIMALES_PAR_CLE) continue;
    const tri = [...branches].sort();
    for (let i = 0; i < tri.length; i++) for (let j = i + 1; j < tri.length; j++) {
      const paire = `${brancheDeLaCle(cle)}${SEPARATEUR}${tri[i]}${SEPARATEUR}${tri[j]}`;
      nombreIdentiques.set(paire, (nombreIdentiques.get(paire) ?? 0) + 1);
      if (++operations % TAILLE_D_UN_LOT === 0) yield;
    }
  }
  const candidats = new Map<string, Candidate>();
  for (const [cle, entrees] of masques) {
    if (entrees.length < 2 || entrees.length > ENTREES_MAXIMALES_PAR_CLE) continue;
    for (let i = 0; i < entrees.length; i++) for (let j = i + 1; j < entrees.length; j++) {
      const x = entrees[i], y = entrees[j];
      if (x.branche === y.branche || x.mot === y.mot || frereDansUneMemeBranche(parents.get(x.mot), parents.get(y.mot))) continue;
      const [premiere, seconde] = x.branche < y.branche ? [x.branche, y.branche] : [y.branche, x.branche];
      const communs = nombreIdentiques.get(`${brancheDeLaCle(cle)}${SEPARATEUR}${premiere}${SEPARATEUR}${seconde}`) ?? 0;
      const plusGrande = Math.max(tailles.get(`${brancheDeLaCle(cle)}${SEPARATEUR}${premiere}`) ?? 0, tailles.get(`${brancheDeLaCle(cle)}${SEPARATEUR}${seconde}`) ?? 0);
      if (communs < NOMS_MINIMAUX_SANS_TERME_CONNU || communs < plusGrande * PART_MINIMALE_DE_SOUS_CHEMINS_COMMUNS) continue;
      ajouter(candidats, x.mot, x.id, y.mot, y.id);
      if (++operations % TAILLE_D_UN_LOT === 0) yield;
    }
  }
  for (const nom of lexique.noms.values()) {
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
    const cible = nom.cibleAlias ? lexique.noms.get(nom.cibleAlias) : undefined;
    if (!cible || nom.categorie === 'collections') continue;
    const segments = nom.nom.split('/').map((segment) => segment.toLowerCase());
    const autres = cible.nom.split('/').map((segment) => segment.toLowerCase());
    if (segments.length !== autres.length) continue;
    const ecarts = segments.flatMap((segment, rang) => segment === autres[rang] ? [] : [rang]);
    if (ecarts.length === 1 && lettres.test(segments[ecarts[0]]) && lettres.test(autres[ecarts[0]])) {
      ajouter(candidats, segments[ecarts[0]], nom.id, autres[ecarts[0]], cible.id);
    }
  }
  const meilleurs = new Map<string, { partenaire: string; nombre: number; egalite: boolean }>();
  for (const candidat of candidats.values()) {
    const nombre = candidat.couples.size;
    for (const [mot, autre] of [[candidat.mots[0], candidat.mots[1]], [candidat.mots[1], candidat.mots[0]]] as const) {
      const actuel = meilleurs.get(mot);
      if (!actuel || nombre > actuel.nombre) meilleurs.set(mot, { partenaire: autre, nombre, egalite: false });
      else if (nombre === actuel.nombre) actuel.egalite = true;
    }
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }
  const resultat: PaireDeBranches[] = [];
  for (const candidat of candidats.values()) {
    const [a, b] = candidat.mots;
    const meilleurA = meilleurs.get(a)!, meilleurB = meilleurs.get(b)!;
    if (meilleurA.egalite || meilleurB.egalite || meilleurA.partenaire !== b || meilleurB.partenaire !== a) continue;
    if (chiffresOuCran.test(a) || chiffresOuCran.test(b)) continue;
    if (opposes(a, b)) continue;
    if (termeConnu(a) !== termeConnu(b) && !memeConcept(a, b)) continue;
    if (termeConnu(a) && termeConnu(b) && !memeConcept(a, b)) continue;
    const connu = [a, b].some((mot) => mot.split('-').some(termeOuVarianteConnu));
    if (candidat.couples.size < NOMS_MINIMAUX_SANS_TERME_CONNU && !connu) continue;
    resultat.push({ mots: candidat.mots, noms: new Set([...candidat.nomsDuMot[0], ...candidat.nomsDuMot[1]]), nomsDuMot: candidat.nomsDuMot });
  }
  return resultat;
}
