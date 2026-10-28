/**
 * La section Variants de la vue Composant, sous l'aperçu, et la puce de valeur
 * que tous les écrans emploient pour montrer un variant. La section a une ligne
 * par property de Figma ; une puce par valeur qui porte un constat, plus la
 * valeur choisie ; les autres valeurs se replient sous « +N ». Une puce choisit
 * le variant affiché.
 *
 * Les properties et leurs valeurs se lisent dans le nom des variants
 * (`Severity=info, Variant=standard`), dans l'ordre où le jeu les range. Le
 * nombre d'une puce compte les constats dont un variant porte la valeur, et son
 * type est celui du plus grave.
 *
 * Ailleurs qu'en section, un variant se montre par ses valeurs seules, la paire
 * exacte de Figma en `title`. La property reste dans la puce quand une autre
 * property du jeu porte la même valeur : `Default` de `State` et de `Size`.
 */
import { creerIcone, poserTon } from 'ucm-plugin-socle/src/ui/Alerte';
import type { TypeDAlerte } from '@ucm-kit/core/referentiel';

import type { Constat } from '../../messages/commun';
import { TEXTES } from '../textes';
import { tonLePlusGrave } from './analyse';

const T = TEXTES.variants;

export interface VariantDuJeu {
  readonly id: string;
  readonly nom: string;
}

export interface ValeurDePropriete {
  readonly valeur: string;
  readonly nombre: number;
  readonly ton: TypeDAlerte | null;
}

export interface ProprieteDeVariants {
  readonly nom: string;
  readonly valeurs: readonly ValeurDePropriete[];
}

/** Les paires d'un nom de variant, dans l'ordre ; vide quand le nom n'a pas la forme `Propriété=valeur`. */
export function pairesDuNom(nom: string): Array<[string, string]> {
  const paires: Array<[string, string]> = [];
  for (const morceau of nom.split(',')) {
    const egal = morceau.indexOf('=');
    if (egal <= 0) return [];
    paires.push([morceau.slice(0, egal).trim(), morceau.slice(egal + 1).trim()]);
  }
  return paires;
}

/** Les properties du jeu, leurs valeurs dans l'ordre du premier variant qui les porte, et le constat le plus grave de chacune. */
export function proprietesDe(variants: readonly VariantDuJeu[], constats: readonly Constat[]): ProprieteDeVariants[] {
  const valeursParPropriete = new Map<string, string[]>();
  const valeursDuVariant = new Map<string, Map<string, string>>();
  for (const variant of variants) {
    const paires = pairesDuNom(variant.nom);
    // Le kit porte les variants d'un constat par identifiant ; les noms restent admis.
    valeursDuVariant.set(variant.id, new Map(paires));
    valeursDuVariant.set(variant.nom, new Map(paires));
    for (const [nom, valeur] of paires) {
      const valeurs = valeursParPropriete.get(nom) ?? [];
      if (!valeurs.includes(valeur)) valeurs.push(valeur);
      valeursParPropriete.set(nom, valeurs);
    }
  }
  return [...valeursParPropriete].map(([nom, valeurs]) => ({
    nom,
    valeurs: valeurs.map((valeur) => {
      const touches = constats.filter((constat) => constat.variants.some((variant) => valeursDuVariant.get(variant)?.get(nom) === valeur));
      return { valeur, nombre: touches.length, ton: tonLePlusGrave(touches) };
    }),
  }));
}

/**
 * Le variant qu'une puce choisit : celui qui porte la valeur et garde le plus
 * de valeurs du variant affiché ; le premier du jeu à égalité. `null` quand
 * aucun variant ne porte la valeur.
 */
export function variantApresLeChoix(variants: readonly VariantDuJeu[], affiche: string | undefined, propriete: string, valeur: string): VariantDuJeu | null {
  const actuel = new Map(affiche === undefined ? [] : pairesDuNom(affiche));
  let meilleur: VariantDuJeu | null = null;
  let score = -1;
  for (const variant of variants) {
    const paires = pairesDuNom(variant.nom);
    if (!paires.some(([nom, candidate]) => nom === propriete && candidate === valeur)) continue;
    const gardees = paires.filter(([nom, candidate]) => nom !== propriete && actuel.get(nom) === candidate).length;
    if (gardees > score) {
      meilleur = variant;
      score = gardees;
    }
  }
  return meilleur;
}

