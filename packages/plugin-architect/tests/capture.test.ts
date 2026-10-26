/**
 * La capture et son banc de coût. L'aller-retour est la preuve de complétude : un monde fabriqué est capturé, la capture
 * passe par JSON, le chargeur rebâtit un double, et l'analyse complète rend sur le double la même sortie que sur l'original.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { BUDGET_DE_LAYERS_PAR_DEFAUT } from 'ucm-plugin-socle/src/composant/contract/budget';
import { analyserLeComposant } from 'ucm-plugin-socle/src/composant/contract/exportComponent';

import type { Contexte } from '../src/sandbox/contexte';
import { traiter, type Lecteurs } from '../src/sandbox/analyse';
import {
  JEUX_DE_SEGMENTS, PROPRIETES_DE_NOEUD, capturerLeComposant, capturerSiDemande, choisirLHorloge, mesurerLeCoutDesLectures, nomDeLaCapture,
  type CaptureArchitect, type MessageDeCapture,
} from '../src/sandbox/capture';
import { enregistrerLesImports, mesurerLePortDeLecture } from '../src/lecture';
import { captureActive, estUneCapture, recevoirLaCapture } from '../src/ui/capture';
import { capturerLAnalyse } from './parite';
import { doubleDepuisCapture } from './outils/capture';
import { fabriquerLeMonde } from './outils/mondeFabrique';

const globale = globalThis as { figma?: unknown };

/** Joue l'analyse complète du sandbox, lecteurs de Figma compris, sur un double posé en global `figma` comme le fait le runtime. */
async function analyserSur(figma: unknown, surCapture?: (message: MessageDeCapture) => void, demande: { capturer?: boolean } = {}) {
  const precedent = globale.figma;
  globale.figma = figma;
  try {
    return await capturerLAnalyse(() => {
      const envoyes: never[] = [];
      const contexte: Contexte = {
        figma: figma as PluginAPI,
        envoyer: (message) => envoyes.push(message as never),
        surveillerLeDocument: () => [],
        ...(surCapture ? { envoyerLaCapture: surCapture } : {}),
      };
      return { b: { contexte, envoyes }, lectures: {} as Lecteurs };
    }, () => async (_demande, contexte) => traiter({ type: 'analyser', ...demande }, contexte));
  } finally {
    globale.figma = precedent;
  }
}

