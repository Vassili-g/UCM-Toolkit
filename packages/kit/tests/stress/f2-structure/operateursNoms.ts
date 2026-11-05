/**
 * Les opérateurs de noms inconnus dans `theme` du stress test F2 (Q1 à Q3, Q-07 et E-19). Q1 écrit un rôle de `primary` avec une
 * faute, Q2 sous un synonyme, Q3 ajoute un nom sans rapport avec un rôle.
 *
 * Le plan veut, pour une faute ou un synonyme, une question qui nomme le rôle proche, sans réponse présélectionnée, et aucune
 * création du rôle absent (P15). Le kit rend cette question avec le genre `variable-inconnue` (E3.1) et ne crée plus le rôle absent
 * (hypothèse 4 de la section 6.1). Q3, selon Q-F2-1, ne rend rien : ni information, ni question, ni terme à ajouter à la main.
 */
import { VARIABLES_DE_PALETTE, type VariableDuTheme } from '../../../src/emplois/dossiers.js';
import { MODES_DU_THEME, paletteDeCarte } from './carte.js';
import { Registre, ajouterUneVariable, attendu, leRole, type CasDeStructure, type Degradation } from './cas.js';
import { GRAINE_PAR_DEFAUT, type ThemeDeBase } from './themeUcm.js';

/** Les trois fautes de frappe d'un mot : une lettre retirée, remplacée par un `x`, ou échangée avec sa voisine. */
export const FAUTES = {
  retiree: (mot: string): string => mot.slice(0, 2) + mot.slice(3),
  remplacee: (mot: string): string => `${mot[0]}${mot[1] === 'x' ? 'z' : 'x'}${mot.slice(2)}`,
  echangee: (mot: string): string => mot[0] + mot[2] + mot[1] + mot.slice(3),
} as const;

/** Les dossiers de Q1 : les trois dossiers d'une palette, puis celui des variables globales. */
const DOSSIERS_DE_Q1 = [
  { palette: 'primary', role: 'solid/default' }, { palette: 'primary', role: 'surface/default' }, { palette: 'primary', role: 'page/foreground' },
] as const;

/** Les synonymes de Q2 et le rôle de `primary` qu'ils remplacent. */
const SYNONYMES: readonly (readonly [VariableDuTheme, string])[] = [
  ['surface/border', 'surface/outline'], ['page/foreground', 'page/text'], ['solid/pressed', 'solid/active'], ['solid/hover', 'solid/hovered'],
  ['page/divider', 'page/separator'], ['ring', 'focus'], ['surface/subtle', 'surface/muted'], ['surface/default', 'surface/bg'],
];

const NOMS_SANS_PROXIMITE = ['primary/page/xyz', 'identity', 'custom/accent', 'tertiary-note'] as const;

export function operateursNoms(base: ThemeDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeStructure[] {
  const registre = new Registre(base, graine);
  const { carte } = base;
  const primary = paletteDeCarte(carte, 'primary');

  /** Renomme un rôle ; le nouveau nom n'est plus celui d'aucun rôle, et le rôle d'avant manque à la palette. */
  const renommer = (operateur: string, role: VariableDuTheme, palette: string | null, nouveau: string, dit: string): void => {
    const degradation = registre.degrader();
    const variable = leRole(base, palette, role);
    degradation.fixer(degradation.variable(variable.cle), 'nom', nouveau);
    degradation.touchees.add(variable.cle);
    degradation.zone({ palette, role, mode: 'les-deux' });
    registre.ajouter(operateur, degradation, {
      description: `${operateur} ${palette ?? '(globale)'} ${role} devient ${nouveau} (${dit})`,
      attendus: [attendu('C82', 'variable-inconnue', nouveau, '', 'question')],
      verifications: [{
        pour: `C82|variable-inconnue|${nouveau}|`,
        verifier: (constat) => (constat.question?.candidats.some((candidat) => candidat.nom === variable.nom) ? undefined : `la question ne nomme pas ${variable.nom}`),
      }],
      hypothese: 'H4',
    });
  };
  const avecFaute = (nom: string, rang: (segments: readonly string[]) => number, faute: (mot: string) => string): string =>
    nom.split('/').map((segment, i, segments) => (i === rang(segments) ? faute(segment) : segment)).join('/');

  // Q1. Une faute sur le dernier segment des 15 rôles de `primary`, puis sur un dossier.
  for (const role of VARIABLES_DE_PALETTE) {
    for (const [nomDeLaFaute, faute] of Object.entries(FAUTES)) {
      renommer('Q1', role, 'primary', avecFaute(leRole(base, 'primary', role).nom, (segments) => segments.length - 1, faute), `dernier segment, lettre ${nomDeLaFaute}`);
    }
  }
  const fautesDeDossier = (role: VariableDuTheme, palette: string | null) => {
    const variable = leRole(base, palette, role);
    return Object.entries(FAUTES).map(([nomDeLaFaute, faute]) => ({
      role, palette, nomDeLaFaute, nouveau: avecFaute(variable.nom, (segments) => segments.length - role.split('/').length, faute),
    }));
  };
  for (const { palette, role } of DOSSIERS_DE_Q1) {
    for (const { nomDeLaFaute, nouveau } of fautesDeDossier(role, palette)) renommer('Q1', role, palette, nouveau, `dossier, lettre ${nomDeLaFaute}`);
  }
  renommer('Q1', 'disabled/background', null, avecFaute(carte.globales['disabled/background'].nom, () => 0, FAUTES.retiree), 'dossier des variables globales, lettre retiree');

  // Q2. Un synonyme à la place du rôle.
  for (const [role, synonyme] of SYNONYMES) {
    renommer('Q2', role, 'primary', `${primary.groupe.join('/')}/${synonyme}`, `synonyme ${synonyme}`);
  }

  // Q3. Un nom qui ne ressemble à aucun rôle : le mainteneur a décidé qu'il ne rend rien (Q-F2-1).
  for (const nom of NOMS_SANS_PROXIMITE) {
    const degradation: Degradation = registre.degrader();
    const variable = ajouterUneVariable(degradation, 'theme', nom, { alias: primary.rampes.light[300].cle });
    for (const mode of MODES_DU_THEME) degradation.viser(variable.cle, mode, primary.rampes[mode][300].cle);
    degradation.zone({ palette: 'primary', role: '(nom)', mode: 'les-deux' });
    registre.ajouter('Q3', degradation, {
      description: `Q3 theme ${nom} ne ressemble à aucun rôle`, attendus: [],
    });
  }
  return registre.cas;
}
