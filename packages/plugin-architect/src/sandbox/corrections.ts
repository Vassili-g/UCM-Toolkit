/**
 * Le domaine `corrections` : écrire un lot de corrections de l'analyse courante,
 * et sélectionner les layers d'un constat.
 *
 * `appliquer-corrections` retrouve chaque identifiant dans l'analyse courante.
 * Une identité qui n'est plus la courante, ou une analyse périmée, n'écrit rien
 * et saute tout (`analyse-perimee`). Une correction de sorte `liaison` ou
 * `regles` ou `nom-de-valeur` s'écrit (`ecriture/liaisons.ts`, `ecriture/noms-de-valeurs.ts`) ; les autres sortes sont sautées
 * (`non-pris-en-charge`) jusqu'à leurs lots. Une seule opération court à la
 * fois, analyse comprise : une demande reçue pendant ce temps rend `occupe`. Le
 * lot écrit, `corrections-appliquees` part, puis l'analyse est périmée.
 *
 * `servir-de-modele` rend `modele-propose` : les constats C24 de `proposerLaPropagation`
 * du kit, dont les corrections sont retenues dans l'analyse courante pour
 * `appliquer-corrections`, et `retires`, les C81 de ce modèle. Le variant vient
 * de la section Variants ou des faits d'un C81. Analyse périmée : aucun constat. Rien ne s'écrit.
 *
 * `selectionner` et `servir-de-modele` ignorent une identité qui n'est pas celle de l'analyse courante.
 */
import { proposerLaPropagation, type Correction } from '@ucm-kit/core/controles';

import { ecrireLeLot, type ResultatDUnLot } from '../ecriture/liaisons';
import { selectionnerLesLayers } from '../ecriture/selection';
import type { DemandeDeCorrections } from '../messages/corrections';
import {
  analyseCourante, catalogueDeLAnalyse, constatDeLAnalyse, correctionsDeLAnalyse, perimerApresUneEcriture, prendreLaPlaceDUneEcriture, releveDeLAnalyse, retenirLaPropagation,
} from './analyse';
import { retenirLaSelectionDuPlugin } from './commun';
import type { Contexte, Traiter } from './contexte';

export const TYPES: readonly DemandeDeCorrections['type'][] = ['appliquer-corrections', 'selectionner', 'servir-de-modele'];

/** Les écritures du domaine : le sandbox donne celles de Figma, les tests des doubles. */
export interface Ecritures {
  lot(corrections: readonly Correction[]): Promise<ResultatDUnLot>;
  selectionner(layers: readonly string[]): Promise<unknown>;
}

const ECRITURES_DE_FIGMA: Ecritures = {
  lot: (corrections) => ecrireLeLot(corrections),
  selectionner: (layers) => selectionnerLesLayers(layers, retenirLaSelectionDuPlugin),
};

/** Pourquoi une correction est sautée, au bout de « car ». */
const RAISONS: Readonly<Record<string, string>> = {
  'analyse-perimee': 'l’analyse est périmée',
  'correction-inconnue': 'l’analyse ne la contient plus',
  'non-pris-en-charge': 'ce genre de correction n’est pas encore pris en charge',
  'objet-change': 'le composant a changé depuis l’analyse',
  'fait-faux': 'ce que l’analyse avait lu n’est plus vrai',
  'cible-introuvable': 'la variable cible est introuvable',
  'non-ucm': 'le fichier ne déclare plus UCM',
  'instance-remplie': 'l’instance de règles contient déjà des règles',
  erreur: 'Figma a refusé l’écriture',
};

const pluriel = (nombre: number): string => (nombre > 1 ? 's' : '');

/**
 * La ligne de réussite : ce qui est écrit, puis les corrections sautées et
 * pourquoi. `8 layers liés, 1 instance de règles créée` quand rien n'est sauté.
 */
export function resumeDuLot(liaisons: number, regles: number, sautees: readonly { motif: string }[], noms = 0): string {
  const ecrit = [
    liaisons > 0 ? `${liaisons} layer${pluriel(liaisons)} lié${pluriel(liaisons)}` : '',
    regles > 0 ? `${regles} instance${pluriel(regles)} de règles créée${pluriel(regles)}` : '',
    noms > 0 ? `${noms} valeur${pluriel(noms)} de variante renommée${pluriel(noms)}` : '',
  ].filter((morceau) => morceau !== '').join(', ');
  if (sautees.length === 0) return ecrit === '' ? 'Aucune correction écrite' : ecrit;
  const parMotif = new Map<string, number>();
  for (const { motif } of sautees) parMotif.set(motif, (parMotif.get(motif) ?? 0) + 1);
  const raisons = [...parMotif].map(([motif, nombre]) => `${nombre} car ${RAISONS[motif] ?? motif}`).join(', ');
  return `${ecrit === '' ? 'Aucune correction écrite' : ecrit}. ${sautees.length} correction${pluriel(sautees.length)} sautée${pluriel(sautees.length)} : ${raisons}.`;
}

