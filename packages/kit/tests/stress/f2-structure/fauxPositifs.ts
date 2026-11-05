/**
 * Les faux positifs du stress test F2 (section 4 du plan, propriété P1) : 85 thèmes écrits justes, dont aucun des deux contrôles du
 * mode Tokens ne doit rien dire. Le cas `A0-<n>` est le n-ième des 72 profils de base ; les cas `A1` à `A7` sont les 13 thèmes
 * ciblés. Aucun cas n'attend de constat, sauf A1 quand la collection `theme` change de nom au point de ne plus être reconnue : le
 * kit dit alors `theme-non-reconnu` (E3.9, QV-4), une information qui n'est pas un faux constat.
 *
 * Les cas A0 ne dégradent rien. Les thèmes ciblés partent de P0, sauf A3, qui part d'un profil large pour renommer trois marques.
 * Le plan veut aussi les groupes `tertiary` et `success/soft` : le profil large porte déjà `tertiary` et les statuts à deux niveaux.
 * Les thèmes A1 renomment une collection ; le kit ne reconnaît pas `themes`, donc ce thème-là n'a aucune collection `theme` et reçoit
 * l'information `theme-non-reconnu`.
 */
import { collectionsDeReference, type CatalogueDeReference, type CollectionDuCatalogue } from '../../../src/controles/index.js';
import {
  COULEUR_DIRECTE, Degradation, Registre, ajouterUnMode, attendu, collectionDuCas,
  type CasDeStructure,
} from './cas.js';
import type { ConstatAttendu } from '../commun/types.js';
import { GRAINE_PAR_DEFAUT, PROFILS_DE_THEME, themeDuProfil, type ProfilDeTheme, type ThemeDeBase } from './themeUcm.js';

/** Un cas par profil : le thème du profil lui-même, sans dégradation ni zone. */
export function fauxPositifsDesProfils(profils: readonly ProfilDeTheme[] = PROFILS_DE_THEME, graine: number = GRAINE_PAR_DEFAUT): CasDeStructure[] {
  return profils.map((profil, rang) => {
    const theme = themeDuProfil(profil, graine);
    return {
      id: `A0-${rang + 1}`, famille: 'F2', operateur: 'A0', verdict: 'attendu', attendus: [],
      entree: {
        theme, base: theme, annuler: () => undefined, zones: [], touchees: [], ecriture: theme.ecriture, rolesIgnores: [],
        description: `A0 profil ${profil.id} (${profil.palettes}, ${profil.ecriture}, sens ${profil.sens}, ${profil.collectionRedite ? 'collection redite' : 'collection non redite'}, rampes ${profil.rampes})`,
      },
    };
  });
}

/** Les segments de ce nom, dont ceux qui valent `ancien` deviennent `nouveau` (la clé de la variable ne change pas). */
function renommerLeSegment(degradation: Degradation, ancien: string, nouveau: string): void {
  for (const variable of degradation.catalogue.variables) {
    const segments = variable.nom.split('/');
    if (segments.includes(ancien)) degradation.fixer(variable, 'nom', segments.map((segment) => (segment === ancien ? nouveau : segment)).join('/'));
  }
}

function renommerLaCollection(degradation: Degradation, cle: string, nom: string): void {
  const collection = collectionDuCas(degradation, cle);
  degradation.fixer(collection, 'nom', nom);
  degradation.fixer(collection, 'role', collectionsDeReference([{ cle, nom, modes: [], etat: 'lue' }], 'ucm')[0].role);
}

