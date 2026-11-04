/** Les icônes d'interface du socle viennent de la famille `interface` du kit : même tracé, mêmes dimensions que leur ancien dessin. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { REPRISES_DE_SIGNES, SIGNES, TYPES_D_ALERTE } from '@ucm-kit/core/referentiel';
import { creerIcone, creerLienExterne, svgDeLAlerte, texteDuType } from '../src/ui/Alerte';
import { creerChevron } from '../src/ui/Chevron';
import { createSettingsButton } from '../src/ui/EnTete';
import { createResizeGrip } from '../src/ui/ResizeGrip';
import { creerGlyphe, creerSvgDuSigne, glypheDe, IDENTIFIANTS_DE_GLYPHES } from '../src/ui/Signe';

/** Un nœud réduit : de quoi lire les attributs, les enfants et le texte, sans navigateur. */
class Noeud {
  attributs = new Map<string, string>();
  enfants: (Noeud | string)[] = [];
  classes = new Set<string>();
  texte = '';
  title = '';
  type = '';
  className = '';
  readonly classList = { add: (...noms: string[]) => noms.forEach((nom) => this.classes.add(nom)) };
  constructor(readonly balise: string) {}
  get noeuds(): Noeud[] { return this.enfants.filter((enfant): enfant is Noeud => typeof enfant !== 'string'); }
  get textContent(): string { return this.texte; }
  set textContent(valeur: string) { this.texte = valeur; }
  setAttribute(nom: string, valeur: string): void { this.attributs.set(nom, valeur); }
  append(...noeuds: (Noeud | string)[]): void { this.enfants.push(...noeuds); }
  appendChild(noeud: Noeud): void { this.enfants.push(noeud); }
  addEventListener(): void {}
}

Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: { createElement: (balise: string) => new Noeud(balise), createElementNS: (_espace: string, balise: string) => new Noeud(balise) },
});

const noeud = (element: unknown): Noeud => element as Noeud;
const attribut = (element: Noeud, nom: string): string | undefined => element.attributs.get(nom);

interface ElementDeTrace {
  readonly balise: string;
  readonly attributs: Record<string, string>;
}

/** Les éléments du tracé d'un signe tel que le kit l'écrit. */
function traceDuKit(id: string): { grille: number; elements: ElementDeTrace[] } {
  const signe = SIGNES.find((candidat) => candidat.id === id);
  assert.ok(signe, id);
  const elements = [...signe.trace.matchAll(/<(path|rect|circle|text)\b([^>]*?)(?:\/>|>[^<]*<\/\1>)/gu)].map(([, balise, attributs]) => ({
    balise,
    attributs: Object.fromEntries([...attributs.matchAll(/([\w:-]+)="([^"]*)"/gu)].map(([, nom, valeur]) => [nom, valeur])),
  }));
  return { grille: signe.grille ?? 16, elements };
}

/** Le SVG pose, élément par élément, le tracé du signe du kit sur la grille du signe. */
function verifierLeTrace(svg: Noeud, id: string): void {
  const { grille, elements } = traceDuKit(id);
  assert.equal(attribut(svg, 'viewBox'), `0 0 ${grille} ${grille}`, `${id} : grille`);
  const poses = svg.noeuds.map((enfant) => ({ balise: enfant.balise, attributs: Object.fromEntries(enfant.attributs) }));
  assert.deepEqual(poses, elements, `${id} : tracé`);
  assert.ok(elements.length > 0, id);
}

/** Les points d'un tracé de lignes (`M`, `L`, `l`, `z`), pour comparer deux dessins sans compter leurs caractères. */
function pointsDe(trace: string): [number, number][] {
  const points: [number, number][] = [];
  let commande = '';
  let nombres: number[] = [];
  const vider = (): void => {
    for (let i = 0; i + 1 < nombres.length; i += 2) {
      const dernier = points.at(-1) ?? [0, 0];
      points.push(commande === 'l' ? [dernier[0] + nombres[i], dernier[1] + nombres[i + 1]] : [nombres[i], nombres[i + 1]]);
    }
    nombres = [];
  };
  for (const [, lettre, nombre] of trace.matchAll(/([MLlz])|(-?\d+(?:\.\d+)?)/gu)) {
    if (lettre) {
      vider();
      commande = lettre === 'M' ? 'L' : lettre;
    } else nombres.push(Number(nombre));
  }
  vider();
  return points;
}

test('chaque signe du kit se pose en éléments du DOM, sans élément ni attribut perdu', () => {
  for (const { id } of SIGNES) {
    if (id === 'usage-fill' || id === 'usage-stroke') {
      assert.equal(noeud(creerSvgDuSigne(id, 16)).enfants.length, 0, id);
      continue;
    }
    verifierLeTrace(noeud(creerSvgDuSigne(id, 16)), id);
  }
});

test('le SVG d\'un signe porte la taille demandée, le trait du kit, ou l\'épaisseur que le lecteur garde', () => {
  const svg = noeud(creerSvgDuSigne('chevron', 12));
  assert.equal(attribut(svg, 'width'), '12');
  assert.equal(attribut(svg, 'height'), '12');
  assert.equal(attribut(svg, 'stroke-width'), '1.4');
  assert.equal(attribut(svg, 'aria-hidden'), 'true');
  assert.equal(attribut(svg, 'xmlns'), undefined);
  assert.equal(attribut(noeud(creerSvgDuSigne('chevron', 12, { epaisseur: 2 })), 'stroke-width'), '2');
  assert.throws(() => creerSvgDuSigne('inconnu', 12), /SIGNES/);
});

test('le chevron pose le signe chevron à 12 px, et son ancien tracé sur 12 est ce signe mis à l\'échelle de 16/12', () => {
  const chevron = noeud(creerChevron());
  verifierLeTrace(chevron, 'chevron');
  assert.equal(attribut(chevron, 'width'), '12');
  assert.equal(attribut(chevron, 'height'), '12');
  assert.equal(attribut(chevron, 'class'), 'chevron-svg');
  const ancien = pointsDe('M3 4.5 6 7.5 9 4.5').map(([x, y]) => [(x * 16) / 12, (y * 16) / 12]);
  const kit = pointsDe(traceDuKit('chevron').elements[0].attributs.d);
  assert.deepEqual(ancien, kit);
});

test('le trait du chevron garde ses 1,5 px : socle.css écrit 2 sur la grille de 16, rendus à 12 px', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'ui', 'socle.css'), 'utf8');
  const regle = /\.chevron-svg path \{([^}]*)\}/u.exec(css);
  assert.ok(regle);
  const epaisseur = Number(/stroke-width:\s*([\d.]+)/u.exec(regle[1])?.[1]);
  assert.equal((epaisseur * 12) / 16, 1.5);
});

