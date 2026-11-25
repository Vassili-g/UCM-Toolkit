/**
 * Un composant publié avant les tokens ouvre une demande que le contrôle du
 * repository refuse jusqu'à la fusion des tokens. L'analyse le dit avant la
 * publication, sans la bloquer.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { lireAvantEcriture } from '../src/depot';
import type { RepositoryArtifact } from '../src/depot';
import type { DemandeOuverte, FichierLu, Forge } from '../src/forges/forge';
import { TERMES_GITLAB } from '../src/forges/termes';
import { verdictDePrevol } from '../src/prevol';

const BRANCHE_TOKENS = 'ucm-exporter/export-tokens-20260916-100000';

/** Une forge en mémoire : des fichiers par branche, et des demandes ouvertes. */
function forgeEnMemoire(fichiers: Record<string, Record<string, string>>, demandes: DemandeOuverte[] = []): Forge {
  return {
    termes: TERMES_GITLAB,
    baseBranch: 'main',
    testerDepot: async () => undefined,
    lireFichier: async (chemin: string, ref = 'main'): Promise<FichierLu | null> => {
      const contenu = fichiers[ref]?.[chemin];
      return contenu === undefined ? null : { contenu, version: { commitId: 'c', lastCommitId: 'l' } };
    },
    demandesOuvertes: async () => demandes,
    publier: async () => 'https://gitlab.com/mon-groupe/design-system/-/merge_requests/1',
    sansLienAutomatique: (texte: string) => texte,
  };
}

const composant: RepositoryArtifact = {
  kind: 'component',
  filename: 'Button.contract.json',
  content: '{"contractVersion":"13.0"}',
  warnings: [],
};

test('pour un composant, la lecture dit si les tokens sont fusionnés, en attente ou absents', async () => {
  const fusionnes = await lireAvantEcriture(forgeEnMemoire({ main: { 'tokens.json': '{}' } }), composant, { avecTokens: true });
  assert.equal(fusionnes.tokens, 'fusionnes');

  const enAttente = await lireAvantEcriture(
    forgeEnMemoire({ main: {}, [BRANCHE_TOKENS]: { 'tokens.json': '{}' } }, [{ branche: BRANCHE_TOKENS, url: null }]),
    composant,
    { avecTokens: true },
  );
  assert.equal(enAttente.tokens, 'en-attente');

  const absents = await lireAvantEcriture(forgeEnMemoire({ main: {} }), composant, { avecTokens: true });
  assert.equal(absents.tokens, 'absents');
});

const jetons = (...chemins: string[]) =>
  JSON.stringify(Object.fromEntries(chemins.map((chemin) => [chemin, { $type: 'dimension', $value: '1px' }])));

/** Un contrat qui cite ces chemins, sous la forme `{a.b}`. */
const contratCitant = (...chemins: string[]): RepositoryArtifact => ({
  ...composant,
  content: JSON.stringify({ contractVersion: '13.0', tokens: chemins.map((chemin) => `{${chemin}}`) }),
});

test('le cas courant ne lit aucun tokens.json hors de la base', async () => {
  const lus: string[] = [];
  const forge = forgeEnMemoire({ main: { 'tokens.json': jetons('layout.radius.md') } });
  const lecture = await lireAvantEcriture(
    {
      ...forge,
      lireFichier: async (chemin, ref) => {
        if (chemin === 'tokens.json') lus.push(ref ?? 'main');
        return forge.lireFichier(chemin, ref);
      },
    },
    contratCitant('layout.radius.md'),
    { avecTokens: true },
  );
  assert.equal(lecture.tokens, 'fusionnes');
  assert.equal(lecture.refus, null);
  assert.deepEqual(lus, ['main']);
});

