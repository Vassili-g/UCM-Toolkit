/**
 * La taille de la fenêtre d'un plugin : ses bornes, sa lecture, son rangement.
 * Chaque plugin fournit ses bornes et sa clé ; la taille reste dans
 * `clientStorage`, jamais dans le document.
 */

export type TailleFenetre = { largeur: number; hauteur: number };

/** Ce qu'un plugin décide de sa fenêtre. */
export interface BornesFenetre {
  /** La taille d'ouverture, tant que rien n'a été rangé. */
  readonly defaut: TailleFenetre;
  /** En dessous, l'interface cesse d'être lisible, bien avant le 70 × 0 de Figma. */
  readonly minimale: TailleFenetre;
  /** La clé de `clientStorage`. */
  readonly cle: string;
}

/**
 * Ramène une demande de taille dans les bornes.
 *
 * Elle est pure pour être testée : le reste de ce fichier ne peut l'être
 * qu'avec un `figma` en vie. Une valeur qui n'est pas un nombre fini
 * retombe sur le défaut, sans quoi `figma.ui.resize` ne lèverait pas d'erreur
 * utile.
 */
export function tailleValide(brut: Partial<TailleFenetre> | null | undefined, bornes: BornesFenetre): TailleFenetre {
  const borner = (valeur: unknown, minimum: number, defaut: number): number => {
    if (typeof valeur !== 'number' || !Number.isFinite(valeur)) return defaut;
    return Math.max(minimum, Math.round(valeur));
  };
  return {
    largeur: borner(brut?.largeur, bornes.minimale.largeur, bornes.defaut.largeur),
    hauteur: borner(brut?.hauteur, bornes.minimale.hauteur, bornes.defaut.hauteur),
  };
}

/** La taille rangée la fois précédente, ou celle par défaut. */
export async function lireTaille(bornes: BornesFenetre): Promise<TailleFenetre> {
  const rangee = await figma.clientStorage.getAsync(bornes.cle);
  return tailleValide(rangee as Partial<TailleFenetre> | undefined, bornes);
}

/** Range la taille pour la prochaine ouverture, après l'avoir bornée. */
export async function rangerTaille(taille: TailleFenetre, bornes: BornesFenetre): Promise<void> {
  await figma.clientStorage.setAsync(bornes.cle, tailleValide(taille, bornes));
}

/** Ce que le sandbox reçoit de la poignée : la forme de `DemandeDeTaille`, sans son type. */
export interface DemandeDeRedimensionnement {
  readonly largeur: number;
  readonly hauteur: number;
  readonly fin?: boolean;
}

/**
 * Le redimensionnement de la fenêtre, pur pour être testé. Chaque demande
 * passe par `valider`, puis s'applique si elle change la taille en cours. Le
 * rangement attend la fin du geste : une demande marquée `fin: false` ne se
 * range pas, et une demande sans `fin` se range, comme d'une interface
 * antérieure.
 */
export function creerRedimensionnement(
  valider: (brut: Partial<TailleFenetre>) => TailleFenetre,
  appliquer: (taille: TailleFenetre) => void,
  ranger: (taille: TailleFenetre) => Promise<void>,
) {
  let courante: TailleFenetre | null = null;
  const poser = (taille: TailleFenetre): void => {
    if (courante && courante.largeur === taille.largeur && courante.hauteur === taille.hauteur) return;
    courante = taille;
    appliquer(taille);
  };
  return {
    /** La taille de l'ouverture, ou celle que la lecture du rangement donne. */
    poser,
    async demander(demande: DemandeDeRedimensionnement): Promise<void> {
      const taille = valider({ largeur: demande.largeur, hauteur: demande.hauteur });
      poser(taille);
      if (demande.fin !== false) await ranger(taille);
    },
  };
}
