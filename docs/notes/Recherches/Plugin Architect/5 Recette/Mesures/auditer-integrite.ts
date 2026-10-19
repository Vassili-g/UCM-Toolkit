/** Reproduit les défauts de récupération sur des objets en mémoire, sans connexion à Figma. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { appliquerLesRenommages, annulerLeDernierRenommage, type PortDeRegles, type RenommageDemande, type SessionEcriture, type VariableModifiable } from '../../../../../../packages/plugin-architect/src/ecriture';
import { relireInventaireAvantEcriture, type PortDeLecture } from '../../../../../../packages/plugin-architect/src/lecture';
import { cleDistinct, defaireReponse, exporterLesRegles, importerLesRegles, lireLesRegles, lireLeStockage, preparerJournal, preparerReponse, rangerLesEcritures, serialiserRegle } from '../../../../../../packages/plugin-architect/src/regles';
import { creerSession } from '../../../../../../packages/plugin-architect/src/session';
import type { Bilan, DemandeArchitect, PluginMessage } from '../../../../../../packages/plugin-architect/src/messages';
import { indexVariables } from '../../../../../../packages/plugin-exporter/src/variables';

function banc(specs: readonly (readonly [string, string])[]) {
  const variables = new Map<string, VariableModifiable>();
  const stock = new Map<string, string>();
  const protegees = new Set<string>();
  const collection = { id: 'c', name: 'components', remote: false };
  let affectations = 0;
  const panne = { nomAuRang: Infinity, cle: '', taille: Infinity };
  for (const [id, initial] of specs) {
    let nom = initial;
    variables.set(id, {
      id, remote: false, variableCollectionId: 'c',
      get name() { return nom; },
      set name(valeur) {
        if (++affectations === panne.nomAuRang) throw new Error('setter interrompu');
        nom = valeur;
      },
    });
  }
  const lecture: PortDeLecture = {
    collections: async () => [{ ...collection }],
    variables: async () => [...variables.values()].map((v) => ({ id: v.id, name: v.name, remote: false, variableCollectionId: v.variableCollectionId })),
    cibleAlias: () => undefined,
    protegee: (v) => protegees.has(v.id),
  };
  const stockage: PortDeRegles = {
    cles: () => [...stock.keys()], lire: (cle) => stock.get(cle) ?? '',
    ecrire: (cle, texte) => {
      if (cle === panne.cle || Buffer.byteLength(`ucm_architect${cle}${texte}`, 'utf8') > panne.taille) throw new Error('stockage interrompu');
      stock.set(cle, texte);
    },
    effacer: (cle) => { stock.delete(cle); },
  };
  const session: SessionEcriture = { collection: (id) => id === 'c' ? collection : null, variable: (id) => variables.get(id) ?? null, commitUndo: () => {} };
  const demande = (id: string, nouveauNom: string): RenommageDemande => ({
    id, figmaId: id, type: 'variable', collectionId: 'c', ancienNom: variables.get(id)!.name, nouveauNom,
  });
  const appliquer = async (demandes: readonly RenommageDemande[]) => appliquerLesRenommages({ demandes, inventaire: await relireInventaireAvantEcriture(lecture), session, stockage });
  const annuler = async () => annulerLeDernierRenommage({ inventaire: await relireInventaireAvantEcriture(lecture), session, stockage });
  return { variables, stock, protegees, panne, lecture, stockage, session, demande, appliquer, annuler,
    journal: () => lireLesRegles(lireLeStockage(stockage)).journal,
    noms: () => [...variables.values()].map((v) => v.name),
    prochainesAffectations: (avantPanne: number) => { panne.nomAuRang = affectations + avantPanne; },
  };
}

test('A1 : une panne du journal intervient après la mutation des noms', async () => {
  const b = banc([['v', 'Original']]);
  b.panne.cle = 'journal:0';
  const r = await b.appliquer([b.demande('v', 'original')]);
  assert.deepEqual(b.noms(), ['original']);
  assert.equal(r.statut, 'partiel');
  assert.equal(r.annulable, false);
  assert.equal(b.journal(), undefined);
});

test('A2 : un morceau de moins de 90 000 caractères dépasse 100 ko en UTF-8', async (t) => {
  const specs = Array.from({ length: 700 }, (_, i) => [`v${i}`, `${'漢字色彩背景前景'.repeat(3)}${i}`] as const);
  const b = banc(specs);
  const demandes = specs.map(([id, nom]) => b.demande(id, `新${nom}`));
  const ecritures = preparerJournal({ heure: 'audit', renommages: demandes.map((d) => ({ type: d.type, id: d.figmaId, ancienNom: d.ancienNom, nouveauNom: d.nouveauNom })) });
  assert.ok(ecritures[0].texte!.length < 90_000);
  assert.ok(Buffer.byteLength(ecritures[0].texte!, 'utf8') > 102_400);
  t.diagnostic(`${ecritures[0].texte!.length} caractères, ${Buffer.byteLength(ecritures[0].texte!, 'utf8')} octets dans le premier morceau`);
  b.panne.taille = 102_400;
  const r = await b.appliquer(demandes);
  assert.equal(r.renommes.length, 700);
  assert.equal(r.annulable, false);
  assert.equal(b.journal(), undefined);
});

test('A3 : une tête neuve et une queue ancienne forment un journal accepté', async () => {
  const a = Array.from({ length: 850 }, (_, i) => [`a${i}`, `ancien-${i}-${'x'.repeat(30)}`] as const);
  const z = Array.from({ length: 850 }, (_, i) => [`z${i}`, `autre-${i}-${'x'.repeat(30)}`] as const);
  const b = banc([...a, ...z]);
  await b.appliquer(a.map(([id, nom]) => b.demande(id, `premier-${nom}`)));
  assert.ok(b.stock.has('journal:1'));
  b.panne.cle = 'journal:1';
  const r = await b.appliquer(z.map(([id, nom]) => b.demande(id, `second-${nom}`)));
  assert.equal(r.annulable, false);
  const melange = b.journal()!;
  assert.ok(melange.renommages.some((v) => v.id.startsWith('a')));
  assert.ok(melange.renommages.some((v) => v.id.startsWith('z')));
  b.panne.cle = '';
  const annulation = await b.annuler();
  assert.equal(annulation.statut, 'applique');
  assert.ok(annulation.renommes.some((v) => v.figmaId.startsWith('a')));
  assert.ok(z.some(([id, nom]) => b.variables.get(id)!.name !== nom));
});

test('A4 : une annulation bloquée par collision efface les anciens noms', async () => {
  const b = banc([['v', 'a'], ['occupant', 'libre']]);
  await b.appliquer([b.demande('v', 'b')]);
  b.variables.get('occupant')!.name = 'a';
  const r = await b.annuler();
  assert.equal(r.statut, 'refuse');
  assert.equal(b.variables.get('v')!.name, 'b');
  assert.equal(b.journal(), undefined);
  b.variables.get('occupant')!.name = 'libre';
  assert.equal((await b.annuler()).statut, 'refuse');
});

test('A5 : une annulation de cycle interrompue conserve un nom attendu périmé', async () => {
  const b = banc([['a', 'a'], ['b', 'b']]);
  await b.appliquer([b.demande('a', 'b'), b.demande('b', 'a')]);
  b.prochainesAffectations(2);
  const r = await b.annuler();
  assert.equal(r.statut, 'partiel');
  const provisoire = b.variables.get('a')!.name;
  assert.match(provisoire, /~ucm/u);
  assert.equal(b.journal()!.renommages.find((v) => v.id === 'a')!.nouveauNom, 'b');
  b.panne.nomAuRang = Infinity;
  await b.annuler();
  assert.equal(b.variables.get('a')!.name, provisoire);
  assert.equal(b.journal(), undefined);
});

async function sessionDuBanc(b: ReturnType<typeof banc>, ouvrir: () => Promise<SessionEcriture>) {
  const messages: PluginMessage[] = [];
  const session = creerSession({ port: { lecture: b.lecture, ecriture: { ouvrir }, regles: b.stockage }, envoyer: (m) => messages.push(m), tranches: { pause: async () => {} } });
  let numero = 0;
  const envoyer = async (m: object) => session.recevoir({ ...m, demande: ++numero } as DemandeArchitect);
  const bilan = (): Bilan => (messages.filter((m) => m.type === 'bilan').at(-1) as Extract<PluginMessage, { type: 'bilan' }>).bilan;
  await envoyer({ type: 'analyser' });
  await envoyer({ type: 'regle', geste: { type: 'ecriture', ecriture: { groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } } } });
  const appliquer = () => envoyer({ type: 'appliquer', generation: bilan().generation, selection: { groupes: bilan().groupes.map((g) => g.cle), inclus: [], exclus: [] } });
  return { envoyer, bilan, appliquer, messages };
}

test('A6 : une protection ajoutée pendant ouvrir ne bloque pas le renommage', async () => {
  const b = banc([['v', 'Brand Color']]);
  const s = await sessionDuBanc(b, async () => { b.protegees.add('v'); return b.session; });
  await s.appliquer();
  assert.equal(b.protegees.has('v'), true);
  assert.equal(b.variables.get('v')!.name, 'brand-color');
});

test('A6 : un occupant arrivé pendant ouvrir manque au contrôle des collisions', async () => {
  const b = banc([['v', 'Brand Color'], ['occupant', 'libre']]);
  const s = await sessionDuBanc(b, async () => { b.variables.get('occupant')!.name = 'brand-color'; return b.session; });
  await s.appliquer();
  assert.deepEqual(b.noms(), ['brand-color', 'brand-color']);
});

test('A7 : des règles changées pendant ouvrir ne sont pas comparées avant mutation', async () => {
  const b = banc([['v', 'Brand Color']]);
  const s = await sessionDuBanc(b, async () => {
    rangerLesEcritures(b.stockage, [serialiserRegle({ type: 'ecriture', ecriture: { groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: { casse: 'PascalCase', separateur: 'camelCase' } } })]);
    return b.session;
  });
  await s.appliquer();
  assert.equal(b.variables.get('v')!.name, 'brand-color');
  assert.equal(lireLesRegles(lireLeStockage(b.stockage)).ecriture!.variables.casse, 'PascalCase');
});

test('A8 : une panne de relecture est envoyée après une application réussie', async () => {
  const b = banc([['v', 'Brand Color']]);
  const s = await sessionDuBanc(b, async () => b.session);
  b.session.commitUndo = () => { b.lecture.collections = async () => { throw new Error('relecture interrompue'); }; };
  await s.appliquer();
  const fin = s.messages.slice(-2);
  assert.equal(fin[0].type, 'application');
  assert.equal(fin[1].type, 'erreur');
  assert.equal(b.variables.get('v')!.name, 'brand-color');
  assert.ok(b.journal());
});

test('A9 : une réponse distincts avec une barre verticale disparaît à la relecture', () => {
  assert.equal(cleDistinct('a|b', 'c'), cleDistinct('a', 'b|c'));
  const e = serialiserRegle({ type: 'distinct', termes: ['a|b', 'c'] });
  assert.deepEqual(lireLesRegles([[e.cle, e.texte!]]).distincts, []);
});

test('A10 : renommer une collection fait disparaître un token de l’index d’export', async () => {
  const b = banc([['v1', 'foo'], ['v2', 'theme/foo']]);
  b.session.collection('c')!.name = 'Colors';
  const index = () => indexVariables([...b.variables.values()] as Parameters<typeof indexVariables>[0], new Map([['c', b.session.collection('c')!]]) as Parameters<typeof indexVariables>[1]);
  assert.equal(index().pathById.size, 2);
  const s = await sessionDuBanc(b, async () => b.session);
  const question = s.bilan().questions.find((q) => q.type === 'collection');
  assert.ok(question);
  await s.envoyer({ type: 'repondre', question: question.cle, reponse: { type: 'collection', cible: 'theme' } });
  await s.appliquer();
  assert.equal(b.session.collection('c')!.name, 'theme');
  assert.equal(index().pathById.size, 1);
  assert.equal(index().ambiguous.get('v2')!.path, 'theme.foo');
  assert.equal(b.variables.size, 2);
});

test('A10 : un renommage de variable introduit une collision entre feuille et groupe', async () => {
  const b = banc([['v1', 'ink'], ['v2', 'paint/detail']]);
  const index = () => indexVariables([...b.variables.values()] as Parameters<typeof indexVariables>[0], new Map([['c', b.session.collection('c')!]]) as Parameters<typeof indexVariables>[1]);
  assert.equal(index().pathById.size, 2);
  const s = await sessionDuBanc(b, async () => b.session);
  await s.envoyer({ type: 'regle', geste: { type: 'remplacer-par', terme: 'ink', par: 'paint' } });
  await s.appliquer();
  assert.deepEqual(b.noms(), ['paint', 'paint/detail']);
  assert.equal(index().pathById.size, 1);
  assert.equal(index().ambiguous.get('v2')!.kind, 'leaf-group');
});

test('A11 : une panne au milieu d’un import conserve la première règle écrite', async () => {
  const b = banc([['v', 'Original']]);
  const s = await sessionDuBanc(b, async () => b.session);
  b.panne.cle = 'terme:beta';
  await s.envoyer({ type: 'importer', texte: JSON.stringify({ version: 1, termes: [
    { terme: ['alpha'], remplace: [['aaa']] }, { terme: ['beta'], remplace: [['bbb']] },
  ] }) });
  assert.ok(b.stock.has('terme:alpha'));
  assert.equal(b.stock.has('terme:beta'), false);
  assert.equal(s.messages.at(-1)!.type, 'erreur');
});

test('A12 : annuler une réponse écrase un ajout de règle ultérieur', () => {
  const b = banc([]);
  const terme = (remplace: string[]) => serialiserRegle({ type: 'terme', terme: { terme: ['ink'], remplace: remplace.map((m) => [m]) } });
  rangerLesEcritures(b.stockage, [terme(['paint'])]);
  rangerLesEcritures(b.stockage, preparerReponse('paire', [terme(['paint', 'dye'])], lireLeStockage(b.stockage)));
  rangerLesEcritures(b.stockage, [terme(['paint', 'dye', 'pigment'])]);
  rangerLesEcritures(b.stockage, defaireReponse('paire', lireLeStockage(b.stockage))!);
  assert.deepEqual(lireLesRegles(lireLeStockage(b.stockage)).termes[0].remplace, [['paint']]);
});

test('borne : exporter les règles omet le journal des anciens noms', async () => {
  const b = banc([['v', 'Original']]);
  await b.appliquer([b.demande('v', 'original')]);
  assert.ok(b.journal());
  const texte = exporterLesRegles(lireLesRegles(lireLeStockage(b.stockage)));
  assert.equal('journal' in JSON.parse(texte), false);
  assert.equal(importerLesRegles(texte, lireLesRegles([]), () => []).statut, 'valide');
});

test('borne : un occupant connu et une protection connue restent respectés', async () => {
  const b = banc([['v', 'Original'], ['occupant', 'original']]);
  assert.equal((await b.appliquer([b.demande('v', 'original')])).statut, 'refuse');
  b.protegees.add('v');
  assert.equal((await b.appliquer([b.demande('v', 'autre')])).statut, 'refuse');
  assert.equal(b.variables.get('v')!.name, 'Original');
});

test('borne : les données autres que name restent identiques après application et annulation', async () => {
  const b = banc([['v', 'Original'], ['alias', 'Alias']]);
  Object.assign(b.variables.get('v')!, { key: 'cle-stable', resolvedType: 'COLOR', valuesByMode: { light: { r: 1, g: 0, b: 0 }, dark: { r: 0, g: 0, b: 0 } }, scopes: ['ALL_FILLS'], description: 'source', hiddenFromPublishing: true, codeSyntax: { WEB: 'var(--source)' } });
  Object.assign(b.variables.get('alias')!, { valuesByMode: { light: { type: 'VARIABLE_ALIAS', id: 'v' }, dark: { type: 'VARIABLE_ALIAS', id: 'v' } } });
  const donnees = () => JSON.stringify([...b.variables.values()].map(({ name, ...reste }) => reste));
  const avant = donnees();
  await b.appliquer([b.demande('v', 'original'), b.demande('alias', 'alias')]);
  assert.equal(donnees(), avant);
  await b.annuler();
  assert.equal(donnees(), avant);
  assert.deepEqual(b.noms(), ['Original', 'Alias']);
});

test('borne : les 120 permutations de cinq noms se renomment puis se rétablissent', async () => {
  const permutations = (noms: readonly string[]): string[][] => noms.length === 0 ? [[]] : noms.flatMap((nom, i) => permutations(noms.filter((_, j) => i !== j)).map((reste) => [nom, ...reste]));
  const noms = ['a', 'b', 'c', 'd', 'e'];
  const combinaisons = permutations(noms);
  assert.equal(combinaisons.length, 120);
  for (const destination of combinaisons) {
    const b = banc(noms.map((nom, i) => [`v${i}`, nom]));
    const r = await b.appliquer(destination.map((nom, i) => b.demande(`v${i}`, nom)));
    assert.equal(r.statut, 'applique');
    assert.deepEqual(b.noms(), destination);
    if (r.renommes.length > 0) assert.equal((await b.annuler()).statut, 'applique');
    assert.deepEqual(b.noms(), noms);
  }
});
