/**
 * Les relevés de test, construits en code. Aucun ne vient d'un fichier Figma
 * réel : ce sont des fixtures artificielles, nommées librement, qui couvrent
 * les cas de la matrice de validation du plan.
 */
import { FORMAT_DU_RELEVE, type CollectionRelevee, type Couleur, type Extension, type LectureManquee, type Releve, type TypeDeVariable, type ValeurSource, type VariableRelevee } from '../src/modele';

export const alias = (cible: string): ValeurSource => ({ nature: 'alias', cible });
export const nombre = (valeur: number): ValeurSource => ({ nature: 'nombre', nombre: valeur });
export const texte = (valeur: string): ValeurSource => ({ nature: 'texte', texte: valeur });
export const booleen = (valeur: boolean): ValeurSource => ({ nature: 'booleen', booleen: valeur });
export function couleur(hexa: string, a = 1): ValeurSource {
  const canal = (rang: number) => parseInt(hexa.slice(1 + rang * 2, 3 + rang * 2), 16) / 255;
  const valeur: Couleur = { r: canal(0), g: canal(1), b: canal(2), a };
  return { nature: 'couleur', couleur: valeur };
}

/** Un constructeur de relevé : identifiants lisibles, ordres préservés. */
export function constructeur(fichier = 'Fichier de test') {
  const collections: CollectionRelevee[] = [];
  const variables: VariableRelevee[] = [];
  const manquees: LectureManquee[] = [];
  return {
    /** Une collection ; `modes` nomme ses modes, leur identifiant est `${id}:${nom}`. */
    collection(id: string, nom: string, modes: string[], options: { defaut?: string; distante?: boolean; extension?: Omit<Extension, 'surcharges'> & { surcharges?: Extension['surcharges'] }; parents?: Record<string, string> } = {}) {
      const collection: CollectionRelevee = {
        id,
        nom,
        cle: `cle-${id}`,
        distante: options.distante ?? false,
        masqueeALaPublication: false,
        modes: modes.map((mode) => ({ id: `${id}:${mode}`, nom: mode, ...(options.parents?.[mode] ? { parent: options.parents[mode] } : {}) })),
        modeParDefaut: `${id}:${options.defaut ?? modes[0]}`,
        variables: [],
        extension: options.extension ? { surcharges: {}, ...options.extension } : null,
      };
      collections.push(collection);
      return collection;
    },
    /** Une variable ; `valeurs` est indexé par nom de mode de sa collection. */
    variable(id: string, collection: string, nom: string, type: TypeDeVariable, valeurs: Record<string, ValeurSource>, options: Partial<VariableRelevee> = {}) {
      const trouvee = collections.find((candidate) => candidate.id === collection);
      if (!trouvee) throw new Error(`collection ${collection} inconnue`);
      (trouvee.variables as string[]).push(id);
      for (const extension of collections.filter((candidate) => candidate.extension?.racine === collection)) (extension.variables as string[]).push(id);
      const variable: VariableRelevee = {
        id,
        nom,
        description: '',
        cle: `cle-${id}`,
        distante: trouvee.distante,
        masqueeALaPublication: false,
        collection,
        type,
        portees: ['ALL_SCOPES'],
        syntaxe: {},
        valeurs: Object.fromEntries(Object.entries(valeurs).map(([mode, valeur]) => [`${collection}:${mode}`, valeur])),
        ...options,
      };
      variables.push(variable);
      return variable;
    },
    manquee(manquee: LectureManquee) {
      manquees.push(manquee);
    },
    releve(revision = 1): Releve {
      return {
        format: FORMAT_DU_RELEVE,
        revision,
        fichier,
        luA: 0,
        collections,
        variables,
        manquees,
        capacites: { collectionsEtendues: true, variablesDistantes: true },
      };
    },
  };
}

/**
 * Un projet sans UCM : trois collections nommées librement, quatre types,
 * un zéro, un faux, une chaîne vide, un alpha, un cycle et une cible
 * inaccessible. Le groupe `usage` n'active rien.
 */
