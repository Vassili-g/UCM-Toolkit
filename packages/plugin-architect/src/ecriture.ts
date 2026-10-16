/** Toutes les mutations du document sont réunies ici ; une erreur peut laisser un résultat partiel. */
import { normaliserLesNoms, type PropositionDeNom } from '@ucm-kit/core/referentiel';
import type { Analyse } from './analyse';
import { nomDePropriete, type CibleDeNom, type ComposantLu, type EntreeInventaire, type Inventaire } from './lecture';
import type { ChoixDeConventions } from './conventions';

interface ObjetModifiable { readonly id: string; name: string; readonly remote: boolean }
interface ComposantModifiable extends ObjetModifiable {
  readonly type: 'COMPONENT' | 'COMPONENT_SET';
  readonly parent: { readonly id: string } | null;
  readonly componentPropertyDefinitions: Readonly<Record<string, { readonly type: string }>>;
  readonly variantProperties?: Readonly<Record<string, string>> | null;
  editComponentProperty(id: string, choix: { name: string }): string;
}
export interface SessionEcriture {
  collection(id: string): ObjetModifiable | null;
  variable(id: string): (ObjetModifiable & { readonly variableCollectionId: string }) | null;
  composant(id: string): ComposantModifiable | null;
  lireConventions(): string;
  rangerConventions(texte: string): void;
  commitUndo(): void;
}
export interface PortEcriture { ouvrir(inventaire: Inventaire): Promise<SessionEcriture> }
export interface RenommageEffectue {
  readonly type: CibleDeNom['type'];
  readonly id: string;
  readonly ancienNom: string;
  readonly nouveauNom: string;
  readonly ownerId?: string;
  readonly proprieteId?: string;
  readonly nouvelId?: string;
}
export interface RefusDeNom { readonly id: string; readonly motif: 'fichier-modifie' | 'collision' | 'syntaxe-variante' | 'ecriture-interrompue' }
export interface ResultatApplication {
  readonly statut: 'applique' | 'partiel' | 'refuse';
  readonly renommages: readonly RenommageEffectue[];
  readonly ignores: readonly RefusDeNom[];
  readonly conventionRangee: boolean;
  readonly annulationPossible: boolean;
  readonly erreur: boolean;
}
const egal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const syntaxe = (nom: string): boolean => nom.length > 0 && nom.trim() === nom && !/[=,]/u.test(nom);
const comparer = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const groupe = (inventaire: Inventaire, ownerId: string): readonly ComposantLu[] => (inventaire.composants ?? []).filter((node) => node.parentId === ownerId).sort((a, b) => comparer(a.id, b.id));

/** Prépare les noms finaux de chaque variant depuis les propriétés structurées, sans parser son nom. */
function variantsFinaux(inventaire: Inventaire, propositions: readonly PropositionDeNom[], entrees: ReadonlyMap<string, EntreeInventaire>) {
  const proprietes = new Map<string, Map<string, string>>();
  const valeurs = new Map<string, Map<string, string>>();
  const owners = new Set<string>();
  for (const proposition of propositions) {
    const cible = entrees.get(proposition.id)!.cible;
    if (cible.type === 'propriete' && cible.typePropriete === 'VARIANT') {
      owners.add(cible.ownerId);
      const axes = proprietes.get(cible.ownerId) ?? new Map<string, string>();
      axes.set(nomDePropriete(cible.proprieteId), proposition.nouveauNom);
      proprietes.set(cible.ownerId, axes);
    }
    if (cible.type === 'valeur') {
      owners.add(cible.ownerId);
      const options = valeurs.get(cible.ownerId) ?? new Map<string, string>();
      options.set(JSON.stringify([nomDePropriete(cible.axe), cible.valeur]), proposition.nouveauNom);
      valeurs.set(cible.ownerId, options);
    }
  }
  const noms: { node: ComposantLu; nom: string }[] = [];
  const invalides = new Set<string>();
  for (const ownerId of owners) {
    const combinaisons = new Set<string>();
    const variants = groupe(inventaire, ownerId);
    if (variants.length === 0) invalides.add(ownerId);
    for (const node of variants) {
      const paires = Object.entries(node.variantProperties ?? {}).map(([axe, valeur]) => [
        proprietes.get(ownerId)?.get(axe) ?? axe,
        valeurs.get(ownerId)?.get(JSON.stringify([axe, valeur])) ?? valeur,
      ] as const);
      const cle = JSON.stringify([...paires].sort(([a], [b]) => comparer(a, b)));
      if (node.remote || paires.length === 0 || paires.some(([axe, valeur]) => !syntaxe(axe) || !syntaxe(valeur))
        || new Set(paires.map(([axe]) => axe)).size !== paires.length || combinaisons.has(cle)) invalides.add(ownerId);
      combinaisons.add(cle);
      noms.push({ node, nom: paires.map(([axe, valeur]) => `${axe}=${valeur}`).join(', ') });
    }
  }
  return { noms, invalides };
}

