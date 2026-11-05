/**
 * Les opérateurs de couches, de types, de rangement et de structure globale du stress test F2 (Y1 à Y4 et X1 à X6, constats C82
 * `couche`, `valeur-directe`, `type`, `mal-rangee`, et ceux que le plan attend sans que le kit les connaisse).
 *
 * Y1 à Y4 écrivent une variable de sonde dans une collection, plutôt que de défaire un rôle de `theme` : le rôle garde son alias et
 * ses votes de sens, donc le seul constat attendu est celui de la sonde. X1 duplique la collection `theme`, X2 duplique un rôle dans
 * une palette, X3 rend des variables illisibles, X5 déclare le fichier libre et X6 donne aux contrôles des entrées malformées. Le
 * kit rend pour X1 un constat `theme-en-double` (Q-F2-5) et pour X2 une question `role-en-double` (Q-F2-6), et pour X6 seulement
 * l'absence d'exception (`codesJuges` vide : aucun constat n'y compte comme faux). Chaque collection `theme` est jugée pour elle-même
 * (N-30, N-31) : une copie incomplète reçoit ses `variable-absente`, et chaque copie dit son cran absent. Une collection inaccessible
 * que des alias visent reçoit l'information `cible-inaccessible` (Q-F2-8), car aucune library n'est choisie.
 *
 * Le plan compte 6 paires admises dans Y1 ; le référentiel (`ciblesAdmises`) n'en donne que 5 sur les 25 couples, donc Y1 garde
 * 26 cas avec 20 paires interdites et 5 admises.
 */
import { ciblesAdmises, type Collection } from '../../../src/referentiel/architecture.js';
import { collectionsDeReference, type CollectionDuCatalogue, type VariableDuCatalogue } from '../../../src/controles/index.js';
import { SUPPORT_DES_VARIABLES, VARIABLES_DE_PALETTE, type VariableDuTheme } from '../../../src/emplois/dossiers.js';
import type { ConstatAttendu } from '../commun/types.js';
import { MODES_DU_THEME, paletteDeCarte } from './carte.js';
import {
  COULEUR_DIRECTE, QUESTION_SANS_NUMERO, Registre, ajouterUnMode, ajouterUneCollection, ajouterUneVariable, attenduDeVariableAbsente, attendu,
  cleComplete, collectionDuCas, leRole,
  type CasDeStructure, type Degradation,
} from './cas.js';
import { GRAINE_PAR_DEFAUT, type ThemeDeBase } from './themeUcm.js';

const COUCHES_DE_Y1 = ['theme', 'brands', 'utility', 'primitives', 'components'] as const satisfies readonly Collection[];
const TYPES_AUTRES_QUE_COULEUR = ['FLOAT', 'STRING', 'BOOLEAN'] as const;
const ROLES_DE_Y3 = ['solid/default', 'surface/default', 'page/border', 'ring'] as const satisfies readonly VariableDuTheme[];
const COUCHES_DE_Y4 = ['brands', 'utility', 'primitives', 'layout', 'typography'] as const satisfies readonly Collection[];
const ROLES_DE_Y4 = ['solid/default', 'surface/border', 'ring'] as const satisfies readonly VariableDuTheme[];
/** Les trois primitives que Y4 nomme comme un rôle. */
type ModesCopies = readonly [{ id: string; nom: string }, { id: string; nom: string }];
const SONDES_DE_PRIMITIVES = ['color/primary/solid/default', 'color/primary/surface/border', 'color/neutral/page/divider'] as const;

