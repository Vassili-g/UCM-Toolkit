/** Les textes de la fiche d'une variable : l'inspecteur actuel et les constats de chaîne. */
import type { NatureDeConstat } from '../../diagnostics';

export const TEXTES_FICHE = {
  // Inspecteur
  inspecteur: 'Inspecteur',
  aucunToken: 'Choisissez une variable par son nom pour l’inspecter.',
  valeurTerminale: 'Valeur terminale',
  contexteSimule: 'Contexte simulé',
  chaineDeResolution: 'Chaîne de résolution',
  etape: (rang: number) => `Étape ${rang}`,
  modeEtOrigine: (mode: string, origine: string) => `${mode} · ${origine}`,
  surcharge: (collection: string) => `surcharge de ${collection}`,
  valeursParMode: 'Valeurs par mode',
  provenance: 'Provenance',
  identifiant: 'Identifiant',
  clePubliee: 'Clé publiée',
  collection: 'Collection',
  description: 'Description',
  portees: 'Portées',
  syntaxe: 'Syntaxe de code',
  locale: 'Locale',
  distanteBibliotheque: 'Distante',
  masquee: 'Masquée à la publication',
  aucune: 'Aucune',
  copier: 'Copier',
  copies: {
    nom: 'Nom Figma',
    valeur: 'Valeur',
    hexa: 'Hexadécimal',
    composantes: 'Composantes',
    chaine: 'Chaîne',
    source: 'Donnée source',
    reference: 'Référence publiée',
  },
  copieReussie: (quoi: string) => `Copié : ${quoi}`,
  copieArrondie: (hexa: string) => `Copié : ${hexa}. L’hexadécimal arrondit les composantes à 8 bits.`,
  copieRefusee: 'Le presse-papiers est refusé. Sélectionnez le texte ci-dessous puis copiez-le.',
  copieImpossible: {
    'non-resolu': 'Aucune valeur : la chaîne n’aboutit pas dans ce contexte.',
    'pas-une-couleur': 'Cette variable n’est pas une couleur.',
    'sans-correspondance': 'Aucune référence publiée vérifiée : importez un tokens.json dans Intégrations.',
  },
  dependantsDirects: (contexte: number, tous: number) => `${contexte} dans ce contexte · ${tous} dans tous les modes chargés`,
  // Constats d'une chaîne : constat, puis geste
  constat: {
    inaccessible: {
      titre: 'Cible inaccessible',
      detail: (nom: string) => `L’alias vise ${nom}, que le relevé n’a pu ni lire ni importer. Sa suppression n’est pas établie.`,
      action: 'Vérifiez que la bibliothèque publie encore cette variable et que vous y avez accès, puis actualisez.',
    },
    'mode-absent': {
      titre: 'Mode absent',
      detail: (nom: string, mode: string) => `${nom} n’a aucune valeur pour le mode ${mode}.`,
      action: 'Donnez une valeur à ce mode dans Figma.',
    },
    cycle: {
      titre: 'Cycle',
      detail: (noms: string) => `La chaîne revient sur elle-même : ${noms}.`,
      action: 'Remplacez l’un de ces alias par une valeur ou une autre cible dans Figma.',
    },
    'type-incompatible': {
      titre: 'Type incompatible',
      detail: (nom: string, attendu: string, obtenu: string) => `${nom} rend ${obtenu} là où ${attendu} est attendu.`,
      action: 'Faites pointer l’alias vers une variable du même type dans Figma.',
    },
    'non-pris-en-charge': {
      titre: 'Valeur non prise en charge',
      detail: (nom: string) => `${nom} porte une valeur que l’explorateur ne sait pas évaluer. Sa donnée source reste lisible.`,
      action: 'Consultez la valeur dans le panneau des variables de Figma.',
    },
    interrompu: {
      titre: 'Chaîne interrompue',
      detail: (etapes: number) => `La chaîne dépasse ${etapes} étapes ; son parcours s’arrête sans conclure à un cycle.`,
      action: 'Raccourcissez la chaîne d’alias dans Figma.',
    },
  } satisfies Record<NatureDeConstat, { titre: string; action: string; detail: (...valeurs: never[]) => string }>,
};

/** Le titre d'un constat de chaîne. */
export function titreDeConstat(nature: NatureDeConstat): string {
  return TEXTES_FICHE.constat[nature].titre;
}
