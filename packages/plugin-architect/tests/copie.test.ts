/** Les formats de copie, exacts pour zéro, faux, la chaîne vide et l'alpha. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { ecrireHexa, p3VersRgb8 } from 'ucm-couleur';

import { copier, texteDeChaine } from '../src/copie';
import { versSrgb } from '../src/espace';
import { indexer } from '../src/indexation';
import { hexaDeCouleur, texteDeValeur, type Releve } from '../src/modele';
import { resoudre } from '../src/resolution';
import { constructeur, projetLibre } from './fixtures';

const index = indexer(projetLibre());
const copie = (variable: string, format: Parameters<typeof copier>[3], contexte = {}) => copier(index, variable, resoudre(index, variable, contexte), format);

test('zéro, faux et la chaîne vide se copient tels quels, sans unité', () => {
  assert.equal(copie('zero', 'valeur').texte, '0');
  assert.equal(copie('espace-carte', 'valeur', { mesures: 'mesures:Confort' }).texte, '24');
  assert.equal(copie('visible', 'valeur').texte, 'false');
  assert.equal(copie('libelle', 'valeur').texte, '');
});

test('une couleur se copie en composantes exactes, ou en hexadécimal qui annonce son arrondi', () => {
  assert.equal(copie('voile', 'composantes', { couleurs: 'couleurs:Jour' }).texte, 'rgba(0, 0, 0, 0.4)');
  // 0,4 × 255 vaut 102 exactement ; 0,25 × 255 vaut 63,75, arrondi à 64.
  assert.deepEqual([copie('voile', 'hexa', { couleurs: 'couleurs:Jour' }).texte, copie('voile', 'hexa', { couleurs: 'couleurs:Jour' }).arrondi], ['#00000066', false]);
  const hexa = copie('voile', 'hexa', { couleurs: 'couleurs:Nuit' });
  assert.deepEqual([hexa.texte, hexa.arrondi], ['#FFFFFF40', true]);
  assert.deepEqual(hexaDeCouleur({ r: 1, g: 0, b: 0, a: 1 }), { hexa: '#FF0000', arrondi: false });
  assert.equal(copie('carte-fond', 'hexa').arrondi, false);
});

test('une valeur non résolue ne se copie pas, mais sa chaîne se copie comme constat', () => {
  const valeur = copie('legacy', 'valeur');
  assert.deepEqual([valeur.texte, valeur.raison], [null, 'non-resolu']);
  const chaine = copier(index, 'legacy', resoudre(index, 'legacy', {}), 'chaine', { constat: 'Cible inaccessible' });
  assert.equal(chaine.texte, 'Interface / legacy/border [Valeur]\n→ Cible inaccessible');
});

test('le nom copié est le nom Figma exact, et la chaîne nomme chaque mode', () => {
  assert.equal(copie('entete-titre', 'nom').texte, 'card/header/title');
  assert.equal(texteDeChaine(index, resoudre(index, 'carte-fond', {}), null), 'Interface / card/fill [Valeur]\n→ Couleurs / surface [Nuit]\n→ Couleurs / encre [Nuit]\n→ #222630');
});

test('aucune référence publiée sans correspondance vérifiée', () => {
  assert.deepEqual([copie('carte-fond', 'reference').texte, copie('carte-fond', 'reference').raison], [null, 'sans-correspondance']);
  const verifiee = copier(index, 'carte-fond', resoudre(index, 'carte-fond', {}), 'reference', { reference: '{interface.card.fill}' });
  assert.equal(verifiee.texte, '{interface.card.fill}');
});

test('une couleur n’a pas de forme hexadécimale pour un nombre', () => {
  assert.equal(copie('zero', 'hexa').raison, 'pas-une-couleur');
});

/** Deux couleurs aux mêmes canaux, l'une opaque et l'autre à moitié transparente, dans l'espace du relevé. */
function fichierDeCouleurs(espace?: Releve['espace']) {
  const c = constructeur('Couleurs');
  c.collection('c', 'Couleurs', ['M']);
  const canaux = { r: 0.8, g: 0.3, b: 0.3 };
  c.variable('opaque', 'c', 'opaque', 'COLOR', { M: { nature: 'couleur', couleur: { ...canaux, a: 1 } } });
  c.variable('voile', 'c', 'voile', 'COLOR', { M: { nature: 'couleur', couleur: { ...canaux, a: 0.5 } } });
  return indexer(espace ? { ...c.releve(), espace } : c.releve());
}

const copieDeCouleur = (index: ReturnType<typeof indexer>, variable: string, format: 'composantes' | 'hexa', espace: 'srgb' | 'display-p3') =>
  copier(index, variable, resoudre(index, variable, {}), format, { versSrgb: (couleur) => versSrgb(couleur, espace) });

test('les mêmes canaux se copient autrement en sRGB et en Display P3', () => {
  const srgb = fichierDeCouleurs('srgb');
  const p3 = fichierDeCouleurs('display-p3');
  assert.equal(copieDeCouleur(srgb, 'opaque', 'composantes', 'srgb').texte, 'rgba(0.8, 0.3, 0.3, 1)');
  assert.equal(copieDeCouleur(p3, 'opaque', 'composantes', 'display-p3').texte, 'color(display-p3 0.8 0.3 0.3)');
  assert.equal(copieDeCouleur(p3, 'voile', 'composantes', 'display-p3').texte, 'color(display-p3 0.8 0.3 0.3 / 0.5)');
  assert.notEqual(copieDeCouleur(srgb, 'opaque', 'hexa', 'srgb').texte, copieDeCouleur(p3, 'opaque', 'hexa', 'display-p3').texte);
});

test('l’hexadécimal d’une couleur Display P3 est celui de p3VersRgb8, et annonce son arrondi', () => {
  const p3 = fichierDeCouleurs('display-p3');
  const attendu = ecrireHexa(p3VersRgb8([0.8, 0.3, 0.3]).couleur);
  const copie = copieDeCouleur(p3, 'opaque', 'hexa', 'display-p3');
  assert.equal(copie.texte, attendu);
  assert.equal(copie.arrondi, true);
  assert.equal(copieDeCouleur(p3, 'voile', 'hexa', 'display-p3').texte, `${attendu}80`);
  assert.throws(() => copier(p3, 'opaque', resoudre(p3, 'opaque', {}), 'hexa'), /versSrgb/);
});

test('le texte d’une valeur Display P3 montre son hexadécimal sRGB converti', () => {
  const valeur = { nature: 'couleur', couleur: { r: 0.8, g: 0.3, b: 0.3, a: 1 } } as const;
  const texteSelonEspace = texteDeValeur as (valeurLue: typeof valeur, espace?: 'srgb' | 'display-p3') => string;
  const attendu = ecrireHexa(p3VersRgb8([0.8, 0.3, 0.3]).couleur);
  assert.equal(texteSelonEspace(valeur, 'display-p3'), attendu);
});

test('un noir et un blanc Display P3 se convertissent sans arrondi', () => {
  assert.deepEqual(versSrgb({ r: 0, g: 0, b: 0, a: 1 }, 'display-p3').arrondi, false);
  assert.deepEqual(versSrgb({ r: 1, g: 1, b: 1, a: 1 }, 'display-p3').arrondi, false);
  assert.deepEqual(versSrgb({ r: 0.8, g: 0.3, b: 0.3, a: 1 }, 'srgb'), { couleur: { r: 0.8, g: 0.3, b: 0.3, a: 1 }, arrondi: false });
});
