/**
 * Les doubles de Figma des tests d'Architect. Les doubles en lecture seule (calques, styles, port de variables) vivent dans le socle,
 * `plugin-socle/tests/generateur/atelierDeCalques.ts` : ce fichier les réexporte avec les types d'Architect, pour que les tests gardent
 * leur import. `atelierDEcriture`, en fin de fichier, est l'exception : il écrit, et son journal ordonné prouve quoi et dans quel ordre.
 */
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { atelierDeCalques as atelierNeutre } from '../../plugin-socle/tests/generateur/atelierDeCalques';
import type { NoeudLu, StyleLu } from '../src/consommateurs';
import type { PortDuComposant } from '../src/lectureDuComposant';

export { MutationInterdite, collectionFigma, enLectureSeule, portDeTest, variableFigma, type OptionsDuPort } from '../../plugin-socle/tests/generateur/atelierDeCalques';

/** L'atelier de calques du socle, typé sur les calques, les styles et le port d'Architect. */
export function atelierDeCalques(options: { readonly recherches?: boolean; readonly permises?: readonly string[] } = {}) {
  return atelierNeutre<NoeudLu, StyleLu, PortDuComposant>(options);
}

/** Une variable pour l'atelier d'écriture : son identifiant lie, sa clé s'importe. */
export interface VariableDEcriture {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  /** Les scopes de la variable. Avec `valuesByMode`, ils la rendent écrivable : une affectation, `setValueForMode` et `remove` entrent dans `journal`. */
  readonly scopes?: readonly string[];
  readonly valuesByMode?: Record<string, unknown>;
  /** L'identifiant de la collection locale qui porte la variable. */
  readonly collection?: string;
  readonly remote?: boolean;
  /** `resolvedType` de la variable : COLOR, FLOAT… */
  readonly type?: string;
}

/** Une collection locale de l'atelier : ses modes s'identifient `${id}:${nom}`. */
export interface CollectionDEcriture { readonly id: string; readonly name: string; readonly modes: readonly string[] }

export interface OptionsDeLEcriture {
  /** Le texte que `getSharedPluginData` rend pour la déclaration du fichier ; celle d'un fichier UCM par défaut. */
  readonly declaration?: string;
  /** Les variables locales du fichier. */
  readonly locales?: readonly VariableDEcriture[];
  /** Les variables qu'`importVariableByKeyAsync` rend ; toute autre clé lève. */
  readonly importables?: readonly VariableDEcriture[];
  /** Les variables que `getVariableByIdAsync` rend ; celles des listes précédentes s'y ajoutent. */
  readonly lisibles?: readonly VariableDEcriture[];
  /** Les identifiants dont l'écriture lève. */
  readonly refusees?: ReadonlySet<string>;
  /** Les collections locales du fichier. `createVariable` écrit dans l'une d'elles. */
  readonly collections?: readonly CollectionDEcriture[];
}

/**
 * Un atelier d'écriture : des layers que l'on peut lier, la sélection de la
 * page, et un journal ordonné de chaque écriture, import et point d'annulation.
 * Tout ce qui s'écrit passe par `journal`, pour que les tests prouvent l'ordre.
 */
