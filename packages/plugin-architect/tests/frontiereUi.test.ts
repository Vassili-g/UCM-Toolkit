/** La frontière de l'écran : numérotation, calculs un à un, lectures sur la génération courante. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Bilan, DemandeArchitect, PluginMessage } from '../src/messages';
import { creerFrontiere, type MessageAAfficher } from '../src/ui/frontiere';

const ECRITURE = { convention: { casse: 'minuscules', separateur: 'tiret' }, suivent: 1, total: 1, exemple: null } as const;
const bilan = (generation: number): Bilan => ({
  generation, premierLancement: false, sansVariableLocale: false,
  ecriture: { groupes: ECRITURE, variables: ECRITURE, collections: { reconnues: 0, total: 0 } },
  groupes: [], bloques: [], proteges: 0, questions: [], autresPistes: 0, plusTard: [], collections: [], dernierRenommage: null,
});
const GESTE = { type: 'supprimer', terme: 'bg' } as const;
const SELECTION = { groupes: ['g'], exclus: [], inclus: [] };

function creer() {
  const envoyees: DemandeArchitect[] = [];
  const affichees: MessageAAfficher[] = [];
  const frontiere = creerFrontiere({ envoyer: (demande) => envoyees.push(demande), afficher: (message) => affichees.push(message) });
  /** Analyse le fichier jusqu'au bilan de la génération donnée. */
  function analyser(generation: number): void {
    const demande = frontiere.analyser();
    frontiere.recevoir({ type: 'bilan', demande, bilan: bilan(generation) });
  }
  const types = () => affichees.map((message) => message.type);
  return { frontiere, envoyees, affichees, analyser, types };
}

test('les demandes sont numérotées dans l’ordre, de 1 en 1', () => {
  const { frontiere, envoyees, analyser } = creer();
  analyser(1);
  const lignes = frontiere.lignes('g', 0);
  const export1 = frontiere.exporter();
  assert.deepEqual([envoyees[0].demande, lignes, export1], [1, 2, 3]);
});

test('analyser prévient l’écran avant d’envoyer sa demande', () => {
  const { frontiere, envoyees, types } = creer();
  frontiere.analyser();
  assert.deepEqual(types(), ['analyse-demandee']);
  assert.deepEqual(envoyees, [{ type: 'analyser', demande: 1 }]);
});

test('un seul calcul est en vol : le suivant attend la réponse du premier, puis part', () => {
  const { frontiere, envoyees, analyser } = creer();
  analyser(1);
  const regle = frontiere.regle(GESTE);
  const reponse = frontiere.repondre('q', { type: 'distincts' });
  assert.deepEqual(envoyees.map((demande) => demande.type), ['analyser', 'regle']);
  assert.equal(frontiere.calculEnCours(), true);
  frontiere.recevoir({ type: 'bilan', demande: regle, bilan: bilan(2) });
  assert.deepEqual(envoyees.map((demande) => demande.type), ['analyser', 'regle', 'repondre']);
  frontiere.recevoir({ type: 'bilan', demande: reponse, bilan: bilan(3) });
  assert.equal(frontiere.calculEnCours(), false);
});

test('seule la dernière demande de configuration en attente est envoyée, les réponses toutes', () => {
  const { frontiere, envoyees, analyser } = creer();
  analyser(1);
  const regle = frontiere.regle(GESTE);
  frontiere.configurer(['a']);
  const premiere = frontiere.repondre('q1', { type: 'plus-tard' });
  frontiere.configurer(['a', 'b']);
  const seconde = frontiere.repondre('q2', { type: 'plus-tard' });
  const finir = (demande: number, generation: number) => frontiere.recevoir({ type: 'bilan', demande, bilan: bilan(generation) });
  finir(regle, 2);
  finir(premiere, 3);
  finir(5, 4);
  finir(seconde, 5);
  assert.deepEqual(envoyees.slice(2).map((demande) => demande.type), ['repondre', 'configurer', 'repondre']);
  assert.deepEqual(envoyees[3], { type: 'configurer', demande: 5, collectionsExclues: ['a', 'b'] });
  assert.equal(frontiere.calculEnCours(), false);
});

