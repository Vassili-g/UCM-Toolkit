/**
 * Le domaine `structure` : le mode Tokens lit les scopes et les alias de mode des variables du fichier ouvert, sans composant, et
 * écrit les corrections que l'on coche.
 *
 * `lire-structure` rend `structure` : les constats de `controlerLeCatalogue` et de `controlerLIntegriteUcm` du kit sur le
 * catalogue du fichier, et les corrections que ces constats portent. C82 ne propose une création que si le fichier a choisi son
 * écriture dans Nomenclature, et n'omet que les rôles que le fichier n'ignore pas. Un constat ignoré par son identifiant n'est pas
 * rendu, ni sa correction ; une proposition retirée garde le constat sans correction. Hors UCM, ou quand la lecture échoue, les
 * listes sont vides. Le sandbox retient ces corrections, par identifiant : `appliquer-structure` n'écrit que celles-là
 * (`ecriture/structure.ts`), une opération à la fois, analyse comprise (une demande reçue pendant ce temps saute tout en
 * `occupe`). Le lot écrit, `structure-appliquee` part, les corrections retenues sont oubliées et l'analyse d'un composant
 * éventuelle est périmée.
 */
import { controlerLIntegriteUcm, controlerLeCatalogue, type CatalogueDeReference, type Constat, type Correction } from '@ucm-kit/core/controles';
import { CLE_ECRITURE, lireEcriture, lireEntree, type EcritureChoisie } from '@ucm-kit/core/protocoles';
import { ESPACE_ARCHITECT } from '@ucm-kit/core/referentiel';

import { catalogueDuFichier } from '../catalogue';
import { lireLesIgnores, rolesIgnoresDe, separerLesIgnores } from '../ecriture/ignores';
import { ecrireLaStructure, type ResultatDEcritureDeStructure } from '../ecriture/structure';
import { idsDesLocales, lireLesVariables } from '../lecture';
import type { DemandeDeStructure } from '../messages/structure';
import { perimerApresUneEcriture, prendreLaPlaceDUneEcriture } from './analyse';
import { lireLaDeclaration } from './commun';
import type { Contexte, Traiter } from './contexte';
import { portDeLecture } from './lectureDeFigma';

export const TYPES: readonly DemandeDeStructure['type'][] = ['lire-structure', 'appliquer-structure'];

/** Les lectures et les écritures du domaine : le sandbox donne celles de Figma, les tests des doubles. */
export interface Acces {
  /** Le catalogue du fichier ouvert ; `null` hors UCM ou quand la lecture n'aboutit pas. */
  catalogue(contexte: Contexte): Promise<CatalogueDeReference | null>;
  /** L'écriture choisie dans Nomenclature, `null` tant qu'elle n'y est pas rangée, et les clés d'Ignorer du fichier. */
  reglages(contexte: Contexte): Promise<{ readonly ecriture: EcritureChoisie | null; readonly cles: readonly string[] }>;
  ecrire(corrections: readonly Correction[]): Promise<ResultatDEcritureDeStructure>;
}

const ACCES_DE_FIGMA: Acces = {
  async catalogue({ figma }) {
    if (lireLaDeclaration(figma) !== 'ucm') return null;
    const port = portDeLecture(figma);
    const locales = await port.getLocalVariablesAsync();
    const lues = await lireLesVariables(port, locales.map((variable) => variable.id), { annulee: () => false }, idsDesLocales(locales));
    if (!lues) return null;
    return catalogueDuFichier({ collections: [...lues.collections.values()], variables: [...lues.variables.values()] }, 'ucm');
  },
  async reglages({ figma }) {
    const texte = figma.root.getSharedPluginData(ESPACE_ARCHITECT, CLE_ECRITURE);
    const brut = texte ? lireEntree(texte) : undefined;
    return { ecriture: (brut && lireEcriture(brut)) || null, cles: lireLesIgnores(figma) };
  },
  ecrire: (corrections) => ecrireLaStructure(corrections),
};

/** Les corrections du dernier `structure` envoyé, par identifiant. */
let retenues: ReadonlyMap<string, Correction> = new Map();

/** Les sortes que ce domaine écrit ; une autre sorte retenue ne s'y écrit pas. */
export const estDeStructure = (correction: Correction): boolean => correction.sorte === 'scope' || correction.sorte === 'alias-de-mode' || correction.sorte === 'variable';

/** Les constats des deux contrôles, le premier de chaque identifiant. */
function sansDoublon(constats: readonly Constat[]): Constat[] {
  const vus = new Set<string>();
  return constats.filter((constat) => !vus.has(constat.id) && vus.add(constat.id));
}

/** Le traitement du domaine sur des accès donnés. */
export function traiterAvec(acces: Acces): Traiter<DemandeDeStructure> {
  return async (demande, contexte) => {
    if (demande.type === 'lire-structure') {
      let catalogue: CatalogueDeReference | null = null;
      try { catalogue = await acces.catalogue(contexte); } catch { catalogue = null; }
      let constats: Constat[] = [];
      if (catalogue) {
        let reglages: Awaited<ReturnType<Acces['reglages']>> = { ecriture: null, cles: [] };
        try { reglages = await acces.reglages(contexte); } catch { /* sans réglages : aucune création, aucun constat écarté */ }
        const tous = sansDoublon([
          ...controlerLeCatalogue(catalogue),
          ...controlerLIntegriteUcm(catalogue, { ecriture: reglages.ecriture, rolesIgnores: rolesIgnoresDe(reglages.cles) }),
        ]);
        constats = separerLesIgnores(tous, reglages.cles).visibles;
      }
      const corrections = constats.flatMap((constat) => (constat.correction ? [constat.correction] : []));
      retenues = new Map(corrections.map((correction) => [correction.id, correction] as const));
      contexte.envoyer({ type: 'structure', demande: demande.demande, constats, corrections });
      return;
    }
    await appliquer(demande, acces, contexte);
  };
}

async function appliquer(demande: Extract<DemandeDeStructure, { type: 'appliquer-structure' }>, acces: Acces, contexte: Contexte): Promise<void> {
  const ids = [...new Set(demande.ids)];
  const place = await prendreLaPlaceDUneEcriture({ sujet: 'structure', generation: 0 });
  if ('occupe' in place) {
    contexte.envoyer({ type: 'structure-appliquee', demande: demande.demande, ecrites: 0, sautees: ids.map((id) => ({ id, motif: 'occupe' })) });
    return;
  }
  try {
    const sautees: { id: string; motif: string }[] = [];
    const aEcrire: Correction[] = [];
    for (const id of ids) {
      const correction = retenues.get(id);
      if (!correction) sautees.push({ id, motif: 'correction-inconnue' });
      else if (estDeStructure(correction)) aEcrire.push(correction);
      else sautees.push({ id, motif: 'non-pris-en-charge' });
    }
    let ecrit = false;
    let ecrites = 0;
    if (aEcrire.length > 0) {
      try {
        const lot = await acces.ecrire(aEcrire);
        ecrites = lot.ecrites.length;
        ecrit = ecrites > 0;
        sautees.push(...lot.sautees);
      } catch {
        // Le lot a pu écrire avant de lever : l'analyse se périme dans tous les cas.
        ecrit = true;
        sautees.push(...aEcrire.map(({ id }) => ({ id, motif: 'erreur' })));
      }
    }
    retenues = new Map();
    contexte.envoyer({ type: 'structure-appliquee', demande: demande.demande, ecrites, sautees });
    if (ecrit) perimerApresUneEcriture(contexte);
  } finally {
    place.liberer();
  }
}

export const traiter = traiterAvec(ACCES_DE_FIGMA);
