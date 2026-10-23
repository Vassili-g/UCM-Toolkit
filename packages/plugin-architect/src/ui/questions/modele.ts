/**
 * Ce que l'onglet Questions montre d'une question du moteur : le titre, la ligne grise, l'effet de la réponse sur deux lignes, le bouton
 * principal et les autres candidats. Le calcul ne touche pas au DOM. Deux questions existent aujourd'hui : un token à lier à un layer
 * (`candidats` : des variables du catalogue) et un nom de valeur à choisir (C12, C13 : des noms). Le candidat que le titre cite est le
 * premier du moteur ; rien ne part avant le clic, et chaque autre candidat a son bouton.
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
}

export interface ContexteDeQuestions {
  readonly composant: string;
  readonly variants: ReadonlyArray<{ readonly id: string; readonly nom: string }>;
  readonly layers: ReadonlyMap<string, string>;
}

const texte = (valeur: string | number | undefined): string | null => (typeof valeur === 'string' && valeur !== '' ? valeur : null);

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
  return questionDeLiaison(constat, question.id, question.candidats, contexte);
}

/** Les constats qui posent une question : ceux qui n'ont pas de correction, et dont la question a un candidat. */
export const estUneQuestion = (constat: Constat): boolean => constat.question !== undefined && constat.correction === undefined && constat.question.candidats.length > 0;
