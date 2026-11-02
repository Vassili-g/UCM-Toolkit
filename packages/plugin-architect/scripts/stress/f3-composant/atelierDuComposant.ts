/**
 * L'atelier d'écriture d'un composant du stress test F3 et F4 : un relevé et son catalogue convertis en layers, peintures, liaisons et
 * variables du double de Figma (`tests/figmaDeTest.ts`), puis l'écriture d'un lot par `ecrireLeLot` et la relecture de ce que le
 * double a gardé.
 *
 * Le double est fidèle au relevé : un variant par `COMPONENT` du `COMPONENT_SET` du jeu, un layer par layer lu avec ses peintures, ses
 * plages de texte, ses champs numériques et leurs liaisons, un layer de surcharge par liaison d'instance. Chaque variable du catalogue
 * est lisible par son identifiant et importable par sa clé ; l'identifiant vient des liaisons du relevé, sinon de la clé.
 *
 * Les méthodes `retirerLeLayer`, `delier`, `lierAutre`, `renommerLeVariant` et `retirerLaVariable` changent le double après l'analyse,
 * pour que l'écriture trouve un fait qui n'est plus vrai et rende son motif de saut.
 */
import type { CatalogueDeReference, Correction, LayerLu, LiaisonLue, PeintureLue, ReleveDeComposant, VariableDuCatalogue } from '@ucm-kit/core/controles';

import { variableLue } from '../../../../kit/tests/stress/f3-composant/operateursAxes';
import { ecrireLeLot, type ApiDeLiaisons, type ResultatDUnLot } from '../../../src/ecriture/liaisons';
import { atelierDEcriture, type VariableDEcriture } from '../../../tests/figmaDeTest';

type Noeud = Record<string, unknown>;

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const CHAMPS_DE_PEINTURE = ['fills', 'strokes'];

/** La valeur en pixels d'une variable de taille, en suivant les alias dans le premier mode. */
function valeurResolue(variable: VariableDuCatalogue | undefined, parCle: ReadonlyMap<string, VariableDuCatalogue>, profondeur = 0): number | undefined {
  const premiere = Object.values(variable?.valeurs ?? {})[0];
  if (!premiere || profondeur > 8) return undefined;
  if ('alias' in premiere) return valeurResolue(parCle.get(premiere.alias), parCle, profondeur + 1);
  return typeof premiere.valeur === 'number' ? premiere.valeur : undefined;
}

function peintureDeFigma(peinture: PeintureLue, liaison: LiaisonLue | undefined): Noeud {
  return {
    type: peinture.type, visible: peinture.visible, opacity: peinture.opacite, blendMode: peinture.blendMode,
    ...(peinture.couleur ? { color: { r: peinture.couleur.r, g: peinture.couleur.g, b: peinture.couleur.b } } : {}),
    boundVariables: liaison ? { color: alias(liaison.variable.id) } : {},
  };
}

export interface ResultatSurLeDouble {
  readonly resultat: ResultatDUnLot;
  readonly journal: readonly string[];
}

export interface AtelierDuComposant {
  readonly api: ApiDeLiaisons;
  readonly journal: string[];
  /** L'identifiant Figma de la variable de cette clé de catalogue, ou `undefined` si le catalogue ne la porte pas. */
  identifiantDeLaVariable(cle: string): string | undefined;
  /** Le layer du double, ou `undefined`. */
  noeud(id: string): Noeud | undefined;
  /** Écrit ce lot comme le fait le sandbox : un seul appel à `ecrireLeLot`. */
  ecrire(corrections: readonly Correction[]): Promise<ResultatSurLeDouble>;
  /** L'identifiant de la variable que le double lie à la cible de cette correction, `null` si rien n'y est lié, `undefined` si la cible n'existe pas. */
  liaisonDeLaCible(cible: Correction['cible']): string | null | undefined;
  /** Les changements du document entre l'analyse et l'écriture. */
  retirerLeLayer(id: string): void;
  delier(cible: Correction['cible']): void;
  lierAutre(cible: Correction['cible'], variableId: string): void;
  renommerLeVariant(id: string, nom: string): void;
  retirerLaVariable(cle: string): void;
}

