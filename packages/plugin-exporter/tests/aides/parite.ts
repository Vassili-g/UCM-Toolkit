/**
 * Le banc de parité : un export dans la portée d'analyse doit produire le même
 * contrat qu'un export qui ne garde rien.
 *
 * Il se pose sur le chemin d'appel de `figmaFaux.handleExportComponent`, comme
 * les lois : chaque scénario qui passe par là y est soumis, y compris ceux
 * qu'on ajoutera.
 */
import assert from 'node:assert/strict';
import exporterLeComposant, {
  analyserLeComposant,
  getSelectedComponent,
  type ComponentExport,
} from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import { remplacerLesRequetesPourLeBanc } from 'ucm-plugin-socle/src/composant/analyse/proprietesEtEtats';
import { elideContract } from 'ucm-plugin-socle/src/composant/contract/elideNeutrals';
import { calculerLAnalyse } from 'ucm-plugin-socle/src/composant/analyse/resultat';
import { publierLeContrat } from 'ucm-plugin-socle/src/composant/contract/publication';
import { publierAvant } from '../../../plugin-socle/tests/aides/cheminAvantLaPublication';
import { dansUnePorteeDAnalyse, desactiverLaPorteePourLeBanc } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';
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
  await verifierLeResultatInterne(avecPortee, contexte);
}

/**
 * Réanalyse la sélection et compare le résultat interne à la sortie publiée,
 * champ à champ et dans l'ordre : messages, parties, localisations, imbriqués,
 * `props` et `stateModel` du contrat, codes de diagnostic et couverture
 * portable. Le contrat de cette seconde analyse doit être celui de la première,
 * hors date.
 */
export async function verifierLeResultatInterne(sortie: ComponentExport, contexte: string): Promise<void> {
  const resultat = await analyserLeComposant();
  assert.equal(resultat.etat, 'complete', `${contexte} : l'analyse sans budget est complète`);
  if (resultat.etat !== 'complete') return;
  const interne = resultat.interne;
  assert.ok(interne, `${contexte} : le résultat interne accompagne l'export`);
  if (!interne) return;
  assert.equal(sansDate(resultat.export.content), sansDate(sortie.content), `${contexte} : contrat hors date`);
  assert.deepEqual(interne.warnings, sortie.warnings, `${contexte} : warnings`);
  assert.deepEqual([...interne.parties], [...sortie.parties], `${contexte} : parties`);
  assert.deepEqual([...interne.localisations], [...sortie.localisations], `${contexte} : localisations`);
  assert.deepEqual(
    [...interne.localisationsDeclarees],
    [...sortie.localisationsDeclarees],
    `${contexte} : localisations déclarées`,
  );
  assert.deepEqual(interne.imbriques, sortie.imbriques, `${contexte} : imbriqués`);
  assert.deepEqual(interne.couverture, { etat: 'complete' }, `${contexte} : couverture`);

  const contrat = JSON.parse(sortie.content);
  const lisible = JSON.parse(JSON.stringify(
    elideContract({ props: interne.props, stateModel: interne.stateModel, intent: interne.rules.intent }, []),
  ));
  assert.deepEqual(
    { props: contrat.props, stateModel: contrat.stateModel, intent: contrat.intent },
    { props: lisible.props, stateModel: lisible.stateModel, intent: lisible.intent },
    `${contexte} : props, stateModel et intention du contrat`,
  );
  assert.deepEqual(
    contrat.meta.diagnostics.map((diagnostic: { code: string; message: string }) => [diagnostic.code, diagnostic.message]),
    interne.warnings.map((message) => [
      interne.projectionWarnings.has(message) ? 'UCM_PORTABLE_PROJECTION_WARNING' : 'UCM_EXPORT_NOTICE',
      message,
    ]),
    `${contexte} : codes de diagnostic`,
  );
  assert.equal(
    contrat.meta.coverage.portable,
    interne.projectionWarnings.size > 0 ? 'partial' : 'complete',
    `${contexte} : couverture portable`,
  );
}

/**
 * Publie un même résultat interne avec `publierLeContrat` et avec la copie de
 * l'ancienne publication (`cheminAvantLaPublication.ts`), puis compare les deux
 * `ComponentExport` : contrat hors date, messages, parties, localisations et
 * imbriqués, dans l'ordre.
 */
export async function verifierLaPublication(contexte: string): Promise<void> {
  await dansUnePorteeDAnalyse({}, async () => {
    const interne = await calculerLAnalyse(async () => {}, getSelectedComponent(), figma.currentPage);
    const nouveau = await publierLeContrat(interne, async () => {}, () => {});
    const avant = await publierAvant(interne, async () => {}, () => {});
    assert.deepEqual(
      sortieComparable(nouveau),
      sortieComparable(avant),
      `${contexte} : la publication de publierLeContrat diffère de l'ancienne publication`,
    );
  });
}
