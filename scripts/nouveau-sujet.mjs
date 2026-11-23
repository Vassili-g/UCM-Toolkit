/**
 * Crée le dossier de recherche d'une piste : `npm run sujet -- "<Nom>" <Pn> "<utilité>"`.
 *
 * Un sujet a un dossier sous `docs/notes/Recherches/`, inscrit au registre des
 * documents, cité par le sommaire et rattaché à sa piste par le champ `recherche`
 * de `pistes.json`. Le script fait les quatre écritures d'un coup.
 * `tests/dossiersDeRecherche.test.ts` tient la règle sur le dépôt.
 *
 * Les éditions sont textuelles pour garder l'indentation et la fin de ligne de
 * chaque fichier. `UCM_RACINE` remplace la racine du dépôt (essais sur copie).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = process.env.UCM_RACINE ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECHERCHES = 'docs/notes/Recherches';
const REGISTRE = '.agents/domiciles.json';
const SOMMAIRE = `${RECHERCHES}/README.md`;
const PISTES = `${RECHERCHES}/Evolutions globales/pistes.json`;

function echec(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const lire = (chemin) => fs.readFileSync(path.join(racine, chemin), 'utf8');
const ecrire = (chemin, texte) => fs.writeFileSync(path.join(racine, chemin), texte);
const finDeLigne = (texte) => (texte.includes('\r\n') ? '\r\n' : '\n');

const [nom, piste, utilite] = process.argv.slice(2);
if (!nom || !piste || !utilite) {
  echec('Usage : npm run sujet -- "<Nom du dossier>" <Pn> "<utilité>"');
}
if (/[\/:*?"<>|]/.test(nom) || nom.trim() !== nom) echec(`Nom de dossier invalide : « ${nom} ».`);

const dossier = `${RECHERCHES}/${nom}`;
if (fs.existsSync(path.join(racine, dossier))) echec(`Le dossier « ${nom} » existe déjà.`);

const pistes = lire(PISTES);
const lignesPistes = pistes.split(/\r?\n/);
const debut = lignesPistes.findIndex((ligne) => ligne.trim() === `"id": "${piste}",`);
if (debut === -1) echec(`Piste inconnue : ${piste}.`);
let fin = lignesPistes.findIndex((ligne, i) => i > debut && /^\s*"id":/.test(ligne));
if (fin === -1) fin = lignesPistes.length;
if (lignesPistes.slice(debut, fin).some((ligne) => /^\s*"recherche":/.test(ligne))) {
  echec(`La piste ${piste} a déjà une recherche.`);
}
const ligneSujet = lignesPistes.findIndex((ligne, i) => i > debut && i < fin && /^\s*"sujet":/.test(ligne));
if (ligneSujet === -1) echec(`La piste ${piste} n'a pas de champ « sujet » où ranger la recherche.`);

const slug = nom
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .replace(/\s+/g, '-');
const fichier = `RECHERCHE-${slug.toUpperCase()}.md`;
const cheminDocument = `${dossier}/${fichier}`;
const cle = slug.toLowerCase();

// 1. Le document.
fs.mkdirSync(path.join(racine, dossier), { recursive: true });
ecrire(cheminDocument, `# ${nom}\n\n## Questions au mainteneur\n`);

// 2. Le registre, dans l'ordre alphabétique des dossiers.
const registre = lire(REGISTRE);
const eolRegistre = finDeLigne(registre);
const lignesRegistre = registre.split(/\r?\n/);
const motif = `${RECHERCHES}/${nom}/**`;
const pointDeDossier = /^(\s*)"docs\/notes\/Recherches\/(.+)\/\*\*",?$/;
let rang = lignesRegistre.findIndex((ligne) => {
  const trouve = pointDeDossier.exec(ligne);
  return trouve !== null && trouve[2].localeCompare(nom, 'fr') > 0;
});
if (rang === -1) rang = lignesRegistre.findIndex((ligne) => ligne.includes(`"${SOMMAIRE}"`));
if (rang === -1) echec(`Le registre ne contient pas « ${SOMMAIRE} » : motif non inscrit.`);
const indentation = /^(\s*)/.exec(lignesRegistre[rang])[1];
lignesRegistre.splice(rang, 0, `${indentation}"${motif}",`);
ecrire(REGISTRE, lignesRegistre.join(eolRegistre));

// 3. Le sommaire : ligne de la table « Sujets » et référence du lien.
const sommaire = lire(SOMMAIRE);
const eolSommaire = finDeLigne(sommaire);
const lignesSommaire = sommaire.split(/\r?\n/);
const titre = lignesSommaire.findIndex((ligne) => ligne.trim() === '## Sujets');
if (titre === -1) echec(`Le sommaire n'a pas de section « Sujets ».`);
let derniere = lignesSommaire.findIndex((ligne, i) => i > titre && ligne.startsWith('|'));
while (derniere !== -1 && (lignesSommaire[derniere + 1] ?? '').startsWith('|')) derniere += 1;
if (derniere === -1) echec(`La section « Sujets » n'a pas de table.`);
lignesSommaire.splice(derniere + 1, 0, `| [${nom}][${cle}] | ${utilite} | Recherche en cours. |`);
const cible = `./${encodeURIComponent(nom).replace(/%2F/g, '/')}/${fichier}`;
let derniereReference = -1;
lignesSommaire.forEach((ligne, i) => {
  if (/^\[[^\]]+\]: \.\//.test(ligne)) derniereReference = i;
});
const reference = `[${cle}]: ${cible}`;
if (derniereReference === -1) lignesSommaire.push(reference);
else lignesSommaire.splice(derniereReference + 1, 0, reference);
ecrire(SOMMAIRE, lignesSommaire.join(eolSommaire));

// 4. La piste.
const eolPistes = finDeLigne(pistes);
const indentationPiste = /^(\s*)/.exec(lignesPistes[ligneSujet])[1];
lignesPistes.splice(ligneSujet + 1, 0, `${indentationPiste}"recherche": ${JSON.stringify(cheminDocument)},`);
ecrire(PISTES, lignesPistes.join(eolPistes));

process.stdout.write(
  [
    'Fichiers touchés :',
    `  ${cheminDocument}`,
    `  ${REGISTRE}`,
    `  ${SOMMAIRE}`,
    `  ${PISTES}`,
    'Lancez `npm run vues` pour régénérer l\'inventaire.',
    '',
  ].join('\n'),
);
