/**
 * Le JSON Schema publié suit-il `types.ts` ?
 *
 * C'est la seule question qui se tranche sans contrat sous la main : le fichier
 * commité est-il celui que le générateur produit aujourd'hui, et refuse-t-il ce
 * qu'un schéma doit refuser.
 *
 * Le schéma servi accepte le corpus figé 14.0. Le schéma préparé accepte les
 * fabriques 15.0 du banc. Chaque sortie du moteur est aussi validée dans
 * `exportComponent.test.ts`, via `verifierLeSchema`.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import Ajv from 'ajv';
import { CONTRACT_VERSION } from '../src/format/version';
import { CHEMIN_DU_SCHEMA, construireLeSchema } from '../scripts/build-schema';
// @ts-expect-error Les fabriques du banc sont du JavaScript sans déclaration.
import { BASES_15, VERSION_15 } from './banc/contrats-15.mjs';
// @ts-expect-error Les cas du banc sont du JavaScript sans déclaration.
import { CAS_CONFORMES } from './banc/cas-conformes.mjs';

const schemaCommite = JSON.parse(readFileSync(CHEMIN_DU_SCHEMA, 'utf8')) as Record<string, unknown>;

/** Ajv en draft-07, tolérant aux mots-clés `x-` que le schéma porte. */
function valideur(schema: Record<string, unknown>) {
  return new Ajv({ allErrors: true, strict: false }).compile(schema);
}

test('le schéma commité est celui que produit types.ts aujourd\'hui', () => {
  // La comparaison porte sur le JSON analysé, pas sur les octets. `.gitattributes`
  // fige bien ce fichier en LF, mais une copie de travail issue d'un autre outil
  // peut le rendre en CRLF : comparer le texte serait rouge sans aucune dérive.
  assert.deepEqual(
    schemaCommite,
    construireLeSchema(),
    'schema/ucm-contract.schema.json est périmé. Lancez « npm run schema ».',
  );
});

test('le schéma publie la version de contrat que le moteur écrit', () => {
  assert.equal(schemaCommite['x-ucm-contract-version'], CONTRACT_VERSION);
});

test('le schéma refuse un contrat vidé de sa substance', () => {
  const valider = valideur(schemaCommite);
  assert.equal(valider({}), false);
});

const cheminDuSchema15 = join(CHEMIN_DU_SCHEMA, '..', 'ucm-contract-15.0.schema.json');

test('le schéma 15.0 commité suit les mêmes types que le schéma servi', () => {
  const schema15 = JSON.parse(readFileSync(cheminDuSchema15, 'utf8'));
  assert.deepEqual(schema15, construireLeSchema(VERSION_15),
    'schema/ucm-contract-15.0.schema.json est périmé. Lancez « npm run schema ».');
  assert.equal(schema15['x-ucm-contract-version'], VERSION_15);
  const contrat = BASES_15.riche();
  contrat.meta.contractVersion = CONTRACT_VERSION;
  const valider = valideur(schema15);
  assert.equal(valider(contrat), false);
  assert.ok(valider.errors?.some(erreur => erreur.keyword === 'const'
    && erreur.instancePath === '/meta/contractVersion'));
});

test('le schéma 15.0 accepte chaque base et chaque cas accepté du banc', () => {
  const valider = valideur(JSON.parse(readFileSync(cheminDuSchema15, 'utf8')));
  const cas = [
    ...Object.entries(BASES_15).map(([id, contrat]) => ({ id, contrat })),
    ...CAS_CONFORMES.filter((cas: { attendu: string }) => cas.attendu === 'accepte'),
  ];
  const refuses = cas.flatMap(({ id, contrat }) => valider((contrat as () => unknown)())
    ? [] : [{ id, erreurs: valider.errors }]);
  assert.deepEqual(refuses, []);
});

test('le schéma 15.0 interdit sizes à la racine et dans chaque pièce', () => {
  const valider = valideur(JSON.parse(readFileSync(cheminDuSchema15, 'utf8')));
  for (const proprietaire of ['hote', 'Volet', 'Perle']) {
    const contrat = BASES_15.imbrique();
    const structure = proprietaire === 'hote' ? contrat.structure : contrat.pieces[proprietaire].structure;
    structure.sizes = { small: { gap: '{layout.gap.small}' } };
    assert.equal(valider(contrat), false, proprietaire);
    assert.ok(valider.errors?.some(erreur => erreur.keyword === 'additionalProperties'
      && erreur.params.additionalProperty === 'sizes'), JSON.stringify(valider.errors));
  }
});

test('le schéma servi accepte le corpus 14.0 et refuse sa déclaration en 15.0', () => {
  const valider = valideur(schemaCommite);
  const dossier = new URL('../fixtures/contrats/14.0/', import.meta.url);
  const fichiers = readdirSync(dossier).filter(nom => nom.endsWith('.contract.json'));
  assert.ok(fichiers.length > 0);
  for (const fichier of fichiers) {
    const contrat = JSON.parse(readFileSync(new URL(fichier, dossier), 'utf8'));
    assert.equal(valider(contrat), true, `${fichier} : ${JSON.stringify(valider.errors)}`);
    contrat.meta.contractVersion = VERSION_15;
    assert.equal(valider(contrat), false, fichier);
    assert.ok(valider.errors?.some(erreur => erreur.keyword === 'const'
      && erreur.instancePath === '/meta/contractVersion'));
  }
});

test('le schéma servi refuse les champs propres à la 15.0 sous une déclaration 14.0', () => {
  const valider = valideur(schemaCommite);
  const champs = [
    (contrat: any) => { contrat.pieces = {}; },
    (contrat: any) => { contrat.viewStructures.h.children = [{ slot: 'volet', piece: 'Volet' }]; },
    (contrat: any) => { contrat.variants[0].pieces = []; },
    (contrat: any) => { contrat.props = { texte: { type: 'string', source: { slotPath: ['volet'], prop: 'texte' } } }; },
    (contrat: any) => { contrat.samples = { s: { pieces: [] } }; },
    (contrat: any) => { contrat.meta.diagnostics = [{ code: 'UCM_PORTABLE_PROJECTION_WARNING', severity: 'warning', message: 'Perte.', slotPath: [] }]; },
  ];
  for (const ajouter of champs) {
    const contrat = BASES_15.base();
    delete contrat.pieces;
    delete contrat.props;
    delete contrat.variants[0].pieces;
    delete contrat.viewStructures.h.children[0].piece;
    contrat.meta.contractVersion = CONTRACT_VERSION;
    assert.equal(valider(contrat), true, JSON.stringify(valider.errors));
    ajouter(contrat);
    assert.equal(valider(contrat), false, ajouter.toString());
  }
});
