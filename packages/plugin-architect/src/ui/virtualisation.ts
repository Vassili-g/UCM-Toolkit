/**
 * Deux listes virtualisées, où seules les lignes visibles, plus une marge,
 * existent dans le DOM.
 *
 * `creerListeVirtuelle` a une hauteur de ligne fixe : le conteneur garde la
 * hauteur de la liste entière, si bien que la barre de défilement et la
 * position restent justes. Une ligne hors de la portion rendue s'atteint par
 * `montrer(rang)`. L'arbre et la table la lisent, et elle ne change pas.
 *
 * `creerListeDeCartes` porte des cartes dépliables, de hauteur variable. Choix
 * (lot D6a) : virtualiser les cartes elles-mêmes plutôt que les sous-listes de
 * chacune, parce que la hauteur d'une carte dépend de son état et que les
 * sections ne connaissent pas encore la taille de leurs sous-listes. La liste
 * garde une clé par carte. Les cartes de la portion rendue restent dans le flux
 * et se mesurent ; une marge haute et une marge basse tiennent la place des
 * autres, estimée tant qu'une carte n'a pas été mesurée. Une carte qui sort
 * est retirée du DOM après que `sauver` a lu son état (déplié, menus ouverts,
 * réponses, cases) ; la liste le range sous la clé et le rend à `rendre`
 * quand la carte revient. Une carte qui garde le focus en sort aussi : la liste
 * retient son `data-focus` et le rend à la carte quand elle revient. Une carte
 * qui reste dans la portion n'est jamais recréée, donc garde son focus tel quel.
 * Le DOM reste borné par la portion visible, sans dépendre du nombre de cartes.
 *
 * `creerHoteDeCartes` (lot D6b) branche les sections du mode Tokens sur cette liste : voir sa description plus bas.
 */

export interface ListeVirtuelle {
  readonly element: HTMLDivElement;
  /** Remplace les lignes ; la position de défilement est gardée si `garder` est vrai. */
  poser(total: number, rendreLigne: (rang: number) => HTMLElement, garder?: boolean): void;
  /** Fait défiler jusqu'à la ligne et la rend. */
  montrer(rang: number): void;
  /** Rend de nouveau les lignes visibles, après un changement de contexte. */
  rafraichir(): void;
  /** Le nombre de lignes présentes dans le DOM, pour les tests. */
  rendues(): number;
}

/** La marge de lignes rendues au-dessus et au-dessous de la portion visible. */
const MARGE = 8;

/** `role` est celui du conteneur ; l'appelant pose sa propre classe sur `element`. */
export function creerListeVirtuelle(hauteurDeLigne: number, role: string, entete?: HTMLElement): ListeVirtuelle {
  const element = document.createElement('div');
  element.className = 'liste-virtuelle';
  element.setAttribute('role', role);
  const espace = document.createElement('div');
  espace.className = 'liste-espace';
  if (entete) element.append(entete);
  element.append(espace);
  let total = 0;
  let rendre: (rang: number) => HTMLElement = () => document.createElement('div');
  let debutRendu = -1;
  let finRendue = -1;
  let image: number | null = null;

  function dessiner(force = false): void {
    const hauteurVisible = element.clientHeight || hauteurDeLigne * 20;
    const haut = Math.max(0, element.scrollTop - espace.offsetTop);
    const debut = Math.max(0, Math.floor(haut / hauteurDeLigne) - MARGE);
    const fin = Math.min(total, Math.ceil((haut + hauteurVisible) / hauteurDeLigne) + MARGE);
    if (!force && debut === debutRendu && fin === finRendue) return;
    debutRendu = debut;
    finRendue = fin;
    const focus = document.activeElement instanceof HTMLElement && espace.contains(document.activeElement) ? document.activeElement.dataset.focus ?? null : null;
    const lignes: HTMLElement[] = [];
    for (let rang = debut; rang < fin; rang += 1) {
      const ligne = rendre(rang);
      ligne.style.transform = `translateY(${rang * hauteurDeLigne}px)`;
      ligne.style.height = `${hauteurDeLigne}px`;
      lignes.push(ligne);
    }
    espace.replaceChildren(...lignes);
    if (focus) espace.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focus)}"]`)?.focus({ preventScroll: true });
  }

  element.addEventListener('scroll', () => {
    if (image !== null) return;
    image = requestAnimationFrame(() => {
      image = null;
      dessiner();
    });
  });

  return {
    element,
    poser(nouveauTotal, rendreLigne, garder = false) {
      total = nouveauTotal;
      rendre = rendreLigne;
      espace.style.height = `${total * hauteurDeLigne}px`;
      if (!garder) element.scrollTop = 0;
      dessiner(true);
    },
    montrer(rang) {
      const haut = espace.offsetTop + rang * hauteurDeLigne;
      const visible = element.clientHeight || hauteurDeLigne * 20;
      if (haut < element.scrollTop + espace.offsetTop || haut + hauteurDeLigne > element.scrollTop + visible) element.scrollTop = Math.max(0, haut - visible / 2);
      dessiner(true);
    },
    rafraichir: () => dessiner(true),
    rendues: () => espace.childElementCount,
  };
}

