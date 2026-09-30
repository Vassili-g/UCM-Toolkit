/** La demande de redimensionnement qu'une poignée envoie au sandbox. */
export interface DemandeDeTaille {
  type: 'resize';
  largeur: number;
  hauteur: number;
  /**
   * Vrai au dernier message d'un geste, faux avant : seul le dernier se
   * range. Absent, comme d'une interface antérieure, chaque message se range.
   */
  fin?: boolean;
}

/**
 * La poignée de redimensionnement de la fenêtre. Chaque plugin fournit sa
 * porte d'envoi vers le sandbox.
 *
 * Le geste se suit sur le document, au plus un message par image, à la
 * dernière position reçue. Dans Figma, un mouvement arrive avec `buttons` à 0
 * bouton enfoncé, et Chromium retire alors la capture du pointeur : le geste
 * ne lit donc ni `buttons` ni la capture, et finit au relâcher, n'importe où
 * dans le document. Sans capture, le relâcher hors de la fenêtre n'arrive
 * pas : la sortie de la fenêtre finit le geste. La fin envoie un dernier
 * message, marqué `fin`, et retire les écouteurs : un survol ne redimensionne
 * plus rien.
 */
export function createResizeGrip(envoyer: (demande: DemandeDeTaille) => void): HTMLDivElement {
  const grip = document.createElement('div');
  grip.className = 'resize-grip';
  grip.setAttribute('aria-hidden', 'true');

  const namespace = 'http://www.w3.org/2000/svg';
  const icone = document.createElementNS(namespace, 'svg');
  icone.setAttribute('viewBox', '0 0 16 16');
  const trait = document.createElementNS(namespace, 'path');
  trait.setAttribute('d', 'M15 6 L6 15 M15 11 L11 15');
  icone.appendChild(trait);
  grip.appendChild(icone);

  let geste: { pointeur: number; x: number; y: number; image: number | null } | null = null;

  // Le pointeur est en coordonnées de la fenêtre : sa position est la taille
  // demandée, à la marge de la poignée près. Aucun delta à accumuler, donc
  // aucune dérive après plusieurs glissés.
  const demande = (x: number, y: number, fin: boolean): DemandeDeTaille => ({
    type: 'resize',
    largeur: Math.ceil(x + 4),
    hauteur: Math.ceil(y + 4),
    fin,
  });

  function bouger(evenement: PointerEvent): void {
    if (!geste || evenement.pointerId !== geste.pointeur) return;
    geste.x = evenement.clientX;
    geste.y = evenement.clientY;
    if (geste.image !== null) return;
    geste.image = requestAnimationFrame(() => {
      if (!geste) return;
      geste.image = null;
      envoyer(demande(geste.x, geste.y, false));
    });
  }

  function finir(): void {
    if (!geste) return;
    const { x, y, image } = geste;
    geste = null;
    if (image !== null) cancelAnimationFrame(image);
    window.removeEventListener('pointermove', bouger, true);
    window.removeEventListener('pointerup', relacher, true);
    window.removeEventListener('pointercancel', annuler, true);
    document.removeEventListener('pointerout', sortir, true);
    envoyer(demande(x, y, true));
  }

  function relacher(evenement: PointerEvent): void {
    if (!geste || evenement.pointerId !== geste.pointeur) return;
    geste.x = evenement.clientX;
    geste.y = evenement.clientY;
    finir();
  }

  /** `pointercancel` ne porte pas de position utile : le geste finit à la dernière reçue. */
  function annuler(evenement: PointerEvent): void {
    if (geste && evenement.pointerId === geste.pointeur) finir();
  }

  function sortir(evenement: PointerEvent): void {
    if (!geste || evenement.pointerId !== geste.pointeur || evenement.relatedTarget !== null) return;
    if (grip.hasPointerCapture(geste.pointeur)) return;
    geste.x = evenement.clientX;
    geste.y = evenement.clientY;
    finir();
  }

  grip.addEventListener('pointerdown', (depart) => {
    if (depart.button !== 0 || geste) return;
    depart.preventDefault();
    grip.setPointerCapture(depart.pointerId);
    geste = { pointeur: depart.pointerId, x: depart.clientX, y: depart.clientY, image: null };
    window.addEventListener('pointermove', bouger, true);
    window.addEventListener('pointerup', relacher, true);
    window.addEventListener('pointercancel', annuler, true);
    document.addEventListener('pointerout', sortir, true);
  });

  return grip;
}
