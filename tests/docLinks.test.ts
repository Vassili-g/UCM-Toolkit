
/**
 * Les liens entre documents remplacent des règles sinon recopiées. Un lien
 * mort rend donc une règle introuvable au lieu de la répéter : ce test tient la
 * contrepartie de « une règle, un domicile » (CONTRIBUTING.md).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');

/**
 * Fichiers markdown du dépôt, hors dépendances installées et hors fixtures.
 *
 * `tests/fixtures/` porte des documents figés, cités par un test et par lui
 * seul : leurs liens relatifs valaient depuis l'endroit d'où on les a gelés, et
 * les rejuger ici ferait rougir un contrôle sur une adresse que plus personne
 * ne suit.
 *
 * `docs/notes/Archives/` porte les recherches closes, en attente de
 * suppression : les documents gardés y renvoient par un lien vers un commit.
 */
function fichiersMarkdown(dossier: string): string[] {
  const trouves: string[] = [];
  const dansTests = path.basename(dossier) === 'tests';
  const dansNotes = path.basename(dossier) === 'notes';
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (entree.name === 'node_modules' || entree.name === '.git') continue;
    if (entree.name === 'fixtures' && dansTests) continue;
    if (entree.name === 'Archives' && dansNotes) continue;
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) trouves.push(...fichiersMarkdown(complet));
    else if (entree.name.endsWith('.md')) trouves.push(complet);
  }
  return trouves;
}

/** Lignes hors blocs de code : un `#` en JSON n'est pas un titre. */
function lignesHorsCode(contenu: string): string[] {
  let dansUnBloc = false;
  const gardees: string[] = [];
  for (const ligne of contenu.split(/\r?\n/)) {
    if (/^\s*```/.test(ligne)) {
      dansUnBloc = !dansUnBloc;
      continue;
    }
    if (!dansUnBloc) gardees.push(ligne);
  }
  return gardees;
}

/**
 * Ancre GitHub : minuscules, ponctuation retirée, espaces en tirets, accents
 * conservés. Un slug déjà pris reçoit son rang, comme les trois « Invariants »
 * de la spécification.
 */
function ancres(contenu: string): Set<string> {
  const vues = new Map<string, number>();
  const resultat = new Set<string>();
  for (const ligne of lignesHorsCode(contenu)) {
    const titre = /^(#{1,6})\s+(.*?)\s*$/.exec(ligne);
    if (!titre) continue;
    const base = titre[2]
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      // Un espace donne un tiret, sans fusionner les suites : la ponctuation
      // retirée d'un titre en laisse deux, et GitHub les conserve tous les deux.
      .replace(/\s/g, '-');
    const rang = vues.get(base) ?? 0;
    vues.set(base, rang + 1);
    resultat.add(rang === 0 ? base : `${base}-${rang}`);
  }
  return resultat;
}

const estExterne = (cible: string): boolean => /^[a-z]+:/i.test(cible) || cible.startsWith('//');

/** Une étiquette de lien de référence se compare sans casse et espaces fusionnés. */
const etiquette = (texte: string): string => texte.trim().replace(/\s+/g, ' ').toLowerCase();

/** Une définition de lien de référence : `[id]: cible`, en début de ligne. */
const DEFINITION = /^ {0,3}\[([^\]^][^\]]*)\]:\s*<?([^\s>]+)>?/;

/**
 * Cibles relatives d'un document, hors blocs de code et hors URL externes : les
 * liens en ligne `](cible)` et les définitions de liens de référence.
 */
function liensRelatifs(contenu: string): string[] {
  const trouves: string[] = [];
  for (const ligne of lignesHorsCode(contenu)) {
    const definition = DEFINITION.exec(ligne);
    if (definition) {
      if (!estExterne(definition[2])) trouves.push(definition[2]);
      continue;
    }
    for (const lien of ligne.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (!estExterne(lien[1])) trouves.push(lien[1]);
    }
  }
  return trouves;
}

/**
 * Les liens de référence employés sans définition dans le même fichier.
 *
 * Seules les formes `[texte][id]` et `[id][]` sont jugées. Le raccourci `[id]`
 * seul ne l'est pas : `[x]`, `[ ]` ou un indice entre crochets en prose lui
 * ressemblent, et le contrôle ne sait pas les distinguer d'un lien. Les
 * fragments de code en ligne sont écartés avant la recherche.
 */
function referencesSansDefinition(contenu: string): string[] {
  const lignes = lignesHorsCode(contenu);
  const definies = new Set<string>();
  for (const ligne of lignes) {
    const definition = DEFINITION.exec(ligne);
    if (definition) definies.add(etiquette(definition[1]));
  }

  const manquantes: string[] = [];
  for (const ligne of lignes) {
    if (DEFINITION.test(ligne)) continue;
    const sansCode = ligne.replace(/`[^`]*`/g, '');
    for (const usage of sansCode.matchAll(/\[([^\]]+)\]\[([^\]]*)\]/g)) {
      const id = etiquette(usage[2] === '' ? usage[1] : usage[2]);
      if (!definies.has(id)) manquantes.push(usage[0]);
    }
  }
  return manquantes;
}

