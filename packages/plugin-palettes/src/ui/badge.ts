/**
 * Le badge d'un niveau WCAG ([VER-13]) : « AAA », « AA » ou « AA ✗ », à côté
 * du contraste qu'il juge. Il se lit dans `niveauxWcag`, aux seuils fixes du
 * WCAG ; l'assistance technique lit ce qu'il juge et son résultat,
 * « Texte courant : AA atteint, AAA non atteint ».
 */
import { memoriserVues, type Localisation } from './localisation';
import { type Jugement } from './textes';

function construireVues(i18n: Localisation) {
  const { niveauEcrit } = i18n.messages;

  function badgeDeNiveau(valeur: number, jugement: Jugement): HTMLSpanElement {
    const niveau = niveauEcrit(valeur, jugement);
    const badge = document.createElement('span');
    badge.className = 'badge-de-niveau';
    badge.dataset.atteint = String(niveau.atteint);
    i18n.lier(badge, 'textContent', niveau.ecrit);
    badge.setAttribute('role', 'img');
    i18n.lier(badge, 'aria-label', niveau.etiquette);
    i18n.lier(badge, 'title', niveau.etiquette);
    return badge;
  }
  return { badgeDeNiveau };
}

export const creerVuesBadge = memoriserVues(construireVues);
