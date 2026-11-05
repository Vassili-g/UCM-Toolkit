/**
 * La page de règles du stress test F8 : un composant, ses voisins et des instances de `.componentRules` fabriqués avec les nœuds de
 * `tests/outils/mondeFabrique.ts`, puis lus comme l'analyse les lit. `lireLaPage` passe par `lireLesRegles` (le scan `extractRules`,
 * le modèle du socle, la comparaison de `constatsDeRegles`) et par les points du scan, que le moteur double rend comme le moteur réel
 * (`warnings`, `parties`, `localisations` du même canal), pour que C43, C45 et C44 sortent de la chaîne entière.
 *
 * La page est reconstruite à chaque lecture depuis sa `SpecDePage` : l'écriture des opérateurs modifie la spec, la lecture suivante
 * voit la page modifiée.
 */
import { extractRules } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import type { ExtractedRules } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import { localisationsDe, partiesDe } from 'ucm-plugin-socle/src/composant/contract/localisation';
import type { ModeleDeRegles } from 'ucm-plugin-socle/src/composant/template/modele';
import type { Constat } from '@ucm-kit/core/controles';

import { constatsDuMoteur, sansLesDoublonsDuMoteur } from '../../../src/constatsDuMoteur';
import { constatsDeRegles, lireLesRegles, modelesDeLAnalyse, retenirLesModeles, type ReleveDesRegles } from '../../../src/regles';
import { noeud, type NoeudFabrique } from '../../../tests/outils/mondeFabrique';
import { graineDe, melanger, mulberry32 } from '../../../../kit/tests/stress/commun/prng';
import {
  FORMES, modeleDuJeu, reglesDuModele, surfaceDe, type ProfilDeRegles, type ProprieteDuJeu, type RegleEcrite,
} from './profilsRegles';

export type EmplacementDuConteneur = 'page' | 'cadre' | 'section' | 'instance' | 'autre-page';

export interface ConteneurEcrit {
  /** Le texte du calque `component-name` ; `null` : l'instance n'a pas ce calque. */
  readonly ecrit: string | null;
  readonly regles: readonly RegleEcrite[];
  readonly emplacement: EmplacementDuConteneur;
}

export interface VoisinDeLaPage {
  readonly nom: string;
  readonly conteneur?: ConteneurEcrit;
}

export interface SpecDePage {
  /** L'identifiant du composant ; `ID_DU_COMPOSANT` par défaut. */
  readonly id?: string;
  readonly nom: string;
  readonly type: 'COMPONENT_SET' | 'COMPONENT';
  readonly proprietes: readonly ProprieteDuJeu[];
  readonly conteneurs: readonly ConteneurEcrit[];
  readonly voisins: readonly VoisinDeLaPage[];
}

/** L'identifiant du composant analysé, le même pour toutes les pages. */
export const ID_DU_COMPOSANT = '10:1';

export interface PageFabriquee {
  readonly page: NoeudFabrique;
  readonly composant: NoeudFabrique;
  readonly autrePage: NoeudFabrique;
}

const texte = (id: string, nom: string, caracteres: string): NoeudFabrique => noeud(id, 'TEXT', { name: nom, characters: caracteres });

const maitreDeRegle = (): NoeudFabrique => {
  const maitre = noeud('maitre-regle', 'COMPONENT', { name: 'Type=@prop' }, []);
  noeud('jeu-regle', 'COMPONENT_SET', { name: '.ruleItem' }, [maitre]);
  return maitre;
};

function instanceDeRegle(regle: RegleEcrite, id: string, maitre: NoeudFabrique): NoeudFabrique {
  const enfants: NoeudFabrique[] = [texte(`${id}:tag`, `@${regle.tag}`, `@${regle.tag}`)];
  if (regle.tag === 'prop' || regle.tag === 'boolean' || regle.tag === 'default') enfants.push(texte(`${id}:prop`, 'prop', regle.cible ?? ''));
  if (regle.tag === 'icons') {
    enfants.push(texte(`${id}:icon`, 'icon', regle.icone ?? ''), noeud(`${id}:modifiable`, 'FRAME', { name: 'modifiable', visible: true }, []), noeud(`${id}:strict`, 'FRAME', { name: 'strict', visible: false }, []));
  } else enfants.push(texte(`${id}:content`, 'content', regle.contenu));
  return noeud(id, 'INSTANCE', { name: '.ruleItem', getMainComponentAsync: async () => maitre, variantProperties: {} }, enfants);
}

function conteneurFabrique(conteneur: ConteneurEcrit, id: string, maitre: NoeudFabrique): NoeudFabrique {
  const nom = conteneur.ecrit === null ? [] : [noeud(`${id}:cadre`, 'FRAME', { name: 'nom' }, [texte(`${id}:nom`, 'component-name', conteneur.ecrit)])];
  const instance = noeud(id, 'INSTANCE', { name: '.componentRules', getMainComponentAsync: async () => null }, [
    ...nom, ...conteneur.regles.map((regle, rang) => instanceDeRegle(regle, `${id}:r${rang}`, maitre)),
  ]);
  if (conteneur.emplacement === 'cadre') return noeud(`${id}:enveloppe`, 'FRAME', { name: 'Cadre' }, [instance]);
  if (conteneur.emplacement === 'section') return noeud(`${id}:enveloppe`, 'SECTION', { name: 'Section' }, [instance]);
  if (conteneur.emplacement === 'instance') return noeud(`${id}:enveloppe`, 'INSTANCE', { name: 'Card', getMainComponentAsync: async () => null }, [instance]);
  return instance;
}