test('aucun lien entre documents ne pointe vers un fichier ou une ancre absente', () => {
  const documents = fichiersMarkdown(racine);
  assert.ok(documents.length > 0, 'aucun document markdown trouvé');

  const ancresParFichier = new Map<string, Set<string>>();
  const ancresDe = (fichier: string): Set<string> => {
    let connues = ancresParFichier.get(fichier);
    if (!connues) {
      connues = ancres(fs.readFileSync(fichier, 'utf8'));
      ancresParFichier.set(fichier, connues);
    }
    return connues;
  };

  const morts: string[] = [];
  for (const document of documents) {
    const contenu = fs.readFileSync(document, 'utf8');
    const relatif = path.relative(racine, document).replace(/\\/g, '/');

    for (const usage of referencesSansDefinition(contenu)) {
      morts.push(`${relatif} → ${usage} (lien de référence sans définition)`);
    }

    for (const lien of liensRelatifs(contenu)) {
      const [chemin, ancre] = lien.split('#');
      // Un dossier des notes porte des espaces : le lien les écrit `%20`, seule
      // forme que GitHub suit, et le disque les attend décodés.
      const cible =
        chemin === '' ? document : path.resolve(path.dirname(document), decodeURIComponent(chemin));

      if (!fs.existsSync(cible)) {
        morts.push(`${relatif} → ${lien} (fichier absent)`);
        continue;
      }
      if (!ancre) continue;
      if (!cible.endsWith('.md')) {
        morts.push(`${relatif} → ${lien} (ancre sur un fichier non markdown)`);
        continue;
      }
      if (!ancresDe(cible).has(decodeURIComponent(ancre))) {
        morts.push(`${relatif} → ${lien} (ancre absente)`);
      }
    }
  }

  assert.deepEqual(morts, [], `Liens morts :\n${morts.join('\n')}`);
});

/**
 * Les deux documents de spécification, depuis la scission : la forme de
 * ce qui est publié, et ce que le plugin lit pour le produire.
 */
const SPECIFICATIONS = ['docs/format/FORMAT.md', 'packages/plugin-exporter/SPEC.md'];

/**
 * Les fichiers d'invariants que le manifeste liste, en chemins relatifs à la
 * racine.
 */
function fichiersDInvariants(): string[] {
  const manifeste = JSON.parse(
    fs.readFileSync(path.join(racine, '.agents', 'domiciles.json'), 'utf8'),
  ) as { domaines: { fichier: string }[] };
  return [...new Set(manifeste.domaines.map((d) => d.fichier))];
}

/**
 * Le test précédent interdit un renvoi mort ; celui-ci interdit l'absence de
 * renvoi. Un invariant porte la règle et sa borne, jamais son pourquoi : sans
 * lien, ce pourquoi devient introuvable, et la version courte se met à faire
 * autorité toute seule.
 *
 * Il compte donc les renvois plutôt que de nommer un fichier et un seuil. La
 * version d'avant la scission codait « au moins dix ancres de
 * UCM-EXPORTER-SPEC.md » : elle serait passée au vert sur un document devenu
 * la moitié de lui-même. Les liens en ligne et les définitions de liens de
 * référence des fichiers d'invariants comptent, chaque cible relative résolue
 * depuis son fichier, et une ancre citée dix fois compte pour une.
 */
test('les invariants renvoient aux DEUX spécifications, et chaque ancre existe', () => {
  const vises = new Map<string, Set<string>>(SPECIFICATIONS.map((relatif) => [relatif, new Set()]));

  for (const fichier of fichiersDInvariants()) {
    const complet = path.join(racine, fichier);
    for (const lien of liensRelatifs(fs.readFileSync(complet, 'utf8'))) {
      const [chemin, ancre] = lien.split('#');
      if (chemin === '' || !ancre) continue;
      const cible = path
        .relative(racine, path.resolve(path.dirname(complet), decodeURIComponent(chemin)))
        .split(path.sep)
        .join('/');
      vises.get(cible)?.add(decodeURIComponent(ancre));
    }
  }

  const absentes: string[] = [];
  for (const relatif of SPECIFICATIONS) {
    const connues = ancres(fs.readFileSync(path.join(racine, relatif), 'utf8'));
    for (const ancre of vises.get(relatif)!) {
      if (!connues.has(ancre)) absentes.push(`${relatif}#${ancre}`);
    }
  }
  assert.deepEqual(absentes, [], `Ancres absentes : ${absentes.join(', ')}`);

  const muets = SPECIFICATIONS.filter((relatif) => vises.get(relatif)!.size === 0);
  assert.deepEqual(muets, [], `Les invariants ne renvoient à aucune ancre de : ${muets.join(', ')}`);

  const total = [...vises.values()].reduce((somme, ancres) => somme + ancres.size, 0);
  assert.ok(total >= 20, `Les invariants ne renvoient qu'à ${total} ancres distinctes de spécification`);
});
