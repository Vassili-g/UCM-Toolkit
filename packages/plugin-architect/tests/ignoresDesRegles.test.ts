/** Les trois cartes de règles : Ignorer, Ne plus proposer après une nouvelle analyse, retour depuis les Ignorés et correction décochée. */
import assert from 'node:assert/strict';
import test, { beforeEach, afterEach } from 'node:test';

import type { Constat, ReleveDeComposant } from '@ucm-kit/core/controles';

import { poserLeDom, comme, type ElementDeTest } from './domDeTest';
import { atelierDEcriture } from './figmaDeTest';

poserLeDom();

import { monterLePanneau } from '../src/ui/analyse';
import { recevoirUneAnalyse, type AnalyseRecue } from '../src/ui/composant/analyse';
import type { PluginMessage } from '../src/messages';
import { commencerUneAnalyse, correctionsDeLAnalyse, reinitialiserLAnalyse, retenirLesCorrections, traiterAvec as analyserAvec } from '../src/sandbox/analyse';
import { rangementDeFigma, traiterAvec } from '../src/sandbox/ignores';
import type { Contexte } from '../src/sandbox/contexte';
import { lireLesIgnores, type PortDIgnores } from '../src/ecriture/ignores';
import type { ReleveDesRegles } from '../src/regles';

const { constatsDeRegles } = require('../galerie/etats/ignores.cjs') as { constatsDeRegles: Constat[] };
const { alertCorrections } = require('../galerie/etats/corrections.cjs');
const identite = { sujet: 'Alert', generation: 1 };
const autre: Constat = { id: 'autre', code: 'C31', type: 'verifier', famille: 'variants', variants: [], layers: [], faits: {} };

function monter(constats: readonly Constat[]) {
  const analyse: AnalyseRecue = {
    identite, statut: 'complete', constats: [...constats, autre], tous: [...constats, autre], ignores: [], repondues: {},
    variants: alertCorrections.sujet.variants, lecture: null, causes: [], sansTokens: false, progression: null, perimee: false, cause: null,
    ecriture: null, refusPendantEcriture: false, lot: null, appliquees: [], liaisons: null, liaisonsDemandees: false, recueA: 0,
  };
  const etat = { composant: { lecture: alertCorrections }, analyse, architecture: null, reference: null,
    panneau: { ouvert: true, largeurDeLaVue: 400, element: 'tout' } };
  const demandes: Array<{ portee: string; constats: string[] }> = [];
  const app = {
    etat, selectionner() {}, appliquer() {}, repondre() {}, ouvrirLaConfiguration() {}, rendre() {}, annulerLaReponse() {},
    ignorer: (constat: Constat) => demandes.push({ portee: 'constat', constats: [constat.id] }),
    ignorerLaProposition: (cibles: readonly Constat[]) => demandes.push({ portee: 'proposition', constats: cibles.map(({ id }) => id) }),
    nePlusIgnorer: (constat: Constat) => demandes.push({ portee: 'retablir', constats: [constat.id] }),
  };
  const panneau = monterLePanneau(app as never, { poserLesCorrections() {}, poserLaSelectionDuPlugin() {} } as never);
  panneau.mettreAJour();
  const racine = comme(panneau.element);
  return {
    etat, panneau, racine, demandes,
    recevoir(message: Parameters<typeof recevoirUneAnalyse>[1]) {
      recevoirUneAnalyse(etat as never, message);
      panneau.mettreAJour();
    },
  };
}

const bouton = (racine: ElementDeTest, libelle: string): ElementDeTest => {
  const trouve = racine.querySelectorAll('button').find((candidat) => candidat.textContent === libelle);
  assert.ok(trouve, `bouton ${libelle}`);
  return trouve;
};
const casesDeRegles = (racine: ElementDeTest) => racine.querySelectorAll('.section-element').find((section) => section.dataset.element === 'regles')?.querySelectorAll('input') ?? [];
const carteDeRegles = (racine: ElementDeTest): ElementDeTest => comme(racine.querySelectorAll('.section-element')
  .find((section) => section.dataset.element === 'regles')?.querySelector('.bloc'));

beforeEach(() => reinitialiserLAnalyse());
afterEach(() => reinitialiserLAnalyse());

