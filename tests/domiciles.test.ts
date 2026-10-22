/**
 * Le manifeste `.agents/domiciles.json` donne un domicile à chaque fichier
 * source et ne renvoie qu'à des documents qui existent.
 *
 * Le domicile d'un chemin est le motif le plus long qui lui correspond, le
 * dernier à longueur égale : l'ordre des domaines ne décide qu'entre deux
 * motifs de même longueur.
 *
 * Quatre points sont tenus :
 * - chaque fichier suivi de `packages/<paquet>/src/` correspond à un motif ;
 * - le `fichier` de chaque domaine existe, ou `AGENTS.md` porte encore son
 *   groupe `### <titre>` ;
 * - chaque ancre de `specs` et chaque entrée de `lies` existe ;
 * - deux appels identiques rendent la même sortie.
 *
 * La tolérance sur `fichier` couvre la période où les groupes d'invariants
 * vivent encore dans `AGENTS.md`. Elle cesse d'elle-même quand `AGENTS.md`
 * perd le titre du groupe. Les trois domaines sans titre `###` dans `AGENTS.md`
 * (`SANS_TITRE`) sont tolérés tant que le dossier de leur fichier n'existe pas.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  chargerManifeste,
  correspond,
  domaineDe,
  blocDomaines,
  documentDuDomaine,
  ecrireIndex,
  indexDuPaquet,
  lignesDuGroupe,
  lire,
  normaliser,
} from '../scripts/agents-contexte.mjs';

const racine = path.resolve(__dirname, '..');
const manifeste = chargerManifeste(racine);
const agents = fs.readFileSync(path.join(racine, 'AGENTS.md'), 'utf8');
const contexte = { existe: (chemin: string) => fs.existsSync(path.join(racine, chemin)), agents };

type Domaine = { id: string; titre: string; fichier: string; chemins: string[]; specs: string[]; lies: string[] };

const SANS_TITRE = new Set(['tests-du-moteur', 'corpus-de-test', 'referentiel']);

function fichiersSuivis(): string[] {
  const sortie = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', 'packages'], {
    cwd: racine,
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  return sortie.split(/\r?\n/).filter(Boolean);
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

/** Ancres GitHub d'un document, comme dans `tests/docLinks.test.ts`. */
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
      .replace(/\s/g, '-');
    const rang = vues.get(base) ?? 0;
    vues.set(base, rang + 1);
    resultat.add(rang === 0 ? base : `${base}-${rang}`);
  }
  return resultat;
}

/** Vrai tant que le groupe d'invariants du domaine n'a pas quitté `AGENTS.md`. */
function groupeEncoreDansAgents(domaine: Domaine): boolean {
  if (lignesDuGroupe(agents, domaine.titre)) return true;
  if (!SANS_TITRE.has(domaine.id)) return false;
  return !fs.existsSync(path.join(racine, path.dirname(domaine.fichier)));
}

