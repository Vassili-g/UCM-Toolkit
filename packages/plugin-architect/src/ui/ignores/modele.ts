/**
 * Ce que l'onglet À faire dans Figma montre d'un constat : l'intertitre de sa famille, sa phrase, son lieu et où le régler. Le calcul ne
 * touche pas au DOM. Chaque texte est une chaîne où les mots entre accents graves sont cités en code ; `morceauxDuTexte` y reconnaît
 * aussi les variants (`Severity=info, Variant=standard`) et les chemins de token (`colors/info/filled/border`).
 *
 * Les codes du kit dont les faits donnent une phrase précise ont leur phrase ici. Un constat du moteur de l'exporteur dit lui-même ce
 * qu'il y a à faire (`titre`, `action`, `calque`, `elements`) ; un autre garde une phrase générique.
 *
 * Contraste et accessibilité (C49 à C53) : le rapport garde les décimales du kit, sans arrondi ; une mesure s'écrit « 3,9:1 » et son
 * seuil « 4,5:1 ». Une recommandation (cible, anneau, texte sous 12 px) le dit dans son statut, jamais comme un manquement. Une
 * limite de lecture (fond indéterminé, dégradé, peinture superposée, mode illisible, borne des combinaisons) dit ce que le plugin n'a
 * pas pu calculer, sans verdict.
 *
 * Trois faits que le kit ne rend pas encore complètent une mesure de texte ou d'icône : `premierPlan` et `fond` (la paire mesurée,
 * deux couleurs hexadécimales, le fond déjà composé) et `rapports` (les autres modes mesurés, un texte JSON de paires
 * `[étiquette du mode, rapport]`). Sans eux la mesure s'écrit sans échantillon, et les autres modes se réduisent à leur nombre.
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

/** Une ligne de faits sous une carte ouverte : un libellé, puis un texte ou la paire mesurée (rapport, seuil, modes). */
export interface MesureDeCarte {
  readonly rapport: string;
  readonly seuil: string;
  readonly modes: string;
  /** La paire mesurée : le premier plan et son fond, quand le constat les porte. */
  readonly echantillon: { readonly premierPlan: string; readonly fond: string } | null;
}

export type FaitDeCarte =
  | { readonly libelle: string; readonly texte: string }
  | { readonly libelle: string; readonly lignes: readonly string[] }
  | { readonly libelle: string; readonly mesure: MesureDeCarte };

export interface CarteDAFaire {
  readonly constat: Constat;
  readonly section: SectionDAFaire;
  readonly phrase: string;
  /** La ligne grise sous la phrase ; vide quand le constat ne désigne aucun lieu. */
  readonly lieu: string;
  readonly statut: string | null;
  readonly faits: readonly FaitDeCarte[];
}

type Contenu = Omit<CarteDAFaire, 'constat' | 'section' | 'faits'> & { readonly faits?: readonly FaitDeCarte[] };

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

/** Les paires `Propriété=valeur` que tous ces variants partagent. */
function pairesCommunes(noms: readonly string[]): string[] {
  const listes = noms.map((nom) => pairesDuNom(nom).map(([propriete, valeur]) => `${propriete}=${valeur}`));
  return listes.length === 0 ? [] : listes[0].filter((paire) => listes.every((liste) => liste.includes(paire)));
}

/** Les variants d'un constat dans une phrase : le nom d'un seul, les paires qu'ils partagent, ou leur nombre. */
export function variantsEnPhrase(noms: readonly string[]): string {
  if (noms.length === 1) return noms[0];
  const communes = pairesCommunes(noms);
  return communes.length > 0 ? communes.join(', ') : T.nVariants(noms.length);
}

/** « Tous les variants State=focus » quand ces variants sont tous ceux du jeu qui portent leurs paires communes ; sinon leur nombre. */
function lieuDesVariants(noms: readonly string[], contexte: ContexteDAFaire): string {
  const communes = pairesCommunes(noms);
  if (noms.length < 2 || communes.length === 0) return noms.length === 1 ? noms[0] : T.nVariants(noms.length);
  const portent = contexte.variants.filter((variant) => communes.every((paire) => pairesDuNom(variant.nom).some(([propriete, valeur]) => `${propriete}=${valeur}` === paire)));
  return portent.length === noms.length ? T.tousLesVariantsAvec(communes.join(', ')) : T.nVariants(noms.length);
}

