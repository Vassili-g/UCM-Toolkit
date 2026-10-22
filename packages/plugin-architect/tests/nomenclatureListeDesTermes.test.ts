/** L'état de la liste des termes de l'onglet Règles : sections, filtres, tri, replis, pages de section, lignes et résumés. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ComptesDeTermes, PlaceDuTerme, MessageDeNomenclature, SectionDeTermes, TermeDeListe, TypeDeTerme } from '../src/messages/nomenclature';
import {
  LISTE_INITIALE, bandeDeLaSection, basculerLePli, basculerUneOrigine, basculerUnePlace, basculerUnType, blocsDeLaSection, choisir, estRepliee, filtresActifs, morceauxDuTerme,
  motAffiche, nomAccessibleDuTerme, origineDeLaLigne, pastilleDeLaLigne, phraseDeRecherche, recevoir, requeteDeLaListe, resteDansLaSection, retirerUnFiltre, saisir, teinter,
  termesRecus, texteDeLaSuite, trier,
} from '../src/ui/nomenclature/listeDesTermes';

type Reponse = Extract<MessageDeNomenclature, { type: 'termes' }>;

const COMPTES: ComptesDeTermes = { types: { 'a-trancher': 1, remplace: 4, conforme: 10, 'sans-regle': 120, composant: 3, palette: 2 }, origines: { ucm: 12, personnalise: 2 }, places: { groupes: 100, variables: 40 } };

function termes(type: TypeDeTerme, depart: number, nombre: number): TermeDeListe[] {
  return Array.from({ length: nombre }, (_, rang) => ({
    mot: `${type}-${depart + rang}`, place: 'groupes', forme: `${type}-${depart + rang}`, type, nature: null, origine: null, statut: 'sans-regle', remplace: [], avec: null, nombre: 1, trouve: null,
  }));
}
const section = (type: TypeDeTerme, total: number, recues: number, depart = 0): SectionDeTermes => ({ type, total, totaux: { groupes: total, variables: 0 }, termes: termes(type, depart, recues) });
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
  assert.deepEqual(requeteDeLaListe(cherchee, null), { recherche: 'bu', types: [], origines: [], places: [], tri: 'alpha', section: null, place: null, debut: 0 });
});

test('cocher des types et des origines change la demande, dans l’ordre des sections', () => {
  let liste = basculerUnType(LISTE_INITIALE, 'sans-regle');
  liste = basculerUnType(liste, 'remplace');
  liste = basculerUneOrigine(liste, 'personnalise');
  liste = basculerUneOrigine(liste, 'ucm');
  assert.deepEqual(liste.types, ['remplace', 'sans-regle']);
  assert.deepEqual(liste.origines, ['ucm', 'personnalise']);
  assert.deepEqual(requeteDeLaListe(liste, null), { recherche: '', types: ['remplace', 'sans-regle'], origines: ['ucm', 'personnalise'], places: [], tri: 'alpha', section: null, place: null, debut: 0 });
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
  assert.deepEqual(requeteDeLaListe(rechargee, 'sans-regle'), { recherche: 'bg', types: ['sans-regle'], origines: [], places: [], tri: 'alpha', section: 'sans-regle', place: null, debut: 5 });
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

const REGLE: TermeDeListe = { mot: 'pressed', place: 'groupes', forme: 'Pressed', type: 'remplace', nature: null, origine: 'ucm', statut: 'regle', remplace: ['Press', 'Push'], avec: null, nombre: 38, trouve: null };
const NOM: TermeDeListe = { mot: 'button', place: 'groupes', forme: 'Button', type: 'composant', nature: 'composant', origine: null, statut: 'sans-regle', remplace: [], avec: null, nombre: 245, trouve: null };

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
  assert.equal(nomAccessibleDuTerme(REGLE), 'Pressed, groupe, remplace Press, Push, UCM, 38 noms');
  assert.equal(nomAccessibleDuTerme({ ...REGLE, origine: null, type: 'a-trancher', statut: 'a-trancher', remplace: [], avec: 'error', forme: 'pressed' }), 'pressed, groupe, à trancher avec error, À trancher, 38 noms');
  assert.equal(nomAccessibleDuTerme({ ...REGLE, type: 'sans-regle', statut: 'ecart', remplace: [] }), 'Pressed, groupe, règle UCM non appliquée dans ce fichier, UCM, 38 noms');
  assert.equal(nomAccessibleDuTerme({ ...REGLE, type: 'conforme', remplace: [] }), 'Pressed, groupe, UCM, 38 noms');
  assert.equal(nomAccessibleDuTerme(NOM), 'Button, groupe, 245 noms');
  assert.equal(nomAccessibleDuTerme({ ...NOM, type: 'palette', nature: 'palette', mot: 'poppy', forme: 'Poppy', nombre: 44 }), 'Poppy, groupe, 44 noms');
});

test('le nom accessible d’une ligne dit sa place : groupe ou variable', () => {
  const ligne: TermeDeListe = { ...REGLE, mot: 'line-height', place: 'variables', forme: 'line-height', type: 'conforme', origine: 'personnalise', remplace: [], nombre: 15 };
  assert.equal(nomAccessibleDuTerme(ligne), 'line-height, variable, Personnalisé, 15 noms');
  assert.equal(nomAccessibleDuTerme({ ...ligne, place: 'groupes', forme: 'LineHeight' }), 'LineHeight, groupe, Personnalisé, 15 noms');
});

test('seule la ligne À trancher garde une pastille ; l’origine s’écrit en texte gris', () => {
  const aTrancher: TermeDeListe = { ...NOM, type: 'a-trancher', statut: 'a-trancher', origine: 'ucm' };
  assert.deepEqual(pastilleDeLaLigne(aTrancher), { texte: 'À trancher', classe: 'pastille-bloque' });
  assert.equal(origineDeLaLigne(aTrancher), null, 'À trancher prend la place de l’origine');
  assert.equal(pastilleDeLaLigne(REGLE), null);
  assert.equal(origineDeLaLigne(REGLE), 'UCM');
  assert.equal(origineDeLaLigne({ ...REGLE, origine: 'personnalise' }), 'Personnalisé');
  assert.equal(pastilleDeLaLigne(NOM), null);
  assert.equal(origineDeLaLigne(NOM), null);
  assert.equal(origineDeLaLigne({ ...NOM, type: 'palette', nature: 'palette' }), null);
});

test('la couleur d’une ligne suit sa place : jeton, mot ou échantillon, orchidée en groupe et olive en variable', () => {
  const posees = (place: PlaceDuTerme, forme: 'jeton' | 'mot' | 'echantillon'): string[] => {
    const classes: string[] = [];
    teinter({ classList: { add: (classe) => { classes.push(classe); } } }, place, forme);
    return classes;
  };
  assert.deepEqual(posees('groupes', 'jeton'), ['jeton-groupe']);
  assert.deepEqual(posees('variables', 'jeton'), ['jeton-variable']);
  assert.deepEqual(posees('groupes', 'mot'), ['mot-groupe']);
  assert.deepEqual(posees('variables', 'mot'), ['mot-variable']);
  assert.deepEqual(posees('groupes', 'echantillon'), ['echantillon-groupe']);
  assert.deepEqual(posees('variables', 'echantillon'), ['echantillon-variable']);
});

test('le titre de la feuille garde la forme d’un terme sans règle et la clé d’un terme réglé', () => {
  assert.equal(motAffiche({ ...NOM, forme: 'StressTest' }), 'StressTest');
  assert.equal(motAffiche(REGLE), 'Pressed');
});

// Les places : blocs d'une section, pages par place, filtre.

const ligneDe = (mot: string, place: PlaceDuTerme, type: TypeDeTerme = 'conforme'): TermeDeListe =>
  ({ mot, place, forme: mot, type, nature: null, origine: 'ucm', statut: 'regle', remplace: [], avec: null, nombre: 1, trouve: null });
const deuxPlaces = (groupes: number, variables: number, recues: readonly [number, number] = [2, 2]): SectionDeTermes => ({
  type: 'conforme', total: groupes + variables, totaux: { groupes, variables },
  termes: [
    ...Array.from({ length: recues[0] }, (_, rang) => ligneDe(`g${rang}`, 'groupes')),
    ...Array.from({ length: recues[1] }, (_, rang) => ligneDe(`v${rang}`, 'variables')),
  ],
});
/** La page d'une place : `nombre` lignes à partir du rang `depart`. */
const pageDe = (place: PlaceDuTerme, depart: number, nombre: number, totaux: readonly [number, number] = [5, 4]): SectionDeTermes => ({
  ...deuxPlaces(totaux[0], totaux[1]),
  termes: Array.from({ length: nombre }, (_, rang) => ligneDe(`${place === 'groupes' ? 'g' : 'v'}${depart + rang}`, place)),
});

