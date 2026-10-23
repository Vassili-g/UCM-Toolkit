/** L'analyse : identité, opération unique, annulation, erreur du moteur, résultat partiel, péremption. */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import type { CatalogueDeReference, ReleveDeComposant } from '@ucm-kit/core/controles';
import { ComponentExportError, type ComponentExport, type ResultatDAnalyse } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import { phraseDe, type PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';

import type { PluginMessage } from '../src/messages';
import type { IdentiteDAnalyse } from '../src/messages/commun';
import { analyseCourante, perimerApresUneEcriture, reinitialiserLAnalyse, surChangementDuDocument, surSelection, traiterAvec, type Lecteurs, type SujetAAnalyser } from '../src/sandbox/analyse';
import { origineDeLaSelection, retenirLaSelectionDuPlugin } from '../src/sandbox/commun';
import type { Contexte } from '../src/sandbox/contexte';

const catalogueVide: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };

function releveDe(nom: string, lecture: Partial<ReleveDeComposant['lecture']> = {}): ReleveDeComposant {
  return {
    version: 1,
    jeu: { cle: nom, id: `jeu-${nom}`, nom },
    proprietes: [],
    variants: [{ id: `v-${nom}`, nom: `${nom} défaut`, valeurs: {}, layers: [], modesEffectifs: {} }],
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [], ...lecture },
    espaceDeCouleur: 'srgb',
  };
}

function exportDe(points: readonly PointACorriger[] = []): ComponentExport {
  const phrases = points.map(phraseDe);
  return { warnings: phrases, parties: new Map(points.map((p, i) => [phrases[i], p])), localisations: new Map() } as unknown as ComponentExport;
}

const pointDeTest: PointACorriger = { famille: 'regles', titre: 'Règles : « À compléter » est resté.', impact: 'Impact.', action: 'Action.' };

interface Banc {
  contexte: Contexte;
  envoyes: PluginMessage[];
}

function banc(architecture: 'ucm' | 'libre' | 'absente' = 'absente'): Banc {
  const envoyes: PluginMessage[] = [];
  const declaration = architecture === 'absente' ? '' : JSON.stringify({ version: 1, ucm: architecture === 'ucm' });
  return { envoyes, contexte: { figma: { root: { getSharedPluginData: () => declaration } } as unknown as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument() {} } };
}

/** Des lectures sur des doubles : seul le moteur change d'un test à l'autre. */
function lecteurs(moteur: (jeton: { readonly leve: boolean }) => Promise<ResultatDAnalyse>, nom = 'Alert', catalogue: CatalogueDeReference = catalogueVide): Lecteurs {
  return {
    async sujet() {
      return { cle: nom, noeud: { id: `jeu-${nom}` } as never, noeuds: [`jeu-${nom}`, `v-${nom}`] } satisfies SujetAAnalyser;
    },
    async releve(sujet) {
      return { statut: 'lu', releve: releveDe(sujet.cle) };
    },
    async catalogue() {
      return catalogue;
    },
    moteur: async (_sujet, jeton) => moteur(jeton),
  };
}

const complete = (points: readonly PointACorriger[] = []) => async (): Promise<ResultatDAnalyse> => ({ etat: 'complete', export: exportDe(points) });
const attendre = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const deType = <T extends PluginMessage['type']>(b: Banc, type: T) => b.envoyes.filter((m) => m.type === type) as Array<Extract<PluginMessage, { type: T }>>;

beforeEach(() => reinitialiserLAnalyse());

test('une analyse complète rend l’identité dans chaque message et les constats du moteur traduits', async () => {
  const b = banc();
  await traiterAvec(lecteurs(complete([pointDeTest])))({ type: 'analyser' }, b.contexte);
  const [commencee] = deType(b, 'analyse-commencee');
  const [enCours] = deType(b, 'analyse-en-cours');
  const [resultat] = deType(b, 'analyse');
  assert.equal(commencee.analyse.sujet, 'Alert');
  assert.deepEqual(enCours.analyse, commencee.analyse);
  assert.deepEqual(resultat.analyse, commencee.analyse);
  assert.equal(resultat.statut, 'complete');
  assert.deepEqual(resultat.constats.map((c) => c.code), ['C44']);
  assert.deepEqual(resultat.variants, [{ id: 'v-Alert', nom: 'Alert défaut' }]);
});

