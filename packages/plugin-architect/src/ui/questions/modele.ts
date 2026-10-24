/**
 * Ce que l'onglet Questions montre d'une question du moteur : le titre, la ligne grise, l'effet de la réponse sur deux lignes, le bouton
 * principal et les autres candidats. Le calcul ne touche pas au DOM. Deux questions existent aujourd'hui : un token à lier à un layer
 * (`candidats` : des variables du catalogue) et un nom de valeur à choisir (C12, C13 : des noms). Le candidat que le titre cite est le
 * premier du moteur ; rien ne part avant le clic, et chaque autre candidat a son bouton.
 *
 * Une valeur de longueur sans token exact (C29 proche) a sa forme : le titre dit la valeur lue sans citer de candidat, chaque candidat a un
 * bouton de même poids qui dit l'écart, et les questions identiques de plusieurs variants se montrent en un groupe.
 *
 * Une liaison d'état (C16, un layer de State=hover lié au token du repos) a sa forme : le titre cite l'état et le token d'état, l'effet
 * met en couleur le segment qui change, et l'indice du moteur (ce que font les autres variants du même état) suit la ligne grise.
 */
import type { Constat, Correction } from '../../messages/commun';
import { variantsEnPhrase } from '../ignores/modele';
import { TEXTES } from '../textes';

const T = TEXTES.questionsDuComposant;

/** Un titre : du texte, le layer en olive, un chemin dont un terme est vu, un terme qui part ou un terme qui reste. */
export type MorceauDeTitre = string | { readonly olive: string } | { readonly variant: string } | { readonly chemin: string; readonly vus: readonly string[] } | { readonly retire: string } | { readonly retenu: string };

/** Un nom sur une ligne de l'effet : du texte, avec ce qui part ou ce qui arrive. */
export type MorceauDEffet = string | { readonly ancien: string } | { readonly nouveau: string };

export interface ReponseProposee {
  readonly libelle: string;
  /** Ce que `repondre` envoie : la clé du candidat, sinon son nom. */
  readonly reponse: string;
  /** Le nom du token que le bouton adopte, écrit à côté du bouton d'un token proche. */
  readonly token?: string;
}

export interface CarteDeQuestion {
  /** L'identifiant de la question, que `repondre` et `annuler-reponse` portent. */
  readonly id: string;
  readonly constat: Constat;
  readonly titre: readonly MorceauDeTitre[];
  /** Le titre en texte, pour le nom accessible des boutons. */
  readonly titreEnTexte: string;
  readonly origine: string | null;
  readonly meta: string;
  /** Ce que le moteur a compté chez les autres variants ; posé en texte simple après la ligne grise. */
  readonly indice: string | null;
  readonly ancien: readonly MorceauDEffet[];
  readonly nouveau: readonly MorceauDEffet[];
  readonly principal: ReponseProposee;
  readonly autres: readonly ReponseProposee[];
  /** La ligne que la réponse tire : « title sera lié à colors/info/standard/title. » */
  readonly reponseEnTexte: (correction: Correction) => string;
  /** Un token proche : aucun bouton n'est mis en avant, et la carte n'a pas de ligne d'effet. */
  readonly proche: boolean;
  /** Ce que deux cartes partagent pour se montrer en une seule ; `null` quand la carte reste seule. */
  readonly groupe: string | null;
}

export interface ContexteDeQuestions {
  readonly composant: string;
  readonly variants: ReadonlyArray<{ readonly id: string; readonly nom: string }>;
  readonly layers: ReadonlyMap<string, string>;
}

const texte = (valeur: string | number | undefined): string | null => (typeof valeur === 'string' && valeur !== '' ? valeur : null);
const nombre = (valeur: string | number | undefined): number | null => (typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : null);

/** La famille de layout dont C29 cherche un token, d'après le champ lu : la règle du kit (`familleLayoutCompatible`). */
function familleDeLayout(champ: string): string {
  if (/radius/i.test(champ)) return 'radius';
  if (/^(strokeWeight|borderWidth)$/i.test(champ)) return 'stroke';
  return 'sizing';
}

function sansPrefixe(nom: string, composant: string): string {
  const prefixe = `${composant.toLowerCase()}/`;
  return nom.toLowerCase().startsWith(prefixe) ? nom.slice(prefixe.length) : nom;
}

