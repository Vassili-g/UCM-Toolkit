/** Le domaine corrections : retrouver les corrections de l'analyse courante, les sautées par motif, une opération à la fois, la sélection du plugin. */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import type { CatalogueDeReference, Constat, Correction, ReleveDeComposant } from '@ucm-kit/core/controles';
import type { ResultatSansPublication } from 'ucm-plugin-socle/src/composant/contract/exportComponent';

import { selectionnerLesLayers, type ApiDeSelection } from '../src/ecriture/selection';
import type { PluginMessage } from '../src/messages';
import type { IdentiteDAnalyse } from '../src/messages/commun';
import {
  commencerUneAnalyse, correctionsDeLAnalyse, prendreLaPlaceDUneEcriture, reinitialiserLAnalyse, retenirLesCorrections, surChangementDuDocument, traiterAvec as traiterAnalyse,
} from '../src/sandbox/analyse';
import { origineDeLaSelection } from '../src/sandbox/commun';
import type { Contexte } from '../src/sandbox/contexte';
import { resumeDuLot, traiterAvec, type Ecritures } from '../src/sandbox/corrections';
import { atelierDEcriture } from './figmaDeTest';

function banc() {
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: {} as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument() {} };
  return { contexte, envoyes };
}

const correction = (id: string, sorte: Correction['sorte']): Correction => ({ id, sorte, cible: { layer: '1:1', champ: 'paddingLeft' }, avant: null, apres: { cle: 'k', nom: 'n' }, aRelire: { regle: 'r', avant: null } });
const constatDe = (c: Correction): Constat => ({ id: `constat:${c.id}`, code: 'C15', type: 'corriger', famille: 'liaisons', variants: [], layers: ['1:1'], faits: {}, correction: c });

/** Une analyse courante qui porte ces corrections. */
function analyseAvec(b: ReturnType<typeof banc>, ...corrections: Correction[]): IdentiteDAnalyse {
  const identite = commencerUneAnalyse('Alert', ['jeu', 'variant'], b.contexte);
  retenirLesCorrections(identite, corrections.map(constatDe));
  return identite;
}

/** Des écritures qui comptent leurs appels ; `lot` écrit tout ce qu'on lui donne sauf `refusees`. */
function ecritures(sur: { refusees?: Record<string, string>; leve?: boolean; attente?: Promise<void> } = {}) {
  const lots: string[][] = [];
  const selections: Array<readonly string[]> = [];
  const doubles: Ecritures = {
    async lot(corrections) {
      lots.push(corrections.map((c) => c.id));
      await sur.attente;
      if (sur.leve) throw new Error('Figma refuse');
      return {
        ecrites: corrections.filter((c) => !sur.refusees?.[c.id]).map((c) => c.id),
        sautees: corrections.filter((c) => sur.refusees?.[c.id]).map((c) => ({ id: c.id, motif: sur.refusees?.[c.id] as 'erreur' })),
      };
    },
    async selectionner(layers) {
      selections.push(layers);
      return layers;
    },
  };
  return { doubles, lots, selections };
}

const deType = <T extends PluginMessage['type']>(envoyes: PluginMessage[], type: T) => envoyes.filter((m) => m.type === type) as Array<Extract<PluginMessage, { type: T }>>;

beforeEach(() => reinitialiserLAnalyse());

test('les liaisons et les règles de l’analyse courante s’écrivent, puis perime ecriture', async () => {
  const b = banc();
  const e = ecritures();
  const analyse = analyseAvec(b, correction('l1', 'liaison'), correction('l2', 'liaison'), correction('r1', 'regles'));
  await traiterAvec(e.doubles)({ type: 'appliquer-corrections', analyse, ids: ['l1', 'r1', 'l2'] }, b.contexte);
  assert.deepEqual(e.lots, [['l1', 'r1', 'l2']]);
  assert.deepEqual(b.envoyes, [
    { type: 'corrections-appliquees', analyse, ecrites: 3, sautees: [], resume: '2 layers liés, 1 instance de règles créée' },
    { type: 'perime', analyse, cause: 'ecriture' },
  ]);
});

