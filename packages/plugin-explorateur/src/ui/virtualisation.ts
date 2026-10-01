/**
 * Une liste virtualisée à hauteur de ligne fixe : seules les lignes visibles,
 * plus une marge, existent dans le DOM. Le conteneur garde la hauteur de la
 * liste entière, si bien que la barre de défilement et la position restent
 * justes. Une ligne hors de la portion rendue s'atteint par `montrer(rang)`.
 */

export interface ListeVirtuelle {
  readonly element: HTMLDivElement;
  /** Remplace les lignes ; la position de défilement est gardée si `garder` est vrai. */
  poser(total: number, rendreLigne: (rang: number) => HTMLElement, garder?: boolean): void;
  /** Fait défiler jusqu'à la ligne et la rend. */
  montrer(rang: number): void;
  /** Rend de nouveau les lignes visibles, après un changement de contexte. */
  rafraichir(): void;
  defilement(): number;
  defiler(position: number): void;
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
    defilement: () => element.scrollTop,
    defiler(position) {
      element.scrollTop = position;
      dessiner(true);
    },
    rendues: () => espace.childElementCount,
  };
}