/** Un fichier libre : des collections de noms quelconques, sans aucun rôle, valide au sens des alias, des valeurs et des modes. */
function catalogueLibre(): CatalogueDeReference {
  const collections: CollectionDuCatalogue[] = collectionsDeReference([
    { cle: 'c-couleurs', nom: 'Couleurs', modes: [{ id: 'm-clair', nom: 'Clair' }, { id: 'm-sombre', nom: 'Sombre' }], etat: 'lue' },
    { cle: 'c-espaces', nom: 'Espaces', modes: [{ id: 'm-defaut', nom: 'Défaut' }], etat: 'lue' },
    { cle: 'c-theme', nom: 'Mon thème', modes: [{ id: 'm-t1', nom: 'A' }, { id: 'm-t2', nom: 'B' }], etat: 'lue' },
  ], 'libre');
  const couleur = (cle: string, nom: string, valeurs: Record<string, { alias: string } | { valeur: unknown }>, scopes: string[] = [], collection = 'c-couleurs') =>
    ({ cle, nom, collection, type: 'COLOR' as const, etat: 'presente' as const, scopes, valeurs });
  const nombre = (cle: string, nom: string, valeur: number) =>
    ({ cle, nom, collection: 'c-espaces', type: 'FLOAT' as const, etat: 'presente' as const, scopes: [], valeurs: { 'm-defaut': { valeur } } });
  return {
    version: 1, library: null, collections,
    variables: [
      couleur('c-couleurs|bleu/500', 'bleu/500', { 'm-clair': { valeur: { ...COULEUR_DIRECTE } }, 'm-sombre': { valeur: { ...COULEUR_DIRECTE } } }, ['ALL_SCOPES']),
      couleur('c-couleurs|bleu/600', 'bleu/600', { 'm-clair': { alias: 'c-couleurs|bleu/500' }, 'm-sombre': { alias: 'c-couleurs|bleu/500' } }),
      couleur('c-theme|primary/solid/defaut', 'primary/solid/defaut', { 'm-t1': { alias: 'c-couleurs|bleu/500' }, 'm-t2': { valeur: { ...COULEUR_DIRECTE } } }, ['ALL_SCOPES'], 'c-theme'),
      couleur('c-theme|sombre/primary/ring', 'sombre/primary/ring', { 'm-t1': { alias: 'c-couleurs|bleu/600' }, 'm-t2': { alias: 'c-couleurs|bleu/600' } }, [], 'c-theme'),
      nombre('c-espaces|sizing/1', 'sizing/1', 4), nombre('c-espaces|sizing/2', 'sizing/2', 4), nombre('c-espaces|sizing/3', 'sizing/3', 4),
    ],
  };
}

