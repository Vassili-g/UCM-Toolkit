/**
 * Rend `donnees-referentiel.js` : les parties de la vue illustrée que porte le
 * référentiel (collections, table en dossiers, libellés, recommandations,
 * outils). Le script n'écrit le fichier que lancé directement ; le test
 * `tests/vueIllustree.test.ts` appelle la fonction et compare au fichier commité.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  CIBLES_DES_COLLECTIONS,
  COLLECTIONS,
  COLLECTIONS_SANS_PORTEE,
  COULEUR_DU_TEXTE_DES_BOUTONS,
  DEFINITIONS_DES_VARIABLES,
  GARANTIES,
  NIVEAUX_D_ELEVATION_DU_THEME,
  PRODUITS,
  RECOMMANDATIONS,
  TEXTE_DES_BOUTONS_PAR_DEFAUT,
  cranDeLaVariable,
  type ModeDuTheme,
  type SensDuTheme,
  type TexteDesBoutons,
  type VariableDuTheme,
} from '@ucm-kit/core/referentiel';

const MODES: readonly ModeDuTheme[] = ['light', 'dark'];
const SENS: readonly SensDuTheme[] = ['normal', 'inverse'];
/** Les produits qui lisent ou écrivent les tokens, dans l'ordre où la page les présente. */
const PRODUITS_MONTRES = ['palettes', 'explorateur', 'architect', 'exporter', 'cli'] as const;

/** Le texte du bouton dans un thème et un sens : le sens inversé prend l'autre couleur que le défaut du thème. */
function texteDuBouton(mode: ModeDuTheme, sens: SensDuTheme): TexteDesBoutons {
  const parDefaut = TEXTE_DES_BOUTONS_PAR_DEFAUT[mode];
  const autre: TexteDesBoutons = parDefaut === 'blanc' ? 'noir' : 'blanc';
  return sens === 'normal' ? parDefaut : autre;
}

/** Un cran numérique, le nom du texte du bouton, ou `null` quand la variable ne vise aucun cran. */
function cellule(variable: VariableDuTheme, mode: ModeDuTheme, sens: SensDuTheme): string | null {
  const cran = cranDeLaVariable(variable, mode, sens);
  if (cran === undefined) return null;
  return cran === 'texteDesBoutons' ? texteDuBouton(mode, sens) : String(cran);
}

function variablesDeLaTable() {
  const garantiesParVariable = (variable: string) => GARANTIES.filter((garantie) => garantie.premier.variable === variable).map((garantie) => garantie.numero);
  return DEFINITIONS_DES_VARIABLES.map((definition) => ({
    id: definition.id,
    libelle: definition.libelle.fr,
    definition: definition.definition.fr,
    garanties: garantiesParVariable(definition.id),
    crans: Object.fromEntries(MODES.flatMap((mode) => SENS.map((sens) => [`${mode}-${sens}`, cellule(definition.id, mode, sens)]))),
  }));
}

function donnees() {
  return {
    collections: COLLECTIONS.map((nom) => ({
      nom,
      cibles: CIBLES_DES_COLLECTIONS[nom],
      sansPortee: (COLLECTIONS_SANS_PORTEE as readonly string[]).includes(nom),
    })),
    textesDesBoutonsParDefaut: TEXTE_DES_BOUTONS_PAR_DEFAUT,
    couleursDuTexteDesBoutons: COULEUR_DU_TEXTE_DES_BOUTONS,
    niveauxDElevation: NIVEAUX_D_ELEVATION_DU_THEME,
    variables: variablesDeLaTable(),
    garanties: GARANTIES.map((garantie) => ({ numero: garantie.numero, seuil: garantie.seuil })),
    recommandations: RECOMMANDATIONS.map((recommandation) => ({
      id: recommandation.id,
      regle: recommandation.regle.fr,
      preuve: recommandation.preuve.fr,
      parametres: recommandation.parametres,
    })),
    outils: PRODUITS_MONTRES.map((id) => {
      const produit = PRODUITS.find((candidat) => candidat.id === id);
      if (!produit) throw new Error(`Produit absent du référentiel : ${id}`);
      return { id, libelle: produit.libelle.fr, definition: produit.definition.fr };
    }),
  };
}

/** Le contenu exact de `donnees-referentiel.js`. */
export function genererDonneesReferentiel(): string {
  return `// Généré par generer-donnees-referentiel.ts ; ne pas modifier à la main.\nwindow.REFERENTIEL = ${JSON.stringify(donnees(), null, 1)};\n`;
}

if (require.main === module) {
  const sortie = path.join(__dirname, 'donnees-referentiel.js');
  writeFileSync(sortie, genererDonneesReferentiel());
  console.log(`Écrit : ${sortie}`);
}
