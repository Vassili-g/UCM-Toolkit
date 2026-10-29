/**
 * La carte du modèle (C81) du panneau des constats, montée sur le DOM réduit : sa phrase, sa ligne de lieu, ses puces, sa ligne d'actions,
 * la liste que le chevron déplie, le clic qui envoie `servir-de-modele` et la réponse `modele-propose` qui la remplace par les
 * corrections du modèle dans la même section, ouverte.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '@ucm-kit/core/controles';

import { poserLeDom, comme, type ElementDeTest } from './domDeTest';

poserLeDom();

// Les modules de l'interface lisent `document` à l'appel, pas à l'import : ils se chargent après `poserLeDom`.
import { indexer } from '../src/indexation';
import type { PluginMessage } from '../src/messages';
import { monterLePanneau, type PanneauDesConstats } from '../src/ui/analyse';
import { recevoirUneAnalyse, type AnalyseRecue } from '../src/ui/composant/analyse';
import type { Etat } from '../src/ui/etat';

const { alertModele, constatsCarteDuModele, modeleProposeApresLaCarte } = require('../galerie/etats/corrections.cjs') as {
  alertModele: { releve: Parameters<typeof indexer>[0]; sujet: { nom: string; variants: Array<{ id: string; nom: string }> } };
  constatsCarteDuModele: Constat[];
  modeleProposeApresLaCarte: Extract<PluginMessage, { type: 'modele-propose' }>;
};

const IDENTITE = { sujet: 'alert-set', generation: 1 };
const [COULEURS, TAILLES] = constatsCarteDuModele;

interface Banc {
  panneau: PanneauDesConstats;
  etat: Etat;
  racine: ElementDeTest;
  /** Les variants envoyés à `servirDeModele`, dans l'ordre. */
  modeles: string[];
  selections: Array<readonly string[]>;
  actualiser(): void;
}

function monter(constats: readonly Constat[] = constatsCarteDuModele, surcharge: Partial<AnalyseRecue> = {}, lecture: unknown = alertModele): Banc {
  const modeles: string[] = [];
  const selections: Array<readonly string[]> = [];
  const analyse = {
    identite: IDENTITE, statut: 'complete', constats, tous: constats, ignores: [], repondues: {}, variants: alertModele.sujet.variants, lecture: null, sansTokens: false,
    progression: null, perimee: false, cause: null, ecriture: null, lot: null, appliquees: [], liaisons: null, liaisonsDemandees: false, recueA: 0, ...surcharge,
  } as unknown as AnalyseRecue;
  const etat = {
    composant: { lecture, index: indexer(alertModele.releve) }, analyse, architecture: null, reference: null, panneau: { ouvert: true, largeurDeLaVue: 400, element: 'tout' },
  } as unknown as Etat;
  const app = {
    etat, servirDeModele: (variant: string) => modeles.push(variant), selectionner: (layers: readonly string[]) => selections.push(layers),
    appliquer() {}, ignorerLaProposition() {}, repondre() {}, ignorer() {}, nePlusIgnorer() {}, ouvrirLaConfiguration() {}, rendre() {}, annulerLaReponse() {},
  };
  const panneau = monterLePanneau(app as never, { poserLaSelectionDuPlugin() {}, poserLesCorrections() {} } as never);
  panneau.mettreAJour();
  return { panneau, etat, racine: comme(panneau.element), modeles, selections, actualiser: () => panneau.mettreAJour() };
}

const section = (banc: Banc, id: string): ElementDeTest => comme(banc.racine.querySelectorAll('.section-element').find((candidate) => candidate.dataset.element === id));
const carteDe = (banc: Banc, id: string): ElementDeTest => comme(section(banc, id).querySelector('.bloc-constat'));
const proposer = (carte: ElementDeTest): ElementDeTest => comme(carte.querySelectorAll('.bloc-actions .btn').find((bouton) => bouton.textContent === 'Proposer les liaisons'));
const ouverte = (banc: Banc, id: string): string | null => comme(section(banc, id).querySelector('.bande-element')).getAttribute('aria-expanded');