test('en tri A → Z, une section à deux places rend un bloc par place, les groupes d’abord, chacun avec son intertitre et sa suite', () => {
  const blocs = blocsDeLaSection(deuxPlaces(5, 4), 'alpha');
  assert.deepEqual(blocs.map(({ place, intertitre, total, reste }) => [place, intertitre, total, reste]), [['groupes', true, 5, 3], ['variables', true, 4, 2]]);
  assert.deepEqual(blocs.map(({ termes: lignes }) => lignes.map(({ mot }) => mot)), [['g0', 'g1'], ['v0', 'v1']]);
  assert.deepEqual(blocs.map(texteDeLaSuite), ['Afficher les 3 autres groupes', 'Afficher les 2 autres variables']);
  assert.deepEqual(blocsDeLaSection(deuxPlaces(3, 3), 'alpha').map(texteDeLaSuite), ['Afficher l’autre groupe', 'Afficher l’autre variable']);
});

test('en tri A → Z, une section à une seule place n’a ni intertitre ni nom de place dans sa suite', () => {
  const [bloc, ...autres] = blocsDeLaSection(deuxPlaces(8, 0, [3, 0]), 'alpha');
  assert.equal(autres.length, 0);
  assert.deepEqual([bloc.place, bloc.intertitre, bloc.total, bloc.reste], ['groupes', false, 8, 5]);
  assert.equal(texteDeLaSuite(bloc), 'Afficher les 5 autres');
  const [variables] = blocsDeLaSection(deuxPlaces(0, 6, [0, 2]), 'alpha');
  assert.deepEqual([variables.place, variables.intertitre, variables.reste], ['variables', false, 4]);
});

