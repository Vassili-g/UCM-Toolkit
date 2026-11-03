/**
 * Les opérateurs de rôles du stress test F2 (R1 à R4, constat C82 `variable-absente`). Ils retirent un rôle de `theme` avec une
 * écriture choisie (R1) ou sans (R2), une palette réduite à une ou deux variables (R3), un rôle ignoré dans tout le fichier (R4).
 *
 * Chaque cas copie le thème de base de P0, retire ou déplace des variables et rend l'oracle du plan (section 3.3). La création
 * est exacte quand le sens se lit dans les alias des rôles qui restent (section 2.2), sinon le constat n'a pas de correction et
 * dit sa raison. Retirer un rôle d'une palette que `components` vise laisse aussi un alias sans cible, et l'oracle déclare ces
 * `alias-supprime`, que la règle de C63 produit, et R3 choisit une palette sans composant pour les éviter.
 */
import {
  NIVEAUX_D_ELEVATION_DU_THEME, VARIABLES_DE_PALETTE, VARIABLES_DU_NEUTRE, VARIABLES_GLOBALES, type VariableDuTheme,
} from '../../../src/emplois/dossiers.js';
import { echantillon, graineDe, mulberry32 } from '../commun/prng.js';
import type { ConstatAttendu } from '../commun/types.js';
import { MODES_DU_THEME, paletteDeCarte, type PaletteDeCarte, type RoleDeCarte } from './carte.js';
import {
  PALETTE_INVERSE, PALETTE_NORMALE, PALETTE_SANS_COMPOSANT, Registre, attenduDeVariableAbsente, attendu, attendusDAliasSupprime,
  cranDeLaCarte, cranDeTable, cranVoisin, memeCranDansLesDeuxSens, nomDuMode,
  type CasDeStructure, type DetailDeCorrection,
} from './cas.js';
import { GRAINE_PAR_DEFAUT, type ThemeDeBase } from './themeUcm.js';

interface Emplacement { readonly palette: string | null; readonly role: VariableDuTheme }

/** Les 39 rôles de R1 (les 15 de palette en sens normal et en sens inverse, les 4 du neutre, les 3 globales et les 2 élévations). */
function emplacementsDeR1(): Emplacement[] {
  return [
    ...[PALETTE_NORMALE, PALETTE_INVERSE].flatMap((palette) => VARIABLES_DE_PALETTE.map((role): Emplacement => ({ palette, role }))),
    ...VARIABLES_DU_NEUTRE.map((role): Emplacement => ({ palette: 'neutral', role })),
    ...[...VARIABLES_GLOBALES, ...NIVEAUX_D_ELEVATION_DU_THEME.map((niveau): VariableDuTheme => `elevation/${niveau}`)].map((role): Emplacement => ({ palette: null, role })),
  ];
}

const libelleDe = ({ palette, role }: Emplacement): string => `${palette ?? '(globale)'} ${role}`;

/** Les constats d'un rôle retiré, soit le `variable-absente` avec ou sans correction, puis les alias de composant qui n'ont plus de cible. */
function attendusDuRetrait(base: ThemeDeBase, palette: PaletteDeCarte | null, role: RoleDeCarte, raison?: string): { attendus: ConstatAttendu[]; details: DetailDeCorrection[] } {
  const { attendu: absente, detail } = attenduDeVariableAbsente(base, palette, role, raison);
  return { attendus: [absente, ...attendusDAliasSupprime(base, role.cle)], details: detail ? [detail] : [] };
}

