/**
 * L'aperçu d'un composant : l'image que Figma rend du sujet, et la boîte de
 * chaque calque. L'export produit des octets en mémoire, sans rien écrire
 * dans le document.
 *
 * L'image couvre `absoluteRenderBounds` du sujet. Une boîte de calque vient
 * d'`absoluteBoundingBox`, dans le même repère de page : l'interface la
 * rapporte à l'origine de l'image. Borne : la boîte d'un calque pivoté ou
 * rogné est celle que Figma donne, sans correction.
 */
import type { BoiteDeCalque } from './composant';
import type { RectangleLu } from './consommateurs';

/** La largeur de l'image, en pixels, au-delà de laquelle l'export réduit le sujet. */
export const LARGEUR_MAXIMALE = 720;

/** Ce que l'export lit d'un calque Figma. */
export interface NoeudExportable {
  readonly absoluteRenderBounds?: RectangleLu | null;
  readonly absoluteBoundingBox?: RectangleLu | null;
  exportAsync?(reglages: { format: 'PNG'; constraint: { type: 'WIDTH'; value: number } }): Promise<Uint8Array>;
}

/** Le port de l'aperçu : le calque à exporter, lu par identifiant. */
export interface PortDeLApercu {
  getNodeByIdAsync(id: string): Promise<NoeudExportable | null>;
}

export interface ApercuDeComposant {
  readonly octets: Uint8Array;
  /** La taille de la zone rendue, en unités de la page. */
  readonly largeur: number;
  readonly hauteur: number;
  /** Le coin haut gauche de la zone rendue, dans le repère de la page. */
  readonly origine: { readonly x: number; readonly y: number };
}

/** La boîte d'un calque dans le repère de la page, ou rien quand Figma n'en donne pas. */
export function boiteDe(noeud: { readonly absoluteBoundingBox?: RectangleLu | null }): BoiteDeCalque | undefined {
  const boite = noeud.absoluteBoundingBox;
  if (!boite || ![boite.x, boite.y, boite.width, boite.height].every(Number.isFinite)) return undefined;
  return { x: boite.x, y: boite.y, largeur: boite.width, hauteur: boite.height };
}

/**
 * L'image du calque, large de `LARGEUR_MAXIMALE` pixels au plus. Rend
 * `null` quand le calque manque, n'a pas de zone rendue ou que l'export lève :
 * la vue affiche alors le composant sans image.
 */
export async function exporterLApercu(port: PortDeLApercu, sujet: string): Promise<ApercuDeComposant | null> {
  try {
    const noeud = await port.getNodeByIdAsync(sujet);
    const zone = noeud?.absoluteRenderBounds ?? noeud?.absoluteBoundingBox;
    if (!noeud || !zone || typeof noeud.exportAsync !== 'function' || !(zone.width > 0) || !(zone.height > 0)) return null;
    const value = Math.max(1, Math.min(LARGEUR_MAXIMALE, Math.round(zone.width)));
    const octets = await noeud.exportAsync({ format: 'PNG', constraint: { type: 'WIDTH', value } });
    return { octets, largeur: zone.width, hauteur: zone.height, origine: { x: zone.x, y: zone.y } };
  } catch {
    return null;
  }
}