test('la carte C81 des couleurs est dans Couleurs, celle des tailles dans Tailles et forme, chacune avec sa phrase', () => {
  const banc = monter();
  assert.equal(comme(carteDe(banc, 'couleurs').querySelector('.bloc-phrase')).textContent, '3 layers ont une couleur en dur dans 10 variants.');
  assert.equal(comme(carteDe(banc, 'tailles').querySelector('.bloc-phrase')).textContent, '1 layer a une taille en dur dans 10 variants.');
  assert.equal(banc.racine.querySelectorAll('.bloc-constat').length, 2);
});

test('la phrase se met au pluriel avec le nombre de layers et de variants', () => {
  const unique: Constat = { ...COULEURS, faits: { ...COULEURS.faits, layers: 1, variants: 1 } };
  const phrase = comme(carteDe(monter([unique]), 'couleurs').querySelector('.bloc-phrase')).textContent;
  assert.equal(phrase, '1 layer a une couleur en dur dans 1 variant.');
});

test('la carte est À corriger, avec le chevron en haut à droite', () => {
  const carte = carteDe(monter(), 'couleurs');
  assert.ok(carte.classes.has('ton-corriger'));
  assert.ok(comme(carte.querySelector('.bloc-tete')).querySelector('.bloc-droite .chevron-svg'));
});

test('la ligne de lieu dit « Un variant les lie déjà : » et montre les puces du modèle, retrouvé par son identifiant', () => {
  const carte = carteDe(monter(), 'couleurs');
  const lieu = comme(carte.querySelector('.constat-lieu'));
  assert.ok(lieu.textContent.startsWith('Un variant les lie déjà : '));
  const puces = lieu.querySelectorAll('.puce-valeur');
  assert.deepEqual(puces.map((puce) => puce.title), ['Severity=info', 'Variant=standard']);
  assert.deepEqual(puces.map((puce) => puce.textContent), ['info', 'standard']);
  // Un seul layer : « le lie ».
  const seul = carteDe(monter([TAILLES]), 'tailles');
  assert.ok(comme(seul.querySelector('.constat-lieu')).textContent.startsWith('Un variant le lie déjà : '));
});

test('la ligne d’actions porte « Proposer les liaisons », puis Sélectionner ; aucune phrase d’action ne la précède', () => {
  const carte = carteDe(monter(), 'couleurs');
  const ligne = comme(carte.querySelector('.bloc-actions'));
  assert.equal(carte.children[carte.children.length - 1], ligne);
  assert.deepEqual(ligne.querySelectorAll('.btn').map((bouton) => bouton.textContent), ['Proposer les liaisons', 'Sélectionner']);
  assert.equal(carte.querySelector('.constat-statut'), null);
  assert.equal(carte.querySelector('.constat-actions'), null, 'ni Ignorer, ni phrase d’action');
});

test('le chevron déplie la liste des layers et de leur token dans le modèle', () => {
  const banc = monter();
  const carte = carteDe(banc, 'couleurs');
  const corps = comme(carte.querySelector('.bloc-corps'));
  assert.equal(corps.hidden, true);
  comme(carte.querySelector('.bloc-bouton')).clic();
  const ouvert = comme(carteDe(banc, 'couleurs').querySelector('.bloc-corps'));
  assert.equal(ouvert.hidden, false);
  assert.deepEqual(ouvert.querySelectorAll('.colonnes-tete span').map((colonne) => colonne.textContent), ['Layer', 'Token dans le modèle']);
  const lignes = ouvert.querySelectorAll('.diff');
  assert.deepEqual(lignes.map((ligne) => comme(ligne.querySelector('.chemin')).textContent), ['container fill', 'icon fill', 'message fill']);
  assert.deepEqual(lignes.map((ligne) => comme(ligne.querySelector('.chemin-apres')).textContent.replace('→ ', '')), [
    'colors/info/standard/background', 'colors/info/standard/icon', 'colors/info/standard/foreground',
  ]);
  assert.ok(lignes.every((ligne) => ligne.querySelector('input') === null), 'aucune case : rien n’est encore proposé');
});

