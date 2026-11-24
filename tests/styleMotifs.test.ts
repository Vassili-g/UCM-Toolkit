/**
 * Les motifs de `scripts/controle-style.mjs` et les hooks qui les appliquent,
 * un cas à la fois.
 *
 * `styleDocumentaire.test.ts` rejoue les règles sur tout le dépôt ; ce fichier
 * fixe ce que chaque motif refuse, ce qu'il laisse passer, et le niveau qui
 * en découle.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  AGENTS_A_CONVERTIR,
  EXCLUS_DU_CONTROLE,
  REGLES_ECRIRE,
  estExclu,
  estJugeable,
  fautesDeReponse,
  fautesDuFichier,
  lignesDuHtml,
  messageDeLaRegle,
  racine,
} from '../scripts/controle-style.mjs';

type Faute = { regle: string; niveau: string; ou: string; extrait: string };

const DOCUMENT = 'docs/essai.md';

const fautes = (chemin: string, contenu: string): Faute[] => fautesDuFichier(chemin, contenu) as Faute[];
const regles = (chemin: string, contenu: string, niveau = 'refus'): string[] => fautes(chemin, contenu)
  .filter((faute) => faute.niveau === niveau)
  .map((faute) => faute.regle);

const refuse = (regle: string, texte: string) => assert.deepEqual(
  regles(DOCUMENT, texte).filter((r) => r === regle),
  [regle],
  `« ${texte} » devrait être refusé par ${regle}`,
);
const accepte = (texte: string, chemin = DOCUMENT) => assert.deepEqual(
  fautes(chemin, texte),
  [],
  `« ${texte} » ne devrait donner aucune faute`,
);

test('afin de, afin d’, afin que et afin qu’ sont refusés', () => {
  refuse('afin-de', 'Le hook relit le fichier afin de corriger.');
  refuse('afin-de', 'Le hook relit le fichier afin d’ouvrir une erreur.');
  refuse('afin-de', 'Le hook relit le fichier afin que le test passe.');
  refuse('afin-de', 'Le hook relit le fichier afin qu’il passe.');
  refuse('afin-de', 'Le hook relit le fichier AFIN\nDE corriger.');
  accepte('Le hook relit le fichier pour corriger.');
  accepte('Le hook relit le fichier, enfin de nuit.');
  accepte('Le texte cite « afin de » entre guillemets.');
});

test('les mots de liaison sans fait sont refusés', () => {
  for (const mot of ['En effet', 'En bref', 'En somme', 'Concrètement', 'Au final']) {
    refuse('liaison-creuse', `${mot}, le test passe.`);
  }
  accepte('Le test passe sans effet de bord.');
  accepte('La règle cite « en effet » entre guillemets.');
  accepte('La règle cite `en effet` en code.');
});

test('les formules d’ouverture et de clôture sont refusées', () => {
  for (const formule of [
    'Excellente question', 'Bonne question', 'Bonne nouvelle', 'En résumé', 'Pour résumer',
    'N’hésitez pas', 'N’hésite pas', 'Le cœur du problème', 'Il est important de', 'Il convient de',
  ]) {
    refuse('formule-de-reponse', `${formule} lire le fichier.`);
  }
  accepte('Une question bonne pour le débat reste permise.');
});

test('parfait, super et génial en tête de phrase sont refusés', () => {
  refuse('attaque-enthousiaste', 'Parfait ! Le test passe.');
  refuse('attaque-enthousiaste', 'Le test passe. Super, il reste un lot.');
  refuse('attaque-enthousiaste', 'Génial.\nLe test passe.');
  accepte('Un résultat parfait.');
  accepte('Le contrôle est super, mais lent.');
  accepte('Le superflu disparaît.');
});

test('les emoji de statut sont refusés, sauf cités', () => {
  for (const emoji of ['✅', '❌', '🎉', '🚀', '✨', '👉', '💡']) {
    refuse('emoji-de-statut', `Le test passe ${emoji}`);
  }
  accepte('Le rapport écrit `✅` pour un succès.');
  accepte('Le rapport écrit « ❌ » pour un échec.');
});

test('permet de est un signal, jamais un refus', () => {
  const texte = 'Le hook permet de relire le fichier. Les hooks permettent d’écrire.';
  assert.deepEqual(regles(DOCUMENT, texte), []);
  assert.deepEqual(regles(DOCUMENT, texte, 'signal'), ['permet-de', 'permet-de']);
  accepte('Le hook relit le fichier.');
});

test('une famille sans complément est un signal, une famille qualifiée n’en est pas un', () => {
  const texte = 'Un écart du code bloque sur quatre familles : couleur et dimension.';
  assert.deepEqual(regles(DOCUMENT, texte), []);
  assert.deepEqual(regles(DOCUMENT, texte, 'signal'), ['famille-sans-complement']);
  assert.deepEqual(regles('AGENTS.md', texte, 'signal'), []);
  accepte('Une famille de propriétés CSS vaut pour trois propriétés.');
  accepte('Les familles d’état restent séparées.');
  accepte('La famille du constat porte le code.');
  accepte('Quatre familles des propriétés CSS sont tokenisées.');
});

test('quatre familles de propriétés, ou une famille suivie d’un code, ne donnent aucun signal', () => {
  assert.deepEqual(
    regles(DOCUMENT, 'Un écart du code bloque sur quatre familles de propriétés CSS, `couleur`, `dimension`, `typographie` et `effet`.', 'signal'),
    [],
  );
  assert.deepEqual(regles(DOCUMENT, 'La famille `couleur` est tokenisée.', 'signal'), []);
  assert.deepEqual(regles(DOCUMENT, 'Le champ `famille` porte le nom.', 'signal'), []);
});

test('l’opposition à deux-points est un signal en forme étroite', () => {
  assert.deepEqual(
    regles(DOCUMENT, 'La table ne dit pas où une règle atterrira : elle dit où elle est.', 'signal'),
    ['opposition-deux-points'],
  );
  assert.deepEqual(
    regles(DOCUMENT, 'Le hook n’écrit rien : c’est le test qui juge.', 'signal'),
    ['opposition-deux-points'],
  );
  accepte('Le hook relit le fichier : il rend le texte.');
  accepte('Le hook ne relit pas les titres. Le test juge : il échoue.');
});

test('deux deux-points dans une phrase font un signal, sauf fichiers d’agents et maquettes', () => {
  const texte = 'Le champ a deux états : absent : vide.';
  assert.deepEqual(regles(DOCUMENT, texte, 'signal'), ['deux-points-multiples']);
  accepte('Le champ a un état : absent. Le suivant vaut : vide.');
  assert.deepEqual(regles('AGENTS.md', texte, 'signal'), []);
  assert.deepEqual(regles('packages/kit/invariants/referentiel.md', texte, 'signal'), []);
  assert.deepEqual(regles('docs/maquette.html', `<p>${texte}</p>`, 'signal'), []);
});

test('la flèche dans une phrase est un refus dans les fichiers d’agents et un signal ailleurs, une ligne de tableau est écartée', () => {
  assert.deepEqual(regles(DOCUMENT, 'Le contrat → le code.', 'signal'), ['fleche']);
  assert.deepEqual(regles('AGENTS.md', 'Le contrat → le code.', 'refus'), ['fleche']);
  assert.deepEqual(regles('AGENTS.md', 'Le contrat → le code.', 'signal'), []);
  for (const chemin of AGENTS_A_CONVERTIR) {
    assert.deepEqual(regles(chemin, 'Le contrat → le code.', 'signal'), ['fleche']);
    assert.deepEqual(regles(chemin, 'Le contrat → le code.', 'refus'), []);
  }
  assert.deepEqual(regles('docs/maquette.html', '<p>Le contrat → le code.</p>', 'signal'), ['fleche']);
  accepte('| Contrat | Code |\n|---|---|\n| a → b | c |');
  accepte('Le contrat `a → b` produit le code.');
});

test('un signal ne fait pas sortir le contrôle en erreur, un refus si', () => {
  // Dans le dépôt, car sur un autre disque le contrôle ne relativise pas le
  // chemin. `_local/` est ignoré par Git : le test du registre des documents,
  // lancé en parallèle, ne voit pas ces fichiers.
  fs.mkdirSync(path.join(racine, 'tests', '_local'), { recursive: true });
  const dossier = fs.mkdtempSync(path.join(racine, 'tests', '_local', 'essai-style-'));
  try {
    const signal = path.join(dossier, 'signal.md');
    fs.writeFileSync(signal, 'Le hook permet de relire le fichier.\n');
    const sansRefus = spawnSync(process.execPath, [path.join(racine, 'scripts/controle-style.mjs'), signal], { encoding: 'utf8' });
    assert.equal(sansRefus.status, 0, sansRefus.stderr);
    assert.match(sansRefus.stdout, /permet-de : 1/);

    const refus = path.join(dossier, 'refus.md');
    fs.writeFileSync(refus, 'Le hook relit le fichier afin de corriger.\n');
    const avecRefus = spawnSync(process.execPath, [path.join(racine, 'scripts/controle-style.mjs'), refus], { encoding: 'utf8' });
    assert.equal(avecRefus.status, 1);
    assert.match(avecRefus.stderr, /afin-de/);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
});

test('le hook d’écriture rend un signal en JSON avec le code 0, un refus avec le code 2', () => {
  const nom = `essai-style-${process.pid}.md`;
  fs.mkdirSync(path.join(racine, 'tests', '_local'), { recursive: true });
  const complet = path.join(racine, 'tests', '_local', nom);
  const lancer = () => spawnSync(process.execPath, [path.join(racine, 'scripts/hook-style.mjs')], {
    input: JSON.stringify({ tool_input: { file_path: complet } }),
    encoding: 'utf8',
  });
  try {
    fs.writeFileSync(complet, 'Le hook permet de relire le fichier.\n');
    const signal = lancer();
    assert.equal(signal.status, 0, signal.stderr);
    const sortie = JSON.parse(signal.stdout);
    assert.equal(sortie.hookSpecificOutput.hookEventName, 'PostToolUse');
    assert.match(sortie.hookSpecificOutput.additionalContext, /permet-de/);
    assert.match(sortie.hookSpecificOutput.additionalContext, /la garder si le fait l.exige/);

    fs.writeFileSync(complet, 'Le hook relit le fichier afin de corriger.\n');
    const refus = lancer();
    assert.equal(refus.status, 2);
    assert.match(refus.stderr, /afin-de/);
    assert.equal(refus.stdout, '');
  } finally {
    fs.rmSync(complet, { force: true });
  }
});

test('le texte d’une maquette HTML se lit sans script, style ni balises', () => {
  const html = [
    '<html>',
    '<style>.a { content: "afin de"; }</style>',
    '<script>const t = "Bonne nouvelle";</script>',
    '<!-- En bref -->',
    '<p>Bonne&nbsp;nouvelle <b>pour</b> le test &amp; le reste.</p>',
    '<p><code>afin de</code> reste du code.</p>',
  ].join('\n');
  const lignes = lignesDuHtml(html) as { numero: number; texte: string }[];
  assert.equal(lignes[4].texte, 'Bonne nouvelle pour le test & le reste.');
  assert.equal(lignes[1].texte, '');
  assert.equal(lignes[2].texte, '');

  const trouvees = fautes('docs/maquette.html', html);
  assert.deepEqual(trouvees.map((faute) => [faute.regle, faute.ou]), [['formule-de-reponse', 'docs/maquette.html:5']]);
});

test('une entité HTML se décode avant le contrôle', () => {
  assert.deepEqual(regles('docs/maquette.html', '<p>Un tiret&nbsp;&mdash; incise.</p>'), ['tiret-cadratin']);
  assert.deepEqual(regles('docs/maquette.html', '<p>Un tiret &#8212; incise.</p>'), ['tiret-cadratin']);
});

test('les chaînes d’un fr.ts se contrôlent, pas celles d’un autre fichier', () => {
  const source = [
    'export const fr = {',
    "  titre: 'Afin de choisir',",
    '  aide: `Bonne nouvelle ${nombre}`,',
    '};',
  ].join('\n');
  const trouvees = fautes('packages/plugin-palettes/src/i18n/fr.ts', source);
  assert.deepEqual(
    trouvees.map((faute) => [faute.regle, faute.ou]),
    [['afin-de', 'packages/plugin-palettes/src/i18n/fr.ts:2'], ['formule-de-reponse', 'packages/plugin-palettes/src/i18n/fr.ts:3']],
  );
  assert.deepEqual(fautes('packages/plugin-palettes/src/ui/autre.ts', source), []);
  assert.deepEqual(
    regles('packages/plugin-palettes/src/i18n/fr.ts', '// afin de commenter\nexport const a = 1;'),
    ['afin-de'],
  );
});

test('un fichier exclu porte une raison', () => {
  assert.equal(estExclu('docs/notes/Archives/Plugin Architect/x.html'), true);
  assert.equal(estExclu('docs/notes/Archives/Plugin Architect/x.md'), false);
  assert.equal(estExclu('docs/essai.md'), false);
});

test('une réponse est contrôlée sans code, sans citation et sans autre règle', () => {
  const noms = (texte: string) => (fautesDeReponse(texte) as Faute[]).map((faute) => faute.regle);
  assert.deepEqual(noms('Excellente question ! Parfait, voici.'), ['formule-de-reponse', 'attaque-enthousiaste']);
  assert.deepEqual(noms('Tout est fait ✅'), ['emoji-de-statut']);
  assert.deepEqual(noms('Le test passe.\n```\nafin de\n```\nLe code est cité.'), []);
  assert.deepEqual(noms('La tournure « en effet » est citée, `afin de` aussi.'), []);
  assert.deepEqual(noms('Un MOT en capitales, avec permet de et →.'), []);
  assert.deepEqual(noms('Un tiret — en incise.'), ['tiret-cadratin']);
  assert.deepEqual(noms('# Titre — admis\n| a — b |\n|---|'), []);
});

/** Lance `hook-reponse.mjs` avec une entrée fabriquée. */
function hookReponse(entree: unknown) {
  return spawnSync(process.execPath, [path.join(racine, 'scripts/hook-reponse.mjs')], {
    input: typeof entree === 'string' ? entree : JSON.stringify(entree),
    encoding: 'utf8',
  });
}

