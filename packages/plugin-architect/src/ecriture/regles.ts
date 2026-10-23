/**
 * Écrit les corrections de sorte `regles` : poser l'instance de règles d'un
 * composant qui n'en a pas, par `creerLesRegles` du socle.
 *
 * Chaque correction relit le document avant d'écrire : le composant doit
 * exister et ne toujours pas avoir d'instance de règles, sinon elle est
 * sautée (`objet-change`). Une instance déjà remplie n'est jamais complétée ni
 * allégée, faute de sonde sur ce que Figma garde d'une instance éditée
 * (`instance-remplie`). Une erreur de Figma saute la correction (`erreur`) ;
 * `creerLesRegles` a déjà défait ce qu'elle avait posé.
 *
 * Aucun `commitUndo` ici : le lot appelant pose le point d'annulation.
 */
import type { Correction } from '@ucm-kit/core/controles';
import { extractRules } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import type { ReleveDeSource } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import type { Annonce } from 'ucm-plugin-socle/src/composant/annonce';
import { creerLesRegles } from 'ucm-plugin-socle/src/composant/template/ecriture';
import type { ModeleDeRegles } from 'ucm-plugin-socle/src/composant/template/modele';
import { chercherLaSourceDansLeDocument, resoudreLesSources } from 'ucm-plugin-socle/src/composant/template/sources';
import type { ResolutionDeSources } from 'ucm-plugin-socle/src/composant/template/sources';

import { modelesDeLAnalyse } from '../regles';
import type { OperationDeRegles } from '../regles';

export type MotifDeReglesSaute = 'objet-change' | 'instance-remplie' | 'erreur';

export interface ReglesSautees { readonly id: string; readonly motif: MotifDeReglesSaute }

export interface ResultatDEcritureDesRegles {
  /** Les identifiants des corrections écrites. */
  readonly ecrites: string[];
  readonly sautees: ReglesSautees[];
}

type Composant = ComponentNode | ComponentSetNode;

/** Ce que l'écriture demande à Figma : les doubles des tests le remplacent. */
export interface PortDEcritureDesRegles {
  composant(id: string): Promise<Composant | null>;
  /** Le relevé de la page du composant, complété de la source du document. */
  releve(composant: Composant): Promise<ReleveDeSource>;
  resoudre(releve: ReleveDeSource): Promise<ResolutionDeSources>;
  creer: typeof creerLesRegles;
}

function pageDe(node: BaseNode): PageNode {
  let courant: BaseNode | null = node;
  while (courant && courant.type !== 'PAGE') courant = courant.parent;
  return (courant as PageNode | null) ?? figma.currentPage;
}

const PORT_DE_FIGMA: PortDEcritureDesRegles = {
  async composant(id) {
    const node = await figma.getNodeByIdAsync(id).catch(() => null);
    if (!node || node.removed) return null;
    return node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' ? node : null;
  },
  async releve(composant) {
    const { releve } = await extractRules(composant, pageDe(composant));
    if (releve.maitreLocal || releve.instanceSource) return releve;
    const distante = await chercherLaSourceDansLeDocument(async () => {}).catch(() => null);
    return distante ? { ...releve, maitreLocal: distante.maitreLocal, instanceSource: distante.instanceSource } : releve;
  },
  resoudre: resoudreLesSources,
  creer: creerLesRegles,
};

/**
 * Applique les corrections de sorte `regles`, une à la fois. Les autres sortes
 * sont ignorées. `modeles` donne, par identifiant de correction, le modèle que
 * l'analyse a retenu.
 */
export async function ecrireLesRegles(
  corrections: readonly Correction[],
  annoncer: Annonce = () => {},
  modeles: ReadonlyMap<string, ModeleDeRegles> = modelesDeLAnalyse(),
  port: PortDEcritureDesRegles = PORT_DE_FIGMA,
): Promise<ResultatDEcritureDesRegles> {
  const ecrites: string[] = [];
  const sautees: ReglesSautees[] = [];
  for (const correction of corrections) {
    if (correction.sorte !== 'regles') continue;
    const saute = (motif: MotifDeReglesSaute): void => { sautees.push({ id: correction.id, motif }); };
    try {
      const composant = correction.cible.layer ? await port.composant(correction.cible.layer) : null;
      if (!composant) { saute('objet-change'); continue; }
      const releve = await port.releve(composant);
      const operation = correction.apres.nom as OperationDeRegles;
      if (operation !== 'creer') {
        saute(releve.conteneurDuComposant ? 'instance-remplie' : 'objet-change');
        continue;
      }
      const modele = modeles.get(correction.id);
      if (releve.conteneurDuComposant || !modele) { saute('objet-change'); continue; }
      const { sources } = await port.resoudre(releve);
      if (!sources) { saute('erreur'); continue; }
      await port.creer(composant, modele, sources, annoncer);
      ecrites.push(correction.id);
    } catch {
      saute('erreur');
    }
  }
  return { ecrites, sautees };
}
