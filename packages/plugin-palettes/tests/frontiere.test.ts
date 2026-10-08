/** Les demandes au sandbox et le rangement vu de l'interface ([UI-08], [REC-06], [REC-10], E13). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut, type Classement, type Recette } from 'ucm-couleur';

import { ajouter, nouvellePalette } from '../src/edition';
import { PLANCHE_SANS_CADRE } from '../src/lecture';
import { VARIABLES_SANS_SUIVI } from '../src/lectureDesVariables';
import type { UiRequest } from '../src/messages';
import { createFrontiere, type StatutDuRangement } from '../src/ui/frontiere';

const RECETTE = recetteParDefaut();
const AUTRE = { ...RECETTE, seuils: { ...RECETTE.seuils, texte: 7 } };
const ABSENTE: Classement = { etat: 'absente', recette: RECETTE };

function banc() {
  const envoyees: UiRequest[] = [];
  const statuts: StatutDuRangement[] = [];
  const frontiere = createFrontiere((demande) => envoyees.push(demande), (statut) => statuts.push(statut));
  const etat = (demande: number, empreinte: string | null = null) =>
    frontiere.accepterEtat({ type: 'etat', demande, classement: ABSENTE, texte: '', empreinte, profil: 'SRGB', planche: PLANCHE_SANS_CADRE, variables: VARIABLES_SANS_SUIVI });
  const rangee = (demande: number, empreinte: string) =>
    frontiere.recevoirRangement({ type: 'rangement', demande, issue: { issue: 'rangee', empreinte } });
  return { frontiere, envoyees, statuts, etat, rangee };
}

test('[UI-08] un seul compteur numérote les demandes, et un état plus ancien que la dernière est écarté', () => {
  const { frontiere, envoyees, etat } = banc();
  frontiere.lireLEtat();
  frontiere.lireLEtat();
  assert.deepEqual(envoyees.map((demande) => 'demande' in demande && demande.demande), [1, 2]);
  assert.equal(etat(1), false);
  assert.equal(etat(2), true);
});

test('[VAR-14] Synchroniser pendant une copie ne libère pas le rangement de la recette', () => {
  const { frontiere, etat, envoyees } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  frontiere.copier('p-000000b1', { collection: 'bibliotheque', chemin: 'bleu' });
  frontiere.lireLEtat('fichier');
  assert.equal(etat(3, 'aaaaaaaa'), false);
  assert.equal(frontiere.auRepos(), false);
  frontiere.ranger(AUTRE);
  assert.equal(envoyees.length, 3);
  frontiere.recevoirCopie({ type: 'copie', demande: 2, issue: { issue: 'copiee', empreinte: 'bbbbbbbb', importees: 11 } });
  frontiere.lireLEtat();
  assert.equal(etat(4, 'bbbbbbbb'), true);
  assert.equal(frontiere.auRepos(), true);
});

test('[REC-10] un rangement porte l’empreinte lue, puis celle que le rangement précédent a rendue', () => {
  const { frontiere, envoyees, etat, rangee } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  frontiere.ranger(RECETTE);
  assert.deepEqual(envoyees[1], { type: 'ranger-recette', demande: 2, recette: RECETTE, empreinteLue: 'aaaaaaaa' });
  rangee(2, 'bbbbbbbb');
  frontiere.ranger(AUTRE);
  assert.equal((envoyees[2] as { empreinteLue: string }).empreinteLue, 'bbbbbbbb');
});

test('[REC-06] un geste pendant un rangement attend, et seul le dernier part', () => {
  const { frontiere, envoyees, statuts, etat, rangee } = banc();
  frontiere.lireLEtat();
  etat(1, null);
  frontiere.ranger(RECETTE);
  frontiere.ranger(AUTRE);
  frontiere.ranger(RECETTE);
  assert.equal(envoyees.length, 2, 'un seul rangement en vol');
  assert.equal(frontiere.auRepos(), false);
  rangee(2, 'cccccccc');
  assert.equal(envoyees.length, 3);
  assert.deepEqual(envoyees[2], { type: 'ranger-recette', demande: 3, recette: RECETTE, empreinteLue: 'cccccccc' });
  rangee(3, 'dddddddd');
  assert.equal(frontiere.auRepos(), true);
  assert.deepEqual(statuts.slice(-1), ['range']);
});

test('[REC-10] après un refus, rien ne se range avant la relecture', () => {
  const { frontiere, envoyees, etat } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  frontiere.ranger(RECETTE);
  frontiere.recevoirRangement({ type: 'rangement', demande: 2, issue: { issue: 'modifiee-ailleurs' } });
  assert.equal(frontiere.statut(), 'refuse');
  frontiere.ranger(AUTRE);
  assert.equal(envoyees.length, 2);
  frontiere.lireLEtat();
  assert.equal(etat(3, 'eeeeeeee'), true);
  assert.equal(frontiere.statut(), 'lu');
  frontiere.ranger(AUTRE);
  assert.equal((envoyees[3] as { empreinteLue: string }).empreinteLue, 'eeeeeeee');
});

test('[UI-08] un état demandé avant un rangement n’écrase pas la recette rangée depuis', () => {
  const { frontiere, etat } = banc();
  frontiere.lireLEtat();
  frontiere.ranger(RECETTE);
  assert.equal(etat(1), false);
});

test('E13 : un dessin demandé pendant un rangement part après lui, sur l’empreinte qu’il rend', () => {
  const { frontiere, envoyees, etat, rangee } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  frontiere.ranger(AUTRE);
  frontiere.dessiner({ palettes: ['p-0000000a'], etrangersConfirmes: ['12:40'] }, () => assert.fail('aucun abandon'));
  assert.equal(envoyees.length, 2, 'le dessin attend le rangement');
  rangee(2, 'bbbbbbbb');
  assert.deepEqual(envoyees[2], { type: 'dessiner', demande: 3, palettes: ['p-0000000a'], empreinteLue: 'bbbbbbbb', etrangersConfirmes: ['12:40'] });
  assert.equal(frontiere.accepterDessin({ type: 'progression', demande: 3, fait: 0, total: 1, nom: 'Bleu' }), true);
  assert.equal(frontiere.accepterDessin({ type: 'progression', demande: 2, fait: 0, total: 1, nom: 'Bleu' }), false);
});

test('E13 : un rangement refusé abandonne le dessin qui l’attendait, et le dit', () => {
  const { frontiere, envoyees, statuts, etat } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  frontiere.ranger(AUTRE);
  let abandons = 0;
  frontiere.dessiner({ palettes: ['p-0000000a'], etrangersConfirmes: [] }, () => { abandons += 1; });
  frontiere.recevoirRangement({ type: 'rangement', demande: 2, issue: { issue: 'modifiee-ailleurs' } });
  assert.equal(abandons, 1);
  assert.deepEqual(statuts.slice(-1), ['refuse']);
  assert.deepEqual(envoyees.map((demande) => demande.type), ['lire-etat', 'ranger-recette']);
});

test('« Voir sur la planche » ne rend caduc aucun état attendu', () => {
  const { frontiere, envoyees, etat } = banc();
  frontiere.lireLEtat();
  frontiere.voirSurLaPlanche('1:2', ['3:4']);
  assert.deepEqual(envoyees[1], { type: 'voir-sur-la-planche', demande: 2, page: '1:2', cadres: ['3:4'] });
  assert.equal(etat(1), true);
});

test('V12.1 : pendant un conflit, un dessin ne part pas et s’abandonne, jusqu’à la relecture', () => {
  const { frontiere, envoyees, etat } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  frontiere.ranger(RECETTE);
  frontiere.recevoirRangement({ type: 'rangement', demande: 2, issue: { issue: 'modifiee-ailleurs' } });
  let abandons = 0;
  frontiere.dessiner({ palettes: ['p-0000000a'], etrangersConfirmes: [] }, () => { abandons += 1; });
  assert.equal(abandons, 1);
  assert.deepEqual(envoyees.map((demande) => demande.type), ['lire-etat', 'ranger-recette']);
  frontiere.lireLEtat();
  etat(3, 'eeeeeeee');
  frontiere.dessiner({ palettes: ['p-0000000a'], etrangersConfirmes: [] }, () => { abandons += 1; });
  assert.equal(envoyees.at(-1)?.type, 'dessiner');
  assert.equal(abandons, 1);
});

test('[PLA-29] un seul choix de page est en vol, aucun ne part pendant un conflit, et son issue ne s’accepte que sous son numéro', () => {
  const { frontiere, envoyees, etat } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  assert.equal(frontiere.choisirLaPage({ id: '12:1' }), true);
  assert.deepEqual(envoyees[1], { type: 'choisir-page', demande: 2, page: { id: '12:1' } });
  assert.equal(frontiere.choisirLaPage({ nom: 'Couleurs' }), false, 'un second choix attend l’issue du premier');
  assert.equal(envoyees.length, 2);
  assert.equal(frontiere.accepterPage({ type: 'page-choisie', demande: 1, issue: { issue: 'nom-vide' } }), false);
  assert.equal(frontiere.accepterPage({ type: 'page-choisie', demande: 2, issue: { issue: 'nom-vide' } }), true);
  assert.equal(frontiere.choisirLaPage({ nom: 'Couleurs' }), true);
  assert.equal(frontiere.accepterPage({ type: 'page-choisie', demande: 3, issue: { issue: 'choisie', page: '13:1', nom: 'Couleurs', deplaces: 0 } }), true);

  frontiere.ranger(RECETTE);
  frontiere.recevoirRangement({ type: 'rangement', demande: 4, issue: { issue: 'modifiee-ailleurs' } });
  assert.equal(frontiere.statut(), 'refuse');
  assert.equal(frontiere.choisirLaPage({ id: '12:1' }), false, 'rien ne part pendant un conflit');
  assert.equal(envoyees.filter((demande) => (demande as { type: string }).type === 'choisir-page').length, 2);
});

test('[VAR-16] une écriture de variables suit les règles du dessin : après le rangement en vol, sur l’empreinte qu’il rend', () => {
  const { frontiere, envoyees, etat, rangee } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  frontiere.ranger(AUTRE);
  frontiere.ecrireLesVariables({ palettes: ['p-0000000a'], remettre: ['p-0000000a'] }, () => assert.fail('aucun abandon'));
  frontiere.dessiner({ palettes: ['p-0000000a'], etrangersConfirmes: [] }, () => assert.fail('aucun abandon'));
  assert.equal(envoyees.length, 2, 'l’écriture attend le rangement');
  rangee(2, 'bbbbbbbb');
  // Les variables partent avant le dessin.
  assert.deepEqual(envoyees[2], { type: 'ecrire-variables', demande: 3, palettes: ['p-0000000a'], empreinteLue: 'bbbbbbbb', remettre: ['p-0000000a'] });
  assert.equal((envoyees[3] as { type: string }).type, 'dessiner');
  assert.equal(frontiere.accepterVariables({ type: 'variables-ecrites', demande: 3, resultat: { issue: 'ecrites', palettes: [] } }), true);
  assert.equal(frontiere.accepterVariables({ type: 'variables-ecrites', demande: 2, resultat: { issue: 'ecrites', palettes: [] } }), false);
});

test('[VAR-16] un rangement refusé abandonne l’écriture de variables qui l’attendait, et rien ne s’écrit pendant le conflit', () => {
  const { frontiere, envoyees, etat } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  frontiere.ranger(RECETTE);
  let abandons = 0;
  frontiere.ecrireLesVariables({ palettes: ['p-0000000a'], remettre: [] }, () => { abandons += 1; });
  frontiere.recevoirRangement({ type: 'rangement', demande: 2, issue: { issue: 'modifiee-ailleurs' } });
  assert.equal(abandons, 1);
  frontiere.ecrireLesVariables({ palettes: ['p-0000000a'], remettre: [] }, () => { abandons += 1; });
  assert.equal(abandons, 2);
  assert.equal(frontiere.rangerLaDestination({ collection: { nom: 'primitives' }, groupe: 'colors', themes: 'chemin' }), false);
  assert.equal(frontiere.retirerLesVariables('p-0000000a'), false);
  assert.deepEqual(envoyees.map((demande) => (demande as { type: string }).type), ['lire-etat', 'ranger-recette']);
});

test('[VAR-16] un seul rangement de destination est en vol, et le retrait des variables numérote sa demande', () => {
  const { frontiere, envoyees, etat } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  const destination = { collection: { nom: 'primitives' }, groupe: 'colors', themes: 'chemin' } as const;
  assert.equal(frontiere.rangerLaDestination(destination), true);
  assert.equal(frontiere.rangerLaDestination(destination), false);
  assert.deepEqual(envoyees[1], { type: 'ranger-destination', demande: 2, destination });
  assert.equal(frontiere.accepterDestination({ type: 'destination-rangee', demande: 1, issue: { issue: 'suivi-futur' } }), false);
  assert.equal(frontiere.accepterDestination({ type: 'destination-rangee', demande: 2, issue: { issue: 'rangee', destination } }), true);
  assert.equal(frontiere.rangerLaDestination(destination), true);
  assert.equal(frontiere.retirerLesVariables('p-0000000a'), true);
  assert.deepEqual(envoyees[3], { type: 'retirer-variables', demande: 4, palette: 'p-0000000a' });
  assert.equal(frontiere.accepterRetraitDesVariables({ type: 'variables-retirees', demande: 4, issue: { issue: 'retirees', retirees: 22 } }), true);
  assert.equal(frontiere.accepterRetraitDesVariables({ type: 'variables-retirees', demande: 3, issue: { issue: 'refuse' } }), false);
});

test('[VAR-13] une reprise range la recette : elle porte l’empreinte lue, retient les rangements, et apporte la nouvelle empreinte', () => {
  const { frontiere, envoyees, statuts, etat } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  const source = { collection: 'C', chemin: 'slate' };
  assert.equal(frontiere.reprendre(AUTRE, 'p-000000a1', source), true);
  assert.deepEqual(envoyees[1], { type: 'reprendre-palette', demande: 2, recette: AUTRE, empreinteLue: 'aaaaaaaa', palette: 'p-000000a1', source });
  assert.equal(frontiere.reprendre(AUTRE, 'p-000000a2', source), false, 'une reprise en vol retient la suivante');
  frontiere.ranger(RECETTE);
  assert.equal(envoyees.length, 2, 'un rangement attend l’issue de la reprise');
  assert.equal(frontiere.recevoirReprise({ type: 'reprise', demande: 1, issue: { issue: 'suivi-futur' } }), false);
  assert.equal(frontiere.recevoirReprise({ type: 'reprise', demande: 2, issue: { issue: 'reprise', empreinte: 'bbbbbbbb' } }), true);
  assert.equal(frontiere.empreinte(), 'bbbbbbbb');
  assert.equal(statuts.at(-1), 'range');
  // Le rangement arrivé pendant la reprise portait la recette d'avant : il ne part pas.
  assert.equal(envoyees.length, 2);
  assert.equal(frontiere.auRepos(), true);
});

test('[VAR-13] une reprise sur une recette changée ailleurs ouvre le conflit, et aucune reprise ne part pendant un conflit', () => {
  const { frontiere, envoyees, etat } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  const source = { collection: 'C', chemin: 'slate' };
  frontiere.reprendre(AUTRE, 'p-000000a1', source);
  frontiere.recevoirReprise({ type: 'reprise', demande: 2, issue: { issue: 'modifiee-ailleurs' } });
  assert.equal(frontiere.statut(), 'refuse');
  assert.equal(frontiere.reprendre(AUTRE, 'p-000000a1', source), false);
  assert.equal(envoyees.length, 2);
});

test('[VAR-14] une copie de bibliothèque range la recette : elle porte l’empreinte lue, retient les rangements, et apporte la nouvelle empreinte', () => {
  const { frontiere, envoyees, etat } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  const source = { collection: 'cle', chemin: 'gray' };
  assert.equal(frontiere.copier('p-000000b1', source), true);
  assert.deepEqual(envoyees[1], { type: 'copier-palette', demande: 2, empreinteLue: 'aaaaaaaa', palette: 'p-000000b1', source });
  assert.equal(frontiere.copier('p-000000b2', source), false);
  assert.equal(frontiere.reprendre(AUTRE, 'p-000000b3', source), false, 'une reprise attend l’issue de la copie');
  assert.equal(frontiere.recevoirCopie({ type: 'copie', demande: 1, issue: { issue: 'sans-couleur' } }), false);
  assert.equal(frontiere.recevoirCopie({ type: 'copie', demande: 2, issue: { issue: 'copiee', empreinte: 'cccccccc', importees: 11 } }), true);
  assert.equal(frontiere.empreinte(), 'cccccccc');
  assert.equal(frontiere.copier('p-000000b2', source), true);
  frontiere.recevoirCopie({ type: 'copie', demande: 3, issue: { issue: 'modifiee-ailleurs' } });
  assert.equal(frontiere.statut(), 'refuse');
  assert.equal(frontiere.copier('p-000000b2', source), false);
});

const BLEU = { ...nouvellePalette(RECETTE, 'p-0000000a', '#1E6FD9', 2)!, nom: 'Bleu' };
const AMBRE = { ...nouvellePalette(RECETTE, 'p-0000000b', '#F2A900', 2)!, nom: 'Ambre' };
const DEUX_PALETTES: Recette = [BLEU, AMBRE].reduce(ajouter, RECETTE);

function renommer(recette: Recette, id: string, nom: string): Recette {
  return { ...recette, palettes: recette.palettes.map((palette) => (palette.id === id ? { ...palette, nom } : palette)) };
}

/** Un banc dont l'état lu porte une recette, et qui répond à chaque rangement par une empreinte nouvelle. */
function bancAvecRecette(recette: Recette) {
  const base = banc();
  const { frontiere, envoyees } = base;
  let compte = 0;
  const lire = (empreinte: string, lue: Recette = recette) => {
    frontiere.lireLEtat();
    const demande = (envoyees[envoyees.length - 1] as { demande: number }).demande;
    return frontiere.accepterEtat({ type: 'etat', demande, classement: { etat: 'courante', recette: lue }, texte: '', empreinte, profil: 'SRGB', planche: PLANCHE_SANS_CADRE, variables: VARIABLES_SANS_SUIVI });
  };
  /** Lance un rangement par `faire`, répond « rangée », et rend la recette envoyée. */
  const repondre = (faire: () => unknown): Recette => {
    const avant = envoyees.length;
    faire();
    assert.equal(envoyees.length, avant + 1, 'le rangement part');
    const demande = envoyees[avant] as { type: string; demande: number; recette: Recette };
    assert.equal(demande.type, 'ranger-recette');
    compte += 1;
    frontiere.recevoirRangement({ type: 'rangement', demande: demande.demande, issue: { issue: 'rangee', empreinte: `r${String(compte).padStart(7, '0')}` } });
    return demande.recette;
  };
  return { ...base, lire, repondre };
}

