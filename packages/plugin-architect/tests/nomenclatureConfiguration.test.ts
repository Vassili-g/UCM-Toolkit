/** La page Configuration sur un DOM minimal : les cases suivent le dernier choix du designer, pas un bilan plus ancien. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Bilan, MessageDeNomenclature } from '../src/messages/nomenclature';

/** Ce que la page et les composants du socle emploient du DOM, sans rendu. */
class Element {
  children: Element[] = [];
  readonly events = new Map<string, () => void>();
  readonly attributes = new Map<string, string>();
  checked = false;
  id = '';
  type = '';
  tabIndex = 0;
  hidden = false;
  disabled = false;
  textContent = '';
  className = '';
  readonly classList = { add() {}, remove() {}, toggle() {} };
  constructor(readonly tag: string) {}
  append(...enfants: Element[]): void { this.children.push(...enfants); }
  appendChild(enfant: Element): Element { this.append(enfant); return enfant; }
  replaceChildren(...enfants: Element[]): void { this.children = enfants; }
  setAttribute(nom: string, valeur: string): void { this.attributes.set(nom, valeur); }
  getAttribute(nom: string): string | null { return this.attributes.get(nom) ?? null; }
  addEventListener(type: string, action: () => void): void { this.events.set(type, action); }
}
(globalThis as { document?: unknown }).document = { createElement: (tag: string) => new Element(tag), createElementNS: (_espace: string, tag: string) => new Element(tag), createTextNode: (texte: string) => Object.assign(new Element('#text'), { textContent: texte }) };

/** Les modules de l'écran se chargent après le DOM minimal. */
const modules = Promise.all([import('../src/ui/nomenclature/configuration'), import('../src/ui/nomenclature/frontiere')]);
const { ETATS } = require('../galerie/etats/nomenclature.cjs') as { ETATS: { id: string; atteinte: { message?: MessageDeNomenclature }[] }[] };

async function banc() {
  const [{ monterConfiguration }, { creerFrontiere }] = await modules;
  const envoyees: Extract<import('../src/messages/nomenclature').DemandeDeNomenclature, { type: 'configurer' }>[] = [];
  const reglesEnvoyees: Extract<import('../src/messages/nomenclature').DemandeDeNomenclature, { type: 'regle' }>[] = [];
  const abonnes: ((message: MessageDeNomenclature, etat: { bilan: Bilan | null }) => void)[] = [];
  let bilan: Bilan | null = null;
  const frontiere = creerFrontiere({
    envoyer: (demande) => {
      if (demande.type === 'configurer') envoyees.push(demande);
      if (demande.type === 'regle') reglesEnvoyees.push(demande);
    },
    afficher: (message) => {
      if (message.type === 'bilan') bilan = message.bilan;
      if (message.type === 'analyse-demandee') return;
      for (const abonne of abonnes) abonne(message, { bilan });
    },
  });
  const configuration = new Element('div');
  monterConfiguration({ frontiere, configuration, abonner: (abonne: (typeof abonnes)[number]) => abonnes.push(abonne), etat: () => ({ bilan }) } as never);
  const bilanDe = (generation: number, exclues: readonly string[], architecture: Bilan['architecture'] = 'absente') => ({
    architecture,
    generation, collections: ['a', 'b', 'c'].map((id) => ({ id, nom: id, analysee: !exclues.includes(id), protegees: 0, nombre: 1 })),
    dernierRenommage: null, dernierImport: null,
  }) as unknown as Bilan;
  frontiere.recevoir({ type: 'bilan', demande: frontiere.analyser(), bilan: bilanDe(1, []) });
  const cases = configuration.children[3]!.children[1]!.children[2]!.children.map((ligne) => ligne.children[0]!);
  const decocher = (rang: number) => { cases[rang]!.checked = false; cases[rang]!.events.get('change')!(); };
  const repondues = new Set<number>();
  /** Le sandbox répond à la plus ancienne demande envoyée sans réponse. */
  const repondre = (exclues: readonly string[]) => {
    const { demande } = envoyees.find((envoyee) => !repondues.has(envoyee.demande))!;
    repondues.add(demande);
    frontiere.recevoir({ type: 'bilan', demande, bilan: bilanDe(demande, exclues) });
  };
  const sectionArchitecture = configuration.children[3]!.children[0]!;
  const interrupteur = sectionArchitecture.children[1]!.children[0]!.children[1]!;
  return { envoyees, reglesEnvoyees, cases, decocher, repondre, frontiere, configuration, bilanDe, interrupteur, sectionArchitecture };
}

