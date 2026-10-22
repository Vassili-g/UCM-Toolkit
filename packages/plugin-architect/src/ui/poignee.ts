/**
 * La poignée qui règle une largeur : une colonne de la table, ou l'arbre.
 * Glisser la déplace, les flèches Gauche et Droite la déplacent d'un pas, un
 * double clic rend la largeur par défaut.
 *
 * Le geste se suit sur la fenêtre et finit au relâcher, où qu'il arrive : dans
 * Figma, Chromium retire la capture du pointeur en cours de geste. La sortie
 * de la fenêtre finit aussi le geste, faute de relâcher à recevoir.
 */

/** Le pas d'une flèche, en pixels. */
export const PAS_AU_CLAVIER = 16;

export interface ReglageDeLargeur {
  /** Le nom accessible de la poignée. */
  readonly etiquette: string;
  readonly infobulle: string;
  readonly min: number;
  readonly max: number;
  /** La largeur affichée, lue au début d'un geste. */
  lire(): number;
  /** `fin` est vrai au dernier appel d'un geste : c'est la largeur à ranger. */
  poser(largeur: number, fin: boolean): void;
  /** Rend la largeur par défaut. */
  retablir(): void;
}

export function creerPoignee(reglage: ReglageDeLargeur): HTMLDivElement {
  const poignee = document.createElement('div');
  poignee.className = 'poignee';
  poignee.tabIndex = 0;
  poignee.title = reglage.infobulle;
  poignee.setAttribute('role', 'separator');
  poignee.setAttribute('aria-orientation', 'vertical');
  poignee.setAttribute('aria-label', reglage.etiquette);
  poignee.setAttribute('aria-valuemin', String(reglage.min));
  poignee.setAttribute('aria-valuemax', String(reglage.max));

  const borner = (largeur: number): number => Math.round(Math.max(reglage.min, Math.min(reglage.max, largeur)));
  const annoncer = (largeur: number): void => poignee.setAttribute('aria-valuenow', String(largeur));

  let geste: { pointeur: number; depart: number; origine: number; largeur: number; image: number | null } | null = null;

  function bouger(evenement: PointerEvent): void {
    if (!geste || evenement.pointerId !== geste.pointeur) return;
    geste.largeur = borner(geste.origine + evenement.clientX - geste.depart);
    if (geste.image !== null) return;
    geste.image = requestAnimationFrame(() => {
      if (!geste) return;
      geste.image = null;
      reglage.poser(geste.largeur, false);
    });
  }

  function finir(): void {
    if (!geste) return;
    const { largeur, image } = geste;
    geste = null;
    if (image !== null) cancelAnimationFrame(image);
    window.removeEventListener('pointermove', bouger, true);
    window.removeEventListener('pointerup', relacher, true);
    window.removeEventListener('pointercancel', relacher, true);
    document.removeEventListener('pointerout', sortir, true);
    poignee.classList.remove('poignee-active');
    document.documentElement.classList.remove('reglage-en-cours');
    annoncer(largeur);
    reglage.poser(largeur, true);
  }

  function relacher(evenement: PointerEvent): void {
    if (geste && evenement.pointerId === geste.pointeur) finir();
  }

  function sortir(evenement: PointerEvent): void {
    if (geste && evenement.pointerId === geste.pointeur && evenement.relatedTarget === null) finir();
  }

  poignee.addEventListener('pointerdown', (depart) => {
    if (depart.button !== 0 || geste) return;
    depart.preventDefault();
    const origine = reglage.lire();
    geste = { pointeur: depart.pointerId, depart: depart.clientX, origine, largeur: borner(origine), image: null };
    poignee.classList.add('poignee-active');
    document.documentElement.classList.add('reglage-en-cours');
    window.addEventListener('pointermove', bouger, true);
    window.addEventListener('pointerup', relacher, true);
    window.addEventListener('pointercancel', relacher, true);
    document.addEventListener('pointerout', sortir, true);
  });

  poignee.addEventListener('dblclick', () => {
    poignee.removeAttribute('aria-valuenow');
    reglage.retablir();
  });

  poignee.addEventListener('keydown', (evenement) => {
    const sens = evenement.key === 'ArrowRight' ? 1 : evenement.key === 'ArrowLeft' ? -1 : 0;
    if (sens === 0) return;
    evenement.preventDefault();
    const largeur = borner(reglage.lire() + sens * PAS_AU_CLAVIER);
    annoncer(largeur);
    reglage.poser(largeur, true);
  });

  return poignee;
}