test('le hook des réponses sort en 2 sur une faute et rend la consigne', () => {
  const resultat = hookReponse({ last_assistant_message: 'Bonne nouvelle : tout passe.' });
  assert.equal(resultat.status, 2);
  assert.match(resultat.stderr, /Bonne nouvelle/);
  assert.match(resultat.stderr, /Réécris ta dernière réponse en entier sans ces tournures, selon le bloc « Écrire » d.AGENTS\.md\. Une phrase sans fait se supprime\./);
});

test('le hook des réponses sort en 0 sur un texte propre ou une entrée vide', () => {
  assert.equal(hookReponse({ last_assistant_message: 'Les 412 tests passent.' }).status, 0);
  assert.equal(hookReponse('').status, 0);
  assert.equal(hookReponse('pas du JSON').status, 0);
});

test('le hook des réponses ne boucle pas quand stop_hook_active est vrai', () => {
  const resultat = hookReponse({ stop_hook_active: true, last_assistant_message: 'Bonne nouvelle : tout passe.' });
  assert.equal(resultat.status, 0);
  assert.equal(resultat.stderr, '');
});

test('le hook des réponses se replie sur le dernier message texte du transcript', () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'reponse-'));
  try {
    const message = (type: string, content: unknown) => JSON.stringify({ type, message: { content } });
    const transcript = path.join(dossier, 'transcript.jsonl');
    fs.writeFileSync(transcript, [
      message('assistant', [{ type: 'text', text: 'Excellente question !' }]),
      message('user', [{ type: 'text', text: 'Merci.' }]),
      message('assistant', [{ type: 'tool_use', name: 'Bash' }]),
      message('assistant', [{ type: 'text', text: 'Le lot est fait.' }, { type: 'text', text: 'Parfait, il reste un test.' }]),
      message('assistant', [{ type: 'tool_use', name: 'Bash' }]),
    ].join('\n'));

    const faute = hookReponse({ transcript_path: transcript });
    assert.equal(faute.status, 2);
    assert.match(faute.stderr, /Parfait,/);
    assert.doesNotMatch(faute.stderr, /Excellente/);

    fs.writeFileSync(transcript, message('assistant', [{ type: 'text', text: 'Le lot est fait.' }]));
    assert.equal(hookReponse({ transcript_path: transcript }).status, 0);

    const sousAgent = path.join(dossier, 'sous-agent.jsonl');
    fs.writeFileSync(sousAgent, message('assistant', [{ type: 'text', text: 'Bonne nouvelle.' }]));
    assert.equal(hookReponse({ transcript_path: transcript, agent_transcript_path: sousAgent }).status, 2);

    assert.equal(hookReponse({ transcript_path: path.join(dossier, 'absent.jsonl') }).status, 0);
    fs.writeFileSync(transcript, 'pas du json\n');
    assert.equal(hookReponse({ transcript_path: transcript }).status, 0);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
});

