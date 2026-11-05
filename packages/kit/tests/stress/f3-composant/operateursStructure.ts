/**
 * Les opérateurs de dégradation de la structure d'un composant (S1 à S3, constats C63 `vide` et `theme`) des stress tests F3.
 *
 * S1 : un token de couleur sans valeur dans un mode, alors que deux sœurs au moins (mêmes valeurs d'axe et même rôle, autre
 * palette) en ont une, donne une question dont les candidats sont les sœurs. S2 : un token de palette qui vise `brands` par une
 * variable à segment de mode donne une correction `alias-de-mode` vers l'unique variable de sa palette au cran de la table du kit
 * dans le sens lu, sinon une question. Les sœurs ne choisissent pas la cible. S3 : quatre alias que C63 ne juge pas, dont deux que C20 juge.
 *
 * Un constat C63 de ce groupe n'a ni variant, ni layer, ni champ : sa clé ajoute le mode, sans quoi deux modes d'un même token se
 * confondraient. `cleDeConstatEtendue` (`operateursModele.ts`) calcule cette clé ; c'est la clé de comparaison des cas de ce fichier.
 */
import type { VariableDuCatalogue } from '../../../src/controles/index.js';
import { TABLE_DES_DOSSIERS } from '../../../src/emplois/dossiers.js';
import type { ConstatAttendu } from '../commun/types.js';
import type { JetonDeCarte } from './carte.js';
import { construireLeComposant, GRAINE_PAR_DEFAUT, type AxeDeSpec, type ComposantDeBase } from './composantDeBase.js';
import { attendu, axeDeSegment, Degradation, lieuDe, Registre, type CasDeComposant } from './operateursAxes.js';
import { ajouterAvecCodes } from './operateursPeinture.js';

const cleDeC63 = (variable: string, mode: string): string => ['', '', '', '', variable, mode].join('|');

const PALETTES_DE_S = ['primary', 'neutral', 'danger', 'success'] as const;