test('l’interrupteur d’architecture envoie une règle et suit le bilan reçu', async () => {
  const b = await banc();
  assert.equal(b.interrupteur.getAttribute('role'), 'switch');
  assert.equal(b.interrupteur.getAttribute('aria-checked'), 'false');
  b.interrupteur.events.get('click')!();
  const envoyee = b.reglesEnvoyees.at(-1)!;
  assert.deepEqual(envoyee.geste, { type: 'architecture', ucm: true });
  assert.equal(b.interrupteur.getAttribute('aria-checked'), 'true');
  b.frontiere.recevoir({ type: 'bilan', demande: envoyee.demande, bilan: b.bilanDe(2, [], 'ucm') });
  assert.equal(b.interrupteur.getAttribute('aria-checked'), 'true');
  b.frontiere.recevoir({ type: 'bilan', demande: b.frontiere.analyser(), bilan: b.bilanDe(3, [], 'libre') });
  assert.equal(b.interrupteur.getAttribute('aria-checked'), 'false');
});

test('une écriture refusée remet l’interrupteur à l’état relu par le sandbox', async () => {
  const b = await banc();
  b.interrupteur.events.get('click')!();
  b.frontiere.recevoir({ type: 'erreur', demande: b.reglesEnvoyees.at(-1)!.demande, code: 'echec', architecture: 'future' });
  assert.equal(b.interrupteur.getAttribute('aria-checked'), 'false');
  assert.equal(b.interrupteur.disabled, false);
  assert.equal(b.sectionArchitecture.children[2]!.textContent, 'Elle vient d’une version plus récente d’UCM Nomenclature.');
});

test('une déclaration illisible ou future affiche OFF et reste remplaçable', async () => {
  for (const [architecture, texte] of [
    ['illisible', 'La déclaration rangée dans ce fichier est illisible.'],
    ['future', 'Elle vient d’une version plus récente d’UCM Nomenclature.'],
  ] as const) {
    const b = await banc();
    b.frontiere.recevoir({ type: 'bilan', demande: b.frontiere.analyser(), bilan: b.bilanDe(2, [], architecture) });
    assert.equal(b.interrupteur.getAttribute('aria-checked'), 'false');
    assert.equal(b.interrupteur.disabled, false);
    assert.equal(b.sectionArchitecture.children[2]!.textContent, texte);
    b.interrupteur.events.get('click')!();
    const envoyee = b.reglesEnvoyees.at(-1)!;
    assert.deepEqual(envoyee.geste, { type: 'architecture', ucm: true });
    b.frontiere.recevoir({ type: 'bilan', demande: envoyee.demande, bilan: b.bilanDe(3, [], 'ucm') });
    assert.equal(b.sectionArchitecture.children[2]!.hidden, true);
  }
});

for (const [id, active, ligne] of [
  ['configuration-architecture-libre', false, ''],
  ['configuration-architecture-ucm', true, ''],
  ['configuration-architecture-illisible', false, 'La déclaration rangée dans ce fichier est illisible.'],
] as const) {
  test(`galerie : ${id} rend la section et l’interrupteur du socle`, async () => {
    const b = await banc();
    const etat = ETATS.find((etat) => etat.id === id);
    assert.ok(etat);
    const message = etat.atteinte.find((etape) => etape.message?.type === 'bilan')!.message!;
    assert.ok(message.type === 'bilan');
    b.frontiere.recevoir({ ...message, demande: b.frontiere.analyser() });
    assert.equal(b.sectionArchitecture.children[0]!.textContent, 'Architecture du fichier');
    assert.equal(b.sectionArchitecture.children[1]!.children[0]!.children[0]!.textContent, 'Ce fichier suit l’architecture UCM');
    assert.equal(b.interrupteur.className, 'interrupteur');
    assert.equal(b.interrupteur.getAttribute('aria-checked'), String(active));
    assert.equal(b.interrupteur.disabled, false);
    assert.equal(b.sectionArchitecture.children[2]!.textContent, ligne);
    assert.equal(b.sectionArchitecture.children[2]!.hidden, ligne === '');
    assert.equal(b.configuration.children[3]!.children[1]!.children[0]!.textContent, 'Collections analysées');
  });
}

