/** Le domaine preparation du sandbox : le plan, le rangement, le texte échangé, la création des variables et le retour au composant. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { CatalogueDeReference, LayerLu, ReleveDeComposant } from '@ucm-kit/core/controles';
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import type { PluginMessage } from '../src/messages';
import type { PreparationVue } from '../src/messages/preparation';
import {
  CLE_DES_PREPARATIONS, lireLesPreparations, rangerUnePreparation, texteDeLaPreparation, type PreparationRangee,
} from '../src/preparations';
import {
  commencerUneAnalyse, correctionsDeLAnalyse, prendreLaPlaceDUneEcriture, reinitialiserLAnalyse, retenirLesCorrections,
} from '../src/sandbox/analyse';
import { couleursEnDur, demandeUneSaisie, reponseSaisie } from '../src/ui/preparation';
import { TEXTES_PREPARATION } from '../src/ui/textes/preparation';
import type { Contexte } from '../src/sandbox/contexte';
import { TYPES, traiterAvec, type Acces } from '../src/sandbox/preparation';
import type { ResultatDeCreation } from '../src/ecriture/variables';

const FOND = 'components/alert/color/danger/soft/background';

function banc(options: { declaration?: boolean; catalogue?: CatalogueDeReference | null; publiees?: ReadonlyMap<string, string> | null; creer?: Acces['creer'] } = {}) {
  const stockage = new Map<string, unknown>();
  const envoyes: PluginMessage[] = [];
  const figma = {
    clientStorage: {
      async getAsync(cle: string) { return stockage.get(cle); },
      async setAsync(cle: string, valeur: unknown) { stockage.set(cle, valeur); },
    },
    root: { getSharedPluginData: (espace: string, cle: string) => (espace === ESPACE_ARCHITECT && cle === CLE_ARCHITECTURE_DU_FICHIER ? texteDeLArchitectureDuFichier(options.declaration ?? true) : '') },
  };
  const contexte: Contexte = { figma: figma as unknown as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument() {} };
  let rang = 0;
  const appels: PreparationRangee[] = [];
  const acces: Acces = {
    catalogue: async () => (options.catalogue === undefined ? catalogue() : options.catalogue),
    publiees: async () => (options.publiees === undefined ? new Map([[FOND, 'cle-1']]) : options.publiees),
    creer: async (preparation, opts) => { appels.push(preparation); return (options.creer ?? (async () => resultat()))(preparation, opts); },
    fichier: () => ({ nom: 'Composants', cle: 'abc' }),
    identifiant: () => `prep-${++rang}`,
    maintenant: () => '2026-10-23T10:00:00.000Z',
  };
  const traiter = traiterAvec(acces);
  return {
    contexte, envoyes, stockage, appels, traiter,
    dernier: <T extends PluginMessage['type']>(type: T) => envoyes.filter((m) => m.type === type).at(-1) as Extract<PluginMessage, { type: T }>,
  };
}

const resultat = (extras: Partial<ResultatDeCreation> = {}): ResultatDeCreation => ({
  refus: null, collections: [], etats: { [FOND]: 'creee' }, echecs: [], divergentes: [], creees: 1, remplacees: 0, gardees: 0, sautees: 0, journal: true, ...extras,
});

function catalogue(): CatalogueDeReference {
  const theme = ['surface/default', 'surface/foreground', 'surface/border', 'solid/default'].map((fin) => `theme/danger/soft/${fin}`);
  return {
    version: 1, library: null,
    collections: (['theme', 'layout', 'components'] as const).map((role) => ({
      cle: role, nom: role, role, modes: role === 'components' ? [{ id: 'l', nom: 'Light' }, { id: 'd', nom: 'Dark' }] : [], etat: 'lue' as const,
    })),
    variables: theme.map((nom, rang) => ({ cle: `v${rang}`, nom, collection: 'theme', type: 'COLOR' as const, etat: 'presente' as const })),
  };
}

const layer = (id: string, extras: Partial<LayerLu> = {}): LayerLu => ({
  id, nom: id, type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 100, hauteur: 40 },
  peintures: [{ champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 1, g: 0, b: 0, a: 1 } }],
  liaisons: [], valeursEnDur: [], ...extras,
});
const releve = (cle = 'jeu-1'): ReleveDeComposant => ({
  version: 1, jeu: { cle, id: cle, nom: 'Alert' },
  proprietes: [{ nom: 'Palette', type: 'VARIANT', valeurs: ['danger'], defaut: 'danger' }, { nom: 'Style', type: 'VARIANT', valeurs: ['soft'], defaut: 'soft' }],
  variants: [{ id: 'danger', nom: 'danger', valeurs: { Palette: 'danger', Style: 'soft' }, modesEffectifs: {}, layers: [layer('container')] }],
  lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
});

function analyse(b: ReturnType<typeof banc>, cle = 'jeu-1') {
  const identite = commencerUneAnalyse(cle, ['n'], b.contexte);
  retenirLesCorrections(identite, [], releve(cle));
  return identite;
}

const rangee = (id = 'prep-1', extras: Partial<PreparationRangee> = {}): PreparationRangee => ({
  id, creeLe: '2026-10-23T10:00:00.000Z', regles: [],
  source: { fichier: 'Composants', cleDuFichier: 'abc', jeu: { cle: 'jeu-1', nom: 'Alert' } },
  variables: [{ nom: FOND, type: 'COLOR', cibles: { Light: 'theme/danger/soft/surface/default', Dark: 'theme/danger/soft/surface/default' }, layers: [{ id: 'container', variant: 'danger', champ: 'fills', indice: 0 }] }],
  ...extras,
});

test('le domaine traite les six demandes de la note N1 et la liaison du retour', () => {
  assert.deepEqual([...TYPES].sort(), ['abandonner-preparation', 'copier-preparation', 'creer-variables', 'lier-preparation', 'lire-preparations', 'lire-texte', 'preparer']);
});

test('preparer : une analyse périmée, un fichier hors UCM, une library illisible ou sans thème ne rendent aucun plan', async () => {
  reinitialiserLAnalyse();
  const b = banc();
  await b.traiter({ type: 'preparer', analyse: { sujet: 'jeu-1', generation: 99 }, reponses: {} }, b.contexte);
  assert.equal(b.dernier('plan-de-preparation').refus, 'analyse-perimee');

  const hors = banc({ declaration: false });
  await hors.traiter({ type: 'preparer', analyse: analyse(hors), reponses: {} }, hors.contexte);
  assert.equal(hors.dernier('plan-de-preparation').refus, 'hors-ucm');

  const illisible = banc({ catalogue: null });
  await illisible.traiter({ type: 'preparer', analyse: analyse(illisible), reponses: {} }, illisible.contexte);
  assert.equal(illisible.dernier('plan-de-preparation').refus, 'library-illisible');

  const sansTheme = banc({ catalogue: { ...catalogue(), collections: catalogue().collections.filter(({ role }) => role !== 'theme') } });
  await sansTheme.traiter({ type: 'preparer', analyse: analyse(sansTheme), reponses: {} }, sansTheme.contexte);
  assert.equal(sansTheme.dernier('plan-de-preparation').refus, 'sans-cibles');
  reinitialiserLAnalyse();
});

test('preparer : sans réponse, le plan porte la question du dossier et rien ne se range ; avec réponse et ranger, la préparation est rangée', async () => {
  reinitialiserLAnalyse();
  const b = banc();
  const identite = analyse(b);
  await b.traiter({ type: 'preparer', analyse: identite, reponses: {} }, b.contexte);
  const ouvert = b.dernier('plan-de-preparation');
  assert.equal(ouvert.refus, null);
  assert.deepEqual(ouvert.plan?.questions.map(({ id }) => id), ['dossier:soft']);
  assert.equal(b.stockage.size, 0);

  await b.traiter({ type: 'preparer', analyse: identite, reponses: { 'dossier:soft': 'surface' }, ranger: true }, b.contexte);
  const rangees = b.dernier('preparations');
  assert.equal(rangees.nouvelle, 'prep-1');
  const vue: PreparationVue = rangees.preparations[0];
  assert.deepEqual(vue.source, { fichier: 'Composants', cleDuFichier: 'abc', jeu: { cle: 'jeu-1', nom: 'Alert' } });
  assert.deepEqual(vue.variables.map(({ nom, etat, layers }) => [nom, etat, layers]), [[FOND, 'a-creer', 1]]);
  assert.ok(b.stockage.has(CLE_DES_PREPARATIONS));

  const incomplet = banc();
  await incomplet.traiter({ type: 'preparer', analyse: analyse(incomplet), reponses: {}, ranger: true }, incomplet.contexte);
  assert.equal(incomplet.dernier('plan-de-preparation').refus, 'questions-ouvertes');
  assert.equal(incomplet.stockage.size, 0);
  reinitialiserLAnalyse();
});

test('preparer : chaque candidat d’une question montre la cible qu’il donnerait, la couleur seulement quand le catalogue la porte', async () => {
  reinitialiserLAnalyse();
  const b = banc();
  await b.traiter({ type: 'preparer', analyse: analyse(b), reponses: {} }, b.contexte);
  const { apercus } = b.dernier('plan-de-preparation');
  assert.deepEqual(Object.keys(apercus), ['dossier:soft']);
  const parDossier = apercus['dossier:soft'];
  assert.deepEqual(parDossier.surface.map(({ role, cible }) => [role, cible]), [['background', 'theme/danger/soft/surface/default']]);
  assert.deepEqual(parDossier.solid.map(({ role, cible }) => [role, cible]), [['background', 'theme/danger/soft/solid/default']]);
  assert.equal(parDossier.page, undefined);
  assert.equal(typeof parDossier.surface[0].crans?.light, 'number');
  assert.equal(parDossier.surface[0].couleur, undefined);

  const coloree = catalogue();
  coloree.collections = coloree.collections.map((collection) => (collection.role === 'theme' ? { ...collection, modes: [{ id: 'm-light', nom: 'Light' }, { id: 'm-dark', nom: 'Dark' }] } : collection));
  coloree.variables = coloree.variables.map((variable) => {
    if (variable.nom === 'theme/danger/soft/surface/default') return { ...variable, valeurs: { 'm-light': { alias: 'base' }, 'm-dark': { valeur: { r: 0, g: 0, b: 0, a: 1 } } } };
    if (variable.nom === 'theme/danger/soft/solid/default') return { ...variable, etat: 'non-chargee' as const };
    return variable;
  }).concat({ cle: 'base', nom: 'primitives/rouge/100', collection: 'theme', type: 'COLOR', etat: 'presente', valeurs: { 'm-light': { valeur: { r: 1, g: 0.5, b: 0, a: 1 } } } });
  const avecCouleur = banc({ catalogue: coloree });
  await avecCouleur.traiter({ type: 'preparer', analyse: analyse(avecCouleur), reponses: {} }, avecCouleur.contexte);
  const avecValeurs = avecCouleur.dernier('plan-de-preparation').apercus['dossier:soft'];
  assert.equal(avecValeurs.surface[0].couleur, '#FF8000');
  assert.equal(avecValeurs.solid[0].couleur, undefined);
  reinitialiserLAnalyse();
});

test('preparer : une taille en dur sans token exact reste en dur, sans variable ni question, et la préparation se range', async () => {
  reinitialiserLAnalyse();
  const b = banc();
  const identite = commencerUneAnalyse('jeu-1', ['n'], b.contexte);
  const arrondi = layer('container', { valeursEnDur: [{ champ: 'cornerRadius', valeur: 13 }] });
  retenirLesCorrections(identite, [], { ...releve(), variants: [{ ...releve().variants[0], layers: [arrondi] }] });
  await b.traiter({ type: 'preparer', analyse: identite, reponses: { 'dossier:soft': 'surface' } }, b.contexte);
  const { plan, mesures, apercus } = b.dernier('plan-de-preparation');
  assert.equal(plan?.variables.some(({ type }) => type === 'FLOAT'), false);
  assert.equal(plan?.questions.some(({ id }) => id.startsWith('cible:')), false);
  assert.deepEqual(plan?.sansCible?.map(({ nom, champ, famille, valeur }) => [nom, champ, famille, valeur]), [['components/alert/size/radius', 'cornerRadius', 'radius', 13]]);
  assert.deepEqual(mesures, {});
  assert.deepEqual(apercus, {});
  reinitialiserLAnalyse();
});

test('lire-texte range la préparation reçue, envoie ses règles ; copier-preparation rend le même texte', async () => {
  const b = banc();
  const reglee = rangee('prep-7', { regles: [{ ancien: 'error', nouveau: 'danger', composant: 'alert' }] });
  await b.traiter({ type: 'lire-texte', texte: texteDeLaPreparation(reglee) }, b.contexte);
  assert.equal(b.dernier('preparations').nouvelle, 'prep-7');
  assert.deepEqual(b.dernier('regles-recues').regles.map(({ ancien, nouveau }) => [ancien, nouveau]), [['error', 'danger']]);
  await b.traiter({ type: 'copier-preparation', preparation: 'prep-7' }, b.contexte);
  assert.equal(b.dernier('preparation-texte').texte, texteDeLaPreparation(reglee));
});

test('lire-texte refuse un texte illisible, d’un autre format, d’une version future ou à champ faux, sans rien ranger', async () => {
  const b = banc();
  const valide = JSON.parse(texteDeLaPreparation(rangee()));
  const essais: [string, string, string?][] = [
    ['pas du json', 'illisible'],
    [JSON.stringify({ ...valide, format: 'autre' }), 'format'],
    [JSON.stringify({ ...valide, version: 2 }), 'future'],
    [JSON.stringify({ ...valide, id: undefined }), 'champ-faux', 'id'],
  ];
  for (const [texte, motif, champ] of essais) {
    await b.traiter({ type: 'lire-texte', texte }, b.contexte);
    assert.deepEqual(b.dernier('texte-refuse'), { type: 'texte-refuse', motif, ...(champ ? { champ } : {}) });
  }
  assert.equal(b.stockage.size, 0);
  assert.equal(b.envoyes.some(({ type }) => type === 'regles-recues'), false);
});

test('abandonner-preparation retire seulement la préparation nommée ; copier-preparation d’une absente renvoie la liste', async () => {
  const b = banc();
  await rangerUnePreparation(b.contexte.figma.clientStorage as never, rangee('prep-1'));
  await rangerUnePreparation(b.contexte.figma.clientStorage as never, rangee('prep-2'));
  await b.traiter({ type: 'abandonner-preparation', preparation: 'prep-1' }, b.contexte);
  assert.deepEqual(b.dernier('preparations').preparations.map(({ id }) => id), ['prep-2']);
  await b.traiter({ type: 'copier-preparation', preparation: 'prep-1' }, b.contexte);
  assert.equal(b.envoyes.some(({ type }) => type === 'preparation-texte'), false);
});

test('creer-variables : l’état de chaque variable est rangé, l’analyse se périme, les comptes sont rendus', async () => {
  reinitialiserLAnalyse();
  const b = banc();
  await rangerUnePreparation(b.contexte.figma.clientStorage as never, rangee());
  const identite = analyse(b);
  await b.traiter({ type: 'creer-variables', preparation: 'prep-1' }, b.contexte);
  const rendu = b.dernier('variables-creees');
  assert.deepEqual([rendu.creees, rendu.gardees, rendu.sautees, rendu.refus], [1, 0, 0, null]);
  assert.equal((await lireLesPreparations(b.contexte.figma.clientStorage as never))[0].etats?.[FOND], 'creee');
  assert.equal(correctionsDeLAnalyse(identite), null);
  assert.deepEqual(b.envoyes.filter(({ type }) => type === 'perime').length, 1);
  reinitialiserLAnalyse();
});

test('creer-variables : une préparation absente, une autre opération en cours ou un refus de l’écriture ne rangent rien', async () => {
  reinitialiserLAnalyse();
  const b = banc();
  await b.traiter({ type: 'creer-variables', preparation: 'absente' }, b.contexte);
  assert.equal(b.dernier('variables-creees').refus, 'introuvable');

  await rangerUnePreparation(b.contexte.figma.clientStorage as never, rangee());
  const place = await prendreLaPlaceDUneEcriture({ sujet: 'autre', generation: 0 });
  await b.traiter({ type: 'creer-variables', preparation: 'prep-1' }, b.contexte);
  assert.equal(b.dernier('variables-creees').refus, 'occupe');
  assert.equal(b.appels.length, 0);
  if ('liberer' in place) place.liberer();

  const refuse = banc({ creer: async () => resultat({ refus: 'destination-ambigue', etats: {}, creees: 0, collections: [{ id: 'C:3', nom: 'components' }, { id: 'C:4', nom: 'Components' }] }) });
  await rangerUnePreparation(refuse.contexte.figma.clientStorage as never, rangee());
  await refuse.traiter({ type: 'creer-variables', preparation: 'prep-1' }, refuse.contexte);
  const message = refuse.dernier('variables-creees');
  assert.deepEqual([message.refus, message.collections.length], ['destination-ambigue', 2]);
  assert.equal((await lireLesPreparations(refuse.contexte.figma.clientStorage as never))[0].etats, undefined);
  assert.equal(refuse.envoyes.some(({ type }) => type === 'perime'), false);
  reinitialiserLAnalyse();
});

test('creer-variables : une écriture qui lève saute tout en lecture, périme l’analyse et libère la place', async () => {
  reinitialiserLAnalyse();
  const b = banc({ creer: async () => { throw new Error('Figma refuse'); } });
  await rangerUnePreparation(b.contexte.figma.clientStorage as never, rangee());
  analyse(b);
  await b.traiter({ type: 'creer-variables', preparation: 'prep-1' }, b.contexte);
  assert.deepEqual([b.dernier('variables-creees').refus, b.dernier('variables-creees').sautees], ['lecture', 1]);
  const place = await prendreLaPlaceDUneEcriture({ sujet: 'suite', generation: 0 });
  assert.ok('liberer' in place);
  if ('liberer' in place) place.liberer();
  reinitialiserLAnalyse();
});

test('lier-preparation : une variable publiée donne une liaison retenue, l’autre reste sans case', async () => {
  reinitialiserLAnalyse();
  const b = banc();
  await rangerUnePreparation(b.contexte.figma.clientStorage as never, rangee());
  const identite = analyse(b);
  await b.traiter({ type: 'lier-preparation', analyse: identite, preparation: 'prep-1' }, b.contexte);
  const publiee = b.dernier('liaisons-preparees');
  assert.equal(publiee.refus, null);
  assert.deepEqual(publiee.corrections.map(({ id }) => id), ['preparation:prep-1:container:fills:0']);
  assert.ok(correctionsDeLAnalyse(identite)?.has('preparation:prep-1:container:fills:0'));

  const attente = banc({ publiees: new Map() });
  await rangerUnePreparation(attente.contexte.figma.clientStorage as never, rangee());
  await attente.traiter({ type: 'lier-preparation', analyse: analyse(attente), preparation: 'prep-1' }, attente.contexte);
  const sansCase = attente.dernier('liaisons-preparees');
  assert.deepEqual([sansCase.corrections.length, sansCase.enAttente.length], [0, 1]);
  reinitialiserLAnalyse();
});

test('lier-preparation : seulement sur la même clé de jeu, jamais hors UCM, jamais sur une analyse périmée ou une library illisible', async () => {
  reinitialiserLAnalyse();
  const autre = banc();
  await rangerUnePreparation(autre.contexte.figma.clientStorage as never, rangee());
  await autre.traiter({ type: 'lier-preparation', analyse: analyse(autre, 'jeu-2'), preparation: 'prep-1' }, autre.contexte);
  assert.equal(autre.dernier('liaisons-preparees').refus, 'autre-composant');

  await autre.traiter({ type: 'lier-preparation', analyse: analyse(autre), preparation: 'absente' }, autre.contexte);
  assert.equal(autre.dernier('liaisons-preparees').refus, 'introuvable');

  await autre.traiter({ type: 'lier-preparation', analyse: { sujet: 'jeu-1', generation: 999 }, preparation: 'prep-1' }, autre.contexte);
  assert.equal(autre.dernier('liaisons-preparees').refus, 'analyse-perimee');

  const hors = banc({ declaration: false });
  await rangerUnePreparation(hors.contexte.figma.clientStorage as never, rangee());
  await hors.traiter({ type: 'lier-preparation', analyse: analyse(hors), preparation: 'prep-1' }, hors.contexte);
  assert.equal(hors.dernier('liaisons-preparees').refus, 'hors-ucm');

  const illisible = banc({ publiees: null });
  await rangerUnePreparation(illisible.contexte.figma.clientStorage as never, rangee());
  await illisible.traiter({ type: 'lier-preparation', analyse: analyse(illisible), preparation: 'prep-1' }, illisible.contexte);
  assert.equal(illisible.dernier('liaisons-preparees').refus, 'library-illisible');
  reinitialiserLAnalyse();
});

test('une question de nom sans candidat demande une saisie, et un texte vide n’envoie rien', () => {
  assert.equal(demandeUneSaisie({ id: 'nom:Frame 12', candidats: [] }), true);
  assert.equal(demandeUneSaisie({ id: 'nom:badge', candidats: [{ nom: 'badge' }] }), false);
  assert.equal(demandeUneSaisie({ id: 'palette:-', candidats: [] }), false);
  assert.equal(reponseSaisie('   '), null);
  assert.equal(reponseSaisie(''), null);
  assert.equal(reponseSaisie(' carte '), 'carte');
});

test('les couleurs en dur se comptent une fois par nom et par hexadécimal', () => {
  const lieu = (layer: string) => ({ variant: 'v', layer, champ: 'fills' });
  const lignes = couleursEnDur([
    { nom: 'components/alert/color/background', champ: 'fills', hexa: '#FF0000', lieu: lieu('a'), raison: 'sans-regle' as const },
    { nom: 'components/alert/color/background', champ: 'fills', hexa: '#FF0000', lieu: lieu('b'), raison: 'sans-regle' as const },
    { nom: 'components/alert/color/foreground', champ: 'fills', hexa: '#00FF00', lieu: lieu('c'), raison: 'absente-du-theme' as const, cible: 'theme/primary/surface/subtle' },
  ]);
  assert.equal(lignes.length, 2);
  assert.equal(lignes[1].absente, 'theme/primary/surface/subtle');
  assert.equal(TEXTES_PREPARATION.preparationCouleurEnDur('#FF0000'), 'aucun token du thème ne vaut #FF0000 : reste en dur');
  assert.equal(TEXTES_PREPARATION.absenteDuTheme('theme/primary/surface/subtle'), '`theme/primary/surface/subtle` manque dans le thème.');
  assert.equal(TEXTES_PREPARATION.creerDepuisTokens, 'Créez-la depuis le mode Tokens.');
  assert.equal(TEXTES_PREPARATION.preparationResteEnDur(1), '1 valeur reste en dur : Architect ne crée pas de token dans theme ni dans layout. Elle reste dans À faire dans Figma.');
  assert.match(TEXTES_PREPARATION.preparationResteEnDur(3), /^3 valeurs restent en dur .* Elles restent/);
});