export function operateursStructure(base: ComposantDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeComposant[] {
  const registre = new Registre(base, graine);
  const axePalette = axeDeSegment(base.carte, 'palette');
  const specPalette = axePalette && base.spec.axes.find((axe) => axe.nom === axePalette.propriete);
  if (!axePalette || !specPalette) return registre.cas;

  /** La base à deux modes de `components` et à ce nombre de palettes : les autres axes du jeu ne changent pas. */
  const bases = new Map<number, ComposantDeBase>();
  const baseA = (palettes: number): ComposantDeBase => {
    let connue = bases.get(palettes);
    if (!connue) {
      const axes: AxeDeSpec[] = base.spec.axes.map((axe) => (axe === specPalette ? { ...axe, valeurs: PALETTES_DE_S.slice(0, palettes) } : axe));
      connue = construireLeComposant({ ...base.spec, axes, modesDeTaille: 2 });
      bases.set(palettes, connue);
    }
    return connue;
  };

  /** Un token de couleur tiré, et ses sœurs : même rôle, mêmes valeurs d'axe hors palette. */
  const tirerUnGroupe = (operateur: string, b: ComposantDeBase): { token: JetonDeCarte; soeurs: JetonDeCarte[] } => {
    const palette = axeDeSegment(b.carte, 'palette')!;
    const couleurs = b.carte.jetons.filter((jeton) => jeton.nature === 'couleur' && !jeton.cible.nom.startsWith('disabled/'));
    const token = registre.tirer(operateur, couleurs);
    const memes = (autre: JetonDeCarte) => autre.role === token.role && Object.entries(token.valeurs).every(([propriete, valeur]) => propriete === palette.propriete || autre.valeurs[propriete] === valeur);
    return { token, soeurs: b.carte.jetons.filter((autre) => autre.cle !== token.cle && memes(autre)) };
  };
  const modesDe = (b: ComposantDeBase) => b.catalogue.collections.find((collection) => collection.role === 'components')!.modes;
  const videDans = (degradation: Degradation, jeton: JetonDeCarte, mode: string): void => {
    degradation.fixer(degradation.variable(jeton.cle).valeurs!, mode, { valeur: null });
  };
  const question = (jeton: JetonDeCarte, mode: string, candidats: readonly string[]): ConstatAttendu =>
    ({ code: 'C63', cle: cleDeC63(jeton.nom, mode), forme: 'question', candidats });
  const ajouter = (operateur: string, degradation: Degradation, description: string, attendus: ConstatAttendu[], codes: readonly string[] = ['C63'], mesure?: string): void =>
    ajouterAvecCodes(registre, operateur, degradation, { description: `${operateur} : ${description}`, attendus, ...(mesure ? { verdict: 'mesure' as const, question: mesure } : {}) }, codes);

  // S1. Valeur vide dans un mode.
  const s1 = (palettes: number, modeVide: (0 | 1)[], videes: number, avecConstat: 'oui' | 'non' | 'deux-modes' | 'absente', libelle: string): void => {
    const b = baseA(palettes);
    const { token, soeurs } = tirerUnGroupe('S1', b);
    const degradation = new Degradation(b);
    const modes = modesDe(b);
    const touches = [token, ...soeurs.slice(0, videes - 1)];
    for (const jeton of touches) {
      for (const rang of modeVide) {
        if (avecConstat === 'absente') {
          // Une clé de mode absente, pas une clé à `undefined` : le journal remet l'objet d'origine.
          const variable = degradation.variable(jeton.cle);
          const { [modes[rang].id]: _, ...reste } = variable.valeurs!;
          degradation.fixer(variable, 'valeurs', reste);
        }
        else videDans(degradation, jeton, modes[rang].id);
      }
    }
    degradation.zones.push({ variant: b.carte.variants[0].id, layer: '', champ: 'valeurs' });
    const restantes = soeurs.slice(videes - 1);
    const attendus = avecConstat === 'oui' || avecConstat === 'deux-modes'
      ? modeVide.map((rang) => question(token, modes[rang].nom, restantes.map((soeur) => soeur.nom)))
      : [];
    ajouter('S1', degradation, `${libelle}, token ${token.nom}`, attendus, ['C63'], avecConstat === 'absente' ? 'S1-5' : undefined);
  };
  // 1. Une seule sœur existe (deux palettes) : le token vide ne peut pas être comparé à deux sœurs.
  s1(2, [0], 1, 'non', 'une seule sœur, premier mode vide');
  // 2 et 3. Deux sœurs valorisées : une question dans le mode vide.
  s1(3, [0], 1, 'oui', 'deux sœurs, mode 1 vide');
  s1(3, [1], 1, 'oui', 'deux sœurs, mode 2 vide');
  // 4. Trois sœurs.
  s1(4, [0], 1, 'oui', 'trois sœurs, mode 1 vide');
  // 5. La valeur manque au lieu de valoir null : rien n'établit encore que c'est un vide.
  s1(3, [0], 1, 'absente', 'valeur absente du mode 1 au lieu de null');
  // 6. Deux tokens vides dans le même mode : une seule sœur reste valorisée.
  s1(3, [0], 2, 'non', 'deux tokens vides dans le mode 1, une seule sœur reste');
  // 7. Les trois fonds de palette sont vides, mais les sœurs d'un autre rôle ne comptent pas.
  s1(3, [0], 3, 'non', 'toutes les palettes vides dans le mode 1, les sœurs d\'un autre rôle gardent leur valeur');
  // 8. Vide dans les deux modes : un constat par mode.
  s1(3, [0, 1], 1, 'deux-modes', 'token vide dans les deux modes');

  // S2. Token qui vise brands par une variable à segment de mode.
  const b3 = baseA(3);
  const mode = (rang: number) => modesDe(b3)[rang];
  const brands = (degradation: Degradation): VariableDuCatalogue => degradation.premiereDe('brands', 'COLOR')!;
  const viserBrands = (degradation: Degradation, jeton: JetonDeCarte, rangs: readonly number[]): void => {
    for (const rang of rangs) degradation.fixer(degradation.variable(jeton.cle).valeurs!, mode(rang).id, { alias: brands(degradation).cle });
  };
  /** La base fabrique les palettes au sens normal. S2 ne change aucun de leurs crans. Le segment de brands donne le mode du thème. */
  const ciblesAuCran = (degradation: Degradation, jeton: JetonDeCarte): VariableDuCatalogue[] => {
    const [, modeDuTheme, cran] = brands(degradation).nom.split('/');
    if (modeDuTheme !== 'light' && modeDuTheme !== 'dark') throw new Error(`Mode de brands inconnu : ${modeDuTheme}`);
    const palette = jeton.cible.nom.split('/')[0];
    const noms = new Set(Object.entries(TABLE_DES_DOSSIERS[modeDuTheme].normal)
      .filter(([, valeur]) => valeur === Number(cran)).map(([role]) => `${palette}/${role}`));
    const theme = degradation.catalogue.collections.find((collection) => collection.role === 'theme')!;
    return degradation.catalogue.variables.filter((variable) => variable.collection === theme.cle && noms.has(variable.nom));
  };
  const oracleDeTheme = (degradation: Degradation, jeton: JetonDeCarte, rang: number): ConstatAttendu => {
    const cibles = ciblesAuCran(degradation, jeton);
    if (cibles.length !== 1) return question(jeton, mode(rang).nom, cibles.map(({ nom }) => nom));
    const { cle, nom } = cibles[0];
    return { code: 'C63', cle: cleDeC63(jeton.nom, mode(rang).nom), forme: 'correction', apres: { cle, nom } };
  };
  const s2 = (libelle: string, rangs: readonly number[], preparer: (degradation: Degradation, token: JetonDeCarte, soeurs: JetonDeCarte[]) => ConstatAttendu[] | undefined, mesure?: string): void => {
    const { token, soeurs } = tirerUnGroupe('S2', b3);
    const degradation = new Degradation(b3);
    viserBrands(degradation, token, rangs);
    degradation.zones.push({ variant: b3.carte.variants[0].id, layer: '', champ: 'valeurs' });
    const attendus = preparer(degradation, token, soeurs) ?? rangs.map((rang) => oracleDeTheme(degradation, token, rang));
    ajouter('S2', degradation, `${libelle}, token ${token.nom}`, attendus, ['C63'], mesure);
  };
  s2('visée de brands dans le mode 1', [0], () => undefined);
  s2('visée de brands dans le mode 2', [1], () => undefined);
  s2('visée de brands dans les deux modes', [0, 1], () => undefined);
  // 4. La variable de thème de la palette du token existe deux fois : deux candidats.
  s2('cible de thème en double', [0], (degradation, token) => {
    const [cible] = ciblesAuCran(degradation, token);
    degradation.cloner(cible);
    return undefined;
  });
  // 5. Sans sœur, la table et le sens de la palette désignent toujours la cible.
  s2('aucune sœur', [0], (degradation, token, soeurs) => {
    for (const soeur of soeurs) degradation.retirer(degradation.catalogue.variables, degradation.variable(soeur.cle));
    return undefined;
  });
  // 6. La cible sans palette des sœurs ne change pas la cible au cran du token.
  s2('sœurs qui visent disabled/background, sans segment de palette', [0], (degradation, token, soeurs) => {
    const globale = degradation.variableParNom('disabled/background')!;
    for (const soeur of soeurs) degradation.fixer(degradation.variable(soeur.cle).valeurs!, mode(0).id, { alias: globale.cle });
    return undefined;
  });
  // 7. La palette du token n'existe plus dans le thème.
  s2('palette absente du thème', [0], (degradation, token) => {
    const palette = token.cible.nom.split('/')[0];
    const theme = degradation.catalogue.collections.find((collection) => collection.role === 'theme')!;
    for (const variable of degradation.catalogue.variables.filter((entree) => entree.collection === theme.cle && entree.nom.startsWith(`${palette}/`))) {
      degradation.retirer(degradation.catalogue.variables, variable);
    }
    return [question(token, mode(0).nom, [])];
  });
  // 8. Les sœurs visent elles-mêmes brands : chaque token du groupe reçoit sa correction au cran.
  s2('sœurs qui visent aussi brands', [0], (degradation, token, soeurs) => {
    for (const soeur of soeurs) viserBrands(degradation, soeur, [0]);
    return [token, ...soeurs].map((jeton) => oracleDeTheme(degradation, jeton, 0));
  });

  // S3. Quatre alias que C63 ne juge pas ; C20 juge ceux qui visent une couche interdite aux couleurs de composant.
  const s3 = (libelle: string, poser: (degradation: Degradation, token: JetonDeCarte) => void, interdit: boolean): void => {
    const { token } = tirerUnGroupe('S3', b3);
    const degradation = new Degradation(b3);
    poser(degradation, token);
    degradation.zones.push({ variant: b3.carte.variants[0].id, layer: '', champ: 'valeurs' });
    const attendus = interdit ? b3.carte.liaisons.filter((liaison) => liaison.cle === token.cle && liaison.origine === 'composant').map((liaison) => attendu('C20', 'a-faire', lieuDe(liaison, token.nom))) : [];
    ajouter('S3', degradation, `${libelle}, token ${token.nom}`, attendus, ['C63', 'C20']);
  };
  const tousLesModes = (degradation: Degradation, token: JetonDeCarte, valeur: { alias: string } | { valeur: unknown }): void => {
    for (const mode of modesDe(b3)) degradation.fixer(degradation.variable(token.cle).valeurs!, mode.id, valeur);
  };
  s3('alias vers brands sans segment de mode', (degradation, token) => {
    const modele = brands(degradation);
    tousLesModes(degradation, token, { alias: degradation.cloner(modele, { nom: 'accent/500' }).cle });
  }, true);
  s3('alias vers une autre variable de theme', (degradation, token) => {
    tousLesModes(degradation, token, { alias: degradation.variableParNom(token.cible.nom === 'neutral/surface/subtle' ? 'neutral/surface/default' : 'neutral/surface/subtle')!.cle });
  }, false);
  s3('valeur directe', (degradation, token) => { tousLesModes(degradation, token, { valeur: { r: 0.1, g: 0.2, b: 0.3, a: 1 } }); }, false);
  s3('alias vers primitives', (degradation, token) => { tousLesModes(degradation, token, { alias: degradation.premiereDe('primitives', 'COLOR')!.cle }); }, true);
  return registre.cas;
}
