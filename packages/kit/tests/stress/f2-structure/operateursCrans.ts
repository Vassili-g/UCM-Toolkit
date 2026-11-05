/**
 * Les opérateurs de crans du stress test F2 (K1 à K4, constats C82 `cran`). Ils dégradent un rôle déplacé d'un pas (K1), aliasé vers la rampe
 * d'une autre palette (K2), à la couleur absolue inversée (K3), dans une palette au sens ambigu (K4).
 *
 * L'oracle suit la section 2.2 du plan. Une correction n'est exacte que si le sens se lit dans les alias des rôles qui n'ont
 * pas bougé ; un rôle déplacé ne vote pas pour le sens de sa propre palette (P6). La correction vise donc la cible de la carte,
 * soit le cran que la table donne pour ce sens. Une palette dont le sens est ambigu n'a pas de correction, seulement une question
 * à deux candidats sur un rôle qui ne tient dans aucune table. `K1` met aussi à l'épreuve l'hypothèse 2 de la section 6.1
 * (un rôle déplacé sur le cran de l'autre table (`ring`, `page/foreground`, `page/border` d'un pas) vote pour l'autre sens).
 */
import { VARIABLES_DE_PALETTE, type ModeDuTheme, type VariableDuTheme } from '../../../src/emplois/dossiers.js';
import { MODES_DU_THEME, paletteDeCarte, type RoleDeCarte } from './carte.js';
import {
  PALETTE_INVERSE, PALETTE_NORMALE, Registre, attendu, autreSens, cleComplete, cranDeLaCarte, cranDeTable, cranVoisin, nomDuMode,
  type CasDeStructure, type DetailDeCorrection, type Degradation,
} from './cas.js';
import { GRAINE_PAR_DEFAUT, type ThemeDeBase } from './themeUcm.js';

const ROLES_A_CRAN = VARIABLES_DE_PALETTE.filter((role) => role !== 'solid/foreground');
/** Les cinq rôles de K2, de natures différentes (fond, contour, texte, anneau). */
const ROLES_DE_K2 = ['solid/default', 'surface/default', 'surface/border', 'page/foreground', 'ring'] as const;
/** Le rôle de K4 qui sort de toutes les tables, et le cran où il va (700 et 800 sont ses crans de table dans les deux modes). */
const ROLE_HORS_TABLE: VariableDuTheme = 'page/border';
const CRAN_HORS_TABLE = 400;