test('une analyse rend C43 quand le composant n’a pas d’instance de règles, C45 quand elle ne dit pas ses propriétés', async () => {
  const modele = { nom: 'Alert', sections: [{ tag: 'prop' as const, elements: [{ genre: 'regle' as const, tag: 'prop' as const, cible: 'severity.info' }] }] };
  const avec = (instancePresente: boolean, documentees: string[]): Lecteurs => ({
    ...lecteurs(complete()),
    regles: async () => ({ composant: { id: 'jeu-Alert', nom: 'Alert' }, instancePresente, modele, proprietes: ['severity'], documentees }),
  });
  const sans = banc();
  await traiterAvec(avec(false, []))({ type: 'analyser' }, sans.contexte);
  assert.deepEqual(deType(sans, 'analyse')[0].constats.map((c) => c.code), ['C43']);
  reinitialiserLAnalyse();
  const incomplete = banc();
  await traiterAvec(avec(true, ['tone']))({ type: 'analyser' }, incomplete.contexte);
  assert.deepEqual(deType(incomplete, 'analyse')[0].constats.map((c) => c.code), ['C45', 'C45']);
  reinitialiserLAnalyse();
  const juste = banc();
  await traiterAvec(avec(true, ['severity']))({ type: 'analyser' }, juste.contexte);
  assert.deepEqual(deType(juste, 'analyse')[0].constats, []);
});

test('une lecture des règles qui lève ne coûte que ses constats', async () => {
  const b = banc();
  await traiterAvec({ ...lecteurs(complete([pointDeTest])), regles: async () => { throw new Error('page illisible'); } })({ type: 'analyser' }, b.contexte);
  assert.deepEqual(deType(b, 'analyse')[0].constats.map((c) => c.code), ['C44']);
});

function catalogueAvecUnToken(nom: string): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: [{ cle: 'components', nom: 'Components', role: 'components', etat: 'lue', modes: [{ id: 'light', nom: 'Light' }] }],
    variables: [{ cle: 'fond', nom, collection: 'components', type: 'COLOR', etat: 'presente' }],
  };
}

test('sansTokens : vrai quand la collection components n’a aucune variable du jeu, faux dès qu’elle en a une', async () => {
  const sans = banc();
  await traiterAvec(lecteurs(complete()))({ type: 'analyser' }, sans.contexte);
  assert.equal(deType(sans, 'analyse')[0].sansTokens, true);

  reinitialiserLAnalyse();
  const autreJeu = banc();
  await traiterAvec(lecteurs(complete(), 'Alert', catalogueAvecUnToken('Button/color/info/background')))({ type: 'analyser' }, autreJeu.contexte);
  assert.equal(deType(autreJeu, 'analyse')[0].sansTokens, true);

  reinitialiserLAnalyse();
  const avec = banc();
  await traiterAvec(lecteurs(complete(), 'Alert', catalogueAvecUnToken('Alert/color/info/background')))({ type: 'analyser' }, avec.contexte);
  assert.equal(deType(avec, 'analyse')[0].sansTokens, false);
});

test('sansTokens : faux quand le relevé n’est pas lu', async () => {
  const b = banc();
  await traiterAvec({ ...lecteurs(complete()), releve: async () => ({ statut: 'sans-sujet' }) })({ type: 'analyser' }, b.contexte);
  assert.equal(deType(b, 'analyse')[0].sansTokens, false);
});

test('une analyse lente d’Alert puis la sélection de Button : perime selection, la réponse porte l’ancienne identité', async () => {
  const b = banc();
  let ouvrir!: () => void;
  const porte = new Promise<void>((resolve) => { ouvrir = resolve; });
  const traiter = traiterAvec(lecteurs(async () => { await porte; return complete()(); }));
  const analyse = traiter({ type: 'analyser' }, b.contexte);
  await attendre(5);
  const alert = analyseCourante() as IdentiteDAnalyse;
  surSelection('jeu-Button', 'figma', b.contexte);
  ouvrir();
  await analyse;
  assert.deepEqual(deType(b, 'perime'), [{ type: 'perime', analyse: alert, cause: 'selection' }]);
  assert.deepEqual(deType(b, 'analyse')[0].analyse, alert);
  assert.equal(alert.sujet, 'Alert');
});