/** Le contrat que le moteur produit sur `figma`, sans la date de génération. */
async function contratDuMoteur(figma: unknown, jeu: unknown, page: unknown): Promise<unknown> {
  const precedent = globale.figma;
  globale.figma = figma;
  try {
    const resultat = await analyserLeComposant(async () => {}, { composant: jeu as ComponentSetNode, page: page as PageNode, budgetDeLayers: BUDGET_DE_LAYERS_PAR_DEFAUT, jeton: { leve: false }, respirer: async () => {} });
    assert.equal(resultat.etat, 'complete');
    return JSON.parse(resultat.export.content.replace(/"\d{4}-\d\d-\d\dT[^"]*"/g, '"date"'));
  } finally {
    globale.figma = precedent;
  }
}

async function capturerLeMonde() {
  const monde = fabriquerLeMonde();
  const original = await analyserSur(monde.figma);
  const capture = JSON.parse(JSON.stringify(await capturerLeComposant(monde.figma as unknown as PluginAPI, { jeu: monde.jeu, page: monde.page }))) as CaptureArchitect;
  return { monde, original, capture };
}

test('l’analyse d’un monde fabriqué ne s’arrête pas : l’aller-retour compare une vraie sortie', async () => {
  const { original } = await capturerLeMonde();
  const resultat = original.messages.find((message) => message.type === 'analyse');
  assert.ok(resultat && resultat.type === 'analyse');
  assert.notEqual(resultat.statut, 'arretee');
  assert.equal(original.releve?.variants.length, 3);
});

test('capturer puis recharger : le relevé, le moteur et les contrôles rendent la sortie de l’original', async () => {
  const { monde, original, capture } = await capturerLeMonde();
  const rejoue = doubleDepuisCapture(capture);
  assert.deepEqual(await analyserSur(rejoue.figma), original);
  assert.deepEqual(
    await contratDuMoteur(rejoue.figma, rejoue.noeud(capture.jeu), rejoue.noeud(capture.page)),
    await contratDuMoteur(monde.figma, monde.jeu, monde.page),
  );
});

test('la capture porte ce que le code encode à part : valeur mixte, lecture qui lève, référence, absence', async () => {
  const { capture } = await capturerLeMonde();
  const texte = capture.noeuds.texte;
  assert.deepEqual(texte.proprietes.fills, { $: 'mixte' });
  assert.deepEqual(texte.proprietes.absoluteRenderBounds, { $: 'erreur', message: 'Rendu illisible' });
  assert.deepEqual(capture.noeuds.repos.proprietes.parent, { $: 'noeud', id: 'jeu' });
  assert.ok(!('characters' in capture.noeuds.repos.proprietes), 'une propriété que le type n’expose pas reste absente');
  assert.deepEqual(Object.keys(texte.segments ?? {}).sort(), JEUX_DE_SEGMENTS.map((champs) => [...champs].sort().join(',')).sort());
  assert.deepEqual(capture.noeuds.instance.maitre, { $: 'noeud', id: 'maitre' });
  assert.ok(capture.noeuds.maitre && capture.noeuds['jeu-icone'] && capture.noeuds.vecteur, 'le maître, son jeu et ses descendants sont capturés');
  assert.deepEqual(capture.noeudsParIdentifiant['hors-arbre'], { $: 'noeud', id: 'hors-arbre' });
  assert.deepEqual(capture.pages.page.criteres.TEXT, ['texte', 'texte-survol', 'nom', 'autre-texte'].map((id) => ({ $: 'noeud', id })));
  assert.equal(capture.noeuds['autre-texte'].superficiel, true);
  assert.equal(capture.noeuds.regles.superficiel, undefined, 'le conteneur de règles se capture entier');
  assert.deepEqual(Object.keys(capture.libraries?.imports ?? {}), [], 'l’analyse du monde fabriqué n’importe rien : la capture n’en invente pas');
  assert.ok(capture.variables.espace && capture.styles['S:titre']);
  assert.equal(capture.variables['VariableID:cle-lib-v/1:1'], null, 'la variable de library se lit comme l’analyse l’a laissée, avant l’import de la capture');
  assert.equal(capture.fichier.niveau, 'AAA');
  assert.deepEqual(capture.limites, { noeudsTronques: false, textesDePageTronques: false });
});

test('le double lève sur ce que la capture ne contient pas, au lieu d’inventer une valeur', async () => {
  const { capture } = await capturerLeMonde();
  const rejoue = doubleDepuisCapture(capture);
  const texte = rejoue.noeud('texte') as { getStyledTextSegments(champs: string[]): unknown; absoluteRenderBounds: unknown; fills: unknown };
  assert.throws(() => texte.getStyledTextSegments(['fontSize']), /n'est pas capturé/);
  assert.throws(() => texte.absoluteRenderBounds, /Rendu illisible/);
  assert.equal(texte.fills, rejoue.mixte);
  await assert.rejects((rejoue.figma as { variables: { importVariableByKeyAsync(cle: string): Promise<unknown> } }).variables.importVariableByKeyAsync('inconnue'));
});

test('tout nom que le relevé et le moteur lisent sur un nœud est dans la liste de capture', async () => {
  const { capture } = await capturerLeMonde();
  const lus = new Set<string>();
  const rejoue = doubleDepuisCapture(capture, { surLectureNonCapturee: ({ champ }) => lus.add(champ) });
  await analyserSur(rejoue.figma);
  const methodes = new Set(['findAll', 'findOne', 'findChildren', 'findAllWithCriteria', 'getStyledTextSegments', 'getMainComponentAsync']);
  const oublies = [...lus].filter((champ) => !PROPRIETES_DE_NOEUD.includes(champ) && !methodes.has(champ));
  assert.deepEqual(oublies, []);
  assert.ok(lus.size > 0, 'le relevé lit des propriétés que le type du nœud n’expose pas');
});

test('le détecteur de complétude signale un nom hors liste', async () => {
  const { capture } = await capturerLeMonde();
  const lus: string[] = [];
  const rejoue = doubleDepuisCapture(capture, { surLectureNonCapturee: ({ champ }) => lus.push(champ) });
  void (rejoue.noeud('texte') as Record<string, unknown>).champInconnuDeLaListe;
  assert.deepEqual(lus, ['champInconnuDeLaListe']);
});

test('le double compte chaque lecture par nœud et par champ', async () => {
  const { capture } = await capturerLeMonde();
  const lectures: string[] = [];
  const rejoue = doubleDepuisCapture(capture, { surLecture: ({ noeud, champ }) => lectures.push(`${noeud}.${champ}`) });
  const repos = rejoue.noeud('repos') as { name: string; findAll(): unknown[] };
  void repos.name;
  void repos.findAll();
  assert.deepEqual(lectures, ['repos.name', 'repos.findAll']);
});

test('sans le drapeau de la demande, aucune capture ne s’exécute', async () => {
  const monde = fabriquerLeMonde();
  const envois: MessageDeCapture[] = [];
  const enregistrer = (message: MessageDeCapture): void => { envois.push(message); };
  await analyserSur(monde.figma, enregistrer);
  assert.equal(envois.length, 0, 'la demande n’a pas `capturer`');

  const interdit = new Proxy({}, { get() { throw new Error('la capture a lu Figma'); } });
  const contexte: Contexte = { figma: interdit as PluginAPI, envoyer() {}, surveillerLeDocument: () => [], envoyerLaCapture: enregistrer };
  await capturerSiDemande({}, contexte, { noeud: monde.jeu, page: monde.page });
  await capturerSiDemande({ capturer: false }, contexte, { noeud: monde.jeu, page: monde.page });
  await capturerSiDemande({ capturer: true }, { ...contexte, envoyerLaCapture: undefined }, { noeud: monde.jeu, page: monde.page });
  await capturerSiDemande({ capturer: true }, contexte, null);
  assert.equal(envois.length, 0);
});

test('avec le drapeau, la capture part après l’analyse avec son résumé et son banc', async () => {
  const monde = fabriquerLeMonde();
  const envois: MessageDeCapture[] = [];
  await analyserSur(monde.figma, (message) => envois.push(message), { capturer: true });
  assert.equal(envois.length, 1);
  const [message] = envois;
  assert.equal(estUneCapture(message), true);
  assert.match(message.nom, /^capture-architect-\d{4}-\d\d-\d\d-\d\d-\d\d-\d\d\.json$/);
  const contenu = JSON.parse(message.contenu) as { capture: CaptureArchitect; banc: { mesures: unknown[] } };
  assert.equal(contenu.capture.jeu, 'jeu');
  assert.equal(message.resume.noeuds, Object.keys(contenu.capture.noeuds).length);
  assert.equal(message.resume.octets, message.contenu.length);
  assert.ok(contenu.banc.mesures.length > 0);
  assert.equal(nomDeLaCapture(new Date('2026-01-02T03:04:05.678Z')), 'capture-architect-2026-01-02-03-04-05.json');
});

test('le banc lit chaque propriété sur un nœud de chaque sorte et chronomètre les méthodes coûteuses', async () => {
  const monde = fabriquerLeMonde();
  let tic = 0;
  const horloge = { nom: 'performance.now' as const, maintenant: () => (tic += 0.5) };
  let cessions = 0;
  const banc = await mesurerLeCoutDesLectures(monde.jeu, { horloge, ceder: async () => { cessions += 1; }, repetitionsParPropriete: 10, repetitionsParMethode: 10 });
  const types = new Set(banc.mesures.map((mesure) => mesure.type));
  assert.deepEqual([...types].sort(), ['COMPONENT', 'FRAME', 'INSTANCE', 'RECTANGLE', 'TEXT']);
  const lectures = new Set(banc.mesures.map((mesure) => `${mesure.type}.${mesure.lecture}`));
  for (const attendu of ['COMPONENT.layoutMode', 'TEXT.characters', 'INSTANCE.overrides', 'TEXT.getStyledTextSegments(fontSize,fontWeight,fills,boundVariables,textStyleId)', 'TEXT.getStyledTextSegments(listOptions,textStyleOverrides)', 'INSTANCE.getMainComponentAsync()', 'COMPONENT.findAll(() => true)']) {
    assert.ok(lectures.has(attendu), `${attendu} est mesuré`);
  }
  assert.ok(!lectures.has('COMPONENT.characters'), 'une propriété que le type n’expose pas n’est pas mesurée');
  assert.equal(banc.mesures.find((mesure) => mesure.type === 'TEXT' && mesure.lecture === 'absoluteRenderBounds')?.leve, true);
  assert.equal(banc.mesures.find((mesure) => mesure.lecture === 'layoutMode' && mesure.type === 'COMPONENT')?.microsecondesParLecture, 50, 'une durée de 0,5 ms sur 10 lectures vaut 50 microsecondes par lecture');
  assert.ok(cessions >= banc.mesures.length, 'la main passe après chaque propriété et chaque lot');
  assert.equal(banc.horloge, 'performance.now');
});

test('l’horloge du banc est performance.now quand il existe, sinon Date.now', () => {
  assert.equal(choisirLHorloge({ performance: { now: () => 1 } }).nom, 'performance.now');
  assert.equal(choisirLHorloge({}).nom, 'Date.now');
});

test('l’interface ne télécharge la capture que dans le build de capture', () => {
  const message: MessageDeCapture = { type: 'capture-architect', nom: 'capture.json', contenu: '{}', resume: {} as never };
  const telechargements: string[] = [];
  const globaleDeTest: Record<string, unknown> = {};
  const recevoir = (actif: boolean) => recevoirLaCapture(message, { actif, telecharger: (nom, contenu, type) => { telechargements.push(`${nom} ${contenu} ${type}`); }, globale: globaleDeTest });
  assert.equal(recevoir(false), false);
  assert.deepEqual(telechargements, []);
  assert.equal(globaleDeTest.UCM_ARCHITECT_CAPTURE, undefined);
  assert.equal(recevoir(true), true);
  assert.deepEqual(telechargements, ['capture.json {} application/json']);
  assert.equal(globaleDeTest.UCM_ARCHITECT_CAPTURE, '{}');
  assert.equal(captureActive({}), false);
  assert.equal(captureActive({ UCM_ARCHITECT_CAPTURER: true }), true);
});

test('la capture n’importe aucune variable : elle ne reprend que les imports que le port de lecture a enregistrés', async () => {
  const monde = fabriquerLeMonde();
  const appels: string[] = [];
  const brut = monde.figma.variables.importVariableByKeyAsync;
  monde.figma.variables.importVariableByKeyAsync = async (cle: string) => { appels.push(cle); return brut(cle); };

  const sans = await capturerLeComposant(monde.figma as unknown as PluginAPI, { jeu: monde.jeu, page: monde.page });
  assert.deepEqual(appels, []);
  assert.deepEqual(sans.libraries?.imports, {});

  assert.equal(enregistrerLesImports(false), null, 'sans drapeau, rien ne s’enregistre');
  const port = mesurerLePortDeLecture(monde.figma.variables as never);
  await port.importVariableByKeyAsync('cle-lib-v');
  const enregistres = enregistrerLesImports(true)!;
  await port.importVariableByKeyAsync('cle-lib-v');
  await assert.rejects(port.importVariableByKeyAsync('inconnue'));
  enregistrerLesImports(false);
  assert.deepEqual(appels, ['cle-lib-v', 'cle-lib-v', 'inconnue'], 'seul le port a appelé l’import');

  const avec = await capturerLeComposant(monde.figma as unknown as PluginAPI, { jeu: monde.jeu, page: monde.page, imports: enregistres });
  assert.deepEqual(appels.length, 3, 'la capture n’a pas appelé l’import');
  assert.deepEqual(Object.keys(avec.libraries?.imports ?? {}), ['cle-lib-v', 'inconnue']);
  assert.equal((avec.libraries?.imports['cle-lib-v'] as { key: string }).key, 'cle-lib-v');
  assert.deepEqual(avec.libraries?.imports.inconnue, { $: 'erreur', message: 'Clé absente de la bibliothèque' });
});