test('la carte des tailles liste les champs de taille du layer, pas ses couleurs', () => {
  const banc = monter();
  comme(carteDe(banc, 'tailles').querySelector('.bloc-bouton')).clic();
  const lignes = comme(carteDe(banc, 'tailles').querySelector('.bloc-corps')).querySelectorAll('.diff');
  assert.deepEqual(lignes.map((ligne) => comme(ligne.querySelector('.chemin')).textContent), ['container gap', 'container padding left', 'container padding top', 'container top left radius']);
});

test('ouvrir la carte ne sélectionne rien ; Sélectionner envoie les layers du constat', () => {
  const banc = monter();
  comme(carteDe(banc, 'couleurs').querySelector('.bloc-bouton')).clic();
  assert.deepEqual(banc.selections, []);
  comme(carteDe(banc, 'couleurs').querySelector('.bouton-selectionner')).clic();
  assert.deepEqual(banc.selections, [COULEURS.layers]);
});

test('un modèle que la vue ne lit pas garde sa carte sans chevron, faute de liste', () => {
  const ailleurs: Constat = { ...COULEURS, layers: ['alert:v:ailleurs:container', 'alert:v:ailleurs:icon'] };
  const carte = carteDe(monter([ailleurs]), 'couleurs');
  assert.equal(carte.querySelector('.bloc-corps'), null);
  assert.equal(carte.querySelector('.chevron-svg'), null);
  assert.ok(proposer(carte), 'le bouton reste');
});

test('le clic sur « Proposer les liaisons » envoie le variant des faits, un identifiant, une seule fois', () => {
  const banc = monter();
  const bouton = proposer(carteDe(banc, 'couleurs'));
  bouton.clic();
  assert.deepEqual(banc.modeles, ['alert:0']);
  assert.equal(COULEURS.faits.modele, 'alert:0');
  assert.equal(bouton.disabled, true);
  bouton.clic();
  assert.deepEqual(banc.modeles, ['alert:0']);
});

test('pendant le provisoire « Proposer les liaisons » est inactif, et une analyse périmée n’a plus de carte', () => {
  assert.equal(proposer(carteDe(monter(constatsCarteDuModele, { statut: 'provisoire' }), 'couleurs')).disabled, true);
  assert.equal(proposer(carteDe(monter(), 'couleurs')).disabled, false);
  assert.equal(monter(constatsCarteDuModele, { perimee: true, cause: 'document' }).racine.querySelector('.bloc-constat'), null);
});

test('la réponse retire les C81 de `retires`, garde les autres constats et range les corrections dans la section ouverte', () => {
  const autre: Constat = { id: 'C40:ailleurs', code: 'C40', type: 'corriger', famille: 'tokens', variants: [], layers: [], faits: {} };
  const banc = monter([...constatsCarteDuModele, autre]);
  proposer(carteDe(banc, 'couleurs')).clic();
  recevoirUneAnalyse(banc.etat, modeleProposeApresLaCarte);
  banc.actualiser();
  const analyse = banc.etat.analyse!;
  assert.deepEqual(analyse.tous.filter((constat) => constat.code === 'C81'), []);
  assert.ok(analyse.constats.some((constat) => constat.id === 'C40:ailleurs'));
  assert.ok(modeleProposeApresLaCarte.constats.length > 0 && modeleProposeApresLaCarte.constats.every((constat) => analyse.constats.includes(constat)));
  // Le panneau n'a plus de carte de modèle : ni phrase « en dur », ni « Proposer les liaisons ».
  assert.equal(banc.racine.querySelectorAll('.bloc-phrase').filter((phrase) => /en dur dans/.test(phrase.textContent)).length, 0);
  assert.ok(banc.racine.querySelectorAll('.btn').every((bouton) => bouton.textContent !== 'Proposer les liaisons'));
  // Les corrections du modèle forment la carte « Copier les liaisons », dans Couleurs, avec ses cases.
  const copie = section(banc, 'couleurs').querySelectorAll('.bloc').find((carte) => /Copier les liaisons de/.test(carte.textContent));
  assert.ok(copie, 'la carte de corrections est dans Couleurs');
  assert.ok(comme(copie).querySelector('input.case'));
  assert.equal(ouverte(banc, 'couleurs'), 'true');
  assert.equal(comme(section(banc, 'tailles').querySelector('.bande-element')).classes.has('tenue'), true, 'Tailles et forme n’a plus de point : son C81 est parti');
});