test('en tri par nombre, les places se mêlent : un bloc, pas d’intertitre, une seule suite pour la section', () => {
  const section: SectionDeTermes = { ...deuxPlaces(5, 4), termes: [ligneDe('v0', 'variables'), ligneDe('g0', 'groupes'), ligneDe('v1', 'variables')] };
  const blocs = blocsDeLaSection(section, 'nombre');
  assert.equal(blocs.length, 1);
  assert.deepEqual([blocs[0].place, blocs[0].intertitre, blocs[0].total, blocs[0].reste], [null, false, 9, 6]);
  assert.deepEqual(blocs[0].termes.map(({ mot }) => mot), ['v0', 'g0', 'v1']);
  assert.equal(texteDeLaSuite(blocs[0]), 'Afficher les 6 autres');
});

test('la suite d’une place demande la page de cette place et s’ajoute à ses lignes, avant les variables', () => {
  let liste = recevoir(LISTE_INITIALE, reponse([deuxPlaces(5, 4)]));
  assert.deepEqual(requeteDeLaListe(liste, 'conforme', 'groupes'), { recherche: '', types: [], origines: [], places: [], tri: 'alpha', section: 'conforme', place: 'groupes', debut: 2 });
  assert.equal(requeteDeLaListe(liste, 'conforme', 'variables').debut, 2);
  liste = recevoir(liste, reponse([pageDe('groupes', 2, 3)], { section: 'conforme', debut: 2 }));
  assert.deepEqual(liste.sections![0].termes.map(({ mot }) => mot), ['g0', 'g1', 'g2', 'g3', 'g4', 'v0', 'v1']);
  assert.deepEqual(blocsDeLaSection(liste.sections![0], 'alpha').map(({ reste }) => reste), [0, 2]);
  assert.equal(requeteDeLaListe(liste, 'conforme', 'variables').debut, 2, 'la page des variables part de ses propres lignes');
  liste = recevoir(liste, reponse([pageDe('variables', 2, 2)], { section: 'conforme', debut: 2 }));
  assert.deepEqual(liste.sections![0].termes.map(({ mot }) => mot), ['g0', 'g1', 'g2', 'g3', 'g4', 'v0', 'v1', 'v2', 'v3']);
});