const reponseDe = (candidat: { readonly cle?: string; readonly nom: string }): string => candidat.cle ?? candidat.nom;

/** Un nom de token : les segments du nom du layer prennent la couleur d'un ajout. */
function effetDuChemin(nom: string, layer: string): MorceauDEffet[] {
  const morceaux: MorceauDEffet[] = [];
  let reste = '';
  nom.split('/').forEach((segment, rang) => {
    const devant = rang > 0 ? '/' : '';
    if (segment.toLowerCase() !== layer.toLowerCase()) {
      reste += `${devant}${segment}`;
      return;
    }
    if (`${reste}${devant}` !== '') morceaux.push(`${reste}${devant}`);
    reste = '';
    morceaux.push({ nouveau: segment });
  });
  if (reste !== '') morceaux.push(reste);
  return morceaux;
}

/** Un nom de token où le segment `segment` prend la couleur d'un départ ou d'une arrivée. */
function effetDuSegment(nom: string, segment: string, arrivee: boolean): MorceauDEffet[] {
  const segments = nom.split('/');
  const rang = segments.findIndex((candidat) => candidat.toLowerCase() === segment.toLowerCase());
  if (rang < 0) return [nom];
  const avant = segments.slice(0, rang).map((candidat) => `${candidat}/`).join('');
  const apres = segments.slice(rang + 1).map((candidat) => `/${candidat}`).join('');
  return [...(avant === '' ? [] : [avant]), arrivee ? { nouveau: segments[rang] } : { ancien: segments[rang] }, ...(apres === '' ? [] : [apres])];
}

function questionDEtat(constat: Constat, id: string, candidats: readonly { readonly cle?: string; readonly nom: string }[], indice: string, contexte: ContexteDeQuestions): CarteDeQuestion | null {
  const axe = texte(constat.faits.axe);
  const etat = texte(constat.faits.valeur);
  const actuel = texte(constat.faits.token);
  const segment = texte(constat.faits.segment);
  if (candidats.length === 0 || axe === null || etat === null || actuel === null || segment === null) return null;
  const premier = candidats[0];
  const layer = contexte.layers.get(constat.layers[0] ?? '') ?? 'layer';
  const champ = constat.faits.plageDebut !== undefined ? T.texte : constat.faits.champ === 'strokes' ? T.stroke : T.fill;
  const noms = constat.variants.map((variant) => contexte.variants.find((candidat) => candidat.id === variant)?.nom ?? variant);
  const lieu = noms.length === 0 ? '' : `${variantsEnPhrase(noms)}, `;
  const variant = `${axe}=${etat}`;
  return {
    id, constat, origine: null,
    titre: [T.lierLe(champ), { variant }, T.a, { chemin: premier.nom, vus: [etat] }, T.finDeLaQuestion],
    titreEnTexte: `${T.lierLe(champ)}${variant}${T.a}${premier.nom}${T.finDeLaQuestion}`,
    meta: `${lieu}${T.layerSuivi(layer)}${T.lieAuRepos}`,
    indice,
    ancien: effetDuSegment(actuel, segment, false),
    nouveau: effetDuSegment(premier.nom, etat, true),
    principal: { libelle: T.lierAuTokenDEtat(etat), reponse: reponseDe(premier) },
    autres: candidats.slice(1).map((candidat) => ({ libelle: T.lierA(sansPrefixe(candidat.nom, contexte.composant).split('/').slice(-1)[0]), reponse: reponseDe(candidat) })),
    reponseEnTexte: (correction) => T.seraLie(layer, correction.apres.nom),
    proche: false, groupe: null,
  };
}

