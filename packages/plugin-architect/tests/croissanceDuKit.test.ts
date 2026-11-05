/**
 * D3.3 : `controlerLesAliasesManquants` indexe la voisine d'un alias manquant. La référence ci-dessous est l'ancienne recherche, qui
 * parcourt tout le catalogue pour chaque alias : les constats complets, leur ordre compris, doivent lui être égaux sur des catalogues
 * fabriqués et sur le rejeu des fichiers réels présents. Le nombre de lectures des variables, et non leur durée, montre la croissance :
 * il croît comme la taille pour l'index et comme son carré pour la référence. Aucun seuil de temps.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { cheminDansLaCollection, controlerLesAliasesManquants, type CatalogueDeReference, type Constat, type VariableDuCatalogue } from '@ucm-kit/core/controles';
import { formeDuChemin, formeReconnue } from '@ucm-kit/core/referentiel';

import { variableDuThemeReconnue } from '../../kit/src/referentiel/theme';
import { catalogueDepuisTokens } from '../../kit/tests/stress/rejeu-fichiers/dtcg';
import { compterLesLectures, fabriquerUnCatalogue, type FormeDeCatalogue } from './aides/cataloguesDeCroissance';

const racine = join(__dirname, '..', '..', '..');
const SOURCES_DU_REJEU = [
  join(racine, 'docs/notes/Archives/Plugin Architect/1 Architecture globale/Mesures/tokens-slice-exemple.json'),
  join(racine, '..', 'intencial-library/src/tokens/tokens.json'),
];

const parCle = (catalogue: CatalogueDeReference, cle: string): VariableDuCatalogue | undefined => catalogue.variables.find((entree) => entree.cle === cle);
const collectionDe = (catalogue: CatalogueDeReference, cleOuNom: string) => catalogue.collections.find((collection) => collection.cle === cleOuNom || collection.nom === cleOuNom);

/** Le même rôle dans une autre palette : le prédicat que le kit applique aux candidats de la voisine. */
function memeRoleAilleurs(catalogue: CatalogueDeReference, variable: VariableDuCatalogue, voisine: VariableDuCatalogue): boolean {
  const role = catalogue.collections.find((collection) => collection.cle === variable.collection)?.role;
  if (role === 'theme') {
    const reconnu = variableDuThemeReconnue(variable.nom);
    if (!reconnu || variableDuThemeReconnue(voisine.nom) !== reconnu) return false;
    const prefixe = (v: VariableDuCatalogue) => { const chemin = cheminDansLaCollection(v, catalogue); return formeDuChemin(chemin.slice(0, chemin.length - reconnu.split('/').length)); };
    return prefixe(variable) !== prefixe(voisine);
  }
  if (role !== 'brands' && role !== 'utility') return false;
  const chemin = cheminDansLaCollection(variable, catalogue);
  const autre = cheminDansLaCollection(voisine, catalogue);
  return chemin.length > 1 && chemin.length === autre.length && formeDuChemin(chemin.slice(1)) === formeDuChemin(autre.slice(1)) && formeReconnue(chemin[0]!) !== formeReconnue(autre[0]!);
}

/** L'ancienne recherche : chaque alias manquant parcourt tout le catalogue pour trouver sa voisine. */
function aliasManquantsDeReference(catalogue: CatalogueDeReference): Constat[] {
  const resultat: Constat[] = [];
  const dernier = (nom: string) => nom.split('/').at(-1);
  for (const variable of catalogue.variables.filter((entree) => entree.etat === 'presente')) {
    const collection = collectionDe(catalogue, variable.collection);
    if (!collection) continue;
    for (const mode of collection.modes) {
      const valeur = variable.valeurs?.[mode.id];
      if (!valeur || !('alias' in valeur)) continue;
      if (parCle(catalogue, valeur.alias)) continue;
      const voisine = catalogue.variables.find((entree) => entree.cle !== variable.cle && entree.collection === variable.collection
        && dernier(entree.nom) === dernier(variable.nom)
        && memeRoleAilleurs(catalogue, variable, entree)
        && entree.valeurs?.[mode.id] && 'alias' in entree.valeurs[mode.id]
        && parCle(catalogue, (entree.valeurs![mode.id] as { alias: string }).alias));
      const cibleVoisine = voisine && 'alias' in voisine.valeurs![mode.id] ? parCle(catalogue, (voisine.valeurs![mode.id] as { alias: string }).alias) : undefined;
      resultat.push({
        id: `C63:${variable.cle}:${mode.id}:alias-supprime`, code: 'C63', type: 'verifier', famille: 'liaisons', variants: [], layers: [],
        faits: {
          variable: variable.nom, cle: variable.cle, mode: mode.nom,
          ...(voisine && cibleVoisine ? { voisine: voisine.nom, cibleDeLaVoisine: cibleVoisine.nom } : {}),
          genre: 'alias-supprime',
        },
      });
    }
  }
  return resultat;
}

