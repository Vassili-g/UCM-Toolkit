/**
 * Les catalogues de `src/ui/textes/*.ts` écrivent les termes de Figma en
 * anglais, même pour un Figma en français (CONTRIBUTING.md, « Mots »), et
 * n'emploient pas le glyphe « · ». La loi refuse la traduction française d'un
 * terme de Figma dans un texte d'écran : « portée » pour scope, « calque » pour
 * layer, « fond de cadre » et « fond de forme » pour fill, « contour » pour
 * stroke, « bibliothèque » pour library.
 *
 * `EXCEPTIONS` liste les occurrences d'avant la loi, par fichier, entrée et mot.
 * Les lots d'interface la vident : une exception qui ne correspond plus à rien
 * est refusée à son tour, pour que la liste ne garde pas d'entrée morte.
 *
 * Borne : la loi lit les littéraux d'un fichier, hors commentaires, et rattache
 * chacun à la première clé de sa ligne. Un mot rangé d'abord dans une variable
 * lui échappe.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');
const CATALOGUES = path.join(racine, 'src', 'ui', 'textes');

/** Le glyphe est refusé comme un mot ; les autres entrées sont des mots de Figma. */
const GLYPHE = '·';
const MOTS = /(?<![\p{L}])(portées?|calques?|contours?|bibliothèques?|fond de cadre|fond de forme)(?![\p{L}])/giu;

export interface Exception { readonly fichier: string; readonly entree: string; readonly mot: string }

/** Les occurrences d'avant la loi. Chaque lot d'interface retire celles de ses écrans. */
const EXCEPTIONS: readonly Exception[] = [
  { fichier: 'arbre.ts', entree: "perimetre", mot: GLYPHE },
  { fichier: 'arbre.ts', entree: "'calque-explicite'", mot: "calque" },
  { fichier: 'arbre.ts', entree: "'calque-explicite'", mot: "calque" },
  { fichier: 'arbre.ts', entree: "'calque-herite'", mot: "calque" },
  { fichier: 'arbre.ts', entree: "'calque-herite'", mot: "calque" },
  { fichier: 'composant.ts', entree: "aucunToken", mot: GLYPHE },
  { fichier: 'composant.ts', entree: "aucunSurCeCalque", mot: "calque" },
  { fichier: 'composant.ts', entree: "calquesNonLus", mot: "calque" },
  { fichier: 'composant.ts', entree: "calquesIgnores", mot: "calque" },
  { fichier: 'composant.ts', entree: "libelles", mot: "contour" },
  { fichier: 'composant.ts', entree: "autre", mot: GLYPHE },
  { fichier: 'fiche.ts', entree: "modeEtOrigine", mot: GLYPHE },
  { fichier: 'fiche.ts', entree: "action", mot: "bibliothèque" },
  { fichier: 'nomenclature.ts', entree: "sansVariableLocaleExplication", mot: "bibliothèque" },
  { fichier: 'nomenclature.ts', entree: "suiventSurTotal", mot: GLYPHE },
  { fichier: 'nomenclature.ts', entree: "collectionsReconnues", mot: GLYPHE },
  { fichier: 'nomenclature.ts', entree: "?", mot: GLYPHE },
  { fichier: 'nomenclature.ts', entree: "?", mot: GLYPHE },
  { fichier: 'nomenclature.ts', entree: "fichiersUtilisateurs", mot: "bibliothèque" },
  { fichier: 'nomenclature.ts', entree: "filtrerAvecNombre", mot: GLYPHE },
  { fichier: 'nomenclature.ts', entree: "?", mot: GLYPHE },
  { fichier: 'nomenclature.ts', entree: "detailAvecIndice", mot: GLYPHE },
  { fichier: 'nomenclature.ts', entree: "sectionPlusTard", mot: GLYPHE },
  { fichier: 'nomenclature.ts', entree: "autresPistes", mot: GLYPHE },
  { fichier: 'nomenclature.ts', entree: "pastilleUcmDeCategorie", mot: GLYPHE },
  { fichier: 'nomenclature.ts', entree: "texte", mot: GLYPHE },
  { fichier: 'nomenclature.ts', entree: "titreARenommer", mot: GLYPHE },
  { fichier: 'nomenclature.ts', entree: "titreDejaEmploye", mot: GLYPHE },
];

