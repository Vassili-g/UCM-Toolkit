/**
 * Le domaine `questions` : la réponse du designer à une question du moteur, et la
 * correction qu'elle tire.
 *
 * `repondre` choisit un candidat de la question (par sa clé, sinon par son nom
 * quand le candidat n'a pas de clé). Le sandbox en fait une correction exacte,
 * de la forme de celles du kit (`avant` et `aRelire.avant` : le nom de la
 * variable encore liée ; `cible` et `aRelire.axes` : relus dans le relevé de
 * l'analyse), et la retient dans l'analyse courante : `appliquer-corrections`
 * la trouve alors par l'identifiant de la question. Une réponse hors des
 * candidats, une question inconnue ou une analyse périmée rend `correction:
 * null`. `annuler-reponse` retire la correction. Rien ne s'écrit dans le
 * document ici. Une identité qui n'est pas la courante est ignorée.
 */
import type { Constat, Correction, ReleveDeComposant } from '@ucm-kit/core/controles';

import type { DemandeDeQuestions } from '../messages/questions';
import { analyseCourante, constatDeLaQuestion, fixerUneCorrection, releveDeLAnalyse } from './analyse';
import type { Traiter } from './contexte';

export const TYPES: readonly DemandeDeQuestions['type'][] = ['repondre', 'annuler-reponse'];

const chaine = (valeur: unknown): string | undefined => (typeof valeur === 'string' && valeur !== '' ? valeur : undefined);

/** La correction exacte qu'une réponse tire, ou `null` quand le relevé ne porte plus ce que le constat vise. */
function correctionDeLaReponse(constat: Constat, reponse: string, releve: ReleveDeComposant | null): Correction | null {
  const candidat = constat.question?.candidats.find((entree) => (entree.cle !== undefined ? entree.cle === reponse : entree.nom === reponse));
  if (!candidat || !releve || constat.layers.length !== 1 || constat.variants.length === 0) return null;
  const variant = releve.variants.find(({ id }) => id === constat.variants[0]);
  const layer = variant?.layers.find(({ id }) => id === constat.layers[0]);
  if (!variant || !layer) return null;
  const apres = { ...(candidat.cle === undefined ? {} : { cle: candidat.cle }), nom: candidat.nom };
  const regle = 'Le designer a choisi ce token parmi les candidats du moteur.';
  const token = chaine(constat.faits.token);
  if (token) {
    const champLiaison = chaine(constat.faits.champ);
    if (!champLiaison) return null;
    const indice = typeof constat.faits.indice === 'number' ? constat.faits.indice : undefined;
    const plageDebut = typeof constat.faits.plageDebut === 'number' ? constat.faits.plageDebut : undefined;
    const plageFin = typeof constat.faits.plageFin === 'number' ? constat.faits.plageFin : undefined;
    const liaison = layer.liaisons.find((entree) => entree.variable.nom === token && entree.champ === champLiaison
      && entree.indice === indice && entree.plage?.debut === plageDebut && entree.plage?.fin === plageFin);
    if (!liaison) return null;
    return {
      id: constat.question?.id ?? constat.id, sorte: 'liaison',
      cible: { layer: layer.id, champ: liaison.champ, ...(liaison.indice === undefined ? {} : { indice: liaison.indice }), ...(liaison.plage ? { plage: liaison.plage } : {}), variable: liaison.variable.cle },
      avant: liaison.variable.nom, apres, aRelire: { axes: variant.valeurs, regle, avant: liaison.variable.nom },
    };
  }
  const champ = chaine(constat.faits.champ);
  if (!champ) return null;
  const indice = typeof constat.faits.indice === 'number' ? constat.faits.indice : undefined;
  return {
    id: constat.question?.id ?? constat.id, sorte: 'liaison',
    cible: { layer: layer.id, champ, ...(indice === undefined ? {} : { indice }) },
    avant: null, apres, aRelire: { axes: variant.valeurs, regle, avant: null },
  };
}

export const traiter: Traiter<DemandeDeQuestions> = async (demande, contexte) => {
  const courante = analyseCourante();
  if (!courante || courante.sujet !== demande.analyse.sujet || courante.generation !== demande.analyse.generation) return;
  const constat = constatDeLaQuestion(demande.analyse, demande.question);
  const repondu = (correction: Correction | null): void => contexte.envoyer({ type: 'question-repondue', analyse: demande.analyse, question: demande.question, correction });
  if (!constat) return repondu(null);
  if (demande.type === 'annuler-reponse') {
    fixerUneCorrection(demande.analyse, demande.question, null);
    return repondu(null);
  }
  const correction = correctionDeLaReponse(constat, demande.reponse, releveDeLAnalyse(demande.analyse));
  fixerUneCorrection(demande.analyse, demande.question, correction);
  repondu(correction);
};