test('une lecture part pendant un calcul, sur la génération courante, et sa réponse est rendue', () => {
  const { frontiere, envoyees, affichees, analyser } = creer();
  analyser(4);
  const regle = frontiere.regle(GESTE);
  const lignes = frontiere.lignes('g', 50);
  assert.deepEqual(envoyees[envoyees.length - 1], { type: 'lignes', demande: lignes, generation: 4, groupe: 'g', debut: 50 });
  assert.equal(frontiere.calculEnCours(), true);
  const reponse: PluginMessage = { type: 'lignes', demande: lignes as number, generation: 4, groupe: 'g', debut: 50, lignes: [], total: 0 };
  frontiere.recevoir(reponse);
  assert.equal(affichees[affichees.length - 1], reponse);
  assert.equal(frontiere.calculEnCours(), true, 'la lecture n’a pas mis fin au calcul');
  assert.equal(regle, 2);
});

test('les quatre lectures portent la génération du dernier bilan', () => {
  const { frontiere, envoyees, analyser } = creer();
  analyser(7);
  frontiere.lignes('g', 0);
  frontiere.termes('bg', 'tous', 0);
  frontiere.fiche('bg');
  frontiere.simuler(GESTE);
  const lectures = envoyees.slice(1);
  assert.deepEqual(lectures.map((demande) => demande.type), ['lignes', 'termes', 'fiche', 'simuler']);
  assert.deepEqual(lectures.map((demande) => ('generation' in demande ? demande.generation : null)), [7, 7, 7, 7]);
});

test('sans bilan, une lecture ou appliquer ne part pas', () => {
  const { frontiere, envoyees } = creer();
  assert.equal(frontiere.lignes('g', 0), null);
  assert.equal(frontiere.termes('', 'tous', 0), null);
  assert.equal(frontiere.fiche('bg'), null);
  assert.equal(frontiere.simuler(GESTE), null);
  assert.equal(frontiere.appliquer(SELECTION), null);
  assert.deepEqual(envoyees, []);
});

test('une réponse dont la génération est périmée est ignorée', () => {
  const { frontiere, affichees, analyser } = creer();
  analyser(2);
  const demande = frontiere.fiche('bg') as number;
  const base = { type: 'fiche' as const, demande };
  const fiche = { mot: 'bg', origine: null, categorieUcm: null, definition: null, remplace: [], emploi: { nombre: 0, exemples: [] }, ecart: false, voulu: false, distincts: [], question: null };
  const avant = affichees.length;
  frontiere.recevoir({ ...base, generation: 1, fiche });
  assert.equal(affichees.length, avant, 'une génération plus ancienne est ignorée');
  frontiere.recevoir({ ...base, generation: 3, fiche });
  assert.equal(affichees.length, avant, 'une génération inconnue est ignorée');
  frontiere.recevoir({ ...base, generation: 2, fiche });
  assert.equal(affichees.length, avant + 1);
});

test('un nouveau bilan rend caduques les lectures en attente, même leur erreur', () => {
  const { frontiere, affichees, analyser } = creer();
  analyser(1);
  const lignes = frontiere.lignes('g', 0) as number;
  const termes = frontiere.termes('', 'tous', 0) as number;
  const calcul = frontiere.regle(GESTE);
  frontiere.recevoir({ type: 'bilan', demande: calcul, bilan: bilan(2) });
  const avant = affichees.length;
  frontiere.recevoir({ type: 'lignes', demande: lignes, generation: 1, groupe: 'g', debut: 0, lignes: [], total: 0 });
  frontiere.recevoir({ type: 'erreur', demande: termes, code: 'generation-perimee' });
  assert.equal(affichees.length, avant);
});

test("l'écho d'une demande de lecture est ignoré, puis la vraie réponse est affichée", () => {
  const ficheVide = { mot: 'bg', origine: null, categorieUcm: null, definition: null, remplace: [], emploi: { nombre: 0, exemples: [] }, ecart: false, voulu: false, distincts: [], question: null };
  const formes: Array<{ ouvrir: (f: ReturnType<typeof creer>['frontiere']) => number; echo: (demande: number) => unknown; reponse: (demande: number) => PluginMessage }> = [
    {
      ouvrir: (f) => f.termes('', 'tous', 0) as number,
      echo: (demande) => ({ type: 'termes', demande, generation: 1, debut: 0, requete: '' }),
      reponse: (demande) => ({ type: 'termes', demande, generation: 1, debut: 0, termes: [], total: 0, comptes: { tous: 0, avecRegle: 0, sansRegle: 0 } }),
    },
    {
      ouvrir: (f) => f.fiche('bg') as number,
      echo: (demande) => ({ type: 'fiche', demande, generation: 1, mot: 'bg' }),
      reponse: (demande) => ({ type: 'fiche', demande, generation: 1, fiche: ficheVide }),
    },
    {
      ouvrir: (f) => f.lignes('g', 0) as number,
      echo: (demande) => ({ type: 'lignes', demande, generation: 1, groupe: 'g', debut: 0 }),
      reponse: (demande) => ({ type: 'lignes', demande, generation: 1, groupe: 'g', debut: 0, lignes: [], total: 0 }),
    },
  ];
  for (const forme of formes) {
    const { frontiere, affichees, analyser } = creer();
    analyser(1);
    const demande = forme.ouvrir(frontiere);
    const avant = affichees.length;
    frontiere.recevoir(forme.echo(demande) as PluginMessage);
    assert.equal(affichees.length, avant, "l'écho est ignoré");
    const reponse = forme.reponse(demande);
    frontiere.recevoir(reponse);
    assert.equal(affichees.length, avant + 1, 'la vraie réponse est affichée');
    assert.equal(affichees[affichees.length - 1], reponse);
  }
});