const LITTERAL = /(\/\*[\s\S]*?\*\/)|(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*')|("(?:[^"\\\n]|\\.)*")|(`(?:[^`\\]|\\.)*`)/g;
const CLE = /^\s*(?:\{\s*)?(?:'([^']+)'|"([^"]+)"|([A-Za-z_]\w*))\s*:/;

/** Les occurrences d'un terme refusé dans les littéraux d'une source, avec la clé de leur ligne. */
export function occurrences(source: string): Exception[] {
  const lignes = source.split('\n');
  const debuts: number[] = [];
  let cumul = 0;
  for (const ligne of lignes) {
    debuts.push(cumul);
    cumul += ligne.length + 1;
  }
  const trouvees: Exception[] = [];
  for (const m of source.matchAll(LITTERAL)) {
    if (m[1] !== undefined || m[2] !== undefined) continue;
    const rang = debuts.filter((debut) => debut <= (m.index ?? 0)).length - 1;
    const cle = CLE.exec(lignes[rang]);
    const entree = cle ? (cle[1] !== undefined ? `'${cle[1]}'` : cle[2] !== undefined ? `"${cle[2]}"` : cle[3]) : '?';
    const texte = m[0].slice(1, -1);
    for (const mot of texte.matchAll(MOTS)) trouvees.push({ fichier: '', entree, mot: mot[1].toLowerCase() });
    if (texte.includes(GLYPHE)) trouvees.push({ fichier: '', entree, mot: GLYPHE });
  }
  return trouvees;
}

const cle = (exception: Exception): string => `${exception.fichier} ${exception.entree} ${exception.mot}`;

/** Les fautes d'un catalogue : chaque occurrence hors liste, et chaque exception de la liste qui ne correspond à rien. */
export function fautes(fichier: string, source: string, exceptions: readonly Exception[]): string[] {
  const trouvees = occurrences(source).map((occurrence) => cle({ ...occurrence, fichier }));
  const permises = exceptions.filter((exception) => exception.fichier === fichier).map(cle);
  const restantes = [...permises];
  const refusees: string[] = [];
  for (const trouvee of trouvees) {
    const rang = restantes.indexOf(trouvee);
    if (rang === -1) refusees.push(`${trouvee} : terme refusé hors de la liste d'exceptions`);
    else restantes.splice(rang, 1);
  }
  return [...refusees, ...restantes.map((morte) => `${morte} : exception sans occurrence, à retirer de la liste`)];
}

test('les catalogues n’emploient ni la traduction française d’un terme de Figma, ni « · », hors de la liste d’exceptions', () => {
  const catalogues = fs.readdirSync(CATALOGUES).filter((nom) => nom.endsWith('.ts'));
  assert.ok(catalogues.includes('arbre.ts') && catalogues.includes('nomenclature.ts'), 'src/ui/textes/ n’est plus balayé');
  const reperees = catalogues.flatMap((nom) => fautes(nom, fs.readFileSync(path.join(CATALOGUES, nom), 'utf8'), EXCEPTIONS));
  assert.deepEqual(reperees, []);
});

test('la loi refuse « portée » et ses voisins hors de sa liste, et lit la clé de la ligne', () => {
  const source = "export const T = {\n  etiquette: 'Portées',\n  autre: `${n} calque${n > 1 ? 's' : ''}`,\n  // portée dans un commentaire\n  sobre: 'Scopes',\n  point: 'a · b',\n};\n";
  assert.deepEqual(fautes('essai.ts', source, []).map((faute) => faute.split(' : ')[0]), ['essai.ts etiquette portées', 'essai.ts autre calque', 'essai.ts point ·']);
  assert.deepEqual(fautes('essai.ts', source, [
    { fichier: 'essai.ts', entree: 'etiquette', mot: 'portées' }, { fichier: 'essai.ts', entree: 'autre', mot: 'calque' }, { fichier: 'essai.ts', entree: 'point', mot: GLYPHE },
  ]), []);
  assert.deepEqual(fautes('essai.ts', 'x = { sobre: \'Scopes\' };', [{ fichier: 'essai.ts', entree: 'sobre', mot: 'portée' }]).length, 1);
});