/** Une paire de Figma : la property, puis sa valeur. */
export type PaireDeVariant = readonly [string, string];

/** Un morceau d'une ligne de lieu : du texte, ou les puces de ces paires. */
export type MorceauDeLieu = string | { readonly puces: readonly PaireDeVariant[] };

/** La paire écrite comme Figma la nomme, pour la chercher dans Figma. */
export const paireDeFigma = (propriete: string, valeur: string): string => `${propriete}=${valeur}`;

const partagees = new WeakMap<readonly VariantDuJeu[], ReadonlySet<string>>();

/** Les valeurs que portent au moins deux properties du jeu : seule la valeur ne dirait plus de quelle property il s'agit. */
function valeursPartagees(jeu: readonly VariantDuJeu[]): ReadonlySet<string> {
  const connues = partagees.get(jeu);
  if (connues) return connues;
  const proprietesParValeur = new Map<string, Set<string>>();
  for (const variant of jeu) {
    for (const [propriete, valeur] of pairesDuNom(variant.nom)) proprietesParValeur.set(valeur, (proprietesParValeur.get(valeur) ?? new Set()).add(propriete));
  }
  const resultat = new Set([...proprietesParValeur].filter(([, proprietes]) => proprietes.size > 1).map(([valeur]) => valeur));
  partagees.set(jeu, resultat);
  return resultat;
}

/**
 * La puce d'une paire hors de la section : la valeur seule, la paire exacte de Figma en `title`. La property s'y ajoute, en gris, quand
 * une autre property du jeu porte la même valeur. C'est la seule façon dont un écran montre une paire de variant.
 */
export function creerPuceDeValeur(propriete: string, valeur: string, jeu: readonly VariantDuJeu[]): HTMLElement {
  const puce = document.createElement('span');
  puce.className = 'puce-valeur';
  puce.title = paireDeFigma(propriete, valeur);
  if (valeursPartagees(jeu).has(valeur)) {
    const nom = document.createElement('span');
    nom.className = 'puce-propriete';
    nom.textContent = `${propriete}=`;
    puce.append(nom);
  }
  puce.append(valeur);
  return puce;
}

/** Les puces de ces paires, côte à côte. */
export function creerPuces(paires: readonly PaireDeVariant[], jeu: readonly VariantDuJeu[]): HTMLElement {
  const groupe = document.createElement('span');
  groupe.className = 'puces';
  groupe.append(...paires.map(([propriete, valeur]) => creerPuceDeValeur(propriete, valeur, jeu)));
  return groupe;
}

/** Les paires que tous ces variants partagent, dans l'ordre du premier. */
export function pairesCommunes(noms: readonly string[]): PaireDeVariant[] {
  const listes = noms.map((nom) => pairesDuNom(nom));
  if (listes.length === 0) return [];
  return listes[0].filter(([propriete, valeur]) => listes.every((liste) => liste.some(([autre, contenu]) => autre === propriete && contenu === valeur)));
}

/** Le lieu de ces variants : leur nombre, puis les puces des seules paires qu'ils partagent ; « Tous les variants » quand le constat n'en nomme aucun. */
export function lieuDesVariants(noms: readonly string[]): MorceauDeLieu[] {
  if (noms.length === 0) return [T.tous];
  const communes = pairesCommunes(noms);
  return communes.length === 0 ? [T.nombre(noms.length)] : [T.nombre(noms.length), { puces: communes }];
}

export interface OptionsDeLaSection {
  readonly variants: readonly VariantDuJeu[];
  readonly constats: readonly Constat[];
  /** Le nom du variant que la vue lit. */
  readonly affiche: string | undefined;
  /** Le nom du variant demandé quand sa lecture court : les puces le marquent choisi, et le prochain choix part de lui. Absent, c'est `affiche`. */
  readonly choisi?: string;
  /** Les properties dont les valeurs sont toutes montrées. */
  readonly depliees: ReadonlySet<string>;
  readonly choisir: (variant: VariantDuJeu) => void;
  readonly deplier: (propriete: string) => void;
  /** Les variants qu'une analyse partielle n'a pas lus, par nom ou par identifiant : une valeur dont aucun variant n'a été lu porte « non lu ». */
  readonly nonLus?: ReadonlySet<string>;
}