test('les chaînes d’un JSON de la liste sont jugées, avec leur chemin JSON', () => {
  const chemin = 'docs/inventaire/textes.json';
  const json = JSON.stringify({ sections: [{ titre: 'Propre', texte: 'Un tiret — cadratin.' }] });
  const trouvees = fautes(chemin, json);
  assert.deepEqual(trouvees.map((faute) => faute.regle), ['tiret-cadratin']);
  assert.equal(trouvees[0].ou, `${chemin} $.sections[0].texte`);
  accepte(JSON.stringify({ sections: [{ texte: 'Un texte propre.' }] }), chemin);
  assert.equal(regles(chemin, '{ pas du json', 'refus')[0], 'json-illisible');
});

test('les champs note de decisions.json restent hors contrôle, les autres champs non', () => {
  const chemin = 'docs/notes/Recherches/Evolutions globales/decisions.json';
  accepte(JSON.stringify({ decisions: [{ id: 'D1', note: 'Un mot — du mainteneur.' }] }), chemin);
  assert.deepEqual(
    fautes(chemin, JSON.stringify({ decisions: [{ id: 'D1', question: 'Une question — ouverte.' }] }))
      .map((faute) => faute.ou),
    [`${chemin} $.decisions[0].question`],
  );
  assert.equal(
    fautes('docs/notes/Recherches/Evolutions globales/pistes.json', JSON.stringify({ note: 'Un — tiret.' })).length,
    1,
    'le champ note n’est exempté que dans decisions.json',
  );
});

