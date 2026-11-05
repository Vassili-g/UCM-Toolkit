/**
 * Les opérateurs de modes du stress test F2 (M1 à M4, constats C60 et C82 `mode-du-theme`). Ils dégradent un rôle aliasé vers l'autre branche
 * de mode, au cran de cette branche (M1) ou au cran de son propre mode (M3), la correction impossible (M2), les modes de `theme`
 * renommés, retirés ou ajoutés (M4).
 *
 * Le mode d'une rampe de `brands` se lit à deux places. Dans la place « chemin », les modes de la collection sont des modes de
 * marque et le mode n'est qu'un segment du nom (`primary/dark/300`), comme dans le thème de base. Dans la place « modes », la
 * collection a les modes Light et Dark et le nom redit le mode. M1 les couvre toutes deux. Les cas de la place « chemin » dépendent
 * de Q-F2-4 (le plan y répond « oui » à titre provisoire) et restent `mesure`. Le plan ne dit pas la place de M2 et de M3 ; ils
 * prennent la place « modes », pour que leurs écarts ne se confondent pas avec celui de l'hypothèse 1.
 */
import type { ModeDuTheme } from '../../../src/emplois/dossiers.js';
import { MODES_DU_THEME, paletteDeCarte } from './carte.js';
import {
  PALETTE_NORMALE, Registre, attendu, autreMode, cleComplete, cranDeLaCarte, nomDuMode,
  type CasDeStructure, type Degradation,
} from './cas.js';
import { GRAINE_PAR_DEFAUT, type ThemeDeBase } from './themeUcm.js';

const ROLES_DE_M1 = ['solid/default', 'solid/hover', 'surface/default', 'surface/foreground', 'page/border', 'ring'] as const;
/** Chaque rôle de M2 a un cran unique dans la palette, dans le mode touché, donc retirer sa cible ne casse aucun autre alias. */
const CAS_DE_M2 = [
  { role: 'surface/default', mode: 'light' }, { role: 'surface/default', mode: 'dark' },
  { role: 'solid/hover', mode: 'light' }, { role: 'solid/pressed', mode: 'light' },
] as const;
const ROLES_DE_M3 = ['surface/default', 'surface/hover'] as const;
/** Le troisième mode de `theme` que le dernier cas de M4 ajoute. */
const MODE_AJOUTE = { id: 'm-theme-high-contrast', nom: 'high-contrast' } as const;
/** Le plan marque M4-8 `mesure` sans dire de quelle question elle dépend, et aucune de la section 9 ne la couvre. */
const QUESTION_DE_M4 = 'Q-F2-sans-numero';

