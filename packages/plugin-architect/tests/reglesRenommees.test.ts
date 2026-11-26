/** D13 et D23 : une règle renommée donne un seul C45, et le moteur ne répète ni elle ni l'absence de l'instance de règles. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import type { Constat } from '@ucm-kit/core/controles';
import { sorteDuPointDeRegles } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import { mergePropDescriptions } from 'ucm-plugin-socle/src/composant/contract/mergePropDescriptions';
import { cibleCompacte, modeleDeRegles, reglesManquantes } from 'ucm-plugin-socle/src/composant/template/modele';
import type { ContratLu } from 'ucm-plugin-socle/src/composant/template/modele';

import { sansLesDoublonsDuMoteur } from '../src/constatsDuMoteur';
import { constatsDeRegles, proprietesDuModele } from '../src/regles';
import type { ReleveDesRegles } from '../src/regles';
import { TEXTES } from '../src/ui/textes';
import { carteDAFaire } from '../src/ui/ignores/modele';

const contratDe = (valeurs: string[]): ContratLu => ({ props: { type: { type: 'enum', values: valeurs, default: valeurs[0] } } }) as unknown as ContratLu;

/** Le relevé d'Alert : l'instance de règles écrit `severity.<valeur>` pour chaque valeur écrite, et le composant appelle l'axe `Type`. */
function releveDAlert(valeursDuComposant: string[], valeursEcrites: string[]): ReleveDesRegles {
  const modele = modeleDeRegles('Alert', contratDe(valeursDuComposant));
  const ecrites = valeursEcrites.map((valeur) => `severity.${valeur}`);
  return {
    composant: { id: '1:2', nom: 'Alert' },
    instancePresente: true,
    modele,
    proprietes: proprietesDuModele(modele),
    publiees: ['type'],
    documentees: ['severity'],
    presentes: ecrites.map(cibleCompacte),
    manquantes: reglesManquantes(modele, new Set(ecrites.map(cibleCompacte))),
    valeursEcrites: ecrites,
  };
}

const resume = (constats: readonly Constat[]): string[][] => constats.map((c) => [c.code, String(c.faits.ecart), String(c.faits.propriete ?? ''), String(c.faits.regle ?? '')]);

const moteur = (titre: string): Constat => ({
  id: `moteur:C44:${titre.length}`, code: 'C44', type: 'corriger', famille: 'regles', variants: [], layers: [], faits: { titre, impact: 'i', action: 'a', geste: 'regles' },
});
/**
 * Les phrases des deux points du moteur que ce fichier reconnaît viennent de leur source, jamais d'une copie : une reformulation dans
 * `mergePropDescriptions.ts` ou `analyse/resultat.ts` change ces titres, et les tests qui suivent échouent avec elle.
 */
const phrasesDeProp: string[] = [];
mergePropDescriptions({}, null, { severity: { info: 'Une information.' } }, phrasesDeProp);
const titreDeProp = phrasesDeProp[0];
const sourceDeResultat = readFileSync(join(__dirname, '../../plugin-socle/src/composant/analyse/resultat.ts'), 'utf8');
const manqueDeUsage = /pousserSansNode\(warnings, 'Règles d’usage', \{[^}]*?manque: '([^']+)'/.exec(sourceDeResultat)?.[1];
const titreDeUsage = `Règles d’usage : ${manqueDeUsage}`;
const C44_SEVERITY = moteur(titreDeProp);
const C44_USAGE = moteur(titreDeUsage);

test('les titres lus à la source sont ceux que le moteur écrit, et le lecteur de sortes les reconnaît', () => {
  assert.equal(phrasesDeProp.length, 1);
  assert.match(titreDeProp, /^Règle @prop « severity » : /);
  assert.ok(manqueDeUsage, 'la phrase de l’instruction absente se lit dans resultat.ts');
  assert.equal(sorteDuPointDeRegles(titreDeProp), 'prop-sans-propriete');
  assert.equal(sorteDuPointDeRegles(titreDeUsage), 'usage-absent');
});

test('D13 : Alert, `severity` décrit les valeurs de `Type` : un seul C45 renommee, aucun C44 de la même règle', () => {
  const valeurs = ['info', 'success', 'warning', 'error'];
  const constats = constatsDeRegles(releveDAlert(valeurs, valeurs));
  assert.deepEqual(resume(constats), [['C45', 'renommee', 'type', 'severity']]);
  assert.equal(constats[0].faits.composant, 'Alert');
  assert.equal(constats[0].correction, undefined);
  const gardes = sansLesDoublonsDuMoteur([...constats, C44_SEVERITY]);
  assert.deepEqual(gardes.map((c) => c.code), ['C45']);
});

test('D13 : des valeurs différentes gardent les deux C45 d’avant, et le C44 du moteur', () => {
  const constats = constatsDeRegles(releveDAlert(['info', 'success', 'warning', 'error'], ['info', 'success']));
  assert.deepEqual(resume(constats).map(([code, ecart]) => [code, ecart]), [['C45', 'sans-regle'], ['C45', 'sans-propriete']]);
  assert.equal(sansLesDoublonsDuMoteur([...constats, C44_SEVERITY]).filter((c) => c.code === 'C44').length, 0, 'C45 sans-propriete dit déjà cette règle');
});

test('D13 : `error` et `danger` comptent comme la même valeur', () => {
  const constats = constatsDeRegles(releveDAlert(['info', 'success', 'warning', 'danger'], ['info', 'success', 'warning', 'error']));
  assert.deepEqual(resume(constats), [['C45', 'renommee', 'type', 'severity']]);
});

test('D13 : la forme reconnue ignore la casse et la ponctuation des valeurs', () => {
  const constats = constatsDeRegles(releveDAlert(['Info', 'Success'], ['info', 'success']));
  assert.deepEqual(resume(constats), [['C45', 'renommee', 'type', 'severity']]);
});

test('D13 : un C44 sur une règle que aucun C45 ne nomme reste', () => {
  assert.deepEqual(sansLesDoublonsDuMoteur([C44_SEVERITY]).map((c) => c.code), ['C44']);
});

test('D23 : sans instance de règles, C43 seul : le C44 de l’usage absent se tait', () => {
  const c43: Constat = { id: 'regles:C43', code: 'C43', type: 'corriger', famille: 'regles', variants: [], layers: [], faits: { composant: 'Progress' } };
  assert.deepEqual(sansLesDoublonsDuMoteur([c43, C44_USAGE]).map((c) => c.code), ['C43']);
  assert.deepEqual(sansLesDoublonsDuMoteur([C44_USAGE]).map((c) => c.code), ['C44'], 'sans C43, le point du moteur reste');
});

test('D13 : la carte dit la phrase de la note et son statut', () => {
  const [constat] = constatsDeRegles(releveDAlert(['info'], ['info']));
  const carte = carteDAFaire(constat, { composant: 'Alert', variants: [], layers: new Map() });
  assert.equal(carte.phrase, 'Les règles décrivent `severity`, et le composant appelle cette propriété `type`.');
  assert.equal(carte.statut, 'Renommez la propriété du composant ou la règle');
  assert.equal(TEXTES.aFaireDuComposant.reglesRenommeesStatut, carte.statut);
});
