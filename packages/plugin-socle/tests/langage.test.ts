/** Les composants du langage visuel posent les classes de `langage.css` et tirent leurs mots du kit. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { TYPES_D_ALERTE } from '@ucm-kit/core/referentiel';
import { creerAlerte, creerGravite, creerIcone, creerLienExterne, creerPastilleDeCompte, libelleDuType, marquerDuTon } from '../src/ui/Alerte';
import { creerColonnes, creerLigneDeDiff, creerResultat, marquerCarteCiblee } from '../src/ui/Changement';
import { creerChemin, creerCheminEnPhrase, creerPastilleDeCouleur, creerVariantEnPhrase } from '../src/ui/Chemin';
import { creerPuceFiltre, creerRechercheActive } from '../src/ui/Filtre';
import { creerJeton, creerRenommage } from '../src/ui/Jeton';
import { creerPoigneeDeSeparation } from '../src/ui/PoigneeDeSeparation';

/** Un nœud réduit : de quoi lire les classes, les attributs et le texte, sans navigateur. */
class Noeud {
  classes = new Set<string>();
  enfants: (Noeud | string)[] = [];
  attributs = new Map<string, string>();
  style: Record<string, string> = {};
  type = '';
  checked = false;
  value = '';
  readonly classList = { add: (...noms: string[]) => noms.forEach((nom) => this.classes.add(nom)) };
  constructor(readonly balise: string) {}
  get className(): string { return [...this.classes].join(' '); }
  set className(valeur: string) { this.classes = new Set(valeur.split(/\s+/).filter(Boolean)); }
  get textContent(): string { return this.enfants.map((enfant) => (typeof enfant === 'string' ? enfant : enfant.textContent)).join(''); }
  set textContent(valeur: string) { this.enfants = [valeur]; }
  append(...noeuds: (Noeud | string)[]): void { this.enfants.push(...noeuds); }
  prepend(...noeuds: (Noeud | string)[]): void { this.enfants.unshift(...noeuds); }
  setAttribute(nom: string, valeur: string): void { this.attributs.set(nom, valeur); }
  addEventListener(): void {}
}

Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: { createElement: (balise: string) => new Noeud(balise), createElementNS: (_espace: string, balise: string) => new Noeud(balise) },
});

const noeud = (element: unknown): Noeud => element as Noeud;
const enfantsNoeuds = (element: Noeud): Noeud[] => element.enfants.filter((enfant): enfant is Noeud => typeof enfant !== 'string');
const classesDe = (element: unknown): string[] => [...noeud(element).classes].sort();

test('un chemin est gris, sa variable gris clair ; un terme désigné prend sa couleur', () => {
  const chemin = noeud(creerChemin('Modal/backgrond/default', { vus: ['backgrond'] }));
  assert.deepEqual(classesDe(chemin), ['ch']);
  assert.equal(chemin.textContent, 'Modal/backgrond/default');
  const segments = enfantsNoeuds(chemin).filter((segment) => segment.textContent !== '/');
  assert.deepEqual(segments.map((segment) => classesDe(segment)), [['ch-groupe'], ['ch-groupe-vu'], ['ch-variable']]);
  const variable = noeud(creerChemin('Card/bg/default', { vus: ['default'] }));
  assert.deepEqual(classesDe(enfantsNoeuds(variable).at(-1)), ['ch-variable-vu']);
});

test('un segment qui arrive est vert, et cliquable quand il ouvre une carte', () => {
  const chemin = noeud(creerChemin('Button/background/hover', { ajouts: ['background'], lien: true, survol: 'background' }));
  const [, , arrivee] = enfantsNoeuds(chemin);
  assert.deepEqual(classesDe(arrivee), ['ch-ajout', 'ch-lien', 'survol']);
});

test('un chemin ou un variant cité dans une phrase prend un fond discret', () => {
  assert.deepEqual(classesDe(creerCheminEnPhrase('brands/info/light/700')), ['ch', 'ch-inline']);
  const variant = noeud(creerVariantEnPhrase('Severity=warning', 'Variant=standard'));
  assert.deepEqual(classesDe(variant), ['ch', 'ch-inline', 'ch-variant']);
  assert.equal(variant.textContent, 'Severity=warning, Variant=standard');
});

test('un jeton prend le ton de ce qu’il dit, et un renommage va du terme qui part au terme qui arrive', () => {
  assert.deepEqual(classesDe(creerJeton('bg', 'retire')), ['jeton', 'jeton-retire']);
  assert.deepEqual(classesDe(creerJeton('bg', 'groupe', { petit: true })), ['jeton', 'jeton-groupe', 'petit']);
  const [avant, fleche, apres] = creerRenommage('bg', 'background');
  assert.deepEqual([classesDe(avant), classesDe(fleche), classesDe(apres)], [['jeton', 'jeton-retire'], ['fleche'], ['jeton', 'jeton-retenu']]);
});