export function atelierDuComposant(releve: ReleveDeComposant, catalogue: CatalogueDeReference, options: { readonly declaration?: string } = {}): AtelierDuComposant {
  const parCle = new Map(catalogue.variables.map((variable) => [variable.cle, variable]));
  const identifiants = new Map<string, string>();
  for (const variant of releve.variants) {
    for (const layer of variant.layers) {
      for (const liaison of [...layer.liaisons, ...(layer.texte?.plages.flatMap((plage) => plage.liaisons) ?? [])]) identifiants.set(liaison.variable.cle, liaison.variable.id);
    }
  }
  for (const variable of catalogue.variables) if (!identifiants.has(variable.cle)) identifiants.set(variable.cle, variableLue(variable).id);

  const variables: VariableDEcriture[] = catalogue.variables.map((variable) => ({ id: identifiants.get(variable.cle)!, key: variable.cle, name: variable.nom }));
  const importables = [...variables];
  const atelier = atelierDEcriture({ lisibles: variables, importables, ...(options.declaration === undefined ? {} : { declaration: options.declaration }) });
  const noeuds = new Map<string, Noeud>();
  const poser = (id: string, type: string, champs: Noeud, parent: Noeud): Noeud => {
    const noeud = atelier.layer(id, type, champs, parent);
    noeuds.set(id, noeud);
    return noeud;
  };

  const jeu = poser(releve.jeu.id, 'COMPONENT_SET', { name: releve.jeu.nom }, atelier.page);
  for (const variant of releve.variants) {
    const noeudDuVariant = poser(variant.id, 'COMPONENT', { name: variant.nom }, jeu);
    for (const layer of variant.layers) {
      const parent = layer.parent === null ? noeudDuVariant : noeuds.get(layer.parent) ?? noeudDuVariant;
      poserLeLayer(layer, parent);
    }
  }

  function poserLeLayer(layer: LayerLu, parent: Noeud): void {
    const champs: Noeud = { name: layer.nom, visible: layer.visible, opacity: layer.opacite };
    const directes = layer.liaisons.filter((liaison) => liaison.surcharge === undefined);
    for (const champ of CHAMPS_DE_PEINTURE) {
      const peintures = layer.peintures.filter((peinture) => peinture.champ === champ).sort((a, b) => a.indice - b.indice);
      if (peintures.length > 0) {
        champs[champ] = peintures.map((peinture) => peintureDeFigma(peinture, directes.find((liaison) => liaison.champ === champ && liaison.indice === peinture.indice && liaison.plage === undefined)));
      } else champs[champ] = [];
    }
    const lies: Record<string, unknown> = {};
    for (const liaison of directes) {
      if (CHAMPS_DE_PEINTURE.includes(liaison.champ) || liaison.plage) continue;
      lies[liaison.champ] = alias(liaison.variable.id);
      const valeur = valeurResolue(parCle.get(liaison.variable.cle), parCle);
      if (valeur !== undefined) champs[liaison.champ] = valeur;
    }
    for (const dur of layer.valeursEnDur) champs[dur.champ] = dur.valeur;
    if (layer.strokeWeight !== undefined) champs.strokeWeight = layer.strokeWeight;
    champs.boundVariables = lies;
    if (layer.texte) {
      champs.segments = layer.texte.plages.map((plage) => ({
        start: plage.debut, end: plage.fin,
        fills: plage.peintures.map((peinture) => peintureDeFigma(peinture, plage.liaisons.find((liaison) => liaison.indice === peinture.indice || (liaison.indice === undefined && peinture.indice === 0)))),
      }));
    }
    const noeud = poser(layer.id, layer.type, champs, parent);
    // Une liaison d'instance qui vise un layer intérieur : le layer de surcharge existe sous l'instance, avec sa peinture liée.
    for (const liaison of layer.liaisons) {
      if (!liaison.surcharge || noeuds.has(liaison.surcharge.id)) continue;
      poser(liaison.surcharge.id, liaison.surcharge.type, { name: liaison.surcharge.nom, fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 }, boundVariables: { color: alias(liaison.variable.id) } }], strokes: [] }, noeud);
    }
  }

  const noeud = (id: string): Noeud | undefined => noeuds.get(id);

  function liaisonDeLaCible(cible: Correction['cible']): string | null | undefined {
    const layer = cible.layer === undefined ? undefined : noeuds.get(cible.layer);
    if (!layer) return undefined;
    const champ = cible.champ ?? '';
    const indice = cible.indice ?? 0;
    if (cible.plage) {
      const segment = (layer.segments as Array<{ start: number; end: number; fills: Noeud[] }> | undefined)?.find((lu) => lu.start === cible.plage!.debut && lu.end === cible.plage!.fin);
      const lie = (segment?.fills[indice]?.boundVariables as { color?: { id: string } } | undefined)?.color;
      return segment ? lie?.id ?? null : undefined;
    }
    if (CHAMPS_DE_PEINTURE.includes(champ)) {
      const peinture = (layer[champ] as Noeud[] | undefined)?.[indice];
      return peinture ? (peinture.boundVariables as { color?: { id: string } } | undefined)?.color?.id ?? null : undefined;
    }
    return (layer.boundVariables as Record<string, { id: string }> | undefined)?.[champ]?.id ?? null;
  }

  return {
    api: atelier.api as unknown as ApiDeLiaisons,
    journal: atelier.journal,
    identifiantDeLaVariable: (cle) => identifiants.get(cle),
    noeud,
    async ecrire(corrections) {
      const debut = atelier.journal.length;
      const resultat = await ecrireLeLot(corrections, {}, atelier.api as unknown as ApiDeLiaisons);
      return { resultat, journal: atelier.journal.slice(debut) };
    },
    liaisonDeLaCible,
    retirerLeLayer(id) {
      const layer = noeuds.get(id);
      if (layer) layer.removed = true;
    },
    delier(cible) {
      const layer = cible.layer === undefined ? undefined : noeuds.get(cible.layer);
      if (!layer) return;
      const champ = cible.champ ?? '';
      if (cible.plage) {
        const segment = (layer.segments as Array<{ start: number; end: number; fills: Noeud[] }>).find((lu) => lu.start === cible.plage!.debut);
        if (segment) segment.fills[cible.indice ?? 0].boundVariables = {};
      } else if (CHAMPS_DE_PEINTURE.includes(champ)) {
        const peinture = (layer[champ] as Noeud[])[cible.indice ?? 0];
        if (peinture) peinture.boundVariables = {};
      } else {
        const lies = { ...(layer.boundVariables as Record<string, unknown>) };
        delete lies[champ];
        layer.boundVariables = lies;
      }
    },
    lierAutre(cible, variableId) {
      const layer = cible.layer === undefined ? undefined : noeuds.get(cible.layer);
      if (!layer) return;
      const champ = cible.champ ?? '';
      if (CHAMPS_DE_PEINTURE.includes(champ) && !cible.plage) {
        const peinture = (layer[champ] as Noeud[])[cible.indice ?? 0];
        if (peinture) peinture.boundVariables = { color: alias(variableId) };
      } else if (!cible.plage) layer.boundVariables = { ...(layer.boundVariables as Record<string, unknown>), [champ]: alias(variableId) };
    },
    renommerLeVariant(id, nom) {
      const variant = noeuds.get(id);
      if (variant) variant.name = nom;
    },
    retirerLaVariable(cle) {
      const rang = importables.findIndex((variable) => variable.key === cle);
      if (rang >= 0) importables.splice(rang, 1);
    },
  };
}