/** Le traitement du domaine sur des écritures données. */
export function traiterAvec(ecritures: Ecritures): Traiter<DemandeDeCorrections> {
  return async (demande, contexte) => {
    if (demande.type === 'selectionner') {
      const courante = analyseCourante();
      if (courante && courante.sujet === demande.analyse.sujet && courante.generation === demande.analyse.generation) await ecritures.selectionner(demande.layers);
      return;
    }
    if (demande.type === 'servir-de-modele') {
      await servirDeModele(demande, contexte);
      return;
    }
    await appliquer(demande, ecritures, contexte);
  };
}

async function servirDeModele(demande: Extract<DemandeDeCorrections, { type: 'servir-de-modele' }>, contexte: Contexte): Promise<void> {
  const courante = analyseCourante();
  if (!courante || courante.sujet !== demande.analyse.sujet || courante.generation !== demande.analyse.generation) return;
  const place = await prendreLaPlaceDUneEcriture(demande.analyse);
  if ('occupe' in place) {
    contexte.envoyer({ type: 'occupe', analyse: await place.occupe });
    return;
  }
  try {
    const releve = releveDeLAnalyse(demande.analyse);
    const catalogue = catalogueDeLAnalyse(demande.analyse);
    const constats = releve && catalogue ? proposerLaPropagation(releve, catalogue, demande.variant) : [];
    const retenu = retenirLaPropagation(demande.analyse, constats);
    // Les deux C81 qu'un modèle peut porter, couleurs et tailles : la propagation les remplace tous deux.
    const retires = retenu
      ? ['couleurs', 'tailles'].map((sorte) => `C81:${sorte}:${demande.variant}`).filter((id) => constatDeLAnalyse(demande.analyse, id) !== null)
      : [];
    contexte.envoyer({ type: 'modele-propose', analyse: demande.analyse, variant: demande.variant, constats: retenu ? constats : [], retires });
  } finally {
    place.liberer();
  }
}

async function appliquer(demande: Extract<DemandeDeCorrections, { type: 'appliquer-corrections' }>, ecritures: Ecritures, contexte: Contexte): Promise<void> {
  const place = await prendreLaPlaceDUneEcriture(demande.analyse);
  if ('occupe' in place) {
    contexte.envoyer({ type: 'occupe', analyse: await place.occupe });
    return;
  }
  const ids = [...new Set(demande.ids)];
  const sautees: { id: string; motif: string }[] = [];
  const compte = { liaison: 0, regles: 0, 'nom-de-valeur': 0 };
  let ecrit = false;
  try {
    const connues = correctionsDeLAnalyse(demande.analyse);
    if (connues === null) {
      sautees.push(...ids.map((id) => ({ id, motif: 'analyse-perimee' })));
    } else {
      const aEcrire: Correction[] = [];
      for (const id of ids) {
        const correction = connues.get(id);
        if (!correction) sautees.push({ id, motif: 'correction-inconnue' });
        else if (correction.sorte === 'liaison' || correction.sorte === 'regles' || correction.sorte === 'nom-de-valeur') aEcrire.push(correction);
        else sautees.push({ id, motif: 'non-pris-en-charge' });
      }
      if (aEcrire.length > 0) {
        try {
          const lot = await ecritures.lot(aEcrire);
          for (const id of lot.ecrites) {
            const sorte = connues.get(id)?.sorte;
            if (sorte === 'liaison' || sorte === 'regles' || sorte === 'nom-de-valeur') compte[sorte] += 1;
          }
          ecrit = lot.ecrites.length > 0;
          sautees.push(...lot.sautees);
        } catch {
          // Le lot a pu écrire avant de lever : l'analyse se périme dans tous les cas.
          ecrit = true;
          sautees.push(...aEcrire.map(({ id }) => ({ id, motif: 'erreur' })));
        }
      }
    }
    contexte.envoyer({
      type: 'corrections-appliquees',
      analyse: demande.analyse,
      ecrites: compte.liaison + compte.regles + compte['nom-de-valeur'],
      sautees,
      resume: resumeDuLot(compte.liaison, compte.regles, sautees, compte['nom-de-valeur']),
    });
    if (ecrit) perimerApresUneEcriture(contexte);
  } finally {
    place.liberer();
  }
}

export const traiter = traiterAvec(ECRITURES_DE_FIGMA);