test('chaque type d’alerte a sa classe, son icône et le mot que le kit lui donne', () => {
  for (const { id, libelle } of TYPES_D_ALERTE) {
    const gravite = noeud(creerGravite(id));
    assert.deepEqual(classesDe(gravite), ['gravite', `ton-${id}`]);
    assert.equal(gravite.textContent, libelle);
    assert.equal(libelleDuType(id), libelle);
    const icone = noeud(creerIcone(id));
    assert.deepEqual(classesDe(icone), ['ico', `ton-${id}`]);
    assert.ok(enfantsNoeuds(enfantsNoeuds(icone)[0]).length >= 2, `l’icône de ${id} a plusieurs formes`);
    assert.deepEqual(classesDe(creerPastilleDeCompte(3, id)), ['pastille-compte', `ton-${id}`]);
  }
});

test('l’icône pleine d’un type écrit à l’encre du rôle, jamais en dur', () => {
  const svg = enfantsNoeuds(noeud(creerIcone('tenu')))[0];
  const styles = enfantsNoeuds(svg).map((forme) => forme.attributs.get('style') ?? '');
  assert.ok(styles.some((style) => style.includes('var(--texte-sur-ton)')));
  assert.ok(!JSON.stringify(enfantsNoeuds(svg).map((forme) => [...forme.attributs.values()])).includes('#1b1b1b'));
});

test('une alerte range son titre, son texte, ce qui reste à savoir et ses actions sous l’icône du type', () => {
  const action = creerLienExterne('Ouvrir');
  const alerte = noeud(creerAlerte('info', { titre: 'Titre', texte: 'Texte', meta: 'Suite', actions: [action] }));
  assert.deepEqual(classesDe(alerte), ['alerte', 'ton-info']);
  assert.equal(alerte.attributs.get('role'), 'status');
  const [icone, corps] = enfantsNoeuds(alerte);
  assert.deepEqual(classesDe(icone), ['ico', 'ton-info']);
  assert.deepEqual(enfantsNoeuds(corps).map((enfant) => classesDe(enfant)), [['alerte-titre'], [], ['alerte-meta'], ['alerte-actions']]);
  assert.deepEqual(classesDe(action), ['lien-externe']);
  assert.deepEqual(enfantsNoeuds(noeud(creerAlerte('tenu', { titre: 'Seul' }))).length, 2);
});

test('le liseré d’un type se pose sur une carte', () => {
  const carte = noeud(creerAlerte('tenu'));
  const constat = new Noeud('div');
  marquerDuTon(constat as unknown as Element, 'corriger');
  assert.deepEqual(classesDe(constat), ['a-ton', 'ton-corriger']);
  assert.ok(carte.classes.has('ton-tenu'));
});

test('un diff a deux colonnes, une case ou non, et son nom actuel avant son nom après', () => {
  assert.deepEqual(classesDe(creerColonnes('Aujourd’hui', 'Après l’application')), ['colonnes-tete']);
  assert.deepEqual(classesDe(creerColonnes('A', 'B', { avecCase: false })), ['colonnes-tete', 'sans-case']);
  const ligne = noeud(creerLigneDeDiff('ancien', 'nouveau'));
  assert.deepEqual(classesDe(ligne), ['diff']);
  const [caseACocher, avant, apres] = enfantsNoeuds(ligne);
  assert.deepEqual([classesDe(caseACocher), classesDe(avant), classesDe(apres)], [['case'], ['chemin'], ['chemin-apres']]);
  assert.equal(caseACocher.checked, true);
  assert.equal(apres.textContent, '→ nouveau');
  const sansCase = noeud(creerLigneDeDiff('a', 'b', { coche: null, reste: true }));
  assert.deepEqual(classesDe(sansCase), ['diff', 'reste', 'sans-case']);
  assert.equal(enfantsNoeuds(sansCase).length, 2);
});

test('une écriture réussie dit ce qui est fait, puis comment le défaire', () => {
  const resultat = noeud(creerResultat('8 layers liés', 'Ctrl+Z défait ce lot.'));
  assert.deepEqual(classesDe(resultat), ['resultat']);
  assert.equal(resultat.textContent, '✓ 8 layers liésCtrl+Z défait ce lot.');
  const carte = new Noeud('div');
  marquerCarteCiblee(carte as unknown as Element);
  assert.deepEqual(classesDe(carte), ['carte-ciblee']);
});

test('une puce de filtre porte son type, sa valeur et la croix ; une recherche active se reconnaît à sa classe', () => {
  const puce = noeud(creerPuceFiltre('collection', 'Interface', 'Enlever le filtre'));
  assert.deepEqual(classesDe(puce), ['puce-filtre']);
  assert.equal(puce.textContent, 'collectionInterface×');
  assert.equal(enfantsNoeuds(puce)[1].attributs.get('aria-label'), 'Enlever le filtre');
  const champ = noeud(creerRechercheActive('terme:background', 'Recherche'));
  assert.deepEqual(classesDe(champ), ['input', 'recherche-active']);
  assert.equal(champ.value, 'terme:background');
});

test('la pastille d’une couleur prend la valeur donnée, la poignée se déclare séparateur', () => {
  const pastille = noeud(creerPastilleDeCouleur('#B15152'));
  assert.deepEqual(classesDe(pastille), ['puce-couleur']);
  assert.equal(pastille.style.background, '#B15152');
  const poignee = noeud(creerPoigneeDeSeparation('Largeur du panneau'));
  assert.deepEqual(classesDe(poignee), ['arch-poignee']);
  assert.equal(poignee.attributs.get('role'), 'separator');
});
