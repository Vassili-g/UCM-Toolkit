/**
 * La section Variants de la vue Composant, sous l'aperçu. Une ligne par
 * property de Figma ; une puce par valeur qui porte un constat, plus la valeur
 * affichée ; les autres valeurs se replient sous « +N ». Une puce choisit le
 * variant affiché. Le lien Tableau croise deux properties.
 *
 * Les properties et leurs valeurs se lisent dans le nom des variants
 * (`Severity=info, Variant=standard`), dans l'ordre où le jeu les range. Le
 * nombre d'une puce compte les constats dont un variant porte la valeur, et son
 * type est celui du plus grave.
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

/** Le variant qui porte deux valeurs et garde les autres du variant affiché, `null` s'il n'existe pas. */
function variantDeLaCellule(variants: readonly VariantDuJeu[], affiche: string | undefined, croisement: ReadonlyArray<[string, string]>): VariantDuJeu | null {
  const voulu = new Map(affiche === undefined ? [] : pairesDuNom(affiche));
  for (const [nom, valeur] of croisement) voulu.set(nom, valeur);
  return variants.find((variant) => {
    const paires = pairesDuNom(variant.nom);
    return paires.length === voulu.size && paires.every(([nom, valeur]) => voulu.get(nom) === valeur);
  }) ?? null;
}

export interface OptionsDeLaSection {
  readonly variants: readonly VariantDuJeu[];
  readonly constats: readonly Constat[];
  /** Le nom du variant que la vue lit. */
  readonly affiche: string | undefined;
  /** Le nom du variant demandé quand sa lecture court : les puces et les cellules le marquent choisi, et le prochain choix part de lui. Absent, c'est `affiche`. */
  readonly choisi?: string;
  /** Les properties dont les valeurs sont toutes montrées. */
  readonly depliees: ReadonlySet<string>;
  /** `null` quand le tableau est fermé ; sinon les deux properties croisées. */
  readonly tableau: { readonly lignes: string; readonly colonnes: string } | null;
  readonly choisir: (variant: VariantDuJeu) => void;
  readonly deplier: (propriete: string) => void;
  readonly basculerLeTableau: () => void;
  readonly croiser: (croisement: { lignes: string; colonnes: string }) => void;
  /** Le variant affiché sert de modèle : ses liaisons se proposent aux autres. Inactif quand l'analyse est périmée. */
  readonly copier: { readonly envoyer: () => void; readonly inactif: boolean };
  /** Les variants qu'une analyse partielle n'a pas lus, par nom ou par identifiant : une valeur dont aucun variant n'a été lu porte « non lu ». */
  readonly nonLus?: ReadonlySet<string>;
}

