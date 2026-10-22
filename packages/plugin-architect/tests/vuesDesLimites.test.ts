/**
 * Le rendu réel de la section « Figma comparé à l'export » de l'inspecteur et
 * de la section du profil UCM, sur un DOM réduit : les fonctions de
 * `src/ui/vues/integrations.ts` s'exécutent, et le test lit les textes qu'elles
 * posent. Les états de la galerie les montrent dans l'interface compilée.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { classerImport } from '../src/integrations/contrats';
import { PREFERENCES_PAR_DEFAUT } from '../src/preferences';
import { creerApplication, type Application } from '../src/ui/application';
import { etatInitial, poserReleve } from '../src/ui/etat';
import { creerVueIntegrations } from '../src/ui/vues/integrations';
import { couchesDuProfilAvecLimites, recetteEnTexte, releveDesLimitesDExport, releveDuProfilAvecLimites, tokensDesLimitesDExport } from './fixturesDesLimites';
import { alias, constructeur, couleur, projetLibre } from './fixtures';

/** Un élément réduit à ce que les vues emploient. */
class Noeud {
  className = '';
  textContent = '';
  hidden = false;
  type = '';
  value = '';
  selected = false;
  readonly dataset: Record<string, string> = {};
  enfants: Noeud[] = [];
  constructor(readonly balise: string) {}
  append(...noeuds: Noeud[]): void { this.enfants.push(...noeuds); }
  replaceChildren(...noeuds: Noeud[]): void { this.enfants = [...noeuds]; }
  setAttribute(): void {}
  addEventListener(): void {}
  click(): void {}
}

Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: (balise: string) => new Noeud(balise) } });

/** Les textes des éléments dont la classe est donnée, dans l'ordre du document. */
function textesDeClasse(racine: unknown, classe: string): string[] {
  const noeud = racine as Noeud;
  const propres = noeud.className.split(' ').includes(classe) ? [noeud.textContent] : [];
  return [...propres, ...noeud.enfants.flatMap((enfant) => textesDeClasse(enfant, classe))];
}

const notesDe = (racine: unknown): string[] => textesDeClasse(racine, 'note');

/** Les éléments portant `data-limite`, avec leur cause et leur texte. */
function limitesDe(racine: unknown): Array<[string, string]> {
  const noeud = racine as Noeud;
  const propres: Array<[string, string]> = 'limite' in noeud.dataset ? [[noeud.dataset.limite, noeud.enfants.find((enfant) => enfant.className === 'constat-detail')?.textContent ?? noeud.textContent]] : [];
  return [...propres, ...noeud.enfants.flatMap((enfant) => limitesDe(enfant))];
}

function application(configurer: (etat: ReturnType<typeof etatInitial>) => void): Application {
  const etat = etatInitial();
  configurer(etat);
  return creerApplication(etat, () => ({ montrerDansLaTable() {}, rendre() {}, annoncer() {}, disposer() {} }));
}

function importDeTokens(texte: string) {
  const issue = classerImport('tokens.json', texte, 0);
  if (!('import' in issue)) throw new Error('import refusé');
  return issue.import;
}

/** L'inspecteur d'une variable, avec le fichier de tokens importé. */
function inspecteurDeLExport(variable: string, tokens = tokensDesLimitesDExport()) {
  const app = application((etat) => {
    poserReleve(etat, releveDesLimitesDExport());
    etat.imports = [importDeTokens(tokens)];
  });
  creerVueIntegrations(app);
  const section = app.sectionsDeLInspecteur[0](variable);
  assert.ok(section, 'la section du contrat est absente');
  return notesDe(section).slice(1);
}

const EGALITE = 'L’export porte la même chose que Figma pour ce token.';
const MODES_COMPARES = 'Aucun écart dans les modes comparés.';
const A_LA_MAIN = 'Vérifiez à la main les modes non comparés.';

test('le texte d’égalité paraît quand chaque mode a été comparé', () => {
  assert.deepEqual(inspecteurDeLExport('egal'), [EGALITE]);
});

test('une limite remplace le texte d’égalité par son propre texte, et finit sur le geste à faire', () => {
  const attendus: Record<string, string> = {
    'sans-valeur': 'Mode Sombre : Figma ne donne aucune valeur. Rien n’est comparé.',
    opacite: 'Mode Sombre : un alias avec opacité n’est pas comparé.',
    forme: 'Mode Sombre : la valeur de l’export n’est pas comparée. Sa forme n’est pas prise en charge.',
    relative: 'Mode Sombre : l’export écrit cette valeur en rem. Sa taille en pixels dépend de la page. Elle n’est pas comparée.',
    unite: 'Mode Sombre : l’unité vh de l’export n’est pas comparée.',
    espace: 'Mode Sombre : l’espace de couleur oklch de l’export n’est pas comparé.',
    courbe: 'Mode Sombre : cette courbe de Figma n’a pas de points de contrôle. Elle n’est pas comparée.',
  };
  for (const [variable, texte] of Object.entries(attendus)) {
    const notes = inspecteurDeLExport(variable);
    assert.deepEqual(notes, [MODES_COMPARES, texte, A_LA_MAIN], variable);
    assert.ok(!notes.includes(EGALITE), `${variable} : l’égalité est affichée`);
  }
});

test('un écart et une limite se lisent ensemble : l’écart, la fraîcheur, la limite, puis le geste', () => {
  assert.deepEqual(inspecteurDeLExport('mixte'), [
    'Valeur différente (Clair)',
    'Un écart peut venir d’un export antérieur à vos modifications : réexportez avant de corriger.',
    'Mode Sombre : l’export écrit cette valeur en rem. Sa taille en pixels dépend de la page. Elle n’est pas comparée.',
    A_LA_MAIN,
  ]);
});