test('[REC-06] après trois réglages, l’annulation range la palette de l’ouverture et laisse les autres', () => {
  const { frontiere, lire, repondre } = bancAvecRecette(DEUX_PALETTES);
  lire('aaaaaaaa');
  assert.equal(frontiere.differeDeLOuverture(BLEU.id), false);
  assert.equal(frontiere.annulerLesModifications(BLEU.id), false, 'rien à annuler tant que la palette n’a pas bougé');
  let recette = DEUX_PALETTES;
  for (const nom of ['B1', 'B2', 'B3']) {
    recette = renommer(recette, BLEU.id, nom);
    repondre(() => frontiere.ranger(recette));
  }
  const autreReglage = { ...recette, seuils: { ...recette.seuils, texte: 7 } };
  repondre(() => frontiere.ranger(autreReglage));
  const avecAmbre = renommer(autreReglage, AMBRE.id, 'A1');
  repondre(() => frontiere.ranger(avecAmbre));
  assert.equal(frontiere.differeDeLOuverture(BLEU.id), true);
  const rangee = repondre(() => assert.equal(frontiere.annulerLesModifications(BLEU.id), true));
  assert.deepEqual(rangee.palettes.find((palette) => palette.id === BLEU.id), BLEU, 'la palette de l’ouverture');
  assert.deepEqual(rangee.palettes.find((palette) => palette.id === AMBRE.id), avecAmbre.palettes[1], 'l’autre palette ne bouge pas');
  assert.deepEqual(rangee.seuils, avecAmbre.seuils, 'les Réglages communs ne bougent pas');
  assert.equal(frontiere.differeDeLOuverture(BLEU.id), false);
  assert.equal(frontiere.differeDeLOuverture(AMBRE.id), true);
  assert.equal(frontiere.annulerLesModifications(BLEU.id), false);
});

