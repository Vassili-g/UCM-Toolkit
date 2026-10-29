/**
 * Ce que le relevé dit d'une instance imbriquée : sa sorte, et l'origine de chacune de ses liaisons.
 *
 * La sorte se décide dans le kit (`sorteDeLImbrique`) ; ce module relève les faits qu'il demande depuis ce que le relevé
 * lit déjà de l'instance, sans parcourir ses calques : les dimensions de layout liées sont celles de ses liaisons, celles
 * de l'instance et celles des calques que sa surcharge vise. Un wrapper dont les seules liaisons de layout vivent sur un
 * calque que l'hôte ne surcharge pas n'est donc pas reconnu comme tel ; la liaison se juge alors comme celle d'un layer de
 * l'hôte, ce que fait aussi une instance sans sorte.
 *
 * Un wrapper de dimensions note aussi son jeu de variants, que le relevé lit ensuite en entier.
 *
 * Une liaison vient du composant principal quand le layer homologue du maître lie le même champ à la même variable. Le
 * layer homologue d'un calque que la surcharge vise se retrouve par son identifiant : `I<instance>;<calque du maître>`
 * dans l'hôte, `<calque du maître>` dans le maître, et `I<calque>;<sous-calque>` sous une instance du maître.
 */
import type { LayerLu, LiaisonLue, ReleveDeComposant } from '@ucm-kit/core/controles';
import { sorteDeLImbrique } from '@ucm-kit/core/referentiel';
import { compter } from 'ucm-plugin-socle/src/composant/contract/mesure';
import { BINDING_PATTERNS } from 'ucm-plugin-socle/src/composant/contract/nodeBindings';
import type { LecteurDeChamp } from 'ucm-plugin-socle/src/composant/analyse/acquisition';
import { AnalyseAnnulee, type ContexteCooperatif } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';

import { liaisonsDuNoeudCooperatives, type NoeudLu } from './consommateurs';

/** Les dimensions de layout dont une liaison complète fait un porteur de layout, les mêmes que l'élection du wrapper dans le socle. */
const DIMENSIONS_DE_LAYOUT = [BINDING_PATTERNS.gap, BINDING_PATTERNS.paddingX, BINDING_PATTERNS.paddingY, BINDING_PATTERNS.radius];

/** Une liaison par son chemin : champ sans indice de tête, indice, plage de texte. */
export function decouper(propriete: string): { champ: string; indice?: number; plage?: { debut: number; fin: number } } {
  let reste = propriete;
  let plage: { debut: number; fin: number } | undefined;
  const dansUnTexte = /^texte\[(\d+)–(\d+)\]\.(.*)$/.exec(reste);
  if (dansUnTexte) {
    plage = { debut: Number(dansUnTexte[1]), fin: Number(dansUnTexte[2]) };
    reste = dansUnTexte[3];
  }
  const indexe = /^([A-Za-z]+)\[(\d+)\](.*)$/.exec(reste);
  if (indexe) return { champ: `${indexe[1]}${indexe[3]}`, indice: Number(indexe[2]), ...(plage ? { plage } : {}) };
  return { champ: reste, ...(plage ? { plage } : {}) };
}

const cleDeLiaison = ({ champ, indice, plage }: { champ: string; indice?: number; plage?: { debut: number; fin: number } }): string =>
  JSON.stringify([champ, indice ?? null, plage?.debut ?? null, plage?.fin ?? null]);

/** Le nombre de dimensions de layout liées, calque par calque : l'instance, puis chaque calque que sa surcharge vise. */
async function dimensionsLiees(liaisons: readonly LiaisonLue[], cooperation: ContexteCooperatif): Promise<number> {
  const champsParCalque = new Map<string, Set<string>>();
  for (const liaison of liaisons) {
    await cooperation.cederSiBesoin();
    if (liaison.plage) continue;
    const calque = liaison.surcharge?.id ?? liaison.porteur;
    const champs = champsParCalque.get(calque) ?? new Set<string>();
    champs.add(liaison.champ);
    champsParCalque.set(calque, champs);
  }
  let total = 0;
  for (const champs of champsParCalque.values()) {
    for (const alternatives of DIMENSIONS_DE_LAYOUT) {
      await cooperation.cederSiBesoin();
      if (alternatives.some((groupe) => groupe.every((champ) => champs.has(champ)))) total += 1;
    }
  }
  return total;
}

/** L'identifiant, dans le maître, du calque que la surcharge vise ; `null` quand l'identifiant n'a pas la forme de l'hôte. */
function identifiantDansLeMaitre(idDeLInstance: string, cible: string): string | null {
  const prefixe = `I${idDeLInstance};`;
  if (!cible.startsWith(prefixe)) return null;
  const reste = cible.slice(prefixe.length);
  return reste.includes(';') ? `I${reste}` : reste;
}

/**
 * Les liaisons des maîtres, lues une fois par maître et par calque homologue pour toute la demande. Un maître n'est parcouru
 * que si une surcharge vise un de ses calques.
 */
export class LiaisonsDesMaitres {
  private readonly calques = new Map<string, Promise<ReadonlyMap<string, NoeudLu>>>();
  private readonly liaisons = new Map<string, Promise<ReadonlyMap<string, string>>>();

  constructor(
    private readonly cooperation: ContexteCooperatif,
    private readonly lire: LecteurDeChamp,
  ) {}

  private calquesDe(maitre: NoeudLu): Promise<ReadonlyMap<string, NoeudLu>> {
    let lu = this.calques.get(maitre.id);
    if (!lu) {
      lu = this.parcourir(maitre);
      this.calques.set(maitre.id, lu);
    }
    return lu;
  }

