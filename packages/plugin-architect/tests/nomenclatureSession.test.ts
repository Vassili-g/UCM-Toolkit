/** Les tranches du sandbox et ce que chaque geste et chaque réponse écrivent dans les règles du fichier. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { PortDeRegles } from '../src/ecriture/noms';
import type { PortDeLecture } from '../src/nomenclature/lecture';
import type { DemandeDeNomenclature, GesteSurLesRegles, MessageDeNomenclature, Reponse } from '../src/messages/nomenclature';
import { creerSession, employe, fichierDejaAnalyse, motsDe, motsDuTermeUcm } from '../src/nomenclature/session';
import { commencerLexique, type Lexique } from '@ucm-kit/core/referentiel';
import { mener } from '../src/nomenclature/tranches';

// Les tranches

function* compteur(n: number, trace: string[]): Generator<void, string> {
  try {
    for (let i = 0; i < n; i++) { trace.push(`pas ${i}`); yield; }
    return 'fini';
  } finally {
    trace.push('ferme');
  }
}

test('mener rend la valeur du générateur et ne fait de pause que par tranche de huit millisecondes', async () => {
  let horloge = 0;
  let pauses = 0;
  const options = { maintenant: () => horloge, pause: async () => { pauses++; } };
  const trace: string[] = [];
  const calcul = compteur(10, trace);
  const suivant = calcul.next.bind(calcul);
  calcul.next = ((...args: []) => { horloge += 3; return suivant(...args); }) as typeof calcul.next;
  const resultat = await mener(calcul, () => false, options);
  assert.deepEqual(resultat, { abandonne: false, valeur: 'fini' });
  // 11 appels de next à 3 ms : une pause dès que 8 ms sont écoulées, soit tous les trois appels.
  assert.equal(pauses, 3);
});

test('mener abandonne après la pause qui suit la demande plus récente, et ferme le générateur', async () => {
  let horloge = 0;
  let abandon = false;
  const trace: string[] = [];
  const calcul = compteur(100, trace);
  const suivant = calcul.next.bind(calcul);
  calcul.next = ((...args: []) => { horloge += 4; return suivant(...args); }) as typeof calcul.next;
  const resultat = await mener(calcul, () => abandon, {
    maintenant: () => horloge,
    pause: async () => { abandon = true; },
  });
  assert.deepEqual(resultat, { abandonne: true });
  assert.equal(trace.at(-1), 'ferme');
  assert.ok(trace.length < 10, 'le calcul s\'arrête à la première pause');
});

test('mener n\'abandonne pas un calcul qui tient dans une tranche, mais abandonne avant de commencer', async () => {
  const trace: string[] = [];
  assert.deepEqual(await mener(compteur(5, trace), () => true, { maintenant: () => 0 }).then((r) => r.abandonne), true);
  assert.deepEqual(trace, [], 'rien n\'a été calculé');
  const rapide = await mener(compteur(5, []), (() => { let appels = 0; return () => ++appels > 1; })(), { maintenant: () => 0, pause: async () => {} });
  assert.deepEqual(rapide, { abandonne: false, valeur: 'fini' });
});

// Les gestes et les réponses

function banc(variables: readonly (readonly [string, string])[], regles: Record<string, string> = {}, collection = 'Components') {
  const noms = new Map(variables);
  const stock = new Map(Object.entries(regles));
  const messages: MessageDeNomenclature[] = [];
  const lecture: PortDeLecture = {
    collections: async () => [{ id: 'c', name: collection, remote: false }],
    variables: async () => [...noms].map(([id, name]) => ({ id, name, variableCollectionId: 'c', remote: false })),
    cibleAlias: () => undefined,
    protegee: () => false,
    palette: () => undefined,
  };
  const port: PortDeRegles = {
    cles: () => [...stock.keys()],
    lire: (cle) => stock.get(cle) ?? '',
    ecrire: (cle, texte) => { stock.set(cle, texte); },
    effacer: (cle) => { stock.delete(cle); },
  };
  const session = creerSession({
    port: { lecture, ecriture: { ouvrir: async () => { throw new Error('pas d\'écriture'); } }, regles: port },
    envoyer: (message) => { messages.push(message); },
    tranches: { pause: async () => {} },
  });
  let numero = 0;
  const envoyer = async (demande: DistributiveOmit<DemandeDeNomenclature, 'demande'>) => {
    numero++;
    messages.length = 0;
    await session.recevoir({ ...demande, demande: numero } as DemandeDeNomenclature);
  };
  const regle = (geste: GesteSurLesRegles) => envoyer({ type: 'regle', geste });
  const repondre = (question: string, reponse: Reponse) => envoyer({ type: 'noms-repondre', question, reponse });
  const bilan = () => {
    const m = messages.find((candidat) => candidat.type === 'bilan');
    assert.ok(m && m.type === 'bilan', `un bilan était attendu, reçu : ${messages.map((x) => x.type).join(',')}`);
    return m.bilan;
  };
  const terme = (cle: string) => JSON.parse(stock.get(cle) ?? 'null') as { terme: string[]; remplace: string[][]; definition?: string } | null;
  return { stock, messages, port, envoyer, regle, repondre, bilan, terme };
}
type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

const ecriture = JSON.stringify({ version: 1, groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } });
const PAIRES: readonly (readonly [string, string])[] = [['v1', 'tile/quux/fill'], ['v2', 'tile/quux/fg'], ['v3', 'tile/quuxed/text'], ['v4', 'tile/quuxed/line']];

test('remplace-termes pose exactement la liste reçue ; une liste vide supprime la règle', async () => {
  const b = banc(PAIRES, { ecriture });
  await b.envoyer({ type: 'noms-analyser' });
  await b.regle({ type: 'remplace-termes', terme: 'quux', termes: ['quuxed', 'quuxy'] });
  assert.deepEqual(b.terme('terme:quux')?.remplace, [['quuxed'], ['quuxy']]);
  await b.regle({ type: 'remplace-termes', terme: 'quux', termes: ['quuxed'] });
  assert.deepEqual(b.terme('terme:quux')?.remplace, [['quuxed']], 'la liste remplace, elle n\'ajoute pas');
  await b.regle({ type: 'remplace-termes', terme: 'quux', termes: [] });
  assert.equal(b.terme('terme:quux'), null);
});

test('remplacer-par ajoute à la règle du terme gardé ; retirer-remplace et supprimer la défont', async () => {
  const b = banc(PAIRES, { ecriture });
  await b.envoyer({ type: 'noms-analyser' });
  await b.regle({ type: 'remplacer-par', terme: 'quuxed', par: 'quux' });
  assert.deepEqual(b.terme('terme:quux')?.remplace, [['quuxed']]);
  assert.equal(b.bilan().groupes.find((g) => g.regle.sorte === 'terme')?.variables, 2);
  await b.regle({ type: 'remplacer-par', terme: 'quuxy', par: 'quux' });
  assert.deepEqual(b.terme('terme:quux')?.remplace, [['quuxed'], ['quuxy']]);
  await b.regle({ type: 'retirer-remplace', terme: 'quux', remplace: 'quuxed' });
  assert.deepEqual(b.terme('terme:quux')?.remplace, [['quuxy']]);
  assert.equal(b.bilan().groupes.some((g) => g.regle.sorte === 'terme'), false);
  await b.regle({ type: 'supprimer', terme: 'quux' });
  assert.equal(b.terme('terme:quux'), null);
  await b.regle({ type: 'retirer-remplace', terme: 'absent', remplace: 'quuxed' });
  assert.equal(b.bilan().generation > 0, true, 'un geste sans règle à défaire répond quand même par un bilan');
});

test('N07 : retirer la dernière forme garde la règle qui porte une définition ; sans définition, la règle part', async () => {
  const defini = JSON.stringify({ version: 1, terme: ['quux'], remplace: [['quuxed']], definition: 'Terme métier conservé.' });
  const b = banc(PAIRES, { ecriture, 'terme:quux': defini });
  await b.envoyer({ type: 'noms-analyser' });
  await b.regle({ type: 'retirer-remplace', terme: 'quux', remplace: 'quuxed' });
  assert.deepEqual(b.terme('terme:quux'), { version: 1, terme: ['quux'], remplace: [], definition: 'Terme métier conservé.' });
  await b.envoyer({ type: 'exporter' });
  const exporte = b.messages.find((m) => m.type === 'regles-exportees');
  assert.ok(exporte && exporte.type === 'regles-exportees');
  assert.match(exporte.texte, /Terme métier conservé\./u, 'la définition reste à l’export');
  await b.regle({ type: 'supprimer', terme: 'quux' });
  await b.regle({ type: 'remplacer-par', terme: 'quuxed', par: 'quux' });
  await b.regle({ type: 'retirer-remplace', terme: 'quux', remplace: 'quuxed' });
  assert.equal(b.terme('terme:quux'), null, 'un terme sans définition peut encore être retiré');
});

test('ecart-ucm écrit et retire l\'écart ; retirer-distinct et retirer-voulu effacent leur entrée', async () => {
  const b = banc([['v1', 'tile/hovered/fill'], ['v2', 'tile/hovered/fg']], { ecriture, 'distinct:a|b': '{"version":1}', 'voulu:foo bar': '{"version":1}' });
  await b.envoyer({ type: 'noms-analyser' });
  assert.equal(b.bilan().groupes.some((g) => g.regle.sorte === 'terme'), true, 'hovered devient hover');
  await b.regle({ type: 'ecart-ucm', terme: 'hover', actif: true });
  assert.ok(b.stock.has('ecart:hover'));
  assert.equal(b.bilan().groupes.some((g) => g.regle.sorte === 'terme'), false, 'le terme écarté ne s\'applique plus');
  await b.regle({ type: 'ecart-ucm', terme: 'hover', actif: false });
  assert.ok(!b.stock.has('ecart:hover'));
  assert.equal(b.bilan().groupes.some((g) => g.regle.sorte === 'terme'), true);
  await b.regle({ type: 'retirer-distinct', termes: ['a', 'b'] });
  await b.regle({ type: 'retirer-voulu', terme: 'foo-bar' });
  assert.deepEqual([...b.stock.keys()].filter((cle) => cle.startsWith('distinct:') || cle.startsWith('voulu:')), []);
});

test('une règle refusée par le vocabulaire n\'écrit rien, y compris via une réponse', async () => {
  const b = banc(PAIRES, { ecriture });
  await b.envoyer({ type: 'noms-analyser' });
  await b.regle({ type: 'remplacer-par', terme: 'hover', par: 'quux' });
  assert.deepEqual(b.messages.map((m) => m.type), ['refus']);
  assert.ok(!b.stock.has('terme:quux'));
  await b.regle({ type: 'remplace-termes', terme: 'quux', termes: ['quuxed'] });
  await b.regle({ type: 'remplace-termes', terme: 'quuxed', termes: ['quux'] });
  assert.deepEqual(b.messages.map((m) => m.type), ['refus'], 'un cycle est refusé');
  assert.ok(!b.stock.has('terme:quuxed'));
});

test('répondre à une paire : autre terme, termes différents, plus tard', async () => {
  const b = banc(PAIRES, { ecriture });
  await b.envoyer({ type: 'noms-analyser' });
  const cle = b.bilan().questions[0].cle;
  await b.repondre(cle, { type: 'autre', terme: 'Quuxy' });
  assert.deepEqual(b.terme('terme:quuxy')?.remplace, [['quux'], ['quuxed']]);
  await b.regle({ type: 'annuler-reponse', question: cle });
  assert.equal(b.terme('terme:quuxy'), null);
  await b.repondre(cle, { type: 'distincts' });
  assert.ok([...b.stock.keys()].some((k) => k.startsWith('distinct:')));
  assert.ok(!b.bilan().questions.some((q) => q.cle === cle));
  await b.regle({ type: 'annuler-reponse', question: cle });
  assert.ok(b.bilan().questions.some((q) => q.cle === cle));
});

test('répondre à une faute : corriger écrit le terme corrigé ; c\'est voulu écrit le terme voulu', async () => {
  const noms: [string, string][] = [];
  for (let i = 0; i < 5; i++) noms.push([`a${i}`, `box${i}/border/bg`]);
  noms.push(['b0', 'box0/bordr/fg']);
  const b = banc(noms, { ecriture });
  await b.envoyer({ type: 'noms-analyser' });
  const question = b.bilan().questions.find((q) => q.type === 'ecriture-du-terme');
  assert.ok(question && question.type === 'ecriture-du-terme', `une faute était attendue : ${JSON.stringify(b.bilan().questions.map((q) => q.cle))}`);
  await b.repondre(question.cle, { type: 'voulu' });
  assert.ok(b.stock.has(`voulu:${question.terme.mot}`));
  await b.regle({ type: 'annuler-reponse', question: question.cle });
  assert.ok(!b.stock.has(`voulu:${question.terme.mot}`));
  await b.repondre(question.cle, { type: 'corriger', mots: question.proposition });
  assert.deepEqual(b.terme(`terme:${question.proposition.join(' ')}`)?.remplace, [[question.terme.mot]]);
});

test('une faute au milieu d\'un mot collé : la réponse renomme, l\'annulation rend l\'état initial', async () => {
  const neutre = JSON.stringify({ version: 1, groupes: { casse: 'inchangee', separateur: 'inchange' }, variables: { casse: 'inchangee', separateur: 'inchange' } });
  const noms: [string, string][] = [['rare', 'x/textsucccess/y'], ...['a', 'b', 'c', 'd', 'e'].map((l): [string, string] => [`ref-${l}`, `x/success/${l}`])];
  const b = banc(noms, { ecriture: neutre });
  await b.envoyer({ type: 'noms-analyser' });
  const termes = () => b.bilan().groupes.filter((g) => g.regle.sorte === 'terme').reduce((total, g) => total + g.variables, 0);
  assert.equal(termes(), 0);
  const question = b.bilan().questions.find((q) => q.type === 'ecriture-du-terme' && q.terme.mot === 'succcess');
  assert.ok(question && question.type === 'ecriture-du-terme', `une faute était attendue : ${JSON.stringify(b.bilan().questions.map((q) => q.cle))}`);
  await b.repondre(question.cle, { type: 'corriger', mots: question.proposition });
  assert.equal(termes(), 1, 'textsucccess devient textsuccess');
  await b.regle({ type: 'annuler-reponse', question: question.cle });
  assert.equal(termes(), 0);
  assert.ok(b.bilan().questions.some((q) => q.cle === question.cle));
});

test('une réponse qui ne convient pas à la question, ou à une question disparue, répond echec', async () => {
  const b = banc(PAIRES, { ecriture });
  await b.envoyer({ type: 'noms-analyser' });
  const cle = b.bilan().questions[0].cle;
  await b.repondre(cle, { type: 'voulu' });
  assert.deepEqual(b.messages.map((m) => m.type === 'erreur' ? m.code : m.type), ['echec']);
  await b.repondre('paire:absente', { type: 'plus-tard' });
  assert.deepEqual(b.messages.map((m) => m.type === 'erreur' ? m.code : m.type), ['echec']);
  assert.deepEqual([...b.stock.keys()], ['ecriture'], 'rien n\'a été écrit');
});

test('une collection de deux variables ou plus pose la question ; garder le nom la classe', async () => {
  const b = banc([['v1', 'fill/main'], ['v2', 'fill/alt'], ['v3', 'fg/main']], { ecriture }, 'Zorglub');
  await b.envoyer({ type: 'noms-analyser' });
  const question = b.bilan().questions.find((q) => q.type === 'collection');
  assert.ok(question && question.type === 'collection');
  assert.equal(question.nombre, 3);
  await b.repondre(question.cle, { type: 'collection', cible: null });
  assert.deepEqual(JSON.parse(b.stock.get(question.cle)!), { version: 1 });
  assert.ok(!b.bilan().questions.some((q) => q.type === 'collection'));
  await b.regle({ type: 'annuler-reponse', question: question.cle });
  assert.ok(b.bilan().questions.some((q) => q.type === 'collection'));
});

test('renommer vers un nom qui n’est pas une collection UCM répond echec et n’écrit rien', async () => {
  const b = banc([['v1', 'fill/main'], ['v2', 'fill/alt']], { ecriture }, 'Zorglub');
  await b.envoyer({ type: 'noms-analyser' });
  const question = b.bilan().questions.find((q) => q.type === 'collection');
  assert.ok(question);
  await b.repondre(question.cle, { type: 'collection', cible: 'pas-une-collection' });
  assert.deepEqual(b.messages.map((m) => m.type === 'erreur' ? m.code : m.type), ['echec']);
  assert.deepEqual([...b.stock.keys()], ['ecriture']);
});

test('fichierDejaAnalyse vaut vrai quand l\'écriture est rangée, faux sinon ou pour la reprise de la v1', () => {
  assert.equal(fichierDejaAnalyse(banc([]).port), false);
  assert.equal(fichierDejaAnalyse(banc([], { ecriture }).port), true);
  assert.equal(fichierDejaAnalyse(banc([], { conventions: 'illisible' }).port), false);
});

// Les mots refusés, l'import interrompu et l'import annulable

const codes = (b: ReturnType<typeof banc>) => b.messages.map((m) => m.type === 'erreur' ? m.code : m.type);

test('un terme avec / | . { } $ ou vide est refusé au geste, sans rien écrire', async () => {
  const b = banc(PAIRES, { ecriture });
  await b.envoyer({ type: 'noms-analyser' });
  for (const geste of [
    { type: 'remplacer-par', terme: 'text/quux', par: 'a/b' },
    { type: 'remplacer-par', terme: 'quuxed', par: 'a.b' },
    { type: 'remplacer-par', terme: 'quuxed', par: '   ' },
    { type: 'remplacer-par', terme: '', par: 'quux' },
    { type: 'remplace-termes', terme: '  ', termes: ['quuxed'] },
    { type: 'remplace-termes', terme: 'quux', termes: ['a|b'] },
  ] as const) {
    await b.regle(geste);
    assert.deepEqual(codes(b), ['mot-refuse'], JSON.stringify(geste));
  }
  assert.deepEqual([...b.stock.keys()], ['ecriture']);
});

test('une réponse à un terme refusé, ou à une paire avec « | », n’écrit rien', async () => {
  const b = banc(PAIRES, { ecriture });
  await b.envoyer({ type: 'noms-analyser' });
  const cle = b.bilan().questions[0].cle;
  await b.repondre(cle, { type: 'autre', terme: 'a/b' });
  assert.deepEqual(codes(b), ['mot-refuse']);
  await b.repondre(cle, { type: 'autre', terme: ' ' });
  assert.deepEqual(codes(b), ['mot-refuse']);
  assert.deepEqual([...b.stock.keys()], ['ecriture']);
});

test('une paire dont un terme contient « | » ne peut pas être jugée distincte', async () => {
  const b = banc([['v1', 'tile/qu|x/fill'], ['v2', 'tile/qu|x/fg'], ['v3', 'tile/qu|xed/text'], ['v4', 'tile/qu|xed/line']], { ecriture });
  await b.envoyer({ type: 'noms-analyser' });
  const paire = b.bilan().questions.find((q) => q.type === 'paire');
  assert.ok(paire, 'la paire de mots proches est posée');
  await b.repondre(paire.cle, { type: 'distincts' });
  assert.deepEqual(codes(b), ['mot-refuse']);
  assert.deepEqual([...b.stock.keys()], ['ecriture']);
});

test('un import refuse un terme avec « / » sans rien écrire', async () => {
  const b = banc(PAIRES, { ecriture });
  await b.envoyer({ type: 'noms-analyser' });
  await b.envoyer({ type: 'importer', texte: JSON.stringify({ version: 1, termes: [{ terme: ['text/quux'], remplace: [['a/b']] }] }) });
  assert.deepEqual(codes(b), ['import-illisible']);
  assert.deepEqual([...b.stock.keys()], ['ecriture']);
});

test('un stockage qui échoue à la deuxième clé d’un import rétablit toutes les clés et répond import-partiel', async () => {
  const b = banc(PAIRES, { ecriture });
  await b.envoyer({ type: 'noms-analyser' });
  const avant = new Map(b.stock);
  const ecrire = b.port.ecrire;
  let appels = 0;
  (b.port as { ecrire: PortDeRegles['ecrire'] }).ecrire = (cle, texte) => { if (++appels === 2) throw new Error('plein'); ecrire(cle, texte); };
  await b.envoyer({ type: 'importer', texte: JSON.stringify({ version: 1, ecartsUcm: ['x'], voulus: ['aa bb'], termes: [{ terme: ['quux'], remplace: [['quuxed']] }] }) });
  assert.deepEqual(codes(b), ['import-partiel']);
  assert.deepEqual([...b.stock].sort(), [...avant].sort());
});

test('annuler-import rétablit l’écriture et le terme qu’un import avait écrasés', async () => {
  const ancien = JSON.stringify({ version: 1, terme: ['quux'], remplace: [['quuxed']] });
  const b = banc(PAIRES, { ecriture, 'terme:quux': ancien });
  await b.envoyer({ type: 'noms-analyser' });
  assert.equal(b.bilan().dernierImport, null);
  const autreEcriture = { groupes: { casse: 'PascalCase', separateur: 'inchange' }, variables: { casse: 'PascalCase', separateur: 'inchange' } };
  const depart = new Map(b.stock);
  await b.envoyer({ type: 'importer', texte: JSON.stringify({ version: 1, ecriture: autreEcriture, termes: [{ terme: ['quux'], remplace: [['quuxy']] }] }) });
  assert.ok(b.bilan().dernierImport);
  assert.deepEqual(b.terme('terme:quux')?.remplace, [['quuxy']]);
  await b.regle({ type: 'annuler-import' });
  assert.equal(b.bilan().dernierImport, null);
  assert.deepEqual([...b.stock].sort(), [...depart].sort());
});

test('termes transmet le filtre de places et la place de la page, et répond les totaux de chaque place', async () => {
  const b = banc(PAIRES, { ecriture });
  await b.envoyer({ type: 'noms-analyser' });
  const { generation } = b.bilan();
  const demande = { type: 'termes', generation, recherche: '', types: [], origines: [], places: [], tri: 'alpha', section: null, place: null, debut: 0 } as const;
  const lire = async (reste: Partial<Extract<DemandeDeNomenclature, { type: 'termes' }>>) => {
    await b.envoyer({ ...demande, ...reste });
    const reponse = b.messages.find((m) => m.type === 'termes');
    assert.ok(reponse && reponse.type === 'termes');
    return reponse;
  };
  const tout = await lire({});
  const lignes = tout.sections.flatMap((section) => section.termes);
  assert.ok(lignes.some((ligne) => ligne.place === 'groupes') && lignes.some((ligne) => ligne.place === 'variables'));
  assert.equal(tout.comptes.places.groupes + tout.comptes.places.variables, Object.values(tout.comptes.types).reduce((somme, nombre) => somme + nombre, 0));
  const enVariable = await lire({ places: ['variables'] });
  assert.ok(enVariable.sections.flatMap((section) => section.termes).every((ligne) => ligne.place === 'variables'));
  assert.ok(enVariable.sections.every((section) => section.totaux.groupes === 0 && section.total === section.totaux.variables));
  assert.deepEqual(enVariable.comptes, tout.comptes);
  const type = tout.sections.find((section) => section.totaux.groupes > 0)!.type;
  const page = await lire({ section: type, place: 'groupes' });
  assert.ok(page.sections[0].termes.length > 0 && page.sections[0].termes.every((ligne) => ligne.place === 'groupes'), 'la page ne lit que la place demandée');
});

// Les mots d’un terme

test('motsDe découpe comme le kit : foregroundMain donne deux mots, en minuscules', () => {
  assert.deepEqual(motsDe('foregroundMain'), ['foreground', 'main']);
  assert.deepEqual(motsDe('Foreground-Main'), ['foreground', 'main']);
  assert.deepEqual(motsDe('  extra small '), ['extra', 'small']);
  assert.deepEqual(motsDe(''), []);
});

test('employe rend vrai quand le lexique contient les mots du terme, quelle que soit son écriture', () => {
  const preparation = commencerLexique();
  preparation.ajouter([{ id: 'v1', categorie: 'variables', portee: 'c:1', nom: 'foreground main' }]);
  const calcul = preparation.terminer();
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  const lexique: Lexique = etape.value;
  assert.equal(employe(lexique, 'foregroundMain'), true);
  assert.equal(employe(lexique, 'foreground-main'), true);
  assert.equal(employe(lexique, 'background'), false);
});

test('motsDuTermeUcm retrouve un terme par sa forme reconnue : Hover donne la forme tolérée hovered', () => {
  assert.deepEqual(motsDuTermeUcm('Hover'), [['Hover'], ['hovered']]);
  assert.deepEqual(motsDuTermeUcm('hover'), [['hover'], ['hovered']]);
});
