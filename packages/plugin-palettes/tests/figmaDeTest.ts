/**
 * Un double de l'API Figma, réduit à ce que le dessin de la planche et
 * l'écriture des variables emploient. Il refuse ce que Figma refuse : lire
 * les enfants d'une page non chargée (`documentAccess: "dynamic-page"`), y
 * chercher, poser un texte dans une police non chargée, créer une variable
 * dont le nom est déjà pris dans sa collection, ajouter un mode au-delà de
 * la limite de l'offre. Un journal garde l'ordre des opérations.
 */
import type { FigmaDuDessin } from '../src/ecriture/planche';

let compteur = 0;

class Noeud {
  readonly id = `n:${(compteur += 1)}`;
  name = '';
  removed = false;
  parent: Noeud | null = null;
  x = 0;
  y = 0;
  width = 100;
  height = 20;
  /** La partie de `relativeTransform` que x et y ne portent pas : une rotation, par exemple. */
  lineaire: [[number, number], [number, number]] = [[1, 0], [0, 1]];
  layoutPositioning = 'AUTO';
  enfants: Noeud[] = [];
  readonly donnees = new Map<string, string>();

  constructor(readonly type: string, readonly figma: FauxFigma) {
    figma.registre.set(this.id, this);
  }

  getSharedPluginData(espace: string, cle: string): string {
    return this.donnees.get(`${espace}/${cle}`) ?? '';
  }

  setSharedPluginData(espace: string, cle: string, valeur: string): void {
    this.donnees.set(`${espace}/${cle}`, valeur);
  }

  get children(): Noeud[] {
    return this.enfants;
  }

  appendChild(enfant: Noeud): void {
    this.insertChild(this.enfants.length, enfant);
  }

  insertChild(rang: number, enfant: Noeud): void {
    if (enfant.parent) enfant.parent.enfants = enfant.parent.enfants.filter((autre) => autre !== enfant);
    enfant.parent = this;
    this.enfants.splice(rang, 0, enfant);
  }

  get relativeTransform(): [[number, number, number], [number, number, number]] {
    return [[this.lineaire[0][0], this.lineaire[0][1], this.x], [this.lineaire[1][0], this.lineaire[1][1], this.y]];
  }

  set relativeTransform([[a, b, x], [c, d, y]]: [[number, number, number], [number, number, number]]) {
    this.lineaire = [[a, b], [c, d]];
    this.x = x;
    this.y = y;
  }

  resize(largeur: number, hauteur: number): void {
    this.width = largeur;
    this.height = hauteur;
  }

  remove(): void {
    if (this.parent) this.parent.enfants = this.parent.enfants.filter((autre) => autre !== this);
    this.parent = null;
    const retirer = (noeud: Noeud): void => {
      noeud.removed = true;
      noeud.enfants.forEach(retirer);
    };
    retirer(this);
    this.figma.journal.push(`retirer ${this.name}`);
  }
}

class Document extends Noeud {
  documentColorProfile: 'SRGB' | 'DISPLAY_P3' | 'LEGACY' = 'SRGB';

  constructor(figma: FauxFigma) {
    super('DOCUMENT', figma);
  }
}

class Page extends Noeud {
  charge = false;

  constructor(figma: FauxFigma) {
    super('PAGE', figma);
  }

  override get children(): Noeud[] {
    if (!this.charge) throw new Error(`La page ${this.name} n'est pas chargée.`);
    return this.enfants;
  }

  async loadAsync(): Promise<void> {
    this.charge = true;
    this.figma.journal.push(`charger ${this.name}`);
  }