test('une seconde analyse pendant une analyse rend occupe et ne lance rien', async () => {
  const b = banc();
  let ouvrir!: () => void;
  const porte = new Promise<void>((resolve) => { ouvrir = resolve; });
  let lancees = 0;
  const traiter = traiterAvec(lecteurs(async () => { lancees += 1; await porte; return complete()(); }));
  const premiere = traiter({ type: 'analyser' }, b.contexte);
  await attendre(5);
  await traiter({ type: 'analyser' }, b.contexte);
  const [occupe] = deType(b, 'occupe');
  assert.deepEqual(occupe.analyse, analyseCourante());
  ouvrir();
  await premiere;
  assert.equal(lancees, 1);
  assert.equal(deType(b, 'analyse-commencee').length, 1);
  assert.equal(deType(b, 'analyse').length, 1);
});

test('annuler-analyse de l’identité courante rend annulee sans constat ; une identité périmée est ignorée', async () => {
  const b = banc();
  const traiter = traiterAvec(lecteurs(async (jeton) => {
    while (!jeton.leve) await attendre(2);
    return { etat: 'annulee' };
  }));
  const analyse = traiter({ type: 'analyser' }, b.contexte);
  await attendre(5);
  const courante = analyseCourante() as IdentiteDAnalyse;
  await traiter({ type: 'annuler-analyse', analyse: { sujet: courante.sujet, generation: courante.generation - 1 } }, b.contexte);
  await attendre(10);
  assert.equal(deType(b, 'analyse').length, 0);
  await traiter({ type: 'annuler-analyse', analyse: courante }, b.contexte);
  await analyse;
  const [resultat] = deType(b, 'analyse');
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
});

test('une erreur du moteur rend arretee avec un seul constat bloquant', async () => {
  for (const erreur of [new ComponentExportError('Le composant est illisible.'), new Error('boum')]) {
    const b = banc();
    await traiterAvec(lecteurs(async () => { throw erreur; }))({ type: 'analyser' }, b.contexte);
    const [resultat] = deType(b, 'analyse');
    assert.equal(resultat.statut, 'arretee');
    assert.equal(resultat.constats.length, 1);
    assert.equal(resultat.constats[0].type, 'bloquant');
    assert.equal(resultat.constats[0].famille, 'export');
    assert.deepEqual(resultat.constats[0].faits, { message: erreur.message });
    assert.equal(resultat.lecture, null);
    reinitialiserLAnalyse();
  }
});

test('un résultat partiel du moteur rend partielle, avec ses constats et la lecture', async () => {
  const b = banc();
  const lec = lecteurs(async () => ({ etat: 'partielle', export: exportDe([pointDeTest]), lus: 1, nonLus: 3 }));
  await traiterAvec({ ...lec, releve: async (sujet) => ({ statut: 'lu', releve: releveDe(sujet.cle, { variantsNonLus: ['x', 'y', 'z'] }) }) })({ type: 'analyser' }, b.contexte);
  const [resultat] = deType(b, 'analyse');
  assert.equal(resultat.statut, 'partielle');
  assert.deepEqual(resultat.constats.map((c) => c.code), ['C44']);
  assert.deepEqual(resultat.lecture?.variantsNonLus, ['x', 'y', 'z']);
});

test('un clic sur un constat (sélection du plugin) ne change ni le sujet ni la génération et ne périme rien', async () => {
  const b = banc();
  await traiterAvec(lecteurs(complete()))({ type: 'analyser' }, b.contexte);
  const avant = analyseCourante();
  retenirLaSelectionDuPlugin(['l1']);
  assert.equal(origineDeLaSelection(['l1']), 'plugin');
  surSelection('jeu-Button', 'plugin', b.contexte);
  surSelection('v-Alert', 'figma', b.contexte);
  assert.deepEqual(analyseCourante(), avant);
  assert.equal(deType(b, 'perime').length, 0);
});

test('Ctrl+Z périme une seule fois sans réanalyse ; Actualiser ouvre une nouvelle génération', async () => {
  const b = banc();
  const traiter = traiterAvec(lecteurs(complete()));
  await traiter({ type: 'analyser' }, b.contexte);
  const premiere = analyseCourante() as IdentiteDAnalyse;
  surChangementDuDocument(['v-Alert'], b.contexte);
  surChangementDuDocument(['v-Alert'], b.contexte);
  assert.deepEqual(deType(b, 'perime'), [{ type: 'perime', analyse: premiere, cause: 'document' }]);
  assert.equal(deType(b, 'analyse').length, 1);
  await traiter({ type: 'analyser' }, b.contexte);
  const seconde = analyseCourante() as IdentiteDAnalyse;
  assert.equal(seconde.generation, premiere.generation + 1);
  surChangementDuDocument(['v-Alert'], b.contexte);
  assert.equal(deType(b, 'perime').length, 2);
  assert.equal(deType(b, 'perime')[1].analyse.generation, seconde.generation);
});

