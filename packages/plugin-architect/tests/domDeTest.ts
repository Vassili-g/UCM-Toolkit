/**
 * Un DOM réduit pour les tests du panneau : de quoi monter les vues d'`src/ui` sans navigateur et lire ce qu'elles posent (classes,
 * attributs, texte, enfants), cliquer et cocher. Il ne connaît ni la mise en page ni le bouillonnement des événements. Les
 * sélecteurs admis : balise, `.classe`, `[attribut]`, `[attribut="valeur"]`, descendant (espace) et enfant direct (`>`).
 */

type Enfant = NoeudDeTest | string;

export class NoeudDeTest {
  parent: NoeudDeTest | null = null;
  childNodes: NoeudDeTest[] = [];
  get textContent(): string {
    return this.childNodes.map((enfant) => enfant.textContent).join('');
  }
  set textContent(valeur: string) {
    this.childNodes.forEach((enfant) => { enfant.parent = null; });
    this.childNodes = valeur === '' ? [] : [new TexteDeTest(valeur)];
    this.childNodes.forEach((enfant) => { enfant.parent = this; });
  }
  get firstChild(): NoeudDeTest | null {
    return this.childNodes[0] ?? null;
  }
  get children(): ElementDeTest[] {
    return this.childNodes.filter((enfant): enfant is ElementDeTest => enfant instanceof ElementDeTest);
  }
  get childElementCount(): number {
    return this.children.length;
  }
  hasChildNodes(): boolean {
    return this.childNodes.length > 0;
  }
  private recevoir(enfants: readonly Enfant[]): NoeudDeTest[] {
    return enfants.flatMap((enfant) => {
      if (typeof enfant === 'string') return [new TexteDeTest(enfant)];
      if (enfant instanceof FragmentDeTest) {
        const contenu = enfant.childNodes;
        enfant.childNodes = [];
        return contenu;
      }
      enfant.retirer();
      return [enfant];
    });
  }
  append(...enfants: Enfant[]): void {
    for (const enfant of this.recevoir(enfants)) {
      enfant.parent = this;
      this.childNodes.push(enfant);
    }
  }
  appendChild<Type extends NoeudDeTest>(enfant: Type): Type {
    this.append(enfant);
    return enfant;
  }
  replaceChildren(...enfants: Enfant[]): void {
    const nouveaux = this.recevoir(enfants);
    this.childNodes.forEach((ancien) => { ancien.parent = null; });
    this.childNodes = [];
    for (const enfant of nouveaux) {
      enfant.parent = this;
      this.childNodes.push(enfant);
    }
  }
  replaceWith(...enfants: Enfant[]): void {
    const parent = this.parent;
    if (!parent) return;
    const rang = parent.childNodes.indexOf(this);
    const nouveaux = this.recevoir(enfants);
    parent.childNodes.splice(rang, 1, ...nouveaux);
    nouveaux.forEach((enfant) => { enfant.parent = parent; });
    this.parent = null;
  }
  remove(): void {
    this.retirer();
  }
  private retirer(): void {
    if (!this.parent) return;
    this.parent.childNodes = this.parent.childNodes.filter((enfant) => enfant !== this);
    this.parent = null;
  }
  contains(autre: NoeudDeTest | null): boolean {
    for (let noeud = autre; noeud; noeud = noeud.parent) if (noeud === this) return true;
    return false;
  }
  /** Tous les éléments descendants, dans l'ordre du document. */
  descendants(): ElementDeTest[] {
    return this.children.flatMap((enfant) => [enfant, ...enfant.descendants()]);
  }
}

export class TexteDeTest extends NoeudDeTest {
  constructor(public data: string) {
    super();
  }
  override get textContent(): string {
    return this.data;
  }
  override set textContent(valeur: string) {
    this.data = valeur;
  }
}

export class FragmentDeTest extends NoeudDeTest {}

type Regle = { balise: string | null; classes: string[]; attributs: Array<[string, string | null]> };