test('une autre sorte est sautée non-pris-en-charge, un identifiant inconnu correction-inconnue', async () => {
  const b = banc();
  const e = ecritures();
  const analyse = analyseAvec(b, correction('l1', 'liaison'), correction('s1', 'scope'), correction('a1', 'alias-de-mode'), correction('v1', 'variable'));
  await traiterAvec(e.doubles)({ type: 'appliquer-corrections', analyse, ids: ['l1', 's1', 'a1', 'v1', 'fantome'] }, b.contexte);
  assert.deepEqual(e.lots, [['l1']]);
  const [rendu] = deType(b.envoyes, 'corrections-appliquees');
  assert.equal(rendu.ecrites, 1);
  assert.deepEqual(rendu.sautees, [
    { id: 's1', motif: 'non-pris-en-charge' }, { id: 'a1', motif: 'non-pris-en-charge' },
    { id: 'v1', motif: 'non-pris-en-charge' }, { id: 'fantome', motif: 'correction-inconnue' },
  ]);
});

test('une correction nom-de-valeur entre dans le lot et se compte dans le résumé', async () => {
  const b = banc();
  const e = ecritures();
  const analyse = analyseAvec(b, correction('n1', 'nom-de-valeur'));
  await traiterAvec(e.doubles)({ type: 'appliquer-corrections', analyse, ids: ['n1'] }, b.contexte);
  assert.deepEqual(e.lots, [['n1']]);
  const [rendu] = deType(b.envoyes, 'corrections-appliquees');
  assert.equal(rendu.ecrites, 1);
  assert.equal(rendu.resume, '1 valeur de variante renommée');
});

test('les sautées du lot sont rendues avec leur motif, comptées dans le résumé', async () => {
  const b = banc();
  const e = ecritures({ refusees: { l2: 'objet-change', l3: 'fait-faux' } });
  const analyse = analyseAvec(b, correction('l1', 'liaison'), correction('l2', 'liaison'), correction('l3', 'liaison'));
  await traiterAvec(e.doubles)({ type: 'appliquer-corrections', analyse, ids: ['l1', 'l2', 'l3'] }, b.contexte);
  const [rendu] = deType(b.envoyes, 'corrections-appliquees');
  assert.deepEqual(rendu.sautees, [{ id: 'l2', motif: 'objet-change' }, { id: 'l3', motif: 'fait-faux' }]);
  assert.equal(rendu.resume, '1 layer lié. 2 corrections sautées : 1 car le composant a changé depuis l’analyse, 1 car ce que l’analyse avait lu n’est plus vrai.');
});

test('rien d’écrit : corrections-appliquees sans perime', async () => {
  const b = banc();
  const e = ecritures({ refusees: { l1: 'cible-introuvable' } });
  const analyse = analyseAvec(b, correction('l1', 'liaison'));
  await traiterAvec(e.doubles)({ type: 'appliquer-corrections', analyse, ids: ['l1'] }, b.contexte);
  assert.deepEqual(deType(b.envoyes, 'perime'), []);
  assert.equal(deType(b.envoyes, 'corrections-appliquees')[0].resume, 'Aucune correction écrite. 1 correction sautée : 1 car la variable cible est introuvable.');
});

test('une identité qui n’est pas la courante n’écrit rien : tout est sauté analyse-perimee', async () => {
  const b = banc();
  const e = ecritures();
  const ancienne = analyseAvec(b, correction('l1', 'liaison'));
  const courante = analyseAvec(b, correction('l1', 'liaison'));
  await traiterAvec(e.doubles)({ type: 'appliquer-corrections', analyse: ancienne, ids: ['l1', 'l2'] }, b.contexte);
  await traiterAvec(e.doubles)({ type: 'appliquer-corrections', analyse: { sujet: 'Autre', generation: courante.generation }, ids: ['l1'] }, b.contexte);
  assert.deepEqual(e.lots, []);
  const rendus = deType(b.envoyes, 'corrections-appliquees');
  assert.deepEqual(rendus[0].sautees, [{ id: 'l1', motif: 'analyse-perimee' }, { id: 'l2', motif: 'analyse-perimee' }]);
  assert.equal(rendus[0].ecrites, 0);
  assert.deepEqual(rendus[1].sautees, [{ id: 'l1', motif: 'analyse-perimee' }]);
  assert.deepEqual(deType(b.envoyes, 'perime'), []);
});

