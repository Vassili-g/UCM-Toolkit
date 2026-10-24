/** La tuile d'un signe : la bonne taille, la teinte de sa famille, la valeur d'une couleur de token. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { FAMILLES_DE_SIGNES, REPRISES_DE_SIGNES, SIGNES } from '@ucm-kit/core/referentiel';
import { creerSigne, teinteDuSigne } from '../src/ui/Signe';

/** Un nœud réduit : de quoi lire les classes, les attributs, le style et le HTML posé, sans navigateur. */
class Noeud {
  classes = new Set<string>();
  attributs = new Map<string, string>();
  proprietes = new Map<string, string>();
  innerHTML = '';
  readonly classList = { add: (...noms: string[]) => noms.forEach((nom) => this.classes.add(nom)) };
  readonly style = { setProperty: (nom: string, valeur: string) => this.proprietes.set(nom, valeur) };
  set className(valeur: string) { this.classes = new Set(valeur.split(/\s+/).filter(Boolean)); }
  setAttribute(nom: string, valeur: string): void { this.attributs.set(nom, valeur); }
}

Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => new Noeud() } });

const noeud = (element: unknown): Noeud => element as Noeud;
const classesDe = (element: unknown): string[] => [...noeud(element).classes].sort();
/** Les signes dont la tuile porte seule la couleur : leur tracé est vide. */
const SANS_TRACE = new Set(['usage-fill', 'usage-stroke']);

test('chaque signe du kit rend une tuile avec son SVG, vide seulement pour usage-fill et usage-stroke', () => {
  for (const { id } of SIGNES) {
    const signe = noeud(creerSigne(id));
    assert.deepEqual(classesDe(signe), id === 'a-creer' ? ['signe', 'signe-absent'] : ['signe'], id);
    assert.ok(signe.innerHTML.startsWith('<svg '), id);
    const trace = signe.innerHTML.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    assert.equal(trace === '', SANS_TRACE.has(id), `${id} : tracé ${trace === '' ? 'vide' : 'présent'}`);
  }
});

test('un identifiant inconnu lève une erreur qui dit où chercher', () => {
  assert.throws(() => creerSigne('inconnu'), /SIGNES/);
});

test('la taille pose sa classe et le côté du tracé : 24 → 15, 16 → 12, 14 → 11', () => {
  assert.deepEqual(classesDe(creerSigne('padding', { taille: 24 })), ['signe', 'signe-24']);
  assert.deepEqual(classesDe(creerSigne('padding', { taille: 16 })), ['signe']);
  assert.deepEqual(classesDe(creerSigne('padding', { taille: 14 })), ['signe', 'signe-14']);
  for (const [taille, cote] of [[24, 15], [16, 12], [14, 11]] as const) {
    assert.match(noeud(creerSigne('padding', { taille })).innerHTML, new RegExp(`width="${cote}" height="${cote}"`));
  }
});

test('un signe est gris sans `informe`, et prend la teinte de sa famille avec', () => {
  assert.deepEqual(classesDe(creerSigne('padding')), ['signe']);
  for (const famille of FAMILLES_DE_SIGNES) {
    const signe = SIGNES.find((candidat) => candidat.famille === famille.id);
    assert.ok(signe, famille.id);
    const attendu = famille.teinte === null ? ['signe'] : ['signe', 'signe-informe', `signe-teinte-${famille.teinte}`];
    // a-creer porte aussi sa tuile en pointillés ; la famille d'état de token n'a pas d'autre cas ici.
    assert.deepEqual(classesDe(creerSigne(signe.id, { informe: true })).filter((classe) => classe !== 'signe-absent'), attendu.sort(), famille.id);
  }
});

test('un signe repris prend la teinte de la famille qui le montre, et refuse une famille qui ne le montre pas', () => {
  assert.equal(teinteDuSigne('prop-variant'), 'variants');
  assert.equal(teinteDuSigne('prop-variant', 'regles'), 'regles');
  assert.deepEqual(classesDe(creerSigne('prop-boolean', { informe: true, famille: 'regles' })), ['signe', 'signe-informe', 'signe-teinte-regles']);
  assert.equal(teinteDuSigne('a-creer', 'proposition'), null);
  assert.equal(teinteDuSigne('mode', 'palettes'), 'couleurs');
  for (const { famille, reprend } of REPRISES_DE_SIGNES) for (const { id } of reprend) assert.doesNotThrow(() => teinteDuSigne(id, famille));
  assert.throws(() => teinteDuSigne('padding', 'regles'), /ne montre pas/);
});

test('une valeur remplit la tuile, avec l’encre blanche par défaut et sombre pour une valeur claire', () => {
  const sombre = noeud(creerSigne('usage-fill', { valeur: '#1e3a8a' }));
  assert.deepEqual(classesDe(sombre), ['signe', 'signe-sombre', 'signe-valeur']);
  assert.equal(sombre.proprietes.get('--signe-valeur'), '#1e3a8a');
  const clair = noeud(creerSigne('usage-texte', { valeur: '#fbbf24', clair: true }));
  assert.deepEqual(classesDe(clair), ['signe', 'signe-clair', 'signe-valeur']);
  assert.equal(clair.proprietes.get('--signe-valeur'), '#fbbf24');
});

test('la valeur l’emporte sur la teinte, et usage-stroke dessine un anneau', () => {
  assert.deepEqual(classesDe(creerSigne('usage-fill', { valeur: '#fff', informe: true })), ['signe', 'signe-sombre', 'signe-valeur']);
  const anneau = noeud(creerSigne('usage-stroke', { valeur: '#0d99ff', taille: 24 }));
  assert.deepEqual(classesDe(anneau), ['signe', 'signe-24', 'signe-contour', 'signe-sombre']);
  assert.equal(anneau.proprietes.get('--signe-valeur'), '#0d99ff');
});

test('a-creer sans couleur a une tuile en pointillés, même teintée ; avec une couleur, elle la prend', () => {
  assert.deepEqual(classesDe(creerSigne('a-creer')), ['signe', 'signe-absent']);
  assert.deepEqual(classesDe(creerSigne('a-creer', { informe: true })), ['signe', 'signe-absent', 'signe-informe', 'signe-teinte-tokens']);
  assert.deepEqual(classesDe(creerSigne('a-creer', { valeur: '#7c3aed' })), ['signe', 'signe-sombre', 'signe-valeur']);
});

test('un titre nomme la tuile ; sans titre, elle est décorative', () => {
  const nomme = noeud(creerSigne('radius', { titre: 'radius' }));
  assert.equal(nomme.attributs.get('role'), 'img');
  assert.equal(nomme.attributs.get('aria-label'), 'radius');
  assert.equal(nomme.attributs.get('title'), 'radius');
  assert.equal(noeud(creerSigne('radius')).attributs.size, 0);
});