test('une référence absente de la base, sans demande de tokens ouverte, refuse la publication', async () => {
  const lecture = await lireAvantEcriture(
    forgeEnMemoire({ main: { 'tokens.json': jetons('layout.radius.md') } }),
    contratCitant('layout.radius.md', 'layouts.radius.md'),
    { avecTokens: true },
  );
  assert.match(lecture.refus ?? '', /^Le composant utilise 1 variable absente des tokens du dépôt : `layouts\.radius\.md`\. Si elle est nouvelle/);
});

test('une référence absente de la base mais présente dans une demande de tokens ouverte reste en attente', async () => {
  const lecture = await lireAvantEcriture(
    forgeEnMemoire(
      { main: { 'tokens.json': jetons('a.b') }, [BRANCHE_TOKENS]: { 'tokens.json': jetons('a.b', 'c.d') } },
      [{ branche: BRANCHE_TOKENS, url: null }],
    ),
    contratCitant('a.b', 'c.d'),
    { avecTokens: true },
  );
  assert.equal(lecture.tokens, 'en-attente');
  assert.equal(lecture.refus, null);
});

test('une référence absente partout, base et demande de tokens, refuse la publication', async () => {
  const lecture = await lireAvantEcriture(
    forgeEnMemoire({ main: {}, [BRANCHE_TOKENS]: { 'tokens.json': jetons('a.b') } }, [{ branche: BRANCHE_TOKENS, url: null }]),
    contratCitant('a.b', 'x.y'),
    { avecTokens: true },
  );
  assert.match(lecture.refus ?? '', /1 variable absente.*`x\.y`/);
});

test('plus de 10 références absentes : pluriel, dix chemins triés, puis « et N autres »', async () => {
  const chemins = Array.from({ length: 14 }, (_, i) => `z.t${String(i).padStart(2, '0')}`);
  const lecture = await lireAvantEcriture(
    forgeEnMemoire({ main: { 'tokens.json': jetons('a.b') } }),
    contratCitant('a.b', ...chemins),
    { avecTokens: true },
  );
  const attendu = chemins.slice(0, 10).map((c) => `\`${c}\``).join(', ');
  assert.ok(lecture.refus?.startsWith(`Le composant utilise 14 variables absentes des tokens du dépôt : ${attendu}, et 4 autres. Si elles sont nouvelles`), lecture.refus ?? '');
});

test('un tokens.json illisible ne permet pas la comparaison : l’état reste, sans refus', async () => {
  const lecture = await lireAvantEcriture(forgeEnMemoire({ main: { 'tokens.json': 'pas du json' } }), contratCitant('a.b'), { avecTokens: true });
  assert.equal(lecture.tokens, 'fusionnes');
  assert.equal(lecture.refus, null);
});

test('pour les tokens eux-mêmes, la lecture ne rend aucun état des tokens', async () => {
  const tokens = await lireAvantEcriture(forgeEnMemoire({ main: {} }), { ...composant, kind: 'tokens', filename: 'tokens.json' }, { avecTokens: true });
  assert.equal(tokens.tokens, null);
});

test('le verdict avertit sans bloquer quand les tokens ne sont pas fusionnés, et nomme la demande de la forge', () => {
  const base = { code: 'a-publier', genre: 'component', chemin: 'components/Button/Button.contract.json', avertissements: 0, demande: 'merge request' } as const;

  const absents = verdictDePrevol({ ...base, tokens: 'absents' });
  assert.equal(absents.action, 'Publier le composant');
  assert.match(absents.texte, /Les tokens sont absents du dépôt.*fusionner leur merge request avant celle du composant/);

  const enAttente = verdictDePrevol({ ...base, tokens: 'en-attente' });
  assert.equal(enAttente.action, 'Publier le composant');
  assert.match(enAttente.texte, /Les tokens sont en attente de fusion.*fusionner leur merge request/);

  const fusionnes = verdictDePrevol({ ...base, tokens: 'fusionnes' });
  assert.doesNotMatch(fusionnes.texte, /tokens/);
  assert.doesNotMatch(verdictDePrevol({ ...base, genre: 'tokens', tokens: 'absents' }).texte, /tokens sont absents/);
});