test('la section reste ouverte quand les corrections dépassent cinq points', () => {
  const corrections: Constat[] = Array.from({ length: 7 }, (_, rang) => ({
    id: `C24:modele:v${rang}`, code: 'C24', type: 'corriger', famille: 'liaisons', variants: [`alert:v:${rang}`], layers: [`alert:v:${rang}:icon`],
    faits: { modele: 'Severity=info, Variant=standard', calque: 'icon', champ: 'fills' },
    correction: {
      id: `C24:modele:v${rang}`, sorte: 'liaison', cible: { layer: `alert:v:${rang}:icon`, champ: 'fills' }, avant: null,
      apres: { nom: `alert/colors/v${rang}/standard/icon` }, aRelire: { regle: 'Le variant modèle sert de modèle.', avant: null },
    },
  } as Constat));
  // Un point dans un autre élément : seule, la section s'ouvrirait d'elle-même.
  const tokens: Constat = { id: 'C40:ailleurs', code: 'C40', type: 'corriger', famille: 'tokens', variants: [], layers: [], faits: {} };
  const banc = monter([COULEURS, tokens]);
  assert.equal(ouverte(banc, 'couleurs'), 'true');
  proposer(carteDe(banc, 'couleurs')).clic();
  recevoirUneAnalyse(banc.etat, { ...modeleProposeApresLaCarte, retires: [COULEURS.id], constats: corrections });
  banc.actualiser();
  assert.equal(comme(section(banc, 'couleurs').querySelector('.nombre')).textContent, '7');
  assert.equal(ouverte(banc, 'couleurs'), 'true');
  assert.ok(section(banc, 'couleurs').querySelector('input.case'));
});

test('les couleurs et les tailles d’un même modèle font deux cartes de corrections, chacune dans la section de sa sorte', () => {
  const banc = monter();
  const liaison = (id: string, champ: string, apres: string): Constat => ({
    id, code: 'C24', type: 'corriger', famille: 'liaisons', variants: ['alert:v:x'], layers: [`${id}:layer`], faits: { modele: 'Severity=info, Variant=standard', calque: 'container', champ },
    correction: { id, sorte: 'liaison', cible: { layer: `${id}:layer`, champ }, avant: null, apres: { nom: apres }, aRelire: { regle: 'Le variant modèle sert de modèle.', avant: null } },
  } as Constat);
  recevoirUneAnalyse(banc.etat, {
    ...modeleProposeApresLaCarte, retires: constatsCarteDuModele.map((constat) => constat.id),
    constats: [liaison('C24:couleur', 'fills', 'alert/colors/x/standard/background'), liaison('C24:taille', 'paddingLeft', 'alert/sizes/padding-x')],
  });
  banc.actualiser();
  const cartes = (id: string): ElementDeTest[] => section(banc, id).querySelectorAll('.bloc').filter((carte) => /Copier les liaisons de/.test(carte.textContent));
  assert.equal(cartes('couleurs').length, 1);
  assert.equal(cartes('tailles').length, 1);
});

test('une réponse d’une autre identité, ou d’une analyse périmée, ne change rien', () => {
  const banc = monter();
  recevoirUneAnalyse(banc.etat, { ...modeleProposeApresLaCarte, analyse: { ...IDENTITE, generation: 9 } });
  assert.equal(banc.etat.analyse!.tous.length, 2);
  banc.etat.analyse = { ...banc.etat.analyse!, perimee: true };
  recevoirUneAnalyse(banc.etat, modeleProposeApresLaCarte);
  assert.equal(banc.etat.analyse!.tous.length, 2);
});