test('l\'engrenage pose le signe reglages sur sa grille de 512, à 12 px, décoratif', () => {
  const bouton = noeud(createSettingsButton(() => {}));
  const icone = bouton.noeuds[0];
  verifierLeTrace(icone, 'reglages');
  assert.equal(attribut(icone, 'viewBox'), '0 0 512 512');
  assert.equal(attribut(icone, 'width'), '12');
  assert.equal(attribut(icone, 'height'), '12');
  assert.equal(attribut(icone, 'aria-hidden'), 'true');
  assert.equal(attribut(icone, 'focusable'), 'false');
  assert.equal(attribut(icone.noeuds[0], 'fill'), 'currentColor');
  assert.equal(attribut(bouton, 'aria-label'), 'Ouvrir la configuration');
  assert.equal(bouton.title, 'Configuration');
});

test('la poignée pose le signe poignee sur la grille de 16, à 16 px, et socle.css garde ses bouts droits', () => {
  const grip = noeud(createResizeGrip(() => {}));
  const icone = grip.noeuds[0];
  verifierLeTrace(icone, 'poignee');
  assert.equal(attribut(icone, 'width'), '16');
  assert.equal(attribut(icone, 'height'), '16');
  assert.equal(attribut(grip, 'aria-hidden'), 'true');
  const css = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'ui', 'socle.css'), 'utf8');
  const regle = /\.resize-grip svg \{([^}]*)\}/u.exec(css);
  assert.ok(regle);
  assert.match(regle[1], /stroke-linecap:\s*butt/u);
  assert.match(regle[1], /stroke-width:\s*1\.5/u);
});

test('le lien externe pose le signe lien-externe à 11 px, avec le trait en pixels de l\'ancien dessin', () => {
  const lien = noeud(creerLienExterne('Ouvrir'));
  const icone = lien.noeuds[0];
  verifierLeTrace(icone, 'lien-externe');
  assert.equal(attribut(icone, 'width'), '11');
  assert.equal(attribut(icone, 'height'), '11');
  assert.equal(attribut(icone, 'aria-hidden'), 'true');
  assert.equal(attribut(icone, 'stroke-linecap'), 'round');
  const ancien = (1.3 * 11) / 12;
  const nouveau = (Number(attribut(icone, 'stroke-width')) * 11) / 16;
  assert.ok(Math.abs(ancien - nouveau) < 0.01, `${ancien} px avant, ${nouveau} px après`);
  assert.equal(lien.enfants[0], 'Ouvrir');
});

