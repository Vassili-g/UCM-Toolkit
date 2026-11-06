/**
 * Génère `src/referentiel/mots-connus-donnees.ts` : les mots de 4 à 6 lettres que `motConnu` (`src/referentiel/mots-connus.ts`) lit
 * pour décider qu'un mot proche d'un terme du kit est un vrai mot, donc pas une faute (E15).
 *
 * Deux listes. Les mots anglais courants viennent de Scowl (Spell Checker Oriented Word Lists, Kevin Atkinson), dans les fichiers
 * `english-`, `american-` et `british-words.<taille>` jusqu'à la taille demandée (35 par défaut). Les segments des noms viennent des
 * fichiers `noms.json` de `docs/references/design-systems`, hors `ucm`, découpés par `motsDUnNom`.
 *
 * Pour rejouer, télécharger l'archive dans un dossier vide hors du dépôt, la dézipper, puis lancer depuis la racine du dépôt la commande
 * `npx tsx packages/kit/scripts/generer-mots-connus.ts --scowl <dossier dézippé> [--taille 35] [--verifier]`.
 * L'archive est `https://downloads.sourceforge.net/wordlist/scowl-2020.12.07.zip`.
 * `--verifier` ne réécrit rien et sort en erreur quand le fichier suivi n'est plus ce que la commande produirait.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { motsDUnNom } from '../src/referentiel/termes-connus.js';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SORTIE = join(RACINE, 'packages/kit/src/referentiel/mots-connus-donnees.ts');
const DOSSIER_DES_SYSTEMES = join(RACINE, 'docs/references/design-systems');
const TAILLES = [10, 20, 35, 40, 50, 55, 60, 70];
const FAMILLES = ['english', 'american', 'british'];
const LONGUEUR_MINIMALE = 4;
const LONGUEUR_MAXIMALE = 6;
const COLONNES = 110;

const garde = (mot: string): boolean => mot.length >= LONGUEUR_MINIMALE && mot.length <= LONGUEUR_MAXIMALE && /^[a-z]+$/.test(mot);

function option(nom: string): string | undefined {
  const rang = process.argv.indexOf(nom);
  return rang >= 0 ? process.argv[rang + 1] : undefined;
}

export function motsAnglais(dossier: string, taille: number): string[] {
  const final = existsSync(join(dossier, 'final')) ? join(dossier, 'final') : dossier;
  const mots = new Set<string>();
  for (const niveau of TAILLES.filter((valeur) => valeur <= taille)) {
    for (const famille of FAMILLES) {
      const fichier = join(final, `${famille}-words.${niveau}`);
      if (!existsSync(fichier)) continue;
      for (const ligne of readFileSync(fichier, 'latin1').split(/\r?\n/)) if (garde(ligne)) mots.add(ligne);
    }
  }
  return [...mots].sort();
}

/** Les segments, par système (`ucm` exclu : ses mots sont les termes du kit), de 4 à 6 lettres. */
export function segmentsParSysteme(dossier: string = DOSSIER_DES_SYSTEMES): Map<string, string[]> {
  const parSysteme = new Map<string, string[]>();
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const fichier = join(dossier, entree.name, 'noms.json');
    if (!entree.isDirectory() || entree.name === 'ucm' || !existsSync(fichier)) continue;
    const noms = JSON.parse(readFileSync(fichier, 'utf8')) as { nom: string }[];
    parSysteme.set(entree.name, [...new Set(noms.flatMap(({ nom }) => motsDUnNom(nom)).filter(garde))].sort());
  }
  return parSysteme;
}

function lignes(mots: readonly string[]): string {
  const rendu: string[] = [];
  let ligne = '';
  for (const mot of mots) {
    if (ligne.length + mot.length + 1 > COLONNES) { rendu.push(ligne); ligne = ''; }
    ligne += (ligne ? ' ' : '') + mot;
  }
  if (ligne) rendu.push(ligne);
  return rendu.join('\n');
}

export function contenuDuModule(anglais: readonly string[], segments: readonly string[], taille: number, systemes: number): string {
  return `/**
 * Fichier généré par \`packages/kit/scripts/generer-mots-connus.ts\` : ne pas modifier à la main.
 *
 * MOTS_ANGLAIS : ${anglais.length} mots de ${LONGUEUR_MINIMALE} à ${LONGUEUR_MAXIMALE} lettres de Scowl 2020.12.07 (Spell Checker Oriented Word Lists),
 * fichiers english, american et british jusqu'à la taille ${taille}. SEGMENTS_DES_SYSTEMES : ${segments.length} mots de ${LONGUEUR_MINIMALE} à ${LONGUEUR_MAXIMALE} lettres
 * des fichiers \`noms.json\` de ${systemes} design systems (\`docs/references/design-systems\`, hors \`ucm\`).
 *
 * Notice de Scowl (le texte complet est dans \`mots-connus.LICENCE.txt\`, à côté de ce fichier) :
 *   Copyright 2000-2018 by Kevin Atkinson. Permission to use, copy, modify, distribute and sell these word lists, the associated scripts,
 *   the output created from the scripts, and its documentation for any purpose is hereby granted without fee, provided that the above
 *   copyright notice appears in all copies and that both that copyright notice and this permission notice appear in supporting
 *   documentation. Kevin Atkinson makes no representations about the suitability of this array for any purpose. It is provided "as is"
 *   without express or implied warranty. Les niveaux jusqu'à 35 viennent de Moby Words (deuxième version), de la liste de Brian Kelk et du paquet 12Dicts
 *   (domaine public) ; les formes fléchies viennent de WordNet (Princeton University, notice dans le texte complet).
 */

/** Les mots séparés par une espace ou un saut de ligne. */
export const MOTS_ANGLAIS = \`
${lignes(anglais)}
\`;

/** Les mots séparés par une espace ou un saut de ligne. */
export const SEGMENTS_DES_SYSTEMES = \`
${lignes(segments)}
\`;
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const scowl = option('--scowl');
  if (!scowl) { console.error('--scowl <dossier de Scowl dézippé> est requis (voir l’en-tête du script).'); process.exit(1); }
  const taille = Number(option('--taille') ?? 35);
  const anglais = motsAnglais(resolve(scowl), taille);
  const parSysteme = segmentsParSysteme();
  const segments = [...new Set([...parSysteme.values()].flat())].sort();
  const contenu = contenuDuModule(anglais, segments, taille, parSysteme.size);
  if (process.argv.includes('--verifier')) {
    if (!existsSync(SORTIE) || readFileSync(SORTIE, 'utf8').replace(/\r\n/g, '\n') !== contenu) { console.error('mots-connus-donnees.ts n’est plus ce que le script produit.'); process.exit(1); }
    console.log('mots-connus-donnees.ts est à jour.');
  } else {
    writeFileSync(SORTIE, contenu);
    console.log(`${SORTIE} : ${anglais.length} mots anglais, ${segments.length} segments de ${parSysteme.size} systèmes, ${Buffer.byteLength(contenu)} octets.`);
  }
}
