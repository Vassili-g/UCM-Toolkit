
/**
 * Ce que le contrôle d'un repository produit, verrouillé de bout en bout.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONTRACT_VERSION } from "@ucm-kit/core/format";

import { controlerRepository } from "../src/lecteurs/controle-repository.mjs";
import { preparerControle } from "../src/lecteurs/controle-du-code.mjs";
import {
  VERSION_CONTRAT_MAXIMALE,
  VERSION_CONTRAT_MINIMALE,
} from "../src/lecteurs/version-contrat.mjs";

/**
 * La configuration du repo jouet : délibérément pas celle par défaut.
 *
 * Les scénarios viennent d'un repository qui range ses contrats sous `src/` :
 * les garder tels quels transporte les attentes mot pour mot, et fait au
 * passage passer un `ucm.config.json` non trivial dans le contrôle.
 */
const CONFIGURATION = {
  components: "src",
  tokens: "src/tokens/tokens.json",
  implementation: "{dir}/{id}.tsx",
};

/** Contrat 14.0 minimal et valide, citant une seule référence de token. */
function contrat() {
  return {
    name: "Widget",
    meta: {
      contractVersion: CONTRACT_VERSION,
      exportedAt: "2026-01-01T00:00:00.000Z",
      figma: { fileName: "f", nodeId: "1:1" },
      coverage: { portable: "complete" },
    },
    viewStructures: {
      st1: {
        layout: "flex-row",
        sizing: { width: "fit-content", height: "fit-content" },
        children: [{ slot: "label", tokens: { color: "{couleurs.texte.principal}" } }],
      },
    },
    variantViews: { v1: { structure: "st1" } },
    variants: [{ nodeId: "1:2", figmaName: "Default", values: {}, tokens: {}, view: "v1" }],
    structure: { view: "st1" },
    rendering: { roles: {} },
  };
}

const TOKENS = { couleurs: { texte: { principal: { $type: "color", $value: "#111111" } } } };
const TSX = `export interface WidgetProps { children?: unknown }
export function Widget(_props: WidgetProps) { return null; }
`;

/**
 * Monte un repository jouet et rend sa racine.
 *
 * `composants` est un dictionnaire `Nom → { contrat, tsx }` : `contrat` est
 * l'objet à écrire, `tsx` la source de l'implémentation, absente si le scénario
 * veut une implémentation manquante.
 */
function preparerRepo({ composants = {}, tokens = {} }) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-caracterisation-"));
  mkdirSync(join(racine, "src", "tokens"), { recursive: true });
  writeFileSync(join(racine, CONFIGURATION.tokens), JSON.stringify(tokens, null, 2));

  for (const [nom, { contrat: document, tsx }] of Object.entries(composants)) {
    const dossier = join(racine, "src", "components", nom);
    mkdirSync(dossier, { recursive: true });
    if (document !== undefined) {
      writeFileSync(join(dossier, `${nom}.contract.json`), JSON.stringify(document, null, 2));
    }
    if (tsx !== undefined) writeFileSync(join(dossier, `${nom}.tsx`), tsx);
  }
  return racine;
}

/**
 * Monte un repository jouet, le passe au contrôle, rend son verdict, et le
 * démonte, même quand l'assertion échoue, sinon un test rouge laisserait un
 * dossier derrière lui à chaque exécution.
 */