test('un bilan qui garde la même génération ne rend pas les lectures caduques', () => {
  const { frontiere, affichees, analyser } = creer();
  analyser(1);
  const lignes = frontiere.lignes('g', 0) as number;
  const calcul = frontiere.regle(GESTE);
  frontiere.recevoir({ type: 'bilan', demande: calcul, bilan: bilan(1) });
  const avant = affichees.length;
  frontiere.recevoir({ type: 'lignes', demande: lignes, generation: 1, groupe: 'g', debut: 0, lignes: [], total: 0 });
  assert.equal(affichees.length, avant + 1);
});

test('une lecture plus récente de même clé rend l’ancienne caduque, une autre clé non', () => {
  const { frontiere, affichees, analyser } = creer();
  analyser(1);
  const premiere = frontiere.termes('b', 'tous', 0) as number;
  const seconde = frontiere.termes('bg', 'tous', 0) as number;
  const autre = frontiere.fiche('bg') as number;
  const termes = (demande: number): PluginMessage => ({ type: 'termes', demande, generation: 1, debut: 0, termes: [], total: 0, comptes: { tous: 0, avecRegle: 0, sansRegle: 0 } });
  const avant = affichees.length;
  frontiere.recevoir(termes(premiere));
  assert.equal(affichees.length, avant);
  frontiere.recevoir(termes(seconde));
  assert.equal(affichees.length, avant + 1);
  frontiere.recevoir({ type: 'erreur', demande: autre, code: 'echec' });
  assert.equal(affichees.length, avant + 2);
});

test('deux pages de lignes de groupes différents restent attendues ensemble', () => {
  const { frontiere, affichees, analyser } = creer();
  analyser(1);
  const a = frontiere.lignes('a', 0) as number;
  const b = frontiere.lignes('b', 0) as number;
  const avant = affichees.length;
  frontiere.recevoir({ type: 'lignes', demande: a, generation: 1, groupe: 'a', debut: 0, lignes: [], total: 0 });
  frontiere.recevoir({ type: 'lignes', demande: b, generation: 1, groupe: 'b', debut: 0, lignes: [], total: 0 });
  assert.equal(affichees.length, avant + 2);
});

test('une réponse à une demande ancienne ou inconnue est ignorée', () => {
  const { frontiere, affichees, envoyees } = creer();
  const demande = frontiere.analyser();
  frontiere.recevoir({ type: 'bilan', demande: demande + 5, bilan: bilan(1) });
  frontiere.recevoir({ type: 'lecture', demande: demande + 5, lues: 1, total: 2 });
  assert.equal(frontiere.generation(), null);
  assert.equal(frontiere.calculEnCours(), true);
  frontiere.recevoir({ type: 'bilan', demande, bilan: bilan(1) });
  assert.equal(frontiere.generation(), 1);
  // La même réponse reçue une seconde fois n'est plus attendue.
  const avant = affichees.length;
  frontiere.recevoir({ type: 'bilan', demande, bilan: bilan(9) });
  assert.equal(affichees.length, avant);
  assert.equal(frontiere.generation(), 1);
  assert.equal(envoyees.length, 1);
});

test('un bilan d’une génération plus ancienne que la courante est ignoré', () => {
  const { frontiere, analyser } = creer();
  analyser(5);
  const demande = frontiere.analyser();
  frontiere.recevoir({ type: 'bilan', demande, bilan: bilan(3) });
  assert.equal(frontiere.generation(), 5);
  assert.equal(frontiere.calculEnCours(), true);
});

