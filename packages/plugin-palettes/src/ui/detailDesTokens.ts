/**
 * Le détail de la ligne « Tokens Figma » d'une palette reprise du fichier
 * ([UI-34]) : sa collection et son chemin d'origine, la forme de ses thèmes,
 * puis chaque écart que la mise à jour ferait. Sans DOM.
 */
import { ecartsDeLaReprise, type TokensDUnePalette } from '../variables/gestion';
import type { Localisation, Texte } from './localisation';

/**
 * La palette est à jour : le nombre de variables suit son origine. Elle est à
 * mettre à jour : les créations, les couleurs qui changent et les renommages
 * se suivent. Sans aucun des trois, le détail garde les noms occupés, puis le
 * nombre de variables à renommer.
 */
export function detailDeLaReprise(i18n: Localisation, etat: TokensDUnePalette): Texte {
  const { TEXTES_DE_LA_GESTION, couleursSurNChangent, formeDesThemes, nombreDeVariables, origineDesTokens, tokensPartiels, variablesACreer, variablesARenommer } = i18n.messages;
  const origine = i18n.composer`${origineDesTokens(etat.collection ?? TEXTES_DE_LA_GESTION.collectionIntrouvable, etat.origine ?? '')} · ${formeDesThemes(etat.themes)}`;
  if (etat.etat === 'a-jour') return i18n.composer`${origine} · ${nombreDeVariables(etat.variables)}`;
  const ecarts = ecartsDeLaReprise(etat).map((ecart): Texte => {
    switch (ecart.ecart) {
      case 'creations': return variablesACreer(ecart.nombre);
      case 'couleurs': return couleursSurNChangent(ecart.nombre, ecart.total);
      case 'renommages': return variablesARenommer(ecart.nombre);
    }
  });
  const suite: Texte = ecarts.length > 0 ? i18n.joindre(ecarts, ' · ') : etat.nomsOccupes.length > 0 ? tokensPartiels(etat.nomsOccupes).quoi : variablesARenommer(0);
  return i18n.composer`${origine} · ${suite}`;
}