export function operateursCrans(base: ThemeDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeStructure[] {
  const registre = new Registre(base, graine);
  const { carte } = base;
  const nomDe = (mode: ModeDuTheme) => nomDuMode(base, mode);

  // K1. Un cran déplacé d'un pas, avec une correction vers le cran de la table, lu dans les rôles qui n'ont pas bougé.
  for (const identifiant of [PALETTE_NORMALE, PALETTE_INVERSE]) {
    const palette = paletteDeCarte(carte, identifiant);
    for (const role of ROLES_A_CRAN) {
      for (const mode of MODES_DU_THEME) {
        const degradation = registre.degrader();
        const variable = palette.roles[role];
        const cran = cranDeLaCarte(variable, mode);
        const deplace = cranVoisin(cran);
        const cleDeplacee = palette.rampes[mode][deplace].cle;
        degradation.viser(variable.cle, mode, cleDeplacee);
        degradation.zone({ palette: palette.id, role, mode });
        const constat = attendu('C82', 'cran', variable.nom, nomDe(mode), 'correction', { apres: { cle: variable.cibles[mode].cle } });
        const autreTable = cranDeTable(role, mode, autreSens(palette.sens[mode]));
        registre.ajouter('K1', degradation, {
          description: `K1 ${palette.id} ${role} en ${mode} : cran ${cran} déplacé au ${deplace}`,
          attendus: [constat], details: [{ pour: cleComplete(constat), avant: cleDeplacee }],
          ...(autreTable === deplace ? { hypothese: 'H2' } : {}),
        });
      }
    }
  }

  // K2. Un rôle aliasé vers la rampe d'une autre palette, au bon cran. Le plan l'attend en question (Q-F2-2).
  const voisine = paletteDeCarte(carte, PALETTE_INVERSE);
  const palette = paletteDeCarte(carte, PALETTE_NORMALE);
  for (const role of ROLES_DE_K2) {
    for (const mode of MODES_DU_THEME) {
      const degradation = registre.degrader();
      const variable = palette.roles[role];
      const cran = cranDeLaCarte(variable, mode);
      degradation.viser(variable.cle, mode, voisine.rampes[mode][cran].cle);
      degradation.zone({ palette: palette.id, role, mode });
      registre.ajouter('K2', degradation, {
        description: `K2 ${palette.id} ${role} en ${mode} : aliasé vers la rampe de ${voisine.id} au cran ${cran}`,
        attendus: [attendu('C82', 'rampe-autre-palette', variable.nom, nomDe(mode), 'question')],
      });
    }
  }

  // K3. Une couleur absolue inversée. Le texte des boutons est un choix du designer (Q-F2-3) ; les trois bornes du neutre sont fixes.
  const neutre = paletteDeCarte(carte, 'neutral');
  const inverser = (absolue: 'white' | 'black') => (absolue === 'white' ? 'black' : 'white');
  const absolueDe = (role: RoleDeCarte, mode: ModeDuTheme): 'white' | 'black' => {
    const vise = role.cibles[mode].vise;
    if (!vise || !('absolue' in vise)) throw new Error(`${role.nom} ne vise aucune couleur absolue en ${mode}`);
    return vise.absolue;
  };
  for (const mode of MODES_DU_THEME) {
    const degradation = registre.degrader();
    const variable = palette.roles['solid/foreground'];
    const inversee = inverser(absolueDe(variable, mode));
    degradation.viser(variable.cle, mode, carte.absolues[mode][inversee].cle);
    degradation.zone({ palette: palette.id, role: 'solid/foreground', mode });
    registre.ajouter('K3', degradation, {
      description: `K3 ${palette.id} solid/foreground en ${mode} : ${inversee} au lieu de ${absolueDe(variable, mode)}`,
      attendus: [attendu('C82', 'cran', variable.nom, nomDe(mode), 'question', { candidats: [carte.absolues[mode].white.nom, carte.absolues[mode].black.nom] })],
    });
  }
  for (const role of ['scale/0', 'scale/1000', 'page/foreground-main'] as const) {
    for (const mode of MODES_DU_THEME) {
      const degradation = registre.degrader();
      const variable = neutre.roles[role];
      const inversee = inverser(absolueDe(variable, mode));
      const cleInversee = carte.absolues[mode][inversee].cle;
      degradation.viser(variable.cle, mode, cleInversee);
      degradation.zone({ palette: neutre.id, role, mode });
      const constat = attendu('C82', 'cran', variable.nom, nomDe(mode), 'correction', { apres: { cle: variable.cibles[mode].cle } });
      registre.ajouter('K3', degradation, {
        description: `K3 ${neutre.id} ${role} en ${mode} : ${inversee} au lieu de ${absolueDe(variable, mode)}`,
        attendus: [constat], details: [{ pour: cleComplete(constat), avant: cleInversee }],
      });
    }
  }

  // K4. Un sens partagé. La moitié des rôles qui votent passe sur le cran du sens inverse. Q-F2-3 : une question par mode sur le texte
  // des boutons (blanc ou noir), jamais une correction ; avec un rôle sur un cran d'aucune table, une question à deux candidats de plus sur ce rôle.
  const votants = (mode: ModeDuTheme, sauf?: VariableDuTheme): VariableDuTheme[] =>
    ROLES_A_CRAN.filter((role) => role !== sauf && cranDeTable(role, mode, 'normal') !== cranDeTable(role, mode, 'inverse'));
  const melanger = (degradation: Degradation, mode: ModeDuTheme, sauf?: VariableDuTheme): VariableDuTheme[] => {
    const roles = votants(mode, sauf);
    const inverses = roles.slice(0, Math.floor(roles.length / 2));
    for (const role of inverses) degradation.viser(palette.roles[role].cle, mode, palette.rampes[mode][cranDeTable(role, mode, 'inverse')!].cle);
    return inverses;
  };
  const sensPartage = (mode: ModeDuTheme) => attendu('C82', 'sens-partage', palette.groupe.join('/'), nomDe(mode), 'question', {
    candidats: [carte.absolues[mode].white.nom, carte.absolues[mode].black.nom],
  });
  for (const mode of MODES_DU_THEME) {
    const degradation = registre.degrader();
    const inverses = melanger(degradation, mode);
    degradation.zone({ palette: palette.id, role: '(palette)', mode });
    registre.ajouter('K4', degradation, {
      description: `K4 ${palette.id} en ${mode} : ${inverses.length} rôles sur ${votants(mode).length} passent au cran du sens inverse`,
      attendus: [sensPartage(mode)],
    });
  }
  for (const mode of MODES_DU_THEME) {
    const degradation = registre.degrader();
    const inverses = melanger(degradation, mode, ROLE_HORS_TABLE);
    const variable = palette.roles[ROLE_HORS_TABLE];
    degradation.viser(variable.cle, mode, palette.rampes[mode][CRAN_HORS_TABLE].cle);
    degradation.zone({ palette: palette.id, role: '(palette)', mode });
    const candidats = (['normal', 'inverse'] as const).map((sens) => palette.rampes[mode][cranDeTable(ROLE_HORS_TABLE, mode, sens)!].nom);
    registre.ajouter('K4', degradation, {
      description: `K4 ${palette.id} en ${mode} : ${inverses.length} rôles au cran du sens inverse, ${ROLE_HORS_TABLE} au cran ${CRAN_HORS_TABLE}`,
      attendus: [attendu('C82', 'cran', variable.nom, nomDe(mode), 'question', { candidats }), sensPartage(mode)],
    });
  }
  return registre.cas;
}
