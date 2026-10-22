/**
 * Annonce une étape sans donner au moteur de dépendance vers l'UI.
 *
 * Le message ne part que lorsque le sandbox rend la main. L'analyse d'un
 * composant la rend aussitôt, et la promesse se résout ensuite : le moteur
 * l'attend pour que le texte paraisse avant le calcul qu'il annonce.
 */
export type Annonce = (etape: string) => void | Promise<void>;