test('lecture : l’avancement n’est rendu que pendant l’analyse demandée', () => {
  const { frontiere, affichees, types } = creer();
  frontiere.recevoir({ type: 'lecture', demande: 1, lues: 1, total: 2 });
  assert.deepEqual(types(), []);
  const demande = frontiere.analyser();
  frontiere.recevoir({ type: 'lecture', demande, lues: 512, total: 812 });
  assert.deepEqual(types(), ['analyse-demandee', 'lecture']);
  assert.equal(affichees.length, 2);
});

test('initial est toujours rendu', () => {
  const { frontiere, types } = creer();
  frontiere.recevoir({ type: 'initial', dejaAnalyse: true });
  assert.deepEqual(types(), ['initial']);
});

test('une application est rendue puis le calcul attend son bilan ; un refus le termine', () => {
  const { frontiere, envoyees, analyser, types } = creer();
  analyser(1);
  const appliquer = frontiere.appliquer(SELECTION) as number;
  const suivante = frontiere.annulerLeDernier();
  assert.deepEqual(envoyees[1], { type: 'appliquer', demande: appliquer, generation: 1, selection: SELECTION });
  frontiere.recevoir({ type: 'application', demande: appliquer, resultat: { sorte: 'application', statut: 'applique', renommes: 3, sautes: 0, annulable: true } });
  assert.equal(envoyees.length, 2, 'le calcul suivant attend le bilan');
  frontiere.recevoir({ type: 'bilan', demande: appliquer, bilan: bilan(2) });
  assert.equal(envoyees[2].demande, suivante);
  frontiere.recevoir({ type: 'application', demande: suivante, resultat: { sorte: 'annulation', statut: 'refuse', renommes: 0, sautes: 0, annulable: false } });
  assert.equal(frontiere.calculEnCours(), false);
  assert.deepEqual(types().slice(-3), ['application', 'bilan', 'application']);
});

test('appliquer garde la génération que l’écran affichait, même s’il part plus tard', () => {
  const { frontiere, envoyees, analyser } = creer();
  analyser(1);
  const regle = frontiere.regle(GESTE);
  frontiere.appliquer(SELECTION);
  frontiere.recevoir({ type: 'bilan', demande: regle, bilan: bilan(2) });
  assert.deepEqual(envoyees[2], { type: 'appliquer', demande: 3, generation: 1, selection: SELECTION });
});

test('un refus ou une erreur termine le calcul et laisse partir le suivant', () => {
  const { frontiere, envoyees, analyser, types } = creer();
  analyser(1);
  const regle = frontiere.regle(GESTE);
  const repondre = frontiere.repondre('q', { type: 'voulu' });
  frontiere.recevoir({ type: 'refus', demande: regle, conflits: [{ type: 'cycle', termes: ['a', 'b', 'a'] }] });
  assert.equal(envoyees[2].demande, repondre);
  frontiere.recevoir({ type: 'erreur', demande: repondre, code: 'echec' });
  assert.equal(frontiere.calculEnCours(), false);
  assert.deepEqual(types().slice(-2), ['refus', 'erreur']);
});

test('fichier-modifie est rendu même sans demande attendue, une autre erreur étrangère non', () => {
  const { frontiere, affichees, analyser } = creer();
  analyser(1);
  const avant = affichees.length;
  frontiere.recevoir({ type: 'erreur', demande: 99, code: 'echec' });
  assert.equal(affichees.length, avant);
  frontiere.recevoir({ type: 'erreur', demande: 99, code: 'fichier-modifie' });
  assert.equal(affichees.length, avant + 1);
  assert.equal(frontiere.calculEnCours(), false);
});

test('l’export ne retient aucun calcul et sa réponse n’est rendue qu’une fois', () => {
  const { frontiere, envoyees, affichees, analyser } = creer();
  analyser(1);
  const regle = frontiere.regle(GESTE);
  const exporter = frontiere.exporter();
  assert.equal(envoyees[envoyees.length - 1].type, 'exporter');
  assert.equal(frontiere.calculEnCours(), true);
  const reponse: PluginMessage = { type: 'regles-exportees', demande: exporter, texte: '{}' };
  const avant = affichees.length;
  frontiere.recevoir(reponse);
  frontiere.recevoir(reponse);
  assert.equal(affichees.length, avant + 1);
  assert.equal(regle, 2);
});