const FORMES: readonly FormeDeCatalogue[] = [
  { palettes: 3, crans: 6, partManquante: 0.3 },
  { palettes: 6, crans: 12, partManquante: 0.25 },
  { palettes: 2, crans: 30, partManquante: 0.6 },
  { palettes: 8, crans: 4, partManquante: 0.1 },
];

test('l’index des voisines rend les constats de l’ancienne recherche, objets complets et ordre compris, sur 80 catalogues fabriqués', () => {
  let avecVoisine = 0;
  let total = 0;
  for (let graine = 1; graine <= 80; graine++) {
    const catalogue = fabriquerUnCatalogue(graine, FORMES[graine % FORMES.length]!);
    const attendu = aliasManquantsDeReference(catalogue);
    assert.deepEqual(controlerLesAliasesManquants(catalogue), attendu, `graine ${graine}`);
    total += attendu.length;
    avecVoisine += attendu.filter((constat) => constat.faits.voisine !== undefined).length;
  }
  assert.ok(total > 2000, `les catalogues posent des alias manquants (${total})`);
  assert.ok(avecVoisine > 200 && avecVoisine < total, `et des voisines trouvées sans l’être toujours (${avecVoisine} sur ${total})`);
});

test('le rejeu des fichiers réels présents donne les constats de l’ancienne recherche', (contexte) => {
  const presentes = SOURCES_DU_REJEU.filter((chemin) => existsSync(chemin));
  if (presentes.length === 0) { contexte.skip('aucune source du rejeu'); return; }
  for (const chemin of presentes) {
    const { catalogue } = catalogueDepuisTokens(JSON.parse(readFileSync(chemin, 'utf8')));
    assert.deepEqual(controlerLesAliasesManquants(catalogue), aliasManquantsDeReference(catalogue));
  }
});

/** Les lectures de variables que `controle` fait sur un catalogue fabriqué de la forme donnée. */
function lecturesDe(forme: FormeDeCatalogue, controle: (catalogue: CatalogueDeReference) => Constat[]): { variables: number; manquants: number; lectures: number } {
  const suivi = compterLesLectures(fabriquerUnCatalogue(7, forme));
  const constats = controle(suivi.catalogue);
  return { variables: suivi.catalogue.variables.length, manquants: constats.length, lectures: suivi.lectures() };
}

test('les lectures de variables croissent linéairement avec le catalogue pour l’index et quadratiquement pour l’ancienne recherche', () => {
  const crans = [40, 120, 360];
  const mesures = crans.map((n) => {
    const forme = { palettes: 6, crans: n, partManquante: 0.3 };
    return { index: lecturesDe(forme, controlerLesAliasesManquants), reference: lecturesDe(forme, aliasManquantsDeReference) };
  });
  for (let i = 1; i < mesures.length; i++) {
    const avant = mesures[i - 1]!;
    const apres = mesures[i]!;
    const tailleX = apres.index.variables / avant.index.variables;
    assert.ok(tailleX > 2.5 && tailleX < 3.5, `la taille triple (${tailleX.toFixed(2)})`);
    assert.equal(apres.index.manquants, apres.reference.manquants, 'même nombre de constats');
    // L'exposant d'une croissance en puissance : 1 pour une croissance linéaire, 2 pour une croissance quadratique.
    const exposant = (lectures: number, precedentes: number): number => Math.log(lectures / precedentes) / Math.log(tailleX);
    const index = exposant(apres.index.lectures, avant.index.lectures);
    const reference = exposant(apres.reference.lectures, avant.reference.lectures);
    assert.ok(index < 1.2, `index : exposant ${index.toFixed(2)} pour une taille ×${tailleX.toFixed(2)}`);
    assert.ok(reference > 1.5, `référence : exposant ${reference.toFixed(2)} pour une taille ×${tailleX.toFixed(2)}`);
  }
  const derniere = mesures.at(-1)!;
  assert.ok(derniere.index.lectures * 10 < derniere.reference.lectures, `à ${derniere.index.variables} variables : ${derniere.index.lectures} lectures contre ${derniere.reference.lectures}`);
  console.log('lectures de variables, index puis référence :', mesures.map((m) => `${m.index.variables} variables, ${m.index.manquants} constats : ${m.index.lectures} contre ${m.reference.lectures}`).join(' ; '));
});