export interface ListeDeCartes<Etat> {
  readonly element: HTMLDivElement;
  /**
   * Remplace les cartes, une clé par carte. `garder` conserve la position de défilement et l'état
   * des cartes dont la clé subsiste ; sans lui, la liste repart de zéro.
   */
  poser(cles: readonly string[], rendreCarte: (rang: number, etat: Etat | undefined) => HTMLElement, garder?: boolean): void;
  /** Fait défiler jusqu'à la carte et la rend. */
  montrer(rang: number): void;
  /** Rend de nouveau les cartes visibles, après un changement de contexte ou de hauteur. */
  rafraichir(): void;
  /** Le nombre de cartes présentes dans le DOM, pour les tests. */
  rendues(): number;
}

interface CarteRendue {
  readonly cle: string;
  readonly rang: number;
  readonly element: HTMLElement;
}

/**
 * `hauteurEstimee` sert tant qu'une carte n'a pas été mesurée. `sauver` lit l'état d'une carte qui
 * quitte le DOM ; il ne renvoie que des données, jamais d'élément.
 */
export function creerListeDeCartes<Etat>(hauteurEstimee: number, role: string, sauver: (carte: HTMLElement) => Etat): ListeDeCartes<Etat> {
  const element = document.createElement('div');
  element.className = 'liste-virtuelle';
  element.setAttribute('role', role);
  const espace = document.createElement('div');
  espace.className = 'liste-espace';
  element.append(espace);
  let cles: readonly string[] = [];
  let rendre: (rang: number, etat: Etat | undefined) => HTMLElement = () => document.createElement('div');
  let rendues: CarteRendue[] = [];
  const etats = new Map<string, Etat>();
  const hauteurs = new Map<string, number>();
  let focusARendre: { cle: string; focus: string | null } | null = null;
  let image: number | null = null;

  const hauteurDe = (cle: string): number => hauteurs.get(cle) ?? hauteurEstimee;
  const decalageDe = (rang: number): number => {
    let somme = 0;
    for (let i = 0; i < rang; i += 1) somme += hauteurDe(cles[i]);
    return somme;
  };
  const visible = (): number => element.clientHeight || hauteurEstimee * 20;

  function mesurer(): void {
    for (const carte of rendues) {
      const hauteur = carte.element.offsetHeight;
      if (hauteur > 0) hauteurs.set(carte.cle, hauteur);
    }
  }

  function ranger(carte: CarteRendue): void {
    etats.set(carte.cle, sauver(carte.element));
    const actif = document.activeElement as HTMLElement | null;
    if (actif && carte.element.contains(actif)) focusARendre = { cle: carte.cle, focus: actif.dataset?.focus ?? null };
  }

  function dessiner(force = false): void {
    mesurer();
    const haut = Math.max(0, element.scrollTop - espace.offsetTop);
    const bas = haut + visible();
    let debut = 0;
    let cumul = 0;
    while (debut < cles.length && cumul + hauteurDe(cles[debut]) <= haut) {
      cumul += hauteurDe(cles[debut]);
      debut += 1;
    }
    let fin = debut;
    while (fin < cles.length && cumul < bas) {
      cumul += hauteurDe(cles[fin]);
      fin += 1;
    }
    debut = Math.max(0, debut - MARGE);
    fin = Math.min(cles.length, fin + MARGE);
    const premier = rendues[0]?.rang ?? -1;
    const dernier = rendues.length ? rendues[rendues.length - 1].rang + 1 : -1;
    if (!force && debut === premier && fin === dernier) return;

    const actif = document.activeElement as HTMLElement | null;
    const gardees = new Map<string, CarteRendue>();
    for (const carte of rendues) {
      if (!force && carte.rang >= debut && carte.rang < fin) gardees.set(carte.cle, carte);
      else ranger(carte);
    }
    const suivantes: CarteRendue[] = [];
    for (let rang = debut; rang < fin; rang += 1) {
      const cle = cles[rang];
      const deja = gardees.get(cle);
      suivantes.push(deja ? { ...deja, rang } : { cle, rang, element: rendre(rang, etats.get(cle)) });
    }
    rendues = suivantes;
    if (suivantes.length !== gardees.size || suivantes.some((carte) => !gardees.has(carte.cle))) {
      espace.replaceChildren(...suivantes.map((carte) => carte.element));
      if (actif && espace.contains(actif)) actif.focus({ preventScroll: true });
    }
    const retour = focusARendre ? suivantes.find((carte) => carte.cle === focusARendre?.cle) : undefined;
    if (retour && focusARendre) {
      const cible = focusARendre.focus ? retour.element.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focusARendre.focus)}"]`) : null;
      (cible ?? retour.element).focus({ preventScroll: true });
      focusARendre = null;
    }
    mesurer();
    espace.style.paddingTop = `${decalageDe(debut)}px`;
    espace.style.paddingBottom = `${decalageDe(cles.length) - decalageDe(fin)}px`;
  }

  element.addEventListener('scroll', () => {
    if (image !== null) return;
    image = requestAnimationFrame(() => {
      image = null;
      dessiner();
    });
  });

  return {
    element,
    poser(nouvellesCles, rendreCarte, garder = false) {
      for (const carte of rendues) ranger(carte);
      rendues = [];
      const presentes = new Set(nouvellesCles);
      if (garder) {
        for (const cle of [...etats.keys()]) if (!presentes.has(cle)) etats.delete(cle);
        for (const cle of [...hauteurs.keys()]) if (!presentes.has(cle)) hauteurs.delete(cle);
      } else {
        etats.clear();
        hauteurs.clear();
        focusARendre = null;
        element.scrollTop = 0;
      }
      cles = nouvellesCles;
      rendre = rendreCarte;
      dessiner(true);
    },
    montrer(rang) {
      const haut = espace.offsetTop + decalageDe(rang);
      const fenetre = visible();
      if (haut < element.scrollTop + espace.offsetTop || haut + hauteurDe(cles[rang] ?? '') > element.scrollTop + fenetre) element.scrollTop = Math.max(0, haut - fenetre / 2);
      dessiner();
    },
    rafraichir: () => dessiner(true),
    rendues: () => rendues.length,
  };
}