test('une analyse périmée n’écrit rien', async () => {
  const b = banc();
  const e = ecritures();
  const analyse = analyseAvec(b, correction('l1', 'liaison'));
  surChangementDuDocument(['variant'], b.contexte);
  assert.equal(correctionsDeLAnalyse(analyse), null);
  await traiterAvec(e.doubles)({ type: 'appliquer-corrections', analyse, ids: ['l1'] }, b.contexte);
  assert.deepEqual(e.lots, []);
  assert.deepEqual(deType(b.envoyes, 'corrections-appliquees')[0].sautees, [{ id: 'l1', motif: 'analyse-perimee' }]);
  assert.equal(deType(b.envoyes, 'perime').length, 1, 'la péremption vient du changement, pas de l’écriture');
});

test('une demande pendant une écriture rend occupe, y compris une analyse ; la place se libère ensuite', async () => {
  const b = banc();
  let ouvrir!: () => void;
  const e = ecritures({ attente: new Promise<void>((resolve) => { ouvrir = resolve; }) });
  const analyse = analyseAvec(b, correction('l1', 'liaison'));
  const traiter = traiterAvec(e.doubles);
  const premiere = traiter({ type: 'appliquer-corrections', analyse, ids: ['l1'] }, b.contexte);
  await new Promise((resolve) => setTimeout(resolve, 5));
  await traiter({ type: 'appliquer-corrections', analyse, ids: ['l1'] }, b.contexte);
  await traiterAnalyse({ sujet: async () => null, releve: async () => ({ statut: 'sans-sujet' }), catalogue: async () => ({ version: 1, library: null, collections: [], variables: [] }), moteur: async () => ({ etat: 'annulee' }) as ResultatSansPublication })({ type: 'analyser' }, b.contexte);
  assert.deepEqual(deType(b.envoyes, 'occupe'), [{ type: 'occupe', analyse }, { type: 'occupe', analyse }]);
  assert.deepEqual(e.lots, [['l1']]);
  ouvrir();
  await premiere;
  assert.equal(deType(b.envoyes, 'corrections-appliquees').length, 1);
  await traiter({ type: 'appliquer-corrections', analyse: { sujet: 'Alert', generation: analyse.generation }, ids: [] }, b.contexte);
  assert.equal(deType(b.envoyes, 'occupe').length, 2);
});

test('une demande pendant une analyse rend occupe avec l’identité de l’analyse', async () => {
  const b = banc();
  const e = ecritures();
  let ouvrir!: () => void;
  const porte = new Promise<void>((resolve) => { ouvrir = resolve; });
  const analyser = traiterAnalyse({
    sujet: async () => ({ cle: 'Alert', noeud: { id: 'jeu' } as never, noeuds: ['jeu'] }),
    releve: async () => { await porte; return { statut: 'sans-sujet' }; },
    catalogue: async () => ({ version: 1, library: null, collections: [], variables: [] }),
    moteur: async () => ({ etat: 'annulee' }) as ResultatSansPublication,
  })({ type: 'analyser' }, b.contexte);
  await new Promise((resolve) => setTimeout(resolve, 5));
  const courante = commencerUneAnalyse('Alert', ['jeu'], b.contexte);
  await traiterAvec(e.doubles)({ type: 'appliquer-corrections', analyse: courante, ids: ['l1'] }, b.contexte);
  assert.equal(deType(b.envoyes, 'occupe').length, 1);
  assert.deepEqual(e.lots, []);
  ouvrir();
  await analyser;
});