test('un écart de type ne montre ni égalité ni limite de valeur', () => {
  const document = JSON.stringify({ $extensions: { 'com.ucm.formatVersion': 2 }, tokens: { egal: { $type: 'color', $value: '#112233', $extensions: { 'com.ucm.modes': { clair: '#112233', sombre: '#112233' } } } } });
  assert.deepEqual(inspecteurDeLExport('egal', document), [
    'Type différent',
    'Un écart peut venir d’un export antérieur à vos modifications : réexportez avant de corriger.',
  ]);
});

/** La vue des intégrations d'un fichier associé au profil, avec la recette de Palettes. */
function vueDuProfil(configurer: (etat: ReturnType<typeof etatInitial>) => void = () => undefined) {
  const app = application((etat) => {
    poserReleve(etat, releveDuProfilAvecLimites());
    etat.preferences = { ...PREFERENCES_PAR_DEFAUT, palettes: true, profilUcm: true, associations: { 'Profil contrôlé': couchesDuProfilAvecLimites() } };
    etat.recette = { demande: 2, texte: recetteEnTexte() };
    configurer(etat);
  });
  const vue = creerVueIntegrations(app);
  vue.mettreAJour();
  return vue.element;
}

test('la section du profil dit combien de contrôles n’ont pas pu se faire, et pourquoi', () => {
  const vue = vueDuProfil();
  const notes = notesDe(vue);
  assert.ok(notes.includes('Aucun écart dans ce qui a été contrôlé.'));
  assert.ok(!notes.includes('Aucun écart au profil.'));
  assert.ok(notes.includes('4 contrôles n’ont pas pu se faire.'));
  assert.deepEqual(limitesDe(vue), [
    ['cible-sans-couche', 'Composants / button/border vise une variable de la collection Divers, qui n’a pas de couche. Associez-lui une couche pour la contrôler.'],
    ['mode-non-reconnu', 'Le mode Jour n’est pas reconnu. Sa nuance n’est pas vérifiée. Dans UCM Nomenclature, déclarez ce mot comme une autre écriture de light ou de dark.'],
    ['mode-sans-valeur', 'Thème / primary/solid/default n’a pas de valeur dans le mode Jour. Ce mode n’est pas contrôlé.'],
    ['role-inconnu', 'Thème / primary/mystere/zzz : son rôle dans le thème n’est pas reconnu. Sa portée et sa nuance ne sont pas vérifiées.'],
  ]);
});

test('un seul contrôle impossible s’écrit au singulier', () => {
  const c = constructeur('Un seul');
  c.collection('t', 'Thème', ['Light']);
  c.collection('b', 'Marques', ['M']);
  c.collection('p', 'Catalogue', ['M']);
  c.variable('mystere', 't', 'primary/mystere/zzz', 'COLOR', { Light: alias('b-700') }, { portees: [] });
  c.variable('b-700', 'b', 'primary/light/700', 'COLOR', { M: alias('cat') }, { portees: [] });
  c.variable('cat', 'p', 'colors/blue/700', 'COLOR', { M: couleur('#1E40AF') }, { portees: [] });
  const app = application((etat) => {
    poserReleve(etat, c.releve());
    etat.preferences = { ...PREFERENCES_PAR_DEFAUT, profilUcm: true, associations: { 'Un seul': { t: 'theme', b: 'brands', p: 'primitives' } } };
  });
  const vue = creerVueIntegrations(app);
  vue.mettreAJour();
  assert.ok(notesDe(vue.element).includes('1 contrôle n’a pas pu se faire.'));
});

test('l’inspecteur montre la limite de la variable inspectée, et pas celle des autres', () => {
  const app = application((etat) => {
    poserReleve(etat, releveDuProfilAvecLimites());
    etat.preferences = { ...PREFERENCES_PAR_DEFAUT, palettes: true, profilUcm: true, associations: { 'Profil contrôlé': couchesDuProfilAvecLimites() } };
    etat.recette = { demande: 2, texte: recetteEnTexte() };
  });
  creerVueIntegrations(app);
  const section = app.sectionsDeLInspecteur[2]('defaut');
  assert.ok(section, 'la section du profil est absente');
  const notes = notesDe(section);
  assert.ok(notes.includes('Thème / primary/solid/default n’a pas de valeur dans le mode Jour. Ce mode n’est pas contrôlé.'), notes.join(' | '));
  assert.equal(notes.filter((note) => note.includes('n’est pas contrôlé') || note.includes('pas reconnu')).length, 1);
  const voisine = app.sectionsDeLInspecteur[2]('hover');
  assert.ok(voisine, 'la section du profil est absente pour une variable sans limite');
  assert.equal(notesDe(voisine).some((note) => note.includes('n’est pas contrôlé')), false);
});

test('sans limite, la section du profil garde son texte d’origine', () => {
  const app = application((etat) => {
    poserReleve(etat, projetLibre());
    etat.preferences = { ...PREFERENCES_PAR_DEFAUT, profilUcm: true };
  });
  const vue = creerVueIntegrations(app);
  vue.mettreAJour();
  const notes = notesDe(vue.element);
  assert.ok(notes.includes('Aucun écart au profil.'));
  assert.equal(notes.some((note) => note.includes('contrôle')), false);
  assert.deepEqual(limitesDe(vue.element), []);
});