test('un JSON hors liste n’est pas contrôlé', () => {
  accepte(JSON.stringify({ texte: 'Un tiret — cadratin.' }), 'docs/autre.json');
});

/** Le contenu d'un fichier du dépôt, à partir de la racine. */
const lire = (chemin: string) => fs.readFileSync(path.join(racine, chemin), 'utf8');

test('[S7] chaque exception du contrôle produit encore ce qu’elle excuse', () => {
  for (const exclu of EXCLUS_DU_CONTROLE as { chemin?: string; prefixe?: string; extension?: string }[]) {
    const cibles: string[] = [];
    if (exclu.chemin !== undefined) cibles.push(exclu.chemin);
    else {
      const parcourir = (courant: string) => {
        for (const entree of fs.readdirSync(courant, { withFileTypes: true })) {
          const complet = path.join(courant, entree.name);
          if (entree.isDirectory()) parcourir(complet);
          else if (entree.name.endsWith(exclu.extension ?? '')) {
            cibles.push(path.relative(racine, complet).split(path.sep).join('/'));
          }
        }
      };
      parcourir(path.join(racine, exclu.prefixe as string));
    }
    const refus = cibles.flatMap((cible) => fautes(cible, lire(cible)).filter((faute) => faute.niveau === 'refus'));
    assert.ok(refus.length > 0, `${exclu.chemin ?? exclu.prefixe} ne produit plus de refus : retirer l’entrée d’EXCLUS_DU_CONTROLE`);
  }
  for (const chemin of AGENTS_A_CONVERTIR as string[]) {
    assert.ok(lire(chemin).includes('→'), `${chemin} n’a plus de flèche : retirer l’entrée d’AGENTS_A_CONVERTIR`);
  }
});