test('une écriture du plugin périme l’analyse courante', async () => {
  const b = banc();
  await traiterAvec(lecteurs(complete()))({ type: 'analyser' }, b.contexte);
  perimerApresUneEcriture(b.contexte);
  assert.equal(deType(b, 'perime')[0].cause, 'ecriture');
});

/** Un relevé dont le texte gris (4,8:1 environ sur blanc) passe en AA, échoue en AAA, et n'a ni style ni variable. */
function releveDeContraste(nom: string): ReleveDeComposant {
  const peinture = (v: number) => ({ champ: 'fills' as const, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: v, g: v, b: v, a: 1 } });
  const dimensions = { x: 0, y: 0, largeur: 100, hauteur: 48 };
  const racine = { id: 'r', nom: 'Root', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions, peintures: [peinture(1)], liaisons: [], valeursEnDur: [] };
  const texte = {
    id: 't', nom: 'Label', type: 'TEXT', parent: 'r', visible: true, opacite: 1, dimensions, peintures: [], liaisons: [], valeursEnDur: [],
    texte: { style: null, plages: [{ debut: 0, fin: 5, fontSize: 14, fontWeight: 400, peintures: [peinture(0.45)], liaisons: [] }] },
  };
  return { ...releveDe(nom), variants: [{ id: `v-${nom}`, nom: `${nom} défaut`, valeurs: {}, layers: [racine, texte], modesEffectifs: {} }] };
}

const lecteursDeContraste = (niveau?: Lecteurs['niveau']): Lecteurs => ({
  ...lecteurs(complete()),
  async releve(sujet) { return { statut: 'lu', releve: releveDeContraste(sujet.cle) }; },
  ...(niveau ? { niveau } : {}),
});

test('l’analyse ajoute les constats de typographie à ceux du kit', async () => {
  const b = banc();
  await traiterAvec(lecteursDeContraste())({ type: 'analyser' }, b.contexte);
  assert.ok(deType(b, 'analyse')[0].constats.some((c) => c.code === 'C64' && c.famille === 'typographie'));
});

test('l’analyse UCM ajoute C59 et C63 de structure, tandis que l’architecture libre les tait', async () => {
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [
      { cle: 'theme', nom: 'Theme', role: 'theme', etat: 'lue', modes: [{ id: 'light', nom: 'Light' }] },
      { cle: 'components', nom: 'Components', role: 'components', etat: 'lue', modes: [{ id: 'light', nom: 'Light' }] },
      { cle: 'brands', nom: 'Brands', role: 'brands', etat: 'lue', modes: [{ id: 'light', nom: 'Light' }] },
    ],
    variables: [
      { cle: 'surface-fg', nom: 'success/surface/foreground', collection: 'theme', type: 'COLOR', etat: 'presente', scopes: ['TEXT_FILL'] },
      { cle: 'page-fg', nom: 'success/page/foreground', collection: 'theme', type: 'COLOR', etat: 'presente' },
      { cle: 'surface-bg', nom: 'success/surface/default', collection: 'theme', type: 'COLOR', etat: 'presente' },
      { cle: 'primary', nom: 'Button/color/primary/contained/default/background', collection: 'components', type: 'COLOR', etat: 'presente', valeurs: { light: { alias: 'theme-primary' } } },
      { cle: 'secondary', nom: 'Button/color/secondary/contained/default/background', collection: 'components', type: 'COLOR', etat: 'presente', valeurs: { light: { alias: 'brand-secondary' } } },
      { cle: 'theme-primary', nom: 'primary/solid/default', collection: 'theme', type: 'COLOR', etat: 'presente' },
      { cle: 'theme-secondary', nom: 'secondary/solid/default', collection: 'theme', type: 'COLOR', etat: 'presente' },
      { cle: 'brand-secondary', nom: 'secondary/light/700', collection: 'brands', type: 'COLOR', etat: 'presente' },
    ],
  };
  const composant: ReleveDeComposant = {
    ...releveDe('Button'),
    proprietes: [
      { nom: 'Palette', type: 'VARIANT', valeurs: ['primary', 'secondary'], defaut: 'primary' },
      { nom: 'Style', type: 'VARIANT', valeurs: ['contained'], defaut: 'contained' },
      { nom: 'State', type: 'VARIANT', valeurs: ['default'], defaut: 'default' },
    ],
    variants: [{ id: 'v-Button', nom: 'Button défaut', valeurs: {}, modesEffectifs: {}, layers: [{
      id: 'text', nom: 'Message', type: 'TEXT', parent: null, visible: true, opacite: 1,
      dimensions: { x: 0, y: 0, largeur: 20, hauteur: 10 }, peintures: [], valeursEnDur: [],
      liaisons: [{ champ: 'fills', indice: 0, porteur: 'text', variable: { id: 'surface-fg', cle: 'surface-fg', nom: 'success/surface/foreground', collection: 'theme', distante: false } }],
    }] }],
  };
  const base = lecteurs(complete());
  const avec = { ...base, releve: async () => ({ statut: 'lu' as const, releve: composant }), catalogue: async () => catalogue };

  const ucm = banc('ucm');
  await traiterAvec(avec)({ type: 'analyser' }, ucm.contexte);
  const constatsUcm = deType(ucm, 'analyse')[0].constats;
  assert.ok(constatsUcm.some(({ code }) => code === 'C59'));
  assert.ok(constatsUcm.some(({ code, id }) => code === 'C63' && id.includes('secondary')));

  const libre = banc('libre');
  await traiterAvec(avec)({ type: 'analyser' }, libre.contexte);
  assert.equal(deType(libre, 'analyse')[0].constats.some(({ code }) => code === 'C59' || code === 'C63'), false);
});