export function operateursRoles(base: ThemeDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeStructure[] {
  const registre = new Registre(base, graine);
  const { carte } = base;
  const paletteDe = (id: string | null) => (id === null ? null : paletteDeCarte(carte, id));
  const roleDe = ({ palette, role }: Emplacement): RoleDeCarte => (palette === null ? carte.globales[role] : paletteDeCarte(carte, palette).roles[role]);

  // R1. Un rôle retiré, l'écriture est choisie.
  const emplacements = emplacementsDeR1();
  for (const emplacement of emplacements) {
    const degradation = registre.degrader();
    const role = roleDe(emplacement);
    degradation.retirerLaVariable(role.cle);
    degradation.zone({ palette: emplacement.palette, role: emplacement.role, mode: 'les-deux' });
    const { attendus, details } = attendusDuRetrait(base, paletteDe(emplacement.palette), role);
    registre.ajouter('R1', degradation, { description: `R1 ${libelleDe(emplacement)} retiré, écriture choisie`, attendus, details });
  }

  // R2. Un rôle retiré, aucune écriture choisie. Huit rôles tirés parmi ceux de R1.
  for (const emplacement of echantillon(mulberry32(graineDe(graine, 'R2')), emplacements, 8)) {
    const degradation = registre.degrader();
    const role = roleDe(emplacement);
    degradation.ecriture = null;
    degradation.retirerLaVariable(role.cle);
    degradation.zone({ palette: emplacement.palette, role: emplacement.role, mode: 'les-deux' });
    const { attendus, details } = attendusDuRetrait(base, paletteDe(emplacement.palette), role, 'sans-ecriture');
    registre.ajouter('R2', degradation, { description: `R2 ${libelleDe(emplacement)} retiré, aucune écriture`, attendus, details });
  }

  // R3. Une palette réduite à une variable à une rampe, à deux variables qui visent deux rampes, à une variable sans alias.
  const reduite = paletteDeCarte(carte, PALETTE_SANS_COMPOSANT);
  const autre = paletteDeCarte(carte, 'danger/soft');
  const gardee = reduite.roles['solid/default'];
  const nomDeLaPalette = reduite.id;
  const retirerLesAutres = (degradation: ReturnType<Registre['degrader']>, gardees: readonly VariableDuTheme[]): RoleDeCarte[] => {
    const retires = VARIABLES_DE_PALETTE.filter((role) => !gardees.includes(role)).map((role) => reduite.roles[role]);
    for (const role of retires) degradation.retirerLaVariable(role.cle);
    degradation.zone({ palette: reduite.id, role: '(palette)', mode: 'les-deux' });
    return retires;
  };
  const ajouterR3 = (description: string, degradation: ReturnType<Registre['degrader']>, retires: readonly RoleDeCarte[], raisonDe: (role: RoleDeCarte) => string | undefined, plus: readonly ConstatAttendu[] = []) => {
    const attendus: ConstatAttendu[] = [...plus];
    const details: DetailDeCorrection[] = [];
    for (const role of retires) {
      const { attendu: absente, detail } = attenduDeVariableAbsente(base, reduite, role, raisonDe(role));
      attendus.push(absente);
      if (detail) details.push(detail);
    }
    registre.ajouter('R3', degradation, { description, attendus, details });
  };
  const viseUnCran = (role: RoleDeCarte): boolean => cranDeTable(role.role, 'light', 'normal') !== undefined;

  // Une variable (`solid/default`, 700 dans les deux sens) à une rampe. Un rôle au cran identique dans les deux sens se crée, les autres
  // n'ont aucun vote pour dire le sens.
  {
    const degradation = registre.degrader();
    const retires = retirerLesAutres(degradation, ['solid/default']);
    ajouterR3(`R3 ${nomDeLaPalette} réduite à solid/default, une rampe`, degradation, retires, (role) => (memeCranDansLesDeuxSens(role.role) ? undefined : 'sens-inconnu'));
  }
  // Deux variables qui visent chacune une rampe (`surface/default` vise celle de `danger/soft`). Les rôles à cran n'ont pas de rampe unique.
  {
    const degradation = registre.degrader();
    const retires = retirerLesAutres(degradation, ['solid/default', 'surface/default']);
    const surface = reduite.roles['surface/default'];
    for (const mode of MODES_DU_THEME) degradation.viser(surface.cle, mode, autre.rampes[mode][cranDeLaCarte(surface, mode)].cle);
    ajouterR3(`R3 ${nomDeLaPalette} réduite à solid/default et surface/default, deux rampes`, degradation, retires, (role) => (viseUnCran(role) ? 'prefixes-multiples' : 'sens-inconnu'));
  }
  // Une variable sans alias, donc aucune rampe à suivre. La couleur directe est aussi une valeur directe dans `theme`, dans chaque mode.
  {
    const degradation = registre.degrader();
    const retires = retirerLesAutres(degradation, ['solid/default']);
    for (const mode of MODES_DU_THEME) degradation.ecrireLaValeur(gardee.cle, carte.modes[mode].id, { valeur: { r: 0.2, g: 0.4, b: 0.6, a: 1 } });
    const directes = MODES_DU_THEME.map((mode) => attendu('C82', 'valeur-directe', gardee.nom, nomDuMode(base, mode), 'a-faire'));
    ajouterR3(`R3 ${nomDeLaPalette} réduite à solid/default en couleur directe, aucun alias`, degradation, retires, (role) => (viseUnCran(role) ? 'sans-jumelle' : 'sens-inconnu'), directes);
  }

  // R4. Un rôle ignoré dans tout le fichier. Retiré de dix palettes, déplacé d'un pas dans la dernière, et aucun constat ne le cite.
  for (const role of ['surface/subtle', 'solid/hover', 'page/divider'] as const) {
    const degradation = registre.degrader();
    degradation.rolesIgnores = [role];
    for (const palette of carte.palettes) {
      const variable = palette.roles[role];
      if (palette.id !== PALETTE_NORMALE) {
        degradation.retirerLaVariable(variable.cle);
        continue;
      }
      for (const mode of MODES_DU_THEME) degradation.viser(variable.cle, mode, palette.rampes[mode][cranVoisin(cranDeLaCarte(variable, mode))].cle);
    }
    degradation.zone({ palette: null, role, mode: 'les-deux' });
    registre.ajouter('R4', degradation, { description: `R4 ${role} ignoré, retiré de ${carte.palettes.length - 1} palettes et déplacé d'un pas dans ${PALETTE_NORMALE}`, attendus: [] });
  }
  return registre.cas;
}
