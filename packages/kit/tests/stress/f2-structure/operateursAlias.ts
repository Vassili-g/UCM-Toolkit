/**
 * Les opérateurs d'alias, de library et de valeurs du stress test F2 (L1 à L5, constats C63 `alias-supprime`, `library-inactive`,
 * `sans-valeur-en-mode` et `couleur-sans-alias`). Ils suppriment la cible d'un alias (L1), rendent une cible inaccessible (L2),
 * posent une rampe de library (L3), vident une valeur de mode (L4) et écrivent une couleur de composant en valeur directe (L5).
 *
 * Aucune de ces dégradations n'a de correction : le constat se lit en À faire. Le plan écrit L1 « dans un mode puis dans les
 * deux », mais `utility` et `components` n'ont qu'un mode ; pour ces deux collections le second cas vise une clé d'une collection
 * absente, l'autre forme d'une cible supprimée. L5 ajoute un mode à `components` pour son cas « dans deux modes ».
 *
 * La voisine que C63 cite pour un alias supprimé doit avoir le même rôle dans une autre palette (`verifications`) : le plan l'attend
 * ainsi, et l'hypothèse 3 de la section 6.1 suppose que le kit la prend sur le dernier segment seul.
 */
import type { ModeDuTheme, VariableDuTheme } from '../../../src/emplois/dossiers.js';
import type { CatalogueDeReference, VariableDuCatalogue } from '../../../src/controles/index.js';
import type { ConstatAttendu } from '../commun/types.js';
import { MODES_DU_THEME, paletteDeCarte } from './carte.js';
import {
  COULEUR_DIRECTE, QUESTION_SANS_NUMERO, Registre, ajouterUnMode, ajouterUneCollection, attendu, attenduDeVariableAbsente, attendusDAliasSupprime,
  leRole, nomDuModeDeLaCollection, nomSansLaPalette,
  type CasDeStructure, type Degradation, type VerificationDeFait,
} from './cas.js';
import { GRAINE_PAR_DEFAUT, type ThemeDeBase } from './themeUcm.js';

const LIBRARY = { nom: 'Bibliothèque des marques', cle: 'lib-marques' } as const;
/** La clé d'une variable qui n'est dans aucune collection du catalogue. */
const CLE_FANTOME = 'collection-absente|couleur';

/** Les variables dont un alias vise cette clé, avec le mode de la collection où l'alias est écrit. */
function variablesQuiVisent(catalogue: CatalogueDeReference, cle: string): { variable: VariableDuCatalogue; idDeMode: string }[] {
  return catalogue.variables.flatMap((variable) => Object.entries(variable.valeurs ?? {})
    .filter(([, valeur]) => 'alias' in valeur && valeur.alias === cle).map(([idDeMode]) => ({ variable, idDeMode })));
}