function questionDeNom(constat: Constat, id: string, candidats: readonly { readonly cle?: string; readonly nom: string }[]): CarteDeQuestion | null {
  const propriete = texte(constat.faits.propriete);
  const avant = texte(constat.faits.avant);
  if (propriete === null || avant === null || candidats.length === 0) return null;
  const premier = candidats[0];
  const variants = constat.variants.length;
  return {
    id, constat, origine: propriete, indice: null,
    titre: [T.renommer, { retire: avant }, T.en, { retenu: premier.nom }, T.finDeLaQuestion],
    titreEnTexte: `${T.renommer}${avant}${T.en}${premier.nom}${T.finDeLaQuestion}`,
    meta: `${T.lesTokensEmploient(premier.nom)}${T.nVariants(variants)}${T.codeADevoirModifier}`,
    ancien: [`${propriete}=`, { ancien: avant }],
    nouveau: [`${propriete}=`, { nouveau: premier.nom }],
    principal: { libelle: T.boutonRenommer, reponse: reponseDe(premier) },
    autres: candidats.slice(1).map((candidat) => ({ libelle: T.renommerEn(candidat.nom), reponse: reponseDe(candidat) })),
    reponseEnTexte: (correction) => T.seraRenomme(correction.avant ?? avant, correction.apres.nom),
    proche: false, groupe: null,
  };
}

function questionDeLiaison(constat: Constat, id: string, candidats: readonly { readonly cle?: string; readonly nom: string }[], contexte: ContexteDeQuestions): CarteDeQuestion | null {
  if (candidats.length === 0) return null;
  const layer = (constat.layers.length === 1 ? texte(constat.faits.calque) : null) ?? contexte.layers.get(constat.layers[0] ?? '') ?? texte(constat.faits.calque) ?? 'layer';
  const premier = candidats[0];
  const nom = sansPrefixe(premier.nom, contexte.composant);
  const noms = constat.variants.map((variant) => contexte.variants.find((candidat) => candidat.id === variant)?.nom ?? variant);
  const variants = noms.length === 1 ? noms[0] : noms.length === 0 ? '' : TEXTES.aFaireDuComposant.nVariants(noms.length);
  const lie = texte(constat.faits.token) ?? (constat.code === 'C59' ? texte(constat.faits.variable) : null);
  const autres = candidats.slice(1);
  const suite = autres.length === 0 ? '' : `${autres.map((candidat) => sansPrefixe(candidat.nom, contexte.composant)).join(', ')}${T.convientAussi(autres.length)}`;
  const lieu = lie === null ? T.sansVariable(layer) : T.liePar(layer, sansPrefixe(lie, contexte.composant));
  return {
    id, constat, origine: null, indice: null,
    titre: [T.lier, { olive: layer }, T.a, { chemin: nom, vus: [layer] }, T.finDeLaQuestion],
    titreEnTexte: `${T.lier}${layer}${T.a}${nom}${T.finDeLaQuestion}`,
    meta: `${variants === '' ? `${lieu.charAt(0).toUpperCase()}${lieu.slice(1)}` : `${variants}, ${lieu}`}${suite}`,
    ancien: [lie !== null ? sansPrefixe(lie, contexte.composant) : `${layer}, ${TEXTES.correctionsDuComposant.enDur(texte(constat.faits.champ) ?? 'fills')}`],
    nouveau: effetDuChemin(nom, layer),
    principal: { libelle: T.boutonLier, reponse: reponseDe(premier) },
    autres: autres.map((candidat) => ({ libelle: T.lierA(sansPrefixe(candidat.nom, contexte.composant).split('/').slice(-1)[0]), reponse: reponseDe(candidat) })),
    reponseEnTexte: (correction) => T.seraLie(layer, sansPrefixe(correction.apres.nom, contexte.composant)),
    proche: false, groupe: null,
  };
}

type CandidatDeQuestion = { readonly cle?: string; readonly nom: string; readonly valeur?: number };

/**
 * C29 sans token exact : l'écart que chaque candidat apporte, jamais choisi d'avance. Le titre ne cite aucun candidat, et chaque bouton
 * dit la valeur adoptée. Deux cartes qui ont même layer, même champ, même valeur et mêmes candidats partagent un groupe.
 */