function calqueDe(constat: Constat, contexte: ContexteDAFaire): string | null {
  const nomme = texte(constat.faits.calque);
  if (nomme !== null) return nomme;
  const noms = [...new Set(constat.layers.map((layer) => contexte.layers.get(layer)).filter((nom): nom is string => nom !== undefined))];
  return noms.length === 1 ? noms[0] : null;
}

/** Le lieu : les variants (sauf si la phrase les cite), le layer, puis ce que le constat désigne d'autre. */
function lieuDe(constat: Constat, contexte: ContexteDAFaire, options: { readonly variantsDansLaPhrase: boolean; readonly apres?: readonly string[]; readonly sansLayer?: boolean }): string {
  const parties: string[] = [];
  const noms = nomsDesVariants(constat, contexte);
  if (!options.variantsDansLaPhrase) parties.push(noms.length === 0 ? T.tousLesVariants : noms.length === 1 ? noms[0] : T.nVariants(noms.length));
  const calque = options.sansLayer === true ? null : calqueDe(constat, contexte);
  // Le layer racine d'un variant porte le nom du variant : le répéter n'apprend rien.
  if (calque !== null && !noms.includes(calque)) parties.push(T.layer(calque, parties.length === 0));
  parties.push(...(options.apres ?? []));
  return parties.join(', ');
}

/** Un rapport à la française, sans arrondi : « 3,9:1 ». */
const rapportEnTexte = (valeur: number): string => `${String(valeur).replace('.', ',')}:1`;

const nombre = (valeur: string | number | undefined): number | null => (typeof valeur === 'number' ? valeur : null);

/** Les modes d'une mesure, sans le nom de leur collection : « intencial en Dark » donne « Dark ». */
function modesEnPhrase(etiquette: string | null): string | null {
  if (etiquette === null) return null;
  return etiquette.split(', ').map((partie) => (partie.includes(' en ') ? partie.slice(partie.indexOf(' en ') + 4) : partie)).join(', ');
}

/** Les autres modes mesurés, une ligne chacun : « intencial en Light : 7,1:1 ». Vide quand le fait manque ou n'est pas lisible. */
function lignesDesAutresModes(valeur: string | null): string[] {
  if (valeur === null) return [];
  try {
    const paires: unknown = JSON.parse(valeur);
    if (!Array.isArray(paires)) return [];
    return paires.flatMap((paire: unknown) => (Array.isArray(paire) && typeof paire[0] === 'string' && typeof paire[1] === 'number' ? [T.modeEtRapport(paire[0], rapportEnTexte(paire[1]))] : []));
  } catch {
    return [];
  }
}