export function operateursAlias(base: ThemeDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeStructure[] {
  const registre = new Registre(base, graine);
  const { carte } = base;
  const primary = paletteDeCarte(carte, 'primary');
  const secondary = paletteDeCarte(carte, 'secondary');
  const modeLight = carte.modes.light.id;
  const nomDuMode = (degradation: Degradation, collection: string, idDeMode: string) => nomDuModeDeLaCollection(degradation, collection, idDeMode);

  // L1. Une cible d'alias supprimée : 9 variables, dans un mode puis dans les deux (ou vers une collection absente).
  const voisineDuMemeRole = (nom: string): VerificationDeFait['verifier'] => (constat) => {
    const voisine = constat.faits.voisine;
    if (voisine === undefined) return undefined;
    const attendue = nomSansLaPalette(base, nom);
    const citee = nomSansLaPalette(base, String(voisine));
    return attendue && citee && attendue.reste === citee.reste && attendue.palette !== citee.palette
      ? undefined : `la voisine ${voisine} n'a pas le même rôle que ${nom} dans une autre palette`;
  };
  const sources: { collection: string; cle: string; palette: string | null; role: string }[] = [
    { collection: 'theme', cle: leRole(base, 'primary', 'solid/default').cle, palette: 'primary', role: 'solid/default' },
    { collection: 'theme', cle: leRole(base, 'primary', 'surface/default').cle, palette: 'primary', role: 'surface/default' },
    { collection: 'theme', cle: leRole(base, 'secondary', 'surface/hover').cle, palette: 'secondary', role: 'surface/hover' },
    { collection: 'theme', cle: leRole(base, 'neutral', 'page/border').cle, palette: 'neutral', role: 'page/border' },
    { collection: 'brands', cle: primary.rampes.light[700].cle, palette: 'primary', role: 'light/700' },
    { collection: 'brands', cle: secondary.rampes.dark[300].cle, palette: 'secondary', role: 'dark/300' },
    { collection: 'utility', cle: paletteDeCarte(carte, 'neutral').rampes.light[100].cle, palette: 'neutral', role: 'light/100' },
    { collection: 'utility', cle: paletteDeCarte(carte, 'success/soft').rampes.dark[500].cle, palette: 'success/soft', role: 'dark/500' },
    { collection: 'components', cle: carte.composant.jetons.find((jeton) => jeton.palette === 'primary' && jeton.role === 'background')!.cle, palette: 'primary', role: 'background' },
  ];
  for (const source of sources) {
    const unSeulMode = base.catalogue.collections.find((collection) => collection.cle === source.collection)!.modes.length === 1;
    const modes = base.catalogue.collections.find((collection) => collection.cle === source.collection)!.modes;
    for (const forme of ['un-mode', 'les-deux'] as const) {
      const degradation = registre.degrader();
      const variable = degradation.variable(source.cle);
      const touches = forme === 'un-mode' ? [modes[0]] : unSeulMode ? [modes[0]] : modes;
      const cible = forme === 'les-deux' && unSeulMode ? CLE_FANTOME : `${source.collection}|cible-supprimee`;
      for (const mode of touches) degradation.viserDansLeMode(source.cle, mode.id, cible);
      degradation.zone({ palette: source.palette, role: source.role, mode: 'les-deux' });
      const attendus: ConstatAttendu[] = touches.map((mode) => attendu('C63', 'alias-supprime', variable.nom, nomDuMode(degradation, source.collection, mode.id), 'a-faire'));
      const description = forme === 'un-mode'
        ? `L1 ${source.collection} ${variable.nom} : cible supprimée dans ${nomDuMode(degradation, source.collection, modes[0].id)}`
        : unSeulMode
          ? `L1 ${source.collection} ${variable.nom} : cible dans une collection absente`
          : `L1 ${source.collection} ${variable.nom} : cible supprimée dans les ${modes.length} modes`;
      registre.ajouter('L1', degradation, {
        description, attendus, hypothese: 'H3',
        verifications: touches.map((mode) => ({
          pour: `C63|alias-supprime|${variable.nom}|${nomDuMode(degradation, source.collection, mode.id)}`, verifier: voisineDuMemeRole(variable.nom),
        })),
      });
    }
  }

  // L2. Une cible inaccessible, la library choisie : la variable elle-même (forme 1), ou sa collection (forme 2). Puis sans library.
  const palettesDeL2 = ['primary', 'secondary', 'neutral', 'success/soft'] as const;
  const inaccessible = (identifiant: typeof palettesDeL2[number], forme: 'variable' | 'collection', avecLibrary: boolean): void => {
    const degradation = registre.degrader();
    const cible = paletteDeCarte(carte, identifiant).rampes.light[700];
    const variable = degradation.variable(cible.cle);
    // Le catalogue d'origine dit quelles variables visent la cible, dans quels modes.
    const visent = variablesQuiVisent(base.catalogue, cible.cle);
    if (avecLibrary) degradation.fixer(degradation.catalogue, 'library', { ...LIBRARY });
    if (forme === 'variable') degradation.fixer(variable, 'etat', 'inaccessible');
    else {
      const origine = degradation.catalogue.collections.find((collection) => collection.cle === variable.collection)!;
      ajouterUneCollection(degradation, { cle: 'lib-inaccessible', nom: 'Library inaccessible', role: null, etat: 'inaccessible', modes: origine.modes.map((mode) => ({ ...mode })) });
      degradation.fixer(variable, 'collection', 'lib-inaccessible');
    }
    degradation.touchees.add(variable.cle);
    degradation.zone({ palette: identifiant, role: 'light/700', mode: 'light' });
    registre.ajouter('L2', degradation, {
      description: `L2 ${identifiant} light/700 ${forme === 'variable' ? 'inaccessible' : 'dans une collection inaccessible'}, ${avecLibrary ? 'library choisie' : 'aucune library'}`,
      attendus: visent.map(({ variable: source, idDeMode }) => attendu('C63', 'library-inactive', source.nom, nomDuMode(degradation, source.collection, idDeMode), 'a-faire')),
      ...(avecLibrary ? {} : { verdict: 'mesure' as const, question: 'Q-F2-8' }),
    });
  };
  for (const identifiant of palettesDeL2) for (const forme of ['variable', 'collection'] as const) inaccessible(identifiant, forme, true);
  inaccessible('primary', 'variable', false);
  inaccessible('neutral', 'collection', false);

  // L3. Une rampe de library (les 22 variables de `primary` dans `brands` sont distantes) : cran déplacé, rôle retiré, scope posé.
  const rampeDistante = (degradation: Degradation): void => {
    degradation.fixer(degradation.catalogue, 'library', { ...LIBRARY });
    for (const mode of MODES_DU_THEME) for (const cible of Object.values(primary.rampes[mode])) degradation.fixer(degradation.variable(cible.cle), 'distante', true);
    degradation.zone({ palette: 'primary', role: '(rampe)', mode: 'les-deux' });
  };
  for (const [role, mode, cran] of [['solid/default', 'light', 800], ['surface/hover', 'dark', 400]] as const satisfies readonly [VariableDuTheme, ModeDuTheme, number][]) {
    const degradation = registre.degrader();
    rampeDistante(degradation);
    const variable = leRole(base, 'primary', role);
    degradation.viser(variable.cle, mode, primary.rampes[mode][cran].cle);
    registre.ajouter('L3', degradation, {
      description: `L3 primary ${role} en ${mode} : cran ${cran} d'une rampe de library`,
      attendus: [attendu('C82', 'cran', variable.nom, carte.modes[mode].nom, 'a-faire')],
    });
  }
  for (const role of ['surface/subtle', 'solid/hover'] as const) {
    const degradation = registre.degrader();
    rampeDistante(degradation);
    const variable = leRole(base, 'primary', role);
    degradation.retirerLaVariable(variable.cle);
    const { attendu: absente } = attenduDeVariableAbsente(base, primary, variable, 'cible-de-library');
    registre.ajouter('L3', degradation, {
      description: `L3 primary ${role} retiré, la rampe est de library`,
      attendus: [absente, ...attendusDAliasSupprime(base, variable.cle)],
    });
  }
  for (const [mode, cran, scopes] of [['light', 500, ['ALL_SCOPES']], ['dark', 300, ['TEXT_FILL']]] as const) {
    const degradation = registre.degrader();
    rampeDistante(degradation);
    degradation.fixer(degradation.variable(primary.rampes[mode][cran].cle), 'scopes', [...scopes]);
    registre.ajouter('L3', degradation, { description: `L3 primary ${mode}/${cran} de library porte les scopes ${scopes.join(',')}`, attendus: [] });
  }

  // L4. Une valeur absente dans un mode, sur huit variables de couches différentes ; puis `valeurs` entièrement absentes.
  const carteComposant = carte.composant.jetons.find((jeton) => jeton.palette === 'secondary' && jeton.role === 'foreground')!;
  const sansValeur: { cle: string; collection: string; idDeMode: string }[] = [
    { cle: 'primitives|color/primary/light/500', collection: 'primitives', idDeMode: 'm-primitives' },
    { cle: primary.rampes.light[700].cle, collection: 'brands', idDeMode: 'm-brands-a' },
    { cle: secondary.rampes.dark[300].cle, collection: 'brands', idDeMode: 'm-brands-b' },
    { cle: paletteDeCarte(carte, 'neutral').rampes.light[500].cle, collection: 'utility', idDeMode: 'm-utility' },
    { cle: leRole(base, 'primary', 'solid/default').cle, collection: 'theme', idDeMode: modeLight },
    { cle: leRole(base, 'primary', 'surface/default').cle, collection: 'theme', idDeMode: carte.modes.dark.id },
    { cle: carte.echelle[2].cle, collection: 'layout', idDeMode: 'm-layout' },
    { cle: carteComposant.cle, collection: 'components', idDeMode: 'm-components' },
  ];
  for (const { cle, collection, idDeMode } of sansValeur) {
    const degradation = registre.degrader();
    const variable = degradation.variable(cle);
    degradation.supprimer(variable.valeurs!, idDeMode);
    degradation.touchees.add(cle);
    degradation.zone({ palette: null, role: '(valeur)', mode: 'les-deux' });
    registre.ajouter('L4', degradation, {
      description: `L4 ${collection} ${variable.nom} sans valeur dans ${nomDuMode(degradation, collection, idDeMode)}`,
      attendus: [attendu('C63', 'sans-valeur-en-mode', variable.nom, nomDuMode(degradation, collection, idDeMode), 'a-faire')],
    });
  }
  {
    const degradation = registre.degrader();
    const marche = carte.echelle[4];
    degradation.supprimer(degradation.variable(marche.cle), 'valeurs');
    degradation.touchees.add(marche.cle);
    degradation.zone({ palette: null, role: '(valeur)', mode: 'les-deux' });
    registre.ajouter('L4', degradation, {
      description: `L4 layout ${marche.nom} sans aucune valeur`,
      attendus: [attendu('C63', 'sans-valeur-en-mode', marche.nom, nomDuModeDeLaCollection(degradation, 'layout', 'm-layout'), 'a-faire')],
      verdict: 'mesure', question: QUESTION_SANS_NUMERO,
    });
  }

  // L5. Une couleur de `components` en valeur directe, qu'un segment de famille désigne ou non.
  const jeton = carte.composant.jetons.find((entree) => entree.palette === 'primary' && entree.role === 'background')!;
  const directe = (degradation: Degradation, ids: readonly string[]): void => {
    for (const id of ids) degradation.ecrireLaValeur(jeton.cle, id, { valeur: { ...COULEUR_DIRECTE } });
    degradation.zone({ palette: 'primary', role: 'background', mode: 'les-deux' });
  };
  const nomAvec = (famille: string | null): string => jeton.nom.split('/').flatMap((segment) => (segment === 'color' ? (famille === null ? [] : [famille]) : [segment])).join('/');
  const couleurSansAlias = (degradation: Degradation, nom: string, ids: readonly string[]): ConstatAttendu[] =>
    ids.map((id) => attendu('C63', 'couleur-sans-alias', nom, nomDuMode(degradation, 'components', id), 'a-faire'));
  {
    const degradation = registre.degrader();
    directe(degradation, ['m-components']);
    registre.ajouter('L5', degradation, { description: `L5 ${jeton.nom} en valeur directe dans un mode`, attendus: couleurSansAlias(degradation, jeton.nom, ['m-components']) });
  }
  {
    const degradation = registre.degrader();
    ajouterUnMode(degradation, 'components', { id: 'm-components-2', nom: 'Mode 2' });
    directe(degradation, ['m-components', 'm-components-2']);
    registre.ajouter('L5', degradation, {
      description: `L5 ${jeton.nom} en valeur directe dans deux modes`, attendus: couleurSansAlias(degradation, jeton.nom, ['m-components', 'm-components-2']),
    });
  }
  for (const [famille, attendue] of [['Colors', true], ['Colour', true], [null, false]] as const) {
    const degradation = registre.degrader();
    const nom = nomAvec(famille);
    degradation.fixer(degradation.variable(jeton.cle), 'nom', nom);
    directe(degradation, ['m-components']);
    registre.ajouter('L5', degradation, {
      description: `L5 ${nom} en valeur directe, ${famille === null ? 'sans segment de famille' : `famille écrite ${famille}`}`,
      attendus: attendue ? couleurSansAlias(degradation, nom, ['m-components']) : [],
    });
  }
  return registre.cas;
}
