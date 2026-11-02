/**
 * Les opérateurs de dégradation des liaisons d'axe (L1 à L5, constats C16 et C22) des stress tests F3, et l'outillage que les opérateurs
 * de rôles (`operateursRoles.ts`) et de cibles (`operateursCibles.ts`) partagent : la dégradation réversible, le registre qui
 * numérote les cas, la clé de rattachement des constats et la règle de scope du plan.
 *
 * Chaque opérateur copie le composant de base, dégrade la copie et rend un `CasDeStress` dont les `attendus` viennent du plan et
 * du référentiel (rôles de l'inventaire 4.2, scopes de K4), jamais d'un appel aux contrôles. Le journal de `Degradation` défait
 * chaque écriture : `annuler()` redonne le relevé et le catalogue de la base. C21 reste hors des codes jugés (`CODES_JUGES`) : il
 * relève de M1 et de Q-F3-16, et chaque liaison dégradée ici sort aussi de la majorité de sa fratrie.
 */
import type { Constat, LayerLu, LiaisonLue, PeintureLue, VariableDuCatalogue } from '../../../src/controles/index.js';
import { etatReconnu } from '../../../src/controles/nommage.js';
import { choisir, graineDe, mulberry32 } from '../commun/prng.js';
import type { CasDeStress, ConstatAttendu, Verdict } from '../commun/types.js';
import { jetonDe, type AxeDeCarte, type CarteDuComposant, type JetonDeCarte, type LiaisonAttendue, type NomDeLayer, type ProprieteDeTaille, type RoleDeCouleur, type VariantDeCarte } from './carte.js';
import { CODES_DE_LA_PORTEE, copierLeComposant, GRAINE_PAR_DEFAUT, type ComposantDeBase } from './composantDeBase.js';

/** Les codes jugés pour L, R et K : tous ceux de la portée sauf C21, qui est l'objet de M1 (voir l'en-tête). */
export const CODES_JUGES: readonly string[] = CODES_DE_LA_PORTEE.filter((code) => code !== 'C21');

/** Ce qu'une dégradation touche : le lot 5 s'en sert pour n'associer que des atomes de zones disjointes. */
export interface ZoneTouchee { readonly variant: string; readonly layer: string; readonly champ: string }

export interface EntreeDeCas {
  /** La copie dégradée de `base`. */
  readonly composant: ComposantDeBase;
  /** Le composant dont la copie part : jamais modifié. Pour un cas à deux modes, c'est la base reconstruite à deux modes. */
  readonly base: ComposantDeBase;
  /** Défait la dégradation sur `composant`, en sens inverse. Appelée avant tout appel aux contrôles, qui mémorisent leurs lectures. */
  readonly annuler: () => void;
  readonly zones: readonly ZoneTouchee[];
  readonly description: string;
}

export type CasDeComposant = CasDeStress<EntreeDeCas>;

/** Une copie profonde de la base et le journal de ce qu'on y écrit. */
export class Degradation {
  readonly composant: ComposantDeBase;
  readonly zones: ZoneTouchee[] = [];
  private readonly journal: (() => void)[] = [];
  private creees = 0;

  constructor(readonly base: ComposantDeBase) {
    this.composant = copierLeComposant(base);
  }

  get releve() { return this.composant.releve; }
  get catalogue() { return this.composant.catalogue; }
  /** La carte de la base : elle dit ce qui est juste, jamais ce que la dégradation écrit. */
  get carte(): CarteDuComposant { return this.base.carte; }

  fixer<T extends object, K extends keyof T>(objet: T, cle: K, valeur: T[K]): void {
    const existait = Object.prototype.hasOwnProperty.call(objet, cle);
    const ancien = objet[cle];
    objet[cle] = valeur;
    this.journal.push(() => {
      if (existait) objet[cle] = ancien;
      else delete (objet as Record<PropertyKey, unknown>)[cle as PropertyKey];
    });
  }

