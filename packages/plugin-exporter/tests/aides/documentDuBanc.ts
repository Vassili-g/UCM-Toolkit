/**
 * Un composant généré, fixé, et son export par le moteur sur le double de Figma du socle. Le banc des pièces et le test du double s'en
 * servent : le même document passe par les mêmes mains.
 */
import { handleExportComponent } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import { oublierLIndexDuDocument } from 'ucm-plugin-socle/src/composant/contract/composedComponents';
import { generer, tirerSpec } from '../../../plugin-socle/tests/generateur/generateur';
import { doubleDuDocument } from '../../../plugin-socle/tests/generateur/double';
import type { DocumentGenere } from '../../../plugin-socle/tests/generateur/types';

export type Anatomie = 'texte' | 'icone' | 'indicateur' | 'anneau' | 'separateur';

/** Même graine, même spec, quel que soit l'ordre des tests. Un axe de taille (`Small`, `Large`), ou un wrapper de taille exposé pour une construction `wrapper…`, et, avec `variantes: 2`, un axe `Configuration`. */
export function composantDuBanc(anatomie: Anatomie[], construction: string[] = ['direct'], variantes: 1 | 2 = 1): DocumentGenere {
  const spec = tirerSpec(4242, 1);
  spec.nom = 'Compose';
  spec.anatomie = anatomie;
  spec.construction = construction;
  spec.variantes = variantes;
  spec.profondeur = 1;
  if (construction.some((c) => c.startsWith('wrapper'))) {
    spec.axes = spec.axes.filter((axe) => axe.role !== 'taille');
    spec.wrapperTaille = { nom: 'Size', valeur: 'Medium', commun: false };
  } else {
    spec.axes = [{ nom: 'Size', role: 'taille', valeurs: ['Small', 'Large'] }];
    spec.wrapperTaille = undefined;
  }
  return generer(4242, spec);
}

/** Monte le double sur `globalThis.figma`, exporte, et rend l'état d'avant. */
export async function exporterLeDocument(doc: DocumentGenere) {
  const double = doubleDuDocument(doc);
  const precedent = (globalThis as { figma?: unknown }).figma;
  (globalThis as { figma?: unknown }).figma = double.figma;
  oublierLIndexDuDocument();
  try {
    const sortie = await handleExportComponent();
    return { double, sortie, contrat: JSON.parse(sortie.content) };
  } finally {
    (globalThis as { figma?: unknown }).figma = precedent;
    oublierLIndexDuDocument();
  }
}
