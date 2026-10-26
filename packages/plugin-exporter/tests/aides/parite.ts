/**
 * Le banc de parité : un export dans la portée d'analyse doit produire le même
 * contrat qu'un export qui ne garde rien.
 *
 * Il se pose sur le chemin d'appel de `figmaFaux.handleExportComponent`, comme
 * les lois : chaque scénario qui passe par là y est soumis, y compris ceux
 * qu'on ajoutera.
 */
import assert from 'node:assert/strict';
import exporterLeComposant, { type ComponentExport } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import { remplacerLesRequetesPourLeBanc } from 'ucm-plugin-socle/src/composant/analyse/proprietesEtEtats';
import { desactiverLaPorteePourLeBanc } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';
import { modeleDEtatsAvant, modeleDeProprietesAvant } from '../../../plugin-socle/tests/aides/cheminAvantLesRequetes';

/** Le contrat sérialisé, date d'export remplacée par une valeur fixe. */
export function sansDate(content: string): string {
  return content.replace(/("exportedAt"\s*:\s*)"[^"]*"/, '$1"-"');
}

/** Les entrées des Map gardent l'ordre d'émission dans la comparaison. */
export function sortieComparable(resultat: ComponentExport) {
  return {
    ...resultat,
    content: sansDate(resultat.content),
    parties: [...resultat.parties],
    localisations: [...resultat.localisations],
    localisationsDeclarees: [...resultat.localisationsDeclarees],
  };
}

/**
 * Réexporte la sélection avec le chemin d'avant les requêtes pures (modèles de
 * propriétés et d'états) et compare toutes les sorties : contrat hors date,
 * messages, parties et localisations, dans leur ordre.
 */
export async function verifierLaPariteDesRequetes(nouveau: ComponentExport, contexte: string): Promise<void> {
  remplacerLesRequetesPourLeBanc({ modeleDeProprietes: modeleDeProprietesAvant, modeleDEtats: modeleDEtatsAvant });
  let avant: ComponentExport;
  try {
    avant = await exporterLeComposant();
  } finally {
    remplacerLesRequetesPourLeBanc({});
  }
  assert.deepEqual(
    sortieComparable(nouveau),
    sortieComparable(avant),
    `${contexte} : le contrat produit par les requêtes pures diffère de celui de l'ancien chemin`,
  );
}

/** Réexporte la sélection sans mémoire et compare toutes les sorties. */
export async function verifierLaParite(avecPortee: ComponentExport, contexte: string): Promise<void> {
  desactiverLaPorteePourLeBanc(true);
  let sansPortee: ComponentExport;
  try {
    sansPortee = await exporterLeComposant();
  } finally {
    desactiverLaPorteePourLeBanc(false);
  }
  assert.deepEqual(
    sortieComparable(avecPortee),
    sortieComparable(sansPortee),
    `${contexte} : le contrat produit dans la portée d'analyse diffère de celui produit sans mémoire`,
  );
  await verifierLaPariteDesRequetes(avecPortee, contexte);
}