test('le niveau rangé sert à l’analyse : AA laisse passer 4,8:1, AAA le signale', async () => {
  const contraste = async (niveau?: Lecteurs['niveau']) => {
    reinitialiserLAnalyse();
    const b = banc();
    await traiterAvec(lecteursDeContraste(niveau))({ type: 'analyser' }, b.contexte);
    return deType(b, 'analyse')[0].constats.filter((c) => c.code === 'C49' && !c.limite);
  };
  assert.equal((await contraste()).length, 0);
  assert.equal((await contraste(async () => 'AA')).length, 0);
  assert.equal((await contraste(async () => 'AAA')).length, 1);
  assert.equal((await contraste(async () => { throw new Error('stockage'); })).length, 0);
});

test('l’analyse passe ses constats par proposerLesCorrections : une valeur en dur sans candidat devient une question', async () => {
  const b = banc();
  const base = lecteurs(complete());
  const layer = { id: 'L1', nom: 'box', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 1, hauteur: 1 }, peintures: [], liaisons: [], valeursEnDur: [{ champ: 'paddingLeft', valeur: 8 }] };
  const releve = { ...releveDe('Alert'), variants: [{ id: 'v-Alert', nom: 'Alert', valeurs: {}, layers: [layer], modesEffectifs: {} }] } as unknown as ReleveDeComposant;
  await traiterAvec({ ...base, releve: async () => ({ statut: 'lu', releve }) })({ type: 'analyser' }, b.contexte);
  const [resultat] = deType(b, 'analyse');
  const c29 = resultat.constats.find(({ code }) => code === 'C29');
  assert.deepEqual(c29?.question?.candidats, []);
  assert.equal(c29?.correction, undefined);
});

test('une clé d’Ignorer rangée garde le constat dans l’analyse et le nomme dans ignores ; la proposition retirée ne l’ignore pas', async () => {
  const analyserAvec = async (cles: string[]) => {
    reinitialiserLAnalyse();
    const b = banc();
    await traiterAvec({ ...lecteurs(complete([pointDeTest])), ignores: async () => cles })({ type: 'analyser' }, b.contexte);
    return b;
  };
  const sans = await analyserAvec([]);
  const id = deType(sans, 'analyse')[0].constats[0].id;
  assert.deepEqual(deType(sans, 'ignores').map(({ constats }) => constats), [[]]);
  const ignore = await analyserAvec([id]);
  const [analyse] = deType(ignore, 'analyse');
  assert.deepEqual(analyse.constats.map(({ id: idDuConstat }) => idDuConstat), [id]);
  assert.deepEqual(deType(ignore, 'ignores'), [{ type: 'ignores', analyse: analyse.analyse, constats: [id] }]);
  const propose = await analyserAvec([`proposition:${id}`]);
  assert.equal(deType(propose, 'analyse')[0].constats.length, 1);
  assert.deepEqual(deType(propose, 'ignores').map(({ constats }) => constats), [[]]);
});