for (const constat of constatsDeRegles) {
  const nom = `${constat.code} ${constat.faits.ecart ?? 'instance'}`;
  test(`${nom} propose Ignorer et Ne plus proposer dès l'ouverture`, () => {
    const banc = monter([constat]);
    const carte = carteDeRegles(banc.racine);
    assert.equal(bouton(carte, 'Ignorer').disabled, false);
    assert.equal(bouton(carte, 'Ne plus proposer').disabled, false);
    assert.ok(casesDeRegles(banc.racine).every((caseACocher) => !caseACocher.checked));
  });

  test(`${nom} rejoint les Ignorés puis revient décochée`, () => {
    const banc = monter([constat]);
    const caseDeRegle = casesDeRegles(banc.racine)[0];
    caseDeRegle.clic();
    bouton(carteDeRegles(banc.racine), 'Ignorer').clic();
    assert.deepEqual(banc.demandes, [{ portee: 'constat', constats: [constat.id] }]);
    banc.recevoir({ type: 'ignores', analyse: identite, constats: [constat.id] });
    assert.equal(casesDeRegles(banc.racine).length, 0);
    assert.equal(banc.racine.querySelectorAll('.muette').length, 1);
    bouton(banc.racine, 'Ne plus ignorer').clic();
    assert.deepEqual(banc.demandes.at(-1), { portee: 'retablir', constats: [constat.id] });
    banc.recevoir({ type: 'ignores', analyse: identite, constats: [] });
    assert.equal(banc.racine.querySelector('.muette'), null);
    assert.ok(casesDeRegles(banc.racine).length > 0);
    assert.ok(casesDeRegles(banc.racine).every((caseACocher) => !caseACocher.checked));
  });

  test(`${nom} reste À faire quand sa proposition est retirée`, () => {
    const banc = monter([constat]);
    bouton(banc.racine, 'Ne plus proposer').clic();
    assert.deepEqual(banc.demandes, [{ portee: 'proposition', constats: [constat.id] }]);
    banc.recevoir({ type: 'ignores', analyse: identite, constats: [], propositions: [constat.id] });
    assert.equal(casesDeRegles(banc.racine).length, 0);
    assert.equal(banc.racine.querySelectorAll('.bloc-constat').length, 2);
    assert.equal(banc.etat.analyse.constats[0].correction, undefined);
    assert.equal(banc.racine.querySelector('.muette'), null);
    assert.equal(bouton(banc.racine, 'Ignorer').disabled, false);
  });

  test(`${nom} se range et se rétablit dans le sandbox`, async () => {
    const atelier = atelierDEcriture();
    const envoyes: PluginMessage[] = [];
    const contexte: Contexte = { figma: atelier.api as never, envoyer: (message) => envoyes.push(message), surveillerLeDocument() {} };
    const analyse = commencerUneAnalyse('Alert', ['jeu'], contexte);
    retenirLesCorrections(analyse, [constat]);
    const traiter = traiterAvec(() => rangementDeFigma(atelier.api as unknown as PortDIgnores));
    await traiter({ type: 'ignorer', analyse, constat: constat.id, portee: 'constat' }, contexte);
    assert.deepEqual(envoyes.at(-1), { type: 'ignores', analyse, constats: [constat.id] });
    assert.equal(correctionsDeLAnalyse(analyse)?.has(constat.correction!.id), false);
    await traiter({ type: 'ne-plus-ignorer', analyse, constat: constat.id }, contexte);
    assert.deepEqual(envoyes.at(-1), { type: 'ignores', analyse, constats: [] });
    assert.equal(correctionsDeLAnalyse(analyse)?.has(constat.correction!.id), true);
    await traiter({ type: 'ignorer', analyse, constat: constat.id, portee: 'proposition' }, contexte);
    assert.deepEqual(envoyes.at(-1), { type: 'ignores', analyse, constats: [], propositions: [constat.id] });
  });

  test(`${nom} reste sans proposition après une nouvelle analyse du fichier`, async () => {
    const banc = monter([]);
    banc.etat.analyse = { ...banc.etat.analyse, identite: { sujet: 'Alert', generation: 0 } };
    const atelier = atelierDEcriture();
    const envoyes: PluginMessage[] = [];
    const contexte: Contexte = {
      figma: atelier.api as never, surveillerLeDocument() {},
      envoyer(message) {
        envoyes.push(message);
        switch (message.type) {
          case 'analyse-commencee': case 'analyse-en-cours': case 'analyse-provisoire': case 'analyse': case 'ignores':
            banc.recevoir(message);
        }
      },
    };
    const propriete = String(constat.faits.propriete ?? 'Size');
    const tag = propriete === 'Dismissible' ? 'boolean' : 'prop';
    const modele: ReleveDesRegles['modele'] = { nom: 'Alert', sections: [{ tag, elements: [
      { genre: 'regle', tag, cible: tag === 'boolean' ? propriete : `${propriete}.Small` },
    ] }] };
    const regles: ReleveDesRegles = {
      composant: { id: 'jeu', nom: 'Alert' }, instancePresente: constat.code !== 'C43', modele,
      proprietes: [propriete], documentees: constat.faits.ecart === 'sans-valeur' ? [propriete] : [],
      presentes: [], manquantes: modele,
    };
    const releve: ReleveDeComposant = {
      version: 1, jeu: { id: 'jeu', cle: 'Alert', nom: 'Alert' }, proprietes: [],
      variants: [{ id: alertCorrections.sujet.variants[0].id, nom: 'Size=Small', valeurs: { Size: 'Small' }, layers: [], modesEffectifs: {} }],
      lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
    };
    const analyser = analyserAvec({
      sujet: async () => ({ cle: 'Alert', noeud: { id: 'jeu' } as never, noeuds: ['jeu'] }),
      releve: async () => ({ statut: 'lu', releve }),
      catalogue: async () => ({ version: 1, library: null, collections: [], variables: [] }),
      moteur: async () => ({ etat: 'calculee', interne: {
        warnings: [], parties: new Map(), localisations: new Map(), couverture: { etat: 'complete' },
      } as never }),
      regles: async () => regles,
      ignores: async () => lireLesIgnores(atelier.api as unknown as PortDIgnores),
    });
    await analyser({ type: 'analyser' }, contexte);
    const premiere = banc.etat.analyse.identite;
    const lu = banc.etat.analyse.constats.find(({ code, famille }) => code === constat.code && famille === 'regles');
    assert.ok(lu?.correction);
    assert.ok(casesDeRegles(banc.racine).length > 0, `${banc.etat.analyse.statut} ${banc.racine.textContent}`);
    bouton(banc.racine, 'Ne plus proposer').clic();
    const ignorer = traiterAvec(() => rangementDeFigma(atelier.api as unknown as PortDIgnores));
    await ignorer({ type: 'ignorer', analyse: premiere, constat: lu.id, portee: 'proposition' }, contexte);
    assert.equal(casesDeRegles(banc.racine).length, 0);

    await analyser({ type: 'analyser', intention: 'actualiser' }, contexte);
    const suivante = banc.etat.analyse.identite;
    assert.ok(suivante.generation > premiere.generation);
    assert.equal(banc.etat.analyse.statut, 'complete');
    assert.ok(envoyes.some((message) => message.type === 'ignores' && message.analyse.generation === suivante.generation && message.propositions?.includes(lu.id)));
    assert.equal(banc.etat.analyse.constats.find(({ id }) => id === lu.id)?.correction, undefined);
    assert.ok(banc.etat.analyse.constats.some(({ id }) => id === lu.id));
    assert.equal(casesDeRegles(banc.racine).length, 0);
    assert.equal(banc.racine.querySelector('.muette'), null);
    assert.equal(bouton(banc.racine, 'Ignorer').disabled, false);
  });
}

test('Ignorer écarte les deux constats C45 d’une même carte de règles', () => {
  const constats = constatsDeRegles.slice(1);
  const banc = monter(constats);
  const carte = carteDeRegles(banc.racine);
  assert.equal(carte.querySelectorAll('.diff').length, 2);
  bouton(carte, 'Ignorer').clic();
  assert.deepEqual(banc.demandes, constats.map(({ id }) => ({ portee: 'constat', constats: [id] })));
  banc.recevoir({ type: 'ignores', analyse: identite, constats: constats.map(({ id }) => id) });
  assert.equal(banc.racine.querySelectorAll('.muette').length, 2);
});

test('un modèle proposé ensuite ne rétablit pas une proposition de règles écartée', () => {
  const constat = constatsDeRegles[0];
  const banc = monter([constat]);
  banc.recevoir({ type: 'ignores', analyse: identite, constats: [], propositions: [constat.id] });
  banc.recevoir({ type: 'modele-propose', analyse: identite, variant: 'autre-variant', constats: [], retires: [] });
  assert.equal(banc.etat.analyse.constats.find(({ id }) => id === constat.id)?.correction, undefined);
  assert.equal(casesDeRegles(banc.racine).length, 0);
});