function contraste(constat: Constat, contexte: ContexteDAFaire): Contenu {
  const noms = nomsDesVariants(constat, contexte);
  const variants = variantsEnPhrase(noms);
  const { faits } = constat;
  if (constat.limite && faits.borne !== undefined) {
    return { phrase: T.combinaisonsNonMesurees(nombre(faits.combinaisonsMesurees) ?? 0, nombre(faits.combinaisonsNonMesurees) ?? 0), lieu: '', statut: null };
  }
  if (constat.limite) {
    return { phrase: T.contrasteNonMesure(texte(faits.champ) ?? 'fills', variants, texte(faits.cause) ?? ''), lieu: lieuDe(constat, contexte, { variantsDansLaPhrase: true }), statut: null };
  }
  if (faits.anneauVisible === 0) {
    return { phrase: T.sansAnneau(variants, noms.length > 1 && pairesCommunes(noms).length === 0), lieu: lieuDe(constat, contexte, { variantsDansLaPhrase: true }), statut: T.sansAnneauStatut };
  }
  const usage = texte(faits.usage) ?? 'texte';
  const rapport = nombre(faits.rapport);
  const seuil = nombre(faits.seuil);
  const mesure = rapport !== null && seuil !== null ? { rapport: rapportEnTexte(rapport), seuil: rapportEnTexte(seuil) } : null;
  const phrase = T.manqueDeContraste(usage, variants, modesEnPhrase(texte(faits.mode)));
  if (usage === 'stroke' || usage === 'anneau') {
    const calque = texte(faits.calque) ?? 'ring';
    return {
      phrase,
      lieu: lieuDe(constat, contexte, { variantsDansLaPhrase: noms.length === 1 || usage === 'anneau', sansLayer: mesure !== null, apres: mesure === null ? [] : [T.auLieuDe(mesure.rapport, mesure.seuil)] }),
      statut: usage === 'anneau' ? T.manqueDeContrasteDeLAnneauStatut(calque) : T.manqueDeContrasteDuStrokeStatut,
    };
  }
  const premierPlan = texte(faits.premierPlan);
  const fond = texte(faits.fond);
  const echantillon = premierPlan !== null && fond !== null ? { premierPlan, fond } : null;
  const detail: FaitDeCarte[] = mesure === null ? [] : [{ libelle: T.mesure, mesure: { ...mesure, modes: texte(faits.mode) ?? '', echantillon } }];
  const lignes = lignesDesAutresModes(texte(faits.rapports));
  const autres = nombre(faits.autresModes);
  if (mesure !== null && lignes.length > 0) detail.push({ libelle: T.autresModes, lignes });
  else if (mesure !== null && autres !== null && autres > 0) detail.push({ libelle: T.autresModes, texte: T.sousLeSeuil(autres) });
  return { phrase, lieu: lieuDe(constat, contexte, { variantsDansLaPhrase: noms.length === 1 }), statut: T.manqueDeContrasteStatut, faits: detail };
}

/** Ce que l'accessibilité dit d'autre qu'un rapport : le texte sous 12 px (C49), l'anneau (C51), la cible (C52) et les variants exclus (C53). */
function accessibilite(constat: Constat, contexte: ContexteDAFaire): Contenu | null {
  const { faits } = constat;
  const noms = nomsDesVariants(constat, contexte);
  const variants = variantsEnPhrase(noms);
  switch (constat.code) {
    case 'C49':
      if (faits.fontSize === undefined) return null;
      return {
        phrase: T.texteTropPetit(texte(faits.calque) ?? '', variants, nombre(faits.fontSize) ?? 0, nombre(faits.seuil) ?? 12),
        lieu: lieuDe(constat, contexte, { variantsDansLaPhrase: true }),
        statut: T.recommandation,
      };
    case 'C51':
      if (faits.strokeWeight === undefined) return null;
      return {
        phrase: T.anneauTropFin(nombre(faits.strokeWeight) ?? 0, nombre(faits.espaceRecommande) ?? 2, nombre(faits.epaisseurRecommandee) ?? 2),
        lieu: noms.length > 1 ? lieuDesVariants(noms, contexte) : lieuDe(constat, contexte, { variantsDansLaPhrase: false }),
        statut: T.recommandation,
      };
    case 'C52': {
      if (faits.largeur === undefined) return null;
      const largeur = nombre(faits.largeur) ?? 0;
      const hauteur = nombre(faits.hauteur) ?? 0;
      const seuil = nombre(faits.seuil) ?? 0;
      const lieu = lieuDe(constat, contexte, { variantsDansLaPhrase: false, sansLayer: true });
      return constat.type === 'corriger'
        ? { phrase: T.zoneTropPetite(variants, largeur, hauteur, seuil), lieu, statut: T.zoneTropPetiteStatut }
        : { phrase: T.cibleTactile(variants, Math.min(largeur, hauteur), hauteur <= largeur, seuil), lieu, statut: T.recommandation };
    }
    case 'C53':
      if (faits.variantsExclus === undefined) return null;
      return { phrase: T.variantsExclus(variants, nombre(faits.variantsExclus) ?? noms.length, pairesCommunes(noms).length > 0), lieu: T.variantsDesactives, statut: null };
    default:
      return null;
  }
}