export function operateursModes(base: ThemeDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeStructure[] {
  const registre = new Registre(base, graine);
  const { carte } = base;
  const palette = paletteDeCarte(carte, PALETTE_NORMALE);
  const nomDe = (mode: ModeDuTheme) => nomDuMode(base, mode);

  /** La collection `brands` aux modes Light et Dark (la place « modes »). */
  const placerLesModesDeMarque = (degradation: Degradation): void => {
    const brands = degradation.catalogue.collections.find((collection) => collection.cle === carte.collections.brands.cle)!;
    MODES_DU_THEME.forEach((mode, rang) => degradation.fixer(brands.modes[rang], 'nom', carte.modes[mode].nom));
  };
  const idDeMarque = (degradation: Degradation, mode: ModeDuTheme): string =>
    degradation.catalogue.collections.find((collection) => collection.cle === carte.collections.brands.cle)!.modes[MODES_DU_THEME.indexOf(mode)].id;

  // M1. Un rôle aliasé vers l'autre branche de mode, au cran de cette branche.
  for (const place of ['chemin', 'modes'] as const) {
    for (const role of ROLES_DE_M1) {
      for (const mode of MODES_DU_THEME) {
        const degradation = registre.degrader();
        if (place === 'modes') placerLesModesDeMarque(degradation);
        const variable = palette.roles[role];
        const autre = autreMode(mode);
        const cleDeplacee = palette.rampes[autre][cranDeLaCarte(variable, autre)].cle;
        degradation.viser(variable.cle, mode, cleDeplacee);
        degradation.zone({ palette: palette.id, role, mode });
        const constat = attendu('C60', null, variable.nom, nomDe(mode), 'correction', { apres: { cle: variable.cibles[mode].cle } });
        registre.ajouter('M1', degradation, {
          description: `M1 ${palette.id} ${role} en ${mode} vise la branche ${autre} (place ${place})`,
          attendus: [constat], details: [{ pour: cleComplete(constat), avant: cleDeplacee }],
          ...(place === 'chemin' ? { hypothese: 'H1' } : {}),
        });
      }
    }
  }

  // M2. La même dégradation sans cible juste à proposer, la place « modes ». C60 reste sans correction et sans candidat.
  for (const { role, mode } of CAS_DE_M2) {
    const degradation = registre.degrader();
    placerLesModesDeMarque(degradation);
    const variable = palette.roles[role];
    const autre = autreMode(mode);
    degradation.viser(variable.cle, mode, palette.rampes[autre][cranDeLaCarte(variable, autre)].cle);
    degradation.retirerLaVariable(variable.cibles[mode].cle);
    degradation.zone({ palette: palette.id, role, mode });
    registre.ajouter('M2', degradation, {
      description: `M2 ${palette.id} ${role} en ${mode} vise la branche ${autre}, la cible attendue est retirée`,
      attendus: [attendu('C60', 'branche-de-mode', variable.nom, nomDe(mode), 'question', { candidats: [] })],
    });
  }
  {
    // Un alias qui boucle. La cible de la mauvaise branche s'aliase elle-même, ce qui est aussi une couche non admise.
    const degradation = registre.degrader();
    placerLesModesDeMarque(degradation);
    const variable = palette.roles['surface/default'];
    const cible = palette.rampes.dark[cranDeLaCarte(variable, 'dark')];
    degradation.viser(variable.cle, 'light', cible.cle);
    degradation.viserDansLeMode(cible.cle, idDeMarque(degradation, 'dark'), cible.cle);
    degradation.zone({ palette: palette.id, role: 'surface/default', mode: 'light' });
    registre.ajouter('M2', degradation, {
      description: `M2 ${palette.id} surface/default en light vise la branche dark, dont la variable s'aliase elle-même`,
      attendus: [
        attendu('C60', 'branche-de-mode', variable.nom, nomDe('light'), 'question', { candidats: [] }),
        attendu('C82', 'couche', cible.nom, nomDe('dark'), 'a-faire'),
      ],
    });
  }

  // M3. L'autre branche au cran du mode du rôle. La correction vise le cran de la table pour le mode du rôle.
  for (const role of ROLES_DE_M3) {
    for (const mode of MODES_DU_THEME) {
      const degradation = registre.degrader();
      placerLesModesDeMarque(degradation);
      const variable = palette.roles[role];
      const cleDeplacee = palette.rampes[autreMode(mode)][cranDeLaCarte(variable, mode)].cle;
      degradation.viser(variable.cle, mode, cleDeplacee);
      degradation.zone({ palette: palette.id, role, mode });
      const constat = attendu('C60', null, variable.nom, nomDe(mode), 'correction', { apres: { cle: variable.cibles[mode].cle } });
      registre.ajouter('M3', degradation, {
        description: `M3 ${palette.id} ${role} en ${mode} vise la branche ${autreMode(mode)} au cran ${cranDeLaCarte(variable, mode)}`,
        attendus: [constat], details: [{ pour: cleComplete(constat), avant: cleDeplacee }],
      });
    }
  }

  // M4. Les modes de `theme` renommés, retirés ou ajoutés.
  const nomLight = carte.modes.light.nom;
  const nomDark = carte.modes.dark.nom;
  const nomDeLaCollection = carte.collections.theme.nom;
  const variablesDuTheme = (degradation: Degradation) => degradation.catalogue.variables.filter((variable) => variable.collection === carte.collections.theme.cle);
  const modeDuTheme = (degradation: Degradation, mode: ModeDuTheme) =>
    degradation.catalogue.collections.find((collection) => collection.cle === carte.collections.theme.cle)!.modes.find((entree) => entree.id === carte.modes[mode].id)!;
  const renommer = (degradation: Degradation, mode: ModeDuTheme, nom: string): void => degradation.fixer(modeDuTheme(degradation, mode), 'nom', nom);
  const retirerLeMode = (degradation: Degradation, mode: ModeDuTheme): void => {
    const theme = degradation.catalogue.collections.find((collection) => collection.cle === carte.collections.theme.cle)!;
    degradation.retirer(theme.modes, modeDuTheme(degradation, mode));
    for (const variable of variablesDuTheme(degradation)) degradation.supprimer(variable.valeurs!, carte.modes[mode].id);
  };
  const cas = (
    description: string, degrader: (degradation: Degradation) => void, manque: readonly string[],
    plus: { verdict?: 'mesure'; question?: string } = {},
  ): void => {
    const degradation = registre.degrader();
    degrader(degradation);
    degradation.zone({ palette: null, role: '(modes)', mode: 'les-deux' });
    registre.ajouter('M4', degradation, {
      description: `M4 ${description}`,
      attendus: manque.map((mode) => attendu('C82', 'mode-du-theme', nomDeLaCollection, mode, 'a-faire')),
      ...plus,
    });
  };
  cas('modes renommés Clair et Sombre', (d) => { renommer(d, 'light', 'Clair'); renommer(d, 'dark', 'Sombre'); }, ['les-deux']);
  cas(`${nomLight} seul`, (d) => retirerLeMode(d, 'dark'), ['dark']);
  cas(`${nomDark} seul`, (d) => retirerLeMode(d, 'light'), ['light']);
  cas('un seul mode, Mode 1', (d) => { retirerLeMode(d, 'dark'); renommer(d, 'light', 'Mode 1'); }, ['les-deux']);
  cas(`${nomLight} renommé ${nomLight}-mode`, (d) => renommer(d, 'light', `${nomLight}-mode`), ['light']);
  cas(`${nomLight} en double`, (d) => renommer(d, 'dark', nomLight), ['dark']);
  cas('modes renommés Day et Night', (d) => { renommer(d, 'light', 'Day'); renommer(d, 'dark', 'Night'); }, ['les-deux']);
  cas(`${nomLight}, ${nomDark} et ${MODE_AJOUTE.nom}`, (degradation) => {
    const theme = degradation.catalogue.collections.find((collection) => collection.cle === carte.collections.theme.cle)!;
    degradation.inserer(theme.modes, { ...MODE_AJOUTE });
    for (const variable of variablesDuTheme(degradation)) degradation.fixer(variable.valeurs!, MODE_AJOUTE.id, structuredClone(variable.valeurs![carte.modes.light.id]));
  }, [], { verdict: 'mesure', question: QUESTION_DE_M4 });
  return registre.cas;
}