test('[REC-06] « Rétablir » rend la palette d’avant l’annulation, jusqu’au réglage suivant', () => {
  const { frontiere, lire, repondre } = bancAvecRecette(DEUX_PALETTES);
  lire('aaaaaaaa');
  const modifiee = renommer(DEUX_PALETTES, BLEU.id, 'B1');
  repondre(() => frontiere.ranger(modifiee));
  assert.equal(frontiere.peutRetablir(), false);
  repondre(() => frontiere.annulerLesModifications(BLEU.id));
  assert.equal(frontiere.peutRetablir(), true);
  const rangee = repondre(() => assert.equal(frontiere.retablir(), true));
  assert.deepEqual(rangee, modifiee);
  assert.equal(frontiere.peutRetablir(), false);
  assert.equal(frontiere.retablir(), false);
  repondre(() => frontiere.annulerLesModifications(BLEU.id));
  assert.equal(frontiere.peutRetablir(), true);
  repondre(() => frontiere.ranger(renommer(DEUX_PALETTES, AMBRE.id, 'A1')));
  assert.equal(frontiere.peutRetablir(), false, 'un réglage suivant fait tomber « Rétablir »');
});

test('[REC-06] reculer après une suppression rend la palette sous son identifiant, avancer la retire de nouveau', () => {
  const { frontiere, lire, repondre } = bancAvecRecette(DEUX_PALETTES);
  lire('aaaaaaaa');
  assert.equal(frontiere.peutReculer(), false);
  const sansBleu: Recette = { ...DEUX_PALETTES, palettes: DEUX_PALETTES.palettes.filter((palette) => palette.id !== BLEU.id) };
  repondre(() => frontiere.ranger(sansBleu));
  assert.equal(frontiere.peutReculer(), true);
  assert.equal(frontiere.peutAvancer(), false);
  assert.deepEqual(repondre(() => frontiere.reculer()), DEUX_PALETTES);
  assert.equal(frontiere.peutReculer(), false);
  assert.equal(frontiere.peutAvancer(), true);
  assert.deepEqual(repondre(() => frontiere.avancer()), sansBleu);
  assert.equal(frontiere.peutAvancer(), false);
  repondre(() => frontiere.reculer());
  repondre(() => frontiere.ranger(renommer(DEUX_PALETTES, AMBRE.id, 'A1')));
  assert.equal(frontiere.peutAvancer(), false, 'un nouveau rangement coupe la suite');
  assert.equal(frontiere.avancer(), false);
});