function precise(constat: Constat, contexte: ContexteDAFaire): Contenu | null {
  const { faits } = constat;
  const noms = nomsDesVariants(constat, contexte);
  switch (constat.code) {
    case 'C20': {
      const [token, couche, cible] = [texte(faits.token) ?? '', texte(faits.couche) ?? '', texte(faits.cible)];
      const liste = (texte(faits.admises) ?? '').split(',').filter(Boolean);
      const admises = liste.length > 1 ? `${liste.slice(0, -1).join(', ')} ou ${liste[liste.length - 1]}` : liste.join('');
      const lieu = lieuDe(constat, contexte, { variantsDansLaPhrase: false });
      return cible
        ? { phrase: T.mauvaiseCible(token, cible, couche), lieu, statut: T.mauvaiseCibleStatut(admises) }
        : { phrase: T.mauvaiseCouche(token, couche), lieu, statut: T.mauvaiseCoucheStatut(admises) };
    }
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
      return accessibilite(constat, contexte) ?? contraste(constat, contexte);
    case 'C51':
    case 'C52':
    case 'C53':
      return accessibilite(constat, contexte);
    case 'C64':
      return {
        phrase: T.sansTextStyle(calqueDe(constat, contexte) ?? '', variantsEnPhrase(noms)),
        lieu: lieuDe(constat, contexte, { variantsDansLaPhrase: true, apres: texte(faits.styleAttendu) === null ? [] : [T.styleAttendu(texte(faits.styleAttendu) ?? '')] }),
        statut: T.sansTextStyleStatut,
      };
    case 'C66':
      return icone(constat, contexte);
    default:
      return liaisonOuNom(constat, contexte);
  }
}

/** C66 : l'icône d'un variant, par motif. */
function icone(constat: Constat, contexte: ContexteDAFaire): Contenu | null {
  const { faits } = constat;
  const variants = variantsEnPhrase(nomsDesVariants(constat, contexte));
  const lieu = lieuDe(constat, contexte, { variantsDansLaPhrase: true });
  const token = texte(faits.variable) ?? '';
  switch (faits.motif) {
    case 'pas-une-instance':
    case 'instance-locale':
      return { phrase: T.iconeSansLibrary(variants), lieu, statut: T.iconeSansLibraryStatut };
    case 'taille-sans-variable':
      return { phrase: T.iconeSansTaille(variants), lieu, statut: T.iconeTailleStatut };
    case 'taille-hors-icone':
      return { phrase: T.iconeTailleHorsIcon(variants, token), lieu, statut: T.iconeTailleStatut };
    case 'couleur-sans-variable':
      return { phrase: T.iconeSansCouleur(variants), lieu, statut: T.iconeCouleurStatut };
    case 'couleur-hors-premier-plan':
      return { phrase: T.iconeCouleurHorsPremierPlan(variants, token), lieu, statut: T.iconeCouleurStatut };
    default:
      return null;
  }
}

/** Le champ peint d'un constat de liaison : « texte » pour une plage, sinon le fill ou le stroke. */
const champPeint = (faits: Constat['faits']): string => (faits.plageDebut !== undefined ? 'texte' : T.proprieteDeFigma(texte(faits.champ) ?? 'fills'));

/**
 * Les constats de liaison et de nom qui restent sans proposition : une question sans candidat, ou un fait que seul Figma
 * corrige. La phrase dit le fait lu ; le statut dit le geste.
 */
