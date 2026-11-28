/**
 * L'échantillon fixe du générateur de composants (lot L17, D25) : une graine, 52 cas, soit 13 composants fabriqués et leurs quatre
 * familles d'attentes (juste, défaut injecté, transformation neutre, abstention). Chaque cas passe par l'analyse complète d'Architect
 * et se compare à la carte que le générateur a écrite avant elle. Un écart fait échouer le test, avec le composant réduit dans le message.
 * Le grand tirage (`npm run stress:composant -- --graine <n> --nombre <n>`) cherche plus loin et reste hors de `npm test`.
 *
 * Un écart que le produit ne corrige pas encore n'a pas sa place ici : le tirage évite la construction qui le provoque, avec la
 * raison en commentaire dans `generateur/generateur.ts` (fond d'un frère d'ancêtre, nom « Icon » d'un composant) et dans
 * `generateur/operateurs.ts` (ordre de deux fills liés à deux variables, G8 du plan).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { analyserDocument } from './generateur/analyserDocument';
import { lireLesDialectes } from '../../plugin-socle/tests/generateur/dialectes';
import { attendusDeStructure, generer, tirerSpec } from '../../plugin-socle/tests/generateur/generateur';
import { comparerConstats, verifierDocument } from '../../plugin-socle/tests/generateur/oracle';
import { memeEcart } from '../../plugin-socle/tests/generateur/reduction';
import { FAMILLES, decrireLesEcarts, tirer } from '../../plugin-socle/tests/generateur/tirage';
import type { Attendu, DocumentGenere } from '../../plugin-socle/tests/generateur/types';

const GRAINE_DE_L_ECHANTILLON = 1126;
const NOMBRE_DE_CAS = 52;

test('l’échantillon fixe ne rend aucun écart à l’oracle', async () => {
  const resultat = await tirer({ graine: GRAINE_DE_L_ECHANTILLON, nombre: NOMBRE_DE_CAS, reduire: true, analyser: analyserDocument });
  assert.deepEqual(decrireLesEcarts(resultat), [], `graine ${GRAINE_DE_L_ECHANTILLON}`);
  for (const famille of FAMILLES) {
    assert.equal(resultat.familles[famille].tirages, NOMBRE_DE_CAS / 4, famille);
    assert.equal(resultat.familles[famille].conformes, NOMBRE_DE_CAS / 4, famille);
  }
  // Sans cela, un échantillon qui n'exerce ni un wrapper, ni un dialecte, ni un arrêt prévu passerait sans rien prouver.
  assert.ok((resultat.couverture.attentes['C83 verifier'] ?? 0) > 0, 'C83 est exercé');
  assert.ok((resultat.couverture.statuts.arretee ?? 0) > 0 && (resultat.couverture.statuts.partielle ?? 0) > 0, 'une analyse arrêtée et une analyse partielle sont prévues');
  const dialectes = Object.keys(resultat.couverture.dialectes).filter((nom) => nom !== 'ucm' && nom !== 'francais');
  assert.ok(dialectes.length >= 3, `trois dialectes au moins, ${dialectes.join(', ')}`);
  assert.ok(resultat.dureeMs < 30_000, `moins de 30 s, ${resultat.dureeMs} ms`);
});

test('le tirage prend les noms et les valeurs d’un axe dans le même dialecte publié', () => {
  const entrees = lireLesDialectes();
  let verifies = 0;
  for (let rang = 0; rang < 300; rang++) {
    const spec = tirerSpec(1000 + rang, rang);
    for (const [nom, valeur] of Object.entries((spec.valeursPubliees ?? {}) as Record<string, string>)) {
      const entree = entrees.find((e) => (spec.dialecte === 'francais' || e.systeme === spec.dialecte) && e.verifie && e.proprietes.some((p) => p.verifie && p.nom === nom && p.valeurs.includes(valeur)));
      assert.ok(entree, `${nom}=${valeur} n'est pas publié par ${spec.dialecte}`);
      const dansLHote = spec.axes.some((axe) => axe.nom === nom && axe.valeurs.includes(valeur));
      const dansLeWrapper = spec.wrapperTaille?.nom === nom && spec.wrapperTaille.valeur === valeur;
      assert.ok(dansLHote || dansLeWrapper, `${nom}=${valeur} est un axe de l'hôte ou de son wrapper`);
      verifies += 1;
    }
  }
  assert.ok(verifies > 150, `${verifies} axes vérifiés`);
});

test('chaque entrée de dialecte porte sa source et sa date de lecture, et une entrée non vérifiée ne fournit aucune valeur', () => {
  for (const entree of lireLesDialectes() as readonly (ReturnType<typeof lireLesDialectes>[number] & { source?: string; luLe?: string })[]) {
    assert.match(entree.source ?? '', /^https:\/\//, `${entree.systeme}/${entree.composant}`);
    assert.match(entree.luLe ?? '', /^\d{4}-\d{2}-\d{2}$/, `${entree.systeme}/${entree.composant}`);
    if (!entree.verifie) assert.deepEqual(entree.proprietes, [], `${entree.systeme}/${entree.composant} non vérifié ne fournit aucune valeur`);
  }
});

function documentAvecWrapper(options: { expose: boolean; axeCommun: boolean }): DocumentGenere {
  const spec = tirerSpec(4242, 1);
  spec.nom = 'Compose';
  spec.anatomie = ['texte'];
  spec.construction = [options.expose ? 'wrapper-expose' : 'wrapper-cache'];
  spec.variantes = 1;
  spec.profondeur = 1;
  spec.axes = spec.axes.filter((axe) => axe.role !== 'taille');
  if (options.axeCommun) spec.axes.push({ nom: 'Size', role: 'taille', valeurs: ['Medium'] });
  spec.wrapperTaille = { nom: 'Size', valeur: 'Medium', commun: options.axeCommun };
  return generer(4242, spec);
}

test('un wrapper non exposé qui porte un axe absent de l’hôte donne C83, et le tirage l’attend avant l’analyse', async () => {
  const doc = documentAvecWrapper({ expose: false, axeCommun: false });
  assert.deepEqual(verifierDocument(doc), []);
  const attendus = doc.oracle.attendus.filter((a) => a.code === 'C83');
  assert.equal(attendus.length, 1);
  assert.equal(attendus[0].faits?.proprietes, 'Size');
  const resultat = await analyserDocument(doc);
  assert.ok(resultat.constats.some((c) => c.code === 'C83'), 'le produit rend C83');
  assert.equal(comparerConstats(doc, resultat.constats).conformes, true);
});

test('un wrapper exposé, ou dont l’hôte porte déjà l’axe, ne donne pas C83', async () => {
  for (const options of [{ expose: true, axeCommun: false }, { expose: false, axeCommun: true }]) {
    const doc = documentAvecWrapper(options);
    assert.deepEqual(doc.oracle.attendus.filter((a) => a.code === 'C83'), [], JSON.stringify(options));
    const resultat = await analyserDocument(doc);
    assert.deepEqual(resultat.constats.filter((c) => c.code === 'C83'), [], JSON.stringify(options));
    assert.equal(comparerConstats(doc, resultat.constats).conformes, true, JSON.stringify(options));
  }
});

test('les attentes de structure se déduisent du document seul', () => {
  const doc = documentAvecWrapper({ expose: false, axeCommun: false });
  assert.deepEqual(attendusDeStructure(doc).map((a: Attendu) => a.code), ['C83']);
});

const constat = (code: string, layers: string[], faits: Record<string, unknown>, candidats: string[] = []) =>
  ({ code, type: 'corriger', layers, variants: [], faits, question: { candidats: candidats.map((cle) => ({ cle })) } });

test('la comparaison de réduction distingue le calque, l’indice, la plage et la clé de candidat', () => {
  const temoin = constat('C25', ['a'], { champ: 'fills', indice: 0 }, ['k1']);
  assert.equal(memeEcart(constat('C25', ['a'], { champ: 'fills', indice: 0 }, ['k1']), temoin), true);
  assert.equal(memeEcart(constat('C25', ['b'], { champ: 'fills', indice: 0 }, ['k1']), temoin), false, 'un autre calque de même code');
  assert.equal(memeEcart(constat('C25', ['a'], { champ: 'fills', indice: 1 }, ['k1']), temoin), false, 'un autre indice de peinture');
  assert.equal(memeEcart(constat('C25', ['a'], { champ: 'fills', indice: 0 }, ['k2']), temoin), false, 'un candidat de même nom, d’une autre clé');
  assert.equal(memeEcart(constat('C49', ['a'], { champ: 'fills', plageDebut: 0, plageFin: 4 }), constat('C49', ['a'], { champ: 'fills', plageDebut: 0, plageFin: 7 })), false, 'une autre plage');
  assert.equal(memeEcart(constat('C25', [], { champ: 'fills', indice: 0 }, ['k1']), temoin), false, 'le calque visé a disparu');
});

test('la comparaison à l’oracle exige l’indice, les candidats et la cible complète d’une attente', () => {
  const doc = documentAvecWrapper({ expose: true, axeCommun: false });
  const base = { code: 'C25', type: 'corriger', cibles: ['v'], faits: { champ: 'fills', indice: 0 } };
  const lu = constat('C25', ['v'], { champ: 'fills', indice: 0 }, ['k1']);
  const juge = (attente: Attendu) => comparerConstats({ ...doc, oracle: { ...doc.oracle, attendus: [attente], infos: [] } }, [lu]);
  assert.equal(juge({ ...base, candidats: ['k1'] }).conformes, true);
  assert.equal(juge({ ...base, candidats: ['k2'] }).conformes, false, 'une autre clé de candidat');
  assert.equal(juge({ ...base, faits: { champ: 'fills', indice: 1 } }).conformes, false, 'un autre indice');
  assert.equal(juge({ ...base, cibles: ['v', 'autre'] }).conformes, false, 'une cible de plus');
});