  inserer<T>(liste: T[], element: T): void {
    liste.push(element);
    this.journal.push(() => { liste.splice(liste.lastIndexOf(element), 1); });
  }

  retirer<T>(liste: T[], element: T): void {
    const rang = liste.indexOf(element);
    if (rang < 0) throw new Error('retirer : élément absent');
    liste.splice(rang, 1);
    this.journal.push(() => { liste.splice(rang, 0, element); });
  }

  annuler(): void {
    for (let i = this.journal.length - 1; i >= 0; i--) this.journal[i]();
    this.journal.length = 0;
  }

  variable(cle: string): VariableDuCatalogue {
    const variable = this.catalogue.variables.find((entree) => entree.cle === cle);
    if (!variable) throw new Error(`Variable ${cle} absente du catalogue`);
    return variable;
  }

  variableParNom(nom: string, collection?: string): VariableDuCatalogue | undefined {
    return this.catalogue.variables.find((entree) => entree.nom === nom && (collection === undefined || entree.collection === collection));
  }

  /** La première variable de la collection de ce rôle, du type demandé si l'une existe. */
  premiereDe(role: string, type?: VariableDuCatalogue['type']): VariableDuCatalogue | undefined {
    const collection = this.catalogue.collections.find((entree) => entree.role === role);
    if (!collection) return undefined;
    const dedans = this.catalogue.variables.filter((entree) => entree.collection === collection.cle);
    return dedans.find((entree) => entree.type === type) ?? dedans[0];
  }

  /** Une copie de la variable sous une autre clé, avec les changements donnés, ajoutée à la fin du catalogue. */
  cloner(modele: VariableDuCatalogue, changements: Partial<Omit<VariableDuCatalogue, 'cle'>> = {}): VariableDuCatalogue {
    this.creees += 1;
    const copie = Object.assign(structuredClone(modele), changements, { cle: `kz${String(this.creees).padStart(5, '0')}` });
    this.inserer(this.catalogue.variables, copie);
    return copie;
  }

  layer(variant: string, nom: NomDeLayer): LayerLu {
    const identifiant = this.carte.variants.find((entree) => entree.id === variant)?.layers[nom];
    const layer = this.releve.variants.find((entree) => entree.id === variant)?.layers.find((entree) => entree.id === identifiant);
    if (!layer) throw new Error(`Layer ${nom} absent du variant ${variant}`);
    return layer;
  }

  liaison(attendue: LiaisonAttendue): LiaisonLue {
    const layer = this.releve.variants.find((entree) => entree.id === attendue.variant)?.layers.find((entree) => entree.id === attendue.layer);
    const lue = layer?.liaisons.find((entree) => entree.champ === attendue.champ && entree.indice === attendue.indice
      && entree.plage?.debut === attendue.plage?.debut && entree.surcharge?.id === attendue.surcharge);
    if (!lue) throw new Error(`Liaison ${cleLisible(attendue)} absente du relevé`);
    return lue;
  }

  /** Lie une liaison existante à cette variable, et note la zone touchée. */
  lierA(attendue: LiaisonAttendue, variable: VariableDuCatalogue): void {
    this.fixer(this.liaison(attendue), 'variable', variableLue(variable));
    this.zones.push({ variant: attendue.variant, layer: attendue.layer, champ: attendue.champ });
  }

  /** Ajoute une peinture unie visible à un layer et la lie à la variable, pour une cible que la base ne porte pas. */
  ajouterPeintureLiee(variant: string, nom: NomDeLayer, champ: 'fills' | 'strokes', variable: VariableDuCatalogue): { layer: string; champ: string } {
    const layer = this.layer(variant, nom);
    const indice = layer.peintures.filter((peinture) => peinture.champ === champ).length;
    const peinture: PeintureLue = { champ, indice, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 0.2, g: 0.4, b: 0.8, a: 1 } };
    this.inserer(layer.peintures, peinture);
    this.inserer(layer.liaisons, { champ, indice, porteur: layer.id, variable: variableLue(variable) });
    this.zones.push({ variant, layer: layer.id, champ });
    return { layer: layer.id, champ };
  }
}