  private async parcourir(maitre: NoeudLu): Promise<ReadonlyMap<string, NoeudLu>> {
    const parId = new Map<string, NoeudLu>();
    const aVisiter: NoeudLu[] = [maitre];
    while (aVisiter.length > 0) {
      await this.cooperation.cederSiBesoin();
      const noeud = aVisiter.pop() as NoeudLu;
      parId.set(noeud.id, noeud);
      compter('proprietesDuReleve');
      for (const enfant of this.lire<readonly NoeudLu[] | undefined>(noeud, 'children') ?? []) aVisiter.push(enfant);
    }
    return parId;
  }

  private liaisonsDe(maitre: NoeudLu, homologue: NoeudLu): Promise<ReadonlyMap<string, string>> {
    const cle = `${maitre.id}\u0000${homologue.id}`;
    let lu = this.liaisons.get(cle);
    if (!lu) {
      lu = liaisonsDuNoeudCooperatives(homologue, this.cooperation, undefined, undefined, this.lire).then((brutes) => new Map(brutes.map(({ propriete, variable }) => [cleDeLiaison(decouper(propriete)), variable])));
      this.liaisons.set(cle, lu);
    }
    return lu;
  }

  /** `composant-principal` quand le layer homologue du maître lie ce champ à cette variable, `instance` sinon, un homologue introuvable compris. */
  async provenance(maitre: NoeudLu, idDeLInstance: string, liaison: LiaisonLue): Promise<'composant-principal' | 'instance'> {
    let homologue: NoeudLu | undefined = maitre;
    if (liaison.surcharge) {
      const id = identifiantDansLeMaitre(idDeLInstance, liaison.surcharge.id);
      homologue = id === null ? undefined : (await this.calquesDe(maitre)).get(id);
    }
    if (!homologue) return 'instance';
    return (await this.liaisonsDe(maitre, homologue)).get(cleDeLiaison(liaison)) === liaison.variable.id ? 'composant-principal' : 'instance';
  }
}

/** Ce que le marquage lit du relevé en cours. */
export interface LecteurDesImbriques {
  readonly cooperation: ContexteCooperatif;
  readonly lire: LecteurDeChamp;
  readonly maitres: LiaisonsDesMaitres;
  /** Les jeux de variants des wrappers de dimensions rencontrés, un par identifiant, dans l'ordre de première rencontre. */
  readonly jeuxDeWrappers: Map<string, NoeudLu>;
  /** Les maîtres de wrapper dont le parent est déjà lu : un wrapper posé dans 90 variants se lit une fois. */
  readonly maitresDeWrappersLus: Set<string>;
  /** Vrai quand un conteneur de règles nomme le composant de ce maître sur sa page. */
  readonly reglesTrouvees: (maitre: NoeudLu) => boolean;
}

/** Un wrapper qui est un variant d'un jeu fait partie du composant avec tout son jeu ; un composant seul n'a pas de jeu à lire. */
function noterLeJeuDuWrapper(layer: LayerLu, maitre: NoeudLu, lecteur: LecteurDesImbriques, manquees: ReleveDeComposant['lecture']['manquees']): void {
  if (lecteur.maitresDeWrappersLus.has(maitre.id)) return;
  lecteur.maitresDeWrappersLus.add(maitre.id);
  try {
    compter('proprietesDuReleve');
    const jeu = lecteur.lire<NoeudLu | null>(maitre, 'parent');
    if (jeu?.type === 'COMPONENT_SET' && !lecteur.jeuxDeWrappers.has(jeu.id)) lecteur.jeuxDeWrappers.set(jeu.id, jeu);
  } catch (erreur) {
    if (erreur instanceof AnalyseAnnulee) throw erreur;
    manquees.push({ layer: layer.id, champ: 'wrapper', motif: erreur instanceof Error ? erreur.message : String(erreur) });
  }
}

/**
 * Pose la sorte du layer d'une instance imbriquée, puis la provenance de ses liaisons. `nom` est celui de son composant
 * publié (son jeu, sinon son maître). Une dépendance a son propre contrat : son sous-arbre n'est pas compté et ses
 * liaisons ne se comparent pas à son maître. Une sorte qui ne se décide pas (la page du maître ne se lit pas) reste
 * absente, avec une lecture manquée ; les liaisons se jugent alors comme celles d'un layer de l'hôte.
 */
export async function marquerLImbrique(layer: LayerLu, nom: string, maitre: NoeudLu, lecteur: LecteurDesImbriques, manquees: ReleveDeComposant['lecture']['manquees']): Promise<void> {
  let reglesTrouvees: boolean;
  try {
    reglesTrouvees = lecteur.reglesTrouvees(maitre);
  } catch (erreur) {
    if (erreur instanceof AnalyseAnnulee) throw erreur;
    manquees.push({ layer: layer.id, champ: 'sorte', motif: erreur instanceof Error ? erreur.message : String(erreur) });
    return;
  }
  const sorte = sorteDeLImbrique({ nom, reglesTrouvees, dimensionsLiees: reglesTrouvees ? 0 : await dimensionsLiees(layer.liaisons, lecteur.cooperation) });
  layer.sorte = sorte;
  if (sorte === 'wrapper-de-dimensions') noterLeJeuDuWrapper(layer, maitre, lecteur, manquees);
  if (reglesTrouvees) return;
  for (const liaison of layer.liaisons) {
    await lecteur.cooperation.cederSiBesoin();
    liaison.provenance = await lecteur.maitres.provenance(maitre, layer.id, liaison);
  }
}
