/**
 * Retrouver, parmi les commentaires d'une demande de fusion, celui que le
 * rapport possède. GitHub et GitLab appliquent ici la même règle ; seul leur
 * transport diffère.
 *
 * **Un commentaire appartient au rapport s'il commence par le marqueur et si
 * son auteur est le compte du jeton.** Un humain qui cite le marqueur au milieu
 * de son texte, ou qui le recopie en tête sous son propre compte, ne voit
 * jamais son commentaire remplacé. Un commentaire système ne l'est pas non plus.
 */
import { MARQUEUR_RAPPORT, MARQUEUR_SANS_OBJET } from "./controle-repository.mjs";

/**
 * L'identifiant du commentaire à remplacer, ou `null` s'il n'en existe aucun.
 *
 * `notes` arrive dans l'ordre de création, toutes pages lues, et `compte` est
 * comparé tel quel à `auteur` : l'appelant donne les deux dans la même forme (le
 * login pour GitHub, l'identifiant numérique pour GitLab). Plusieurs
 * commentaires du rapport peuvent coexister, quand un ancien push en a créé
 * deux : le plus récent est celui qui porte le verdict à jour.
 */
export function rapportPrecedent(notes, compte) {
  let trouve = null;
  for (const note of notes) {
    if (note.systeme === true || note.auteur !== compte) continue;
    if (typeof note.corps !== "string" || !note.corps.startsWith(MARQUEUR_RAPPORT)) continue;
    trouve = note.id;
  }
  return trouve;
}

/**
 * Ce rapport ne demande aucun geste : il remplace un commentaire existant et
 * n'en crée jamais. Le marqueur compte dans les deux premières lignes, là où
 * `ucm check` l'écrit ; cité plus bas, il décrit un texte et ne le qualifie pas.
 */
export function rapportSansObjet(rapport) {
  if (typeof rapport !== "string") return false;
  return rapport.split(/\r?\n/, 2).some((ligne) => ligne.includes(MARQUEUR_SANS_OBJET));
}
