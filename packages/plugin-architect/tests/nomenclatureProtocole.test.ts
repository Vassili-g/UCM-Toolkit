/** Le protocole de bout en bout : la session avec un port factice, de `analyser` à `application`. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ObjetModifiable, PortDeRegles, SessionEcriture, VariableModifiable } from '../src/ecriture/noms';
import type { EtatDeLaMarque } from '@ucm-kit/core/protocoles';
import { inventaireDeLectures, type PortDeLecture } from '../src/nomenclature/lecture';
import { TYPES_DE_TERMES, type Bilan, type DemandeDeNomenclature, type GesteSurLesRegles, type MessageDeNomenclature, type TermeDeListe, type TypeDeTerme } from '../src/messages/nomenclature';
import { creerSession, moteurDuKit, type Moteur } from '../src/nomenclature/session';
import { creerFrontiere } from '../src/ui/nomenclature/frontiere';

const HEURE = '2026-10-18T10:00:00.000Z';
const minusculesTirets = { casse: 'minuscules', separateur: 'tiret' } as const;
const ecriture = { groupes: minusculesTirets, variables: minusculesTirets };

type SpecVariable = readonly [id: string, nom: string, collection?: string];
interface OptionsDuBanc {
  /** Le nombre de modes est facultatif : sans lui, la collection n'expose pas ses modes. */
  readonly collections?: readonly (readonly [id: string, nom: string, modes?: number])[];
  readonly variables?: readonly SpecVariable[];
  readonly protegees?: readonly string[];
  /** L'identifiant de palette que Palettes écrit dans la donnée partagée d'une variable, par identifiant de variable. */
  readonly palettes?: Readonly<Record<string, string>>;
  /** L'état de la marque `nommage` de Palettes ; `absente` par défaut. */
  readonly marque?: EtatDeLaMarque;
}