  /** La recherche de Figma : les nœuds du type demandé qui portent l'une des clés partagées, en profondeur. */
  findAllWithCriteria(criteres: { types: string[]; sharedPluginData: { namespace: string; keys: string[] } }): Noeud[] {
    const { namespace, keys } = criteres.sharedPluginData;
    const trouves: Noeud[] = [];
    const parcourir = (noeud: Noeud): void => {
      for (const enfant of noeud.enfants) {
        if (criteres.types.includes(enfant.type) && keys.some((cle) => enfant.getSharedPluginData(namespace, cle) !== '')) trouves.push(enfant);
        parcourir(enfant);
      }
    };
    parcourir({ enfants: this.children } as Noeud);
    return trouves;
  }
}

class Texte extends Noeud {
  private police = { family: 'Inter', style: 'Regular' };
  private contenu = '';
  fills: unknown = [];
  fontSize = 12;
  textAutoResize = 'WIDTH_AND_HEIGHT';

  constructor(figma: FauxFigma) {
    super('TEXT', figma);
    figma.journal.push('créer texte');
  }

  get fontName() {
    return this.police;
  }

  set fontName(police: { family: string; style: string }) {
    if (!this.figma.polices.has(`${police.family} ${police.style}`)) throw new Error(`police non chargée : ${police.style}`);
    this.police = police;
  }

  get characters(): string {
    return this.contenu;
  }

  set characters(contenu: string) {
    if (!this.figma.polices.has(`${this.police.family} ${this.police.style}`)) throw new Error('police non chargée');
    this.contenu = contenu;
  }
}

class Cadre extends Noeud {
  layoutMode = 'NONE';
  itemSpacing = 0;
  paddingTop = 0;
  paddingRight = 0;
  paddingBottom = 0;
  paddingLeft = 0;
  private peinture: unknown = [];
  cornerRadius = 0;
  primaryAxisAlignItems = 'MIN';
  counterAxisAlignItems = 'MIN';
  layoutSizingHorizontal = 'FIXED';
  layoutSizingVertical = 'FIXED';

  constructor(figma: FauxFigma) {
    super('FRAME', figma);
    figma.journal.push('créer cadre');
  }

  get fills(): unknown {
    return this.peinture;
  }

  set fills(peinture: unknown) {
    this.peinture = this.figma.garderLaPeinture(peinture);
  }
}

/** Une section, où le designer range des cadres. */
class Section extends Noeud {
  constructor(figma: FauxFigma) {
    super('SECTION', figma);
  }
}

/** Ce qui porte des données de plugin partagées sans être un nœud : une collection, une variable. */
class Porteur {
  readonly donnees = new Map<string, string>();

  getSharedPluginData(espace: string, cle: string): string {
    return this.donnees.get(`${espace}/${cle}`) ?? '';
  }

  setSharedPluginData(espace: string, cle: string, valeur: string): void {
    this.donnees.set(`${espace}/${cle}`, valeur);
  }
}

type ValeurDeVariable = { r: number; g: number; b: number; a: number } | { type: 'VARIABLE_ALIAS'; id: string };

/** Une collection locale de variables : ses modes, dans leur ordre, et ses variables. */
export class FausseCollection extends Porteur {
  readonly id = `VariableCollectionId:${(compteur += 1)}:0`;
  /** Vrai pour une collection de bibliothèque : elle n'est pas locale, et ses variables ne s'écrivent pas. */
  remote = false;
  /** La clé d'une collection de bibliothèque, et le nom du fichier qui la publie. */
  readonly key = `cle-de-collection-${(compteur += 1)}`;
  bibliotheque = '';
  modes: { modeId: string; name: string }[];
  variableIds: string[] = [];

  constructor(public name: string, readonly figma: FauxFigma) {
    super();
    this.modes = [{ modeId: `${(compteur += 1)}:0`, name: 'Mode 1' }];
  }

  get defaultModeId(): string {
    return this.modes[0].modeId;
  }

  addMode(nom: string): string {
    if (this.modes.length >= this.figma.limiteDeModes) throw new Error(`in addMode: Limited to ${this.figma.limiteDeModes} modes only`);
    const modeId = `${(compteur += 1)}:0`;
    this.modes.push({ modeId, name: nom });
    this.figma.journal.push(`ajouter mode ${nom}`);
    return modeId;
  }