/** Compare l'aperçu au document relu et ne calcule que les propositions cochées encore sûres. */
export function appliquerNoms(options: {
  readonly analyse: Analyse;
  readonly inventaire: Inventaire;
  readonly ids: readonly string[];
  readonly session: SessionEcriture;
  readonly conventionsLues: string;
}): ResultatApplication {
  const { analyse, inventaire, session } = options;
  const ignores: RefusDeNom[] = [];
  const renommages: RenommageEffectue[] = [];
  let conventionRangee = false;
  let erreur = false;
  const termines = new Set<string>();
  const actuelles = new Map(inventaire.entrees.map((entree) => [entree.nom.id, entree]));
  const apercu = new Map(analyse.inventaire.entrees.map((entree) => [entree.nom.id, entree]));
  const propositions = new Map(analyse.normalisation.propositions.map((proposition) => [proposition.id, proposition]));
  const selection = new Set(options.ids);
  if (selection.size !== options.ids.length || options.ids.some((id) => !propositions.has(id)) || session.lireConventions() !== options.conventionsLues) {
    return { statut: 'refuse', renommages, ignores: options.ids.map((id) => ({ id, motif: 'fichier-modifie' })), conventionRangee, annulationPossible: false, erreur: false };
  }
  for (const id of selection) {
    const ancien = apercu.get(id)!;
    const actuel = actuelles.get(id);
    const cible = ancien.cible;
    const ownerId = cible.type === 'valeur' || (cible.type === 'propriete' && cible.typePropriete === 'VARIANT') ? cible.ownerId : undefined;
    const node = cible.type === 'propriete' ? session.composant(cible.ownerId) : undefined;
    const variable = cible.type === 'variable' ? session.variable(cible.variableId) : undefined;
    const collection = cible.type === 'collection' ? session.collection(cible.collectionId) : undefined;
    const composantAncien = cible.type === 'propriete' ? analyse.inventaire.composants?.find((item) => item.id === cible.ownerId) : undefined;
    if (!actuel?.renommable || !egal(ancien.nom, actuel.nom) || !egal(cible, actuel.cible)
      || (ownerId && !egal(groupe(analyse.inventaire, ownerId), groupe(inventaire, ownerId)))
      || (cible.type === 'propriete' && (!node || node.remote || node.componentPropertyDefinitions[cible.proprieteId]?.type !== cible.typePropriete
        || (composantAncien && (node.name !== composantAncien.name || node.type !== composantAncien.type || node.parent?.id !== (composantAncien.parentId ?? undefined)))))
      || (cible.type === 'variable' && (!variable || variable.remote || variable.name !== ancien.nom.nom || variable.variableCollectionId !== cible.collectionId))
      || (cible.type === 'collection' && (!collection || collection.remote || collection.name !== ancien.nom.nom))) {
      selection.delete(id);
      ignores.push({ id, motif: 'fichier-modifie' });
    }
  }
  let finales: readonly PropositionDeNom[] = [];
  let variants = variantsFinaux(inventaire, [], actuelles);
  let retrait: boolean;
  do {
    retrait = false;
    finales = normaliserLesNoms(inventaire.entrees.map((entree) => entree.nom), analyse.conventions, {
      termesUcm: analyse.termesUcm,
      nonRenommables: inventaire.entrees.filter((entree) => !selection.has(entree.nom.id) || !entree.renommable).map((entree) => entree.nom.id),
    }).propositions;
    for (const id of selection) if (!finales.some((p) => p.id === id && p.nouveauNom === propositions.get(id)?.nouveauNom)) {
      selection.delete(id); ignores.push({ id, motif: 'collision' }); retrait = true;
    }
    variants = variantsFinaux(inventaire, finales, actuelles);
    for (const id of selection) {
      const cible = actuelles.get(id)!.cible;
      if ((cible.type === 'valeur' || cible.type === 'propriete') && variants.invalides.has(cible.ownerId)) {
        selection.delete(id); ignores.push({ id, motif: 'syntaxe-variante' }); retrait = true;
      }
    }
  } while (retrait);
  const composants = variants.noms.map(({ node, nom }) => ({ node, nom, objet: session.composant(node.id) }));
  if (composants.some(({ node, objet }) => !objet || objet.remote || objet.type !== 'COMPONENT' || objet.parent?.id !== node.parentId
    || objet.name !== node.name || !egal(objet.variantProperties, node.variantProperties))) {
    return { statut: 'refuse', renommages, ignores: options.ids.map((id) => ({ id, motif: 'fichier-modifie' })), conventionRangee, annulationPossible: false, erreur: false };
  }
  if (session.lireConventions() !== options.conventionsLues) return { statut: 'refuse', renommages, ignores: options.ids.map((id) => ({ id, motif: 'fichier-modifie' })), conventionRangee, annulationPossible: false, erreur: false };
  try {
    for (const proposition of finales) {
      const cible = actuelles.get(proposition.id)!.cible;
      if (cible.type === 'valeur') continue;
      if (cible.type === 'propriete') {
        const owner = session.composant(cible.ownerId)!;
        const avant = new Set(Object.keys(owner.componentPropertyDefinitions));
        let nouvelId: string | undefined;
        try { nouvelId = owner.editComponentProperty(cible.proprieteId, { name: proposition.nouveauNom }); }
        finally {
          nouvelId ??= Object.keys(owner.componentPropertyDefinitions).find((id) => !avant.has(id) && nomDePropriete(id) === proposition.nouveauNom);
          if (nouvelId && nomDePropriete(nouvelId) === proposition.nouveauNom) {
            renommages.push({ type: cible.type, id: proposition.id, ownerId: cible.ownerId,
              proprieteId: cible.proprieteId, nouvelId, ancienNom: proposition.ancienNom, nouveauNom: proposition.nouveauNom });
            termines.add(proposition.id);
          }
        }
      } else {
        const objet = cible.type === 'collection' ? session.collection(cible.collectionId)! : session.variable(cible.variableId)!;
        try { objet.name = proposition.nouveauNom; }
        finally {
          if (objet.name !== proposition.ancienNom) renommages.push({ type: cible.type, id: objet.id, ancienNom: proposition.ancienNom, nouveauNom: objet.name });
          if (objet.name === proposition.nouveauNom) termines.add(proposition.id);
        }
      }
    }
    for (const { node, nom, objet } of composants) {
      if (objet!.name === nom) continue;
      const ancienNom = node.name;
      try { objet!.name = nom; }
      finally { if (objet!.name !== ancienNom) renommages.push({ type: 'valeur', id: node.id, ownerId: node.parentId!, ancienNom, nouveauNom: objet!.name }); }
    }
    if (finales.length > 0) {
      const choix: ChoixDeConventions = { version: 1, conventions: analyse.conventions, termesUcm: analyse.termesUcm };
      const texte = JSON.stringify(choix);
      if (session.lireConventions() !== options.conventionsLues) throw new Error('conventions-modifiees');
      if (texte !== options.conventionsLues) {
        try { session.rangerConventions(texte); }
        finally { conventionRangee = session.lireConventions() === texte; }
      }
    }
  } catch {
    erreur = true;
    for (const proposition of finales) {
      const cible = actuelles.get(proposition.id)!.cible;
      if (cible.type === 'valeur' && cible.componentIds.every((id) => {
        const attendu = composants.find(({ node }) => node.id === id);
        return attendu?.objet?.name === attendu?.nom;
      })) termines.add(proposition.id);
      if (!termines.has(proposition.id)) ignores.push({ id: proposition.id, motif: 'ecriture-interrompue' });
    }
  }
  const annulationPossible = renommages.length > 0 || conventionRangee;
  if (annulationPossible) {
    try { session.commitUndo(); } catch { erreur = true; }
  }
  return { statut: erreur || ignores.length > 0 ? (annulationPossible ? 'partiel' : 'refuse') : 'applique', renommages, ignores, conventionRangee, annulationPossible, erreur };
}

/** Les objets locaux sont résolus avant les écritures synchrones, sur les pages déjà chargées. */
export function creerPortEcriture(api: PluginAPI): PortEcriture {
  return { ouvrir: async (inventaire) => {
    const collections = new Map((await api.variables.getLocalVariableCollectionsAsync()).map((objet) => [objet.id, objet]));
    const variables = new Map((await api.variables.getLocalVariablesAsync()).map((objet) => [objet.id, objet]));
    const composants = new Map(await Promise.all((inventaire.composants ?? []).map(async ({ id }) => [id, await api.getNodeByIdAsync(id)] as const)));
    return {
      collection: (id) => collections.get(id) ?? null,
      variable: (id) => variables.get(id) ?? null,
      composant: (id) => { const node = composants.get(id); return node?.type === 'COMPONENT' || node?.type === 'COMPONENT_SET' ? node : null; },
      lireConventions: () => api.root.getSharedPluginData('ucm_architect', 'conventions'),
      rangerConventions: (texte) => api.root.setSharedPluginData('ucm_architect', 'conventions', texte),
      commitUndo: () => api.commitUndo(),
    };
  } };
}