function compte(ton: TypeDAlerte | null, nombre: number): HTMLElement | null {
  if (ton === null) return null;
  const element = document.createElement('span');
  element.className = 'n';
  poserTon(element, ton);
  element.append(creerIcone(ton), String(nombre));
  return element;
}

function ligneDeProperty(propriete: ProprieteDeVariants, options: OptionsDeLaSection, choisie: string | undefined): HTMLElement {
  const axe = document.createElement('div');
  axe.className = 'axe';
  const nom = document.createElement('span');
  nom.className = 'axe-nom';
  nom.textContent = propriete.nom;
  const valeurs = document.createElement('span');
  valeurs.className = 'axe-valeurs';
  const toutes = options.depliees.has(propriete.nom);
  const montrees = propriete.valeurs.filter((valeur) => toutes || valeur.ton !== null || valeur.valeur === choisie);
  for (const valeur of montrees) {
    const puce = document.createElement('button');
    puce.type = 'button';
    puce.className = 'valeur-axe';
    if (valeur.valeur === choisie) puce.classList.add('choisie');
    puce.dataset.propriete = propriete.nom;
    puce.dataset.valeur = valeur.valeur;
    puce.title = paireDeFigma(propriete.nom, valeur.valeur);
    puce.setAttribute('aria-pressed', String(valeur.valeur === choisie));
    puce.append(valeur.valeur);
    const nombre = compte(valeur.ton, valeur.nombre);
    if (nombre) puce.append(nombre);
    // Une valeur est « non lu » quand aucun des variants qui la portent n'a été lu.
    const porteurs = options.variants.filter((variant) => pairesDuNom(variant.nom).some(([cle, contenu]) => cle === propriete.nom && contenu === valeur.valeur));
    if (porteurs.length > 0 && porteurs.every((variant) => options.nonLus?.has(variant.nom) || options.nonLus?.has(variant.id))) {
      puce.classList.add('non-lu');
      const mention = document.createElement('span');
      mention.className = 'non-lu-texte';
      mention.textContent = T.nonLu;
      puce.append(mention);
    }
    puce.addEventListener('click', () => {
      const variant = variantApresLeChoix(options.variants, options.choisi ?? options.affiche, propriete.nom, valeur.valeur);
      if (variant) options.choisir(variant);
    });
    valeurs.append(puce);
  }
  const cachees = propriete.valeurs.length - montrees.length;
  if (cachees > 0) {
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'valeur-axe plus';
    plus.dataset.propriete = propriete.nom;
    plus.textContent = T.autres(cachees);
    plus.addEventListener('click', () => options.deplier(propriete.nom));
    valeurs.append(plus);
  }
  axe.append(nom, valeurs);
  return axe;
}

/** La section, ou `null` quand le jeu n'a qu'un variant ou que ses noms n'ont pas la forme `Propriété=valeur`. */
export function creerSectionVariants(options: OptionsDeLaSection): HTMLElement | null {
  const proprietes = proprietesDe(options.variants, options.constats);
  if (options.variants.length < 2 || proprietes.length === 0) return null;
  const choisi = options.choisi ?? options.affiche;
  const choisies = new Map(choisi === undefined ? [] : pairesDuNom(choisi));

  const section = document.createElement('section');
  section.className = 'variants';

  const tete = document.createElement('div');
  tete.className = 'variants-tete';
  const titre = document.createElement('h3');
  const total = document.createElement('span');
  total.className = 'meta';
  total.textContent = String(options.variants.length);
  titre.append(T.titre, total);
  tete.append(titre);

  const corps = document.createElement('div');
  corps.className = 'variants-corps';
  const axes = document.createElement('div');
  axes.className = 'axes';
  axes.append(...proprietes.map((propriete) => ligneDeProperty(propriete, options, choisies.get(propriete.nom))));
  corps.append(axes);

  section.append(tete, corps);
  return section;
}