test('chaque fichier suivi de packages/*/src/ a un domicile', () => {
  const sansDomicile = fichiersSuivis()
    .filter((f) => /^packages\/[^/]+\/src\//.test(f))
    .filter((f) => domaineDe(manifeste, f) === null);
  assert.deepEqual(sansDomicile, [], `fichiers sans domicile : ${sansDomicile.join(', ')}`);
});

test('chaque domaine a un fichier, ou AGENTS.md porte encore son groupe', () => {
  const absents = (manifeste.domaines as Domaine[])
    .filter((d) => !fs.existsSync(path.join(racine, d.fichier)) && !groupeEncoreDansAgents(d))
    .map((d) => `${d.id} → ${d.fichier}`);
  assert.deepEqual(absents, [], `fichiers de domaine absents : ${absents.join(', ')}`);
});

test('chaque ancre de specs et chaque entrée de lies existe', () => {
  const absentes: string[] = [];
  const ancresParFichier = new Map<string, Set<string>>();
  for (const domaine of manifeste.domaines as Domaine[]) {
    for (const spec of domaine.specs) {
      const [fichier, ancre] = spec.split('#');
      const complet = path.join(racine, fichier);
      if (!fs.existsSync(complet)) {
        absentes.push(`${domaine.id} : ${fichier} absent`);
        continue;
      }
      if (!ancresParFichier.has(fichier)) ancresParFichier.set(fichier, ancres(fs.readFileSync(complet, 'utf8')));
      if (ancre && !ancresParFichier.get(fichier)!.has(ancre)) absentes.push(`${domaine.id} : ${spec} (ancre absente)`);
    }
    for (const lie of domaine.lies) {
      if (!fs.existsSync(path.join(racine, lie))) absentes.push(`${domaine.id} : ${lie} absent`);
    }
  }
  assert.deepEqual(absentes, []);
});

test('chaque carte du manifeste désigne un paquet qui existe', () => {
  const inconnus = Object.keys(manifeste.cartes as Record<string, string>).filter(
    (cle) => !fs.existsSync(path.join(racine, cle)),
  );
  assert.deepEqual(inconnus, []);
});

test('deux appels identiques rendent la même sortie', () => {
  const chemins = ['packages/plugin-palettes/src/ecriture/variables.ts', 'packages/couleur/src/rampe.ts'];
  assert.deepEqual(lire(manifeste, chemins, contexte), lire(manifeste, chemins, contexte));
  assert.equal(ecrireIndex(manifeste), ecrireIndex(manifeste));
  assert.deepEqual(
    lire(manifeste, [...chemins].reverse(), contexte).documents,
    lire(manifeste, chemins, contexte).documents,
    "l'ordre des chemins ne change pas la liste",
  );
});

test('packages/couleur/src/rampe.ts a pour domicile le fichier du moteur de couleur', () => {
  assert.equal(
    domaineDe(manifeste, 'packages/couleur/src/rampe.ts')?.fichier,
    'packages/couleur/invariants/moteur-de-couleur.md',
  );
});

test("le motif le plus long l'emporte, le dernier à longueur égale", () => {
  const essai = {
    cartes: {},
    domaines: [
      { id: 'a', titre: 'A', fichier: 'a.md', chemins: ['x/**'], specs: [], lies: [], verifications: [] },
      { id: 'b', titre: 'B', fichier: 'b.md', chemins: ['x/y.ts', 'x/z/**'], specs: [], lies: [], verifications: [] },
    ],
  };
  assert.equal(domaineDe(essai, 'x/y.ts')?.id, 'b');
  assert.equal(domaineDe(essai, 'x/autre.ts')?.id, 'a');
  assert.equal(domaineDe(essai, 'x/z/profond/f.ts')?.id, 'b');
  assert.equal(domaineDe(essai, 'ailleurs.ts'), null);
  const egalite = { cartes: {}, domaines: [{ ...essai.domaines[0], chemins: ['x/*.ts'] }, { ...essai.domaines[1], chemins: ['x/*.ts'] }] };
  assert.equal(domaineDe(egalite, 'x/f.ts')?.id, 'b', 'à longueur égale, le dernier');
});

test("un chemin exact l'emporte sur un motif ** de son dossier, quel que soit l'ordre des domaines", () => {
  const exact = { id: 'exact', titre: 'E', fichier: 'e.md', chemins: ['x/y.ts'], specs: [], lies: [], verifications: [] };
  const large = { id: 'large', titre: 'L', fichier: 'l.md', chemins: ['x/**'], specs: [], lies: [], verifications: [] };
  assert.equal(domaineDe({ cartes: {}, domaines: [exact, large] }, 'x/y.ts')?.id, 'exact');
  assert.equal(domaineDe({ cartes: {}, domaines: [large, exact] }, 'x/y.ts')?.id, 'exact');
});

test("frontiere.ts de Palettes relève de l'écriture, theme.ts du référentiel du moteur de couleur", () => {
  assert.equal(domaineDe(manifeste, 'packages/plugin-palettes/src/ui/frontiere.ts')?.id, 'palettes-ecriture');
  assert.equal(domaineDe(manifeste, 'packages/plugin-palettes/src/ui/champs.ts')?.id, 'palettes-interface');
  assert.equal(domaineDe(manifeste, 'packages/kit/src/referentiel/theme.ts')?.id, 'moteur-de-couleur');
  assert.equal(domaineDe(manifeste, 'packages/kit/src/referentiel/lexique.ts')?.id, 'referentiel');
});

test('les motifs distinguent * (un segment) de ** (plusieurs segments)', () => {
  assert.ok(correspond('packages/*/src/**', 'packages/kit/src/a/b.ts'));
  assert.ok(correspond('packages/*/src/**', 'packages/kit/src/a.ts'));
  assert.ok(!correspond('packages/*/src/*', 'packages/kit/src/a/b.ts'));
  assert.ok(correspond('docs/**/README.md', 'docs/README.md'));
  assert.ok(correspond('LICENSE*', 'LICENSE-MIT'));
  assert.ok(!correspond('packages/kit/src/a.ts', 'packages/kit/src/aXts'));
});

test('un chemin Windows est ramené à des / relatifs', () => {
  assert.equal(normaliser('packages\\couleur\\src\\rampe.ts', racine), 'packages/couleur/src/rampe.ts');
  assert.equal(normaliser('./AGENTS.md', racine), 'AGENTS.md');
});

test("lire rend AGENTS.md, les fichiers du paquet, le domicile et ses specs, triés sans doublon", () => {
  const { documents } = lire(manifeste, ['packages/plugin-socle/src/composant/contract/layoutNodes.ts'], {
    existe: () => true,
    agents,
  });
  assert.deepEqual(documents, [...new Set(documents)].sort());
  assert.ok(documents.includes('AGENTS.md'));
  assert.ok(documents.includes('packages/plugin-socle/AGENTS.md'));
  assert.ok(documents.includes('packages/plugin-socle/CARTE.md'));
  assert.ok(documents.includes('packages/plugin-exporter/invariants/layout.md'));
  assert.ok(documents.includes('docs/format/FORMAT.md#3-layout'));
});

test("sans fichier de domicile, le document est la plage du groupe dans AGENTS.md", () => {
  const domaine = (manifeste.domaines as Domaine[]).find((d) => d.id === 'exporter-grilles')!;
  const agentsEssai = ['# T', '', '## Invariants', '', '### Grilles', '', 'une ligne', '', '### Suivant', ''].join('\n');
  const document = documentDuDomaine(domaine, { existe: () => false, agents: agentsEssai });
  assert.equal(document, 'AGENTS.md:5-8  Grilles');
  assert.equal(documentDuDomaine(domaine, { existe: () => true, agents: agentsEssai }), domaine.fichier);
  assert.equal(documentDuDomaine(domaine, { existe: () => false, agents: '# T\n' }), domaine.fichier);
});

const paquets = fs
  .readdirSync(path.join(racine, 'packages'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join(racine, 'packages', e.name, 'AGENTS.md')))
  .map((e) => e.name);

test("le bloc de domaines de chaque packages/*/AGENTS.md est la sortie de ecrire-index", () => {
  const ecarts: string[] = [];
  for (const paquet of paquets) {
    const texte = fs.readFileSync(path.join(racine, 'packages', paquet, 'AGENTS.md'), 'utf8');
    if (blocDomaines(texte) !== indexDuPaquet(manifeste, paquet)) {
      ecarts.push(`node scripts/agents-contexte.mjs ecrire-index ${paquet} --ecrire`);
    }
  }
  assert.deepEqual(ecarts, [], `blocs périmés, lancer : ${ecarts.join(' ; ')}`);
});

test('chaque packages/*/AGENTS.md pèse au plus 6 144 octets', () => {
  const lourds = paquets
    .map((p) => ({ p, taille: fs.statSync(path.join(racine, 'packages', p, 'AGENTS.md')).size }))
    .filter(({ taille }) => taille > 6144)
    .map(({ p, taille }) => `${p} : ${taille} octets`);
  assert.deepEqual(lourds, []);
});

test("AGENTS.md à la racine pèse au plus 12 288 octets", () => {
  const taille = fs.statSync(path.join(racine, 'AGENTS.md')).size;
  assert.ok(taille <= 12288, `AGENTS.md pèse ${taille} octets pour 12 288 permis`);
});

test("chaque chaîne AGENTS.md racine puis AGENTS.md de paquet pèse au plus 32 768 octets", () => {
  const racineTaille = fs.statSync(path.join(racine, 'AGENTS.md')).size;
  const lourdes = paquets
    .map((p) => ({ p, taille: racineTaille + fs.statSync(path.join(racine, 'packages', p, 'AGENTS.md')).size }))
    .filter(({ taille }) => taille > 32768)
    .map(({ p, taille }) => `${p} : ${taille} octets`);
  assert.deepEqual(lourdes, []);
});