  renameMode(modeId: string, nom: string): void {
    const mode = this.modes.find((candidat) => candidat.modeId === modeId);
    if (!mode) throw new Error(`mode inconnu : ${modeId}`);
    mode.name = nom;
    this.figma.journal.push(`renommer mode ${nom}`);
  }
}

/** Une variable locale de couleur. Créée, elle porte dans chaque mode le blanc que Figma lui donne. */
export class FausseVariable extends Porteur {
  readonly id = `VariableID:${(compteur += 1)}:0`;
  readonly key = `cle-de-variable-${(compteur += 1)}`;
  get remote(): boolean {
    return this.collection.remote;
  }
  readonly resolvedType = 'COLOR';
  scopes: string[] = ['ALL_SCOPES'];
  valuesByMode: { [mode: string]: ValeurDeVariable } = {};
  private nom: string;

  constructor(nom: string, readonly collection: FausseCollection, readonly figma: FauxFigma) {
    super();
    this.nom = nom;
    for (const mode of collection.modes) this.valuesByMode[mode.modeId] = { r: 1, g: 1, b: 1, a: 1 };
  }

  get name(): string {
    return this.nom;
  }

  set name(nom: string) {
    if (this.figma.variablesDe(this.collection).some((autre) => autre !== this && autre.name === nom)) throw new Error(`duplicate variable name : ${nom}`);
    this.nom = nom;
  }

  get variableCollectionId(): string {
    return this.collection.id;
  }

  setValueForMode(mode: string, valeur: ValeurDeVariable): void {
    if (!this.collection.modes.some((candidat) => candidat.modeId === mode)) throw new Error(`mode inconnu : ${mode}`);
    if (this.figma.echouerALaValeur !== null && (this.figma.echouerALaValeur -= 1) < 0) {
      // Une seule écriture échoue : les palettes suivantes s'écrivent.
      this.figma.echouerALaValeur = null;
      throw new Error('écriture de valeur refusée');
    }
    this.valuesByMode[mode] = valeur;
    this.figma.journal.push(`valeur ${this.nom}`);
  }

  remove(): void {
    this.figma.locales.delete(this.id);
    this.collection.variableIds = this.collection.variableIds.filter((id) => id !== this.id);
    this.figma.journal.push(`retirer variable ${this.nom}`);
  }
}

export class FauxFigma {
  readonly registre = new Map<string, Noeud>();
  /** Les collections et les variables locales, dans l'ordre de leur création. */
  readonly collections = new Map<string, FausseCollection>();
  readonly locales = new Map<string, FausseVariable>();
  /** Le nombre de modes qu'une collection porte au plus : l'offre gratuite de Figma s'arrête à un. */
  limiteDeModes = 4;
  /** Le nombre de valeurs écrites avant que l'écriture suivante lève, une fois ; `null`, jamais. */
  echouerALaValeur: number | null = null;