export function operateursStructure(base: ThemeDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeStructure[] {
  const registre = new Registre(base, graine);
  const { carte } = base;
  const primary = paletteDeCarte(carte, 'primary');
  const neutral = paletteDeCarte(carte, 'neutral');
  const cibleDeLaCouche: Record<(typeof COUCHES_DE_Y1)[number], string> = {
    theme: leRole(base, 'primary', 'page/divider').cle,
    brands: primary.rampes.light[300].cle,
    utility: neutral.rampes.light[300].cle,
    primitives: 'primitives|color/primary/light/300',
    components: carte.composant.jetons[0].cle,
  };
  const nomDeLaSonde = (collection: string, sonde: string): string => (collection === 'components' ? `${carte.composant.jeu}/color/${sonde}/background` : `${sonde}`);
  const sonde = ajouterUneVariable;
  const zoneDeSonde = (degradation: Degradation): void => degradation.zone({ palette: null, role: '(sonde)', mode: 'les-deux' });
  const modesDe = (degradation: Degradation, collection: string): CollectionDuCatalogue['modes'] => collectionDuCas(degradation, collection).modes;

  // Y1. Un alias de couleur d'une couche vers une autre : 25 couples, puis une cible dans une collection sans rôle.
  for (const source of COUCHES_DE_Y1) {
    for (const cible of COUCHES_DE_Y1) {
      const degradation = registre.degrader();
      const variable = sonde(degradation, source, nomDeLaSonde(source, 'sonde-y1'), { alias: cibleDeLaCouche[cible] });
      zoneDeSonde(degradation);
      const admise = ciblesAdmises(source, 'couleur').includes(cible);
      registre.ajouter('Y1', degradation, {
        description: `Y1 alias de ${source} vers ${cible}, ${admise ? 'admis' : 'interdit'}`,
        attendus: admise ? [] : modesDe(degradation, source).map((mode) => attendu('C82', 'couche', variable.nom, mode.nom, 'a-faire')),
      });
    }
  }
  {
    const degradation = registre.degrader();
    ajouterUneCollection(degradation, collectionsDeReference([{ cle: 'libre', nom: 'Libre', modes: [{ id: 'm-libre', nom: 'Mode 1' }], etat: 'lue' }], 'ucm')[0]);
    const cible = ajouterUneVariable(degradation, 'libre', 'couleur', { valeur: { ...COULEUR_DIRECTE } });
    sonde(degradation, 'theme', 'sonde-y1', { alias: cible.cle });
    zoneDeSonde(degradation);
    registre.ajouter('Y1', degradation, { description: 'Y1 alias de theme vers une collection sans rôle', attendus: [] });
  }

  // Y2. Une couleur directe dans `theme`, `brands` ou `utility`, dans un mode puis dans deux ; un témoin de valeur `null`.
  const cibleAdmise = { theme: primary.rampes.light[300].cle, brands: 'primitives|color/primary/light/300', utility: 'primitives|color/neutral/light/300' } as const;
  for (const collection of ['theme', 'brands', 'utility'] as const) {
    for (const modesDirects of [1, 2]) {
      const degradation = registre.degrader();
      if (collection === 'utility' && modesDirects === 2) ajouterUnMode(degradation, 'utility', { id: 'm-utility-2', nom: 'Mode 2' });
      const variable = sonde(degradation, collection, 'sonde-y2', { valeur: { ...COULEUR_DIRECTE } });
      const modes = modesDe(degradation, collection);
      const directs = modes.slice(0, modesDirects);
      for (const mode of modes.slice(modesDirects)) degradation.viserDansLeMode(variable.cle, mode.id, cibleAdmise[collection]);
      zoneDeSonde(degradation);
      registre.ajouter('Y2', degradation, {
        description: `Y2 ${collection} couleur directe dans ${modesDirects === 1 ? 'un mode' : 'deux modes'}`,
        attendus: directs.map((mode) => attendu('C82', 'valeur-directe', variable.nom, mode.nom, 'a-faire')),
      });
    }
  }
  {
    const degradation = registre.degrader();
    const variable = sonde(degradation, 'theme', 'sonde-y2', { valeur: null });
    degradation.viserDansLeMode(variable.cle, carte.modes.dark.id, cibleAdmise.theme);
    zoneDeSonde(degradation);
    registre.ajouter('Y2', degradation, { description: 'Y2 theme témoin de valeur null', attendus: [] });
  }

  // Y3. Un rôle de `theme` qui n'est pas une couleur.
  for (const role of ROLES_DE_Y3) {
    for (const type of TYPES_AUTRES_QUE_COULEUR) {
      const degradation = registre.degrader();
      const variable = leRole(base, 'primary', role);
      degradation.fixer(degradation.variable(variable.cle), 'type', type);
      degradation.touchees.add(variable.cle);
      degradation.zone({ palette: 'primary', role, mode: 'les-deux' });
      registre.ajouter('Y3', degradation, {
        description: `Y3 primary ${role} en ${type}`, attendus: [attendu('C82', 'type', variable.nom, '', 'a-faire')],
      });
    }
  }

  // Y4. Un rôle de palette rangé hors de `theme`. Un nom sans slash (`ring`) et les primitives nommées comme un rôle dépendent d'une
  // règle que le plan n'a pas écrite.
  for (const collection of COUCHES_DE_Y4) {
    for (const role of ROLES_DE_Y4) {
      const degradation = registre.degrader();
      if (collection === 'typography') {
        ajouterUneCollection(degradation, collectionsDeReference([{ cle: 'typography', nom: 'typography', modes: [{ id: 'm-typography', nom: 'Mode 1' }], etat: 'lue' }], 'ucm')[0]);
      }
      // Hors de `primitives`, la sonde vise une primitive : une valeur directe ferait naître un constat `valeur-directe`.
      const valeur = collection === 'primitives' ? { valeur: { ...COULEUR_DIRECTE } } : { alias: cibleDeLaCouche.primitives };
      const variable = sonde(degradation, collection, `primary/${role}`, valeur);
      zoneDeSonde(degradation);
      registre.ajouter('Y4', degradation, {
        description: `Y4 primary ${role} rangé dans ${collection}`, attendus: [attendu('C82', 'mal-rangee', variable.nom, '', 'a-faire')],
        ...(role === 'ring' ? { verdict: 'mesure' as const, question: QUESTION_SANS_NUMERO } : {}),
      });
    }
  }
  for (const nom of SONDES_DE_PRIMITIVES) {
    const degradation = registre.degrader();
    sonde(degradation, 'primitives', nom, { valeur: { ...COULEUR_DIRECTE } });
    zoneDeSonde(degradation);
    registre.ajouter('Y4', degradation, {
      description: `Y4 primitive ${nom} nommée comme un rôle`, attendus: [attendu('C82', 'mal-rangee', nom, '', 'a-faire')],
      verdict: 'mesure', question: QUESTION_SANS_NUMERO,
    });
  }

  // X1. Deux collections `theme`. Chaque collection de trop reçoit un constat À faire, sans correction (Q-F2-5).
  const themeDuCatalogue = (degradation: Degradation): VariableDuCatalogue[] =>
    degradation.catalogue.variables.filter((variable) => variable.collection === carte.collections.theme.cle);
  /** Une copie de la collection `theme` : mêmes alias, modes de ce nom, variables retenues par `garder`. */
  const copierLeTheme = (
    degradation: Degradation, cle: string, nom: string, modes: ModesCopies,
    garder: (variable: VariableDuCatalogue) => boolean = () => true,
  ): VariableDuCatalogue[] => {
    ajouterUneCollection(degradation, collectionsDeReference([{ cle, nom, modes: modes.map((mode) => ({ ...mode })), etat: 'lue' }], 'ucm')[0]);
    const copies: VariableDuCatalogue[] = [];
    for (const variable of themeDuCatalogue(degradation).filter(garder)) {
      const copie: VariableDuCatalogue = structuredClone({ ...variable, cle: `${cle}|${variable.nom}`, collection: cle });
      copie.valeurs = {
        [modes[0].id]: structuredClone(variable.valeurs![carte.modes.light.id]), [modes[1].id]: structuredClone(variable.valeurs![carte.modes.dark.id]),
      };
      degradation.inserer(degradation.catalogue.variables, copie);
      copies.push(copie);
    }
    degradation.touchees.add(cle);
    return copies;
  };
  const unTheme = (nom: string): ConstatAttendu => attendu('C82', 'theme-en-double', nom, '', 'a-faire');
  const modesClairSombre = (suffixe: string): ModesCopies => [{ id: `m-theme-${suffixe}-light`, nom: carte.modes.light.nom }, { id: `m-theme-${suffixe}-dark`, nom: carte.modes.dark.nom }];
  const subtle = leRole(base, 'primary', 'surface/subtle');
  {
    // Le rôle `surface/subtle` de `primary` manque aux deux thèmes, et son cran 50 manque à la rampe : chaque thème dit le même cran absent.
    const degradation = registre.degrader();
    const copies = copierLeTheme(degradation, 'theme-2', 'Theme', modesClairSombre('2'));
    degradation.retirerLaVariable(subtle.cle);
    degradation.retirerLaVariable(copies.find((copie) => copie.nom === subtle.nom)!.cle);
    degradation.retirerLaVariable(primary.rampes.light[50].cle);
    degradation.zone({ palette: null, role: '(theme)', mode: 'les-deux' });
    registre.ajouter('X1', degradation, {
      description: 'X1 copie complète nommée Theme, avec surface/subtle de primary et le cran 50 de sa rampe retirés',
      // Le cran 50 manque à la rampe que les deux thèmes visent : chaque collection `theme` le dit, sous son propre identifiant (N-30).
      attendus: [unTheme('Theme'), attendu('C82', 'cran-absent', 'primary/light/50', '', 'a-faire'), attendu('C82', 'cran-absent', 'theme-2:primary/light/50', '', 'a-faire')],
    });
  }
  {
    const degradation = registre.degrader();
    const gardees = new Set<string>(VARIABLES_DE_PALETTE.filter((_, rang) => rang % 2 === 0).map((role) => leRole(base, 'primary', role).nom));
    for (const role of Object.values(carte.globales)) gardees.add(role.nom);
    const modes = modesClairSombre('3');
    copierLeTheme(degradation, 'theme-3', 'THEME', modes, (variable) => gardees.has(variable.nom));
    degradation.zone({ palette: null, role: '(theme)', mode: 'les-deux' });
    // La copie est une collection `theme` : ses sept rôles de rang impair manquent, et chacun reçoit sa création dans la copie (N-31).
    const manquants = VARIABLES_DE_PALETTE.filter((role) => !gardees.has(leRole(base, 'primary', role).nom)).map((role) => leRole(base, 'primary', role));
    const absents = manquants.map((role) => attenduDeVariableAbsente(base, primary, role));
    registre.ajouter('X1', degradation, {
      description: 'X1 copie nommée THEME des rôles de rang pair de primary et des variables globales',
      attendus: [unTheme('THEME'), ...absents.map(({ attendu: absent }) => absent)],
      details: manquants.map((role, rang) => ({
        pour: cleComplete(absents[rang].attendu),
        creation: {
          collection: 'theme-3', nom: role.nom, scopes: SUPPORT_DES_VARIABLES[role.role].portees,
          alias: Object.fromEntries(MODES_DU_THEME.map((mode, rangDuMode) => [modes[rangDuMode].id, role.cibles[mode].cle])),
        },
      })),
    });
  }
  {
    const degradation = registre.degrader();
    copierLeTheme(degradation, 'theme-4', 'Theme', [{ id: 'm-theme-4-day', nom: 'Day' }, { id: 'm-theme-4-night', nom: 'Night' }]);
    degradation.zone({ palette: null, role: '(theme)', mode: 'les-deux' });
    registre.ajouter('X1', degradation, {
      description: 'X1 copie complète nommée Theme aux modes Day et Night',
      attendus: [unTheme('Theme'), attendu('C82', 'mode-du-theme', 'Theme', 'les-deux', 'a-faire')],
    });
  }
  {
    const degradation = registre.degrader();
    copierLeTheme(degradation, 'theme-5', 'Theme (copy)', modesClairSombre('5'));
    degradation.zone({ palette: null, role: '(theme)', mode: 'les-deux' });
    registre.ajouter('X1', degradation, {
      description: 'X1 copie complète nommée Theme (copy)', attendus: [unTheme('Theme (copy)')],
    });
  }

  // X2. Un rôle reconnu deux fois dans une palette : une question à une candidate par variable, sans case cochée (Q-F2-6).
  const hover = leRole(base, 'primary', 'solid/hover');
  const doublon = (
    description: string, ecrire: (copie: VariableDuCatalogue) => void, attendus: readonly ConstatAttendu[], hypothese?: string,
  ): void => {
    const degradation = registre.degrader();
    const origine = degradation.variable(hover.cle);
    const copie: VariableDuCatalogue = structuredClone({ ...origine, cle: `${hover.cle}#2` });
    ecrire(copie);
    const nomsDuRole = [hover.nom, copie.nom];
    degradation.inserer(degradation.catalogue.variables, copie);
    degradation.touchees.add(copie.cle);
    degradation.zone({ palette: 'primary', role: 'solid/hover', mode: 'les-deux' });
    registre.ajouter('X2', degradation, {
      description: `X2 ${description}`, attendus: [attendu('C82', 'role-en-double', hover.nom, '', 'question', { candidats: nomsDuRole }), ...attendus],
      ...(hypothese ? { hypothese } : {}),
    });
  };
  doublon('solid/hover de primary écrit deux fois avec le même alias', () => undefined, []);
  doublon('solid/hover de primary écrit deux fois, la seconde au cran 900', (copie) => {
    for (const mode of MODES_DU_THEME) copie.valeurs![carte.modes[mode].id] = { alias: primary.rampes[mode][900].cle };
  }, MODES_DU_THEME.map((mode) => attendu('C82', 'cran', hover.nom, carte.modes[mode].nom, 'correction', { apres: { cle: hover.cibles[mode].cle } })), 'H5');
  doublon('solid/hover de primary écrit deux fois, la seconde sous le nom Primary/Solid/Hover', (copie) => { copie.nom = 'Primary/Solid/Hover'; }, []);
  doublon('solid/hover de primary écrit deux fois, la seconde sous le nom theme/primary/solid/hover', (copie) => { copie.nom = `${carte.collections.theme.nom}/${hover.nom}`; }, []);

  // X3. Des variables que le fichier n'a pas pu lire. Aucun contrôle ne juge ce qui n'a pas été lu.
  const illisibles = (description: string, collections: readonly string[], etat: 'non-chargee' | 'inaccessible', collectionEtat?: 'inaccessible'): void => {
    const degradation = registre.degrader();
    for (const variable of degradation.catalogue.variables.filter((entree) => collections.includes(entree.collection))) degradation.fixer(variable, 'etat', etat);
    if (collectionEtat) for (const cle of collections) degradation.fixer(collectionDuCas(degradation, cle), 'etat', collectionEtat);
    degradation.zone({ palette: null, role: '(lecture)', mode: 'les-deux' });
    // Les alias qui visent une collection inaccessible ne sont pas jugés, mais le kit le dit, par collection (Q-F2-8, aucune library choisie).
    const informations = collectionEtat ? collections.map((cle) => attendu('C63', 'cible-inaccessible', collectionDuCas(degradation, cle).nom, '', 'a-faire')) : [];
    registre.ajouter('X3', degradation, { description: `X3 ${description}`, attendus: informations });
  };
  illisibles('collection theme inaccessible, variables non chargées', ['theme'], 'non-chargee', 'inaccessible');
  illisibles('collection brands inaccessible, variables non chargées', ['brands'], 'non-chargee', 'inaccessible');
  illisibles('collection theme lue, variables non chargées', ['theme'], 'non-chargee');

  // X5. Un fichier déclaré libre : aucune collection n'a de rôle, donc aucun contrôle de structure ne juge rien.
  {
    const degradation = registre.degrader();
    for (const collection of degradation.catalogue.collections) degradation.fixer(collection, 'role', null);
    degradation.zone({ palette: null, role: '(fichier)', mode: 'les-deux' });
    registre.ajouter('X5', degradation, { description: 'X5 fichier déclaré libre, aucune collection reconnue', attendus: [] });
  }

  // X6. Des entrées malformées : aucun contrôle ne lève. Aucun constat n'y compte comme faux (`codesJuges` vide).
  const malformee = (description: string, degrader: (degradation: Degradation) => void): void => {
    const degradation = registre.degrader();
    degrader(degradation);
    degradation.zone({ palette: null, role: '(entrée)', mode: 'les-deux' });
    registre.ajouter('X6', degradation, { description: `X6 ${description}`, attendus: [], codesJuges: [] });
  };
  const divider = leRole(base, 'primary', 'page/divider');
  const cleCiblee = (rang: number) => primary.rampes.light[rang].cle;
  malformee('deux variables de brands qui s\'aliasent l\'une l\'autre', (degradation) => {
    const [a, b] = [cleCiblee(300), cleCiblee(400)];
    for (const mode of degradation.catalogue.collections.find((collection) => collection.cle === 'brands')!.modes) {
      degradation.viserDansLeMode(a, mode.id, b);
      degradation.viserDansLeMode(b, mode.id, a);
    }
  });
  malformee('un rôle de theme aliasé à lui-même', (degradation) => degradation.viser(divider.cle, 'light', divider.cle));
  malformee('une variable en double sous la même clé', (degradation) => degradation.inserer(degradation.catalogue.variables, structuredClone(degradation.variable(divider.cle))));
  malformee('une variable d\'une collection absente du catalogue', (degradation) => {
    degradation.inserer(degradation.catalogue.variables, {
      cle: 'inconnue|x', nom: 'x', collection: 'inconnue', type: 'COLOR', etat: 'presente', scopes: [], valeurs: { 'm-inconnue': { alias: cleCiblee(300) } },
    });
  });
  malformee('un mode de theme sans nom', (degradation) => {
    const theme = collectionDuCas(degradation, 'theme');
    degradation.inserer(theme.modes, { id: 'm-theme-sans-nom', nom: '' });
    for (const variable of themeDuCatalogue(degradation)) degradation.fixer(variable.valeurs!, 'm-theme-sans-nom', structuredClone(variable.valeurs![carte.modes.light.id]));
  });
  const surTheme = (degradation: Degradation, nom: string): void => {
    degradation.inserer(degradation.catalogue.variables, {
      cle: `theme|${nom || '(vide)'}`, nom, collection: 'theme', type: 'COLOR', etat: 'presente', scopes: [],
      valeurs: Object.fromEntries(MODES_DU_THEME.map((mode) => [carte.modes[mode].id, { alias: primary.rampes[mode][300].cle }])),
    });
  };
  malformee('une variable de theme au nom vide', (degradation) => surTheme(degradation, ''));
  malformee('un rôle de theme au nom à segment vide (primary//ring)', (degradation) => {
    const ring = leRole(base, 'primary', 'ring');
    degradation.fixer(degradation.variable(ring.cle), 'nom', `${primary.groupe.join('/')}//ring`);
  });
  malformee('une variable de theme d\'un seul segment', (degradation) => surTheme(degradation, 'primary'));
  return registre.cas;
}