/** Au-delà de ce nombre de cartes, une section range ses cartes dans une liste virtuelle. */
export const SEUIL_DE_LISTE = 50;

/** La hauteur que la liste prête à une carte tant qu'elle ne l'a pas mesurée. */
const HAUTEUR_ESTIMEE_D_UNE_CARTE = 72;

/** Une carte, ou un intertitre, d'une section : sa clé, et de quoi la créer quand elle arrive à l'écran. */
export interface CarteDeSection {
  /** Identifie la carte d'une pose à l'autre. */
  readonly cle: string;
  /** Vrai pour une carte qui pose une question : seule elle reste dans une liste virtuelle sous la puce Questions. */
  readonly question?: boolean;
  /** Vrai pour un intertitre, ou un élément de queue qui n'est pas une carte : le seuil ne le compte pas. */
  readonly intertitre?: boolean;
  /** Appelée à la première apparition de la carte dans une liste virtuelle, à chaque pose dans une section courte. */
  creer(): HTMLElement;
}

export interface HoteDeCartes {
  /** Remplace les cartes. `garder` conserve la position de défilement d'une liste virtuelle. */
  poser(cartes: readonly CarteDeSection[], garder?: boolean): void;
  /** Fait défiler la liste virtuelle jusqu'à la carte et la rend ; sans effet dans une section courte. */
  montrer(cle: string): void;
  /** Vrai quand la section range ses cartes dans une liste virtuelle. */
  virtuelle(): boolean;
  /** Les cartes présentes dans le DOM de l'hôte. */
  rendues(): number;
}

