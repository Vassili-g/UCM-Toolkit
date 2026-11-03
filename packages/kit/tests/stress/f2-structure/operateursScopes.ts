/**
 * Les opérateurs de scopes du stress test F2 (S1, S1b, S1c et S2). S1 pose un scope faux sur chacun des 24 rôles de `theme`, S1b des
 * scopes vides, S1c un scope en trop, S2 un scope sur une variable d'une couche sans portée (`primitives`, `brands`, `utility`).
 *
 * L'oracle suit `SUPPORT_DES_VARIABLES` pour les rôles de `theme` (C63, constat sans genre) et `COLLECTIONS_SANS_PORTEE` pour les autres
 * (C82 `scopes`). La correction est exacte dans les deux cas : les scopes du support, ou aucun scope. Le plan attend aussi un
 * constat pour la variable FLOAT de S2, alors que C82 ne juge que les couleurs ; le cas reste `attendu`, et son écart est à trancher.
 */
import { NIVEAUX_D_ELEVATION_DU_THEME, SUPPORT_DES_VARIABLES, VARIABLES_DE_PALETTE, VARIABLES_DU_NEUTRE, VARIABLES_GLOBALES, type VariableDuTheme } from '../../../src/emplois/dossiers.js';
import { paletteDeCarte, type RoleDeCarte } from './carte.js';
import {
  Registre, ajouterUneVariable, attendu, cleComplete, leRole,
  type CasDeStructure, type DetailDeCorrection,
} from './cas.js';
import { GRAINE_PAR_DEFAUT, type ThemeDeBase } from './themeUcm.js';

const SCOPES_DE_COULEUR = ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR'] as const;
/** Les trois ensembles de scopes que S2 pose sur une variable d'une couche sans portée. */
const ENSEMBLES_DE_S2: readonly (readonly string[])[] = [['ALL_SCOPES'], ['ALL_FILLS'], ['FRAME_FILL', 'TEXT_FILL']];

interface Emplacement { readonly palette: string | null; readonly role: VariableDuTheme }

/** Les 24 rôles de `theme` : 15 de palette (dans `primary`), 4 propres au neutre, 3 globales, 2 élévations. */
const EMPLACEMENTS_DE_S1: readonly Emplacement[] = [
  ...VARIABLES_DE_PALETTE.map((role): Emplacement => ({ palette: 'primary', role })),
  ...VARIABLES_DU_NEUTRE.map((role): Emplacement => ({ palette: 'neutral', role })),
  ...[...VARIABLES_GLOBALES, ...NIVEAUX_D_ELEVATION_DU_THEME.map((niveau): VariableDuTheme => `elevation/${niveau}`)].map((role): Emplacement => ({ palette: null, role })),
];

const scopesDuSupport = (role: VariableDuTheme): string[] => [...SUPPORT_DES_VARIABLES[role].portees];
const scopeHorsDuSupport = (role: VariableDuTheme): string => SCOPES_DE_COULEUR.find((scope) => !(SUPPORT_DES_VARIABLES[role].portees as readonly string[]).includes(scope))!;