  /** L'API des variables : ce que Figma appelle `figma.variables`. */
  readonly variables = {
    createVariableCollection: (nom: string): FausseCollection => {
      const collection = new FausseCollection(nom, this);
      this.collections.set(collection.id, collection);
      this.journal.push(`créer collection ${nom}`);
      return collection;
    },
    createVariable: (nom: string, collection: FausseCollection, type: string): FausseVariable => {
      if (type !== 'COLOR') throw new Error(`type hors du double : ${type}`);
      if (this.variablesDe(collection).some((autre) => autre.name === nom)) throw new Error(`duplicate variable name : ${nom}`);
      const variable = new FausseVariable(nom, collection, this);
      this.locales.set(variable.id, variable);
      collection.variableIds.push(variable.id);
      this.journal.push(`créer variable ${nom}`);
      return variable;
    },
    getLocalVariableCollectionsAsync: async (): Promise<FausseCollection[]> => [...this.collections.values()],
    getLocalVariablesAsync: async (type?: string): Promise<FausseVariable[]> => {
      this.journal.push('lire variables');
      return [...this.locales.values()].filter((variable) => type === undefined || variable.resolvedType === type);
    },
    getVariableByIdAsync: async (id: string): Promise<FausseVariable | null> => this.locales.get(id) ?? null,
    getVariableCollectionByIdAsync: async (id: string): Promise<FausseCollection | null> => this.collections.get(id) ?? this.distantes.find((collection) => collection.id === id) ?? null,
    importVariableByKeyAsync: async (cle: string): Promise<FausseVariable> => {
      const variable = this.distantes.flatMap((collection) => collection.publiees).find((candidate) => candidate.key === cle);
      if (!variable || this.importsRefuses) throw new Error(`import refusé : ${cle}`);
      this.importees.add(variable.id);
      this.journal.push(`importer ${variable.name}`);
      return variable;
    },
  };

  /** Les collections des bibliothèques activées, avec les variables qu'elles publient. */
  readonly distantes: (FausseCollection & { publiees: FausseVariable[]; autres: string[] })[] = [];
  /** Les variables de bibliothèque que le fichier a importées. */
  readonly importees = new Set<string>();
  /** Vrai quand Figma refuse la lecture des bibliothèques, ou l'import d'une variable. */
  bibliothequesRefusees = false;
  importsRefuses = false;

  /** L'API des bibliothèques : ce que Figma appelle `figma.teamLibrary`. Elle ne rend aucune valeur. */
  readonly teamLibrary = {
    getAvailableLibraryVariableCollectionsAsync: async (): Promise<{ name: string; key: string; libraryName: string }[]> => {
      if (this.bibliothequesRefusees) throw new Error('bibliothèques indisponibles');
      return this.distantes.map((collection) => ({ name: collection.name, key: collection.key, libraryName: collection.bibliotheque }));
    },
    getVariablesInLibraryCollectionAsync: async (cle: string): Promise<{ name: string; key: string; resolvedType: string }[]> => {
      if (this.bibliothequesRefusees) throw new Error('bibliothèques indisponibles');
      const collection = this.distantes.find((candidate) => candidate.key === cle);
      if (!collection) throw new Error(`collection inconnue : ${cle}`);
      return [
        ...collection.publiees.map((variable) => ({ name: variable.name, key: variable.key, resolvedType: 'COLOR' })),
        ...collection.autres.map((nom, rang) => ({ name: nom, key: `${cle}-autre-${rang}`, resolvedType: 'FLOAT' })),
      ];
    },
  };

  /**
   * Une collection de bibliothèque : ses modes, ses variables de couleur, un
   * hexa par mode, et les noms de ses variables d'un autre type.
   */
  bibliotheque(nomDeLaBibliotheque: string, nomDeLaCollection: string, modes: readonly string[], couleurs: { readonly [nom: string]: readonly string[] }, autres: readonly string[] = []): FausseCollection {
    const collection = Object.assign(new FausseCollection(nomDeLaCollection, this), { publiees: [] as FausseVariable[], autres: [...autres] });
    collection.remote = true;
    collection.bibliotheque = nomDeLaBibliotheque;
    collection.modes = modes.map((nom) => ({ modeId: `${(compteur += 1)}:0`, name: nom }));
    for (const [nom, hexas] of Object.entries(couleurs)) {
      const variable = new FausseVariable(nom, collection, this);
      collection.modes.forEach((mode, rang) => {
        const hexa = hexas[rang];
        variable.valuesByMode[mode.modeId] = { r: parseInt(hexa.slice(1, 3), 16) / 255, g: parseInt(hexa.slice(3, 5), 16) / 255, b: parseInt(hexa.slice(5, 7), 16) / 255, a: 1 };
      });
      collection.publiees.push(variable);
    }
    this.distantes.push(collection as FausseCollection & { publiees: FausseVariable[]; autres: string[] });
    return collection;
  }