test('[S8] REGLES_ECRIRE compte une entrée par puce du bloc « Écrire » d’AGENTS.md', () => {
  const agents = lire('AGENTS.md');
  const debut = agents.indexOf('## Écrire');
  assert.ok(debut >= 0, 'le bloc « Écrire » est introuvable');
  const bloc = agents.slice(debut, agents.indexOf('Exemples tirés', debut));
  const puces = bloc.split(/\r?\n/).filter((ligne) => ligne.startsWith('- '));
  assert.ok(puces.length > 0);
  assert.equal((REGLES_ECRIRE as unknown[]).length, puces.length);
  for (const { moyen, portees, motifs } of REGLES_ECRIRE as { moyen: string; portees: string[]; motifs?: string[] }[]) {
    assert.ok(['motif', 'relecture'].includes(moyen));
    assert.ok(portees.length > 0 && portees.every((portee) => ['fichier', 'reponse'].includes(portee)));
    for (const motif of motifs ?? []) assert.notEqual(messageDeLaRegle(motif), motif, `${motif} n’a pas de message`);
  }
});

test('[S9] le hook des réponses refuse un tiret cadratin en incise et une offre de suite', () => {
  const incise = hookReponse({ last_assistant_message: 'Le test passe — le lot est fait.' });
  assert.equal(incise.status, 2);
  assert.match(incise.stderr, /—/);
  const offre = hookReponse({ last_assistant_message: 'Le lot est fait. Souhaitez-vous que je poursuive ?' });
  assert.equal(offre.status, 2);
  assert.match(offre.stderr, /Souhaitez-vous/);
  assert.equal(hookReponse({ last_assistant_message: 'Si vous voulez, je peux relancer.' }).status, 2);
  assert.equal(hookReponse({ last_assistant_message: 'Je reste à disposition.' }).status, 2);
  assert.equal(hookReponse({ last_assistant_message: 'Le lot est fait.' }).status, 0);
});