test('[REC-10] un rangement refusé ne change ni la pile ni l’état d’ouverture', () => {
  const { frontiere, envoyees, lire, repondre } = bancAvecRecette(DEUX_PALETTES);
  lire('aaaaaaaa');
  repondre(() => frontiere.ranger(renommer(DEUX_PALETTES, BLEU.id, 'B1')));
  let appels = 0;
  frontiere.abonnerLAnnulation(() => { appels += 1; });
  assert.equal(frontiere.annulerLesModifications(BLEU.id), true);
  assert.equal(frontiere.differeDeLOuverture(BLEU.id), false, 'l’état souhaité montre déjà l’annulation');
  const demande = envoyees[envoyees.length - 1] as { demande: number };
  frontiere.recevoirRangement({ type: 'rangement', demande: demande.demande, issue: { issue: 'modifiee-ailleurs' } });
  assert.equal(frontiere.statut(), 'refuse');
  assert.equal(frontiere.differeDeLOuverture(BLEU.id), true);
  assert.equal(frontiere.peutReculer(), true);
  assert.equal(frontiere.peutAvancer(), false);
  assert.equal(frontiere.peutRetablir(), false);
  assert.equal(appels, 2, 'l’abonné apprend l’annulation, puis son refus');
  const avant = envoyees.length;
  assert.equal(frontiere.reculer(), false, 'rien ne part pendant le conflit');
  assert.equal(frontiere.annulerLesModifications(BLEU.id), false);
  assert.equal(envoyees.length, avant);
});