function questionProche(constat: Constat, id: string, candidats: readonly CandidatDeQuestion[], contexte: ContexteDeQuestions): CarteDeQuestion | null {
  const champ = texte(constat.faits.champ);
  const valeur = nombre(constat.faits.valeur);
  const cibles = candidats.map((candidat) => nombre(candidat.valeur));
  if (candidats.length === 0 || champ === null || valeur === null || cibles.some((cible) => cible === null)) return null;
  const layer = (constat.layers.length === 1 ? texte(constat.faits.calque) : null) ?? contexte.layers.get(constat.layers[0] ?? '') ?? texte(constat.faits.calque) ?? 'layer';
  const propriete = TEXTES.aFaireDuComposant.proprieteDeFigma(champ);
  const famille = familleDeLayout(champ);
  const propositions: ReponseProposee[] = candidats.map((candidat, rang) => {
    const cible = cibles[rang] as number;
    return {
      libelle: T.adopter(cible, cible > valeur ? '+' : '−', Number(Math.abs(cible - valeur).toFixed(2))),
      reponse: reponseDe(candidat), token: sansPrefixe(candidat.nom, contexte.composant),
    };
  });
  return {
    id, constat, origine: null, indice: null,
    titre: [T.leDeLayer(propriete), { olive: layer }, T.vautSansToken(valeur, famille)],
    titreEnTexte: `${T.leDeLayer(propriete)}${layer}${T.vautSansToken(valeur, famille)}`,
    meta: T.lierChangeLeRendu,
    ancien: [], nouveau: [],
    principal: propositions[0], autres: propositions.slice(1),
    reponseEnTexte: (correction) => {
      const rang = candidats.findIndex((candidat) => (candidat.cle !== undefined ? candidat.cle === correction.apres.cle : candidat.nom === correction.apres.nom));
      const token = sansPrefixe(correction.apres.nom, contexte.composant);
      return rang < 0 ? T.seraLie(layer, token) : T.valeurChange(layer, token, valeur, cibles[rang] as number);
    },
    proche: true,
    groupe: JSON.stringify([layer, champ, valeur, candidats.map((candidat) => [reponseDe(candidat), candidat.valeur])]),
  };
}

/** La carte d'une question du moteur, ou `null` quand elle n'a pas de candidat à proposer. */
export function carteDeQuestion(constat: Constat, contexte: ContexteDeQuestions): CarteDeQuestion | null {
  const { question } = constat;
  if (!question) return null;
  if (constat.code === 'C12' || constat.code === 'C13') return questionDeNom(constat, question.id, question.candidats);
  if (constat.code === 'C16' && question.indice !== undefined) {
    const etat = questionDEtat(constat, question.id, question.candidats, question.indice, contexte);
    if (etat) return etat;
  }
  if (constat.code === 'C29' && constat.faits.proche === 1) {
    const proche = questionProche(constat, question.id, question.candidats, contexte);
    if (proche) return proche;
  }
  return questionDeLiaison(constat, question.id, question.candidats, contexte);
}

/** Des cartes que la liste montre en une : une par variant dans le kit, une seule à l'écran. */
export interface GroupeDeQuestions {
  /** La carte qui se montre : la première du groupe. */
  readonly carte: CarteDeQuestion;
  /** Toutes les cartes du groupe, dont la première. */
  readonly cartes: readonly CarteDeQuestion[];
}

/**
 * Regroupe les cartes qui portent le même `groupe`. Une carte répondue ne se mêle qu'aux cartes qui ont reçu le même token.
 * Le groupe garde l'ordre de sa première carte. Aucune correction ne se calcule ici.
 */
export function regrouperLesCartes(cartes: readonly CarteDeQuestion[], repondues: Readonly<Record<string, Correction>>): GroupeDeQuestions[] {
  const groupes = new Map<string, CarteDeQuestion[]>();
  for (const carte of cartes) {
    const reponse = repondues[carte.id];
    const cle = carte.groupe === null ? `seule:${carte.id}` : `${carte.groupe}|${reponse === undefined ? 'a-trancher' : `repondue:${reponse.apres.cle ?? reponse.apres.nom}`}`;
    groupes.set(cle, [...(groupes.get(cle) ?? []), carte]);
  }
  return [...groupes.values()].map((liste) => ({ carte: liste[0], cartes: liste }));
}

/** Ce que `repondre` envoie quand le designer répond au groupe : une demande par question. */
export const reponsesDuGroupe = (groupe: GroupeDeQuestions, reponse: string): ReadonlyArray<{ readonly question: string; readonly reponse: string }> =>
  groupe.cartes.map((carte) => ({ question: carte.id, reponse }));

/** Les constats qui posent une question : ceux qui n'ont pas de correction, et dont la question a un candidat. */
export const estUneQuestion = (constat: Constat): boolean => constat.question !== undefined && constat.correction === undefined && constat.question.candidats.length > 0;