export function operateursScopes(base: ThemeDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeStructure[] {
  const registre = new Registre(base, graine);
  const { carte } = base;

  /** Un rôle de `theme` dont les scopes sont faux : C63 constate et propose les scopes du support. */
  const scopesDuTheme = (operateur: string, emplacement: Emplacement, scopes: readonly string[], dit: string): void => {
    const degradation = registre.degrader();
    const role: RoleDeCarte = leRole(base, emplacement.palette, emplacement.role);
    degradation.fixer(degradation.variable(role.cle), 'scopes', [...scopes]);
    degradation.touchees.add(role.cle);
    degradation.zone({ palette: emplacement.palette, role: emplacement.role, mode: 'les-deux' });
    const constat = attendu('C63', null, role.nom, '', 'correction', { apres: { nom: [...scopesDuSupport(emplacement.role)].sort().join(',') } });
    const details: DetailDeCorrection[] = [{ pour: cleComplete(constat), avant: scopes.join(',') }];
    registre.ajouter(operateur, degradation, {
      description: `${operateur} ${emplacement.palette ?? '(globale)'} ${emplacement.role} : ${dit}`, attendus: [constat], details,
    });
  };

  // S1. Un scope faux sur chacun des 24 rôles : `ALL_SCOPES` un rôle sur deux, sinon un scope d'un autre support.
  EMPLACEMENTS_DE_S1.forEach((emplacement, rang) => {
    const scopes = rang % 2 === 0 ? ['ALL_SCOPES'] : [scopeHorsDuSupport(emplacement.role)];
    scopesDuTheme('S1', emplacement, scopes, `scopes ${scopes.join(',')}`);
  });

  // S1b. Des scopes vides là où le support en attend.
  for (const role of ['solid/default', 'solid/foreground', 'surface/border', 'ring'] as const) {
    scopesDuTheme('S1b', { palette: 'primary', role }, [], 'scopes vides');
  }

  // S1c. Un scope en trop : le support, plus un scope qu'il ne contient pas.
  for (const role of ['solid/default', 'surface/border', 'ring', 'page/foreground'] as const) {
    scopesDuTheme('S1c', { palette: 'primary', role }, [...scopesDuSupport(role), scopeHorsDuSupport(role)], 'un scope de plus que le support');
  }

  // S2. Un scope sur une couleur de `primitives`, de `brands` ou de `utility` : C82 propose de le retirer.
  const couleursSansPortee = [
    { collection: 'primitives', cle: 'primitives|color/primary/light/500' },
    { collection: 'brands', cle: paletteDeCarte(carte, 'primary').rampes.light[500].cle },
    { collection: 'utility', cle: paletteDeCarte(carte, 'neutral').rampes.light[500].cle },
  ];
  for (const { collection, cle } of couleursSansPortee) {
    for (const scopes of ENSEMBLES_DE_S2) {
      const degradation = registre.degrader();
      const variable = degradation.variable(cle);
      degradation.fixer(variable, 'scopes', [...scopes]);
      degradation.touchees.add(cle);
      degradation.zone({ palette: null, role: '(scopes)', mode: 'les-deux' });
      const constat = attendu('C82', 'scopes', variable.nom, '', 'correction', { apres: { nom: '' } });
      registre.ajouter('S2', degradation, {
        description: `S2 ${collection} ${variable.nom} : scopes ${scopes.join(',')}`, attendus: [constat], details: [{ pour: cleComplete(constat), avant: scopes.join(',') }],
      });
    }
  }
  {
    // Une variable FLOAT qui porte un scope dans `primitives`.
    const degradation = registre.degrader();
    const variable = ajouterUneVariable(degradation, 'primitives', 'spacing/base', { valeur: 4 }, { type: 'FLOAT', scopes: ['WIDTH_HEIGHT'] });
    degradation.zone({ palette: null, role: '(scopes)', mode: 'les-deux' });
    const constat = attendu('C82', 'scopes', variable.nom, '', 'correction', { apres: { nom: '' } });
    registre.ajouter('S2', degradation, {
      description: `S2 primitives ${variable.nom} en FLOAT : scope WIDTH_HEIGHT`, attendus: [constat], details: [{ pour: cleComplete(constat), avant: 'WIDTH_HEIGHT' }],
    });
  }
  {
    // Une variable de library : le kit ne l'écrit pas, donc ne la juge pas.
    const degradation = registre.degrader();
    const variable = degradation.variable(paletteDeCarte(carte, 'primary').rampes.light[400].cle);
    degradation.fixer(variable, 'distante', true);
    degradation.fixer(variable, 'scopes', ['ALL_SCOPES']);
    degradation.touchees.add(variable.cle);
    degradation.zone({ palette: null, role: '(scopes)', mode: 'les-deux' });
    registre.ajouter('S2', degradation, { description: `S2 brands ${variable.nom} distante : scopes ALL_SCOPES`, attendus: [] });
  }
  return registre.cas;
}