/** La variable telle qu'une liaison la porte. La clé `k00012` donne l'identifiant Figma du générateur ; `kz` les variables créées ici. */
export function variableLue(variable: VariableDuCatalogue): LiaisonLue['variable'] {
  const rang = /^k(z?)0*(\d+)$/.exec(variable.cle);
  const numero = rang ? Number(rang[2]) + (rang[1] ? 100000 : 0) : 0;
  return { id: `VariableID:${numero}:0`, cle: variable.cle, nom: variable.nom, collection: variable.collection, distante: false };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Registre des cas

export interface ResultatDeCas {
  readonly description: string;
  readonly attendus: readonly ConstatAttendu[];
  readonly verdict?: Verdict;
  readonly question?: string;
}

/** Numérote les cas `<opérateur>-<n>` et tire les variants de chaque cas avec la sous-graine de son identifiant. */
export class Registre {
  readonly cas: CasDeComposant[] = [];
  private readonly compteurs = new Map<string, number>();

  constructor(readonly base: ComposantDeBase, readonly graine: number = GRAINE_PAR_DEFAUT, readonly famille = 'F3') {}

  prochain(operateur: string): string {
    return `${operateur}-${(this.compteurs.get(operateur) ?? 0) + 1}`;
  }

  /** Un élément de la liste, tiré par l'identifiant du prochain cas de l'opérateur : l'ordre des opérateurs n'y change rien. */
  tirer<T>(operateur: string, liste: readonly T[]): T {
    return choisir(mulberry32(graineDe(this.graine, this.prochain(operateur))), liste);
  }

  ajouter(operateur: string, degradation: Degradation, resultat: ResultatDeCas): void {
    const id = this.prochain(operateur);
    this.compteurs.set(operateur, (this.compteurs.get(operateur) ?? 0) + 1);
    const { description, attendus, verdict = 'attendu', question } = resultat;
    this.cas.push({
      id, famille: this.famille, operateur, verdict, ...(question ? { question } : {}),
      entree: { composant: degradation.composant, base: degradation.base, annuler: () => degradation.annuler(), zones: degradation.zones, description },
      attendus, codesJuges: CODES_JUGES,
    });
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Clés de rattachement

/**
 * Chaque code publie ses faits à sa façon : C19 et C20 n'ont pas de champ, et seuls C16, C22 et C24 ont la plage de texte. La clé
 * d'un constat reprend donc ce que son code publie ; `cleAttendue` fait de même pour l'oracle.
 */
const CODES_A_PLAGE: readonly string[] = ['C15', 'C16', 'C17', 'C22', 'C24'];
const CODES_SANS_CHAMP: readonly string[] = ['C19', 'C20'];

export interface LieuDeConstat { readonly variant: string; readonly layer: string; readonly champ: string; readonly plageDebut?: number; readonly token: string }

export function cleAttendue(code: string, lieu: LieuDeConstat): string {
  return [
    lieu.variant, lieu.layer, CODES_SANS_CHAMP.includes(code) ? '' : lieu.champ,
    CODES_A_PLAGE.includes(code) ? (lieu.plageDebut ?? '') : '', lieu.token,
  ].join('|');
}

/** La clé que `comparer` calcule pour un constat émis. */
export function cleDeConstat(constat: Constat): string {
  return [constat.variants[0] ?? '', constat.layers[0] ?? '', constat.faits.champ ?? '', constat.faits.plageDebut ?? '', constat.faits.token ?? constat.faits.variable ?? ''].join('|');
}

export function lieuDe(attendue: LiaisonAttendue, token: string): LieuDeConstat {
  return { variant: attendue.variant, layer: attendue.layer, champ: attendue.champ, ...(attendue.plage ? { plageDebut: attendue.plage.debut } : {}), token };
}

export function attendu(
  code: ConstatAttendu['code'], forme: ConstatAttendu['forme'], lieu: LieuDeConstat,
  plus: { apres?: { cle: string; nom: string }; candidats?: readonly string[] } = {},
): ConstatAttendu {
  return { code, cle: cleAttendue(code, lieu), forme, ...(plus.apres ? { apres: plus.apres } : {}), ...(plus.candidats ? { candidats: plus.candidats } : {}) };
}

const cleLisible = (liaison: LiaisonAttendue): string => `${liaison.variant}/${liaison.layer}/${liaison.champ}`;

// ---------------------------------------------------------------------------------------------------------------------------
// Cibles de liaison

export type SorteDeCible = 'cadre' | 'forme' | 'texte' | 'trait';
export type NomDeCible = 'fond' | 'trait' | 'texte' | 'texte-2' | 'icone' | 'glyph' | 'anneau';

interface DescriptionDeCible {
  readonly layer: NomDeLayer;
  readonly champ: 'fills' | 'strokes';
  readonly role: RoleDeCouleur;
  readonly sorte: SorteDeCible;
  /** Rang de la plage de texte parmi celles de `Label`. */
  readonly plage?: number;
  readonly surcharge?: true;
}

/** Les liaisons de couleur du composant de base, avec le rôle que la table de l'inventaire 4.2 leur attend. */
export const CIBLES: Readonly<Record<NomDeCible, DescriptionDeCible>> = {
  fond: { layer: 'Root', champ: 'fills', role: 'background', sorte: 'cadre' },
  trait: { layer: 'Root', champ: 'strokes', role: 'border', sorte: 'trait' },
  texte: { layer: 'Label', champ: 'fills', role: 'foreground', sorte: 'texte', plage: 0 },
  'texte-2': { layer: 'Label', champ: 'fills', role: 'text', sorte: 'texte', plage: 1 },
  icone: { layer: 'Icon', champ: 'fills', role: 'icon', sorte: 'forme' },
  glyph: { layer: 'Glyph', champ: 'fills', role: 'icon', sorte: 'forme', surcharge: true },
  anneau: { layer: 'Ring', champ: 'strokes', role: 'ring', sorte: 'trait' },
};

/** La liaison de la base à cet endroit, ou `undefined` : `Glyph` et la seconde plage n'existent pas dans tous les profils. */
export function liaisonDeCible(carte: CarteDuComposant, variant: string, cible: NomDeCible): LiaisonAttendue | undefined {
  const description = CIBLES[cible];
  const memes = carte.liaisons
    .filter((liaison) => liaison.variant === variant && liaison.nomDuLayer === description.layer && liaison.champ === description.champ
      && (description.surcharge ? liaison.surcharge !== undefined : liaison.surcharge === undefined))
    .sort((a, b) => (a.plage?.debut ?? 0) - (b.plage?.debut ?? 0));
  return memes[description.plage ?? 0];
}

/**
 * La règle de scope du plan (K4) : un fond de cadre prend `FRAME_FILL`, un fond de forme `SHAPE_FILL`, un texte `TEXT_FILL`, un
 * trait `STROKE_COLOR` ; `ALL_FILLS` couvre les trois premiers, `ALL_SCOPES` tout ; sans scope, rien n'est jugé.
 */
export function porteeAdmise(scopes: readonly string[] | undefined, sorte: SorteDeCible): boolean {
  if (!scopes || scopes.length === 0 || scopes.includes('ALL_SCOPES')) return true;
  const admis = { cadre: ['FRAME_FILL', 'ALL_FILLS'], forme: ['SHAPE_FILL', 'ALL_FILLS'], texte: ['TEXT_FILL', 'ALL_FILLS'], trait: ['STROKE_COLOR'] }[sorte];
  return scopes.some((scope) => admis.includes(scope));
}

/** Un C18 si les scopes de la variable ne conviennent pas à la cible : une dégradation qui change de token change aussi de scope. */
export function attendusDePortee(attendue: LiaisonAttendue, sorte: SorteDeCible, variable: VariableDuCatalogue): ConstatAttendu[] {
  return porteeAdmise(variable.scopes, sorte) ? [] : [attendu('C18', 'a-faire', lieuDe(attendue, variable.nom))];
}

// ---------------------------------------------------------------------------------------------------------------------------
// Axes et jetons de la carte

/** L'axe dont le segment tombe à ce rang dans les noms de tokens. */
export function axeDeSegment(carte: CarteDuComposant, role: 'palette' | 'style' | 'taille' | 'etat'): AxeDeCarte | undefined {
  return carte.axes.find((axe) => axe.segment === role);
}

/** Un axe que le kit ne reconnaît pas (`Type`, `Tone`) rend le cas `mesure` tant que la liste de Q-08 n'existe pas. */
export function verdictDesAxes(axes: readonly (AxeDeCarte | undefined)[]): { verdict: Verdict; question?: string } {
  return axes.some((axe) => axe && axe.axe === null) ? { verdict: 'mesure', question: 'Q-08' } : { verdict: 'attendu' };
}

export function valeurDEtat(axe: AxeDeCarte, etat: 'default' | 'hover' | 'disabled'): string | undefined {
  return axe.valeurs.find((valeur) => etatReconnu(valeur) === etat);
}

export function variantsOu(carte: CarteDuComposant, predicat: (variant: VariantDeCarte) => boolean): VariantDeCarte[] {
  return carte.variants.filter(predicat);
}

/** Les valeurs d'axe d'un variant telles que les noms de tokens les portent, puis les remplacements. */
function valeursDesNoms(carte: CarteDuComposant, variant: VariantDeCarte, remplacements: Readonly<Record<string, string>>): Record<string, string> {
  const valeurs: Record<string, string> = {};
  for (const axe of carte.axes) if (axe.segment !== null && variant.valeurs[axe.propriete] !== undefined) valeurs[axe.propriete] = variant.valeurs[axe.propriete];
  return { ...valeurs, ...remplacements };
}

/** Le token de couleur d'un rôle pour ce variant, ou pour ce variant avec d'autres valeurs d'axe ; `undefined` si le jeu n'a pas cette combinaison. */
export function jetonCouleur(carte: CarteDuComposant, variant: VariantDeCarte, role: RoleDeCouleur, remplacements: Readonly<Record<string, string>> = {}): JetonDeCarte | undefined {
  return jetonDe(carte, { role }, valeursDesNoms(carte, variant, remplacements));
}

export function jetonTaille(carte: CarteDuComposant, variant: VariantDeCarte, propriete: ProprieteDeTaille, remplacements: Readonly<Record<string, string>> = {}): JetonDeCarte | undefined {
  const axe = axeDeSegment(carte, 'taille');
  const valeurs = axe ? { [axe.propriete]: remplacements[axe.propriete] ?? variant.valeurs[axe.propriete] } : {};
  return jetonDe(carte, { propriete }, valeurs);
}

/** Le rang du segment d'un axe dans le nom d'un token de couleur : le jeu, `color`, puis les axes dans l'ordre palette, style, taille, état. */
export function rangDuSegment(carte: CarteDuComposant, role: 'palette' | 'style' | 'taille' | 'etat'): number {
  const presents = (['palette', 'style', 'taille', 'etat'] as const).filter((entree) => axeDeSegment(carte, entree));
  return 2 + presents.indexOf(role);
}

// ---------------------------------------------------------------------------------------------------------------------------
// Opérateurs L

/** Les quatre liaisons de couleur que L1 à L5 dégradent : fond et trait de `Root`, texte de `Label`, icône de `Icon`. */
const LIAISONS_D_AXE: readonly NomDeCible[] = ['fond', 'trait', 'texte', 'icone'];

type EtatDeTransition = 'default' | 'hover' | 'disabled';
/** Dans l'ordre du plan : [état du variant, état du token]. */
const TRANSITIONS: readonly (readonly [EtatDeTransition, EtatDeTransition])[] = [
  ['hover', 'default'], ['default', 'hover'], ['default', 'disabled'], ['disabled', 'default'],
];

/**
 * L1 à L5 sur le composant de base. Un axe absent du jeu, ou à trop peu de valeurs, retire les cas qui le demandent : sur P0,
 * les nombres sont ceux du plan (20, 16, 8, 10, 6).
 */
export function operateursAxes(base: ComposantDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeComposant[] {
  const registre = new Registre(base, graine);
  const carte = base.carte;
  const etat = axeDeSegment(carte, 'etat');
  const palette = axeDeSegment(carte, 'palette');
  const style = axeDeSegment(carte, 'style');
  const taille = axeDeSegment(carte, 'taille');

  const variantsDe = (axe: AxeDeCarte, valeur: string) => variantsOu(carte, (variant) => variant.valeurs[axe.propriete] === valeur);

  /** Lie `cible` du variant au token que `remplacements` désigne, et attend ce que `attendre` décrit. */
  const lierAUnAutreToken = (
    operateur: string, variant: VariantDeCarte, cible: NomDeCible, remplacements: Readonly<Record<string, string>>, axe: AxeDeCarte,
    attendre: (lieu: LieuDeConstat, juste: { cle: string; nom: string }) => ConstatAttendu[],
    options: { ensuite?: (degradation: Degradation, juste: { cle: string; nom: string }) => void; mesure?: string } = {},
  ): void => {
    const deBase = liaisonDeCible(carte, variant.id, cible);
    const mauvais = jetonCouleur(carte, variant, CIBLES[cible].role, remplacements);
    if (!deBase || !mauvais) return;
    const juste = { cle: deBase.cle, nom: deBase.nom };
    const degradation = new Degradation(base);
    degradation.lierA(deBase, degradation.variable(mauvais.cle));
    options.ensuite?.(degradation, juste);
    registre.ajouter(operateur, degradation, {
      description: `${operateur} : ${CIBLES[cible].layer} (${cible}) du variant ${variant.nom} lié à ${mauvais.nom}`,
      attendus: attendre(lieuDe(deBase, mauvais.nom), juste),
      ...(options.mesure ? { verdict: 'mesure' as const, question: options.mesure } : verdictDesAxes([axe])),
    });
  };

  const unAutreSegment = (operateur: string, axe: AxeDeCarte, lu: string, sur: string, cible: NomDeCible, apres: 'correction' | 'absent' | 'double' = 'correction'): void => {
    // Un jeu qui exclut des combinaisons (alert-11) n'a pas toujours le token de cette valeur pour ce variant : on tire parmi ceux qui l'ont.
    const candidats = variantsDe(axe, sur).filter((variant) => jetonCouleur(carte, variant, CIBLES[cible].role, { [axe.propriete]: lu }));
    if (candidats.length === 0) return;
    const variant = registre.tirer(operateur, candidats);
    lierAUnAutreToken(operateur, variant, cible, { [axe.propriete]: lu }, axe, (lieu, juste) => [
      apres === 'correction' ? attendu('C22', 'correction', lieu, { apres: juste })
        : attendu('C22', 'question', lieu, { candidats: apres === 'absent' ? [] : [juste.nom, juste.nom] }),
    ], {
      // La bonne palette manque au catalogue, ou y figure deux fois sous le même nom.
      ensuite: (degradation, juste) => {
        if (apres === 'absent') degradation.retirer(degradation.catalogue.variables, degradation.variable(juste.cle));
        if (apres === 'double') degradation.cloner(degradation.variable(juste.cle));
      },
    });
  };

  // L1. Token d'un autre état : 4 transitions × 4 liaisons (16), puis la seconde plage de texte et la surcharge de Glyph, deux transitions chacune (4).
  if (etat) {
    const valeurs = { default: valeurDEtat(etat, 'default'), hover: valeurDEtat(etat, 'hover'), disabled: valeurDEtat(etat, 'disabled') };
    const transition = (duVariant: EtatDeTransition, duToken: EtatDeTransition, cible: NomDeCible): void => {
      const valeurDuVariant = valeurs[duVariant];
      const valeurDuToken = valeurs[duToken];
      if (valeurDuVariant === undefined || valeurDuToken === undefined) return;
      const candidats = variantsDe(etat, valeurDuVariant).filter((variant) => jetonCouleur(carte, variant, CIBLES[cible].role, { [etat.propriete]: valeurDuToken }));
      if (candidats.length === 0) return;
      const variant = registre.tirer('L1', candidats);
      // Un hover lié au token default est une question, qui porte l'indice des autres variants hover ; les autres sont des corrections.
      const question = duVariant === 'hover' && duToken === 'default';
      lierAUnAutreToken('L1', variant, cible, { [etat.propriete]: valeurDuToken }, etat, (lieu, juste) => [
        question ? attendu('C16', 'question', lieu, { candidats: [juste.nom] }) : attendu('C16', 'correction', lieu, { apres: juste }),
      ]);
    };
    for (const [duVariant, duToken] of TRANSITIONS) for (const cible of LIAISONS_D_AXE) transition(duVariant, duToken, cible);
    for (const cible of ['texte-2', 'glyph'] as const) for (const [duVariant, duToken] of TRANSITIONS.slice(0, 2)) transition(duVariant, duToken, cible);
  }

  // L2. Token d'une autre palette : trois permutations × 4 liaisons (12), puis la bonne palette absente (2) ou en double (2).
  // « primary lu sur danger » : le token de primary est lié sur un variant danger.
  if (palette && palette.valeurs.length >= 3) {
    const n = palette.valeurs.length;
    const permutations = ([[0, n - 1], [n - 1, n - 2], [n - 2, 0]] as const).map(([lu, sur]) => [palette.valeurs[lu], palette.valeurs[sur]] as const);
    for (const [lu, sur] of permutations) for (const cible of LIAISONS_D_AXE) unAutreSegment('L2', palette, lu, sur, cible);
    const [lu, sur] = permutations[0];
    for (const cible of ['fond', 'icone'] as const) unAutreSegment('L2', palette, lu, sur, cible, 'absent');
    for (const cible of ['fond', 'texte'] as const) unAutreSegment('L2', palette, lu, sur, cible, 'double');
  }

  // L3. Token d'un autre style : solid lu sur outline, outline lu sur solid, sur 4 liaisons (8).
  if (style && style.valeurs.length >= 2) {
    for (const [lu, sur] of [[style.valeurs[0], style.valeurs[1]], [style.valeurs[1], style.valeurs[0]]] as const) {
      for (const cible of LIAISONS_D_AXE) unAutreSegment('L3', style, lu, sur, cible);
    }
  }

  // L4. Token d'une autre taille sur les cinq propriétés de Root (10).
  if (taille && taille.valeurs.length >= 2) {
    const champs: readonly (readonly [ProprieteDeTaille, string])[] = [
      ['padding-x', 'paddingLeft'], ['padding-y', 'paddingTop'], ['gap', 'itemSpacing'], ['radius', 'cornerRadius'], ['border-width', 'strokeWeight'],
    ];
    for (const [lu, sur] of [[taille.valeurs[0], taille.valeurs[1]], [taille.valeurs[1], taille.valeurs[0]]] as const) {
      for (const [propriete, champ] of champs) {
        const candidats = variantsDe(taille, sur).filter((variant) => jetonTaille(carte, variant, propriete, { [taille.propriete]: lu }));
        if (candidats.length === 0) continue;
        const variant = registre.tirer('L4', candidats);
        const juste = carte.liaisons.find((liaison) => liaison.variant === variant.id && liaison.nomDuLayer === 'Root' && liaison.champ === champ);
        const mauvais = jetonTaille(carte, variant, propriete, { [taille.propriete]: lu });
        if (!juste || !mauvais) continue;
        const degradation = new Degradation(base);
        degradation.lierA(juste, degradation.variable(mauvais.cle));
        registre.ajouter('L4', degradation, {
          description: `L4 : ${champ} du variant ${variant.nom} lié à ${mauvais.nom}`,
          attendus: [attendu('C22', 'correction', lieuDe(juste, mauvais.nom), { apres: { cle: juste.cle, nom: juste.nom } })],
          ...verdictDesAxes([taille]),
        });
      }
    }
  }

  // L5. Palette et état faux ensemble sur le fond et le texte (Q-F3-12), puis quatre liaisons que le kit ne juge pas.
  if (palette && etat && palette.valeurs.length >= 2) {
    const defaut = valeurDEtat(etat, 'default');
    const survol = valeurDEtat(etat, 'hover');
    if (defaut !== undefined && survol !== undefined) {
      for (const cible of ['fond', 'texte'] as const) {
        const candidats = variantsOu(carte, (variant) => variant.valeurs[palette.propriete] === palette.valeurs[0] && variant.valeurs[etat.propriete] === defaut
          && jetonCouleur(carte, variant, CIBLES[cible].role, { [palette.propriete]: palette.valeurs[1], [etat.propriete]: survol }) !== undefined);
        if (candidats.length === 0) continue;
        const variant = registre.tirer('L5', candidats);
        // Q-F3-12 : une seule carte, au code du premier segment faux dans l'ordre des noms (palette avant état), vers le token qui change les deux.
        lierAUnAutreToken('L5', variant, cible, { [palette.propriete]: palette.valeurs[1], [etat.propriete]: survol }, palette,
          (lieu, juste) => [attendu('C22', 'correction', lieu, { apres: juste })], { mesure: 'Q-F3-12' });
      }
    }
  }

  /** Lie la cible à un clone du token juste dont le nom change ; le kit ne lit alors aucun écart d'axe. */
  const lierAUnNomRetouche = (variant: VariantDeCarte, cible: NomDeCible, retouche: (segments: string[]) => string[], axe: AxeDeCarte): void => {
    const deBase = liaisonDeCible(carte, variant.id, cible);
    const jeton = jetonCouleur(carte, variant, CIBLES[cible].role);
    if (!deBase || !jeton) return;
    const degradation = new Degradation(base);
    const clone = degradation.cloner(degradation.variable(jeton.cle), { nom: retouche(jeton.nom.split('/')).join('/') });
    degradation.lierA(deBase, clone);
    registre.ajouter('L5', degradation, {
      description: `L5 : ${CIBLES[cible].layer} (${cible}) du variant ${variant.nom} lié à ${clone.nom}`,
      attendus: [], ...verdictDesAxes([axe]),
    });
  };
  const toutes = carte.variants;
  if (style) lierAUnNomRetouche(registre.tirer('L5', toutes), 'fond', (segments) => segments.map((s, rang) => (rang === rangDuSegment(carte, 'style') ? 'Ghost' : s)), style);
  if (palette) lierAUnNomRetouche(registre.tirer('L5', toutes), 'fond', (segments) => segments.map((s, rang) => (rang === rangDuSegment(carte, 'palette') ? 'Ghost' : s)), palette);
  if (etat) {
    const rang = rangDuSegment(carte, 'etat');
    lierAUnNomRetouche(registre.tirer('L5', toutes), 'fond', (segments) => segments.filter((_, i) => i !== rang), etat);
    lierAUnNomRetouche(registre.tirer('L5', toutes), 'icone', (segments) => segments.filter((_, i) => i !== rang), etat);
  }

  return registre.cas;
}
