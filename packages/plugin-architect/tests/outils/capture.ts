/**
 * Le chargeur d'une capture : il rebâtit, depuis le JSON de `src/sandbox/capture.ts`, un double de l'API Figma sur lequel
 * le relevé et le moteur tournent. Chaque propriété d'un nœud est un accesseur qui décode sa valeur à la lecture, rend une
 * copie neuve comme Figma, et lève quand la capture a relevé une erreur. Une lecture que la capture ne contient pas lève
 * `CaptureIncomplete` : le double ne rend jamais une valeur inventée.
 *
 * `surLecture` reçoit chaque lecture de propriété, chaque appel de méthode et chaque appel de ressource, par nœud et par champ.
 * Le double ne connaît pas la fonction appelante : un compteur qui la veut la lit dans la pile.
 */
import { ESPACE_ARCHITECT } from '@ucm-kit/core/referentiel';

import { cleDeSegments, type CaptureArchitect, type CaptureDeNoeud } from '../../src/sandbox/capture';
import { CLE_DU_NIVEAU } from '../../src/sandbox/configuration';

export class CaptureIncomplete extends Error {}

export interface LectureDuDouble {
  /** L'identifiant du nœud, de la ressource ou de la méthode (`figma.variables`). */
  readonly noeud: string;
  /** La propriété lue ou la méthode appelée, avec ses arguments pour une méthode. */
  readonly champ: string;
  readonly methode: boolean;
}

export interface OptionsDuDouble {
  readonly surLecture?: (lecture: LectureDuDouble) => void;
  /**
   * Reçoit chaque nom que le code lit sur un nœud (propriété ou opérateur `in`) sans que la capture le porte. Un nom qui n'est ni
   * dans `PROPRIETES_DE_NOEUD` ni une méthode de l'API est une propriété que la capture oublie.
   */
  readonly surLectureNonCapturee?: (lecture: { readonly noeud: string; readonly champ: string }) => void;
}

type Objet = Record<string, unknown>;