test('[S10] estJugeable écarte .js, garde .mjs, et le hook rend le même verdict', () => {
  assert.equal(estJugeable('x.js'), false);
  assert.equal(estJugeable('x.mjs'), true);
  assert.equal(estJugeable('docs/inventaire/textes.json'), true);
  assert.deepEqual(fautes('x.js', '// afin de commenter\n'), []);
  fs.mkdirSync(path.join(racine, 'tests', '_local'), { recursive: true });
  const dossier = fs.mkdtempSync(path.join(racine, 'tests', '_local', 'jugeable-'));
  try {
    const verdict = (nom: string) => {
      const complet = path.join(dossier, nom);
      fs.writeFileSync(complet, '// Le hook relit le fichier afin de corriger.\n');
      return spawnSync(process.execPath, [path.join(racine, 'scripts/hook-style.mjs')], {
        input: JSON.stringify({ tool_input: { file_path: complet } }),
        encoding: 'utf8',
      }).status;
    };
    assert.equal(verdict('x.js'), 0);
    assert.equal(verdict('x.mjs'), 2);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
});

test('[S11] une erreur du hook d’écriture sort en 2 avec « n’a pas pu s’exécuter »', () => {
  fs.mkdirSync(path.join(racine, 'tests', '_local'), { recursive: true });
  const dossier = fs.mkdtempSync(path.join(racine, 'tests', '_local', 'erreur-'));
  try {
    // Un dossier nommé `.md` existe pour `existsSync` et fait échouer `readFileSync`.
    const piege = path.join(dossier, 'piege.md');
    fs.mkdirSync(piege);
    const resultat = spawnSync(process.execPath, [path.join(racine, 'scripts/hook-style.mjs')], {
      input: JSON.stringify({ tool_input: { file_path: piege } }),
      encoding: 'utf8',
    });
    assert.equal(resultat.status, 2);
    assert.match(resultat.stderr, /Le contrôle de style n.a pas pu s.exécuter : /);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
});

test('[S12] une puce collée est refusée, deux gras dans une section sont un signal', () => {
  refuse('puce-collee', 'Les noms restent locaux dans le système.- La prose passe le contrôle.');
  accepte('- Une puce.\n- Une autre puce.');
  accepte('La version 1.0 reste, et la suite... continue.');
  const deux = '## Section\n\nUn **mot** et un **autre**.\n';
  assert.deepEqual(regles(DOCUMENT, deux, 'signal'), ['gras-multiple']);
  assert.deepEqual(regles(DOCUMENT, deux), []);
  assert.deepEqual(regles(DOCUMENT, '## A\n\nUn **mot**.\n\n## B\n\nUn **autre**.\n', 'signal'), []);
  assert.deepEqual(regles('AGENTS.md', deux, 'signal'), []);
});

test('[X1] « cran » dans une chaîne d’Architect ou de Palettes est un signal, « crans de l’échelle » n’en est pas un', () => {
  const textes = 'packages/plugin-architect/src/ui/textes/structure.ts';
  const signaux = (chemin: string, contenu: string) => regles(chemin, contenu, 'signal').filter((regle) => regle === 'cran-face-au-designer');
  const source = (chaine: string) => `export const T = { a: '${chaine}' };
`;
  assert.deepEqual(signaux(textes, source('Viser le cran 700 pour la page.')), ['cran-face-au-designer']);
  assert.deepEqual(signaux(textes, source('Choisissez les crans de la palette.')), ['cran-face-au-designer']);
  assert.deepEqual(signaux('packages/plugin-palettes/src/i18n/fr.ts', source('Le cran 500.')), ['cran-face-au-designer']);
  assert.deepEqual(signaux(textes, source('Deux crans de l’échelle ont la même valeur.')), []);
  assert.deepEqual(signaux(textes, `// Corrections de crans
export const T = { cranSansSens: 'La nuance 700.' };
`), []);
  assert.deepEqual(signaux('packages/kit/src/essai.ts', source('Le cran 700.')), []);
});