function liaisonOuNom(constat: Constat, contexte: ContexteDAFaire): Contenu | null {
  const { faits } = constat;
  const surLeLayer = lieuDe(constat, contexte, { variantsDansLaPhrase: false });
  const sansLayer = lieuDe(constat, contexte, { variantsDansLaPhrase: false, sansLayer: true });
  const token = (valeur: string | number | undefined): string => sansPrefixe(texte(valeur) ?? '', contexte.composant);
  const nombreDeTokens = nombre(faits.tokens) ?? 1;
  switch (constat.code) {
    case 'C7':
      return { phrase: T.valeurSansToken(`${texte(faits.axe) ?? ''}=${texte(faits.valeur) ?? ''}`), lieu: T.sectionTokens, statut: T.valeurSansTokenStatut };
    case 'C8':
    case 'C10':
      return {
        phrase: T.formeToleree(token(faits.token), texte(faits.segment) ?? '', texte(faits.attendu) ?? '', nombreDeTokens),
        lieu: T.sectionTokens, statut: T.formeTolereeStatut(nombreDeTokens),
      };
    case 'C9':
      return {
        phrase: T.ecritureDuVariant(token(faits.token), texte(faits.segment) ?? '', texte(faits.valeur) ?? '', nombreDeTokens),
        lieu: T.sectionTokens, statut: T.ecritureDuVariantStatut,
      };
    case 'C15':
    case 'C16':
    case 'C22': {
      const axe = texte(faits.axe) ?? '';
      return {
        phrase: T.autreValeur(champPeint(faits), token(faits.token), `${axe}=${texte(faits.segment) ?? ''}`, `${axe}=${texte(faits.valeur) ?? ''}`),
        lieu: surLeLayer, statut: T.autreValeurStatut,
      };
    }
    case 'C17':
    case 'C24': {
      if (faits.modele !== undefined) return { phrase: T.sansModele(texte(faits.modele) ?? ''), lieu: surLeLayer, statut: T.sansModeleStatut };
      const attendu = texte(faits.attendu) ?? '';
      return { phrase: T.autreRole(champPeint(faits), token(faits.token), texte(faits.role) ?? '', attendu), lieu: surLeLayer, statut: T.autreRoleStatut(attendu) };
    }
    case 'C18':
      return { phrase: T.scopeAbsent(token(faits.token), TEXTES.scopeDeFigma(texte(faits.portee) ?? '')), lieu: surLeLayer, statut: T.scopeAbsentStatut };
    case 'C19':
      return { phrase: T.autreComposant(texte(faits.token) ?? ''), lieu: surLeLayer, statut: T.autreComposantStatut(texte(faits.composant) ?? contexte.composant) };
    case 'C21':
      return { phrase: T.horsDeLaMajorite(token(faits.nom), nombre(faits.autres) ?? 0, token(faits.exemple)), lieu: surLeLayer, statut: T.horsDeLaMajoriteStatut };
    case 'C25':
      return { phrase: T.peintureSansToken(champPeint(faits), calqueDe(constat, contexte) ?? ''), lieu: sansLayer, statut: T.peintureSansTokenStatut };
    case 'C29': {
      const illisible = faits.recherche === 'incomplete';
      const phrase = illisible ? T.tailleSansVariableIllisible : T.tailleSansVariable;
      return {
        phrase: phrase(T.proprieteDeFigma(texte(faits.champ) ?? ''), calqueDe(constat, contexte) ?? '', nombre(faits.valeur) ?? 0),
        lieu: sansLayer, statut: illisible ? T.tailleSansVariableIllisibleStatut : T.tailleSansVariableStatut,
      };
    }
    case 'C80':
      return {
        phrase: T.liaisonHorsDuComposant(T.proprieteDeFigma(texte(faits.champ) ?? ''), calqueDe(constat, contexte) ?? '', texte(faits.token) ?? '', texte(faits.couche) ?? ''),
        lieu: sansLayer, statut: T.liaisonHorsDuComposantStatut,
      };
    case 'C43':
      return { phrase: T.sansRegles, lieu: T.tousLesVariants, statut: T.sansReglesStatut };
    case 'C45':
      return faits.ecart === 'sans-propriete'
        ? { phrase: T.regleSansPropriete(texte(faits.regle) ?? ''), lieu: T.tousLesVariants, statut: T.regleSansProprieteStatut }
        : { phrase: T.proprieteSansRegle(texte(faits.propriete) ?? ''), lieu: T.tousLesVariants, statut: T.proprieteSansRegleStatut };
    case 'C59':
      return { phrase: T.texteSansSurface(calqueDe(constat, contexte) ?? '', token(faits.variable)), lieu: sansLayer, statut: T.texteSansSurfaceStatut };
    case 'C60':
      return { phrase: T.aliasDUnAutreMode(texte(faits.variable) ?? '', texte(faits.mode) ?? '', texte(faits.cible) ?? ''), lieu: T.sectionTokens, statut: T.aliasDUnAutreModeStatut };
    case 'C63':
      return structure(constat);
    case 'C65': {
      const propriete = T.proprieteDeFigma(texte(faits.champ) ?? '');
      const layer = calqueDe(constat, contexte) ?? '';
      return faits.motif === 'mauvaise-collection'
        ? { phrase: T.typoHorsCollection(layer, propriete, texte(faits.collection) ?? ''), lieu: sansLayer, statut: T.typoHorsCollectionStatut }
        : { phrase: T.typoSansLiaison(layer, propriete), lieu: sansLayer, statut: T.typoSansLiaisonStatut };
    }
    case 'C67':
      return { phrase: T.iconeSansProperty(texte(faits.propriete) ?? ''), lieu: surLeLayer, statut: T.iconeSansPropertyStatut };
    default:
      return null;
  }
}