/** Ce que `rafraichirLesListesDe` demande à chaque liste : retrouver sa position et se redessiner après un déplacement dans le DOM. */
const rafraichissements = new WeakMap<HTMLElement, () => void>();

/**
 * À appeler après avoir rattaché des sections : un élément détaché perd sa position de défilement et ne mesure plus rien. Chaque liste
 * sous `racine` retrouve sa position, relit le filtre des questions et se redessine.
 */
export function rafraichirLesListesDe(racine: HTMLElement): void {
  for (const liste of Array.from(racine.querySelectorAll<HTMLElement>('.liste-de-cartes'))) rafraichissements.get(liste)?.();
}

/**
 * Pose les cartes d'une section dans `hote`. Une section de `SEUIL_DE_LISTE` cartes ou moins les pose telles quelles. Au-delà, l'hôte
 * ne contient qu'une liste de cartes à hauteur bornée, et chaque carte est créée à sa première apparition puis gardée, hors du DOM
 * quand elle sort de l'écran, jusqu'à la pose suivante : elle revient avec son état. `questionsSeules` dit si la puce Questions du
 * sommaire isole les cartes qui posent une question ; la liste ne garde alors que celles-là, car la feuille de style ne peut pas
 * cacher des cartes que la liste compte dans sa hauteur.
 */
export function creerHoteDeCartes(hote: HTMLElement, questionsSeules: () => boolean = () => false): HoteDeCartes {
  let cartes: readonly CarteDeSection[] = [];
  let affichees: readonly CarteDeSection[] = [];
  let creees = new Map<string, HTMLElement>();
  let liste: ListeDeCartes<null> | null = null;
  let position = 0;
  let sousLeFiltre = false;

  /** La carte dans une enveloppe qui tient l'espacement : la liste mesure la carte, espacement compris. */
  function enveloppe(carte: CarteDeSection): HTMLElement {
    let ligne = creees.get(carte.cle);
    if (!ligne) {
      ligne = document.createElement('div');
      ligne.className = 'ligne-de-liste';
      ligne.append(carte.creer());
      creees.set(carte.cle, ligne);
    }
    return ligne;
  }

  function creerLaListe(): ListeDeCartes<null> {
    const nouvelle = creerListeDeCartes<null>(HAUTEUR_ESTIMEE_D_UNE_CARTE, 'group', () => null);
    nouvelle.element.classList.add('liste-de-cartes');
    nouvelle.element.addEventListener('scroll', () => {
      position = nouvelle.element.scrollTop;
    });
    rafraichissements.set(nouvelle.element, rafraichir);
    return nouvelle;
  }

  function afficher(garder: boolean): void {
    sousLeFiltre = questionsSeules();
    if (cartes.filter(({ intertitre }) => intertitre !== true).length <= SEUIL_DE_LISTE) {
      liste = null;
      hote.replaceChildren(...cartes.map((carte) => carte.creer()));
      return;
    }
    liste ??= creerLaListe();
    if (!hote.contains(liste.element)) hote.replaceChildren(liste.element);
    const gardees = garder && !sousLeFiltre;
    affichees = sousLeFiltre ? cartes.filter(({ question }) => question === true) : cartes;
    if (!gardees) position = 0;
    liste.poser(affichees.map(({ cle }) => cle), (rang) => enveloppe(affichees[rang]), gardees);
  }

  function rafraichir(): void {
    if (!liste) return;
    if (questionsSeules() !== sousLeFiltre) {
      afficher(false);
      return;
    }
    liste.element.scrollTop = position;
    liste.rafraichir();
  }

  return {
    poser(nouvelles, garder = false) {
      cartes = nouvelles;
      creees = new Map();
      afficher(garder);
    },
    montrer(cle) {
      const rang = affichees.findIndex((carte) => carte.cle === cle);
      if (liste && rang >= 0) liste.montrer(rang);
    },
    virtuelle: () => liste !== null,
    rendues: () => (liste ? liste.rendues() : hote.childElementCount),
  };
}