export function projetLibre(): Releve {
  const c = constructeur('Projet libre');
  c.collection('interface', 'Interface', ['Valeur']);
  c.collection('mesures', 'Mesures', ['Compact', 'Confort']);
  c.collection('couleurs', 'Couleurs', ['Jour', 'Nuit'], { defaut: 'Nuit' });
  c.variable('carte-fond', 'interface', 'card/fill', 'COLOR', { Valeur: alias('surface') });
  c.variable('carte-gap', 'interface', 'card/gap', 'FLOAT', { Valeur: alias('espace-carte') });
  c.variable('entete-fond', 'interface', 'card/header/fill', 'COLOR', { Valeur: alias('surface') });
  c.variable('entete-titre', 'interface', 'card/header/title', 'STRING', { Valeur: texte('Mon espace') });
  c.variable('cardinal', 'interface', 'cardinal/north', 'STRING', { Valeur: texte('N') });
  c.variable('libelle', 'interface', 'action/label', 'STRING', { Valeur: texte('') });
  c.variable('visible', 'interface', 'badge/visible', 'BOOLEAN', { Valeur: booleen(false) });
  c.variable('usage', 'interface', 'usage/surface', 'COLOR', { Valeur: alias('surface') });
  c.variable('legacy', 'interface', 'legacy/border', 'COLOR', { Valeur: alias('distante-absente') });
  c.variable('essai-a', 'interface', 'essai/a', 'COLOR', { Valeur: alias('essai-b') });
  c.variable('essai-b', 'interface', 'essai/b', 'COLOR', { Valeur: alias('essai-a') });
  c.variable('zero', 'mesures', 'zero', 'FLOAT', { Compact: nombre(0), Confort: nombre(0) });
  c.variable('espace-carte', 'mesures', 'spacing/card', 'FLOAT', { Compact: nombre(12), Confort: nombre(24) });
  c.variable('surface', 'couleurs', 'surface', 'COLOR', { Jour: alias('papier'), Nuit: alias('encre') });
  c.variable('papier', 'couleurs', 'papier', 'COLOR', { Jour: couleur('#F7F8FA'), Nuit: couleur('#F7F8FA') });
  c.variable('encre', 'couleurs', 'encre', 'COLOR', { Jour: couleur('#222630'), Nuit: couleur('#222630') });
  c.variable('voile', 'couleurs', 'voile', 'COLOR', { Jour: couleur('#000000', 0.4), Nuit: couleur('#FFFFFF', 0.25) });
  c.manquee({ id: 'distante-absente', genre: 'variable', issue: 'introuvable', message: 'Figma n’a rendu aucune variable pour cet identifiant.', depuis: 'legacy' });
  return c.releve();
}

/**
 * Une chaîne à travers cinq collections, avec un défaut hors de la première
 * colonne et deux axes indépendants (marque et thème).
 */
export function cinqCollections(): Releve {
  const c = constructeur('Multimarque');
  c.collection('composants', 'components', ['Valeur']);
  c.collection('usage', 'usage', ['Valeur']);
  c.collection('theme', 'theme', ['Light', 'Dark'], { defaut: 'Dark' });
  c.collection('marque', 'brand', ['Alpha', 'Beta']);
  c.collection('primitives', 'primitives', ['Valeur']);
  c.variable('bouton-fond', 'composants', 'button/primary/bg', 'COLOR', { Valeur: alias('usage-surface') });
  c.variable('usage-surface', 'usage', 'surface/primary', 'COLOR', { Valeur: alias('theme-primary') });
  c.variable('theme-primary', 'theme', 'primary/500', 'COLOR', { Light: alias('marque-500-clair'), Dark: alias('marque-500-sombre') });
  c.variable('marque-500-clair', 'marque', 'primary/light/500', 'COLOR', { Alpha: alias('rouge-500'), Beta: alias('vert-500') });
  c.variable('marque-500-sombre', 'marque', 'primary/dark/500', 'COLOR', { Alpha: alias('rouge-400'), Beta: alias('vert-400') });
  c.variable('rouge-500', 'primitives', 'colors/red/500', 'COLOR', { Valeur: couleur('#D23C3C') });
  c.variable('rouge-400', 'primitives', 'colors/red/400', 'COLOR', { Valeur: couleur('#E06666') });
  c.variable('vert-500', 'primitives', 'colors/green/500', 'COLOR', { Valeur: couleur('#2E9E5B') });
  c.variable('vert-400', 'primitives', 'colors/green/400', 'COLOR', { Valeur: couleur('#2E9E5B') });
  return c.releve();
}

/** Un relevé de grande taille, déterministe : `parCollection` variables dans chacune des `collections`. */
export function grandReleve(collections = 20, parCollection = 500, modes = 4): Releve {
  const c = constructeur('Grand fichier');
  const nomsDeModes = Array.from({ length: modes }, (_, rang) => `Mode ${rang + 1}`);
  for (let rang = 0; rang < collections; rang += 1) c.collection(`c${rang}`, `Collection ${rang}`, nomsDeModes);
  for (let rang = 0; rang < collections; rang += 1) {
    for (let numero = 0; numero < parCollection; numero += 1) {
      const id = `c${rang}-v${numero}`;
      const nom = `groupe-${numero % 7}/sous-groupe-${numero % 13}/niveau-${numero % 3}/token-${numero}`;
      const valeurs: Record<string, ValeurSource> = {};
      for (const [rangDuMode, mode] of nomsDeModes.entries()) {
        // Les collections pointent la précédente : des chaînes partagées, de longueur `rang`.
        valeurs[mode] = rang === 0 ? couleur(`#${((numero * 37 + rangDuMode * 11) % 256).toString(16).padStart(2, '0')}8040`) : alias(`c${rang - 1}-v${(numero * 3 + rangDuMode) % parCollection}`);
      }
      c.variable(id, `c${rang}`, nom, 'COLOR', valeurs);
    }
  }
  return c.releve();
}

export { composantBouton, composantComplexe, composantInterrompu, composantSansToken, composantSimple, composantTuile } from './fixturesDeComposant';
