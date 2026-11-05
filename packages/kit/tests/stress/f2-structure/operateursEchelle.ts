/**
 * Les opérateurs d'échelle du stress test F2 (E1 et E2, constat C63 `doublons`). E1 donne la même valeur à plusieurs crans de
 * `sizing` dans un mode, E2 écrit des échelles sans doublon. Le doublon est une question qui cite les variables de même valeur, sans
 * correction, pour chaque mode et chaque valeur partagée.
 *
 * Deux valeurs décimales à 1e-6 près (`0,1 + 0,2` et `0,3`) et deux alias qui se résolvent à la même valeur forment un doublon
 * (Q-F2-8, N-33). Une variable `icon/<taille>` et une variable STRING ne font pas
 * partie de l'échelle `sizing`, donc leur valeur partagée ne donne rien.
 */
import type { ConstatAttendu } from '../commun/types.js';
import { Registre, ajouterUnMode, ajouterUneVariable, attendu, nomDuModeDeLaCollection, type CasDeStructure, type Degradation } from './cas.js';
import { GRAINE_PAR_DEFAUT, type ThemeDeBase } from './themeUcm.js';

const ID_DU_MODE = 'm-layout';

export function operateursEchelle(base: ThemeDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeStructure[] {
  const registre = new Registre(base, graine);
  const marche = (rang: number) => base.carte.echelle[rang - 1];
  const ecrire = (degradation: Degradation, rang: number, valeur: number, idDeMode = ID_DU_MODE): void =>
    degradation.ecrireLaValeur(marche(rang).cle, idDeMode, { valeur });
  const doublon = (degradation: Degradation, valeur: number, rangs: readonly number[], idDeMode = ID_DU_MODE): ConstatAttendu =>
    attendu('C63', 'doublons', String(valeur), nomDuModeDeLaCollection(degradation, 'layout', idDeMode), 'question', { candidats: rangs.map((rang) => marche(rang).nom) });
  const e1 = (description: string, degrader: (degradation: Degradation) => ConstatAttendu[], plus: { verdict?: 'mesure'; question?: string } = {}): void => {
    const degradation = registre.degrader();
    const attendus = degrader(degradation);
    degradation.zone({ palette: null, role: '(échelle)', mode: 'les-deux' });
    registre.ajouter('E1', degradation, { description: `E1 ${description}`, attendus, ...plus });
  };

  e1('sizing/2 prend la valeur de sizing/1', (d) => { ecrire(d, 2, 4); return [doublon(d, 4, [1, 2])]; });
  e1('sizing/2 et sizing/3 prennent la valeur de sizing/1', (d) => { ecrire(d, 2, 4); ecrire(d, 3, 4); return [doublon(d, 4, [1, 2, 3])]; });
  e1('deux groupes de valeurs égales', (d) => {
    ecrire(d, 2, 4); ecrire(d, 4, 12);
    return [doublon(d, 4, [1, 2]), doublon(d, 12, [3, 4])];
  });
  e1('le même doublon dans deux modes', (d) => {
    ajouterUnMode(d, 'layout', { id: 'm-layout-2', nom: 'Mode 2' });
    ecrire(d, 2, 4); ecrire(d, 2, 4, 'm-layout-2');
    return [doublon(d, 4, [1, 2]), doublon(d, 4, [1, 2], 'm-layout-2')];
  });
  e1('sizing/1 et sizing/2 valent 0', (d) => { ecrire(d, 1, 0); ecrire(d, 2, 0); return [doublon(d, 0, [1, 2])]; });
  e1('sizing/1 et sizing/2 valent 4,5', (d) => { ecrire(d, 1, 4.5); ecrire(d, 2, 4.5); return [doublon(d, 4.5, [1, 2])]; });
  e1('sizing/1 vaut 0,1 + 0,2 et sizing/2 vaut 0,3', (d) => { ecrire(d, 1, 0.1 + 0.2); ecrire(d, 2, 0.3); return [doublon(d, 0.3, [1, 2])]; });
  e1('sizing/1 et sizing/2 visent deux primitives de valeur 4', (d) => {
    const a = ajouterUneVariable(d, 'primitives', 'spacing/base-a', { valeur: 4 }, { type: 'FLOAT' });
    const b = ajouterUneVariable(d, 'primitives', 'spacing/base-b', { valeur: 4 }, { type: 'FLOAT' });
    d.viserDansLeMode(marche(1).cle, ID_DU_MODE, a.cle);
    d.viserDansLeMode(marche(2).cle, ID_DU_MODE, b.cle);
    return [doublon(d, 4, [1, 2])];
  });
  e1('icon/small prend la valeur de sizing/1', (d) => { ajouterUneVariable(d, 'layout', 'icon/small', { valeur: 4 }, { type: 'FLOAT' }); return []; });
  e1('sizing/2 est une chaîne qui vaut 4', (d) => {
    d.fixer(d.variable(marche(2).cle), 'type', 'STRING');
    ecrire(d, 2, 4);
    return [];
  });

  const e2 = (description: string, degrader: (degradation: Degradation) => void): void => {
    const degradation = registre.degrader();
    degrader(degradation);
    degradation.zone({ palette: null, role: '(échelle)', mode: 'les-deux' });
    registre.ajouter('E2', degradation, { description: `E2 ${description}`, attendus: [] });
  };
  e2('sizing/7 prolonge l\'échelle', (d) => { ajouterUneVariable(d, 'layout', 'sizing/7', { valeur: 48 }, { type: 'FLOAT' }); });
  e2('les mêmes valeurs dans deux modes', (d) => { ajouterUnMode(d, 'layout', { id: 'm-layout-2', nom: 'Mode 2' }); });
  e2('sizing/0 seul à valoir 0', (d) => { ajouterUneVariable(d, 'layout', 'sizing/0', { valeur: 0 }, { type: 'FLOAT' }); });
  return registre.cas;
}