test('un lot qui lève : toutes sautées erreur, l’analyse se périme', async () => {
  const b = banc();
  const e = ecritures({ leve: true });
  const analyse = analyseAvec(b, correction('l1', 'liaison'), correction('r1', 'regles'));
  await traiterAvec(e.doubles)({ type: 'appliquer-corrections', analyse, ids: ['l1', 'r1'] }, b.contexte);
  assert.deepEqual(deType(b.envoyes, 'corrections-appliquees')[0].sautees, [{ id: 'l1', motif: 'erreur' }, { id: 'r1', motif: 'erreur' }]);
  assert.deepEqual(deType(b.envoyes, 'perime'), [{ type: 'perime', analyse, cause: 'ecriture' }]);
});

test('une analyse retient les corrections de ses constats, par identifiant', async () => {
  const b = banc();
  const modele = { nom: 'Alert', sections: [] };
  await traiterAnalyse({
    sujet: async () => ({ cle: 'Alert', noeud: { id: 'jeu-Alert' } as never, noeuds: ['jeu-Alert'] }),
    releve: async () => ({ statut: 'lu', releve: { version: 1, jeu: { cle: 'Alert', id: 'jeu-Alert', nom: 'Alert' }, proprietes: [], variants: [{ id: 'v', nom: 'v', valeurs: {}, layers: [], modesEffectifs: {} }], lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb' } }),
    catalogue: async () => ({ version: 1, library: null, collections: [], variables: [] }),
    moteur: async () => ({ etat: 'calculee', interne: { warnings: [], parties: new Map(), localisations: new Map(), couverture: { etat: 'complete' } } }) as unknown as ResultatSansPublication,
    regles: async () => ({ composant: { id: 'jeu-Alert', nom: 'Alert' }, instancePresente: false, modele, proprietes: [], documentees: [], presentes: [], manquantes: { nom: 'Alert', sections: [] } }),
  })({ type: 'analyser' }, b.contexte);
  const [rendu] = deType(b.envoyes, 'analyse');
  const retenues = correctionsDeLAnalyse(rendu.analyse);
  assert.deepEqual([...(retenues ?? new Map()).keys()], ['regles:creer:jeu-Alert']);
});

test('resume : les variantes de la ligne de réussite', () => {
  assert.equal(resumeDuLot(8, 1, []), '8 layers liés, 1 instance de règles créée');
  assert.equal(resumeDuLot(1, 0, []), '1 layer lié');
  assert.equal(resumeDuLot(0, 1, []), '1 instance de règles créée');
  assert.equal(resumeDuLot(0, 0, []), 'Aucune correction écrite');
  assert.equal(resumeDuLot(2, 0, [{ motif: 'erreur' }]), '2 layers liés. 1 correction sautée : 1 car Figma a refusé l’écriture.');
  assert.equal(resumeDuLot(0, 0, [{ motif: 'non-pris-en-charge' }, { motif: 'non-pris-en-charge' }]), 'Aucune correction écrite. 2 corrections sautées : 2 car ce genre de correction n’est pas encore pris en charge.');
  assert.equal(resumeDuLot(1, 0, [{ motif: 'non-ucm' }, { motif: 'instance-remplie' }]), '1 layer lié. 2 corrections sautées : 1 car le fichier ne déclare plus UCM, 1 car l’instance de règles contient déjà des règles.');
});

test('selectionner : une identité périmée est ignorée, la courante passe', async () => {
  const b = banc();
  const e = ecritures();
  const ancienne = analyseAvec(b);
  const courante = analyseAvec(b);
  await traiterAvec(e.doubles)({ type: 'selectionner', analyse: ancienne, layers: ['1:1'] }, b.contexte);
  assert.deepEqual(e.selections, []);
  await traiterAvec(e.doubles)({ type: 'selectionner', analyse: courante, layers: ['1:1', '1:2'] }, b.contexte);
  assert.deepEqual(e.selections, [['1:1', '1:2']]);
  assert.deepEqual(b.envoyes, []);
});

test('selectionnerLesLayers : retient la sélection posée pour que le selectionchange suivant porte plugin', async () => {
  const a = atelierDEcriture();
  const un = a.layer('1:1', 'FRAME');
  const deux = a.layer('1:2', 'FRAME');
  const autrePage = a.layer('1:3', 'FRAME', {}, { id: '0:2', type: 'PAGE', parent: null });
  const supprime = a.layer('1:4', 'FRAME', { removed: true });
  const retenues: Array<readonly string[]> = [];
  const retenir = (ids: readonly string[]): void => { retenues.push(ids); };
  const posees = await selectionnerLesLayers(['1:1', '1:2', '1:2', '1:3', '1:4', '9:9'], retenir, a.api as unknown as ApiDeSelection);
  assert.deepEqual(posees, ['1:1', '1:2']);
  assert.deepEqual(a.selection(), [un, deux]);
  assert.deepEqual(retenues, [['1:1', '1:2']]);
  assert.deepEqual(a.journal, ['selection:1:1,1:2']);
  void autrePage;
  void supprime;
});

test('selectionnerLesLayers : aucun layer restant, la sélection ne change pas', async () => {
  const a = atelierDEcriture();
  a.layer('1:3', 'FRAME', {}, { id: '0:2', type: 'PAGE', parent: null });
  const retenues: Array<readonly string[]> = [];
  assert.deepEqual(await selectionnerLesLayers(['1:3', '9:9'], (ids) => retenues.push(ids), a.api as unknown as ApiDeSelection), []);
  assert.deepEqual(retenues, []);
  assert.deepEqual(a.journal, []);
});

test('la sélection posée par le domaine est reconnue comme celle du plugin, une seule fois', async () => {
  const a = atelierDEcriture();
  a.layer('1:1', 'FRAME');
  const { retenirLaSelectionDuPlugin } = await import('../src/sandbox/commun');
  await selectionnerLesLayers(['1:1'], retenirLaSelectionDuPlugin, a.api as unknown as ApiDeSelection);
  assert.equal(origineDeLaSelection(['1:1']), 'plugin');
  assert.equal(origineDeLaSelection(['1:1']), 'figma');
});

const SEVERITY_INFO = 'alert/colors/info/standard/background';
const SEVERITY_ERROR = 'alert/colors/error/outlined/background';

function leLayer(id: string, lie: boolean) {
  return {
    id, nom: 'container', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 },
    peintures: [{ champ: 'fills' as const, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' }], valeursEnDur: [],
    liaisons: lie ? [{ champ: 'fills', indice: 0, porteur: id, variable: { id: 'k-info', cle: 'k-info', nom: SEVERITY_INFO, collection: 'components', distante: false } }] : [],
  };
}

const releveDuModele: ReleveDeComposant = {
  version: 1, jeu: { cle: 'alert-set', id: 'alert-set', nom: 'Alert' },
  proprietes: [
    { nom: 'Severity', type: 'VARIANT', valeurs: ['info', 'error'], defaut: 'info' },
    { nom: 'Variant', type: 'VARIANT', valeurs: ['standard', 'outlined'], defaut: 'standard' },
  ],
  variants: [
    { id: 'm', nom: 'Severity=info, Variant=standard', valeurs: { Severity: 'info', Variant: 'standard' }, modesEffectifs: {}, layers: [leLayer('m-1', true)] },
    { id: 'v', nom: 'Severity=error, Variant=outlined', valeurs: { Severity: 'error', Variant: 'outlined' }, modesEffectifs: {}, layers: [leLayer('v-1', false)] },
  ],
  lecture: { layersLus: 2, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
};
const catalogueDuModele: CatalogueDeReference = {
  version: 1, library: null, collections: [{ cle: 'components', nom: 'components', role: 'components', modes: [], etat: 'lue' }],
  variables: [
    { cle: 'k-info', nom: SEVERITY_INFO, collection: 'components', type: 'COLOR', etat: 'presente' },
    { cle: 'k-error', nom: SEVERITY_ERROR, collection: 'components', type: 'COLOR', etat: 'presente' },
  ],
};

function analyseDuModele(b: ReturnType<typeof banc>): IdentiteDAnalyse {
  const identite = commencerUneAnalyse('Alert', ['jeu', 'm', 'v'], b.contexte);
  retenirLesCorrections(identite, [], releveDuModele, [], catalogueDuModele);
  return identite;
}

test('servir-de-modele rend modele-propose, puis appliquer-corrections accepte ses ids', async () => {
  const b = banc();
  const e = ecritures();
  const analyse = analyseDuModele(b);
  await traiterAvec(e.doubles)({ type: 'servir-de-modele', analyse, variant: 'm' }, b.contexte);
  const [propose] = deType(b.envoyes, 'modele-propose');
  assert.equal(propose.variant, 'm');
  assert.deepEqual(propose.constats.map((constat) => constat.id), ['C24:modele:v:v-1:fills:0']);
  assert.equal(correctionsDeLAnalyse(analyse)?.get('C24:modele:v:v-1:fills:0')?.apres.cle, 'k-error');
  assert.deepEqual(e.lots, [], 'rien ne s’écrit en proposant');
  await traiterAvec(e.doubles)({ type: 'appliquer-corrections', analyse, ids: ['C24:modele:v:v-1:fills:0'] }, b.contexte);
  assert.deepEqual(e.lots, [['C24:modele:v:v-1:fills:0']]);
  assert.equal(deType(b.envoyes, 'corrections-appliquees')[0].ecrites, 1);
});

test('servir-de-modele depuis un C81 rend ses propositions et retire les C81 de ce modèle', async () => {
  const b = banc();
  const e = ecritures();
  const analyse = commencerUneAnalyse('Alert', ['jeu', 'm', 'v'], b.contexte);
  const c81 = (sorte: string, modele: string): Constat => ({
    id: `C81:${sorte}:${modele}`, code: 'C81', type: 'corriger', famille: sorte === 'couleurs' ? 'liaisons' : 'tailles',
    variants: [modele], layers: ['m-1'], faits: { modele, layers: 1, variants: 1, liaisons: 1 },
  });
  const constats = [c81('couleurs', 'm'), c81('tailles', 'v')];
  retenirLesCorrections(analyse, constats, releveDuModele, constats, catalogueDuModele);
  await traiterAvec(e.doubles)({ type: 'servir-de-modele', analyse, variant: constats[0].faits.modele as string }, b.contexte);
  const [propose] = deType(b.envoyes, 'modele-propose');
  assert.deepEqual(propose.constats.map((constat) => constat.id), ['C24:modele:v:v-1:fills:0']);
  assert.deepEqual(propose.retires, ['C81:couleurs:m'], 'le C81 d’un autre modèle reste');
});

test('servir-de-modele : une autre identité est ignorée, une analyse périmée ne rend aucun constat', async () => {
  const b = banc();
  const e = ecritures();
  const analyse = analyseDuModele(b);
  await traiterAvec(e.doubles)({ type: 'servir-de-modele', analyse: { sujet: 'Alert', generation: analyse.generation + 1 }, variant: 'm' }, b.contexte);
  assert.deepEqual(deType(b.envoyes, 'modele-propose'), []);
  surChangementDuDocument(['v'], b.contexte);
  await traiterAvec(e.doubles)({ type: 'servir-de-modele', analyse, variant: 'm' }, b.contexte);
  assert.deepEqual(deType(b.envoyes, 'modele-propose').map((m) => m.constats), [[]]);
});

test('servir-de-modele pendant une opération rend occupe', async () => {
  const b = banc();
  const analyse = analyseDuModele(b);
  const place = await prendreLaPlaceDUneEcriture(analyse);
  await traiterAvec(ecritures().doubles)({ type: 'servir-de-modele', analyse, variant: 'm' }, b.contexte);
  assert.deepEqual(deType(b.envoyes, 'occupe'), [{ type: 'occupe', analyse }]);
  assert.deepEqual(deType(b.envoyes, 'modele-propose'), []);
  if ('liberer' in place) place.liberer();
});