/** Un bouton à l'apparence du navigateur, comme la maquette le dessine. */
function bouton(texte: string, classe: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = classe;
  element.textContent = texte;
  return element;
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

function choixDePropriete(etiquette: string, proprietes: readonly ProprieteDeVariants[], courante: string, changer: (nom: string) => void): HTMLLabelElement {
  const libelle = document.createElement('label');
  libelle.className = 'tableau-choix';
  const texte = document.createElement('span');
  texte.textContent = etiquette;
  const select = document.createElement('select');
  for (const propriete of proprietes) {
    const option = document.createElement('option');
    option.value = propriete.nom;
    option.textContent = propriete.nom;
    option.selected = propriete.nom === courante;
    select.append(option);
  }
  select.addEventListener('change', () => changer(select.value));
  libelle.append(texte, select);
  return libelle;
}

/** Les constats qui nomment le variant, par son identifiant (le cas du kit) ou par son nom ; chacun une fois. */
export const constatsDuVariant = (variant: VariantDuJeu, constats: readonly Constat[]): Constat[] =>
  constats.filter((constat) => constat.variants.some((cite) => cite === variant.id || cite === variant.nom));

/** Une ligne par valeur de la première property, une colonne par valeur de la seconde ; une cellule choisit son variant. */
function tableauDe(proprietes: readonly ProprieteDeVariants[], croisement: { lignes: string; colonnes: string }, options: OptionsDeLaSection): HTMLElement {
  const lignes = proprietes.find((propriete) => propriete.nom === croisement.lignes);
  const colonnes = proprietes.find((propriete) => propriete.nom === croisement.colonnes);
  const bloc = document.createElement('div');
  bloc.className = 'tableau-variants';
  const choix = document.createElement('div');
  choix.className = 'tableau-choix-ligne';
  choix.append(
    choixDePropriete(T.lignes, proprietes, croisement.lignes, (nom) => options.croiser({ lignes: nom, colonnes: nom === croisement.colonnes ? croisement.lignes : croisement.colonnes })),
    choixDePropriete(T.colonnes, proprietes, croisement.colonnes, (nom) => options.croiser({ colonnes: nom, lignes: nom === croisement.lignes ? croisement.colonnes : croisement.lignes })),
  );
  bloc.append(choix);
  if (!lignes || !colonnes) return bloc;
  const grille = document.createElement('div');
  grille.className = 'tableau-grille';
  grille.style.gridTemplateColumns = `auto repeat(${colonnes.valeurs.length}, minmax(0, 1fr))`;
  grille.append(document.createElement('span'));
  for (const colonne of colonnes.valeurs) {
    const tete = document.createElement('span');
    tete.className = 'tableau-tete';
    tete.textContent = colonne.valeur;
    grille.append(tete);
  }
  for (const ligne of lignes.valeurs) {
    const tete = document.createElement('span');
    tete.className = 'tableau-tete';
    tete.textContent = ligne.valeur;
    grille.append(tete);
    for (const colonne of colonnes.valeurs) {
      const variant = variantDeLaCellule(options.variants, options.choisi ?? options.affiche, [[lignes.nom, ligne.valeur], [colonnes.nom, colonne.valeur]]);
      const cellule = document.createElement('button');
      cellule.type = 'button';
      cellule.className = 'tableau-cellule';
      if (variant && variant.nom === (options.choisi ?? options.affiche)) cellule.classList.add('choisie');
      cellule.disabled = variant === null;
      if (variant) {
        const touches = constatsDuVariant(variant, options.constats);
        const nombre = compte(tonLePlusGrave(touches), touches.length);
        if (nombre) cellule.append(nombre);
        cellule.addEventListener('click', () => options.choisir(variant));
      }
      grille.append(cellule);
    }
  }
  bloc.append(grille);
  return bloc;
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
  if (proprietes.length >= 2) {
    const tableau = bouton(T.tableau, 'variants-tableau');
    tableau.title = T.tableauAide;
    tableau.setAttribute('aria-pressed', String(options.tableau !== null));
    tableau.addEventListener('click', options.basculerLeTableau);
    tete.append(tableau);
  }

  const corps = document.createElement('div');
  corps.className = 'variants-corps';
  if (options.tableau && proprietes.length >= 2) corps.append(tableauDe(proprietes, options.tableau, options));
  else {
    const axes = document.createElement('div');
    axes.className = 'axes';
    axes.append(...proprietes.map((propriete) => ligneDeProperty(propriete, options, choisies.get(propriete.nom))));
    corps.append(axes);
  }

  const pied = document.createElement('div');
  pied.className = 'variants-pied';
  const affiche = document.createElement('span');
  affiche.className = 'variants-affiche';
  const etiquette = document.createElement('span');
  etiquette.className = 'meta';
  etiquette.textContent = T.affiche;
  const nom = document.createElement('span');
  nom.className = 'ch ch-inline ch-variant';
  nom.textContent = options.affiche ?? '';
  affiche.append(etiquette, nom);
  const copier = bouton(T.copier, 'variants-copier');
  copier.dataset.action = 'copier-les-liaisons';
  copier.disabled = options.copier.inactif;
  copier.addEventListener('click', options.copier.envoyer);
  pied.append(affiche, copier);

  section.append(tete, corps, pied);
  return section;
}