/** C63 : la structure d'une variable du composant, par genre, avec les gestes du mode Tokens. */
function structure(constat: Constat): Contenu | null {
  const { faits } = constat;
  const variable = texte(faits.variable) ?? '';
  const mode = texte(faits.mode) ?? '';
  switch (faits.genre) {
    case 'alias-supprime':
      return { phrase: T.aliasSupprime(variable), lieu: T.sectionTokens, statut: TEXTES.autreCible };
    case 'library-inactive':
      return { phrase: T.libraryInactive(variable), lieu: T.sectionTokens, statut: TEXTES.activerLaLibrary(texte(faits.library) ?? '') };
    case 'sans-valeur-en-mode':
      return { phrase: T.sansValeurEnMode(variable, mode), lieu: T.sectionTokens, statut: TEXTES.donnerUneValeurEnMode(mode) };
    case 'couleur-sans-alias':
      return { phrase: T.couleurSansAlias(variable), lieu: T.sectionTokens, statut: TEXTES.lierALaCouleur };
    default:
      return null;
  }
}

/** La carte d'un constat à faire dans Figma. */
export function carteDAFaire(constat: Constat, contexte: ContexteDAFaire): CarteDAFaire {
  const section = SECTION_DE_LA_FAMILLE[constat.famille];
  const exacte = precise(constat, contexte);
  if (exacte) return { constat, section, faits: [], ...exacte };
  const { faits } = constat;
  const phrase = texte(faits.titre) ?? texte(faits.message) ?? T.sansPhrase(constat.code);
  const elements = texte(faits.elements);
  const noms = nomsDesVariants(constat, contexte);
  const nomme = noms.length > 0 && noms.every((nom) => phrase.includes(nom));
  return { constat, section, phrase, lieu: lieuDe(constat, contexte, { variantsDansLaPhrase: nomme, apres: elements === null ? [] : [elements] }), statut: texte(faits.action), faits: [] };
}

/** Les constats à faire dans Figma : ni correction, ni question à trancher. Une question sans candidat ne se répond pas : elle reste ici. */
export const estAFaire = (constat: Constat): boolean => constat.correction === undefined && (constat.question === undefined || constat.question.candidats.length === 0);

/** Les cartes de ces constats, par intertitre puis dans l'ordre des constats. */
export function cartesDAFaire(constats: readonly Constat[], contexte: ContexteDAFaire): CarteDAFaire[] {
  const cartes = constats.map((constat) => carteDAFaire(constat, contexte));
  return SECTIONS_D_A_FAIRE.flatMap((section) => cartes.filter((carte) => carte.section === section));
}
