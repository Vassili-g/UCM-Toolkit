/**
 * Écrit les corrections de sorte `regles` : poser l'instance de règles d'un
 * composant qui n'en a pas, par `creerLesRegles` du socle (`creer`), ou lui
 * poser les règles qu'elle ne porte pas, par `ajouterLesRegles` (`ajouter`).
 *
 * Chaque correction relit le document avant d'écrire : `creer` demande un
 * composant sans instance de règles, `ajouter` une instance qui existe et une
 * règle encore absente, sinon la correction est sautée (`objet-change`). Les
 * corrections `ajouter` d'un même composant s'écrivent d'un seul appel, sur la
 * fusion de leurs modèles : deux clics sur Appliquer ne posent jamais une règle
 * deux fois. `retirer` reste refusé (`instance-remplie`), faute de sonde sur ce
 * que Figma garde d'une instance éditée. Une erreur de Figma saute la
 * correction, ou tout le groupe d'un ajout (`erreur`) ; les deux écritures ont
 * déjà défait ce qu'elles avaient posé.
 *
 * Aucun `commitUndo` ici : le lot appelant pose le point d'annulation.
 */
import type { Correction } from '@ucm-kit/core/controles';
import { CALQUES_DU_KIT_DE_REGLES, nomCompacte } from '@ucm-kit/core/referentiel';
import { extractRules, porteLeNom, rulesContainerOwner } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import type { ReleveDeSource } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import type { Annonce } from 'ucm-plugin-socle/src/composant/annonce';
import { ajouterLesRegles, creerLesRegles } from 'ucm-plugin-socle/src/composant/template/ecriture';
import { nombreDeRegles, reglesManquantes } from 'ucm-plugin-socle/src/composant/template/modele';
import type { ModeleDeRegles, SectionDeModele } from 'ucm-plugin-socle/src/composant/template/modele';
import { chercherLaSourceDansLeDocument, resoudreLesSources } from 'ucm-plugin-socle/src/composant/template/sources';
import type { ResolutionDeSources } from 'ucm-plugin-socle/src/composant/template/sources';

import { ciblesPresentes, modelesDeLAnalyse } from '../regles';
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
  /** Les cibles que l'instance de règles du composant porte déjà, compactées par `cibleCompacte`. */
  presentes(composant: Composant): Promise<ReadonlySet<string>>;
  /** L'instance de règles qui écrit le nom du composant, `null` s'il n'y en a pas. */
  conteneur(composant: Composant): Promise<InstanceNode | null>;
  creer: typeof creerLesRegles;
  ajouter: typeof ajouterLesRegles;
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
  async presentes(composant) {
    return new Set(ciblesPresentes(await extractRules(composant, pageDe(composant))));
  },
  // Le critère est celui d'`extractRules` : le calque de nom, dans l'ordre des
  // instances de la page, donc la première instance qu'il lit.
  async conteneur(composant) {
    const page = pageDe(composant);
    const proprietaire = nomCompacte(composant.name);
    const porteurs = new Set<string>();
    for (const texte of page.findAllWithCriteria({ types: ['TEXT'] })) {
      if (!porteLeNom(texte, CALQUES_DU_KIT_DE_REGLES.nomDuComposant)) continue;
      for (let parent = texte.parent; parent && parent !== page; parent = parent.parent) {
        if (parent.type === 'INSTANCE') porteurs.add(parent.id);
      }
    }
    const instances = page.findAllWithCriteria({ types: ['INSTANCE'] }) as InstanceNode[];
    return instances.find((instance) => porteurs.has(instance.id) && rulesContainerOwner(instance) === proprietaire) ?? null;
  },
  resoudre: resoudreLesSources,
  creer: creerLesRegles,
  ajouter: ajouterLesRegles,
};

/** Les modèles réunis en une section `prop` puis une section `boolean`, séparateurs laissés à `reglesManquantes`. */
function fusionner(modeles: readonly ModeleDeRegles[]): ModeleDeRegles {
  const sections: SectionDeModele[] = [];
  for (const tag of ['prop', 'boolean'] as const) {
    const elements = modeles.flatMap((modele) => modele.sections.filter((section) => section.tag === tag).flatMap((section) => section.elements));
    if (elements.length > 0) sections.push({ tag, elements });
  }
  return { nom: modeles[0]?.nom ?? '', sections };
}

/**
 * Applique les corrections de sorte `regles`, une à la fois ; les `ajouter`
 * d'un même composant s'écrivent ensemble, après les autres. Les autres sortes
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
  const ajouts = new Map<string, Correction[]>();
  for (const correction of corrections) {
    if (correction.sorte !== 'regles') continue;
    const saute = (motif: MotifDeReglesSaute): void => { sautees.push({ id: correction.id, motif }); };
    const operation = correction.apres.nom as OperationDeRegles;
    if (operation === 'ajouter') {
      const layer = correction.cible.layer ?? '';
      ajouts.set(layer, [...(ajouts.get(layer) ?? []), correction]);
      continue;
    }
    try {
      const composant = correction.cible.layer ? await port.composant(correction.cible.layer) : null;
      if (!composant) { saute('objet-change'); continue; }
      const releve = await port.releve(composant);
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
  for (const [layer, groupe] of ajouts) await ajouterAuComposant(layer, groupe, modeles, port, annoncer, ecrites, sautees);
  return { ecrites, sautees };
}

/** Un composant, toutes ses corrections `ajouter` : une relecture, un seul appel d'écriture. */
async function ajouterAuComposant(
  layer: string,
  groupe: readonly Correction[],
  modeles: ReadonlyMap<string, ModeleDeRegles>,
  port: PortDEcritureDesRegles,
  annoncer: Annonce,
  ecrites: string[],
  sautees: ReglesSautees[],
): Promise<void> {
  const sauteTout = (motif: MotifDeReglesSaute): void => { for (const { id } of groupe) sautees.push({ id, motif }); };
  try {
    const composant = layer ? await port.composant(layer) : null;
    if (!composant) { sauteTout('objet-change'); return; }
    const releve = await port.releve(composant);
    const conteneur = await port.conteneur(composant);
    if (!conteneur) { sauteTout('objet-change'); return; }
    const presentes = await port.presentes(composant);
    const aPoser: Correction[] = [];
    const aSauter: Correction[] = [];
    const retenus: ModeleDeRegles[] = [];
    for (const correction of groupe) {
      const modele = modeles.get(correction.id);
      const manquantes = modele ? reglesManquantes(modele, presentes) : null;
      if (manquantes && nombreDeRegles(manquantes) > 0) { aPoser.push(correction); retenus.push(manquantes); } else aSauter.push(correction);
    }
    if (aPoser.length > 0) {
      const { sources } = await port.resoudre(releve);
      if (!sources) { sauteTout('erreur'); return; }
      await port.ajouter(conteneur, reglesManquantes(fusionner(retenus), presentes), sources, annoncer);
    }
    for (const { id } of aSauter) sautees.push({ id, motif: 'objet-change' });
    for (const { id } of aPoser) ecrites.push(id);
  } catch {
    sauteTout('erreur');
  }
}
