/** Ce que l'écran montre, tiré des messages : écran, onglet, comptes et états particuliers. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Bilan, GroupeVue, QuestionVue } from '../src/messages';
import { ETAT_INITIAL, comptesDuBilan, etatSuivant, type EtatDeLEcran, type Evenement } from '../src/ui/etat';

const LIGNE = { convention: { casse: 'minuscules', separateur: 'tiret' }, suivent: 1, total: 1, exemple: null } as const;
const groupe = (cle: string, variables: number, collections = 0): GroupeVue => ({
  cle, regle: { sorte: 'collection' }, avant: 'a', apres: 'b', autres: 0, variables, collections, aussiDEcriture: 0, nouveau: false, apercu: [],
});
const question = (cle: string): QuestionVue => ({ type: 'collection', cle, nom: 'Couleurs', nombre: 3, proposee: null });
const bilan = (reste: Partial<Bilan> = {}): Bilan => ({
  generation: 1, premierLancement: false, sansVariableLocale: false,
  ecriture: { groupes: LIGNE, variables: LIGNE, collections: { reconnues: 0, total: 0 } },
  groupes: [groupe('g1', 10)], bloques: [], proteges: 0, questions: [], autresPistes: 0, plusTard: [], collections: [], dernierRenommage: null, dernierImport: null,
  ...reste,
});
const jouer = (...evenements: Evenement[]): EtatDeLEcran => evenements.reduce(etatSuivant, ETAT_INITIAL);
const recu = (reste?: Partial<Bilan>): Evenement => ({ type: 'bilan', demande: 1, bilan: bilan(reste) });

test('avant tout message, l’écran attend le premier lancement sur l’onglet Renommages', () => {
  assert.equal(ETAT_INITIAL.ecran, 'premier-lancement');
  assert.equal(ETAT_INITIAL.onglet, 'a-appliquer');
  assert.deepEqual(ETAT_INITIAL.comptes, { aAppliquer: 0, aTrancher: 0 });
  assert.equal(ETAT_INITIAL.particulier, null);
});

test('un fichier jamais analysé montre le premier lancement, un fichier analysé lance sa lecture', () => {
  assert.equal(jouer({ type: 'initial', dejaAnalyse: false }).ecran, 'premier-lancement');
  const lecture = jouer({ type: 'initial', dejaAnalyse: true });
  assert.equal(lecture.ecran, 'lecture');
  assert.deepEqual(lecture.particulier, { type: 'analyse-en-cours', lues: 0, total: 0 });
});

test('l’analyse demandée montre la lecture, puis l’avancement reçu', () => {
  const demandee = jouer({ type: 'initial', dejaAnalyse: false }, { type: 'analyse-demandee' });
  assert.equal(demandee.ecran, 'lecture');
  const avancee = etatSuivant(demandee, { type: 'lecture', demande: 1, lues: 512, total: 812 });
  assert.deepEqual(avancee.particulier, { type: 'analyse-en-cours', lues: 512, total: 812 });
  assert.deepEqual(avancee.analyse, { lues: 512, total: 812 });
});

test('le bilan met fin à l’analyse et montre les onglets avec leurs comptes', () => {
  const etat = jouer(
    { type: 'analyse-demandee' },
    recu({ groupes: [groupe('g1', 60), groupe('g2', 36, 1), groupe('g3', 0, 2)], questions: [question('q1'), question('q2')] }),
  );
  assert.equal(etat.ecran, 'travail');
  assert.equal(etat.analyse, null);
  assert.equal(etat.particulier, null);
  assert.deepEqual(etat.comptes, { aAppliquer: 99, aTrancher: 2 });
});

test('les comptes viennent du dernier bilan seulement ; les questions remises à plus tard ne comptent pas', () => {
  assert.deepEqual(comptesDuBilan(null), { aAppliquer: 0, aTrancher: 0 });
  const etat = jouer(recu({ groupes: [groupe('g1', 5)], questions: [question('q1')], plusTard: [question('q2'), question('q3')] }), recu({ groupes: [groupe('g1', 2)], questions: [] }));
  assert.deepEqual(etat.comptes, { aAppliquer: 2, aTrancher: 0 });
});

test('un bilan de premier lancement garde l’écran du premier lancement jusqu’au bilan suivant', () => {
  const premier = jouer(recu({ premierLancement: true }));
  assert.equal(premier.ecran, 'premier-lancement');
  assert.equal(premier.particulier, null);
  assert.equal(etatSuivant(premier, recu({ premierLancement: false })).ecran, 'travail');
});

test('rien à faire : ni groupe, ni nom bloqué, ni question, ni question remise à plus tard', () => {
  const vide = { groupes: [], bloques: [], questions: [], plusTard: [] };
  assert.deepEqual(jouer(recu(vide)).particulier, { type: 'rien-a-faire' });
  assert.equal(jouer(recu({ ...vide, bloques: [{ avant: 'Font Size', apres: 'font-size', collection: 'Typographie' }] })).particulier, null);
  assert.equal(jouer(recu({ ...vide, questions: [question('q1')] })).particulier, null);
  assert.equal(jouer(recu({ ...vide, plusTard: [question('q1')] })).particulier, null);
  assert.equal(jouer(recu({ ...vide, proteges: 143 })).particulier?.type, 'rien-a-faire');
});

test('un fichier sans variable locale montre cet état, même au premier lancement', () => {
  const etat = jouer(recu({ sansVariableLocale: true, premierLancement: true, groupes: [] }));
  assert.equal(etat.ecran, 'travail');
  assert.deepEqual(etat.particulier, { type: 'sans-variable-locale' });
});

test('fichier modifié : l’erreur le pose, le bilan suivant et une nouvelle analyse le retirent', () => {
  const travail = jouer(recu());
  const modifie = etatSuivant(travail, { type: 'erreur', demande: 4, code: 'fichier-modifie' });
  assert.equal(modifie.fichierModifie, true);
  assert.equal(modifie.ecran, 'travail');
  assert.equal(etatSuivant(modifie, recu()).fichierModifie, false);
  assert.equal(etatSuivant(modifie, { type: 'analyse-demandee' }).fichierModifie, false);
});

test('une autre erreur ne pose pas le fichier modifié', () => {
  const travail = jouer(recu());
  assert.equal(etatSuivant(travail, { type: 'erreur', demande: 4, code: 'echec' }), travail);
});

test('une erreur met fin à l’analyse en cours', () => {
  const lecture = jouer({ type: 'initial', dejaAnalyse: false }, { type: 'analyse-demandee' });
  const apres = etatSuivant(lecture, { type: 'erreur', demande: 1, code: 'echec' });
  assert.equal(apres.analyse, null);
  assert.equal(apres.ecran, 'premier-lancement');
  assert.equal(apres.fichierModifie, false);
});

test('la Configuration remplace l’écran et le retour rend l’écran de travail', () => {
  const travail = jouer(recu());
  const configuration = etatSuivant(travail, { type: 'configuration-ouverte' });
  assert.equal(configuration.ecran, 'configuration');
  assert.equal(configuration.ecranDeTravail, 'travail');
  assert.equal(etatSuivant(configuration, { type: 'configuration-fermee' }).ecran, 'travail');
});

test('un message reçu pendant la Configuration met à jour l’écran où le retour ramène', () => {
  const configuration = jouer({ type: 'analyse-demandee' }, { type: 'configuration-ouverte' });
  assert.equal(configuration.ecran, 'configuration');
  const apres = etatSuivant(configuration, recu());
  assert.equal(apres.ecran, 'configuration');
  assert.equal(etatSuivant(apres, { type: 'configuration-fermee' }).ecran, 'travail');
});

test('l’onglet choisi se retient ; choisir le même onglet ne change rien', () => {
  const regles = jouer(recu(), { type: 'onglet-choisi', onglet: 'regles' });
  assert.equal(regles.onglet, 'regles');
  assert.equal(etatSuivant(regles, { type: 'onglet-choisi', onglet: 'regles' }), regles);
  assert.equal(etatSuivant(regles, recu()).onglet, 'regles');
});

test('une carte demandée ouvre Renommages et retient sa clé jusqu’au prochain onglet ou bilan', () => {
  const regles = jouer(recu(), { type: 'onglet-choisi', onglet: 'regles' });
  assert.equal(regles.carteDemandee, null);
  const demandee = etatSuivant(regles, { type: 'carte-demandee', cle: 'terme:background' });
  assert.equal(demandee.onglet, 'a-appliquer');
  assert.equal(demandee.carteDemandee, 'terme:background');
  assert.equal(demandee.ecran, 'travail');
  assert.equal(etatSuivant(demandee, { type: 'carte-demandee', cle: 'terme:background' }), demandee);
  assert.equal(etatSuivant(demandee, { type: 'carte-demandee', cle: 'terme:hover' }).carteDemandee, 'terme:hover');
  assert.equal(etatSuivant(demandee, { type: 'onglet-choisi', onglet: 'a-appliquer' }).carteDemandee, null);
  assert.equal(etatSuivant(demandee, { type: 'onglet-choisi', onglet: 'regles' }).carteDemandee, null);
  assert.equal(etatSuivant(demandee, recu()).carteDemandee, null);
});

test('les messages de lecture, de simulation et de résultat ne changent pas l’état', () => {
  const travail = jouer(recu());
  const sansEffet: Evenement[] = [
    { type: 'lignes', demande: 2, generation: 1, groupe: 'g1', debut: 0, lignes: [], total: 0 },
    { type: 'termes', demande: 3, generation: 1, section: null, debut: 0, sections: [], comptes: { types: { 'a-trancher': 0, remplace: 0, conforme: 0, 'sans-regle': 0, composant: 0, palette: 0 }, origines: { ucm: 0, personnalise: 0 } } },
    { type: 'refus', demande: 4, conflits: [] },
    { type: 'application', demande: 5, resultat: { sorte: 'application', statut: 'applique', renommes: 1, sautes: 0, annulable: true } },
    { type: 'regles-exportees', demande: 6, texte: '{}' },
  ];
  for (const evenement of sansEffet) assert.equal(etatSuivant(travail, evenement), travail, evenement.type);
});