test('[REC-10] une recette venue d’ailleurs vide la pile et oublie les états d’ouverture des palettes qui ont changé', () => {
  const { frontiere, lire, repondre } = bancAvecRecette(DEUX_PALETTES);
  lire('aaaaaaaa');
  const bleuModifie = renommer(DEUX_PALETTES, BLEU.id, 'B1');
  repondre(() => frontiere.ranger(bleuModifie));
  repondre(() => frontiere.ranger(renommer(bleuModifie, AMBRE.id, 'A1')));
  assert.equal(frontiere.peutReculer(), true);
  // Un autre designer renomme Ambre ; Bleu reste comme nous l'avons rangé.
  const ailleurs = renommer(bleuModifie, AMBRE.id, 'A-ailleurs');
  let appels = 0;
  frontiere.abonnerLAnnulation(() => { appels += 1; });
  assert.equal(lire('zzzzzzzz', ailleurs), true);
  assert.equal(appels, 1);
  assert.equal(frontiere.peutReculer(), false);
  assert.equal(frontiere.peutAvancer(), false);
  assert.equal(frontiere.differeDeLOuverture(BLEU.id), true, 'Bleu n’a pas changé ailleurs : son état d’ouverture reste');
  assert.equal(frontiere.differeDeLOuverture(AMBRE.id), false, 'Ambre a changé ailleurs : la lecture devient son état d’ouverture');
});