/** Les 13 thèmes ciblés de la section 4, en 7 opérateurs. */
export function fauxPositifsCibles(base: ThemeDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeStructure[] {
  const registre = new Registre(base, graine);
  const { carte } = base;
  const ajouter = (operateur: string, degradation: Degradation, description: string, attendus: readonly ConstatAttendu[] = []): void =>
    registre.ajouter(operateur, degradation, { description: `${operateur} ${description}`, attendus });
  const zone = (degradation: Degradation): void => degradation.zone({ palette: null, role: '(fichier)', mode: 'les-deux' });

  // A1. Les écritures de la collection `theme`, et les formes anciennes de `brands`, de `utility` et de `layout`.
  for (const [cle, nom] of [['theme', 'Theme'], ['theme', 'themes'], ['theme', 'THEME'], ['brands', 'color-brands'], ['utility', 'color-utilities'], ['layout', 'layouts']] as const) {
    const degradation = registre.degrader();
    renommerLaCollection(degradation, cle, nom);
    zone(degradation);
    // Aucune collection ne se lit comme `theme` alors que les autres gardent leur rôle : l'intégrité UCM n'est pas contrôlée, et le kit le dit.
    const nonReconnu = cle === 'theme' && collectionDuCas(degradation, cle).role !== 'theme';
    ajouter('A1', degradation, `collection ${cle} écrite ${nom}`, nonReconnu ? [attendu('C82', 'theme-non-reconnu', '', '', 'a-faire')] : []);
  }

  // A2. Les modes de `theme` écrits Light et Dark, puis en majuscules complètes.
  for (const [clair, sombre] of [['Light', 'Dark'], ['LIGHT', 'DARK']] as const) {
    const degradation = registre.degrader();
    const theme = collectionDuCas(degradation, 'theme');
    degradation.fixer(theme.modes[0], 'nom', clair);
    degradation.fixer(theme.modes[1], 'nom', sombre);
    zone(degradation);
    ajouter('A2', degradation, `modes de theme écrits ${clair} et ${sombre}`);
  }

  // A3. Des noms de groupes libres sur un profil large : trois marques renommées, des statuts à deux niveaux gardés.
  {
    const large = themeDuProfil(PROFILS_DE_THEME.find((profil) => profil.id === 'p03')!, graine);
    const degradation = new Degradation(large);
    for (const [ancien, nouveau] of [['primary', 'accent'], ['secondary', 'brand-a'], ['tertiary', 'brand_b']] as const) renommerLeSegment(degradation, ancien, nouveau);
    degradation.zone({ palette: null, role: '(groupes)', mode: 'les-deux' });
    const garde = new Registre(large, graine);
    garde.ajouter('A3', degradation, { description: 'A3 marques renommées accent, brand-a et brand_b sur un profil large, statuts success/soft gardés', attendus: [] });
    registre.cas.push(...garde.cas);
  }

  // A4. `brands` aux modes Light et Dark, sans segment de mode dans les chemins : une variable par cran, un alias par mode de marque.
  {
    const degradation = registre.degrader();
    const brands = collectionDuCas(degradation, 'brands');
    degradation.fixer(brands.modes[0], 'nom', 'Light');
    degradation.fixer(brands.modes[1], 'nom', 'Dark');
    for (const palette of carte.palettes.filter((entree) => entree.couche === 'brands')) {
      for (const [cran, claire] of Object.entries(palette.rampes.light)) {
        const sombre = palette.rampes.dark[Number(cran)];
        const variableClaire = degradation.variable(claire.cle);
        degradation.ecrireLaValeur(claire.cle, brands.modes[1].id, structuredClone(degradation.variable(sombre.cle).valeurs![brands.modes[0].id]));
        degradation.fixer(variableClaire, 'nom', [...palette.groupe, cran].join('/'));
        for (const variable of degradation.catalogue.variables) {
          for (const [mode, valeur] of Object.entries(variable.valeurs ?? {})) {
            if ('alias' in valeur && valeur.alias === sombre.cle) degradation.ecrireLaValeur(variable.cle, mode, { alias: claire.cle });
          }
        }
        degradation.retirerLaVariable(sombre.cle);
      }
    }
    zone(degradation);
    ajouter('A4', degradation, 'brands aux modes Light et Dark, chemins sans segment de mode');
  }

  // A5. Un fichier déclaré libre, aux collections et aux noms quelconques.
  {
    const degradation = registre.degrader();
    degradation.fixer(degradation.theme, 'catalogue', catalogueLibre());
    zone(degradation);
    ajouter('A5', degradation, 'fichier libre aux collections Couleurs, Espaces et Mon thème');
  }

  // A6. Une échelle `sizing` croissante sur trois modes.
  {
    const degradation = registre.degrader();
    ajouterUnMode(degradation, 'layout', { id: 'm-layout-2', nom: 'Mode 2' });
    ajouterUnMode(degradation, 'layout', { id: 'm-layout-3', nom: 'Mode 3' });
    for (const marche of carte.echelle) {
      degradation.ecrireLaValeur(marche.cle, 'm-layout-2', { valeur: marche.valeur * 1.5 });
      degradation.ecrireLaValeur(marche.cle, 'm-layout-3', { valeur: marche.valeur * 2 });
    }
    zone(degradation);
    ajouter('A6', degradation, 'échelle sizing croissante sur trois modes');
  }

  // A7. Une couleur directe dans `components`, sans segment de famille (les primitives sont directes dans le thème de base).
  {
    const degradation = registre.degrader();
    const jeton = carte.composant.jetons.find((entree) => entree.palette === 'secondary' && entree.role === 'ring')!;
    degradation.fixer(degradation.variable(jeton.cle), 'nom', jeton.nom.split('/').filter((segment) => segment !== 'color').join('/'));
    degradation.ecrireLaValeur(jeton.cle, 'm-components', { valeur: { ...COULEUR_DIRECTE } });
    zone(degradation);
    ajouter('A7', degradation, 'couleur de components en valeur directe, sans segment de famille');
  }
  return registre.cas;
}

/** Les 85 cas de la section A : les 72 profils, puis les 13 thèmes ciblés. */
export function fauxPositifs(base: ThemeDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeStructure[] {
  return [...fauxPositifsDesProfils(PROFILS_DE_THEME, graine), ...fauxPositifsCibles(base, graine)];
}
