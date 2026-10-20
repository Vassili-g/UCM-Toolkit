/** La page Configuration sur un DOM minimal : les cases suivent le dernier choix du designer, pas un bilan plus ancien. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Bilan, PluginMessage } from '../src/messages';

/** Ce que la page et les composants du socle emploient du DOM, sans rendu. */
class Element {
  children: Element[] = [];
  readonly events = new Map<string, () => void>();
  checked = false;
  hidden = false;
  disabled = false;
  textContent = '';
  className = '';
  readonly classList = { add() {}, remove() {}, toggle() {} };
  constructor(readonly tag: string) {}
  append(...enfants: Element[]): void { this.children.push(...enfants); }
  appendChild(enfant: Element): Element { this.append(enfant); return enfant; }
  replaceChildren(...enfants: Element[]): void { this.children = enfants; }
  setAttribute(): void {}
  addEventListener(type: string, action: () => void): void { this.events.set(type, action); }
}
(globalThis as { document?: unknown }).document = { createElement: (tag: string) => new Element(tag), createTextNode: (texte: string) => Object.assign(new Element('#text'), { textContent: texte }) };

/** Les modules de l'écran se chargent après le DOM minimal. */
const modules = Promise.all([import('../src/ui/configuration'), import('../src/ui/frontiere')]);

async function banc() {
  const [{ monterConfiguration }, { creerFrontiere }] = await modules;
  const envoyees: Extract<import('../src/messages').DemandeArchitect, { type: 'configurer' }>[] = [];
  const abonnes: ((message: PluginMessage, etat: { bilan: Bilan | null }) => void)[] = [];
  let bilan: Bilan | null = null;
  const frontiere = creerFrontiere({
    envoyer: (demande) => { if (demande.type === 'configurer') envoyees.push(demande); },
    afficher: (message) => {
      if (message.type === 'bilan') bilan = message.bilan;
      if (message.type === 'analyse-demandee') return;
      for (const abonne of abonnes) abonne(message, { bilan });
    },
  });
  const configuration = new Element('div');
  monterConfiguration({ frontiere, configuration, abonner: (abonne: (typeof abonnes)[number]) => abonnes.push(abonne), etat: () => ({ bilan }) } as never);
  const bilanDe = (generation: number, exclues: readonly string[]) => ({
    generation, collections: ['a', 'b', 'c'].map((id) => ({ id, nom: id, analysee: !exclues.includes(id), palettes: false, nombre: 1 })),
    dernierRenommage: null, dernierImport: null,
  }) as unknown as Bilan;
  frontiere.recevoir({ type: 'bilan', demande: frontiere.analyser(), bilan: bilanDe(1, []) });
  const cases = configuration.children[1]!.children[2]!.children.map((ligne) => ligne.children[0]!);
  const decocher = (rang: number) => { cases[rang]!.checked = false; cases[rang]!.events.get('change')!(); };
  const repondues = new Set<number>();
  /** Le sandbox répond à la plus ancienne demande envoyée sans réponse. */
  const repondre = (exclues: readonly string[]) => {
    const { demande } = envoyees.find((envoyee) => !repondues.has(envoyee.demande))!;
    repondues.add(demande);
    frontiere.recevoir({ type: 'bilan', demande, bilan: bilanDe(demande, exclues) });
  };
  return { envoyees, cases, decocher, repondre, frontiere };
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