export function atelierDEcriture(options: OptionsDeLEcriture = {}) {
  const journal: string[] = [];
  const layers = new Map<string, Record<string, unknown>>();
  const donnees = new Map<string, string>();
  const variables = new Map<string, VariableDEcriture>();
  let compteurDeCreations = 0;
  /** Une variable à `scopes` ou `valuesByMode` devient écrivable : chaque écriture entre dans `journal`, celles de `refusees` lèvent. */
  const equiper = (variable: VariableDEcriture): VariableDEcriture => {
    if (variable.scopes === undefined && variable.valuesByMode === undefined) return variable;
    let scopes = [...(variable.scopes ?? [])];
    let valeurs = { ...variable.valuesByMode };
    const brut: Record<string, unknown> = { id: variable.id, key: variable.key, name: variable.name, remote: variable.remote ?? false, variableCollectionId: variable.collection ?? '', resolvedType: variable.type ?? 'COLOR' };
    Object.defineProperty(brut, 'scopes', {
      enumerable: true,
      get: () => scopes,
      set: (suivants: string[]) => {
        if (options.refusees?.has(variable.id)) throw new Error('Figma refuse');
        journal.push(`scopes:${variable.id}:${suivants.join(',')}`);
        scopes = [...suivants];
      },
    });
    Object.defineProperty(brut, 'valuesByMode', { enumerable: true, get: () => valeurs });
    brut.setValueForMode = (mode: string, valeur: { id: string }) => {
      if (options.refusees?.has(variable.id)) throw new Error('Figma refuse');
      journal.push(`mode:${variable.id}:${mode}:${valeur.id}`);
      valeurs = { ...valeurs, [mode]: valeur };
    };
    // Les données partagées de la variable : la marque d'une fusion y vit. `refusees` retient `marque:<id>` pour faire lever l'écriture.
    const marques = new Map<string, string>();
    brut.getSharedPluginData = (espace: string, cle: string) => marques.get(`${espace}/${cle}`) ?? '';
    brut.setSharedPluginData = (espace: string, cle: string, valeur: string) => {
      if (options.refusees?.has(`marque:${variable.id}`)) throw new Error('Figma refuse');
      journal.push(`marque:${variable.id}:${valeur}`);
      marques.set(`${espace}/${cle}`, valeur);
    };
    brut.remove = () => {
      if (options.refusees?.has(variable.id)) throw new Error('Figma refuse');
      journal.push(`supprimer:${variable.id}`);
      variables.delete(variable.id);
      const rang = locales.indexOf(brut as unknown as VariableDEcriture);
      if (rang >= 0) locales.splice(rang, 1);
    };
    return brut as unknown as VariableDEcriture;
  };
  const locales: VariableDEcriture[] = (options.locales ?? []).map(equiper);
  for (const variable of [...(options.lisibles ?? []).map(equiper), ...locales, ...(options.importables ?? []).map(equiper)]) variables.set(variable.id, variable);
  let selection: unknown[] = [];
  const page: Record<string, unknown> = { id: '0:1', type: 'PAGE', parent: null };
  Object.defineProperty(page, 'selection', {
    enumerable: true,
    get: () => selection,
    set: (valeur: unknown[]) => {
      journal.push(`selection:${valeur.map((layer) => (layer as { id: string }).id).join(',')}`);
      selection = valeur;
    },
  });
  const api = {
    root: {
      getSharedPluginData: (espace: string, cle: string) => (espace === ESPACE_ARCHITECT && cle === CLE_ARCHITECTURE_DU_FICHIER ? (options.declaration ?? texteDeLArchitectureDuFichier(true)) : donnees.get(`${espace}/${cle}`) ?? ''),
      /** Les clés de données partagées de `espace` : celles qu'`setSharedPluginData` a écrites avec un texte non vide. */
      getSharedPluginDataKeys: (espace: string) => [...donnees].filter(([cle, valeur]) => cle.startsWith(`${espace}/`) && valeur !== '').map(([cle]) => cle.slice(espace.length + 1)),
      /** Les layers du fichier que `filtre` retient, dans l'ordre de leur création. */
      findAll: (filtre: (noeud: unknown) => boolean) => [...layers.values()].filter(filtre),
      setSharedPluginData(espace: string, cle: string, valeur: string) {
        if (options.refusees?.has('racine')) throw new Error('Figma refuse');
        journal.push(`donnee:${espace}/${cle}`);
        donnees.set(`${espace}/${cle}`, valeur);
      },
    },
    currentPage: page,
    /** Le centrage de la vue : `refusees` avec `centrage` le fait lever. */
    viewport: {
      scrollAndZoomIntoView(noeuds: readonly unknown[]) {
        if (options.refusees?.has('centrage')) throw new Error('Figma refuse');
        journal.push(`centrage:${noeuds.map((noeud) => (noeud as { id: string }).id).join(',')}`);
      },
    },
    async loadAllPagesAsync() {},
    async getNodeByIdAsync(id: string) {
      return layers.get(id) ?? null;
    },
    variables: {
      async getVariableByIdAsync(id: string) {
        return variables.get(id) ?? null;
      },
      async getLocalVariablesAsync() {
        journal.push('locales');
        return locales;
      },
      async getLocalVariableCollectionsAsync() {
        return (options.collections ?? []).map((collection) => ({
          id: collection.id, name: collection.name, remote: false, modes: collection.modes.map((mode) => ({ modeId: `${collection.id}:${mode}`, name: mode })),
        }));
      },
      /** Crée une variable écrivable ; `refusees` retient les noms dont la création lève. */
      createVariable(nom: string, collection: { id: string }, type: string) {
        if (options.refusees?.has(`creer:${nom}`)) throw new Error('Figma refuse');
        compteurDeCreations += 1;
        const creee = equiper({ id: `V:neuve-${compteurDeCreations}`, key: `k-neuve-${compteurDeCreations}`, name: nom, scopes: ['ALL_SCOPES'], valuesByMode: {}, collection: collection.id, type });
        journal.push(`creer:${nom}`);
        variables.set(creee.id, creee);
        locales.push(creee);
        return creee;
      },
      async importVariableByKeyAsync(cle: string) {
        journal.push(`import:${cle}`);
        const trouvee = options.importables?.find((variable) => variable.key === cle);
        if (!trouvee) throw new Error('Clé absente de la bibliothèque');
        return trouvee;
      },
      createVariableAlias(variable: VariableDEcriture) {
        return { type: 'VARIABLE_ALIAS', id: variable.id };
      },
      setBoundVariableForPaint(peinture: Record<string, unknown>, _champ: 'color', variable: VariableDEcriture) {
        journal.push(`peinture:${variable.key}`);
        return { ...peinture, boundVariables: { ...(peinture.boundVariables as object), color: { type: 'VARIABLE_ALIAS', id: variable.id } } };
      },
      setBoundVariableForEffect(effet: Record<string, unknown>, champ: string, variable: VariableDEcriture) {
        journal.push(`effet:${variable.key}`);
        return { ...effet, boundVariables: { ...(effet.boundVariables as object), [champ]: { type: 'VARIABLE_ALIAS', id: variable.id } } };
      },
    },
    commitUndo() {
      journal.push('commitUndo');
    },
  };
  return {
    api,
    page,
    journal,
    /** Les données partagées de la racine, par `espace/clé`. */
    donnees,
    selection: () => selection,
    /** La variable de l'atelier d'identifiant `id`, écrivable si elle porte `scopes` ou `valuesByMode`. */
    variable: (id: string) => variables.get(id) as (VariableDEcriture & { scopes: string[]; valuesByMode: Record<string, unknown>; setValueForMode(mode: string, valeur: unknown): void }) | undefined,
    /** Les variables locales encore présentes. */
    locales: () => locales,
    /** Un jeu de variants dont chaque variant porte l'un des noms ; renommer un variant entre dans `journal`. */
    jeuDeVariants(id: string, noms: readonly string[]): Record<string, unknown> {
      const jeu: Record<string, unknown> = { id, type: 'COMPONENT_SET', name: `Jeu ${id}`, parent: page, boundVariables: {} };
      jeu.children = noms.map((nom, rang) => {
        let valeur = nom;
        const variant: Record<string, unknown> = { id: `${id}-v${rang}`, type: 'COMPONENT', parent: jeu };
        Object.defineProperty(variant, 'name', {
          enumerable: true,
          get: () => valeur,
          set: (suivante: string) => {
            if (options.refusees?.has(`${id}-v${rang}`)) throw new Error('Figma refuse');
            journal.push(`nom:${id}-v${rang}:${suivante}`);
            valeur = suivante;
          },
        });
        return variant;
      });
      layers.set(id, jeu);
      return jeu;
    },
    /** Un layer écrivable ; `parent` est la page par défaut. Chaque écriture entre dans `journal`. */
    layer(id: string, type: string, champs: Record<string, unknown> = {}, parent: Record<string, unknown> = page): Record<string, unknown> {
      const brut: Record<string, unknown> = { id, type, name: `Layer ${id}`, parent, boundVariables: {}, ...champs };
      for (const champ of ['fills', 'strokes', 'effects']) {
        let valeur = brut[champ];
        delete brut[champ];
        Object.defineProperty(brut, champ, {
          enumerable: true,
          get: () => valeur,
          set: (suivante: unknown) => {
            if (options.refusees?.has(id)) throw new Error('Figma refuse');
            journal.push(`${champ}:${id}`);
            valeur = suivante;
          },
        });
      }
      brut.setBoundVariable = (champ: string, variable: VariableDEcriture) => {
        if (options.refusees?.has(id)) throw new Error('Figma refuse');
        journal.push(`lier:${id}.${champ}:${variable.key}`);
        brut.boundVariables = { ...(brut.boundVariables as object), [champ]: { type: 'VARIABLE_ALIAS', id: variable.id } };
      };
      if (type === 'TEXT') {
        brut.segments ??= [{ start: 0, end: 5, fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] }];
        brut.getStyledTextSegments = () => brut.segments;
        brut.setRangeFills = (debut: number, fin: number, peintures: unknown[]) => {
          if (options.refusees?.has(id)) throw new Error('Figma refuse');
          journal.push(`plage:${id}[${debut}-${fin}]`);
          brut.segments = (brut.segments as Array<{ start: number; end: number; fills: unknown }>).map((segment) => (segment.start === debut && segment.end === fin ? { ...segment, fills: peintures } : segment));
        };
      }
      layers.set(id, brut);
      return brut;
    },
  };
}
