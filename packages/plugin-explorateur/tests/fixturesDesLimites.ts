/**
 * Les fichiers de test des limites : un relevé et son `tokens.json` pour la
 * comparaison avec l'export, un relevé et ses couches pour le profil UCM. Les
 * tests d'interface et la galerie les emploient.
 */
import { recetteParDefaut } from 'ucm-couleur';

import type { AssociationDesCouches } from '../src/integrations/profilUcm';
import type { Releve, ValeurSource } from '../src/modele';
import { alias, constructeur, couleur, nombre } from './fixtures';

const BLEU = '#2563EB';

const canaux = (hexa: string): [number, number, number] => [1, 3, 5].map((rang) => parseInt(hexa.slice(rang, rang + 2), 16) / 255) as [number, number, number];

/** Une courbe de Figma à points de contrôle, et un préréglage nommé qui n'en porte pas. */
const courbeAPoints: ValeurSource = { nature: 'courbe', courbe: JSON.stringify({ type: 'CUSTOM_CUBIC_BEZIER', easingFunctionCubicBezier: { x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 } }) };
const courbeSansPoints: ValeurSource = { nature: 'courbe', courbe: JSON.stringify({ type: 'EASE_IN' }) };

/**
 * Une collection `Tokens` à deux modes. `egal` se compare entièrement. Chaque
 * autre variable porte, dans le mode Sombre, la valeur qui produit une limite
 * ou un écart, et son mode Clair se compare.
 */
export function releveDesLimitesDExport(): Releve {
  const c = constructeur('Export comparé');
  c.collection('tokens', 'Tokens', ['Clair', 'Sombre']);
  c.variable('bleu', 'tokens', 'bleu', 'COLOR', { Clair: couleur(BLEU), Sombre: couleur(BLEU) });
  c.variable('egal', 'tokens', 'egal', 'FLOAT', { Clair: nombre(4), Sombre: nombre(4) });
  c.variable('sans-valeur', 'tokens', 'sans-valeur', 'FLOAT', { Clair: nombre(4) });
  c.variable('opacite', 'tokens', 'opacite', 'COLOR', { Clair: alias('bleu'), Sombre: { nature: 'alias', cible: 'bleu', opacite: 0.5 } });
  c.variable('forme', 'tokens', 'forme', 'FLOAT', { Clair: nombre(16), Sombre: nombre(16) });
  c.variable('relative', 'tokens', 'relative', 'FLOAT', { Clair: nombre(16), Sombre: nombre(16) });
  c.variable('unite', 'tokens', 'unite', 'FLOAT', { Clair: nombre(16), Sombre: nombre(16) });
  c.variable('espace', 'tokens', 'espace', 'COLOR', { Clair: couleur(BLEU), Sombre: couleur(BLEU) });
  c.variable('courbe', 'tokens', 'courbe', 'EASING', { Clair: courbeAPoints, Sombre: courbeSansPoints });
  c.variable('mixte', 'tokens', 'mixte', 'FLOAT', { Clair: nombre(8), Sombre: nombre(16) });
  return c.releve();
}

/** Le `tokens.json` que l'exporteur écrirait pour `releveDesLimitesDExport`, avec pour chaque limite la valeur qui la produit. */
export function tokensDesLimitesDExport(): string {
  const bleu = { colorSpace: 'srgb', components: canaux(BLEU), alpha: 1 };
  const px = (valeur: number) => ({ value: valeur, unit: 'px' });
  const feuille = ($type: string, clair: unknown, sombre: unknown) => ({ $type, $value: clair, $extensions: { 'com.ucm.modes': { clair, sombre } } });
  return JSON.stringify({
    $extensions: { 'com.ucm.formatVersion': 2 },
    tokens: {
      bleu: feuille('color', bleu, bleu),
      egal: feuille('dimension', px(4), px(4)),
      'sans-valeur': feuille('dimension', px(4), px(4)),
      opacite: feuille('color', '{tokens.bleu}', '{tokens.bleu}'),
      forme: feuille('dimension', px(16), '1rem'),
      relative: feuille('dimension', px(16), { value: 1, unit: 'rem' }),
      unite: feuille('dimension', px(16), { value: 1, unit: 'vh' }),
      espace: feuille('color', bleu, { colorSpace: 'oklch', components: [0.5, 0.2, 250], alpha: 1 }),
      courbe: feuille('cubicBezier', [0.1, 0.2, 0.3, 0.4], [0.4, 0, 1, 1]),
      mixte: feuille('dimension', px(4), { value: 1, unit: 'rem' }),
    },
  });
}

const SOLIDE = ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR'];

/**
 * Un fichier associé au profil qui ne rend aucun écart et quatre contrôles
 * impossibles : un rôle de `theme` inconnu (`mystere`), un mode non reconnu
 * (`Jour`), une valeur absente dans ce mode (`defaut`) et un alias vers une
 * collection sans couche (`bordure`).
 */
export function releveDuProfilAvecLimites(): Releve {
  const c = constructeur('Profil contrôlé');
  c.collection('composants', 'Composants', ['Valeur']);
  c.collection('theme', 'Thème', ['Light', 'Jour']);
  c.collection('marques', 'Marques', ['Valeur']);
  c.collection('catalogue', 'Catalogue', ['Valeur']);
  c.collection('divers', 'Divers', ['Valeur']);
  c.variable('bouton', 'composants', 'button/bg', 'COLOR', { Valeur: alias('hover') });
  c.variable('bordure', 'composants', 'button/border', 'COLOR', { Valeur: alias('hors-couche') });
  c.variable('hover', 'theme', 'primary/solid/hover', 'COLOR', { Light: alias('b800'), Jour: alias('b800') }, { portees: SOLIDE });
  c.variable('defaut', 'theme', 'primary/solid/default', 'COLOR', { Light: alias('b700') }, { portees: SOLIDE });
  c.variable('mystere', 'theme', 'primary/mystere/zzz', 'COLOR', { Light: alias('b700'), Jour: alias('b700') }, { portees: [] });
  c.variable('b700', 'marques', 'primary/light/700', 'COLOR', { Valeur: alias('bleu-700') }, { portees: [] });
  c.variable('b800', 'marques', 'primary/light/800', 'COLOR', { Valeur: alias('bleu-700') }, { portees: [] });
  c.variable('bleu-700', 'catalogue', 'colors/blue/700', 'COLOR', { Valeur: couleur('#1E40AF') }, { portees: [] });
  c.variable('hors-couche', 'divers', 'accent', 'COLOR', { Valeur: couleur('#EA580C') });
  return c.releve();
}

/** Les couches que le designer associe dans `releveDuProfilAvecLimites` ; `Divers` reste sans couche. */
export function couchesDuProfilAvecLimites(): AssociationDesCouches {
  return { composants: 'components', theme: 'theme', marques: 'brands', catalogue: 'primitives' };
}

/** Le texte de la recette par défaut d'UCM Palettes, tel que le fichier le range. */
export function recetteEnTexte(): string {
  return JSON.stringify(recetteParDefaut());
}
