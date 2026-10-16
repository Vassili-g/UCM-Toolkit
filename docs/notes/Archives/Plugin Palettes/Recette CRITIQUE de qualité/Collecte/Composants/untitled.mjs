/**
 * Untitled UI (kit Figma Community v2.0) : badges et boutons Primary et
 * Secondary color, repris des relevés de ../Figma/ (valeurs lues dans le
 * fichier Figma par la collecte précédente, non relues ici).
 * Le kit ne porte que le thème clair dans les nœuds relevés, et aucun état de
 * survol ni d'appui des boutons : ces manques sont consignés, pas comblés.
 */
import { texte, fichier, valeur, evaluer } from './lib.mjs';

const VERSION = 'Untitled UI, kit gratuit et système de design v2.0 (Community)';
const badges = JSON.parse(texte('figmaBadges'));
const composants = JSON.parse(texte('figmaComposants'));
const palettes = JSON.parse(texte('figmaPalettes')).scales;

/** Valeur d'un style de rampe, contrôlée contre la planche Colors. */
function style(famille, pas, hexAttendu, ou) {
  const h = palettes[famille]?.[pas];
  if (!h) throw new Error(`Untitled : ${famille}/${pas} absent de la planche Colors`);
  if (hexAttendu && h.toLowerCase() !== hexAttendu.toLowerCase()) throw new Error(`Untitled : ${famille}/${pas} vaut ${h}, relevé ${hexAttendu}`);
  return valeur({ token: `${famille}/${pas}`, publie: h, id: 'figmaPalettes', pas, aussi: { composant: { fichier: fichier(ou) } } });
}

export function lignes() {
  const out = [];
  const base = { systeme: 'Untitled UI (kit Figma)', version: VERSION, theme: 'clair' };
  const familles = { info: 'Brand', danger: 'Red', warning: 'Yellow', success: 'Green' };
  const etats = { info: 'Brand', danger: 'Error', warning: 'Warning', success: 'Success' };

  for (const [ton, famille] of Object.entries(familles)) {
    const o = badges.observedStates.find((s) => s.state === etats[ton]);
    if (!o) throw new Error(`Untitled : badge ${etats[ton]} absent`);
    const f = o.background.style.match(/^(\w+)\/(\d+)$/);
    const t = o.text.style.match(/^(\w+)\/(\d+)$/);
    if (f[1] !== famille || t[1] !== famille) throw new Error('Untitled : famille de badge inattendue');
    // Le contour 200 est celui du badge intérieur blanc ; son cran se retrouve dans la rampe.
    const pasContour = Object.entries(palettes[famille]).find(([, h]) => h.toLowerCase() === o.innerBadge.border.toLowerCase())?.[0];
    if (!pasContour) throw new Error(`Untitled : contour ${o.innerBadge.border} absent de la rampe ${famille}`);
    out.push(evaluer({
      ...base, type: 'badge-discret', composant: 'Badge (groupe, Figma)', variante: `color=${etats[ton]}`, ton,
      fond: style(famille, f[2], o.background.hex, 'figmaBadges'),
      texte: style(famille, t[2], o.text.hex, 'figmaBadges'),
      contour: { ...style(famille, pasContour, o.innerBadge.border, 'figmaBadges'), epaisseur: 'contour du badge intérieur blanc (voir le relevé)' },
      notes: ['Le contour appartient au badge intérieur blanc du groupe ; le relevé donne le contraste texte/fond du badge extérieur.', `Contraste relevé dans le fichier : ${o.textContrast}.`],
    }, null));
  }

  // Boutons : Primary et Secondary color, états Default et Focused seulement
  const exemples = composants.components.buttons.examples;
  const par = (h, s) => exemples.find((e) => e.hierarchy === h && e.state === s);
  const sec = par('Secondary color', 'Default');
  const pri = par('Primary', 'Default');
  if (!sec || !pri) throw new Error('Untitled : boutons Primary et Secondary color absents');
  out.push(evaluer({
    ...base, type: 'bouton-teinte', composant: 'Button (Figma)', variante: 'Secondary color', ton: 'marque',
    fond: style('Brand', '50', sec.background, 'figmaComposants'),
    texte: style('Brand', '700', sec.text, 'figmaComposants'),
    contour: style('Brand', '50', sec.border, 'figmaComposants'),
    survol: { note: 'non relevé : le fichier relevé ne couvre que Default et Focused' },
    appui: { note: 'non relevé' },
    notes: ['Le contour a la couleur du fond (Brand/50).'],
  }, null));
  out.push(evaluer({
    ...base, type: 'bouton-plein', composant: 'Button (Figma)', variante: 'Primary', ton: 'marque',
    fond: style('Brand', '600', pri.background, 'figmaComposants'),
    texte: valeur({ token: 'White', publie: pri.text, id: 'figmaComposants', pas: 'blanc' }),
    contour: style('Brand', '600', pri.border, 'figmaComposants'),
    survol: { note: 'non relevé : le fichier relevé ne couvre que Default et Focused' },
    appui: { note: 'non relevé' },
  }, null));
  return out;
}
