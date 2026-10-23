/**
 * Ce que l'onglet À faire dans Figma montre d'un constat : l'intertitre de sa famille, sa phrase, son lieu et où le régler. Le calcul ne
 * touche pas au DOM. Chaque texte est une chaîne où les mots entre accents graves sont cités en code ; `morceauxDuTexte` y reconnaît
 * aussi les variants (`Severity=info, Variant=standard`) et les chemins de token (`colors/info/filled/border`).
 *
 * Les codes du kit dont les faits donnent une phrase précise ont leur phrase ici. Un constat du moteur de l'exporteur dit lui-même ce
 * qu'il y a à faire (`titre`, `action`, `calque`, `elements`) ; un autre garde une phrase générique.
 */
import type { Constat } from '../../messages/commun';
import { pairesDuNom } from '../composant/variants';
import { TEXTES } from '../textes';

const T = TEXTES.aFaireDuComposant;

export type SectionDAFaire = 'tokens' | 'variants' | 'contraste' | 'typographie' | 'visibilite';

/** L'ordre des intertitres. */
export const SECTIONS_D_A_FAIRE: readonly SectionDAFaire[] = ['tokens', 'variants', 'contraste', 'typographie', 'visibilite'];

const SECTION_DE_LA_FAMILLE: Readonly<Record<Constat['famille'], SectionDAFaire>> = {
  liaisons: 'tokens', tailles: 'tokens', tokens: 'tokens', regles: 'tokens', variants: 'variants', contraste: 'contraste',
  typographie: 'typographie', visibilite: 'visibilite', export: 'visibilite',
};

/** Du texte, un mot cité, un variant écrit comme Figma le nomme ou un chemin de token. */
export type MorceauDeTexte = string | { readonly code: string } | { readonly variant: string } | { readonly chemin: string };

export interface ContexteDAFaire {
  readonly composant: string;
  readonly variants: ReadonlyArray<{ readonly id: string; readonly nom: string }>;
  /** Le nom d'un layer par son identifiant. */
  readonly layers: ReadonlyMap<string, string>;
}

export interface CarteDAFaire {
  readonly constat: Constat;
  readonly section: SectionDAFaire;
  readonly phrase: string;
  readonly lieu: string;
  readonly statut: string | null;
}

type Contenu = Omit<CarteDAFaire, 'constat' | 'section'>;

const PAIRES = '[A-Z][A-Za-z0-9]*=[\\w-]+';
const MOTIF = new RegExp(`(${PAIRES}(?:, ${PAIRES})*)|((?<![\\w=])[a-z0-9-]+(?:/[a-z0-9,.{}-]+)+)`, 'g');

/** Découpe un texte : les accents graves citent un mot, puis les variants et les chemins se reconnaissent dans le reste. */
export function morceauxDuTexte(texte: string): MorceauDeTexte[] {
  const morceaux: MorceauDeTexte[] = [];
  texte.split('`').forEach((partie, rang) => {
    if (rang % 2 === 1) {
      morceaux.push({ code: partie });
      return;
    }
    let curseur = 0;
    for (const trouve of partie.matchAll(MOTIF)) {
      const debut = trouve.index ?? 0;
      if (debut > curseur) morceaux.push(partie.slice(curseur, debut));
      morceaux.push(trouve[1] === undefined ? { chemin: trouve[0] } : { variant: trouve[0] });
      curseur = debut + trouve[0].length;
    }
    if (curseur < partie.length) morceaux.push(partie.slice(curseur));
  });
  return morceaux.filter((morceau) => morceau !== '');
}

const texte = (valeur: string | number | undefined): string | null => (typeof valeur === 'string' && valeur !== '' ? valeur : typeof valeur === 'number' ? String(valeur) : null);

function sansPrefixe(nom: string, composant: string): string {
  const prefixe = `${composant.toLowerCase()}/`;
  return nom.toLowerCase().startsWith(prefixe) ? nom.slice(prefixe.length) : nom;
}

function nomsDesVariants(constat: Constat, contexte: ContexteDAFaire): string[] {
  return constat.variants.map((variant) => contexte.variants.find((candidat) => candidat.id === variant)?.nom ?? variant);
}

/** Les variants d'un constat dans une phrase : le nom d'un seul, les paires qu'ils partagent, ou leur nombre. */
function variantsEnPhrase(noms: readonly string[]): string {
  if (noms.length === 1) return noms[0];
  const listes = noms.map((nom) => pairesDuNom(nom).map(([propriete, valeur]) => `${propriete}=${valeur}`));
  const communes = listes.length === 0 ? [] : listes[0].filter((paire) => listes.every((liste) => liste.includes(paire)));
  return communes.length > 0 ? communes.join(', ') : T.nVariants(noms.length);
}

function calqueDe(constat: Constat, contexte: ContexteDAFaire): string | null {
  const nomme = texte(constat.faits.calque);
  if (nomme !== null) return nomme;
  const noms = [...new Set(constat.layers.map((layer) => contexte.layers.get(layer)).filter((nom): nom is string => nom !== undefined))];
  return noms.length === 1 ? noms[0] : null;
}