test('une page de place qui ne suit pas les lignes de sa place, ou qui mêle les places, est ignorée', () => {
  const liste = recevoir(LISTE_INITIALE, reponse([deuxPlaces(5, 4)]));
  assert.equal(recevoir(liste, reponse([pageDe('groupes', 4, 1)], { section: 'conforme', debut: 4 })), liste);
  assert.equal(recevoir(liste, reponse([pageDe('groupes', 2, 1)], { section: 'conforme', debut: 4 })), liste, 'le rang compte les lignes de la place, pas de la section');
  const melangee: SectionDeTermes = { ...deuxPlaces(5, 4), termes: [ligneDe('g2', 'groupes'), ligneDe('v2', 'variables')] };
  assert.equal(recevoir(liste, reponse([melangee], { section: 'conforme', debut: 2 })), liste);
});

test('en tri par nombre, la suite d’une section demande la page de la section sans place', () => {
  let liste = recevoir(trier(LISTE_INITIALE, 'nombre'), reponse([{ ...deuxPlaces(5, 4), termes: [ligneDe('v0', 'variables'), ligneDe('g0', 'groupes'), ligneDe('v1', 'variables')] }]));
  assert.deepEqual(requeteDeLaListe(liste, 'conforme', null), { recherche: '', types: [], origines: [], places: [], tri: 'nombre', section: 'conforme', place: null, debut: 3 });
  liste = recevoir(liste, reponse([{ ...deuxPlaces(5, 4), termes: [ligneDe('g1', 'groupes'), ligneDe('v2', 'variables')] }], { section: 'conforme', debut: 3 }));
  assert.deepEqual(liste.sections![0].termes.map(({ mot }) => mot), ['v0', 'g0', 'v1', 'g1', 'v2']);
});

test('la demande des premières lignes ne porte pas de place', () => {
  const liste = recevoir(LISTE_INITIALE, reponse([deuxPlaces(5, 4)]));
  assert.equal(requeteDeLaListe(liste, null, 'groupes').place, null);
});

test('la bande d’une section dit son titre, son compte et sa ligne ; son libellé suit le repli', () => {
  const section = deuxPlaces(5, 4);
  assert.deepEqual(bandeDeLaSection(LISTE_INITIALE, section), { titre: 'Conforme', total: 9, ligne: 'Termes déjà écrits selon leur règle.', ouverte: true, libelle: 'Replier Conforme' });
  const repliee = bandeDeLaSection(basculerLePli(LISTE_INITIALE, 'conforme'), section);
  assert.deepEqual([repliee.ouverte, repliee.libelle], [false, 'Déplier Conforme']);
  assert.equal(bandeDeLaSection(LISTE_INITIALE, { ...section, type: 'a-trancher' }).ligne, 'Termes qui attendent votre réponse dans l’onglet Questions.');
});

test('le filtre de place se coche dans l’ordre des places, repart de zéro, se montre en jeton et se retire', () => {
  let liste = recevoir(LISTE_INITIALE, reponse([deuxPlaces(5, 4)]));
  liste = basculerUnePlace(basculerUnePlace(liste, 'variables'), 'groupes');
  assert.deepEqual(liste.places, ['groupes', 'variables']);
  assert.equal(liste.sections, null, 'un filtre repart de zéro');
  assert.deepEqual(requeteDeLaListe(liste, null).places, ['groupes', 'variables']);
  liste = basculerUneOrigine(basculerUnType(liste, 'remplace'), 'ucm');
  const actifs = filtresActifs(liste);
  assert.deepEqual(actifs.map(({ sorte, valeur, libelle }) => [sorte, valeur, libelle]), [
    ['type', 'remplace', 'Remplace'], ['origine', 'ucm', 'UCM'], ['place', 'groupes', 'Groupes'], ['place', 'variables', 'Variables'],
  ]);
  liste = retirerUnFiltre(liste, actifs[2]);
  assert.deepEqual(liste.places, ['variables']);
  assert.deepEqual(requeteDeLaListe(liste, 'remplace', 'variables').places, ['variables'], 'la page d’une place garde les filtres de l’écran');
  assert.deepEqual(basculerUnePlace(liste, 'variables').places, []);
});