export function doubleDepuisCapture(capture: CaptureArchitect, options: OptionsDuDouble = {}) {
  const surLecture = options.surLecture ?? (() => {});
  const mixte = Symbol('figma.mixed');
  const noeuds = new Map<string, Objet>();
  const pages = new Map<string, Objet>();
  const racine: Objet = {};
  const figma: Objet = { mixed: mixte, skipInvisibleInstanceChildren: false };

  const retrouver = (id: string): Objet => {
    const trouve = noeuds.get(id) ?? pages.get(id) ?? (id === '0:0' ? racine : undefined);
    if (!trouve) throw new CaptureIncomplete(`Le nœud ${id} n'est pas dans la capture.`);
    return trouve;
  };

  /** Décode une valeur capturée : copie neuve, références résolues, erreur levée. */
  const decoder = (valeur: unknown): unknown => {
    if (Array.isArray(valeur)) return valeur.map(decoder);
    if (typeof valeur !== 'object' || valeur === null) return valeur;
    const objet = valeur as Objet;
    switch (objet.$) {
      case undefined: return Object.fromEntries(Object.entries(objet).map(([cle, element]) => [cle, decoder(element)]));
      case 'mixte': return mixte;
      case 'indefini': return undefined;
      case 'noeud': return retrouver(objet.id as string);
      case 'nombre': return Number(objet.valeur);
      case 'erreur': throw new Error(objet.message as string);
      case 'symbole': return Symbol(objet.description as string);
      case 'octets': return new Uint8Array(objet.longueur as number);
      default: throw new CaptureIncomplete(`Valeur capturée sans contenu (${String(objet.$)}).`);
    }
  };

  const definir = (cible: Objet, id: string, proprietes: Objet): void => {
    for (const [propriete, encodee] of Object.entries(proprietes)) {
      Object.defineProperty(cible, propriete, {
        enumerable: true,
        get: () => {
          surLecture({ noeud: id, champ: propriete, methode: false });
          return decoder(encodee);
        },
      });
    }
  };

  const ajouterUneMethode = (cible: Objet, id: string, nom: string, corps: (...arguments_: never[]) => unknown): void => {
    Object.defineProperty(cible, nom, {
      enumerable: false,
      value: (...arguments_: never[]) => {
        surLecture({ noeud: id, champ: nom, methode: true });
        return corps(...arguments_);
      },
    });
  };

  /** Les descendants d'un nœud capturé, dans l'ordre de `findAll`. `skipInvisibleInstanceChildren` écarte, sous une instance, les nœuds masqués et leurs descendants. */
  const descendants = (id: string, sousUneInstance = false): Objet[] => {
    const enfants = capture.noeuds[id]?.proprietes.children ?? [];
    if (!Array.isArray(enfants)) return [];
    return enfants.flatMap((reference: { id: string }) => {
      const enfant = noeuds.get(reference.id);
      if (!enfant) return [];
      const dedans = sousUneInstance || capture.noeuds[id]?.type === 'INSTANCE';
      if (figma.skipInvisibleInstanceChildren === true && dedans && capture.noeuds[reference.id]?.proprietes.visible === false) return [];
      return [enfant, ...descendants(reference.id, dedans)];
    });
  };

  const poserLesRecherches = (cible: Objet, id: string, liste: () => Objet[]): void => {
    ajouterUneMethode(cible, id, 'findAll', ((filtre: (n: Objet) => boolean = () => true) => liste().filter(filtre)) as never);
    ajouterUneMethode(cible, id, 'findOne', ((filtre: (n: Objet) => boolean) => liste().find(filtre) ?? null) as never);
    ajouterUneMethode(cible, id, 'findChildren', ((filtre: (n: Objet) => boolean = () => true) => (cible.children as Objet[]).filter(filtre)) as never);
    ajouterUneMethode(cible, id, 'findAllWithCriteria', (({ types }: { types: string[] }) => liste().filter((n) => types.includes(n.type as string))) as never);
  };

  /** Enveloppe un nœud pour relever les noms qu'il ne porte pas ; sans `surLectureNonCapturee`, le nœud reste brut. */
  const surveiller = (id: string, noeud: Objet): Objet => {
    const signaler = options.surLectureNonCapturee;
    if (!signaler) return noeud;
    return new Proxy(noeud, {
      get(cible, cle, receveur) {
        if (typeof cle === 'string' && cle !== 'then' && !(cle in cible)) signaler({ noeud: id, champ: cle });
        return Reflect.get(cible, cle, receveur);
      },
      has(cible, cle) {
        if (typeof cle === 'string' && !(cle in cible)) signaler({ noeud: id, champ: cle });
        return Reflect.has(cible, cle);
      },
    });
  };

  const batirUnNoeud = (id: string, donnees: CaptureDeNoeud): void => {
    const noeud: Objet = {};
    noeuds.set(id, surveiller(id, noeud));
    definir(noeud, id, donnees.proprietes);
    if (donnees.segments) {
      const segments = donnees.segments;
      ajouterUneMethode(noeud, id, 'getStyledTextSegments', ((champs: string[]) => {
        surLecture({ noeud: id, champ: `getStyledTextSegments(${champs.join(',')})`, methode: true });
        const cle = cleDeSegments(champs);
        if (!(cle in segments)) throw new CaptureIncomplete(`Le jeu de champs ${cle} n'est pas capturé pour le texte ${id}.`);
        return (decoder(segments[cle]) as Objet[]).map((segment) => Object.fromEntries(['start', 'end', ...champs].map((champ) => [champ, segment[champ]])));
      }) as never);
    }
    if ('maitre' in donnees) {
      ajouterUneMethode(noeud, id, 'getMainComponentAsync', (async () => decoder(donnees.maitre)) as never);
    }
    if ('children' in donnees.proprietes) poserLesRecherches(noeud, id, () => descendants(id));
  };

  for (const [id, donnees] of Object.entries(capture.noeuds)) batirUnNoeud(id, donnees);

  for (const [id, donnees] of Object.entries(capture.pages)) {
    const page: Objet = {};
    pages.set(id, page);
    definir(page, id, donnees.proprietes);
    Object.defineProperty(page, 'selection', { enumerable: true, get: () => { surLecture({ noeud: id, champ: 'selection', methode: false }); return donnees.selection.map(retrouver); } });
    Object.defineProperty(page, 'parent', { enumerable: true, get: () => racine });
    Object.defineProperty(page, 'children', { enumerable: true, get: () => [] });
    const listes = (): Objet[] => Object.values(donnees.criteres).flatMap((liste) => (Array.isArray(liste) ? (liste as { id: string }[]).map((reference) => retrouver(reference.id)) : []));
    ajouterUneMethode(page, id, 'findAll', ((filtre: (n: Objet) => boolean = () => true) => [...new Map(listes().map((n) => [n.id, n])).values()].filter(filtre)) as never);
    ajouterUneMethode(page, id, 'findAllWithCriteria', (({ types }: { types: string[] }) => {
      const cle = types.join(',');
      if (!(cle in donnees.criteres)) throw new CaptureIncomplete(`Les types ${cle} ne sont pas capturés pour la page ${id}.`);
      return decoder(donnees.criteres[cle]);
    }) as never);
    for (const nom of ['loadAsync']) ajouterUneMethode(page, id, nom, (async () => {}) as never);
    for (const nom of ['on', 'off']) ajouterUneMethode(page, id, nom, (() => {}) as never);
  }

  Object.assign(racine, { id: '0:0', type: 'DOCUMENT' });
  Object.defineProperty(racine, 'name', { enumerable: true, get: () => decoder(capture.fichier.nom) });
  Object.defineProperty(racine, 'documentColorProfile', { enumerable: true, get: () => decoder(capture.fichier.profilDeCouleur) });
  Object.defineProperty(racine, 'children', { enumerable: true, get: () => [...pages.values()] });
  ajouterUneMethode(racine, '0:0', 'getSharedPluginData', ((espace: string, cle: string) => (espace === ESPACE_ARCHITECT ? (capture.fichier.donneesPartagees[cle] as string | undefined) ?? '' : '')) as never);
  ajouterUneMethode(racine, '0:0', 'getSharedPluginDataKeys', ((espace: string) => (espace === ESPACE_ARCHITECT ? Object.keys(capture.fichier.donneesPartagees).filter((cle) => !cle.startsWith('$')) : [])) as never);

  const appeler = <T>(nom: string, corps: () => T): Promise<T> => {
    surLecture({ noeud: 'figma', champ: nom, methode: true });
    return new Promise((resolve, reject) => { try { resolve(corps()); } catch (erreur) { reject(erreur); } });
  };
  const objetDeRessource = (valeur: unknown): Objet | null => {
    const decode = decoder(valeur);
    return decode === null || decode === undefined ? null : (decode as Objet);
  };
  const liste = (valeur: unknown): Objet[] => {
    const decode = decoder(valeur);
    if (!Array.isArray(decode)) throw new CaptureIncomplete('Inventaire absent de la capture.');
    return decode as Objet[];
  };
  const parIdentifiant = (inventaire: unknown, id: string): unknown => (Array.isArray(inventaire) ? inventaire.find((element: Objet) => element?.id === id) : undefined);
  const importees = Object.values(capture.libraries?.imports ?? {});

  Object.assign(figma, {
    root: racine,
    clientStorage: { getAsync: (cle: string) => appeler('clientStorage.getAsync', () => (cle === CLE_DU_NIVEAU ? decoder(capture.fichier.niveau) : undefined)) },
    loadAllPagesAsync: () => appeler('loadAllPagesAsync', () => undefined),
    getNodeByIdAsync: (id: string) => appeler(`getNodeByIdAsync(${id})`, () => {
      if (noeuds.has(id)) return noeuds.get(id)!;
      if (pages.has(id)) return pages.get(id)!;
      if (id in capture.noeudsParIdentifiant) return decoder(capture.noeudsParIdentifiant[id]);
      return null;
    }),
    getStyleByIdAsync: (id: string) => appeler(`getStyleByIdAsync(${id})`, () => (id in capture.styles ? objetDeRessource(capture.styles[id]) : null)),
    variables: {
      getLocalVariableCollectionsAsync: () => appeler('getLocalVariableCollectionsAsync', () => liste(capture.locales.collections)),
      getLocalVariablesAsync: () => appeler('getLocalVariablesAsync', () => liste(capture.locales.variables)),
      getVariableByIdAsync: (id: string) => appeler(`getVariableByIdAsync(${id})`, () => {
        if (id in capture.variables) return objetDeRessource(capture.variables[id]);
        const locale = parIdentifiant(capture.locales.variables, id);
        if (locale) return objetDeRessource(locale);
        return objetDeRessource(importees.find((importee) => (importee as Objet | null)?.id === id) ?? null);
      }),
      getVariableCollectionByIdAsync: (id: string) => appeler(`getVariableCollectionByIdAsync(${id})`, () => {
        if (id in capture.collections) return objetDeRessource(capture.collections[id]);
        return objetDeRessource(parIdentifiant(capture.locales.collections, id) ?? null);
      }),
      importVariableByKeyAsync: (cle: string) => appeler(`importVariableByKeyAsync(${cle})`, () => {
        const importee = capture.libraries?.imports[cle];
        if (importee === undefined) throw new Error('Clé absente de la capture.');
        return objetDeRessource(importee) as Objet;
      }),
    },
  });
  Object.defineProperty(figma, 'fileKey', { enumerable: true, get: () => decoder(capture.fichier.fileKey) });
  if (capture.libraries) {
    const { libraries } = capture;
    figma.teamLibrary = {
      getAvailableLibraryVariableCollectionsAsync: () => appeler('teamLibrary.getAvailableLibraryVariableCollectionsAsync', () => decoder(libraries.collections)),
      getVariablesInLibraryCollectionAsync: (cle: string) => appeler(`teamLibrary.getVariablesInLibraryCollectionAsync(${cle})`, () => {
        if (!(cle in libraries.variables)) throw new CaptureIncomplete(`La collection de library ${cle} n'est pas dans la capture.`);
        return decoder(libraries.variables[cle]);
      }),
    };
  }
  Object.defineProperty(figma, 'currentPage', { enumerable: true, get: () => retrouver(capture.page) });

  return { figma, noeud: retrouver, mixte };
}