test('le chevron de select.input, en CSS, a la largeur et le sommet centré du signe chevron, dans les deux thèmes', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'ui', 'socle.css'), 'utf8');
  const chevrons = [...css.matchAll(/--chevron:\s*url\("data:image\/svg\+xml,([^"]*)"\)/gu)].map(([, donnees]) => decodeURIComponent(donnees));
  assert.equal(chevrons.length, 2, 'clair et sombre');
  const triangles = chevrons.map((svg) => {
    assert.match(svg, /width='8' height='5'/u);
    const trace = /<path d='([^']*)'/u.exec(svg)?.[1];
    assert.ok(trace);
    return trace;
  });
  assert.equal(triangles[0], triangles[1], 'les deux thèmes ne changent que la teinte');

  const [debut, sommet, fin] = pointsDe(triangles[0]);
  const [kitDebut, kitSommet, kitFin] = pointsDe(traceDuKit('chevron').elements[0].attributs.d);
  // Le triangle est plein et le signe est un trait : même largeur, même sommet au milieu, même bord haut.
  assert.equal(fin[0] - debut[0], kitFin[0] - kitDebut[0]);
  assert.equal(sommet[0] - debut[0], kitSommet[0] - kitDebut[0]);
  assert.equal(debut[1], fin[1]);
  assert.ok(sommet[1] > debut[1] && kitSommet[1] > kitDebut[1]);
  // Écart connu : le triangle fait 5 px de haut, le trait du signe 4 sur sa grille.
  assert.equal(sommet[1] - debut[1], 5);
  assert.equal(kitSommet[1] - kitDebut[1], 4);
});

test('les glyphes de la famille interface sont des signes du kit, un caractère chacun', () => {
  const interfaces = new Set([
    ...SIGNES.filter((signe) => signe.famille === 'interface').map((signe) => signe.id),
    ...(REPRISES_DE_SIGNES.find((reprise) => reprise.famille === 'interface')?.reprend.map((signe) => signe.id) ?? []),
  ]);
  for (const id of IDENTIFIANTS_DE_GLYPHES) assert.ok(interfaces.has(id), `${id} n'est pas un signe de la famille interface`);
  const attendus = { fermer: '×', 'avant-apres': '→', menu: '⋯', ajouter: '+', retirer: '−', separateur: '›', ecart: '≠' } as const;
  assert.deepEqual([...IDENTIFIANTS_DE_GLYPHES].sort(), Object.keys(attendus).sort());
  for (const [id, caractere] of Object.entries(attendus)) {
    assert.equal(SIGNES.find((signe) => signe.id === id)?.glyphe, caractere, `${id} : le kit porte le glyphe`);
    const glyphe = noeud(creerGlyphe(id as keyof typeof attendus));
    assert.equal(glypheDe(id as keyof typeof attendus), caractere);
    assert.equal(glyphe.textContent, caractere);
    assert.equal(glyphe.balise, 'span');
    assert.equal(attribut(glyphe, 'aria-hidden'), 'true');
  }
});

test('le repli texte d\'un type d\'alerte est celui du kit, en sortie brute ou en commentaire de forge', () => {
  for (const type of TYPES_D_ALERTE) {
    assert.equal(texteDuType(type.id), type.texte.brut);
    assert.equal(texteDuType(type.id, 'forge'), type.texte.forge);
  }
});

/** Un nœud de FORMES en texte, dans l'ordre des attributs posés. */
const enTexte = (forme: Noeud): string => `<${forme.balise}${[...forme.attributs].map(([nom, valeur]) => ` ${nom}="${valeur}"`).join('')}/>`;

test('svgDeLAlerte écrit les formes de creerIcone, au même ordre et avec les mêmes attributs', () => {
  for (const { id } of TYPES_D_ALERTE) {
    const dom = noeud(noeud(creerIcone(id)).enfants[0]);
    const attendu = dom.noeuds.map(enTexte).join('');
    const texte = svgDeLAlerte(id);
    assert.ok(attendu.length > 0, id);
    assert.equal(texte, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">${attendu}</svg>`, id);
  }
  assert.match(svgDeLAlerte('tenu', 16), /width="16" height="16"/u);
});