/** Un fichier Figma factice : il compte ses lectures et trace les noms écrits. */
function banc(options: OptionsDuBanc = {}) {
  const noms = new Map<string, string>();
  const lectures = { collections: 0, variables: 0 };
  const compteurs = { commencerLexique: 0, normaliser: 0, detecter: 0 };
  const portees: (readonly string[] | undefined)[] = [];
  const maximums: (number | undefined)[] = [];
  const stock = new Map<string, string>();
  const messages: MessageDeNomenclature[] = [];
  const collections = new Map<string, ObjetModifiable>();
  const variables = new Map<string, VariableModifiable>();
  const creer = <T extends object>(id: string, nom: string, extra: T) => {
    noms.set(id, nom);
    return { id, remote: false, ...extra, get name() { return noms.get(id)!; }, set name(valeur: string) { noms.set(id, valeur); } };
  };
  const modes = new Map<string, number>();
  for (const [id, nom, nombre] of options.collections ?? [['c', 'components']]) {
    collections.set(id, creer(id, nom, {}));
    if (nombre !== undefined) modes.set(id, nombre);
  }
  const collectionsLues = () => [...collections.values()].map((o) => ({ id: o.id, name: o.name, remote: false, ...(modes.has(o.id) ? { modes: Array.from({ length: modes.get(o.id)! }, () => ({})) } : {}) }));
  for (const [id, nom, collection = 'c'] of options.variables ?? []) variables.set(id, creer(id, nom, { variableCollectionId: collection }));
  const protegees = [...(options.protegees ?? [])];
  /**
   * Une lecture de Palettes refusée : `actif` refuse tout (le suivi et la marque sont illisibles, donc seules les variables
   * à marqueur restent décidées), `ids` ne rend indécidables que ces variables.
   */
  const refus = { actif: false, ids: [] as string[] };
  const lecture: PortDeLecture = {
    collections: async () => { lectures.collections++; return collectionsLues(); },
    variables: async () => { lectures.variables++; return [...variables.values()].map((o) => ({ id: o.id, name: o.name, variableCollectionId: o.variableCollectionId, remote: false })); },
    cibleAlias: () => undefined,
    protegee: (variable) => !refus.actif && protegees.includes(variable.id),
    palette: (variable) => options.palettes?.[variable.id],
    indecidable: (variable) => (refus.actif || refus.ids.includes(variable.id)) && !lecture.protegee(variable),
    marqueDePalettes: () => (refus.actif ? 'refusee' : options.marque ?? 'absente'),
  };
  /** Ce qui arrive dans Figma pendant `ouvrir`, avant que la lecture d'écriture ne s'achève. */
  const pendantOuvrir = { action: undefined as (() => void) | undefined };
  const session = (): SessionEcriture => ({
    inventaire: inventaireDeLectures(
      collectionsLues(),
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
    commencerLexique: (opts) => { compteurs.commencerLexique++; return moteurDuKit.commencerLexique(opts); },
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
  const envoyer = async (demande: DistributiveOmit<DemandeDeNomenclature, 'demande'>): Promise<number> => {
    numero++;
    await instance.recevoir({ ...demande, demande: numero } as DemandeDeNomenclature);
    return numero;
  };
  const bilans = () => messages.filter((m): m is Extract<MessageDeNomenclature, { type: 'bilan' }> => m.type === 'bilan');
  return {
    noms, lectures, protegees, refus, pendantOuvrir, compteurs, portees, maximums, stock, regles, messages, instance, envoyer, bilans,
    dernierBilan: (): Bilan => bilans().at(-1)!.bilan,
    vider: () => { messages.length = 0; },
    /** Une modification faite hors du plugin. */
    changer: (id: string, nom: string) => { noms.set(id, nom); },
  };
}
type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

const regleEcriture: GesteSurLesRegles = { type: 'ecriture', ecriture };
const TOUS = { recherche: '', types: [], origines: [], places: [], tri: 'alpha', section: null, place: null, debut: 0 } as const;

/** Les termes de chaque type demandé, lus section par section : la première page de cinquante lignes de chacune. */
async function lireLesTermes(b: ReturnType<typeof banc>, generation: number, types: readonly TypeDeTerme[] = TYPES_DE_TERMES): Promise<TermeDeListe[]> {
  const termes: TermeDeListe[] = [];
  for (const section of types) {
    b.vider();
    await b.envoyer({ type: 'termes', generation, ...TOUS, section });
    const message = b.messages[0];
    assert.ok(message.type === 'termes' && message.section === section && message.sections.length === 1);
    termes.push(...message.sections[0].termes);
  }
  return termes;
}
const FICHIER: OptionsDuBanc = {
  collections: [['c', 'Brand']],
  variables: [['v1', 'Button/Fill Hover'], ['v2', 'Button/Fill Pressed'], ['v3', 'fontSize/Body']],
};

test('l’architecture est rangée et relue au bilan sans ajouter d’historique', async () => {
  const b = banc(FICHIER);
  await b.envoyer({ type: 'noms-analyser' });
  assert.equal(b.dernierBilan().architecture, 'absente');
  for (const ucm of [true, false]) {
    await b.envoyer({ type: 'regle', geste: { type: 'architecture', ucm } });
    assert.equal(b.stock.get('architecture'), JSON.stringify({ version: 1, ucm }));
    assert.equal(b.dernierBilan().architecture, ucm ? 'ucm' : 'libre');
    assert.equal(b.dernierBilan().dernierImport, null);
    assert.equal(b.dernierBilan().dernierRenommage, null);
  }
  await b.envoyer({ type: 'importer', texte: '{"version":1}' });
  assert.equal(b.dernierBilan().architecture, 'libre');
  await b.envoyer({ type: 'exporter' });
  const exporte = b.messages.at(-1)!;
  assert.ok(exporte.type === 'regles-exportees');
  assert.equal(JSON.parse(exporte.texte).architecture, false);
  await b.envoyer({ type: 'importer', texte: '{"version":1,"architecture":true}' });
  assert.equal(b.dernierBilan().architecture, 'ucm');
});

test('une écriture d’architecture refusée renvoie l’état relu après le retour des données', async () => {
  const b = banc(FICHIER);
  await b.envoyer({ type: 'noms-analyser' });
  b.stock.set('architecture', '{"version":2}');
  b.regles.ecrire = () => { throw new Error('refus Figma'); };
  const demande = await b.envoyer({ type: 'regle', geste: { type: 'architecture', ucm: true } });
  assert.deepEqual(b.messages.at(-1), { type: 'erreur', demande, code: 'echec', architecture: 'future' });
  assert.equal(b.stock.get('architecture'), '{"version":2}');
});

test('de analyser à application : le premier bilan, l\'écriture, l\'application et son bilan neuf', async () => {
  const b = banc(FICHIER);
  const analyse = await b.envoyer({ type: 'noms-analyser' });
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
  await b.envoyer({ type: 'noms-analyser' });
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
  await b.envoyer({ type: 'termes', generation: bilan.generation, ...TOUS });
  await b.envoyer({ type: 'fiche', generation: bilan.generation, terme: 'fill' });
  assert.deepEqual(b.messages.map((m) => m.type), ['termes', 'fiche']);
  const fiche = b.messages[1];
  assert.ok(fiche.type === 'fiche' && fiche.fiche.aRenommer.exemples.length <= 3 && fiche.fiche.aRenommer.nombre >= fiche.fiche.aRenommer.exemples.length);
});

test('N06 : la lecture selection rend le groupe principal des identifiants encore à renommer, et omet les autres', async () => {
  const b = banc(PLAYGROUND);
  await b.envoyer({ type: 'noms-analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const bilan = b.dernierBilan();
  const [premier, second] = bilan.groupes.filter((groupe) => groupe.apercu.length > 0);
  assert.ok(premier && second, 'le fichier a au moins deux groupes qui montrent des noms');
  const renommee = premier.apercu[0].id;
  const autre = second.apercu[0].id;
  b.vider();
  const demande = await b.envoyer({ type: 'noms-selection', generation: bilan.generation, exclus: [renommee, 'inconnue'], inclus: [autre] });
  assert.deepEqual(b.messages, [{ type: 'noms-selection', demande, generation: bilan.generation, principaux: [[renommee, premier.cle], [autre, second.cle]] }]);

  b.vider();
  const perimee = await b.envoyer({ type: 'noms-selection', generation: bilan.generation - 1, exclus: [renommee], inclus: [] });
  assert.deepEqual(b.messages, [{ type: 'erreur', demande: perimee, code: 'generation-perimee' }]);
});

test('N06 : un nom corrigé hors du plugin n’est plus rendu par la lecture selection après la nouvelle analyse', async () => {
  const b = banc(FICHIER);
  await b.envoyer({ type: 'noms-analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const avant = b.dernierBilan();
  b.vider();
  await b.envoyer({ type: 'lignes', generation: avant.generation, groupe: avant.groupes[0].cle, debut: 0 });
  const page = b.messages[0];
  assert.ok(page.type === 'lignes');
  const ids = page.lignes.map((ligne) => ligne.id);
  const corrigee = page.lignes.find((ligne) => ligne.ancien === 'fontSize/Body');
  assert.ok(corrigee && ids.length === 3);
  b.vider();
  await b.envoyer({ type: 'noms-selection', generation: avant.generation, exclus: ids, inclus: [] });
  const complete = b.messages[0];
  assert.ok(complete.type === 'noms-selection' && complete.principaux.map(([id]) => id).join() === ids.join(), 'trois noms sont à renommer');

  b.changer('v3', 'font-size/body');
  await b.envoyer({ type: 'noms-analyser' });
  const apres = b.dernierBilan();
  b.vider();
  await b.envoyer({ type: 'noms-selection', generation: apres.generation, exclus: ids, inclus: [] });
  const restreinte = b.messages[0];
  assert.ok(restreinte.type === 'noms-selection');
  assert.deepEqual(restreinte.principaux.map(([id]) => id), ids.filter((id) => id !== corrigee.id), 'le nom corrigé sort, les deux autres restent');
});

test('le détail du vocabulaire donne chaque terme de la liste avec ses segments, et chaque nom avec ses mots', async () => {
  const b = banc(FICHIER);
  await b.envoyer({ type: 'noms-analyser' });
  const bilan = b.dernierBilan();
  b.vider();
  await b.envoyer({ type: 'termes', generation: bilan.generation, ...TOUS });
  const demande = await b.envoyer({ type: 'diagnostic', generation: bilan.generation });
  const [page, reponse] = b.messages;
  assert.ok(page.type === 'termes' && reponse.type === 'diagnostic' && reponse.demande === demande);
  const detail = JSON.parse(reponse.texte);
  assert.equal(detail.version, 1);
  assert.equal(detail.termes.length, Object.values(page.comptes.types).reduce((somme, nombre) => somme + nombre, 0));
  assert.ok(detail.termes.every((terme: { type: string }) => TYPES_DE_TERMES.includes(terme.type as TypeDeTerme)), 'le détail porte le type de chaque terme');
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
  const analyse = b.instance.recevoir({ type: 'noms-analyser', demande: 10 });
  await b.instance.recevoir({ type: 'lignes', demande: 11, generation: 1, groupe: 'x', debut: 0 });
  assert.deepEqual(b.messages.filter((m) => m.type === 'erreur'), [{ type: 'erreur', demande: 11, code: 'analyse-en-cours' }]);
  await analyse;
});

test('une nouvelle analyse abandonne la précédente, qui ne répond pas', async () => {
  const b = banc(FICHIER);
  const premiere = b.instance.recevoir({ type: 'noms-analyser', demande: 1 });
  const seconde = b.instance.recevoir({ type: 'noms-analyser', demande: 2 });
  await Promise.all([premiere, seconde]);
  assert.deepEqual(b.bilans().map((m) => m.demande), [2]);
  assert.equal(b.messages.filter((m) => m.type === 'erreur').length, 0);
  assert.equal(b.dernierBilan().generation, 1);
});

test('les calculs passent un à un, dans l\'ordre des demandes', async () => {
  const b = banc(FICHIER);
  const toutes = [
    b.instance.recevoir({ type: 'noms-analyser', demande: 1 }),
    b.instance.recevoir({ type: 'regle', demande: 2, geste: regleEcriture }),
    b.instance.recevoir({ type: 'configurer', demande: 3, collectionsExclues: [] }),
  ];
  await Promise.all(toutes);
  assert.deepEqual(b.bilans().map((m) => [m.demande, m.bilan.generation]), [[1, 1], [2, 2], [3, 3]]);
});

test('un geste en conflit répond refus, sans rien écrire ni changer de génération', async () => {
  const b = banc(FICHIER);
  await b.envoyer({ type: 'noms-analyser' });
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
  await b.envoyer({ type: 'noms-analyser' });
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
  await b.envoyer({ type: 'noms-analyser' });
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
  await b.envoyer({ type: 'noms-analyser' });
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
  await b.envoyer({ type: 'noms-analyser' });
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
  await b.envoyer({ type: 'noms-analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const question = b.dernierBilan().questions[0];
  assert.ok(question && question.type === 'paire');
  assert.equal(b.maximums.at(-1), 10);
  await b.envoyer({ type: 'noms-repondre', question: question.cle, reponse: { type: 'plus-tard' } });
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
  await b.envoyer({ type: 'noms-analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const question = b.dernierBilan().questions[0];
  assert.ok(question && question.type === 'paire');
  const gardee = question.termes[0].mot === 'quux' ? 0 : 1;
  await b.envoyer({ type: 'noms-repondre', question: question.cle, reponse: { type: 'garder', rang: gardee } });
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
  await b.envoyer({ type: 'noms-analyser' });
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
  await b.envoyer({ type: 'noms-analyser' });
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
  await b.envoyer({ type: 'noms-analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const question = b.dernierBilan().questions.find((q) => q.type === 'collection');
  assert.ok(question && question.type === 'collection' && question.nombre === 3);
  const lectures = { ...b.lectures };
  await b.envoyer({ type: 'noms-repondre', question: question.cle, reponse: { type: 'collection', cible: 'brands' } });
  assert.deepEqual(b.lectures, lectures, 'aucune lecture de Figma');
  assert.deepEqual(JSON.parse(b.stock.get(question.cle)!), { version: 1, cible: 'brands' });
  const bilan = b.dernierBilan();
  assert.ok(!bilan.questions.some((q) => q.cle === question.cle), 'la question n\'est plus posée');
  const groupe = bilan.groupes.find((g) => g.regle.sorte === 'collection');
  assert.ok(groupe);
  assert.deepEqual([groupe.avant, groupe.apres, groupe.collections, groupe.variables], ['Zorglub', 'brands', 1, 0]);

  // La réponse s'annule exactement : l'entrée disparaît et la question revient.
  await b.envoyer({ type: 'regle', geste: { type: 'annuler-reponse', question: question.cle } });
  assert.ok(!b.stock.has(question.cle) && !b.stock.has(`reponse:${question.cle}`));
  assert.equal(b.dernierBilan().groupes.some((g) => g.regle.sorte === 'collection'), false);
  assert.ok(b.dernierBilan().questions.some((q) => q.cle === question.cle));

  await b.envoyer({ type: 'noms-repondre', question: question.cle, reponse: { type: 'collection', cible: 'brands' } });
  const avecRegle = b.dernierBilan();
  b.vider();
  await b.envoyer({ type: 'appliquer', generation: avecRegle.generation, selection: { groupes: avecRegle.groupes.map((g) => g.cle), exclus: [], inclus: [] } });
  assert.equal(b.noms.get('c'), 'brands');
  assert.equal(b.noms.get('v1'), 'fill/main');
  assert.equal(b.dernierBilan().groupes.some((g) => g.regle.sorte === 'collection'), false);
});

test('renommer une collection vers un nom déjà pris est un blocage, pas un renommage', async () => {
  const b = banc({ collections: [['c', 'Zorglub'], ['d', 'brands']], variables: [['v1', 'fill/main', 'c'], ['v2', 'fill/alt', 'c'], ['v3', 'fg/main', 'd']] });
  await b.envoyer({ type: 'noms-analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const question = b.dernierBilan().questions.find((q) => q.type === 'collection');
  assert.ok(question);
  await b.envoyer({ type: 'noms-repondre', question: question.cle, reponse: { type: 'collection', cible: 'brands' } });
  const bilan = b.dernierBilan();
  assert.equal(bilan.groupes.some((g) => g.regle.sorte === 'collection'), false);
  assert.deepEqual(bilan.bloques.map((x) => [x.avant, x.apres]), [['Zorglub', 'brands']]);
});

test('AUD-E2b : renommer une collection à modes vers la clé d’axe d’une collection exclue est un blocage, et Appliquer n’écrit rien', async () => {
  const b = banc({
    collections: [['c', 'Zorglub', 2], ['d', 'Primitives', 2]],
    variables: [['v1', 'primary', 'c'], ['v2', 'secondary', 'c'], ['v3', 'autre', 'd']],
  });
  await b.envoyer({ type: 'noms-analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  await b.envoyer({ type: 'configurer', collectionsExclues: ['d'] });
  const question = b.dernierBilan().questions.find((q) => q.type === 'collection' && q.nom === 'Zorglub');
  assert.ok(question);
  await b.envoyer({ type: 'noms-repondre', question: question.cle, reponse: { type: 'collection', cible: 'primitives' } });
  const bilan = b.dernierBilan();
  assert.equal(bilan.groupes.some((g) => g.regle.sorte === 'collection'), false);
  assert.deepEqual(bilan.bloques, [{
    avant: 'Zorglub', apres: 'primitives', collection: '',
    chemin: { motif: 'meme-axe', apres: 'primitives', autre: 'Primitives' },
  }]);
  b.vider();
  await b.envoyer({ type: 'appliquer', generation: bilan.generation, selection: { groupes: bilan.groupes.map((g) => g.cle), exclus: [], inclus: [] } });
  assert.deepEqual([b.noms.get('c'), b.noms.get('d')], ['Zorglub', 'Primitives']);
  assert.equal([...b.stock.keys()].some((cle) => cle.startsWith('journal')), false, 'aucun lot n’est rangé au journal');
});

test('AUD-E2b : la même réponse sur des collections sans modes lus reste un renommage proposé', async () => {
  const b = banc({
    collections: [['c', 'Zorglub'], ['d', 'Primitives']],
    variables: [['v1', 'primary', 'c'], ['v2', 'secondary', 'c'], ['v3', 'autre', 'd']],
  });
  await b.envoyer({ type: 'noms-analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  await b.envoyer({ type: 'configurer', collectionsExclues: ['d'] });
  const question = b.dernierBilan().questions.find((q) => q.type === 'collection' && q.nom === 'Zorglub');
  assert.ok(question);
  await b.envoyer({ type: 'noms-repondre', question: question.cle, reponse: { type: 'collection', cible: 'primitives' } });
  assert.deepEqual(b.dernierBilan().bloques, []);
  assert.ok(b.dernierBilan().groupes.some((g) => g.regle.sorte === 'collection' && g.apres === 'primitives'));
});

// Les courses pendant `ouvrir` (AI6, AI7, AC13) : la lecture d'écriture se termine après les contrôles de la session.

async function pretAAppliquer(options: OptionsDuBanc) {
  const b = banc(options);
  await b.envoyer({ type: 'noms-analyser' });
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

test('N04 : un terme ordinaire écrit pendant ouvrir refuse le lot en regles-modifiees, sans rien écrire', async () => {
  const { b, appliquer } = await pretAAppliquer(FICHIER);
  b.pendantOuvrir.action = () => { b.stock.set('ordinaire:fill-hover', JSON.stringify({ version: 1 })); };
  const demande = await appliquer();
  assert.deepEqual(b.messages, [{ type: 'erreur', demande, code: 'regles-modifiees' }]);
  assert.equal(b.noms.get('v1'), 'Button/Fill Hover');
  assert.equal(b.stock.has('journal'), false, 'aucun journal rangé');
});

test('T4.1 : une lecture devenue refusée entre l’analyse et l’écriture saute la variable en non-verifiee, sans changer son nom', async () => {
  const { b, appliquer } = await pretAAppliquer(FICHIER);
  b.pendantOuvrir.action = () => { b.refus.ids.push('v1'); };
  await appliquer();
  const application = b.messages.find((m) => m.type === 'application');
  assert.ok(application && application.type === 'application');
  assert.equal(b.noms.get('v1'), 'Button/Fill Hover');
  assert.equal(b.noms.get('v2'), 'button/fill-pressed');
  assert.equal(application.resultat.statut, 'partiel');
  assert.equal(application.resultat.sautes, 1);
  assert.equal(application.resultat.nonVerifiees, 1);
});

test('T4.1 : un lot dont tout est non vérifié est refusé, et nonVerifiees compte les variables sautées', async () => {
  const { b, appliquer } = await pretAAppliquer(FICHIER);
  b.pendantOuvrir.action = () => { b.refus.actif = true; };
  await appliquer();
  const application = b.messages.find((m) => m.type === 'application');
  assert.ok(application && application.type === 'application');
  assert.deepEqual(b.messages.map((m) => m.type), ['application'], 'rien n’a changé : pas de bilan neuf');
  assert.equal(application.resultat.statut, 'refuse');
  assert.equal(application.resultat.nonVerifiees, application.resultat.sautes);
  assert.ok(application.resultat.sautes >= 1);
  assert.deepEqual(['v1', 'v2', 'v3'].map((id) => b.noms.get(id)), ['Button/Fill Hover', 'Button/Fill Pressed', 'fontSize/Body']);
});

test('T4.1 : une lecture refusée puis rétablie, avec une variable reprise et une couleur ordinaire', async () => {
  const b = banc({ collections: [['c', 'Brand']], variables: [['reprise', 'Button/Fill Hover'], ['ordinaire', 'Button/Fill Pressed']], protegees: ['reprise'] });
  b.refus.actif = true;
  await b.envoyer({ type: 'noms-analyser' });
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const refuse = b.dernierBilan();
  assert.deepEqual(refuse.protections, [{ cause: 'lecture-refusee', nombre: 2 }]);
  assert.equal(refuse.proteges, 2);
  assert.equal(refuse.groupes.length, 0, 'pendant le refus, ni la reprise ni la couleur ordinaire ne sont proposées');
  assert.deepEqual([b.noms.get('reprise'), b.noms.get('ordinaire')], ['Button/Fill Hover', 'Button/Fill Pressed']);

  b.refus.actif = false;
  await b.envoyer({ type: 'noms-analyser' });
  const retablie = b.dernierBilan();
  assert.deepEqual(retablie.protections, [{ cause: 'marque-absente', nombre: 1 }], 'marque absente : la reprise est protégée');
  assert.equal(retablie.groupes.reduce((total, groupe) => total + groupe.variables, 0), 1, 'la couleur ordinaire est proposée');
  b.vider();
  await b.envoyer({ type: 'appliquer', generation: retablie.generation, selection: { groupes: retablie.groupes.map((g) => g.cle), exclus: [], inclus: [] } });
  assert.deepEqual([b.noms.get('reprise'), b.noms.get('ordinaire')], ['Button/Fill Hover', 'Button/fill-pressed'], 'le dossier Button reste celui de la variable protégée');
});

test('T4.1 : une annulation dont la lecture devient refusée saute la restitution en non-verifiee', async () => {
  const { b, appliquer } = await pretAAppliquer(FICHIER);
  await appliquer();
  assert.equal(b.noms.get('v1'), 'button/fill-hover');
  b.vider();
  b.pendantOuvrir.action = () => { b.refus.ids.push('v1'); };
  await b.envoyer({ type: 'annuler-dernier' });
  const annulation = b.messages.find((m) => m.type === 'application');
  assert.ok(annulation?.type === 'application');
  assert.equal(b.noms.get('v1'), 'button/fill-hover');
  assert.equal(b.noms.get('v2'), 'Button/Fill Pressed');
  assert.equal(annulation.resultat.nonVerifiees, 1);
  assert.equal(annulation.resultat.annulable, true, 'le journal garde la ligne');
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

test('N09 : une collection exclue après l’application n’est pas touchée par l’annulation, qui en compte les noms', async () => {
  const { b, appliquer } = await pretAAppliquer(FICHIER);
  await appliquer();
  assert.equal(b.noms.get('v1'), 'button/fill-hover');
  await b.envoyer({ type: 'configurer', collectionsExclues: ['c'] });
  assert.equal(b.dernierBilan().collections[0]!.analysee, false);
  assert.ok(b.dernierBilan().dernierRenommage);
  b.vider();
  await b.envoyer({ type: 'annuler-dernier' });
  assert.equal(b.noms.get('v1'), 'button/fill-hover');
  assert.equal(b.noms.get('v2'), 'button/fill-pressed');
  assert.equal(b.noms.get('v3'), 'font-size/body');
  const annulation = b.messages.find((m) => m.type === 'application');
  assert.ok(annulation?.type === 'application');
  assert.deepEqual(annulation.resultat, { sorte: 'annulation', statut: 'refuse', renommes: 0, sautes: 3, annulable: true, exclues: 3 });
  assert.deepEqual(b.messages.map((m) => m.type), ['application'], 'rien n’a changé : pas de bilan neuf');
  await b.envoyer({ type: 'configurer', collectionsExclues: [] });
  b.vider();
  await b.envoyer({ type: 'annuler-dernier' });
  const reprise = b.messages.find((m) => m.type === 'application');
  assert.ok(reprise?.type === 'application');
  assert.equal(reprise.resultat.statut, 'applique');
  assert.equal('exclues' in reprise.resultat, false, 'le champ est omis quand aucune ligne n’est exclue');
  assert.equal(b.noms.get('v1'), 'Button/Fill Hover');
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

test('le vocabulaire du Playground : noms et mots se séparent, les sections et leurs comptes répondent', async () => {
  const b = banc(PLAYGROUND);
  await b.envoyer({ type: 'noms-analyser' });
  const { generation } = b.dernierBilan();
  b.vider();
  await b.envoyer({ type: 'termes', generation, ...TOUS });
  const resume = b.messages[0];
  assert.ok(resume.type === 'termes' && resume.generation === generation);
  assert.deepEqual([resume.section, resume.debut], [null, 0]);
  const ordre = resume.sections.map((section) => section.type);
  assert.deepEqual(ordre, TYPES_DE_TERMES.filter((type) => ordre.includes(type)), 'les sections suivent l’ordre des types');
  assert.ok(resume.sections.every((section) => section.total > 0 && section.termes.length === Math.min(section.totaux.groupes, 5) + Math.min(section.totaux.variables, 5)), 'au plus cinq lignes par place et par section, avec le total');
  const termes = await lireLesTermes(b, generation);
  const mots = termes.map((terme) => terme.mot);
  for (const absent of ['line', 'height', 'stress', 'test', 'wrap', 'columns', 'components', 'primitives', 'typography', 'theme']) assert.equal(mots.includes(absent), false, absent);
  const stress = termes.find((terme) => terme.mot === 'stress-test');
  assert.deepEqual([stress?.forme, stress?.nature, stress?.type, stress?.nombre], ['StressTest', 'composant', 'composant', 3]);
  const hauteur = termes.filter((terme) => terme.mot === 'line-height');
  assert.deepEqual(hauteur.map((terme) => [terme.place, terme.type, terme.nombre]), [['groupes', 'conforme', 2], ['variables', 'conforme', 1]], 'une ligne par place');

  assert.deepEqual(termes.filter((terme) => terme.type === 'composant').map((terme) => terme.mot).sort(), ['button', 'stress-test']);
  assert.deepEqual(termes.filter((terme) => terme.type === 'palette').map((terme) => terme.mot).sort(), ['poppy', 'sky'], 'sky n’a qu’un cran : l’identifiant de palette lu dans Figma suffit');
  assert.equal(termes.filter((terme) => terme.type === 'sans-regle').some((terme) => ['button', 'poppy', 'sky'].includes(terme.mot)), false);
  const { comptes } = resume;
  assert.deepEqual([comptes.types.composant, comptes.types.palette], [2, 2]);
  assert.equal(TYPES_DE_TERMES.reduce((somme, type) => somme + comptes.types[type], 0), termes.length);
  for (const section of resume.sections) assert.equal(section.total, comptes.types[section.type], section.type);
});

test('le vocabulaire du Playground : un terme réglé s’écrit dans la convention choisie pour les groupes', async () => {
  const b = banc(PLAYGROUND);
  await b.envoyer({ type: 'noms-analyser' });
  await b.envoyer({ type: 'regle', geste: { type: 'ecriture', ecriture: { groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: minusculesTirets } } });
  const pascal = await lireLesTermes(b, b.dernierBilan().generation, ['conforme', 'remplace']);
  assert.deepEqual([pascal.find((terme) => terme.mot === 'line-height')?.forme, pascal.find((terme) => terme.mot === 'color')?.forme], ['LineHeight', 'Color']);
  await b.envoyer({ type: 'regle', geste: regleEcriture });
  const minuscules = await lireLesTermes(b, b.dernierBilan().generation, ['conforme', 'remplace']);
  assert.deepEqual([minuscules.find((terme) => terme.mot === 'line-height')?.forme, minuscules.find((terme) => terme.mot === 'color')?.forme], ['line-height', 'color']);
  const couleur = minuscules.find((terme) => terme.mot === 'color');
  assert.deepEqual([couleur?.type, couleur?.remplace], ['remplace', ['colors', 'Colors']]);
});

test('termes : une section se lit par pages, les filtres réduisent les sections et les comptes restent ceux du fichier', async () => {
  const b = banc(PLAYGROUND);
  await b.envoyer({ type: 'noms-analyser' });
  const { generation } = b.dernierBilan();
  b.vider();
  await b.envoyer({ type: 'termes', generation, ...TOUS });
  const resume = b.messages[0];
  assert.ok(resume.type === 'termes');
  b.vider();
  await b.envoyer({ type: 'termes', generation, ...TOUS, types: ['palette', 'composant'], recherche: 's', tri: 'nombre' });
  const filtre = b.messages[0];
  assert.ok(filtre.type === 'termes');
  assert.deepEqual(filtre.sections.map((section) => section.type), ['composant', 'palette']);
  assert.deepEqual(filtre.comptes, resume.comptes);
  b.vider();
  await b.envoyer({ type: 'termes', generation, ...TOUS, section: 'palette', debut: 1 });
  const page = b.messages[0];
  assert.ok(page.type === 'termes');
  assert.deepEqual([page.section, page.debut, page.sections.map((section) => [section.type, section.total, section.termes.length])], ['palette', 1, [['palette', 2, 1]]]);
  b.vider();
  await b.envoyer({ type: 'termes', generation, ...TOUS, origines: ['personnalise'] });
  const personnalise = b.messages[0];
  assert.ok(personnalise.type === 'termes');
  assert.equal(personnalise.sections.some((section) => section.type === 'remplace' || section.type === 'conforme'), false, 'aucune règle personnalisée dans ce fichier');
  assert.deepEqual(personnalise.comptes, resume.comptes);
});

test('le vocabulaire du Playground : la fiche et le détail portent la forme et la nature', async () => {
  const b = banc(PLAYGROUND);
  await b.envoyer({ type: 'noms-analyser' });
  const { generation } = b.dernierBilan();
  b.vider();
  await b.envoyer({ type: 'fiche', generation, terme: 'stress-test' });
  await b.envoyer({ type: 'diagnostic', generation });
  const [fiche, diagnostic] = b.messages;
  assert.ok(fiche.type === 'fiche' && diagnostic.type === 'diagnostic');
  assert.deepEqual([fiche.fiche.forme, fiche.fiche.nature, fiche.fiche.emploi.nombre, fiche.fiche.emploi.exemples[0].marques], ['StressTest', 'composant', 3, [0]]);
  const detail = JSON.parse(diagnostic.texte);
  const nom = detail.noms.find((autre: { nom: string }) => autre.nom === 'StressTest/Info/ScaleWrap/Colors/Scale-1');
  assert.deepEqual(nom.natures, ['composant', null, null, null, null]);
  assert.deepEqual(nom.termes, [['StressTest'], ['Info'], ['ScaleWrap'], ['Colors'], ['Scale', '1']]);
  const terme = detail.termes.find((autre: { mot: string }) => autre.mot === 'stress-test');
  assert.deepEqual([terme.forme, terme.nature], ['StressTest', 'composant']);
  assert.equal(detail.noms.find((autre: { nom: string }) => autre.nom === 'components').termes.every((formes: string[]) => formes.length === 0), true);
});

test('terme-ordinaire range le nom dans les règles, relance le lexique et se défait par le geste inverse', async () => {
  const b = banc(PLAYGROUND);
  await b.envoyer({ type: 'noms-analyser' });
  let generation = b.dernierBilan().generation;
  const lire = (...types: TypeDeTerme[]) => lireLesTermes(b, generation, types.length > 0 ? types : TYPES_DE_TERMES);
  const fiche = async (terme: string) => {
    b.vider();
    await b.envoyer({ type: 'fiche', generation, terme });
    const message = b.messages[0];
    assert.ok(message.type === 'fiche');
    return message.fiche;
  };
  assert.equal((await fiche('stress-test')).ordinaire, false);
  const lexiques = b.compteurs.commencerLexique;

  b.vider();
  await b.envoyer({ type: 'regle', geste: { type: 'terme-ordinaire', terme: 'stress-test', actif: true } });
  generation = b.dernierBilan().generation;
  assert.ok(b.stock.has('ordinaire:stress-test'));
  assert.equal(b.compteurs.commencerLexique, lexiques + 1, 'le lexique est refait depuis l’inventaire, sans relire Figma');
  const apres = await lire();
  // `StressTest` n'est plus un nom mais reste un seul terme, que le designer peut rouvrir pour annuler.
  assert.deepEqual(apres.filter((terme) => ['stress-test', 'stress', 'test'].includes(terme.mot)).map((terme) => [terme.mot, terme.forme, terme.nature, terme.statut, terme.nombre]),
    [['stress-test', 'StressTest', null, 'sans-regle', 3]]);
  assert.equal((await lire('composant')).some((terme) => terme.mot === 'stress-test'), false);
  assert.equal((await fiche('stress-test')).ordinaire, true);

  await b.envoyer({ type: 'regle', geste: { type: 'terme-ordinaire', terme: 'stress-test', actif: false } });
  generation = b.dernierBilan().generation;
  assert.equal(b.stock.has('ordinaire:stress-test'), false);
  const retour = (await lire('composant')).find((terme) => terme.mot === 'stress-test');
  assert.equal(retour?.nature, 'composant');
  assert.equal((await fiche('stress-test')).ordinaire, false);
});

test('terme-ordinaire : une simulation rend effet null sans erreur, et un terme refusé arrête le geste', async () => {
  const b = banc(PLAYGROUND);
  await b.envoyer({ type: 'noms-analyser' });
  const { generation } = b.dernierBilan();
  b.vider();
  await b.envoyer({ type: 'simuler', generation, geste: { type: 'terme-ordinaire', terme: 'stress-test', actif: true } });
  const simulation = b.messages.find((message) => message.type === 'simulation');
  assert.ok(simulation && simulation.type === 'simulation');
  assert.deepEqual([simulation.effet, simulation.conflit], [null, null]);
  assert.equal(b.messages.some((message) => message.type === 'erreur'), false);
  assert.equal(b.stock.has('ordinaire:stress-test'), false, 'une simulation n’écrit rien');
  b.vider();
  await b.envoyer({ type: 'regle', geste: { type: 'terme-ordinaire', terme: 'a/b', actif: true } });
  assert.ok(b.messages.some((message) => message.type === 'erreur' && message.code === 'mot-refuse'));
});

// Les règles d'une version plus récente du plugin

const FUTURE = JSON.stringify({ version: 2, terme: ['quux'], remplace: [['quuxed']] });
const TEXTE_DES_REGLES_FUTURES = 'Une version plus récente d’UCM Architect a rangé des règles dans ce fichier. Mettez le plugin à jour pour renommer.';

test('L12 : une entrée de nommage de version 2 refuse l’application avant toute écriture, et le bilan le dit', async () => {
  const { b } = await pretAAppliquer(FICHIER);
  b.stock.set('terme:quux', FUTURE);
  await b.envoyer({ type: 'noms-analyser' });
  const avant = new Map(b.stock);
  const bilan = b.dernierBilan();
  assert.equal(bilan.reglesFutures, true);
  b.vider();
  const demande = await b.envoyer({ type: 'appliquer', generation: bilan.generation, selection: { groupes: bilan.groupes.map((g) => g.cle), exclus: [], inclus: [] } });
  const application = b.messages.find((m): m is Extract<MessageDeNomenclature, { type: 'application' }> => m.type === 'application');
  assert.equal(application?.demande, demande);
  assert.equal(application?.resultat.statut, 'refuse');
  assert.equal(application?.resultat.cause, 'regles-futures');
  assert.equal(application?.resultat.renommes, 0);
  assert.equal(b.noms.get('v1'), 'Button/Fill Hover');
  assert.deepEqual(b.stock, avant, 'aucune règle ni journal rangé');
  assert.equal(b.messages.some((m) => m.type === 'bilan'), false, 'un refus n’est pas suivi d’un bilan');
});

test('L12 : sans entrée future, le bilan ne le dit pas et l’application passe', async () => {
  const { b, appliquer } = await pretAAppliquer(FICHIER);
  await appliquer();
  const application = b.messages.find((m): m is Extract<MessageDeNomenclature, { type: 'application' }> => m.type === 'application');
  assert.equal(application?.resultat.statut, 'applique');
  assert.equal(b.dernierBilan().reglesFutures, false);
});

test('L12 : une entrée de nommage de version 2 refuse un geste sur les règles et un import, sans rien écrire', async () => {
  const b = banc(FICHIER);
  await b.envoyer({ type: 'noms-analyser' });
  b.stock.set('ecriture', JSON.stringify({ version: 2, groupes: {}, variables: {} }));
  const avant = new Map(b.stock);
  b.vider();
  const geste = await b.envoyer({ type: 'regle', geste: regleEcriture });
  const importe = await b.envoyer({ type: 'importer', texte: JSON.stringify({ version: 1, ecriture: ecriture }) });
  assert.deepEqual(b.messages, [{ type: 'erreur', demande: geste, code: 'regles-futures' }, { type: 'erreur', demande: importe, code: 'regles-futures' }]);
  assert.deepEqual(b.stock, avant, 'l’écriture de la version 2 reste telle quelle');
});

test('L12 : le texte du refus est celui de la conception', async () => {
  const { TEXTES } = await import('../src/ui/textes/nomenclature');
  assert.equal(TEXTES.reglesFutures, TEXTE_DES_REGLES_FUTURES);
  assert.equal(TEXTES.erreur['regles-futures'], TEXTE_DES_REGLES_FUTURES);
});