test('N05 : un bilan intermédiaire ne recoche pas une collection que le designer a décochée depuis', async () => {
  const b = await banc();
  b.decocher(0);
  b.decocher(1);
  b.repondre(['a']);
  assert.equal(b.cases[1]!.checked, false, 'B reste décochée tant que sa demande attend');
  b.decocher(2);
  b.repondre(['a', 'b']);
  assert.equal(b.cases[2]!.checked, false, 'C reste décochée tant que sa demande attend');
  assert.deepEqual([...b.envoyees.at(-1)!.collectionsExclues], ['a', 'b', 'c']);
  b.repondre(['a', 'b', 'c']);
  assert.deepEqual(b.cases.map((caseACocher) => caseACocher.checked), [false, false, false]);
});

test('N05 : la réponse au dernier choix fait autorité, et une erreur rend les cases du dernier bilan', async () => {
  const b = await banc();
  b.decocher(0);
  b.repondre(['a']);
  assert.deepEqual(b.cases.map((caseACocher) => caseACocher.checked), [false, true, true]);
  b.decocher(1);
  const demande = b.envoyees.at(-1)!.demande;
  b.frontiere.recevoir({ type: 'erreur', demande, code: 'echec' });
  assert.deepEqual(b.cases.map((caseACocher) => caseACocher.checked), [false, true, true], 'le choix refusé n’est pas rangé');
});

test('la ligne d’une collection dit combien de variables gardent leur nom, et chaque cause reprend sa ligne sous la liste', async () => {
  const b = await banc();
  const collections = [
    { id: 'a', nom: 'brands', analysee: true, protegees: 0, nombre: 420 },
    { id: 'b', nom: 'primitives', analysee: false, protegees: 120, nombre: 346 },
    { id: 'c', nom: 'Palettes', analysee: true, protegees: 12, nombre: 12 },
  ];
  const protections = [{ cause: 'marque-absente', nombre: 3 }, { cause: 'lecture-refusee', nombre: 40 }];
  b.frontiere.recevoir({ type: 'bilan', demande: b.frontiere.analyser(), bilan: { generation: 2, collections, protections, dernierRenommage: null, dernierImport: null } as unknown as Bilan });
  const section = b.configuration.children[3]!.children[1]!;
  const detail = (rang: number) => section.children[2]!.children[rang]!.children[2]!.textContent;
  assert.deepEqual([detail(0), detail(1), detail(2)], ['420 variables', '346 variables, dont 120 gardent leur nom', '12 variables, qui gardent leur nom']);
  const causes = section.children[3]!;
  assert.equal(causes.hidden, false);
  const texte = (element: Element): string[] => (element.children.length === 0 ? [element.textContent] : element.children.flatMap(texte)).filter(Boolean);
  assert.deepEqual(texte(causes), [
    '3 noms écrits par UCM Palettes',
    'UCM Palettes écrit ces variables, et leur groupe garde son nom. Ouvrez UCM Palettes une fois dans ce fichier pour qu’il suive les règles, puis revenez ici.',
    '40 variables de couleur non vérifiées',
    'UCM Nomenclature n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier. Relancez l’analyse pour renommer ces variables.',
  ]);
  b.frontiere.recevoir({ type: 'bilan', demande: b.frontiere.analyser(), bilan: { generation: 3, collections, protections: [], dernierRenommage: null, dernierImport: null } as unknown as Bilan });
  assert.equal(section.children[3]!.hidden, true, 'sans protection, la zone des causes se masque');
});