  /** Les variables d'une collection, dans l'ordre de leur création. */
  variablesDe(collection: FausseCollection): FausseVariable[] {
    return collection.variableIds.map((id) => this.locales.get(id)!).filter(Boolean);
  }

  /** La variable locale de ce nom, dans n'importe quelle collection. */
  variable(nom: string): FausseVariable {
    const trouvee = [...this.locales.values()].find((variable) => variable.name === nom);
    if (!trouvee) throw new Error(`aucune variable ${nom}`);
    return trouvee;
  }
  /** Les identifiants que Figma refuse de lire : `getNodeByIdAsync` lève. */
  readonly illisibles = new Set<string>();
  readonly journal: string[] = [];
  readonly polices = new Set<string>();
  /** Les styles dont le chargement échoue. */
  readonly policesAbsentes = new Set<string>();
  /** Le nombre de textes créés avant que la création suivante lève ; `null`, jamais. */
  echouerAuTexte: number | null = null;
  /** Ce que Figma garde de la peinture d'un cadre ; un test la fausse pour voir le dessin la relire. */
  garderLaPeinture: (peinture: unknown) => unknown = (peinture) => peinture;
  readonly root: Document;
  readonly pageCourante: Page;

  constructor(nomsDePages: string[] = ['Page 1']) {
    this.root = new Document(this);
    for (const nom of nomsDePages) {
      const page = new Page(this);
      page.name = nom;
      this.root.appendChild(page);
    }
    this.pageCourante = this.root.enfants[0] as Page;
  }

  createPage(): Page {
    const page = new Page(this);
    this.root.appendChild(page);
    this.journal.push('créer page');
    return page;
  }

  createFrame(): Cadre {
    const cadre = new Cadre(this);
    this.pageCourante.enfants.push(cadre);
    cadre.parent = this.pageCourante;
    return cadre;
  }

  createText(): Texte {
    // L'échec lève avant de construire : aucun nœud ne reste inscrit au registre.
    if (this.echouerAuTexte !== null && (this.echouerAuTexte -= 1) < 0) throw new Error('création de texte refusée');
    const texte = new Texte(this);
    this.pageCourante.enfants.push(texte);
    texte.parent = this.pageCourante;
    return texte;
  }

  /** Une section posée sur une page. */
  section(page: Page): Section {
    const section = new Section(this);
    page.enfants.push(section);
    section.parent = page;
    return section;
  }

  async getNodeByIdAsync(id: string): Promise<Noeud | null> {
    if (this.illisibles.has(id)) throw new Error(`lecture refusée : ${id}`);
    const noeud = this.registre.get(id);
    return noeud && !noeud.removed ? noeud : null;
  }

  async loadFontAsync(police: { family: string; style: string }): Promise<void> {
    const nom = `${police.family} ${police.style}`;
    if (this.policesAbsentes.has(police.style)) throw new Error(`police absente : ${nom}`);
    this.polices.add(nom);
    this.journal.push(`police ${police.style}`);
  }

  commitUndo(): void {
    this.journal.push('commitUndo');
  }

  /** Le double sous le type que le dessin attend. */
  api(): FigmaDuDessin {
    return this as unknown as FigmaDuDessin;
  }

  /** La page nommée, chargée pour la lecture du test. */
  page(nom: string): Page {
    const page = this.root.enfants.find((candidate) => candidate.name === nom) as Page | undefined;
    if (!page) throw new Error(`aucune page ${nom}`);
    page.charge = true;
    return page;
  }

  /** Tous les nœuds encore présents sous un nœud, lui compris. */
  sous(noeud: Noeud): Noeud[] {
    return [noeud, ...noeud.enfants.flatMap((enfant) => this.sous(enfant))];
  }
}
