/** Les liaisons de texte conservent leurs paramètres sans reconstruire les contrôles. */
import { creerTraducteur } from '../i18n';
import type { Catalogue } from '../i18n/catalogue';
import type { Langue } from '../i18n/langues';
import { arrondi } from '../i18n/nombres';

export interface MessageLocalise { readonly lire: () => string }
export type Texte = string | MessageLocalise;
export type Localiser<T> = T extends string ? Texte
  : T extends (...arguments_: infer A) => infer R ? (...arguments_: { [K in keyof A]: Entrees<A[K]> }) => Localiser<R>
  : T extends readonly unknown[] ? { [K in keyof T]: Localiser<T[K]> }
  : T extends object ? { [K in keyof T]: Localiser<T[K]> } : T;
type Entrees<T> = T extends string ? string extends T ? Texte : T : T extends (...arguments_: infer A) => infer R ? (...arguments_: A) => Entrees<R>
  : T extends object ? { [K in keyof T]: Entrees<T[K]> } : T;

export const lireTexte = (texte: Texte): string => typeof texte === 'string' ? texte : texte.lire();

/** Une interface possède son contexte ; les planches n'en importent aucun. */
export function creerLocalisation(langue: Langue) {
  let traducteur = creerTraducteur(langue);
  const liaisons = new WeakMap<Element, Map<string, () => void>>();
  let observation: MutationObserver | null = null;
  function actualiser(racine: Element): void {
    for (const appliquer of liaisons.get(racine)?.values() ?? []) appliquer();
    racine.querySelectorAll('*').forEach((enfant) => { for (const appliquer of liaisons.get(enfant)?.values() ?? []) appliquer(); });
  }
  function localiser(lire: () => unknown): unknown {
    const valeur = lire();
    if (typeof valeur === 'string') return { lire };
    if (typeof valeur === 'function') return (...arguments_: unknown[]) => localiser(() => (lire() as (...args: unknown[]) => unknown)(...arguments_.map(resoudre)));
    if (Array.isArray(valeur)) return valeur.map((_, index) => localiser(() => (lire() as unknown[])[index]));
    if (valeur && typeof valeur === 'object') {
      return Object.fromEntries(Object.keys(valeur).map((cle) => [cle, localiser(() => (lire() as Record<string, unknown>)[cle])]));
    }
    return valeur;
  }
  function resoudre(valeur: unknown): unknown {
    if (valeur && typeof valeur === 'object' && 'lire' in valeur && typeof valeur.lire === 'function') return valeur.lire();
    if (Array.isArray(valeur)) return valeur.map(resoudre);
    if (valeur && typeof valeur === 'object') return Object.fromEntries(Object.entries(valeur).map(([cle, entree]) => [cle, resoudre(entree)]));
    if (typeof valeur === 'function') return (...args: unknown[]) => resoudre(valeur(...args));
    return valeur;
  }
  const messagesLocalises = localiser(() => traducteur.messages) as Localiser<Catalogue>;
  const messages = {
    ...messagesLocalises,
    nomDeLaPalette: traducteur.messages.nomDeLaPalette,
    jugementDuSeuil: traducteur.messages.jugementDuSeuil,
    nomDeLaCopie: (nom: string) => traducteur.messages.nomDeLaCopie(nom),
  };
  return {
    messages,
    get langue() { return traducteur.langue; },
    arrondi(valeur: number, precision: number): MessageLocalise {
      return { lire: () => arrondi(valeur, precision, traducteur.langue) };
    },
    noeud(texte: Texte): HTMLSpanElement {
      const element = document.createElement('span');
      this.lier(element, 'textContent', texte);
      return element;
    },
    joindre(textes: readonly Texte[], separateur: string): MessageLocalise {
      return { lire: () => textes.map(lireTexte).join(separateur) };
    },
    composer(parties: TemplateStringsArray, ...valeurs: (Texte | number)[]): MessageLocalise {
      return { lire: () => parties.reduce((texte, partie, index) => texte + partie + (index < valeurs.length ? typeof valeurs[index] === 'number' ? valeurs[index] : lireTexte(valeurs[index] as Texte) : ''), '') };
    },
    lier(element: Element, propriete: string, texte: Texte | null): void {
      if (!observation) {
        observation = new MutationObserver((mutations) => {
          for (const mutation of mutations) mutation.addedNodes.forEach((noeud) => { if (noeud instanceof Element) actualiser(noeud); });
        });
        observation.observe(document.documentElement, { childList: true, subtree: true });
      }
      const noeud = propriete === 'textContent' ? document.createTextNode('') : null;
      if (noeud) element.replaceChildren(noeud);
      const appliquer = () => {
        const valeur = texte === null ? '' : lireTexte(texte);
        if (noeud) noeud.data = valeur;
        else if (propriete === 'value' && element instanceof HTMLInputElement) element.value = valeur;
        else element.setAttribute(propriete, valeur);
      };
      let proprietes = liaisons.get(element);
      if (!proprietes) { proprietes = new Map(); liaisons.set(element, proprietes); }
      proprietes.set(propriete, appliquer);
      appliquer();
    },
    changer(langue: Langue): void {
      traducteur = creerTraducteur(langue);
      document.documentElement.lang = traducteur.langue;
      document.documentElement.dir = traducteur.direction;
      actualiser(document.documentElement);
    },
  };
}

export type Localisation = ReturnType<typeof creerLocalisation>;

/** Une vue partagée, notamment le sélecteur flottant, a une seule instance par interface. */
export function memoriserVues<T>(construire: (i18n: Localisation) => T): (i18n: Localisation) => T {
  const vues = new WeakMap<Localisation, T>();
  return (i18n) => {
    if (!vues.has(i18n)) vues.set(i18n, construire(i18n));
    return vues.get(i18n)!;
  };
}