/** Le lieu : les variants (sauf si la phrase les cite), le layer, puis ce que le constat désigne d'autre. */
function lieuDe(constat: Constat, contexte: ContexteDAFaire, options: { readonly variantsDansLaPhrase: boolean; readonly apres?: readonly string[] }): string {
  const parties: string[] = [];
  if (!options.variantsDansLaPhrase) {
    const noms = nomsDesVariants(constat, contexte);
    parties.push(noms.length === 0 ? T.tousLesVariants : noms.length === 1 ? noms[0] : T.nVariants(noms.length));
  }
  const calque = calqueDe(constat, contexte);
  if (calque !== null) parties.push(T.layer(calque, parties.length === 0));
  parties.push(...(options.apres ?? []));
  return parties.join(', ');
}

function contraste(constat: Constat, contexte: ContexteDAFaire): Contenu {
  const noms = nomsDesVariants(constat, contexte);
  const variants = variantsEnPhrase(noms);
  if (constat.limite) {
    return { phrase: T.contrasteNonMesure(texte(constat.faits.champ) ?? 'fills', variants, texte(constat.faits.cause) ?? ''), lieu: lieuDe(constat, contexte, { variantsDansLaPhrase: true }), statut: null };
  }
  const usage = texte(constat.faits.usage) ?? 'texte';
  return {
    phrase: T.manqueDeContraste(usage, variants, texte(constat.faits.mode)),
    lieu: lieuDe(constat, contexte, { variantsDansLaPhrase: noms.length === 1 }),
    statut: usage === 'stroke' ? T.manqueDeContrasteDuStrokeStatut : T.manqueDeContrasteStatut,
  };
}

function precise(constat: Constat, contexte: ContexteDAFaire): Contenu | null {
  const { faits } = constat;
  const noms = nomsDesVariants(constat, contexte);
  switch (constat.code) {
    case 'C20':
      return { phrase: T.mauvaiseCouche(texte(faits.token) ?? '', texte(faits.couche) ?? ''), lieu: lieuDe(constat, contexte, { variantsDansLaPhrase: false }), statut: T.mauvaiseCoucheStatut };
    case 'C31':
      return { phrase: T.variantAbsent(Object.entries(faits).map(([propriete, valeur]) => `${propriete}=${valeur}`).join(', ')), lieu: T.sectionVariants, statut: T.variantAbsentStatut };
    case 'C32': {
      const token = sansPrefixe(texte(faits.token) ?? '', contexte.composant);
      return faits.motif === 'sans-variant'
        ? { phrase: T.tokenSansVariant(token), lieu: T.sectionTokens, statut: T.tokenSansVariantStatut }
        : { phrase: T.tokenInutilise(token), lieu: T.sectionTokens, statut: T.tokenInutiliseStatut };
    }
    case 'C33':
      return { phrase: T.variantSansToken(texte(faits.variant) ?? variantsEnPhrase(noms), texte(faits.famille) ?? ''), lieu: T.sectionTokens, statut: T.variantSansTokenStatut };
    case 'C49':
    case 'C50':
      return contraste(constat, contexte);
    case 'C64':
      return {
        phrase: T.sansTextStyle(calqueDe(constat, contexte) ?? '', variantsEnPhrase(noms)),
        lieu: lieuDe(constat, contexte, { variantsDansLaPhrase: true, apres: texte(faits.styleAttendu) === null ? [] : [T.styleAttendu(texte(faits.styleAttendu) ?? '')] }),
        statut: T.sansTextStyleStatut,
      };
    case 'C66':
      return faits.motif === 'pas-une-instance' || faits.motif === 'instance-locale'
        ? { phrase: T.iconeSansLibrary(variantsEnPhrase(noms)), lieu: lieuDe(constat, contexte, { variantsDansLaPhrase: true }), statut: T.iconeSansLibraryStatut }
        : null;
    default:
      return null;
  }
}

/** La carte d'un constat à faire dans Figma. */
export function carteDAFaire(constat: Constat, contexte: ContexteDAFaire): CarteDAFaire {
  const section = SECTION_DE_LA_FAMILLE[constat.famille];
  const exacte = precise(constat, contexte);
  if (exacte) return { constat, section, ...exacte };
  const { faits } = constat;
  const phrase = texte(faits.titre) ?? texte(faits.message) ?? T.sansPhrase(constat.code);
  const elements = texte(faits.elements);
  const noms = nomsDesVariants(constat, contexte);
  const nomme = noms.length > 0 && noms.every((nom) => phrase.includes(nom));
  return { constat, section, phrase, lieu: lieuDe(constat, contexte, { variantsDansLaPhrase: nomme, apres: elements === null ? [] : [elements] }), statut: texte(faits.action) };
}

/** Les constats à faire dans Figma : ceux qui n'ont ni correction ni question. */
export const estAFaire = (constat: Constat): boolean => constat.correction === undefined && constat.question === undefined;

/** Les cartes de ces constats, par intertitre puis dans l'ordre des constats. */
export function cartesDAFaire(constats: readonly Constat[], contexte: ContexteDAFaire): CarteDAFaire[] {
  const cartes = constats.map((constat) => carteDAFaire(constat, contexte));
  return SECTIONS_D_A_FAIRE.flatMap((section) => cartes.filter((carte) => carte.section === section));
}
