/** Extrait les noms de la vue illustrée et les registres du kit compilé, sans exécuter la source. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { COLLECTIONS, FORMES_ANCIENNES_DES_COLLECTIONS, REGISTRES, REGISTRES_ARCHITECTURE } from '@ucm-kit/core/referentiel';

const racine = new URL('../', import.meta.url);
const depot = new URL('../../../', racine);
const sourceParDefaut = new URL('docs/notes/Recherches/Archi Tokens Multi-marques/donnees-vue-illustree.js', depot);
const sha256 = (contenu) => createHash('sha256').update(contenu).digest('hex');
const serialiser = (noms) => `[\n${noms.map((nom) => `  ${JSON.stringify(nom)}`).join(',\n')}\n]\n`;

/** Le générateur écrit une affectation de JSON ; aucun JavaScript de la source n'est exécuté. */
export function lireDonnees(texte) {
  const affectation = texte.match(/^(?:\/\/[^\n]*\n)*\s*window\.VUE_DONNEES\s*=\s*([\s\S]*?);?\s*$/);
  if (!affectation) throw new Error('Affectation window.VUE_DONNEES absente.');
  const donnees = JSON.parse(affectation[1]);
  if (!donnees.collections || typeof donnees.collections !== 'object' || Array.isArray(donnees.collections)) {
    throw new Error('Collections de la vue illustrée absentes.');
  }
  return donnees;
}

/** Nom courant d'une collection de l'instantané, ou undefined si ni le nom courant ni une forme ancienne ne la désignent. */
export function collectionCourante(collection) {
  if (COLLECTIONS.includes(collection)) return collection;
  return Object.hasOwn(FORMES_ANCIENNES_DES_COLLECTIONS, collection) ? FORMES_ANCIENNES_DES_COLLECTIONS[collection] : undefined;
}

/**
 * Une entrée par variable, même si plusieurs modes la renseignent. Le nom garde la forme de l'instantané, qui vient
 * d'un export Figma et peut dater d'avant un renommage de collection ; la collection et la couche suivent le nom courant.
 */
export function extraireNoms(donnees) {
  const entrees = new Map();
  for (const [collectionInstantane, variables] of Object.entries(donnees.collections)) {
    const collection = collectionCourante(collectionInstantane);
    if (!collection) throw new Error(`Collection UCM inconnue : ${collectionInstantane}`);
    for (const [chemin, valeur] of Object.entries(variables)) {
      if (!chemin.startsWith(`${collectionInstantane}.`)) throw new Error(`Chemin hors de sa collection : ${chemin}`);
      entrees.set(chemin, { collection, valeur });
    }
  }
  const types = new Map();
  function typeDuChemin(chemin, visites = new Set()) {
    if (types.has(chemin)) return types.get(chemin);
    if (visites.has(chemin)) throw new Error(`Cycle d'alias : ${[...visites, chemin].join(' → ')}`);
    const entree = entrees.get(chemin);
    if (!entree) throw new Error(`Cible d'alias absente : ${chemin}`);
    const suivants = new Set([...visites, chemin]);
    const valeurs = typeof entree.valeur === 'object' && entree.valeur !== null
      ? Object.values(entree.valeur) : [entree.valeur];
    const typesDesModes = new Set(valeurs.map((valeur) => {
      if (typeof valeur !== 'string' || valeur === '∅') return null;
      if (/^[a-z-]+\./.test(valeur)) return typeDuChemin(valeur, suivants);
      if (/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(valeur)) return 'color';
      if (/^-?(?:\d+(?:\.\d+)?|\.\d+)px$/.test(valeur)) return 'dimension';
      if (/\.font-?weight\./.test(chemin) && /^\d+$/.test(valeur)) return 'fontWeight';
      if (/\.font-?family\./.test(chemin) && valeur.trim()) return 'fontFamily';
      if (/^-?\d+(?:\.\d+)?$/.test(valeur)) return 'number';
      return null;
    }));
    // L'instantané ne porte plus les types DTCG : un mode absent ou contradictoire reste indéterminé.
    const type = typesDesModes.size === 1 ? [...typesDesModes][0] : null;
    types.set(chemin, type);
    return type;
  }
  return [...entrees].map(([chemin, { collection }]) => ({
    nom: chemin.split('.').join('/'),
    type: typeDuChemin(chemin),
    couche: collection === 'primitives' ? 'primitive' : collection === 'components' ? 'composant' : 'semantique',
  })).sort((a, b) => a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : 0);
}

function ecrireCorpus(source) {
  const contenu = readFileSync(source, 'utf8');
  const donnees = lireDonnees(contenu);
  const noms = extraireNoms(donnees);
  const registres = [...REGISTRES, ...REGISTRES_ARCHITECTURE].map((registre) => ({
    id: registre.id,
    extensible: registre.extensible,
    termes: registre.termes.map((terme) => ({
      id: terme.id, toleres: [...(terme.toleres ?? [])],
      // La forme propre à une catégorie (les tailles des dossiers en mots entiers) fait partie de la règle.
      ...(terme.identifiantParCategorie ? { identifiantParCategorie: { ...terme.identifiantParCategorie } } : {}),
    })),
  }));
  const contenuDesRegistres = JSON.stringify(registres, null, 1) + '\n';
  const cheminDansLeDepot = (chemin) => relative(fileURLToPath(depot), fileURLToPath(chemin)).replace(/\\/g, '/');
  const provenance = {
    source: { fichier: cheminDansLeDepot(source), sha256: sha256(contenu), modes: donnees.modes },
    extracteur: { fichier: cheminDansLeDepot(import.meta.url), sha256: sha256(readFileSync(fileURLToPath(import.meta.url))) },
    kit: {
      version: JSON.parse(readFileSync(new URL('packages/kit/package.json', depot), 'utf8')).version,
      sha256Registres: sha256(contenuDesRegistres),
    },
    comptes: {
      noms: noms.length,
      parCollection: Object.fromEntries(Object.entries(donnees.collections).map(([collection, variables]) => [collectionCourante(collection) ?? collection, Object.keys(variables).length])),
      sansType: noms.filter((nom) => nom.type === null).length,
      registres: registres.length,
    },
  };
  mkdirSync(new URL('ucm/', racine), { recursive: true });
  writeFileSync(new URL('ucm/noms.json', racine), serialiser(noms));
  writeFileSync(new URL('ucm/registres.json', racine), contenuDesRegistres);
  writeFileSync(new URL('ucm/sources.json', racine), JSON.stringify(provenance, null, 2) + '\n');
  console.log(`${noms.length} noms UCM, ${provenance.comptes.sansType} sans type, ${registres.length} registres`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ecrireCorpus(process.argv[2] ? pathToFileURL(resolve(process.argv[2])) : sourceParDefaut);
}