export function construireLaPage(spec: SpecDePage): PageFabriquee {
  const maitre = maitreDeRegle();
  const { definitions } = surfaceDe(spec.proprietes);
  const composant = noeud(spec.id ?? ID_DU_COMPOSANT, spec.type, { name: spec.nom, key: 'cle-du-composant', componentPropertyDefinitions: definitions }, []);
  const voisins = spec.voisins.map((voisin, rang) => noeud(`20:${rang}`, 'COMPONENT_SET', { name: voisin.nom, key: `cle-voisin-${rang}`, componentPropertyDefinitions: {} }, []));
  const sur = (conteneurs: readonly { conteneur: ConteneurEcrit; id: string }[], emplacement: (e: EmplacementDuConteneur) => boolean) =>
    conteneurs.filter(({ conteneur }) => emplacement(conteneur.emplacement)).map(({ conteneur, id }) => conteneurFabrique(conteneur, id, maitre));
  const tous = [
    ...spec.conteneurs.map((conteneur, rang) => ({ conteneur, id: `30:${rang}` })),
    ...spec.voisins.flatMap((voisin, rang) => (voisin.conteneur ? [{ conteneur: voisin.conteneur, id: `40:${rang}` }] : [])),
  ];
  const page = noeud('0:1', 'PAGE', { name: 'Composants' }, [composant, ...voisins, ...sur(tous, (e) => e !== 'autre-page')]);
  const autrePage = noeud('0:2', 'PAGE', { name: 'Autre page' }, sur(tous, (e) => e === 'autre-page'));
  return { page, composant, autrePage };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Bases

/** La page d'un profil : le composant de la forme, un conteneur qui écrit son nom avec toutes les règles du modèle, et des voisins. */
export function specDuProfil(profil: ProfilDeRegles): SpecDePage {
  const forme = FORMES[profil.forme];
  const regles = reglesDuModele(modeleDuJeu(forme.composant, forme.proprietes), { marquees: !profil.redigees, ecriture: profil.ecriture });
  const voisinsRegles: RegleEcrite[] = [{ tag: 'usage', contenu: 'Usage du voisin.' }, { tag: 'icons', contenu: '', icone: 'Icon' }];
  const voisins = profil.composants === 1 ? [] : [
    { nom: `${forme.composant} Group`, conteneur: { ecrit: `${forme.composant} Group`, regles: voisinsRegles, emplacement: 'page' as const } },
    { nom: 'Tooltip', conteneur: { ecrit: 'Tooltip', regles: voisinsRegles, emplacement: 'page' as const } },
  ];
  return { nom: forme.composant, type: 'COMPONENT_SET', proprietes: forme.proprietes, conteneurs: [{ ecrit: forme.composant, regles, emplacement: 'page' }], voisins };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Lecture

export interface LectureDeLaPage {
  readonly releve: ReleveDesRegles;
  readonly scan: ExtractedRules;
  /** C43 et C45, puis les points du scan traduits par le moteur : l'ordre du sandbox. */
  readonly constats: Constat[];
  readonly modeles: ReadonlyMap<string, ModeleDeRegles>;
}

export async function lireLaPage(spec: SpecDePage): Promise<LectureDeLaPage> {
  const { page, composant } = construireLaPage(spec);
  const { surface } = surfaceDe(spec.proprietes);
  const releve = await lireLesRegles(composant as never, surface);
  const scan = await extractRules(composant as never, page as never);
  const moteur = { warnings: scan.warnings, parties: partiesDe(scan.warnings), localisations: localisationsDe(scan.warnings) };
  retenirLesModeles(releve);
  const desRegles = constatsDeRegles(releve);
  return { releve, scan, constats: sansLesDoublonsDuMoteur([...desRegles, ...constatsDuMoteur(moteur as never)]), modeles: new Map(modelesDeLAnalyse()) };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Variantes (relations métamorphiques)

export interface Variante {
  /** Mélange l'ordre des règles de chaque conteneur et des voisins avec cette graine. */
  readonly melange?: number;
  /** Met en capitales le nom de propriété des cibles `@prop` et `@boolean`. */
  readonly casse?: boolean;
}

const enCapitales = (regle: RegleEcrite): RegleEcrite => {
  if (regle.cible === undefined || (regle.tag !== 'prop' && regle.tag !== 'boolean')) return regle;
  const [axe, ...reste] = regle.cible.split('.');
  return { ...regle, cible: [axe.toUpperCase(), ...reste].join('.') };
};

export function appliquerLaVariante(spec: SpecDePage, variante: Variante): SpecDePage {
  const melange = (id: string) => <T>(liste: readonly T[]): T[] => (variante.melange === undefined ? [...liste] : melanger(mulberry32(graineDe(variante.melange, id)), liste));
  const conteneur = (c: ConteneurEcrit, id: string): ConteneurEcrit => ({ ...c, regles: melange(id)(c.regles).map((regle) => (variante.casse ? enCapitales(regle) : regle)) });
  return {
    ...spec,
    conteneurs: melange('conteneurs')(spec.conteneurs.map((c, rang) => conteneur(c, `c${rang}`))),
    voisins: melange('voisins')(spec.voisins.map((v, rang) => ({ ...v, ...(v.conteneur ? { conteneur: conteneur(v.conteneur, `v${rang}`) } : {}) }))),
  };
}
