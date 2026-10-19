/** Le protocole de bout en bout : la session avec un port factice, de `analyser` à `application`. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ObjetModifiable, PortDeRegles, SessionEcriture, VariableModifiable } from '../src/ecriture';
import { inventaireDeLectures, type PortDeLecture } from '../src/lecture';
import type { Bilan, DemandeArchitect, GesteSurLesRegles, PluginMessage } from '../src/messages';
import { creerSession, moteurDuKit, type Moteur } from '../src/session';
import { creerFrontiere } from '../src/ui/frontiere';

const HEURE = '2026-10-18T10:00:00.000Z';
const minusculesTirets = { casse: 'minuscules', separateur: 'tiret' } as const;
const ecriture = { groupes: minusculesTirets, variables: minusculesTirets };

type SpecVariable = readonly [id: string, nom: string, collection?: string];
interface OptionsDuBanc {
  readonly collections?: readonly (readonly [string, string])[];
  readonly variables?: readonly SpecVariable[];
  readonly protegees?: readonly string[];
  /** L'identifiant de palette que Palettes écrit dans la donnée partagée d'une variable, par identifiant de variable. */
  readonly palettes?: Readonly<Record<string, string>>;
}

/** Un fichier Figma factice : il compte ses lectures et trace les noms écrits. */
function banc(options: OptionsDuBanc = {}) {
  const noms = new Map<string, string>();
  const lectures = { collections: 0, variables: 0 };
  const compteurs = { commencerLexique: 0, normaliser: 0, detecter: 0 };
  const portees: (readonly string[] | undefined)[] = [];
  const maximums: (number | undefined)[] = [];
  const stock = new Map<string, string>();
  const messages: PluginMessage[] = [];
  const collections = new Map<string, ObjetModifiable>();
  const variables = new Map<string, VariableModifiable>();
  const creer = <T extends object>(id: string, nom: string, extra: T) => {
    noms.set(id, nom);
    return { id, remote: false, ...extra, get name() { return noms.get(id)!; }, set name(valeur: string) { noms.set(id, valeur); } };
  };
  for (const [id, nom] of options.collections ?? [['c', 'components']]) collections.set(id, creer(id, nom, {}));
  for (const [id, nom, collection = 'c'] of options.variables ?? []) variables.set(id, creer(id, nom, { variableCollectionId: collection }));
  const protegees = [...(options.protegees ?? [])];
  const lecture: PortDeLecture = {
    collections: async () => { lectures.collections++; return [...collections.values()].map((o) => ({ id: o.id, name: o.name, remote: false })); },
    variables: async () => { lectures.variables++; return [...variables.values()].map((o) => ({ id: o.id, name: o.name, variableCollectionId: o.variableCollectionId, remote: false })); },
    cibleAlias: () => undefined,
    protegee: (variable) => protegees.includes(variable.id),
    palette: (variable) => options.palettes?.[variable.id],
  };
  /** Ce qui arrive dans Figma pendant `ouvrir`, avant que la lecture d'écriture ne s'achève. */
  const pendantOuvrir = { action: undefined as (() => void) | undefined };
  const session = (): SessionEcriture => ({
    inventaire: inventaireDeLectures(
      [...collections.values()].map((o) => ({ id: o.id, name: o.name, remote: false })),
      [...variables.values()].map((o) => ({ id: o.id, name: o.name, variableCollectionId: o.variableCollectionId, remote: false })),
      lecture,
    ),
    collection: (id) => collections.get(id) ?? null,
    variable: (id) => variables.get(id) ?? null,
    commitUndo: () => {},
  });
  const regles: PortDeRegles = {
    cles: () => [...stock.keys()],
    lire: (cle) => stock.get(cle) ?? '',
    ecrire: (cle, texte) => { stock.set(cle, texte); },
    effacer: (cle) => { stock.delete(cle); },
  };
  const moteur: Moteur = {
    ...moteurDuKit,
    commencerLexique: () => { compteurs.commencerLexique++; return moteurDuKit.commencerLexique(); },
    normaliserParEtapes: (lexique, conventions, index, opts) => { compteurs.normaliser++; portees.push(opts?.portees); return moteurDuKit.normaliserParEtapes(lexique, conventions, index, opts); },
    detecterParEtapes: (...args) => { compteurs.detecter++; maximums.push(args[3]?.maximum); return moteurDuKit.detecterParEtapes(...args); },
  };
  const instance = creerSession({
    port: { lecture, ecriture: { ouvrir: async () => { await Promise.resolve(); pendantOuvrir.action?.(); return session(); } }, regles },
    envoyer: (message) => { messages.push(message); },
    moteur, heure: () => HEURE,
    tranches: { pause: async () => {} },
  });
  let numero = 0;
  const envoyer = async (demande: DistributiveOmit<DemandeArchitect, 'demande'>): Promise<number> => {
    numero++;
    await instance.recevoir({ ...demande, demande: numero } as DemandeArchitect);
    return numero;
  };
  const bilans = () => messages.filter((m): m is Extract<PluginMessage, { type: 'bilan' }> => m.type === 'bilan');
  return {
    noms, lectures, protegees, pendantOuvrir, compteurs, portees, maximums, stock, messages, instance, envoyer, bilans,
    dernierBilan: (): Bilan => bilans().at(-1)!.bilan,
    vider: () => { messages.length = 0; },
    /** Une modification faite hors du plugin. */
    changer: (id: string, nom: string) => { noms.set(id, nom); },
  };
}
type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