function verdict({ composants, tokens = TOKENS, casser, ...portee } = {}) {
  const racine = preparerRepo({
    composants: composants ?? { Widget: { contrat: contrat(), tsx: TSX } },
    tokens,
  });
  try {
    if (casser) casser(racine);
    return controlerRepository(racine, { configuration: CONFIGURATION, ...portee });
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

test("tout valide : rien ne bloque, et le rapport dit seulement que le code n'est pas lu et que l'architecture n'est pas jugée", () => {
  const { bloquant, rapport } = verdict();

  assert.equal(bloquant, false);
  assert.equal(
    rapport,
    "<!-- ucm-rapport -->\n"
      + "## ✅ Aucun blocage détecté\n\n"
      + "1 contrat et 1 référence de token contrôlés. Les contrôles bloquants sont passés."
      + "\n### ℹ️ Le code de ces composants n'est pas vérifié (1 composant)\n\n"
      + "Aucun adaptateur UCM ne lit cette technologie.\n\n"
      + "- `Widget`\n\n"
      + "#### Action\n\n"
      + "Un développeur compare le code au contrat à chaque modification.\n\n"
      + "Ce point ne bloque pas la fusion.\n\n"
      + "### ℹ️ `tokens.json` ne suit pas l'architecture UCM : aucune collection reconnue (1 collection lue), elle n'est pas jugée.\n",
  );
});

/** Une demande qui ne modifie que `tokens.json` : le genre « tokens seuls ». */
const DEMANDE_DE_TOKENS = { cheminsModifies: CONFIGURATION.tokens, tokensModifies: true };
const DEMANDE_DE_CONTRAT = { cheminsModifies: "src/components/Widget/Widget.contract.json" };
const DEMANDE_DE_CODE = { cheminsModifies: "src/components/Widget/Widget.tsx" };

for (const composants of [undefined, {}]) test(`V-04 : les tests du repository ne refusent pas les tokens seuls${composants ? ' sans contrat' : ''}`, () => {
  const { bloquant, rapport } = verdict({
    ...DEMANDE_DE_TOKENS, composants,
    echecsDeTests: { echoue: true, echecs: [{ fichier: 'outillage.test.mjs', test: 'garde-fou' }] },
  });
  assert.equal(bloquant, false);
  assert.match(rapport, /Un développeur du repository doit corriger ces contrôles/);
  assert.match(rapport, /Ce point ne bloque pas votre demande/);
  assert.doesNotMatch(rapport, /La fusion reste bloquée/);
});

test('V-19 : un clone superficiel reste une erreur d’invocation sans contrat', () => {
  const resultat = verdict({ composants: {}, historique: 'superficiel' });
  assert.equal(resultat.erreurDInvocation?.code, 2);
});

for (const [portee, attendu] of [[DEMANDE_DE_CONTRAT, false], [DEMANDE_DE_CODE, true]]) test(`V-16 : un adaptateur qui échoue à lire donne un constat, blocage ${attendu}`, () => {
  const resultat = verdict({
    ...portee, adaptateurAttendu: 'present',
    adaptateur: { lireApiPublique() { throw new Error('tsconfig illisible'); } },
  });
  assert.equal(resultat.bloquant, attendu);
  assert.equal(resultat.erreurDInvocation, null);
  assert.match(resultat.rapport, /Un développeur doit installer/);
});

test("un rapport trop long pour un commentaire GitHub s'arrête avant la limite et dit où lire la suite", () => {
  // `gh pr comment` refuse un corps de plus de 65 536 caractères : les deux
  // tentatives du workflow échouaient, et la pull request restait sans un mot.
  const document = contrat();
  document.viewStructures.st1.children = Array.from({ length: 3_000 }, (_, i) => ({
    slot: `label${i}`,
    tokens: { color: `{couleurs.absentes.de.la.source.numero${i}}` },
  }));
  // Une demande qui retire des tokens rend le contrat « en retard sur les
  // tokens » : elle passe, et le rapport liste chaque référence retirée.
  const { bloquant, rapport } = verdict({
    composants: { Widget: { contrat: document, tsx: TSX } },
    tokens: {},
    ...DEMANDE_DE_TOKENS,
  });

  assert.equal(bloquant, false);
  assert.ok(rapport.length <= 65_536, `${rapport.length} caractères`);
  assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
  assert.match(rapport, /numero0`/);
  assert.doesNotMatch(rapport, /numero2999`/);
  assert.match(rapport, /La suite de ce rapport ne tient pas dans un commentaire/);

  const court = verdict({ tokens: {}, ...DEMANDE_DE_TOKENS }).rapport;
  assert.doesNotMatch(court, /ne tient pas/);
});

/**
 * Le seul contrôle qui protège le design. Il interroge la source
 * DTCG, et non plus les variables CSS qu'elle produit : le scénario donne donc
 * un fichier de tokens vide, où la référence n'existe réellement pas.
 */
test("V-02 : une demande de tokens qui retire un token cité passe, et le rapport nomme le contrat à réexporter", () => {
  const { bloquant, rapport, verdict: jugement } = verdict({ tokens: {}, ...DEMANDE_DE_TOKENS });

  assert.equal(bloquant, false, "nul ne corrige en réexportant le contrat dans cette demande");
  assert.ok(jugement.composants[0].constats.includes("en-retard-sur-les-tokens"));
  assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
  assert.match(rapport, /### ⚠️ Des contrats citent des tokens retirés \(1 contrat\)/);
  assert.match(rapport, /Cette demande retire des tokens que ces contrats citent encore\./);
  assert.match(rapport, /- Widget : `couleurs\.texte\.principal`/);
  assert.match(rapport, /Le designer doit réexporter ces composants depuis Figma\./);
  assert.match(rapport, /Ce retard ne bloque pas la fusion\./);
});

test("V-07 : un contrat que la demande modifie et qui cite un token absent bloque", () => {
  const { bloquant, rapport, terminal } = verdict({ tokens: {}, ...DEMANDE_DE_CONTRAT });

  assert.equal(bloquant, true);
  assert.match(rapport, /^## ❌ Les contrôles du repository bloquent la fusion$/m);
  assert.match(rapport, /### ❌ Des contrats citent des tokens absents \(1 contrat\)/);
  assert.match(rapport, /- Widget : `couleurs\.texte\.principal`/);
  assert.match(rapport, /Si une demande de tokens est encore ouverte, le designer la fusionne d'abord, puis relance ce contrôle\. Sinon, le designer remplace ces variables par les variables actuelles dans Figma, puis réexporte le composant\./);
  assert.match(rapport, /La fusion reste bloquée\./);
  assert.match(terminal.map(({ texte }) => texte).join("\n"), /✗ Widget\.contract\.json : référence absente/);
});

test("une demande de contrats ne répond pas d'un contrat qu'elle ne modifie pas", () => {
  const { bloquant, rapport } = verdict({
    cheminsModifies: "src/components/Autre/Autre.contract.json",
    tokens: {},
    composants: {
      Widget: { contrat: contrat(), tsx: TSX },
      Autre: { contrat: { ...contrat(), name: "Autre" }, tsx: TSX },
    },
  });

  // Les deux contrats citent le token absent, et seul `Autre` est modifié.
  assert.equal(bloquant, true);
  assert.match(rapport, /### ❌ Des contrats citent des tokens absents \(1 contrat\)\n[\s\S]*- Autre : [\s\S]*La fusion reste bloquée\./);
  // `Widget` cite le même token, mais cette demande ne le modifie pas : son retard se lit à part.
  const [bloque, reste] = rapport.split("### ⚠️ Des contrats citent des tokens retirés");
  assert.doesNotMatch(bloque, /- Widget : /);
  assert.match(reste, /- Widget : /);
  assert.match(reste, /Ce retard ne bloque pas la fusion\./);
});

test("sans base, un contrat qui cite un token absent bloque", () => {
  const { bloquant, rapport } = verdict({ tokens: {} });

  assert.equal(bloquant, true, "un contrôle sans base répond de tout le repository");
  assert.match(rapport, /### ❌ Des contrats citent des tokens absents \(1 contrat\)/);
});

test("une collection `usage` ne se juge plus : un usage posé sur un autre support n'avertit pas", () => {
  const document = contrat();
  document.variantViews.v1.paintPlacements = "p1";
  document.viewPaintPlacements = { p1: { fills: { foreground: [["label"]] } } };
  document.variants[0].tokens = { foreground: "{components.widget.texte}" };
  const couleur = (canal) => ({ colorSpace: "srgb", components: [canal, canal, canal], alpha: 1 });
  const tokens = {
    ...TOKENS,
    theme: { neutral: { 900: { $type: "color", $value: couleur(0.1) } } },
    usage: { neutral: { solid: { default: { $type: "color", $value: "{theme.neutral.900}" } } } },
    components: { widget: { texte: { $type: "color", $value: "{usage.neutral.solid.default}" } } },
  };
  const { bloquant, rapport, terminal } = verdict({ composants: { Widget: { contrat: document, tsx: TSX } }, tokens });

  assert.equal(bloquant, false);
  assert.doesNotMatch(rapport, /table des emplois/);
  assert.ok(!terminal.some(({ texte }) => /table des emplois/.test(texte)));
});

test("une référence sous un champ inconnu de 10 000 niveaux est relevée sans épuiser la pile", () => {
  // Le texte s'écrit à la main : `JSON.stringify` épuise lui-même la pile à
  // cette profondeur, alors que `JSON.parse` la lit.
  const profondeur = 10_000;
  const source = JSON.stringify(contrat());
  const texte = `${source.slice(0, -1)},"extensionInconnue":${'{"suivante":'.repeat(profondeur)}`
    + `"{couleurs.profonde}"${"}".repeat(profondeur)}}`;
  const { bloquant, rapport } = verdict({
    ...DEMANDE_DE_TOKENS,
    casser: (racine) => writeFileSync(
      join(racine, "src", "components", "Widget", "Widget.contract.json"),
      texte,
    ),
  });

  assert.equal(bloquant, false);
  assert.match(rapport, /- Widget : `couleurs\.profonde`/);
});

/**
 * Ce qui a été fait cesser, et qu'aucun test ne surveillait : Figma nomme des
 * tokens `layouts.sizing.0,5`, une projection CSS en fait
 * `--layouts-sizing-0-5`, et la traduction `.` → `-` cherchait
 * `layouts-sizing-0,5`. Le token existait, le rapport le déclarait absent.
 */
test("un nom que la projection CSS perdait est reconnu", () => {
  const contratVirgule = contrat();
  contratVirgule.viewStructures.st1.children[0].tokens.gap = "{layouts.sizing.0,5}";

  const { bloquant, rapport } = verdict({
    composants: { Widget: { contrat: contratVirgule, tsx: TSX } },
    tokens: {
      ...TOKENS,
      layouts: { sizing: { "0,5": { $type: "dimension", $value: "4px" } } },
    },
  });

  assert.equal(bloquant, false);
  assert.doesNotMatch(rapport, /citent des tokens/);
});

/**
 * Ce contrôle a été retiré en entier : il relève d'un linter, projet distinct.
 *
 * Ce test ne teste plus le contrôle, il teste son absence, ce qui n'est pas la
 * même chose : sans lui, rien ne dirait qu'un autre contrôle n'a pas repris le
 * blocage au passage. Le contrôle ne lit plus le code du tout ; une
 * implémentation qui cite n'importe quoi ne le regarde plus.
 */
test("token écrit dans le code et non déclaré : plus rien ne le regarde", () => {
  const { bloquant, rapport } = verdict({
    composants: {
      Widget: {
        contrat: contrat(),
        tsx: `import { tokenVar } from "../../tokens";
export interface WidgetProps { children?: unknown }
export function Widget(_props: WidgetProps) {
  return tokenVar("{couleurs.texte.inconnu}");
}
`,
      },
    },
  });

  assert.equal(bloquant, false, "le code n'est plus inspecté : rien ici ne peut bloquer");
  assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
  assert.doesNotMatch(rapport, /citent des tokens/);
  assert.doesNotMatch(rapport, /construit des noms de tokens à l'exécution/);
});

/**
 * Ce constat a été scindé : l'existence au noyau, la comparaison à
 * l'adaptateur. Le message promettait un `.tsx`, ce qui est faux dans un repo
 * Swift, et faux sur la pull request d'export elle-même, la seule que le
 * designer lise. Le mot a été retiré ; l'attente ci-dessous est la nouvelle
 * formulation, et c'est elle qui rend la correction visible ici.
 */
test("implémentation absente : état d'avancement, pas erreur", () => {
  const { bloquant, rapport } = verdict({ composants: { Widget: { contrat: contrat() } } });

  assert.equal(bloquant, false, "l'absence d'implémentation est un avancement, pas un échec");
  assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
  assert.match(rapport, /### ℹ️ Un composant n'a pas encore d'implémentation \(1 composant\)/);
  assert.match(rapport, /dès que l'implémentation du composant sera ajoutée/);
});

/**
 * Un contrat d'une version non lue est refusé par un message qui dit qui
 * corrige, titre compris.
 *
 * Le titre est l'endroit le plus visible du rapport : « contrat invalide » y
 * accuserait le designer pour un contrat parfaitement formé dont seule la
 * version n'est pas lue. Il nomme donc le repository.
 */
test("version non lue : refus, et la section désigne le développeur", () => {
  const futur = contrat();
  futur.meta.contractVersion = "99.0";
  const { bloquant, rapport } = verdict({ composants: { Widget: { contrat: futur, tsx: TSX } } });

  assert.equal(bloquant, true);
  assert.match(rapport, /### ❌ La version du contrat n'est pas prise en charge : `Widget\.contract\.json`/);
  // La plage se lit dans les constantes, jamais recopiée : elle porte
  // deux versions, et cette ligne était le seul endroit du dépôt à croire encore
  // qu'elle en portait une. Un test qui fige la plage la fige des deux côtés.
  const plage = VERSION_CONTRAT_MINIMALE === VERSION_CONTRAT_MAXIMALE
    ? VERSION_CONTRAT_MINIMALE
    : `${VERSION_CONTRAT_MINIMALE} à ${VERSION_CONTRAT_MAXIMALE}`;
  assert.match(
    rapport,
    new RegExp(
      `Le contrat utilise le schéma 99\\.0\\. `
        + `Le repository prend en charge les schémas ${plage.replaceAll(".", "\\.")}\\.`,
    ),
  );
  assert.match(rapport, /Un développeur doit auditer le nouveau schéma[\s\S]*Réexporter ne corrigera pas ce problème\./);
  assert.match(
    rapport,
    /^## ❌ 1 contrat dans une version que ce repository ne lit pas$/m,
    "le titre ne doit pas accuser le designer pour un contrat que rien ne rend invalide",
  );
  assert.doesNotMatch(rapport, /^## ❌ 1 contrat invalide$/m);
});

/**
 * La ligne de terminal d'un contrat refusé pour sa version ne conclut pas sur
 * le code.
 *
 * L'analyse s'arrête avant la parité, rien n'ayant été lu ni comparé, et un
 * relevé vierge se lirait comme un relevé vide et concluant. « Code conforme »
 * est la phrase qu'une classe entière de code existe pour ne jamais prononcer
 * sans avoir lu, et elle s'écrirait sur la ligne même qui annonce le refus.
 */
test("un contrat que l'analyse n'a pas mené à bout n'est jamais dit conforme", () => {
  const futur = contrat();
  futur.meta.contractVersion = "99.0";
  const { terminal } = verdict({ composants: { Widget: { contrat: futur, tsx: TSX } } });
  const fil = terminal.map(({ texte }) => texte).join("\n");

  assert.match(fil, /✗ Widget\.contract\.json : .*code non examiné/);
  assert.doesNotMatch(fil, /code conforme/);
});

/**
 * Le défaut latent, rendu visible.
 *
 * L'analyse appelait `champsInvalidesDuContrat` avant `verdictDeVersion` et
 * sortait tôt. Il suffit d'un contrat hors fenêtre dont les champs, eux, ne
 * passent pas, pour que le verdict de version soit perdu et que le rapport
 * écrive « contrat invalide », un titre qui accuse le designer, et un geste
 * correctif qui n'existe pas : réexporter ne rend pas lisible un schéma que le
 * repo ne lit pas.
 */
test("version non lue ET champs invalides : c'est la version qui parle", () => {
  const futur = contrat();
  futur.meta.contractVersion = "99.0";
  // Ce qui manque est réellement exigé : le témoin plus bas le prouve sur un
  // contrat dont la version, elle, est lue.
  delete futur.rendering;
  const { bloquant, rapport } = verdict({ composants: { Widget: { contrat: futur, tsx: TSX } } });

  assert.equal(bloquant, true);
  assert.match(
    rapport,
    /### ❌ La version du contrat n'est pas prise en charge : `Widget\.contract\.json`/,
    "le verdict de version doit survivre à des champs invalides",
  );
  assert.match(rapport, /Un développeur doit auditer le nouveau schéma/);
  assert.doesNotMatch(
    rapport,
    /### ❌ Le contrat est incomplet/,
    "dresser la liste des champs manquants d'une grammaire qu'on ne lit pas "
      + "n'a aucun sens, et désigne le mauvais responsable",
  );
});

/**
 * Le pendant, et il tient la nuance qui empêche l'inversion d'aller trop loin :
 * un contrat sans version LISIBLE n'est pas un contrat périmé, c'est un contrat
 * cassé. Sans lui, la correction remplacerait une accusation fausse par une
 * autre — « réexportez, votre schéma est trop ancien » pour un fichier vide.
 */
test("un contrat sans version lisible reste cassé, pas périmé", () => {
  const sansVersion = contrat();
  delete sansVersion.meta.contractVersion;
  const { bloquant, rapport } = verdict({ composants: { Widget: { contrat: sansVersion, tsx: TSX } } });

  assert.equal(bloquant, true);
  assert.match(rapport, /### ❌ Le contrat est incomplet : `Widget\.contract\.json`/);
  assert.match(rapport, /- `meta\.contractVersion`/);
  assert.doesNotMatch(rapport, /La version du contrat n'est pas prise en charge/);
});

test("contrat réellement cassé : refus, et le geste correctif est le réexport", () => {
  const casse = contrat();
  delete casse.rendering;
  const { bloquant, rapport } = verdict({ composants: { Widget: { contrat: casse, tsx: TSX } } });

  assert.equal(bloquant, true);
  assert.match(rapport, /^## ❌ 1 contrat invalide$/m);
  assert.match(rapport, /### ❌ Le contrat est incomplet : `Widget\.contract\.json`/);
  assert.match(rapport, /- `rendering\.roles`/);
  assert.match(rapport, /Réexportez le composant depuis Figma\./);
});

/**
 * Les filets, reportés sur la source DTCG au lieu de disparaître avec
 * la lecture du CSS : un fichier de tokens absent ou illisible se publie comme
 * le reste, sinon le refus serait muet.
 *
 * Absent et illisible portent des titres DIFFÉRENTS parce qu'ils appellent des
 * gestes différents : régénérer, ou cesser d'éditer le fichier à la main.
 */
test("tokens illisibles ou absents : le refus porte quand même un message", () => {
  const sansTokens = verdict({
    casser: (racine) => rmSync(join(racine, CONFIGURATION.tokens)),
  });
  assert.equal(sansTokens.bloquant, true);
  assert.match(sansTokens.rapport, /^## ❌ `src\/tokens\/tokens\.json` est introuvable$/m);
  // Un composant exporté avant les tokens reste rouge tant que les tokens ne
  // sont pas fusionnés et que son contrôle n'a pas été relancé : un nouvel
  // export des tokens seul ouvre une autre demande et ne change rien ici.
  assert.match(sansTokens.rapport, /lancez \*\*Exporter les tokens\*\* depuis Figma et faites fusionner la demande de fusion qu'il ouvre/);
  assert.match(sansTokens.rapport, /relancez le contrôle de cette demande de fusion/);
  assert.match(sansTokens.terminal.map(({ texte }) => texte).join("\n"), /introuvable\. Fusionnez l'export des tokens, puis relancez ce contrôle\./);

  const jsonCasse = verdict({
    casser: (racine) => writeFileSync(join(racine, CONFIGURATION.tokens), "{ pas du json"),
  });
  assert.equal(jsonCasse.bloquant, true);
  assert.match(jsonCasse.rapport, /^## ❌ `src\/tokens\/tokens\.json` est illisible$/m);
  assert.match(jsonCasse.rapport, /Relancez \*\*Exporter les tokens\*\* depuis Figma plutôt que de le corriger\./);
});

/**
 * L'état de démarrage : un repository sans contrat ne refuse aucune fusion.
 *
 * Un repository qui vient d'exécuter `ucm init` n'a ni tokens ni contrats. Le
 * contrôle y répondait `✗ tokens.json introuvable` et sortait en 1, ce qui
 * rendait rouge la CI installée par `ucm init` dès le premier push. Le même
 * repository, une fois ses tokens reçus et avant son premier composant, était
 * refusé pour son dossier de contrats.
 *
 * Le projet traite déjà une implémentation absente comme un état d'avancement.
 * Un export absent reçoit le même traitement.
 *
 * Le discriminant est le nombre de contrats. Sans contrat, aucune référence de
 * token n'existe et l'absence du fichier de tokens ne prive aucun contrôle de
 * sa matière. Avec un contrat, elle redevient un refus, ce que verrouille le
 * test « tokens illisibles ou absents » ci-dessus, qui monte un Widget.
 */
test("repository fraîchement installé : rien à contrôler n'est pas une faute", () => {
  const racine = mkdtempSync(join(tmpdir(), "ucm-demarrage-"));
  try {
    const { bloquant, rapport, terminal } = controlerRepository(racine, {
      configuration: CONFIGURATION,
    });
    assert.equal(bloquant, false, "un repository sans export ne refuse aucune fusion");
    assert.match(rapport, /^## ✅ Ce repository n'a pas encore reçu d'export$/m);
    assert.match(rapport, /`src\/tokens\/tokens\.json` n'a pas encore été exporté/);
    assert.match(rapport, /\*\*Exporter les tokens\*\*/);
    assert.ok(
      terminal.every(({ flux }) => flux !== "error"),
      "aucune ligne d'erreur dans le terminal d'un repository qui démarre",
    );
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("tokens reçus, aucun composant encore : toujours l'état de démarrage", () => {
  const racine = preparerRepo({ tokens: TOKENS });
  try {
    const { bloquant, rapport } = controlerRepository(racine, {
      configuration: { ...CONFIGURATION, components: "composants-ailleurs" },
    });
    assert.equal(bloquant, false);
    assert.match(rapport, /^## ✅ Ce repository n'a pas encore reçu d'export$/m);
    assert.doesNotMatch(rapport, /n'a pas encore été exporté/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Le rapport nomme le chemin cherché, ce qui laisse repérer une faute de frappe
 * dans `ucm.config.json`. Un chemin qui vise un dossier inexistant produit le
 * même relevé qu'un repository neuf, zéro contrat, et aucune mesure ne les
 * sépare. Nommer l'endroit cherché est donc tout ce que ce module peut faire
 * sans supposer laquelle des deux situations il rencontre.
 */
test("l'état de démarrage nomme le dossier où il a cherché", () => {
  const racine = preparerRepo({ tokens: TOKENS });
  try {
    const { rapport } = controlerRepository(racine, {
      configuration: { ...CONFIGURATION, components: "composants-ailleurs" },
    });
    assert.match(rapport, /^## ✅ /m, "le chemin se nomme SANS refuser la fusion");
    assert.match(rapport, /`composants-ailleurs`/);
    assert.match(rapport, /`ucm\.config\.json`/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * L'état de démarrage ne couvre que l'absence du fichier de tokens. Un fichier
 * tronqué appelle le même geste à tout moment, cesser de l'éditer à la main,
 * y compris dans un repository sans aucun contrat.
 */
test("tokens illisibles : une faute même sans un seul contrat", () => {
  const racine = mkdtempSync(join(tmpdir(), "ucm-demarrage-"));
  try {
    mkdirSync(join(racine, "src", "tokens"), { recursive: true });
    writeFileSync(join(racine, CONFIGURATION.tokens), "{ pas du json");
    const { bloquant, rapport } = controlerRepository(racine, { configuration: CONFIGURATION });
    assert.equal(bloquant, true);
    assert.match(rapport, /^## ❌ `src\/tokens\/tokens\.json` est illisible$/m);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Le verdict de démarrage porte sur les contrats et les tokens, pas sur les
 * tests du repository. Une suite rouge refuse la fusion d'un repository neuf
 * comme de tout autre ; un rapport vert masquerait alors un contrôle en échec.
 */
test("l'état de démarrage ne couvre pas une suite de tests rouge", () => {
  const racine = mkdtempSync(join(tmpdir(), "ucm-demarrage-"));
  try {
    const { bloquant, rapport } = controlerRepository(racine, {
      configuration: CONFIGURATION,
      echecsDeTests: { echoue: true, echecs: [] },
    });
    assert.equal(bloquant, true);
    assert.doesNotMatch(rapport, /^## ✅/m);
    assert.match(rapport, /Les tests n'ont pas terminé/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Ce que le noyau répond sans adaptateur, et c'est la règle de tri n° 3 mise à
 * l'épreuve : il ne dit jamais « conforme » de ce qu'il n'a pas lu.
 *
 * Les deux verdicts sont opposés et aucun ne bloque : le fichier n'est pas là,
 * état d'avancement légitime, ou il est là, et personne n'a de vérificateur
 * pour ce langage. Le second n'accuse personne, parce qu'il n'y a personne à
 * qui adresser un geste correctif.
 */
test("sans adaptateur, le noyau dit où est l'implémentation et rien de plus", () => {
  const racine = preparerRepo({
    composants: {
      Ecrit: { contrat: contrat(), tsx: TSX },
      Attendu: { contrat: contrat() },
    },
    tokens: TOKENS,
  });
  try {
    const { bilans, terminal } = controlerRepository(racine, { configuration: CONFIGURATION });
    const parNom = new Map(bilans.map((bilan) => [bilan.fichier, bilan]));

    assert.equal(parNom.get("Attendu.contract.json").parite.implementationAbsente, true);
    assert.equal(parNom.get("Ecrit.contract.json").parite.implementationAbsente, false);
    assert.equal(parNom.get("Ecrit.contract.json").parite.implementationNonLue, "Ecrit.tsx");

    const fil = terminal.map(({ texte }) => texte).join("\n");
    assert.match(fil, /Attendu\.contract\.json : .*implémentation en attente \(autorisé\)/);
    assert.match(fil, /Ecrit\.contract\.json : .*implémentation présente, non lue par l'adaptateur \(Ecrit\.tsx\)/);
    assert.doesNotMatch(fil, /code conforme/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * L'adaptateur est la seule porte par laquelle une connaissance de stack entre.
 *
 * Ce faux adaptateur ne lit aucun langage : il rend un écart directement. Ce
 * qu'on vérifie est le CHEMIN — que le contrôle l'appelle, lui passe le chemin
 * d'implémentation résolu par le motif, et publie son verdict : un écart refuse
 * un contrôle sans base, qui répond de tout le repository.
 */
test("un adaptateur branché est appelé, et son écart bloque un contrôle sans base", () => {
  const vus = [];
  const adaptateur = {
    lireApiPublique: (implementations) => {
      vus.push(...implementations);
      return new Map(implementations.map((chemin) => [chemin, { props: [] }]));
    },
    nomInterfaceAttendue: () => "WidgetProps",
    ecartsDeParite: () => ({
      implementationAbsente: false,
      implementationNonLue: null,
      interfaceAbsente: null,
      fonctionAbsente: null,
      manquantes: ["label"],
      typesIncorrects: [],
      valeursNonImplementees: [],
      booleensNonUtilises: [],
      enumsSansEffet: [],
      compositionsIncorrectes: [],
    }),
  };

  const racine = preparerRepo({
    composants: { Widget: { contrat: contrat(), tsx: TSX } },
    tokens: TOKENS,
  });
  try {
    const { bloquant, rapport } = controlerRepository(racine, { configuration: CONFIGURATION, adaptateur });

    assert.deepEqual(vus, [join(racine, "src", "components", "Widget", "Widget.tsx")]);
    assert.equal(bloquant, true, "sans base, aucun fichier n'est plus récent qu'un autre");
    assert.match(rapport, /^## ❌ Les contrôles du repository bloquent la fusion$/m);
    assert.match(rapport, /### ❌ Le code ne suit pas son contrat \(1 composant\)/);
    assert.match(rapport, /- Widget : La propriété `label` de Figma n'existe pas dans le code/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

function adaptateurDeParite(parite) {
  return {
    lireApiPublique: (implementations) => new Map(implementations.map((chemin) => [chemin, { props: [] }])),
    nomInterfaceAttendue: () => "WidgetProps",
    ecartsDeParite: () => ({
      implementationAbsente: false,
      implementationNonLue: null,
      interfaceAbsente: null,
      fonctionAbsente: null,
      manquantes: [],
      typesIncorrects: [],
      valeursNonImplementees: [],
      booleensNonUtilises: [],
      enumsSansEffet: [],
      compositionsIncorrectes: [],
      ...parite,
    }),
  };
}

function ligneDeWidget(parite) {
  const racine = preparerRepo({
    composants: { Widget: { contrat: contrat(), tsx: TSX } },
    tokens: TOKENS,
  });
  try {
    const { terminal } = controlerRepository(racine, {
      configuration: CONFIGURATION,
      adaptateur: adaptateurDeParite(parite),
    });
    return terminal.map(({ texte }) => texte).filter((texte) => texte.includes("Widget.contract.json")).join("\n");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

test("un type non résolu se dit sur la ligne du terminal sans faire passer le composant en écart", () => {
  const ligne = ligneDeWidget({
    typesNonAnalyses: [
      { prop: "tone", attendu: "enum", recu: "any" },
      { prop: "size", attendu: "enum", recu: "unknown" },
    ],
  });

  assert.match(ligne, /code conforme, sauf `tone` et `size` : type non résolu par l'adaptateur \(/);
  assert.doesNotMatch(ligne, /code en écart/);
  assert.match(
    ligneDeWidget({ manquantes: ["label"], typesNonAnalyses: [{ prop: "tone", attendu: "enum", recu: "any" }] }),
    /code en écart, sauf `tone` : type non résolu par l'adaptateur/,
  );
});

test("un bilan écrit sans typesNonAnalyses reste lu", () => {
  const ligne = ligneDeWidget({});

  assert.match(ligne, /code conforme \(/);
  assert.doesNotMatch(ligne, /sauf/);
});

/**
 * La règle du dernier modifié, jouée de bout en bout. Chaque test porte
 * l'identifiant de la ligne de la table de
 * `docs/notes/Recherches/Linter Dev/DECISION-VERDICT-UCM-CHECK.md` qu'il tient ;
 * `verdict-demande.test.mjs` tient la même table sur la fonction du verdict seule.
 */
const ECART_DE_VARIANTE = { valeursNonImplementees: [{ prop: "variant", valeurs: ["danger"] }] };
const EXPORT = "2026-01-01T00:00:00.000Z";

/** Écrit `.ucm/derogations.json` dans le repository jouet. */
const ecrireDerogations = (contenu) => (racine) => {
  mkdirSync(join(racine, ".ucm"), { recursive: true });
  writeFileSync(join(racine, ".ucm", "derogations.json"), typeof contenu === "string" ? contenu : JSON.stringify(contenu));
};

const derogationDeLaVariante = (surcharge = {}) => ({
  composant: "Widget",
  ecart: { genre: "valeur-non-implementee", prop: "variant", valeur: "danger" },
  export: EXPORT,
  motif: "La variante danger attend la validation du texte d'erreur.",
  par: "Camille",
  ...surcharge,
});

test("V-10 : une demande qui modifie le code et laisse un écart bloque", () => {
  const { bloquant, rapport, terminal, verdict: jugement } = verdict({
    adaptateur: adaptateurDeParite({ manquantes: ["label"] }),
    ...DEMANDE_DE_CODE,
  });

  assert.equal(bloquant, true);
  assert.equal(jugement.composants[0].etat, "ecart");
  assert.match(rapport, /^## ❌ Les contrôles du repository bloquent la fusion$/m);
  assert.match(rapport, /### ❌ Le code ne suit pas son contrat \(1 composant\)/);
  assert.match(rapport, /Cette demande modifie le code de ces composants, et il s'écarte de leur contrat\./);
  assert.match(rapport, /- Widget : La propriété `label` de Figma n'existe pas dans le code/);
  assert.match(rapport, /Un développeur doit mettre le code à jour, ou lancer la commande donnée sous l'écart\./);
  assert.match(rapport, /Pour la garder, lancez `npx @ucm-kit\/cli deroger Widget prop-absente label --motif "…"` avec votre raison à la place de `…`\./);
  assert.match(rapport, /La fusion reste bloquée\./);
  assert.match(terminal.map(({ texte }) => texte).join("\n"), /✗ Widget\.contract\.json : prop du contrat absente du composant → label/);
});

test("V-12 : du code partagé qui crée un écart sur un composant dont le fichier n'a pas changé bloque", () => {
  const { bloquant, rapport } = verdict({
    adaptateur: adaptateurDeParite({ manquantes: ["label"] }),
    cheminsModifies: "src/partage/utilitaires.ts",
  });

  assert.equal(bloquant, true);
  assert.match(rapport, /### ❌ Le code ne suit pas son contrat \(1 composant\)/);
});

test("V-05 : une demande qui ne modifie que le contrat laisse le composant en retard sur son contrat", () => {
  const { bloquant, rapport, verdict: jugement } = verdict({
    adaptateur: adaptateurDeParite(ECART_DE_VARIANTE),
    rangs: { composants: { Widget: { depuis: "2026-11-07T10:00:00.000Z" } } },
    maintenant: new Date("2026-11-19T10:00:00.000Z"),
    ...DEMANDE_DE_CONTRAT,
  });

  assert.equal(bloquant, false);
  assert.ok(jugement.composants[0].constats.includes("en-retard-sur-son-contrat"));
  assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
  assert.match(rapport, /### ⚠️ Le code est en retard sur son contrat \(1 composant\)/);
  assert.match(rapport, /Le contrat a changé après le code\./);
  assert.match(rapport, /- Widget, depuis 12 jours/);
  assert.match(rapport, /Un développeur doit mettre le code à jour la prochaine fois qu'il modifie ce composant\./);
  assert.match(rapport, /Ce retard ne bloque pas la fusion\./);
  assert.doesNotMatch(rapport, /Le code ne suit pas son contrat/);
});

test("V-05 : sans date de changement du contrat, le retard ne dit pas son âge", () => {
  const { rapport } = verdict({ adaptateur: adaptateurDeParite(ECART_DE_VARIANTE), ...DEMANDE_DE_CONTRAT });

  assert.match(rapport, /^- Widget$/m);
  assert.doesNotMatch(rapport, /depuis/);
});

test("V-05 puis V-18 : l'envoi sur main qui suit reste vert tant que le contrat est plus récent que le code", () => {
  const entree = {
    adaptateur: adaptateurDeParite(ECART_DE_VARIANTE),
    rangs: { composants: { Widget: { contrat: 1, code: 2 } } },
  };

  assert.equal(verdict(entree).bloquant, false);
  assert.equal(verdict({ ...entree, rangs: { composants: { Widget: { contrat: 2, code: 1 } } } }).bloquant, true);
  // Un historique qui ne dit rien ne produit aucun retard : l'écart reste un écart.
  assert.equal(verdict({ ...entree, rangs: { composants: { Widget: { contrat: null, code: null } } } }).bloquant, true);
});

test("V-04 : une demande de tokens seuls passe malgré un écart du code qui existait déjà", () => {
  const { bloquant, rapport, terminal, verdict: jugement } = verdict({
    adaptateur: adaptateurDeParite({ manquantes: ["label"] }),
    ...DEMANDE_DE_TOKENS,
    // L'écart est antérieur : le code n'est pas plus ancien que le contrat.
    rangs: { composants: { Widget: { contrat: 3, code: 1 } } },
  });

  assert.equal(bloquant, false);
  assert.equal(jugement.composants[0].etat, "ecart");
  assert.match(rapport, /Le code ne suit pas son contrat/);
  assert.match(rapport, /Ce point ne bloque pas votre demande/);
  assert.match(terminal.map(({ texte }) => texte).join('\n'), /le code ne suit pas son contrat/);
});

test("V-14 : une dérogation valide laisse passer une demande de code, et le rapport la donne à valider", () => {
  const { bloquant, rapport, verdict: jugement } = verdict({
    adaptateur: adaptateurDeParite(ECART_DE_VARIANTE),
    casser: ecrireDerogations({ derogations: [derogationDeLaVariante()] }),
    ...DEMANDE_DE_CODE,
  });

  assert.equal(bloquant, false);
  assert.equal(jugement.composants[0].etat, "deroge-a-valider");
  assert.match(rapport, /### ⚠️ Des écarts du code sont acceptés par une dérogation \(1\)/);
  assert.match(rapport, /- Widget : La variante `danger` n'est pas implémentée dans le code\. Motif : La variante danger attend la validation du texte d'erreur\. \(Camille\)/);
  assert.match(rapport, /Le designer relit chaque motif\. Pour refuser, il demande à un développeur de retirer la ligne de `\.ucm\/derogations\.json`\. Pour accepter, il change Figma pour que le contrat dise ce que fait le code\./);
  assert.match(rapport, /Ces dérogations ne bloquent pas la fusion\./);
  assert.doesNotMatch(rapport, /Le code ne suit pas son contrat/);
});

test("le rapport d'une demande de contrat liste les dérogations à valider", () => {
  const { bloquant, rapport } = verdict({
    adaptateur: adaptateurDeParite(ECART_DE_VARIANTE),
    casser: ecrireDerogations({ derogations: [derogationDeLaVariante()] }),
    ...DEMANDE_DE_CONTRAT,
  });

  assert.equal(bloquant, false);
  assert.match(rapport, /### ⚠️ Des écarts du code sont acceptés par une dérogation \(1\)/);
  assert.match(rapport, /Motif : La variante danger attend la validation du texte d'erreur\. \(Camille\)/);
});

test("V-09 : la dérogation tombe quand l'export du contrat change", () => {
  const { bloquant, rapport } = verdict({
    adaptateur: adaptateurDeParite(ECART_DE_VARIANTE),
    casser: ecrireDerogations({ derogations: [derogationDeLaVariante({ export: "2025-06-01T00:00:00.000Z" })] }),
    ...DEMANDE_DE_CONTRAT,
  });

  assert.equal(bloquant, false);
  assert.match(rapport, /### ⚠️ Des dérogations ne s'appliquent plus \(1\)/);
  assert.match(rapport, /Cet export remplace la version du contrat que ces dérogations visaient\./);
  assert.match(rapport, /- Widget : la variante `danger` de `variant` n'est pas implémentée\. Motif : La variante danger attend la validation du texte d'erreur\. \(Camille\)/);
  assert.match(rapport, /Un développeur doit mettre le code à jour, ou poser une nouvelle dérogation\./);
  assert.match(rapport, /Ce changement ne bloque pas la fusion\./);
  assert.doesNotMatch(rapport, /acceptés par une dérogation/);
});

test("V-15 : un fichier de dérogations fautif bloque une demande de code et nomme l'entrée", () => {
  const fautif = { derogations: [derogationDeLaVariante({ motif: "" })] };
  const { bloquant, rapport } = verdict({ casser: ecrireDerogations(fautif), ...DEMANDE_DE_CODE });

  assert.equal(bloquant, true);
  assert.match(rapport, /### ❌ Le fichier des dérogations contient des erreurs \(1\)/);
  assert.match(rapport, /- derogations\[0\]\.motif : champ vide ou qui n'est pas un texte\./);
  assert.match(rapport, /Un développeur doit corriger `\.ucm\/derogations\.json`\./);
  assert.match(rapport, /La fusion reste bloquée\./);

  assert.equal(verdict({ casser: ecrireDerogations("{ pas du json"), ...DEMANDE_DE_CODE }).bloquant, true);
  assert.equal(verdict({ casser: ecrireDerogations(fautif), ...DEMANDE_DE_CONTRAT }).bloquant, false);
});

test("V-16 : du code TypeScript sans adaptateur bloque une demande de code", () => {
  const { bloquant, rapport } = verdict({ adaptateurAttendu: "absent", ...DEMANDE_DE_CODE });

  assert.equal(bloquant, true);
  assert.match(rapport, /### ❌ Le code TypeScript n'est pas vérifié/);
  assert.match(rapport, /L'adaptateur TypeScript n'est pas installé\./);
  assert.match(rapport, /Un développeur doit installer `@ucm-kit\/adapter-typescript` en version exacte et enregistrer `package-lock\.json`\./);
  assert.match(rapport, /La fusion reste bloquée\./);

  const casse = verdict({ adaptateurAttendu: "casse", ...DEMANDE_DE_CODE }).rapport;
  assert.match(casse, /L'adaptateur TypeScript n'a pas pu se charger\./);
  const nonLu = verdict({ adaptateurAttendu: "present", ...DEMANDE_DE_CODE }).rapport;
  assert.match(nonLu, /L'adaptateur TypeScript ne lit pas `Widget\.tsx`\./);
});

test("V-04 : le même adaptateur absent laisse passer une demande de contrat, et le rapport le dit", () => {
  const { bloquant, rapport } = verdict({ adaptateurAttendu: "absent", ...DEMANDE_DE_CONTRAT });

  assert.equal(bloquant, false);
  assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
  assert.match(rapport, /### ⚠️ Le code TypeScript n'est pas vérifié/);
  assert.match(rapport, /Ce point ne bloque pas votre demande\./);
  assert.doesNotMatch(rapport, /La fusion reste bloquée\./);
});

test("V-17 : le code d'une technologie sans adaptateur passe, et le rapport nomme le composant", () => {
  const { bloquant, rapport } = verdict({ adaptateurAttendu: "sans-adaptateur", ...DEMANDE_DE_CODE });

  assert.equal(bloquant, false);
  assert.match(rapport, /### ℹ️ Le code de ces composants n'est pas vérifié \(1 composant\)/);
  assert.match(rapport, /Aucun adaptateur UCM ne lit cette technologie\./);
  assert.match(rapport, /Un développeur compare le code au contrat à chaque modification\./);
});

test("V-19 : une copie sans historique complet n'est pas jugée", () => {
  const { bloquant, bilans, erreurDInvocation, rapport } = verdict({ historique: "superficiel", ...DEMANDE_DE_CODE });

  assert.equal(bloquant, true);
  assert.deepEqual(bilans, []);
  assert.equal(erreurDInvocation.code, 2);
  assert.match(erreurDInvocation.geste, /git fetch --unshallow/);
  assert.match(rapport, /^## ❌ Le contrôle ne peut pas juger cette demande$/m);
});

/**
 * Un rapport qui refuse ne dit jamais qu'un point ne bloque pas : le designer y
 * chercherait le point qui laisse passer. Chaque scénario refusé ci-dessous
 * ne porte que des sections qui bloquent.
 */
test("un rapport bloquant ne dit pas « ne bloque pas la fusion » pour un point qui bloque", () => {
  const interdit = /ne bloque(?:nt)? pas (?:la fusion|votre demande)|n'empêche(?:nt)? pas la fusion|sans bloquer/;
  const refus = {
    "V-10 écart du code": { adaptateur: adaptateurDeParite({ manquantes: ["label"] }), adaptateurAttendu: "present", ...DEMANDE_DE_CODE },
    "V-07 token absent": { tokens: {}, composants: { Widget: { contrat: contrat() } }, ...DEMANDE_DE_CONTRAT },
    "V-15 dérogations": { casser: ecrireDerogations("{ pas du json"), adaptateurAttendu: "present", ...DEMANDE_DE_CODE },
    "V-16 adaptateur absent": { adaptateurAttendu: "absent", ...DEMANDE_DE_CODE },
    "sans base": { adaptateur: adaptateurDeParite({ manquantes: ["label"] }), adaptateurAttendu: "present" },
  };

  for (const [nom, entree] of Object.entries(refus)) {
    const { bloquant, rapport, terminal } = verdict(entree);
    assert.equal(bloquant, true, nom);
    assert.doesNotMatch(rapport, interdit, nom);
    assert.doesNotMatch(terminal.map(({ texte }) => texte).join("\n"), interdit, nom);
  }
});

/**
 * Le rapport décide si un état bloque par une copie de la tête de
 * `verdictDeLaDemande` (`reponseDeLaDemande`). Ce test tient les deux lectures
 * ensemble : un état que le rapport écrit « bloquant » refuse la demande, et un
 * état écrit « ne bloque pas votre demande » la laisse passer.
 */
test("le rapport et le verdict disent la même chose de ce qui bloque, pour chaque genre de demande", () => {
  const demandes = {
    "tokens-seuls": DEMANDE_DE_TOKENS,
    "contrats-et-tokens": DEMANDE_DE_CONTRAT,
    code: DEMANDE_DE_CODE,
    "sans-base": {},
  };
  for (const [genre, demande] of Object.entries(demandes)) {
    const lecture = verdict({ adaptateurAttendu: "absent", ...demande });
    const ecart = verdict({ adaptateur: adaptateurDeParite({ manquantes: ["label"] }), ...demande });
    const jugeLeCode = genre === "code" || genre === "sans-base";

    assert.equal(lecture.verdict.demande, genre);
    assert.equal(lecture.bloquant, jugeLeCode, `adaptateur absent, ${genre}`);
    assert.equal(/La fusion reste bloquée\./.test(lecture.rapport), jugeLeCode, `adaptateur absent, ${genre}`);
    assert.equal(/Ce point ne bloque pas votre demande\./.test(lecture.rapport), !jugeLeCode, `adaptateur absent, ${genre}`);
    // Un écart ne bloque que la demande de code, à rangs égaux.
    assert.equal(ecart.bloquant, jugeLeCode, `écart, ${genre}`);
  }
});

/**
 * Ce que l'appelant transmet de ce qu'il a exécuté lui-même.
 *
 * Un rapport vert alors que la pull request est refusée est pire que pas de
 * rapport du tout : le designer chercherait la panne ailleurs. Le contrôle
 * couvre donc aussi ce qu'il n'a pas exécuté, et le titre, lui, ne parle pas
 * des contrats, qui sont valides.
 */
test("des tests rouges bloquent, sous un titre qui n'accuse aucun contrat", () => {
  const racine = preparerRepo({
    composants: { Widget: { contrat: contrat(), tsx: TSX } },
    tokens: TOKENS,
  });
  try {
    const { bloquant, rapport } = controlerRepository(racine, {
      configuration: CONFIGURATION,
      echecsDeTests: {
        echoue: true,
        echecs: [
          { fichier: "src/components/Widget/Widget.test.tsx", composant: "Widget", assertion: true, test: "rend la couleur du contrat" },
          { fichier: "scripts/parite.test.mjs", composant: null, assertion: true, test: "relève l'API publique" },
        ],
      },
    });

    assert.equal(bloquant, true);
    assert.match(rapport, /^## ❌ Les contrôles du repository bloquent la fusion$/m);
    assert.match(rapport, /### ❌ Le code n'est plus conforme aux contrats \(1 composant\)/);
    assert.match(rapport, /\*\*Widget\*\* : rend la couleur du contrat/);
    assert.match(rapport, /### ❌ Un garde-fou du repository est en échec \(1 test\)/);
    assert.doesNotMatch(rapport, /contrat invalide/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * La version du format de tokens se juge avant tout token.
 *
 * Un lecteur qui lirait d'abord les tokens déclarerait absentes les références
 * d'un fichier dont il ne connaît pas la forme, ou les dirait présentes : dans
 * les deux cas, un verdict sur un fichier qu'il ne sait pas lire.
 */
const marquer = (version) => ({ $extensions: { "com.ucm.formatVersion": version }, ...TOKENS });

test("tokens de la version courante : même verdict qu'un fichier d'origine", () => {
  const origine = verdict();
  const courante = verdict({ tokens: marquer(2) });

  assert.equal(courante.bloquant, false);
  assert.equal(courante.rapport, origine.rapport);
});

test("tokens d'une version ancienne : lus comme la version courante, sans mention", () => {
  // La fenêtre accueille la version 1, et le rapport n'en dit rien : un
  // repository qui attend le réexport du plugin reste vert, et rien ne
  // distingue son rapport de celui d'un fichier courant.
  const ancienne = verdict({ tokens: marquer(1) });

  assert.equal(ancienne.bloquant, false);
  assert.equal(ancienne.rapport, verdict().rapport);
});

test("tokens d'une version future : refus avant tout token, et le geste revient au développeur", () => {
  const { bloquant, bilans, rapport, terminal } = verdict({ tokens: marquer(3) });

  assert.equal(bloquant, true);
  assert.deepEqual(bilans, [], "aucun contrat n'a été analysé contre ce fichier");
  assert.match(
    rapport,
    /^## ❌ `src\/tokens\/tokens\.json` utilise une version du format de tokens que ce repository ne lit pas$/m,
  );
  assert.match(rapport, /porte la version 3 du format de tokens/);
  assert.match(rapport, /lisent la version 2/);
  assert.match(rapport, /Un développeur doit mettre à jour les paquets UCM du repository/);
  assert.match(rapport, /La fusion reste bloquée\./);
  assert.doesNotMatch(rapport, /Exporter les tokens/, "un réexport ne corrige pas une version future");
  assert.deepEqual(terminal.map(({ flux }) => flux), ["error"]);
});

test("marque de version invalide : refus, et le geste revient au designer", () => {
  const cas = [
    [0, "vaut `0`"],
    [-1, "vaut `-1`"],
    [1.5, "vaut `1.5`"],
    ["1", 'vaut `"1"`'],
    [{ version: 1 }, 'vaut `{"version":1}`'],
  ];
  for (const [valeur, constat] of cas) {
    const { bloquant, bilans, rapport } = verdict({ tokens: marquer(valeur) });
    assert.equal(bloquant, true, JSON.stringify(valeur));
    assert.deepEqual(bilans, []);
    assert.match(rapport, /^## ❌ `src\/tokens\/tokens\.json` porte une version du format de tokens illisible$/m);
    assert.ok(rapport.includes(constat), `${JSON.stringify(valeur)} : ${rapport}`);
    assert.match(rapport, /Relancez \*\*Exporter les tokens\*\* depuis Figma plutôt que de corriger le fichier\./);
  }

  const extensions = verdict({ tokens: { $extensions: "com.ucm.formatVersion", ...TOKENS } });
  assert.equal(extensions.bloquant, true);
  assert.match(extensions.rapport, /`\$extensions` n'est pas un objet\./);

  const tableau = verdict({ tokens: [TOKENS] });
  assert.equal(tableau.bloquant, true);
  assert.match(tableau.rapport, /Le fichier n'est pas un objet JSON\./);
});

test("une marque posée sous un groupe n'est pas lue", () => {
  const tokens = { couleurs: { $extensions: { "com.ucm.formatVersion": 3 }, ...TOKENS.couleurs } };
  const { bloquant, rapport } = verdict({ tokens });

  assert.equal(bloquant, false);
  assert.equal(rapport, verdict().rapport);
});

test("tokens d'une version future, aucun contrat encore : le refus précède l'état de démarrage", () => {
  const racine = preparerRepo({ tokens: marquer(3) });
  try {
    const { bloquant, rapport } = controlerRepository(racine, { configuration: CONFIGURATION });
    assert.equal(bloquant, true, "un fichier de tokens illisible ne reçoit pas de bilan vert");
    assert.match(rapport, /^## ❌ `src\/tokens\/tokens\.json` utilise une version du format de tokens/m);
    assert.doesNotMatch(rapport, /n'a pas encore reçu d'export/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("le tokens.json d'origine figé passe le contrôle comme la forme d'origine", () => {
  const origine = JSON.parse(readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "tokens", "origine", "tokens.json"),
    "utf8",
  ));
  const document = contrat();
  document.viewStructures.st1.children[0].tokens.color = "{brand-tokens.primary.chain}";
  const { bloquant, rapport } = verdict({
    composants: { Widget: { contrat: document, tsx: TSX } },
    tokens: origine,
  });

  assert.equal(bloquant, false);
  assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
  assert.doesNotMatch(rapport, /citent des tokens/);
});

test("un mode qui cite un autre type sous un text style bloque, et le rapport nomme la feuille et le mode", () => {
  const document = contrat();
  document.textStyles = { corps: { figmaName: "Corps", tokens: { lineHeight: "{typo.ligne}" } } };
  document.viewTypographies = { ty1: [{ slotPath: ["label"], style: "corps" }] };
  document.variantViews.v1.typography = "ty1";
  const tokens = {
    ...TOKENS,
    typo: {
      base: { $type: "dimension", $value: { value: 24, unit: "px" } },
      poids: { $type: "number", $value: 600 },
      ligne: {
        $type: "dimension",
        $value: "{typo.base}",
        $extensions: { "com.ucm.modes": { confort: "{typo.base}", dense: "{typo.poids}" } },
      },
    },
  };
  const { bloquant, rapport } = verdict({ composants: { Widget: { contrat: document, tsx: TSX } }, tokens });

  assert.equal(bloquant, true);
  assert.match(rapport, /dont la feuille `typo\.ligne` cite un token de type `number` dans le mode `dense`\. Type attendu/);
  assert.match(rapport, /Un designer doit lier dans Figma une variable du même type/);

  tokens.typo.ligne.$extensions = {
    "com.ucm.modes": { confort: "{typo.base}" },
    "com.ucm.extensions": { "marque-b": { confort: "{typo.poids}" } },
  };
  const etendu = verdict({ composants: { Widget: { contrat: document, tsx: TSX } }, tokens });
  assert.equal(etendu.bloquant, true);
  assert.match(etendu.rapport, /cite un token de type `number` dans le mode `confort` de l'extension `marque-b`\. Type attendu/);
});

/**
 * Le rapport ne parle que si la demande le concerne.
 *
 * Le contrôle tourne sur toute demande de fusion, et c'est délibéré : une
 * demande qui ne touche aucun contrat peut casser la conformité dans le code.
 * Mais une demande qui ne touche rien d'UCM n'a aucun geste à recevoir, et la
 * règle d'écriture du projet est nette : un message qui ne demande rien ne
 * s'écrit pas.
 */
test("une demande étrangère à UCM reçoit une ligne, pas un verdict", () => {
  const { bloquant, rapport } = verdict({
    cheminsModifies: ".github/workflows/ucm.yml",
    tokensModifies: false,
  });

  assert.equal(bloquant, false);
  assert.match(rapport, /^## ✅ Cette demande de fusion ne touche aucun fichier suivi par UCM$/m);
  assert.doesNotMatch(rapport, /contrôlés/, "elle n'annonce pas un contrôle qu'elle ne résume pas");
  assert.doesNotMatch(rapport, /Figma/, "aucun geste de designer n'est demandé ici");
});

test("un dépôt sans export se tait sur une demande qui ne le concerne pas", () => {
  const racine = mkdtempSync(join(tmpdir(), "ucm-demarrage-"));
  try {
    const { bloquant, rapport } = controlerRepository(racine, {
      configuration: CONFIGURATION,
      cheminsModifies: ".github/workflows/ucm.yml",
    });

    assert.equal(bloquant, false);
    assert.doesNotMatch(rapport, /n'a pas encore reçu d'export/);
    assert.doesNotMatch(rapport, /\*\*Exporter les tokens\*\*/);
    assert.match(rapport, /^## ✅ Cette demande de fusion ne touche aucun fichier suivi par UCM$/m);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * L'inverse, et c'est le cas qui compte : un premier export déposé sous un
 * dossier que `ucm.config.json` ne déclare pas. Personne ne trouve le contrat,
 * et ce rapport est le seul endroit où le dossier cherché est nommé.
 */
test("un premier export hors du dossier déclaré reçoit le rapport entier", () => {
  const racine = mkdtempSync(join(tmpdir(), "ucm-demarrage-"));
  try {
    const { rapport } = controlerRepository(racine, {
      configuration: CONFIGURATION,
      cheminsModifies: "composants/Button/Button.contract.json",
    });

    assert.match(rapport, /^## ✅ Ce repository n'a pas encore reçu d'export$/m);
    assert.match(rapport, /Le dossier `src`, déclaré par `ucm\.config\.json`, n'existe pas encore/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * La borne du silence s'arrête là où commence celle du refus : une demande
 * refusée laisse toujours un message, quel que soit ce qu'elle touche.
 */
test("un refus s'écrit en entier, même sur une demande étrangère à UCM", () => {
  const { bloquant, rapport } = verdict({
    cheminsModifies: "README.md",
    casser: (racine) =>
      writeFileSync(join(racine, "src/components/Widget/Widget.contract.json"), "{ pas du json"),
  });

  assert.equal(bloquant, true);
  assert.match(rapport, /^## ❌ 1 contrat invalide$/m);
  assert.doesNotMatch(rapport, /ne touche aucun fichier suivi par UCM/);
});

test("une suite de tests rouge parle, même sur une demande étrangère à UCM", () => {
  const { bloquant, rapport } = verdict({
    cheminsModifies: "README.md",
    echecsDeTests: { echoue: true, echecs: [{ composant: "Widget", message: "rouge" }] },
  });

  assert.equal(bloquant, true);
  assert.doesNotMatch(rapport, /ne touche aucun fichier suivi par UCM/);
});

/**
 * Le marqueur appartient au noyau, et non aux deux publicateurs.
 *
 * C'est lui qui retrouve le commentaire à remplacer, et le second marqueur qui
 * interdit d'en créer un. Les compter dans la borne du commentaire est la
 * raison de les écrire ici : préfixés par le publicateur, ils poussaient le
 * corps publié au-delà de la limite que la borne existe pour tenir.
 */
test("tout rapport porte le marqueur, et lui seul quand il demande un geste", () => {
  const { rapport } = verdict();

  assert.ok(rapport.startsWith("<!-- ucm-rapport -->\n"), rapport.slice(0, 60));
  assert.doesNotMatch(rapport, /ucm-sans-objet/);
});

test("le rapport sans objet porte le marqueur qui interdit de créer un commentaire", () => {
  const { rapport } = verdict({ cheminsModifies: "README.md" });

  assert.ok(rapport.startsWith("<!-- ucm-rapport -->\n<!-- ucm-sans-objet -->\n"), rapport.slice(0, 80));
});

test("les marqueurs et le saut de ligne du fichier tiennent dans la borne du commentaire", () => {
  const document = contrat();
  document.viewStructures.st1.children = Array.from({ length: 3_000 }, (_, i) => ({
    slot: `label${i}`,
    tokens: { color: `{couleurs.absentes.de.la.source.numero${i}}` },
  }));
  const { rapport } = verdict({ composants: { Widget: { contrat: document, tsx: TSX } }, tokens: {} });

  assert.ok(rapport.startsWith("<!-- ucm-rapport -->\n"));
  // `ucm check` écrit le rapport suivi d'un saut de ligne : c'est ce fichier,
  // et non la chaîne rendue, que les deux forges publient.
  assert.ok(`${rapport}\n`.length <= 65_536, `${rapport.length + 1} caractères publiés`);
  assert.match(rapport, /La suite de ce rapport ne tient pas dans un commentaire/);
});

/**
 * Les constats du code, de bout en bout (lot 2.1 du plan P6). Le lecteur du code
 * est factice : il rend un relevé fixé par fichier, ce qui prouve le chemin du
 * contrôle (fichiers du composant, juge, dérogations, verdict, rapport) sans
 * l'adaptateur TypeScript, que le kit n'importe pas.
 */
const CHEMIN_DU_CODE = "src/components/Widget/Widget.tsx";
const CODE_EN_DUR = `${TSX}export const style = { color: "#ff0000" };\n`;
const RELEVE_VIDE = { chaines: [], declarations: [], variables: [], directives: [], lecture: { complete: true, erreurs: 0 } };

/** Le relevé d'un fichier qui écrit `color: "#ff0000"` : la valeur en dur de `CODE_EN_DUR`, à la ligne 3. */
const releveEnDur = (source = CODE_EN_DUR) => ({
  ...RELEVE_VIDE,
  declarations: [{
    propriete: "color",
    valeur: "#ff0000",
    debut: source.indexOf('"#ff0000"'),
    fin: source.indexOf('"#ff0000"') + 9,
    contexte: "style",
  }],
});

/** Un lecteur du code factice : `releves` rend le relevé de chaque fichier par son nom, `fichiers` la liste du composant. */
function lecteurFactice(releves, fichiers = (implementation) => [implementation]) {
  return {
    extensions: [".ts", ".tsx"],
    releverUsages: (_texte, nom) => releves[basename(nom)] ?? RELEVE_VIDE,
    fichiersDuComposant: (implementation) => ({ fichiers: fichiers(implementation), lecture: { complete: true, erreurs: 0 } }),
  };
}

const adaptateurAvecCode = (lecteur) => ({ ...adaptateurDeParite({}), lecteurDuCode: lecteur });
const ecrireLeCode = (source = CODE_EN_DUR) => (racine) => writeFileSync(join(racine, ...CHEMIN_DU_CODE.split("/")), source);

const demandeDeCode = { adaptateur: adaptateurAvecCode(lecteurFactice({ "Widget.tsx": releveEnDur() })), adaptateurAttendu: "present", casser: ecrireLeCode() };

test("un constat du code entre dans le bilan, avec son fichier, sa ligne et la commande qui le déroge", () => {
  const { bilans, bloquant, rapport, terminal, verdict: jugement } = verdict({ ...demandeDeCode, ...DEMANDE_DE_CODE });

  assert.deepEqual(bilans[0].code.fichiers, [CHEMIN_DU_CODE]);
  assert.equal(bilans[0].code.lecture, null);
  const [ecart] = bilans[0].code.ecarts;
  assert.equal(ecart.genre, "valeur-en-dur");
  assert.deepEqual(ecart.coordonnees, { fichier: CHEMIN_DU_CODE, valeur: "#ff0000" });
  assert.equal(ecart.derogeable, true);
  assert.equal(ecart.niveau, "ecart");
  assert.equal(ecart.regle, "valeur-en-dur");
  assert.equal(ecart.fichier, CHEMIN_DU_CODE);
  assert.equal(ecart.ligne, 3);

  assert.equal(bloquant, true);
  assert.equal(jugement.composants[0].etat, "ecart");
  assert.deepEqual(jugement.composants[0].bloquantPar, { contrat: false, tokens: false, parite: false, code: true });
  assert.match(rapport, /^- Widget : `src\/components\/Widget\/Widget\.tsx` ligne 3 : `color` reçoit `#ff0000`/m);
  assert.match(rapport, /lancez `npx @ucm-kit\/cli deroger Widget valeur-en-dur src\/components\/Widget\/Widget\.tsx '#ff0000' --motif "…"`/);
  assert.match(rapport, /Un développeur doit mettre le code à jour, ou lancer la commande donnée sous l'écart\./);
  assert.match(rapport, /La fusion reste bloquée\./);
  assert.match(terminal.map(({ texte }) => texte).join("\n"), /✗ Widget : `src\/components\/Widget\/Widget\.tsx` ligne 3 : /);
});

test("S5 : ucm check et preparerControle rendent les mêmes constats d'un même fichier", () => {
  const lecteur = lecteurFactice({ "Widget.tsx": releveEnDur() });
  const racine = preparerRepo({ composants: { Widget: { contrat: contrat(), tsx: CODE_EN_DUR } }, tokens: TOKENS });
  try {
    const { bilans } = controlerRepository(racine, { configuration: CONFIGURATION, adaptateur: adaptateurAvecCode(lecteur), adaptateurAttendu: "present", ...DEMANDE_DE_CODE });
    writeFileSync(join(racine, "ucm.config.json"), JSON.stringify(CONFIGURATION));
    const juge = preparerControle(join(racine, ...CHEMIN_DU_CODE.split("/")), { lecteur, racine });

    const vus = juge.constats.filter(({ niveau }) => niveau === "ecart");
    assert.equal(vus.length, 1);
    assert.deepEqual(
      bilans[0].code.ecarts.map(({ genre, coordonnees, texte, regle }) => ({ genre, coordonnees, texte, regle })),
      vus.map(({ code, coordonnees, message, regle }) => ({ genre: code, coordonnees, texte: message, regle })),
    );
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("V-26 : une dérogation du code pour l'export courant laisse passer, et le rapport la donne à valider", () => {
  const derogation = {
    composant: "Widget",
    ecart: { genre: "valeur-en-dur", fichier: CHEMIN_DU_CODE, valeur: "#ff0000" },
    export: EXPORT,
    motif: "Le rouge attend le token du designer.",
    par: "Camille",
  };
  const { bloquant, rapport, verdict: jugement } = verdict({
    ...demandeDeCode,
    ...DEMANDE_DE_CODE,
    casser: (racine) => { ecrireLeCode()(racine); ecrireDerogations({ derogations: [derogation] })(racine); },
  });

  assert.equal(bloquant, false);
  assert.equal(jugement.composants[0].etat, "deroge-a-valider");
  assert.match(rapport, /### ⚠️ Des écarts du code sont acceptés par une dérogation \(1\)/);
  assert.match(rapport, /- Widget : `src\/components\/Widget\/Widget\.tsx` ligne 3 : .* Motif : Le rouge attend le token du designer\. \(Camille\)/);
  assert.doesNotMatch(rapport, /Le code ne suit pas son contrat/);
});

test("V-27 : une dérogation du code à l'export ancien tombe, et le constat bloque", () => {
  const derogation = {
    composant: "Widget",
    ecart: { genre: "valeur-en-dur", fichier: CHEMIN_DU_CODE, valeur: "#ff0000" },
    export: "2025-06-01T00:00:00.000Z",
    motif: "Le rouge attend le token du designer.",
    par: "Camille",
  };
  const { bloquant, verdict: jugement } = verdict({
    ...demandeDeCode,
    ...DEMANDE_DE_CODE,
    casser: (racine) => { ecrireLeCode()(racine); ecrireDerogations({ derogations: [derogation] })(racine); },
  });

  assert.equal(bloquant, true);
  assert.equal(jugement.composants[0].derogations.tombees.length, 1);
});

test("V-22 : un contrat plus récent que le code met le constat en retard, sans bloquer", () => {
  const { bloquant, rapport, verdict: jugement } = verdict({
    ...demandeDeCode,
    ...DEMANDE_DE_CODE,
    rangs: { composants: { Widget: { contrat: 1, code: 3 } } },
  });

  assert.equal(bloquant, false);
  assert.equal(jugement.composants[0].etat, "en-retard-sur-son-contrat");
  assert.match(rapport, /### ⚠️ Le code est en retard sur son contrat \(1 composant\)/);
});

test("V-23 : un tokens.json plus récent que le code donne la section du retard du code, et la section des tokens du designer reste vide", () => {
  const { bloquant, rapport, terminal, verdict: jugement } = verdict({
    ...demandeDeCode,
    ...DEMANDE_DE_CODE,
    rangs: { tokens: 1, composants: { Widget: { contrat: 6, code: 3 } } },
  });

  assert.equal(bloquant, false);
  assert.equal(jugement.composants[0].etat, "en-retard-sur-les-tokens");
  assert.match(rapport, /### ⚠️ Le code cite des tokens que tokens\.json n'a plus \(1 composant\)/);
  assert.match(rapport, /Un développeur doit mettre le code à jour la prochaine fois qu'il modifie ce composant\./);
  assert.match(rapport, /Ce retard ne bloque pas la fusion\./);
  assert.doesNotMatch(rapport, /Le code ne suit pas son contrat/);
  assert.doesNotMatch(rapport, /absent de la source de tokens|références? de token absentes?/i, "ce retard ne concerne aucune citation du contrat");
  assert.match(terminal.map(({ texte }) => texte).join("\n"), /le code cite des tokens que tokens\.json n'a plus/);
});

test("V-24 : une demande de contrats passe malgré le constat, et le rapport ne dit pas qu'il bloque", () => {
  const { bloquant, rapport } = verdict({
    ...demandeDeCode,
    ...DEMANDE_DE_CONTRAT,
    // Le code est plus récent que le contrat : le constat n'est pas un retard.
    rangs: { composants: { Widget: { contrat: 3, code: 1 } } },
  });

  assert.equal(bloquant, false);
  assert.match(rapport, /### ⚠️ Le code ne suit pas son contrat \(1 composant\)/);
  assert.match(rapport, /Ce point ne bloque pas votre demande\./);
  assert.doesNotMatch(rapport, /La fusion reste bloquée\./);
});

test("V-28 : un adaptateur chargé sans lecteur du code laisse le code non vérifié", () => {
  const ancien = { adaptateur: adaptateurDeParite({}), adaptateurAttendu: "present", casser: ecrireLeCode() };
  const { bilans, bloquant, rapport, verdict: jugement } = verdict({ ...ancien, ...DEMANDE_DE_CODE });

  assert.equal(bilans[0].code.lecture, "adaptateur-ancien");
  assert.equal(bloquant, true);
  assert.equal(jugement.composants[0].etat, "code-non-verifie");
  assert.equal(jugement.composants[0].lecture, "adaptateur-ancien");
  assert.match(rapport, /### ❌ Le code TypeScript n'est pas vérifié/);
  assert.match(rapport, /L'adaptateur TypeScript installé ne sait pas lire le code des composants\./);
  assert.match(rapport, /Un développeur doit installer `@ucm-kit\/adapter-typescript` en version exacte et enregistrer `package-lock\.json`\./);
  assert.match(rapport, /La fusion reste bloquée\./);

  assert.equal(verdict({ ...ancien, ...DEMANDE_DE_CONTRAT }).bloquant, false, "une demande du designer passe");
  assert.equal(verdict({ adaptateur: adaptateurDeParite({}), adaptateurAttendu: "sans-adaptateur", ...DEMANDE_DE_CODE }).bloquant, false, "sans adaptateur attendu, aucune lecture n'est due");
});

/** Renomme l'implémentation de Widget en `widget.tsx`, sans changer le contrat. */
const ecrireLeCodeSousUneAutreCasse = () => (racine) => {
  const dossier = join(racine, "src", "components", "Widget");
  renameSync(join(dossier, "Widget.tsx"), join(dossier, "widget.tsx"));
};

test("K1 : un fichier d'implémentation sous une autre casse bloque une demande de code, et laisse passer celle du designer", () => {
  const autreCasse = { adaptateur: adaptateurDeParite({}), adaptateurAttendu: "present", casser: ecrireLeCodeSousUneAutreCasse() };
  const { bilans, bloquant, rapport, terminal, verdict: jugement } = verdict({ ...autreCasse, ...DEMANDE_DE_CODE });

  assert.equal(bilans[0].parite.implementationAutreCasse.trouve, "widget.tsx");
  assert.equal(bilans[0].parite.implementationAbsente, false);
  assert.equal(bloquant, true);
  assert.equal(jugement.composants[0].etat, "code-non-verifie");
  assert.equal(jugement.composants[0].lecture, "autre-casse");
  assert.match(rapport, /### ❌ Fichier d'implémentation sous une autre casse \(1 composant\)/);
  assert.match(rapport, /Windows le trouve, la CI sous Linux non\. Le développeur le renomme\./);
  assert.match(rapport, /- `Widget` : `widget\.tsx` existe, mais le motif attend `Widget\.tsx`\. Renommez le fichier\./);
  assert.match(rapport, /La fusion reste bloquée\./);
  assert.ok(terminal.some(({ texte }) => /widget\.tsx` existe, mais le motif attend `Widget\.tsx`/.test(texte)));

  const designer = verdict({ ...autreCasse, ...DEMANDE_DE_CONTRAT });
  assert.equal(designer.bloquant, false, "une demande de contrats seuls passe");
  assert.equal(designer.verdict.composants[0].lecture, "autre-casse");
  assert.doesNotMatch(designer.rapport, /La fusion reste bloquée\./);
});

test("K2 : sans adaptateur, un fichier sous une autre casse n'est pas une implémentation en attente", () => {
  const { bilans, verdict: jugement } = verdict({ casser: ecrireLeCodeSousUneAutreCasse(), ...DEMANDE_DE_CODE });
  assert.equal(bilans[0].parite.implementationAbsente, false);
  assert.equal(jugement.composants[0].lecture, "autre-casse");
  assert.notEqual(jugement.composants[0].etat, "pas-encore-d-implementation");
});

test("K3 : Widget.tsx présent ne dit rien de la casse ; aucun fichier reste une implémentation en attente", () => {
  const present = verdict({ ...DEMANDE_DE_CODE });
  assert.equal(present.bilans[0].parite.implementationAutreCasse, undefined);
  assert.equal(present.verdict.composants[0].lecture, "sans-adaptateur");
  const absent = verdict({ composants: { Widget: { contrat: contrat() } }, ...DEMANDE_DE_CODE });
  assert.equal(absent.verdict.composants[0].etat, "pas-encore-d-implementation");
});

test("K5 : l'adaptateur reçoit l'identifiant du contrat, que le motif nomme le fichier `index` ou non", () => {
  const vus = { identifiants: null, nomsAttendus: [] };
  const adaptateur = {
    ...adaptateurDeParite({}),
    lireApiPublique: (implementations, _racine, identifiants) => {
      vus.identifiants = [...identifiants.entries()].map(([chemin, id]) => [basename(chemin), id]);
      return new Map();
    },
    nomInterfaceAttendue: (implementation, identifiant) => {
      vus.nomsAttendus.push([basename(implementation), identifiant]);
      return `${identifiant}Props`;
    },
  };
  const racine = preparerRepo({ composants: { Widget: { contrat: contrat(), tsx: TSX } }, tokens: TOKENS });
  try {
    controlerRepository(racine, { configuration: { ...CONFIGURATION, implementation: "{dir}/{id}/index.tsx" }, adaptateur });
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
  assert.deepEqual(vus.identifiants, [["index.tsx", "Widget"]]);
  assert.deepEqual(vus.nomsAttendus, [["index.tsx", "Widget"]]);
});

test("un motif sans {dir} se résout depuis la racine du repository, pas depuis le dossier courant", () => {
  const vus = [];
  const adaptateur = {
    ...adaptateurDeParite({}),
    lireApiPublique: (implementations) => {
      vus.push(...implementations);
      return new Map();
    },
  };
  const racine = preparerRepo({ composants: { Widget: { contrat: contrat() } }, tokens: TOKENS });
  try {
    mkdirSync(join(racine, "app"), { recursive: true });
    writeFileSync(join(racine, "app", "Widget.tsx"), TSX);
    const configuration = { ...CONFIGURATION, implementation: "app/{id}.tsx" };
    const { bilans } = controlerRepository(racine, { configuration });
    assert.equal(bilans[0].parite.implementationAbsente, false, "app/Widget.tsx existe sous la racine");
    controlerRepository(racine, { configuration, adaptateur });
    assert.deepEqual(vus, [join(racine, "app", "Widget.tsx")], "l'adaptateur reçoit le chemin sous la racine");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("V-29 : un fichier à erreur de syntaxe laisse le code non vérifié et bloque une demande de code", () => {
  const lecteur = lecteurFactice({ "Widget.tsx": { ...RELEVE_VIDE, lecture: { complete: false, erreurs: 2 } } });
  const { bilans, bloquant, rapport, verdict: jugement } = verdict({
    adaptateur: adaptateurAvecCode(lecteur),
    adaptateurAttendu: "present",
    casser: ecrireLeCode(),
    ...DEMANDE_DE_CODE,
  });

  assert.equal(bilans[0].code.lecture, "lecture-incomplete");
  assert.equal(bloquant, true);
  assert.equal(jugement.composants[0].etat, "code-non-verifie");
  assert.match(rapport, /Un fichier de ces composants porte une erreur de syntaxe/);
  assert.match(rapport, /Un développeur doit corriger l'erreur de syntaxe du fichier\./);
  assert.match(rapport, /La fusion reste bloquée\./);
});

test("V-30 : une valeur calculée par le code se dit en une ligne chiffrée, sans changer l'état", () => {
  const calculee = { ...RELEVE_VIDE, declarations: [{ propriete: "color", valeur: null, debut: 0, fin: 5, contexte: "style" }] };
  const { bilans, bloquant, rapport, terminal, verdict: jugement } = verdict({
    adaptateur: adaptateurAvecCode(lecteurFactice({ "Widget.tsx": calculee })),
    adaptateurAttendu: "present",
    casser: ecrireLeCode(),
    ...DEMANDE_DE_CODE,
  });

  assert.equal(bilans[0].code.nonAnalyses, 1);
  assert.equal(bloquant, false);
  assert.equal(jugement.composants[0].etat, "conforme");
  assert.match(rapport, /- `Widget` : 1 valeur calculée par le code, non jugée\./);
  assert.match(terminal.map(({ texte }) => texte).join("\n"), /Widget : 1 valeur calculée par le code, non jugée\./);
  assert.match(terminal.map(({ texte }) => texte).join("\n"), /code conforme/);
});

test("V-31 : un commentaire qui désactive une règle UCM bloque, sans commande de dérogation", () => {
  const directive = { ...RELEVE_VIDE, directives: [{ texte: " eslint-disable-next-line ucm/valeur-en-dur", debut: 0, fin: 30 }] };
  const { bloquant, rapport, bilans } = verdict({
    adaptateur: adaptateurAvecCode(lecteurFactice({ "Widget.tsx": directive })),
    adaptateurAttendu: "present",
    casser: ecrireLeCode(),
    ...DEMANDE_DE_CODE,
  });

  assert.equal(bilans[0].code.ecarts[0].genre, "desactivation-interdite");
  assert.equal(bilans[0].code.ecarts[0].derogeable, false);
  assert.equal(bloquant, true);
  assert.match(rapport, /Ce commentaire désactive une règle UCM/);
  assert.doesNotMatch(rapport, /npx @ucm-kit\/cli deroger/);
});

test("un fichier voisin du composant, modifié seul, met le composant dans la demande et son code au rang 0", () => {
  const voisin = "src/components/Widget/Widget.variants.ts";
  const source = 'export const rouge = { color: "#ff0000" };\n';
  const lecteur = lecteurFactice(
    { "Widget.variants.ts": releveEnDur(source) },
    (implementation) => [implementation, join(dirname(implementation), "Widget.variants.ts")],
  );
  const { bilans, bloquant, rapport, verdict: jugement } = verdict({
    adaptateur: adaptateurAvecCode(lecteur),
    adaptateurAttendu: "present",
    casser: (racine) => { ecrireLeCode(TSX)(racine); writeFileSync(join(racine, ...voisin.split("/")), source); },
    cheminsModifies: voisin,
  });

  assert.deepEqual(bilans[0].code.fichiers, [CHEMIN_DU_CODE, voisin]);
  assert.equal(bilans[0].code.ecarts[0].fichier, voisin);
  assert.equal(bilans[0].code.ecarts[0].ligne, 1);
  assert.equal(bloquant, true, "le fichier modifié est plus récent que le contrat");
  assert.equal(jugement.demande, "code");
  assert.match(rapport, /- Widget : `src\/components\/Widget\/Widget\.variants\.ts` ligne 1 : /);
});

test("un composant qui a plus de dix constats en liste dix, puis renvoie à ucm check", () => {
  const source = `${TSX}${Array.from({ length: 12 }, (_, i) => `export const c${i} = { color: "#${String(i).padStart(2, "0")}0000" };\n`).join("")}`;
  const declarations = Array.from({ length: 12 }, (_, i) => {
    const valeur = `"#${String(i).padStart(2, "0")}0000"`;
    const debut = source.indexOf(valeur);
    return { propriete: "color", valeur: valeur.slice(1, -1), debut, fin: debut + valeur.length, contexte: "style" };
  });
  const { rapport } = verdict({
    adaptateur: adaptateurAvecCode(lecteurFactice({ "Widget.tsx": { ...RELEVE_VIDE, declarations } })),
    adaptateurAttendu: "present",
    casser: ecrireLeCode(source),
    ...DEMANDE_DE_CODE,
  });

  assert.equal(rapport.split("\n").filter((ligne) => ligne.startsWith("- Widget : `src/")).length, 10);
  assert.match(rapport, /^- et 2 autres : lancez `npx @ucm-kit\/cli check` en local\.$/m);
});

test("S6 : le rapport dit bloquant exactement quand bloquantPar le dit, pour chaque genre de demande", () => {
  const situations = {
    "valeur en dur": demandeDeCode,
    "adaptateur ancien": { adaptateur: adaptateurDeParite({}), adaptateurAttendu: "present", casser: ecrireLeCode() },
    "écart de parité": { adaptateur: adaptateurDeParite({ manquantes: ["label"] }), adaptateurAttendu: "present", casser: ecrireLeCode() },
    "contrat sans token": { tokens: {}, composants: { Widget: { contrat: contrat(), tsx: TSX } } },
  };
  const demandes = {
    "tokens-seuls": DEMANDE_DE_TOKENS,
    "contrats-et-tokens": DEMANDE_DE_CONTRAT,
    code: DEMANDE_DE_CODE,
    "sans-base": {},
  };
  for (const [nomDeLaSituation, situation] of Object.entries(situations)) {
    for (const [genre, demande] of Object.entries(demandes)) {
      const { bloquant, rapport, verdict: jugement } = verdict({ ...situation, ...demande });
      const nom = `${nomDeLaSituation}, ${genre}`;
      const bloqueParCause = jugement.composants.some(({ bloquantPar }) => Object.values(bloquantPar).some(Boolean));

      assert.equal(jugement.demande, genre, nom);
      assert.equal(bloquant, bloqueParCause, nom);
      for (const { bloquant: composantBloquant, bloquantPar } of jugement.composants) {
        assert.equal(composantBloquant, Object.values(bloquantPar).some(Boolean), nom);
      }
      assert.equal(/La fusion reste bloquée\./.test(rapport), bloquant, `${nom} : le rapport dit bloquant`);
    }
  }
});
