/** L'état de la liste des termes de l'onglet Règles : sections, filtres, tri, replis, pages de section, lignes et résumés. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ComptesDeTermes, PluginMessage, SectionDeTermes, TermeDeListe, TypeDeTerme } from '../src/messages';
import {
  LISTE_INITIALE, basculerLePli, basculerUneOrigine, basculerUnType, choisir, estRepliee, filtresActifs, morceauxDuTerme, motAffiche, nomAccessibleDuTerme, pastilleDeLaLigne,
  phraseDeRecherche, recevoir, requeteDeLaListe, resteDansLaSection, retirerUnFiltre, saisir, termesRecus, trier,
} from '../src/ui/listeDesTermes';

type Reponse = Extract<PluginMessage, { type: 'termes' }>;

const COMPTES: ComptesDeTermes = { types: { 'a-trancher': 1, remplace: 4, conforme: 10, 'sans-regle': 120, composant: 3, palette: 2 }, origines: { ucm: 12, personnalise: 2 } };

function termes(type: TypeDeTerme, depart: number, nombre: number): TermeDeListe[] {
  return Array.from({ length: nombre }, (_, rang) => ({
    mot: `${type}-${depart + rang}`, forme: `${type}-${depart + rang}`, type, nature: null, origine: null, statut: 'sans-regle', remplace: [], avec: null, nombre: 1, trouve: null,
  }));
}
const section = (type: TypeDeTerme, total: number, recues: number, depart = 0): SectionDeTermes => ({ type, total, termes: termes(type, depart, recues) });
const reponse = (sections: readonly SectionDeTermes[], reste: Partial<Reponse> = {}): Reponse =>
  ({ type: 'termes', demande: 1, generation: 1, section: null, debut: 0, sections, comptes: COMPTES, ...reste });

test('la première réponse range les sections et les comptes', () => {
  const liste = recevoir(LISTE_INITIALE, reponse([section('remplace', 4, 4), section('sans-regle', 120, 5)]));
  assert.deepEqual(liste.sections?.map(({ type, total, termes: lignes }) => [type, total, lignes.length]), [['remplace', 4, 4], ['sans-regle', 120, 5]]);
  assert.deepEqual(liste.comptes, COMPTES);
  assert.equal(termesRecus(liste).length, 9);
  assert.equal(LISTE_INITIALE.sections, null, 'avant la première réponse, aucune section');
});

test('une réponse sans section remplace toutes les sections déjà reçues', () => {
  const liste = recevoir(LISTE_INITIALE, reponse([section('sans-regle', 120, 5)]));
  const relue = recevoir(liste, reponse([section('composant', 3, 3)]));
  assert.deepEqual(relue.sections?.map(({ type }) => type), ['composant']);
});

test('la page d’une section s’ajoute à ses lignes quand elle commence où elles s’arrêtent', () => {
  let liste = recevoir(LISTE_INITIALE, reponse([section('remplace', 4, 4), section('sans-regle', 120, 5)]));
  assert.equal(resteDansLaSection(liste.sections![1]), 115);
  assert.equal(requeteDeLaListe(liste, 'sans-regle').debut, 5);
  liste = recevoir(liste, reponse([section('sans-regle', 120, 50, 5)], { section: 'sans-regle', debut: 5 }));
  assert.equal(liste.sections![1].termes.length, 55);
  assert.equal(liste.sections![1].termes[5].mot, 'sans-regle-5');
  assert.equal(resteDansLaSection(liste.sections![1]), 65);
  assert.equal(liste.sections![0].termes.length, 4, 'les autres sections ne bougent pas');
  assert.equal(requeteDeLaListe(liste, 'sans-regle').debut, 55);
});

test('une page qui ne suit pas ses lignes, ou d’une section absente, est ignorée', () => {
  const liste = recevoir(LISTE_INITIALE, reponse([section('sans-regle', 120, 5)]));
  assert.equal(recevoir(liste, reponse([section('sans-regle', 120, 50, 50)], { section: 'sans-regle', debut: 50 })), liste);
  assert.equal(recevoir(liste, reponse([section('composant', 3, 3)], { section: 'composant', debut: 5 })), liste);
  assert.equal(recevoir(LISTE_INITIALE, reponse([section('sans-regle', 120, 50, 5)], { section: 'sans-regle', debut: 5 })), LISTE_INITIALE);
  assert.equal(recevoir(liste, reponse([], { section: 'sans-regle', debut: 5 })), liste);
});

test('la dernière page n’en laisse aucune à demander', () => {
  let liste = recevoir(LISTE_INITIALE, reponse([section('sans-regle', 7, 5)]));
  liste = recevoir(liste, reponse([section('sans-regle', 7, 2, 5)], { section: 'sans-regle', debut: 5 }));
  assert.equal(resteDansLaSection(liste.sections![0]), 0);
});

test('une nouvelle recherche repart des premières lignes et garde les comptes et les replis', () => {
  const pliee = basculerLePli(recevoir(LISTE_INITIALE, reponse([section('sans-regle', 120, 5)])), 'palette');
  const cherchee = saisir(pliee, 'bu');
  assert.equal(cherchee.recherche, 'bu');
  assert.equal(cherchee.sections, null);
  assert.deepEqual(cherchee.comptes, COMPTES);
  assert.deepEqual(cherchee.repliees, ['palette']);
  assert.equal(saisir(cherchee, 'bu'), cherchee);
  assert.deepEqual(requeteDeLaListe(cherchee, null), { recherche: 'bu', types: [], origines: [], tri: 'alpha', section: null, debut: 0 });
});

test('cocher des types et des origines change la demande, dans l’ordre des sections', () => {
  let liste = basculerUnType(LISTE_INITIALE, 'sans-regle');
  liste = basculerUnType(liste, 'remplace');
  liste = basculerUneOrigine(liste, 'personnalise');
  liste = basculerUneOrigine(liste, 'ucm');
  assert.deepEqual(liste.types, ['remplace', 'sans-regle']);
  assert.deepEqual(liste.origines, ['ucm', 'personnalise']);
  assert.deepEqual(requeteDeLaListe(liste, null), { recherche: '', types: ['remplace', 'sans-regle'], origines: ['ucm', 'personnalise'], tri: 'alpha', section: null, debut: 0 });
  const decochee = basculerUnType(liste, 'remplace');
  assert.deepEqual(decochee.types, ['sans-regle']);
  assert.equal(decochee.sections, null, 'un filtre repart de zéro');
  assert.deepEqual(basculerUnType(decochee, 'sans-regle').types, [], 'aucun type coché = tous');
});

test('les filtres actifs se montrent en jetons, types puis origines, et un jeton retiré décoche sa case', () => {
  let liste = basculerUneOrigine(basculerUnType(basculerUnType(LISTE_INITIALE, 'composant'), 'a-trancher'), 'personnalise');
  const actifs = filtresActifs(liste);
  assert.deepEqual(actifs.map(({ sorte, valeur, libelle }) => [sorte, valeur, libelle]), [
    ['type', 'a-trancher', 'À trancher'], ['type', 'composant', 'Composant'], ['origine', 'personnalise', 'Personnalisé'],
  ]);
  liste = retirerUnFiltre(liste, actifs[1]);
  liste = retirerUnFiltre(liste, actifs[2]);
  assert.deepEqual([liste.types, liste.origines], [['a-trancher'], []]);
  assert.deepEqual(filtresActifs(LISTE_INITIALE), []);
});

test('le tri repart des premières lignes et se transmet à la demande', () => {
  const liste = recevoir(LISTE_INITIALE, reponse([section('sans-regle', 120, 5)]));
  const triee = trier(liste, 'nombre');
  assert.equal(triee.tri, 'nombre');
  assert.equal(triee.sections, null);
  assert.equal(trier(triee, 'nombre'), triee);
  assert.equal(requeteDeLaListe(triee, null).tri, 'nombre');
});

test('la demande d’une section porte les filtres de l’écran et le rang de sa prochaine page', () => {
  const liste = basculerUnType(recevoir(saisir(LISTE_INITIALE, 'bg'), reponse([section('sans-regle', 120, 5)])), 'sans-regle');
  const rechargee = recevoir(liste, reponse([section('sans-regle', 120, 5)]));
  assert.deepEqual(requeteDeLaListe(rechargee, 'sans-regle'), { recherche: 'bg', types: ['sans-regle'], origines: [], tri: 'alpha', section: 'sans-regle', debut: 5 });
  assert.equal(requeteDeLaListe(rechargee, 'palette').debut, 0, 'une section jamais reçue repart de zéro');
});

test('toutes les sections sont ouvertes au départ, palettes comprises, et un pli ne touche ni aux lignes ni aux demandes', () => {
  const liste = recevoir(LISTE_INITIALE, reponse([section('composant', 3, 3), section('palette', 2, 2)]));
  assert.deepEqual(['a-trancher', 'remplace', 'conforme', 'sans-regle', 'composant', 'palette'].map((type) => estRepliee(liste, type as TypeDeTerme)), [false, false, false, false, false, false]);
  const pliee = basculerLePli(liste, 'palette');
  assert.equal(estRepliee(pliee, 'palette'), true);
  assert.equal(pliee.sections, liste.sections);
  assert.equal(estRepliee(basculerLePli(pliee, 'palette'), 'palette'), false);
  assert.equal(estRepliee(saisir(pliee, 'x'), 'palette'), true, 'le repli survit à une recherche');
  assert.equal(estRepliee(basculerUnType(pliee, 'palette'), 'palette'), true, 'et à un filtre');
});

test('le terme choisi survit à une réponse et à une recherche', () => {
  let liste = choisir(LISTE_INITIALE, 'terme-3');
  liste = recevoir(liste, reponse([section('sans-regle', 5, 5)]));
  assert.equal(liste.choisi, 'terme-3');
  assert.equal(saisir(liste, 'x').choisi, 'terme-3');
  assert.equal(choisir(liste, null).choisi, null);
  assert.equal(choisir(liste, 'terme-3'), liste);
});

const REGLE: TermeDeListe = { mot: 'pressed', forme: 'Pressed', type: 'remplace', nature: null, origine: 'ucm', statut: 'regle', remplace: ['Press', 'Push'], avec: null, nombre: 38, trouve: null };
const NOM: TermeDeListe = { mot: 'button', forme: 'Button', type: 'composant', nature: 'composant', origine: null, statut: 'sans-regle', remplace: [], avec: null, nombre: 245, trouve: null };

test('les morceaux d’une ligne suivent le statut du terme et écrivent sa forme', () => {
  assert.deepEqual(morceauxDuTerme(REGLE), [
    { sorte: 'reference', texte: 'Pressed' },
    { sorte: 'gris', texte: 'remplace' },
    { sorte: 'variante', texte: 'Press', trouvee: false },
    { sorte: 'variante', texte: 'Push', trouvee: false },
  ]);
  assert.deepEqual(morceauxDuTerme({ ...REGLE, type: 'conforme', remplace: [] }), [{ sorte: 'reference', texte: 'Pressed' }], 'un terme conforme garde le jeton gris');
  assert.deepEqual(morceauxDuTerme({ ...REGLE, type: 'a-trancher', statut: 'a-trancher', remplace: [], avec: 'error', forme: 'pressed' }), [
    { sorte: 'mot', texte: 'pressed' },
    { sorte: 'gris', texte: 'ou' },
    { sorte: 'variante', texte: 'error', trouvee: false },
  ]);
  assert.deepEqual(morceauxDuTerme({ ...REGLE, type: 'a-trancher', statut: 'a-trancher', remplace: [], avec: null }), [{ sorte: 'mot', texte: 'Pressed' }]);
  assert.deepEqual(morceauxDuTerme({ ...REGLE, type: 'sans-regle', statut: 'ecart', remplace: [] }), [
    { sorte: 'mot', texte: 'Pressed' },
    { sorte: 'gris', texte: 'règle UCM non appliquée dans ce fichier' },
  ]);
  assert.deepEqual(morceauxDuTerme({ ...NOM, forme: 'StressTest', mot: 'stress-test' }), [{ sorte: 'mot', texte: 'StressTest' }]);
});

test('la variante cherchée est marquée dans la ligne de sa référence, même si le fichier ne l’emploie pas', () => {
  const marquees = (ligne: TermeDeListe) => morceauxDuTerme(ligne).flatMap((morceau) => (morceau.sorte === 'variante' ? [[morceau.texte, morceau.trouvee]] : []));
  assert.deepEqual(marquees({ ...REGLE, trouve: 'Push' }), [['Press', false], ['Push', true]]);
  assert.deepEqual(marquees({ ...REGLE, trouve: 'press-it' }), [['Press', false], ['Push', false], ['press-it', true]]);
  assert.deepEqual(morceauxDuTerme({ ...REGLE, type: 'conforme', remplace: [], trouve: 'bg' }), [
    { sorte: 'reference', texte: 'Pressed' }, { sorte: 'gris', texte: 'remplace' }, { sorte: 'variante', texte: 'bg', trouvee: true },
  ]);
});

test('la phrase de recherche nomme la variante et la forme de la référence de la première ligne trouvée', () => {
  const sans: TermeDeListe = { ...NOM, mot: 'radius', forme: 'radius', type: 'sans-regle', nature: null };
  const trouvee: TermeDeListe = { ...REGLE, mot: 'color', forme: 'Color', remplace: ['Colors'], trouve: 'Colors' };
  assert.equal(phraseDeRecherche([sans]), null);
  assert.equal(phraseDeRecherche([]), null);
  assert.deepEqual(phraseDeRecherche([sans, trouvee, { ...trouvee, mot: 'colour' }]), { variante: 'Colors', reference: 'Color' });
});

test('le nom accessible d’une ligne dit la forme, la règle, l’origine et le nombre', () => {
  assert.equal(nomAccessibleDuTerme(REGLE), 'Pressed, remplace Press, Push, UCM, 38 noms');
  assert.equal(nomAccessibleDuTerme({ ...REGLE, origine: null, type: 'a-trancher', statut: 'a-trancher', remplace: [], avec: 'error', forme: 'pressed' }), 'pressed, à trancher avec error, À trancher, 38 noms');
  assert.equal(nomAccessibleDuTerme({ ...REGLE, type: 'sans-regle', statut: 'ecart', remplace: [] }), 'Pressed, règle UCM non appliquée dans ce fichier, UCM, 38 noms');
  assert.equal(nomAccessibleDuTerme({ ...REGLE, type: 'conforme', remplace: [] }), 'Pressed, UCM, 38 noms');
  assert.equal(nomAccessibleDuTerme(NOM), 'Button, 245 noms');
  assert.equal(nomAccessibleDuTerme({ ...NOM, type: 'palette', nature: 'palette', mot: 'poppy', forme: 'Poppy', nombre: 44 }), 'Poppy, 44 noms');
});

test('la pastille de droite dit À trancher, sinon l’origine ; la nature n’a plus de pastille', () => {
  assert.deepEqual(pastilleDeLaLigne({ ...NOM, type: 'a-trancher', statut: 'a-trancher' }), { texte: 'À trancher', classe: 'pastille-bloque' });
  assert.deepEqual(pastilleDeLaLigne(REGLE), { texte: 'UCM', classe: 'pastille-ucm' });
  assert.deepEqual(pastilleDeLaLigne({ ...REGLE, origine: 'personnalise' }), { texte: 'Personnalisé', classe: 'pastille-personnalise' });
  assert.equal(pastilleDeLaLigne(NOM), null);
  assert.equal(pastilleDeLaLigne({ ...NOM, type: 'palette', nature: 'palette' }), null);
});

test('le titre de la feuille garde la forme d’un terme sans règle et la clé d’un terme réglé', () => {
  assert.equal(motAffiche({ ...NOM, forme: 'StressTest' }), 'StressTest');
  assert.equal(motAffiche(REGLE), 'Pressed');
});