const regleEcriture: GesteSurLesRegles = { type: 'ecriture', ecriture };
const FICHIER: OptionsDuBanc = {
  collections: [['c', 'Brand']],
  variables: [['v1', 'Button/Fill Hover'], ['v2', 'Button/Fill Pressed'], ['v3', 'fontSize/Body']],
};

test('de analyser à application : le premier bilan, l\'écriture, l\'application et son bilan neuf', async () => {
  const b = banc(FICHIER);
  const analyse = await b.envoyer({ type: 'analyser' });
  assert.ok(b.messages.some((m) => m.type === 'lecture' && m.demande === analyse));
  const premier = b.dernierBilan();
  assert.equal(premier.generation, 1);
  assert.equal(premier.premierLancement, true);

  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const travail = b.dernierBilan();
  assert.equal(travail.generation, 2);
  assert.equal(travail.premierLancement, false);
  assert.ok(travail.groupes.length > 0);
  assert.ok(travail.groupes.every((groupe) => !groupe.nouveau), 'les groupes du premier lancement sont déjà vus');
  assert.ok(b.stock.has('ecriture') && b.stock.has('vus'));

  b.vider();
  const demande = await b.envoyer({ type: 'appliquer', generation: travail.generation, selection: { groupes: travail.groupes.map((g) => g.cle), exclus: [], inclus: [] } });
  const application = b.messages.find((m) => m.type === 'application');
  assert.ok(application && application.type === 'application' && application.demande === demande);
  assert.equal(application.resultat.statut, 'applique');
  assert.equal(application.resultat.sorte, 'application');
  assert.equal(application.resultat.annulable, true);
  assert.equal(b.noms.get('v1'), 'button/fill-hover');
  assert.equal(b.noms.get('v3'), 'font-size/body');
  assert.deepEqual(b.messages.map((m) => m.type), ['application', 'bilan'], 'après l\'écriture la session relit Figma et envoie un bilan');
  const apres = b.dernierBilan();
  assert.equal(apres.generation, 3);
  assert.equal(apres.groupes.length, 0);
  assert.equal(apres.dernierRenommage?.nombre, application.resultat.renommes);

  b.vider();
  await b.envoyer({ type: 'annuler-dernier' });
  const annulation = b.messages.find((m) => m.type === 'application');
  assert.ok(annulation && annulation.type === 'application');
  assert.equal(annulation.resultat.sorte, 'annulation');
  assert.equal(b.noms.get('v1'), 'Button/Fill Hover');
  assert.equal(b.dernierBilan().generation, 4);
  assert.ok(b.dernierBilan().groupes.length > 0);
});