function lireLeSelecteur(selecteur: string): Array<{ lien: ' ' | '>'; regle: Regle }> {
  const morceaux = selecteur.trim().replace(/\s*>\s*/g, ' > ').split(/\s+(?![^[]*\])/);
  const sortie: Array<{ lien: ' ' | '>'; regle: Regle }> = [];
  let lien: ' ' | '>' = ' ';
  for (const morceau of morceaux) {
    if (morceau === '>') {
      lien = '>';
      continue;
    }
    const regle: Regle = { balise: null, classes: [], attributs: [] };
    for (const [, etiquette, classe, attribut, nom, valeur] of morceau.matchAll(/^([a-z][a-z0-9-]*)|\.([\w-]+)|(\[([\w-]+)(?:="([^"]*)")?\])/g)) {
      if (etiquette) regle.balise = etiquette;
      else if (classe) regle.classes.push(classe);
      else if (attribut) regle.attributs.push([nom, valeur ?? null]);
    }
    sortie.push({ lien, regle });
    lien = ' ';
  }
  return sortie;
}

const correspond = (element: ElementDeTest, regle: Regle): boolean =>
  (regle.balise === null || element.tagName === regle.balise.toUpperCase())
  && regle.classes.every((classe) => element.classes.has(classe))
  && regle.attributs.every(([nom, valeur]) => (valeur === null ? element.hasAttribute(nom) : element.getAttribute(nom) === valeur));

export class ElementDeTest extends NoeudDeTest {
  classes = new Set<string>();
  attributs = new Map<string, string>();
  dataset: Record<string, string> = {};
  style: Record<string, unknown> & { setProperty(nom: string, valeur: string): void } = Object.assign({} as Record<string, unknown>, {
    setProperty(this: Record<string, unknown>, nom: string, valeur: string) { this[nom] = valeur; },
  });
  hidden = false;
  disabled = false;
  checked = false;
  indeterminate = false;
  type = '';
  title = '';
  tabIndex = 0;
  innerHTML = '';
  readonly ecouteurs = new Map<string, Array<(evenement: Event) => void>>();
  readonly classList = {
    add: (...noms: string[]) => noms.forEach((nom) => this.classes.add(nom)),
    remove: (...noms: string[]) => noms.forEach((nom) => this.classes.delete(nom)),
    contains: (nom: string) => this.classes.has(nom),
    toggle: (nom: string, force?: boolean) => {
      const poser = force ?? !this.classes.has(nom);
      if (poser) this.classes.add(nom);
      else this.classes.delete(nom);
      return poser;
    },
  };
  constructor(readonly tagName: string) {
    super();
  }
  get className(): string {
    return [...this.classes].join(' ');
  }
  set className(valeur: string) {
    this.classes = new Set(valeur.split(/\s+/).filter(Boolean));
  }
  get id(): string {
    return this.getAttribute('id') ?? '';
  }
  setAttribute(nom: string, valeur: string): void {
    if (nom === 'class') this.className = valeur;
    else this.attributs.set(nom, String(valeur));
  }
  getAttribute(nom: string): string | null {
    if (nom === 'hidden') return this.hidden ? '' : null;
    return this.attributs.get(nom) ?? null;
  }
  hasAttribute(nom: string): boolean {
    return nom === 'class' ? this.classes.size > 0 : this.getAttribute(nom) !== null;
  }
  removeAttribute(nom: string): void {
    this.attributs.delete(nom);
  }
  addEventListener(type: string, ecouteur: (evenement: Event) => void): void {
    this.ecouteurs.set(type, [...(this.ecouteurs.get(type) ?? []), ecouteur]);
  }
  dispatchEvent(evenement: Event): boolean {
    for (const ecouteur of this.ecouteurs.get(evenement.type) ?? []) ecouteur(evenement);
    return !evenement.defaultPrevented;
  }
  focus(): void {
    (globalThis as unknown as { document: { activeElement: ElementDeTest | null } }).document.activeElement = this;
  }
  /** Un clic de souris sur l'élément ; une case à cocher change d'état d'abord, puis annonce `change`. */
  clic(): void {
    if (this.tagName === 'BUTTON' && this.disabled) return;
    if (this.tagName === 'INPUT' && this.type === 'checkbox') {
      this.checked = !this.checked;
      this.dispatchEvent(new Event('change'));
      return;
    }
    this.dispatchEvent(new Event('click', { cancelable: true }));
  }
  /** Les descendants qui correspondent au sélecteur, dans l'ordre du document. */
  querySelectorAll(selecteur: string): ElementDeTest[] {
    const pas = lireLeSelecteur(selecteur);
    const dernier = pas[pas.length - 1];
    const verifie = (candidat: ElementDeTest, rang: number): boolean => {
      if (!correspond(candidat, pas[rang].regle)) return false;
      if (rang === 0) return true;
      if (pas[rang].lien === '>') return candidat.parent instanceof ElementDeTest && verifie(candidat.parent, rang - 1);
      for (let ancetre = candidat.parent; ancetre instanceof ElementDeTest; ancetre = ancetre.parent) if (verifie(ancetre, rang - 1)) return true;
      return false;
    };
    return dernier ? this.descendants().filter((candidat) => verifie(candidat, pas.length - 1)) : [];
  }
  querySelector(selecteur: string): ElementDeTest | null {
    return this.querySelectorAll(selecteur)[0] ?? null;
  }
}

export class BoutonDeTest extends ElementDeTest {}

/** Pose `document` et les classes que les vues testent avec `instanceof`. */
export function poserLeDom(): void {
  const creer = (balise: string): ElementDeTest => (balise === 'button' ? new BoutonDeTest('BUTTON') : new ElementDeTest(balise.toUpperCase()));
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      activeElement: null,
      createElement: creer,
      createElementNS: (_espace: string, balise: string) => creer(balise),
      createTextNode: (texte: string) => new TexteDeTest(texte),
      createDocumentFragment: () => new FragmentDeTest(),
    },
  });
  Object.defineProperty(globalThis, 'HTMLButtonElement', { configurable: true, value: BoutonDeTest });
}

/** Les textes des éléments qui correspondent, pour comparer à une liste. */
export const textes = (elements: readonly ElementDeTest[]): string[] => elements.map((element) => element.textContent);

export const comme = (noeud: unknown): ElementDeTest => noeud as ElementDeTest;
