/** Les tranches du sandbox et ce que chaque geste et chaque réponse écrivent dans les règles du fichier. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { PortDeRegles } from '../src/ecriture';
import type { PortDeLecture } from '../src/lecture';
import type { DemandeArchitect, GesteSurLesRegles, PluginMessage, Reponse } from '../src/messages';
import { creerSession, fichierDejaAnalyse } from '../src/session';
import { mener } from '../src/tranches';

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

function banc(variables: readonly (readonly [string, string])[], regles: Record<string, string> = {}, collection = 'components') {
  const noms = new Map(variables);
  const stock = new Map(Object.entries(regles));
  const messages: PluginMessage[] = [];
  const lecture: PortDeLecture = {
    collections: async () => [{ id: 'c', name: collection, remote: false }],
    variables: async () => [...noms].map(([id, name]) => ({ id, name, variableCollectionId: 'c', remote: false })),
    cibleAlias: () => undefined,
    protegee: () => false,
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
  const envoyer = async (demande: DistributiveOmit<DemandeArchitect, 'demande'>) => {
    numero++;
    messages.length = 0;
    await session.recevoir({ ...demande, demande: numero } as DemandeArchitect);
  };
  const regle = (geste: GesteSurLesRegles) => envoyer({ type: 'regle', geste });
  const repondre = (question: string, reponse: Reponse) => envoyer({ type: 'repondre', question, reponse });
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
const PAIRES: readonly (readonly [string, string])[] = [['v1', 'tile/quux/bg'], ['v2', 'tile/quux/fg'], ['v3', 'tile/quuxed/text'], ['v4', 'tile/quuxed/line']];

test('remplace-termes pose exactement la liste reçue ; une liste vide supprime la règle', async () => {
  const b = banc(PAIRES, { ecriture });
  await b.envoyer({ type: 'analyser' });
  await b.regle({ type: 'remplace-termes', terme: 'quux', termes: ['quuxed', 'quuxy'] });
  assert.deepEqual(b.terme('terme:quux')?.remplace, [['quuxed'], ['quuxy']]);
  await b.regle({ type: 'remplace-termes', terme: 'quux', termes: ['quuxed'] });
  assert.deepEqual(b.terme('terme:quux')?.remplace, [['quuxed']], 'la liste remplace, elle n\'ajoute pas');
  await b.regle({ type: 'remplace-termes', terme: 'quux', termes: [] });
  assert.equal(b.terme('terme:quux'), null);
});

test('remplacer-par ajoute à la règle du terme gardé ; retirer-remplace et supprimer la défont', async () => {
  const b = banc(PAIRES, { ecriture });
  await b.envoyer({ type: 'analyser' });
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

test('ecart-ucm écrit et retire l\'écart ; retirer-distinct et retirer-voulu effacent leur entrée', async () => {
  const b = banc([['v1', 'tile/hovered/bg'], ['v2', 'tile/hovered/fg']], { ecriture, 'distinct:a|b': '{"version":1}', 'voulu:foo bar': '{"version":1}' });
  await b.envoyer({ type: 'analyser' });
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
  await b.envoyer({ type: 'analyser' });
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
  await b.envoyer({ type: 'analyser' });
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
  await b.envoyer({ type: 'analyser' });
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
  await b.envoyer({ type: 'analyser' });
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
  await b.envoyer({ type: 'analyser' });
  const cle = b.bilan().questions[0].cle;
  await b.repondre(cle, { type: 'echelle', forme: 0 });
  assert.deepEqual(b.messages.map((m) => m.type === 'erreur' ? m.code : m.type), ['echec']);
  await b.repondre('paire:absente', { type: 'plus-tard' });
  assert.deepEqual(b.messages.map((m) => m.type === 'erreur' ? m.code : m.type), ['echec']);
  assert.deepEqual([...b.stock.keys()], ['ecriture'], 'rien n\'a été écrit');
});

test('une collection de deux variables ou plus pose la question ; garder le nom la classe', async () => {
  const b = banc([['v1', 'bg/main'], ['v2', 'bg/alt'], ['v3', 'fg/main']], { ecriture }, 'Zorglub');
  await b.envoyer({ type: 'analyser' });
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
  const b = banc([['v1', 'bg/main'], ['v2', 'bg/alt']], { ecriture }, 'Zorglub');
  await b.envoyer({ type: 'analyser' });
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