test('une lecture d\'une génération périmée reçoit generation-perimee ; une lecture courante répond', async () => {
  const b = banc(FICHIER);
  await b.envoyer({ type: 'analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const bilan = b.dernierBilan();
  b.vider();
  const perimee = await b.envoyer({ type: 'lignes', generation: 1, groupe: bilan.groupes[0].cle, debut: 0 });
  assert.deepEqual(b.messages, [{ type: 'erreur', demande: perimee, code: 'generation-perimee' }]);
  b.vider();
  const courante = await b.envoyer({ type: 'lignes', generation: bilan.generation, groupe: bilan.groupes[0].cle, debut: 0 });
  const reponse = b.messages[0];
  assert.ok(reponse.type === 'lignes' && reponse.demande === courante && reponse.generation === bilan.generation);
  assert.ok(reponse.total > 0 && reponse.lignes.length === Math.min(reponse.total, 50));
  assert.ok(reponse.lignes.every((ligne) => ligne.ancien.split('/').length === ligne.nouveau.split('/').length && ligne.marques.length > 0), 'chaque ligne porte l’ancien et le nouveau nom complets, de même nombre de segments');
  b.vider();
  await b.envoyer({ type: 'termes', generation: bilan.generation, recherche: '', filtre: 'tous', debut: 0 });
  await b.envoyer({ type: 'fiche', generation: bilan.generation, terme: 'fill' });
  assert.deepEqual(b.messages.map((m) => m.type), ['termes', 'fiche']);
  const fiche = b.messages[1];
  assert.ok(fiche.type === 'fiche' && fiche.fiche.aRenommer.exemples.length <= 3 && fiche.fiche.aRenommer.nombre >= fiche.fiche.aRenommer.exemples.length);
});

test('le détail du vocabulaire donne chaque terme de la liste avec ses segments, et chaque nom avec ses mots', async () => {
  const b = banc(FICHIER);
  await b.envoyer({ type: 'analyser' });
  const bilan = b.dernierBilan();
  b.vider();
  await b.envoyer({ type: 'termes', generation: bilan.generation, recherche: '', filtre: 'tous', debut: 0 });
  const demande = await b.envoyer({ type: 'diagnostic', generation: bilan.generation });
  const [page, reponse] = b.messages;
  assert.ok(page.type === 'termes' && reponse.type === 'diagnostic' && reponse.demande === demande);
  const detail = JSON.parse(reponse.texte);
  assert.equal(detail.version, 1);
  assert.equal(detail.termes.length, page.comptes.tous);
  const fill = detail.termes.find((terme: { mot: string }) => terme.mot === 'fill');
  assert.ok(fill && fill.segments.length > 0 && fill.segments.every((segment: { segment: string; mots: string[]; exemple: string }) =>
    segment.mots.some((mot) => mot.toLowerCase() === 'fill') && segment.exemple.split('/').includes(segment.segment)));
  assert.ok(detail.noms.every((nom: { nom: string; mots: string[][] }) => nom.mots.length === nom.nom.split('/').length));
  assert.ok(Array.isArray(detail.regles.termes));
});

test('une lecture avant toute analyse reçoit generation-perimee, ou analyse-en-cours pendant l\'analyse', async () => {
  const b = banc(FICHIER);
  const seule = await b.envoyer({ type: 'lignes', generation: 1, groupe: 'x', debut: 0 });
  assert.deepEqual(b.messages, [{ type: 'erreur', demande: seule, code: 'generation-perimee' }]);
  b.vider();
  const analyse = b.instance.recevoir({ type: 'analyser', demande: 10 });
  await b.instance.recevoir({ type: 'lignes', demande: 11, generation: 1, groupe: 'x', debut: 0 });
  assert.deepEqual(b.messages.filter((m) => m.type === 'erreur'), [{ type: 'erreur', demande: 11, code: 'analyse-en-cours' }]);
  await analyse;
});

test('une nouvelle analyse abandonne la précédente, qui ne répond pas', async () => {
  const b = banc(FICHIER);
  const premiere = b.instance.recevoir({ type: 'analyser', demande: 1 });
  const seconde = b.instance.recevoir({ type: 'analyser', demande: 2 });
  await Promise.all([premiere, seconde]);
  assert.deepEqual(b.bilans().map((m) => m.demande), [2]);
  assert.equal(b.messages.filter((m) => m.type === 'erreur').length, 0);
  assert.equal(b.dernierBilan().generation, 1);
});

test('les calculs passent un à un, dans l\'ordre des demandes', async () => {
  const b = banc(FICHIER);
  const toutes = [
    b.instance.recevoir({ type: 'analyser', demande: 1 }),
    b.instance.recevoir({ type: 'regle', demande: 2, geste: regleEcriture }),
    b.instance.recevoir({ type: 'configurer', demande: 3, collectionsExclues: [] }),
  ];
  await Promise.all(toutes);
  assert.deepEqual(b.bilans().map((m) => [m.demande, m.bilan.generation]), [[1, 1], [2, 2], [3, 3]]);
});

test('un geste en conflit répond refus, sans rien écrire ni changer de génération', async () => {
  const b = banc(FICHIER);
  await b.envoyer({ type: 'analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const avant = new Map(b.stock);
  const generation = b.dernierBilan().generation;
  b.vider();
  const demande = await b.envoyer({ type: 'regle', geste: { type: 'remplace-termes', terme: 'disabled', termes: ['hover'] } });
  const refus = b.messages[0];
  assert.ok(refus.type === 'refus' && refus.demande === demande);
  assert.equal(refus.conflits[0].type, 'contredit-ucm');
  assert.deepEqual(b.messages.map((m) => m.type), ['refus']);
  assert.deepEqual(new Map(b.stock), avant);
  const encore = await b.envoyer({ type: 'lignes', generation, groupe: 'x', debut: 0 });
  const lignes = b.messages.at(-1)!;
  assert.ok(lignes.type === 'lignes' && lignes.demande === encore, 'la génération n\'a pas changé');
});

test('appliquer refuse une génération périmée et des règles modifiées depuis le calcul', async () => {
  const b = banc(FICHIER);
  await b.envoyer({ type: 'analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const bilan = b.dernierBilan();
  const selection = { groupes: bilan.groupes.map((g) => g.cle), exclus: [], inclus: [] };
  b.vider();
  const perimee = await b.envoyer({ type: 'appliquer', generation: bilan.generation - 1, selection });
  assert.deepEqual(b.messages, [{ type: 'erreur', demande: perimee, code: 'generation-perimee' }]);
  b.vider();
  b.stock.set('terme:quux', JSON.stringify({ version: 1, terme: ['quux'], remplace: [['quuxed']] }));
  const modifiees = await b.envoyer({ type: 'appliquer', generation: bilan.generation, selection });
  assert.deepEqual(b.messages, [{ type: 'erreur', demande: modifiees, code: 'regles-modifiees' }]);
  assert.equal(b.noms.get('v1'), 'Button/Fill Hover', 'rien n\'est écrit');
  // Une règle qui ne change pas les renommages (une paire distincte) ne bloque pas.
  b.stock.delete('terme:quux');
  b.stock.set('distinct:a|b', JSON.stringify({ version: 1 }));
  b.vider();
  await b.envoyer({ type: 'appliquer', generation: bilan.generation, selection });
  assert.equal(b.messages[0].type, 'application');
});

test('appliquer saute un nom que quelqu\'un a renommé dans Figma', async () => {
  const b = banc(FICHIER);
  await b.envoyer({ type: 'analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const bilan = b.dernierBilan();
  b.changer('v1', 'Button/Fill Over');
  b.vider();
  await b.envoyer({ type: 'appliquer', generation: bilan.generation, selection: { groupes: bilan.groupes.map((g) => g.cle), exclus: [], inclus: [] } });
  const application = b.messages[0];
  assert.ok(application.type === 'application');
  assert.equal(application.resultat.statut, 'partiel');
  assert.equal(application.resultat.sautes, 1);
  assert.equal(b.noms.get('v1'), 'Button/Fill Over');
  assert.equal(b.noms.get('v2'), 'button/fill-pressed');
});

test('une application refusée répond par application seule, sans bilan', async () => {
  const b = banc({ ...FICHIER, protegees: ['v1', 'v2', 'v3'] });
  await b.envoyer({ type: 'analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const bilan = b.dernierBilan();
  assert.equal(bilan.proteges, 3);
  assert.equal(bilan.groupes.length, 0, 'une variable protégée n\'est pas proposée');
  b.vider();
  await b.envoyer({ type: 'annuler-dernier' });
  assert.deepEqual(b.messages.map((m) => m.type === 'application' ? m.resultat.statut : m.type), ['refuse']);
});

test('un geste de terme recalcule les seules portées touchées, sans lire Figma ni refaire le lexique', async () => {
  const b = banc({
    collections: [['c1', 'Brand'], ['c2', 'Card']],
    variables: [['v1', 'btn/quux-bg', 'c1'], ['v2', 'card/title-text', 'c2'], ['v3', 'card/body-text', 'c2']],
  });
  await b.envoyer({ type: 'analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const lectures = { ...b.lectures };
  const compteurs = { ...b.compteurs };
  b.portees.length = 0;
  await b.envoyer({ type: 'regle', geste: { type: 'remplacer-par', terme: 'quux', par: 'baz' } });
  assert.deepEqual(b.lectures, lectures, 'aucune lecture de Figma');
  assert.equal(b.compteurs.commencerLexique, compteurs.commencerLexique, 'le lexique et sa détection de conventions restent');
  assert.deepEqual(b.portees, [[JSON.stringify(['collection', 'c1'])]], 'seule la portée où apparaît le terme est recalculée');
  assert.equal(b.compteurs.detecter, compteurs.detecter + 1, 'un nouveau terme change les questions');
  const groupe = b.dernierBilan().groupes.find((g) => g.regle.sorte === 'terme');
  assert.ok(groupe);
  assert.equal(groupe.variables, 1);
  assert.equal(groupe.apercu[0].id, JSON.stringify(['variable', 'v1']));
  assert.ok(b.stock.has('terme:baz'));

  // Une écriture autre recalcule tout, sans refaire le lexique non plus.
  b.portees.length = 0;
  await b.envoyer({ type: 'regle', geste: { type: 'ecriture', ecriture: { groupes: minusculesTirets, variables: { casse: 'initiale', separateur: 'tiret' } } } });
  assert.deepEqual(b.portees, [undefined]);
  assert.equal(b.compteurs.commencerLexique, compteurs.commencerLexique);
  assert.equal(b.compteurs.detecter, compteurs.detecter + 1, 'une écriture ne change pas les questions');
  assert.deepEqual(b.lectures, lectures);
});

test('mettre une question de côté agrandit le plafond des questions de sa place', async () => {
  const b = banc({ variables: [['v1', 'tile/quux/fill'], ['v2', 'tile/quux/fg'], ['v3', 'tile/quuxed/text'], ['v4', 'tile/quuxed/line']] });
  await b.envoyer({ type: 'analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const question = b.dernierBilan().questions[0];
  assert.ok(question && question.type === 'paire');
  assert.equal(b.maximums.at(-1), 10);
  await b.envoyer({ type: 'repondre', question: question.cle, reponse: { type: 'plus-tard' } });
  assert.equal(b.maximums.at(-1), 11, 'la question mise de côté ne prend pas une des dix places');
  assert.deepEqual(b.dernierBilan().questions, []);
  assert.deepEqual(b.dernierBilan().plusTard.map((q) => q.cle), [question.cle]);
  await b.envoyer({ type: 'regle', geste: { type: 'reprendre', question: question.cle } });
  assert.equal(b.maximums.at(-1), 10);
  assert.deepEqual(b.dernierBilan().questions.map((q) => q.cle), [question.cle]);
  assert.deepEqual([...b.stock.keys()].filter((cle) => cle.startsWith('plus-tard:') || cle.startsWith('reponse:')), []);
});

test('répondre garde un terme, ajoute ses renommages ; Annuler défait la réponse', async () => {
  const b = banc({ variables: [['v1', 'tile/quux/fill'], ['v2', 'tile/quux/fg'], ['v3', 'tile/quuxed/text'], ['v4', 'tile/quuxed/line']] });
  await b.envoyer({ type: 'analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const question = b.dernierBilan().questions[0];
  assert.ok(question && question.type === 'paire');
  const gardee = question.termes[0].mot === 'quux' ? 0 : 1;
  await b.envoyer({ type: 'repondre', question: question.cle, reponse: { type: 'garder', rang: gardee } });
  assert.deepEqual(JSON.parse(b.stock.get('terme:quux')!).remplace, [['quuxed']]);
  assert.ok(b.stock.has(`reponse:${question.cle}`));
  const repondu = b.dernierBilan();
  assert.ok(!repondu.questions.some((q) => q.cle === question.cle));
  assert.equal(repondu.groupes.find((g) => g.regle.sorte === 'terme')?.variables, 2);

  await b.envoyer({ type: 'regle', geste: { type: 'annuler-reponse', question: question.cle } });
  assert.ok(!b.stock.has('terme:quux') && !b.stock.has(`reponse:${question.cle}`));
  const annule = b.dernierBilan();
  assert.ok(annule.questions.some((q) => q.cle === question.cle));
  assert.equal(annule.groupes.some((g) => g.regle.sorte === 'terme'), false);
});

test('configurer refait le lexique depuis l\'inventaire en mémoire, sans relire Figma', async () => {
  const b = banc({
    collections: [['c1', 'Brand'], ['c2', 'Card']],
    variables: [['v1', 'Btn/Fill Hover', 'c1'], ['v2', 'Card/Fill Hover', 'c2']],
  });
  await b.envoyer({ type: 'analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  assert.equal(b.dernierBilan().groupes.reduce((n, g) => n + g.variables, 0), 2);
  const lectures = { ...b.lectures };
  const lexiques = b.compteurs.commencerLexique;
  await b.envoyer({ type: 'configurer', collectionsExclues: ['c2', 'inconnue'] });
  assert.deepEqual(b.lectures, lectures);
  assert.equal(b.compteurs.commencerLexique, lexiques + 1);
  const bilan = b.dernierBilan();
  assert.deepEqual(bilan.collections.map((c) => [c.id, c.analysee]), [['c1', true], ['c2', false]]);
  assert.equal(bilan.groupes.reduce((n, g) => n + g.variables, 0), 1);
  assert.deepEqual(JSON.parse(b.stock.get('exclues')!).ids, ['c2']);
  await b.envoyer({ type: 'configurer', collectionsExclues: [] });
  assert.ok(!b.stock.has('exclues'));
  assert.equal(b.dernierBilan().groupes.reduce((n, g) => n + g.variables, 0), 2);
});

test('export puis import : illisible, conflit refusé, import valide suivi d\'un bilan', async () => {
  const b = banc(FICHIER);
  await b.envoyer({ type: 'analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const generation = b.dernierBilan().generation;
  b.vider();
  const exportee = await b.envoyer({ type: 'exporter' });
  const message = b.messages[0];
  assert.ok(message.type === 'regles-exportees' && message.demande === exportee);
  assert.equal(JSON.parse(message.texte).version, 1);

  b.vider();
  const illisible = await b.envoyer({ type: 'importer', texte: 'pas du json' });
  assert.deepEqual(b.messages, [{ type: 'erreur', demande: illisible, code: 'import-illisible' }]);

  b.vider();
  const conflit = JSON.stringify({ version: 1, termes: [{ terme: ['disabled'], remplace: [['hover']] }] });
  const refusee = await b.envoyer({ type: 'importer', texte: conflit });
  assert.ok(b.messages[0].type === 'refus' && b.messages[0].demande === refusee);
  assert.ok(!b.stock.has('terme:disabled'));

  b.vider();
  await b.envoyer({ type: 'importer', texte: JSON.stringify({ version: 1, termes: [{ terme: ['quux'], remplace: [['quuxed']] }] }) });
  assert.ok(b.stock.has('terme:quux'));
  assert.deepEqual(b.messages.map((m) => m.type), ['bilan']);
  assert.equal(b.dernierBilan().generation, generation + 1);
});

test('la frontière de l\'écran et la session ensemble : une réponse périmée ne s\'affiche pas', async () => {
  const b = banc(FICHIER);
  const affiches: string[] = [];
  const attente: Promise<void>[] = [];
  const frontiere = creerFrontiere({
    envoyer: (demande) => { attente.push(b.instance.recevoir(demande)); },
    afficher: (message) => { affiches.push(message.type); },
  });
  // La session répond par `envoyer` du banc : on rejoue ses messages dans la frontière.
  const rejouer = async () => {
    await Promise.all(attente.splice(0));
    for (const message of b.messages.splice(0)) frontiere.recevoir(message);
  };
  frontiere.analyser();
  await rejouer();
  assert.equal(frontiere.generation(), 1);
  const lecture = frontiere.lignes('x', 0);
  assert.ok(lecture !== null);
  frontiere.regle(regleEcriture);
  await rejouer();
  assert.equal(frontiere.generation(), 2);
  // La lecture de la génération 1 a reçu generation-perimee ; l'écran l'a ignorée comme périmée ou l'a affichée comme erreur.
  assert.equal(frontiere.calculEnCours(), false);
  assert.ok(affiches.includes('bilan'));
});

const COLLECTION_INCONNUE: OptionsDuBanc = {
  collections: [['c', 'Zorglub']],
  variables: [['v1', 'fill/main'], ['v2', 'fill/alt'], ['v3', 'fg/main']],
};

test('renommer une collection : une carte dans Renommages, l\'application la renomme, Annuler défait la réponse', async () => {
  const b = banc(COLLECTION_INCONNUE);
  await b.envoyer({ type: 'analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const question = b.dernierBilan().questions.find((q) => q.type === 'collection');
  assert.ok(question && question.type === 'collection' && question.nombre === 3);
  const lectures = { ...b.lectures };
  await b.envoyer({ type: 'repondre', question: question.cle, reponse: { type: 'collection', cible: 'color-brands' } });
  assert.deepEqual(b.lectures, lectures, 'aucune lecture de Figma');
  assert.deepEqual(JSON.parse(b.stock.get(question.cle)!), { version: 1, cible: 'color-brands' });
  const bilan = b.dernierBilan();
  assert.ok(!bilan.questions.some((q) => q.cle === question.cle), 'la question n\'est plus posée');
  const groupe = bilan.groupes.find((g) => g.regle.sorte === 'collection');
  assert.ok(groupe);
  assert.deepEqual([groupe.avant, groupe.apres, groupe.collections, groupe.variables], ['Zorglub', 'color-brands', 1, 0]);

  // La réponse s'annule exactement : l'entrée disparaît et la question revient.
  await b.envoyer({ type: 'regle', geste: { type: 'annuler-reponse', question: question.cle } });
  assert.ok(!b.stock.has(question.cle) && !b.stock.has(`reponse:${question.cle}`));
  assert.equal(b.dernierBilan().groupes.some((g) => g.regle.sorte === 'collection'), false);
  assert.ok(b.dernierBilan().questions.some((q) => q.cle === question.cle));

  await b.envoyer({ type: 'repondre', question: question.cle, reponse: { type: 'collection', cible: 'color-brands' } });
  const avecRegle = b.dernierBilan();
  b.vider();
  await b.envoyer({ type: 'appliquer', generation: avecRegle.generation, selection: { groupes: avecRegle.groupes.map((g) => g.cle), exclus: [], inclus: [] } });
  assert.equal(b.noms.get('c'), 'color-brands');
  assert.equal(b.noms.get('v1'), 'fill/main');
  assert.equal(b.dernierBilan().groupes.some((g) => g.regle.sorte === 'collection'), false);
});

test('renommer une collection vers un nom déjà pris est un blocage, pas un renommage', async () => {
  const b = banc({ collections: [['c', 'Zorglub'], ['d', 'color-brands']], variables: [['v1', 'fill/main', 'c'], ['v2', 'fill/alt', 'c'], ['v3', 'fg/main', 'd']] });
  await b.envoyer({ type: 'analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const question = b.dernierBilan().questions.find((q) => q.type === 'collection');
  assert.ok(question);
  await b.envoyer({ type: 'repondre', question: question.cle, reponse: { type: 'collection', cible: 'color-brands' } });
  const bilan = b.dernierBilan();
  assert.equal(bilan.groupes.some((g) => g.regle.sorte === 'collection'), false);
  assert.deepEqual(bilan.bloques.map((x) => [x.avant, x.apres]), [['Zorglub', 'color-brands']]);
});

// Les courses pendant `ouvrir` (AI6, AI7, AC13) : la lecture d'écriture se termine après les contrôles de la session.

async function pretAAppliquer(options: OptionsDuBanc) {
  const b = banc(options);
  await b.envoyer({ type: 'analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const bilan = b.dernierBilan();
  b.vider();
  const appliquer = () => b.envoyer({ type: 'appliquer', generation: bilan.generation, selection: { groupes: bilan.groupes.map((g) => g.cle), exclus: [], inclus: [] } });
  return { b, appliquer };
}

test('AI6 : une variable qui devient protégée pendant ouvrir n’est pas renommée', async () => {
  const { b, appliquer } = await pretAAppliquer(FICHIER);
  b.pendantOuvrir.action = () => { b.protegees.push('v1'); };
  await appliquer();
  const application = b.messages.find((m) => m.type === 'application');
  assert.ok(application && application.type === 'application');
  assert.equal(b.noms.get('v1'), 'Button/Fill Hover');
  assert.equal(b.noms.get('v2'), 'button/fill-pressed');
  assert.equal(application.resultat.statut, 'partiel');
  assert.equal(application.resultat.sautes, 1);
});

test('AI6 : un autre objet qui prend le nom visé pendant ouvrir fait sauter le renommage en collision', async () => {
  const { b, appliquer } = await pretAAppliquer({ ...FICHIER, variables: [...FICHIER.variables!, ['v4', 'Autre']] });
  b.pendantOuvrir.action = () => { b.changer('v4', 'button/fill-hover'); };
  await appliquer();
  const application = b.messages.find((m) => m.type === 'application');
  assert.ok(application && application.type === 'application');
  assert.equal(b.noms.get('v1'), 'Button/Fill Hover', 'le doublon exact est évité');
  assert.equal(b.noms.get('v4'), 'button/fill-hover');
  assert.equal(b.noms.get('v2'), 'button/fill-pressed');
  assert.ok(application.resultat.sautes >= 1);
});

test('AI7 : une règle écrite pendant ouvrir refuse le lot en regles-modifiees, sans rien écrire', async () => {
  const { b, appliquer } = await pretAAppliquer(FICHIER);
  b.pendantOuvrir.action = () => { b.stock.set('terme:quux', JSON.stringify({ version: 1, terme: ['quux'], remplace: [['quuxed']] })); };
  const demande = await appliquer();
  assert.deepEqual(b.messages, [{ type: 'erreur', demande, code: 'regles-modifiees' }]);
  assert.equal(b.noms.get('v1'), 'Button/Fill Hover');
  assert.equal(b.noms.get('v3'), 'fontSize/Body');
  assert.equal(b.stock.has('journal'), false, 'aucun journal rangé');
});

test('AC13 : une annulation lit la protection pendant ouvrir et saute la variable devenue protégée', async () => {
  const { b, appliquer } = await pretAAppliquer(FICHIER);
  await appliquer();
  assert.equal(b.noms.get('v1'), 'button/fill-hover');
  b.vider();
  b.pendantOuvrir.action = () => { b.protegees.push('v1'); };
  await b.envoyer({ type: 'annuler-dernier' });
  assert.equal(b.noms.get('v1'), 'button/fill-hover');
  assert.equal(b.noms.get('v2'), 'Button/Fill Pressed');
});

// Le vocabulaire sur un extrait du Playground

const CRANS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const PLAYGROUND: OptionsDuBanc = {
  collections: [['c1', 'components'], ['c2', 'primitives'], ['c3', 'typography'], ['c4', 'theme']],
  variables: [
    ['s1', 'StressTest/Info/ScaleWrap/Colors/Scale-1', 'c1'], ['s2', 'StressTest/Info/ScaleWrap/Colors/Scale-2', 'c1'], ['s3', 'StressTest/Info/TextColumns/Colors/Title', 'c1'],
    ['b1', 'Button/Colors/Primary/Outlined/Default/Background', 'c1'], ['b2', 'Button/Colors/Primary/Outlined/Hover/Background', 'c1'], ['b3', 'Button/Sizes/Medium/Padding-x', 'c1'],
    ...CRANS.map((cran): SpecVariable => [`p${cran}`, `colors/Poppy/soft/light/${cran}`, 'c2']),
    ['sky', 'colors/Sky/500', 'c2'],
    ['l1', 'lineheight/3xl', 'c3'], ['l2', 'lineheight/xl', 'c3'], ['f1', 'fontsize/base', 'c3'], ['d1', 'Display/Large/LineHeight', 'c4'],
  ],
  palettes: { sky: 'palette-sky' },
};

test('le vocabulaire du Playground : noms et mots se séparent, les cinq filtres et leurs comptes répondent', async () => {
  const b = banc(PLAYGROUND);
  await b.envoyer({ type: 'analyser' });
  const bilan = b.dernierBilan();
  const lire = async (filtre: 'tous' | 'avec-regle' | 'sans-regle' | 'composants' | 'palettes') => {
    b.vider();
    await b.envoyer({ type: 'termes', generation: bilan.generation, recherche: '', filtre, debut: 0 });
    const message = b.messages[0];
    assert.ok(message.type === 'termes');
    return message;
  };
  const tous = await lire('tous');
  const mots = tous.termes.map((terme) => terme.mot);
  for (const absent of ['line', 'height', 'stress', 'test', 'wrap', 'columns', 'components', 'primitives', 'typography', 'theme']) assert.equal(mots.includes(absent), false, absent);
  const stress = tous.termes.find((terme) => terme.mot === 'stress-test');
  assert.deepEqual([stress?.forme, stress?.nature, stress?.nombre], ['StressTest', 'composant', 3]);
  const hauteur = tous.termes.find((terme) => terme.mot === 'line-height');
  assert.deepEqual([hauteur?.forme, hauteur?.nombre], ['lineheight', 3]);

  assert.deepEqual((await lire('composants')).termes.map((terme) => terme.mot).sort(), ['button', 'scale-wrap', 'stress-test', 'text-columns']);
  assert.deepEqual((await lire('palettes')).termes.map((terme) => terme.mot).sort(), ['poppy', 'sky'], 'sky n’a qu’un cran : l’identifiant de palette lu dans Figma suffit');
  const sans = await lire('sans-regle');
  assert.equal(sans.termes.some((terme) => ['button', 'poppy', 'sky'].includes(terme.mot)), false);
  assert.ok(sans.termes.every((terme) => terme.nature === null));
  const { comptes } = tous;
  assert.deepEqual([comptes.tous, comptes.composants, comptes.palettes], [tous.total, 4, 2]);
  assert.equal(comptes.avecRegle, (await lire('avec-regle')).total);
  assert.equal(comptes.sansRegle, sans.total);
  assert.equal(comptes.tous, comptes.avecRegle + comptes.sansRegle + comptes.composants + comptes.palettes);
});

test('le vocabulaire du Playground : la fiche et le détail portent la forme et la nature', async () => {
  const b = banc(PLAYGROUND);
  await b.envoyer({ type: 'analyser' });
  const { generation } = b.dernierBilan();
  b.vider();
  await b.envoyer({ type: 'fiche', generation, terme: 'stress-test' });
  await b.envoyer({ type: 'diagnostic', generation });
  const [fiche, diagnostic] = b.messages;
  assert.ok(fiche.type === 'fiche' && diagnostic.type === 'diagnostic');
  assert.deepEqual([fiche.fiche.forme, fiche.fiche.nature, fiche.fiche.emploi.nombre, fiche.fiche.emploi.exemples[0].marques], ['StressTest', 'composant', 3, [0]]);
  const detail = JSON.parse(diagnostic.texte);
  const nom = detail.noms.find((autre: { nom: string }) => autre.nom === 'StressTest/Info/ScaleWrap/Colors/Scale-1');
  assert.deepEqual(nom.natures, ['composant', null, 'element', null, null]);
  assert.deepEqual(nom.termes, [['StressTest'], ['Info'], ['ScaleWrap'], ['Colors'], ['Scale', '1']]);
  const terme = detail.termes.find((autre: { mot: string }) => autre.mot === 'stress-test');
  assert.deepEqual([terme.forme, terme.nature], ['StressTest', 'composant']);
  assert.equal(detail.noms.find((autre: { nom: string }) => autre.nom === 'components').termes.every((formes: string[]) => formes.length === 0), true);
});