test('[REC-10] relire la recette qu’on vient de ranger garde la pile', () => {
  const { frontiere, lire, repondre } = bancAvecRecette(DEUX_PALETTES);
  lire('aaaaaaaa');
  const modifiee = renommer(DEUX_PALETTES, BLEU.id, 'B1');
  repondre(() => frontiere.ranger(modifiee));
  assert.equal(lire('r0000001', modifiee), true);
  assert.equal(frontiere.peutReculer(), true);
});

test('[VAR-13] une reprise vide la pile et garde les états d’ouverture', () => {
  const { frontiere, lire, repondre } = bancAvecRecette(DEUX_PALETTES);
  lire('aaaaaaaa');
  repondre(() => frontiere.ranger(renommer(DEUX_PALETTES, BLEU.id, 'B1')));
  frontiere.reprendre(DEUX_PALETTES, 'p-000000c1', { collection: 'C', chemin: 'slate' });
  frontiere.recevoirReprise({ type: 'reprise', demande: 3, issue: { issue: 'reprise', empreinte: 'bbbbbbbb' } });
  assert.equal(frontiere.peutReculer(), false);
  // L'état relu après la reprise rend la pile : Bleu garde l'état d'ouverture de la première lecture.
  assert.equal(lire('bbbbbbbb', renommer(DEUX_PALETTES, BLEU.id, 'B1')), true);
  assert.equal(frontiere.peutReculer(), false);
  assert.equal(frontiere.differeDeLOuverture(BLEU.id), true);
});
