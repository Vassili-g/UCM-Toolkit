/**
 * Les tics de rédaction, refusés partout où le dépôt écrit du français.
 *
 * Le contrôle vit dans `scripts/controle-style.mjs` et non ici, parce que le
 * hook `PostToolUse` de `.claude/settings.json` le rejoue au moment où un agent
 * écrit un fichier. Deux implémentations jugeraient différemment le jour où
 * l'une des deux évoluerait seule.
 *
 * Ce test est la barrière, le hook est le retour immédiat. Un agent d'un autre
 * outillage, un éditeur humain, une correction faite en ligne sur la forge : le
 * hook ne voit rien de tout cela, ce test si.
 *
 * Seuls les refus font échouer le test. Les signaux (`permet de`, opposition à
 * deux-points, deux-points multiples, flèche) se lisent avec
 * `node scripts/controle-style.mjs --detail`. Les cas isolés de chaque motif
 * sont dans `styleMotifs.test.ts`.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  AUTORITES,
  MOTS_RECOPIES,
  fautesDuFichier,
  fichiersAControler,
  messageDeLaRegle,
  passagesRecopies,
  racine,
} from '../scripts/controle-style.mjs';

type Faute = { regle: string; niveau: string; ou: string; extrait: string };

/**
 * Les fichiers soumis aux règles : documents, sources, maquettes `.html` et
 * `fr.ts`, tels que `fichiersAControler` les rend.
 *
 * Aucun n'est exempté sans raison écrite : `EXCLUS_DU_CONTROLE` nomme chaque
 * fichier laissé de côté et dit pourquoi. Restent hors périmètre les
 * dépendances, les artefacts de build et les fixtures figées, dont le texte a
 * été gelé pour un autre contrôle.
 */
function fichiersSoumis(): { chemin: string; contenu: string }[] {
  const tous: string[] = fichiersAControler();

  // Zéro fichier passerait sans rien contrôler : un dossier renommé, et le
  // garde-fou disparaîtrait en silence. C'est la faute qu'il empêche.
  assert.ok(tous.length >= 150, `seuls ${tous.length} fichiers trouvés`);

  return tous.map((chemin: string) => ({
    chemin,
    contenu: fs.readFileSync(path.join(racine, chemin), 'utf8'),
  }));
}

const toutesLesFautes = (): Faute[] => fichiersSoumis()
  .flatMap(({ chemin, contenu }) => fautesDuFichier(chemin, contenu) as Faute[]);

/** Rend les fautes d'une règle, sous une forme lisible dans le rapport d'échec. */
function fautesDe(regle: string): string[] {
  return toutesLesFautes()
    .filter((faute) => faute.regle === regle && faute.niveau === 'refus')
    .map((faute) => `${faute.ou} ${faute.extrait}`);
}

const echec = (regle: string): string => `${messageDeLaRegle(regle)}\n`;

test('aucun tiret cadratin ne sert d’incise, document ou commentaire', () => {
  const fautes = fautesDe('tiret-cadratin');
  assert.deepEqual(fautes, [], `${echec('tiret-cadratin')}${fautes.join('\n')}`);
});

test('aucun mot n’est mis en capitales pour insister', () => {
  const fautes = fautesDe('emphase');
  assert.deepEqual(fautes, [], `${echec('emphase')}${fautes.join('\n')}`);
});

test('aucune règle ne s’annonce par ce qu’elle n’est pas', () => {
  const fautes = fautesDe('opposition');
  assert.deepEqual(fautes, [], `${echec('opposition')}${fautes.join('\n')}`);
});

test('aucun qualificatif ne remplace le mécanisme ou la mesure', () => {
  const fautes = fautesDe('intensificateur');
  assert.deepEqual(fautes, [], `${echec('intensificateur')}${fautes.join('\n')}`);
});

test('aucun texte ne date une décision, puisque Git la date', () => {
  const fautes = fautesDe('datation');
  assert.deepEqual(fautes, [], `${echec('datation')}${fautes.join('\n')}`);
});

for (const [regle, titre] of [
  ['afin-de', 'aucun texte n’écrit « afin de » ou « afin que »'],
  ['liaison-creuse', 'aucun mot de liaison ne remplace le fait'],
  ['formule-de-reponse', 'aucune formule d’ouverture ou de clôture ne figure dans un texte'],
  ['attaque-enthousiaste', 'aucune phrase ne s’ouvre par une interjection'],
  ['emoji-de-statut', 'aucun emoji de statut ne figure dans un texte'],
] as const) {
  test(titre, () => {
    const fautes = fautesDe(regle);
    assert.deepEqual(fautes, [], `${echec(regle)}${fautes.join('\n')}`);
  });
}

/**
 * La re-narration est la cause première de l'inflation, et le seul contrôle du
 * dépôt qui la voie.
 *
 * Les autres garde-fous protègent contre la perte : `inventaireInvariants` voit
 * une règle disparue, `docLinks` un renvoi mort. Aucun ne s'oppose à ce qu'un
 * document redise ce qu'un autre porte déjà, ce qui est la façon dont la
 * documentation a grossi.
 */
test('aucun document d’autorité ne recopie un passage d’un autre', () => {
  const documents = Object.fromEntries(
    AUTORITES.map((chemin: string) => [
      chemin,
      fs.readFileSync(path.join(racine, chemin), 'utf8'),
    ]),
  );

  const recopies = (passagesRecopies(documents) as {
    places: { chemin: string; numero: number }[];
    passage: string;
  }[]).map((trouve) => `${trouve.places.map((p) => `${p.chemin}:${p.numero}`).join(' et ')}`
    + `\n  « ${trouve.passage} »`);

  assert.deepEqual(
    recopies,
    [],
    `${messageDeLaRegle('renarration')}\n`
      + `Seuil : ${MOTS_RECOPIES} mots consécutifs identiques.\n`
      + `${recopies.join('\n')}`,
  );
});
