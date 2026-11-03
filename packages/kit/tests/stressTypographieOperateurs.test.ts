/**
 * Garde les opérateurs S et I, les 180 faux positifs, les 32 interactions et les deux relations du harnais de stress F5 et F6 : la base de
 * 12 variants sans constat, les nombres de cas contre le plan, les cas `mesure` et leur question, un oracle écrit à la main par
 * opérateur et par couple, et la réversibilité (dégrader puis annuler redonne la base). Le test ne mesure pas le kit sur les cas : un
 * écart du kit sur eux est un résultat du harnais, pas un échec d'ici.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { c10, c7, c8, type CasDeVariants } from './stress/f5-variants/cas.js';
import { composantF6, composantP0, constatsDeLaPortee, constatsDeTypographie, GRAINE_PAR_DEFAUT, verifierLaLecture, avecLesCouchesF6 } from './stress/f5-variants/composantDeBase.js';
import { fauxPositifs } from './stress/f5-variants/fauxPositifs.js';
import { interactions, COUPLES } from './stress/f5-variants/interactions.js';
import { tousLesCas, tousLesCasDeF6, tousLesCasDeLaSectionB } from './stress/f5-variants/operateurs.js';
import { composantDuProfil, profilParId } from './stress/f5-variants/profils.js';
import { autreEcritureDuNom, controlesDuCas, executerLesControles, reecrireLesNomsDAxe, verifierLesRelations } from './stress/f5-variants/relations.js';
import { DEFINITIONS_D_ICONE, verdictsDesTroisFonctions } from './stress/f5-variants/typo/definitionsDIcone.js';
import { a64, a65, a66, a67 } from './stress/f5-variants/typo/operateursTexte.js';

const base = composantF6();
const baseAvant = JSON.stringify({ releve: base.releve, catalogue: base.catalogue });
const P0 = composantP0();
const F6 = tousLesCasDeF6(P0);
const FP = fauxPositifs();
const INTERACTIONS = interactions();

const premier = 'Size=sm, State=default';
const parId = (liste: readonly CasDeVariants[], id: string): CasDeVariants => liste.find((entree) => entree.id === id)!;
const cas = (id: string): CasDeVariants => parId(F6, id);
const duOperateur = (operateur: string): CasDeVariants[] => F6.filter((entree) => entree.operateur === operateur);
const interaction = (couple: string, profil: 'P0' | 'p18'): CasDeVariants => parId(INTERACTIONS, `${couple}-${profil}`);
const codes = (entree: CasDeVariants): Record<string, number> => {
  const compte: Record<string, number> = {};
  for (const attendu of entree.attendus) compte[attendu.code] = (compte[attendu.code] ?? 0) + 1;
  return compte;
};
const parQuestion = (liste: readonly CasDeVariants[]): Record<string, string[]> => {
  const resultat: Record<string, string[]> = {};
  for (const entree of liste.filter((autre) => autre.verdict === 'mesure')) (resultat[entree.question!] ??= []).push(entree.id);
  return resultat;
};

test('la base de F6 compte 12 variants, un style par taille et une icône de library pilotée, sans constat hors la limite de C67', () => {
  assert.equal(base.releve.variants.length, 12);
  assert.deepEqual(base.carte.axes.map((axe) => axe.propriete), ['Size', 'State']);
  assert.deepEqual(constatsDeTypographie(base.releve, base.catalogue).map((constat) => [constat.id, constat.type, constat.limite]),
    [['C67:Icon:limite:icones-permises-non-lues', 'info', true]]);
  assert.deepEqual(constatsDeLaPortee(base.releve, base.catalogue), []);
  assert.deepEqual(verifierLaLecture(base), { sansLecture: [], malLus: [] });
  for (const variant of base.releve.variants) {
    const label = variant.layers.find((layer) => layer.nom === 'Label')!;
    assert.equal(label.texte!.style, { sm: 'Label/Small', md: 'Label/Medium', lg: 'Label/Large' }[variant.valeurs.Size]!, variant.nom);
    const icone = variant.layers.find((layer) => layer.nom === 'Icon')!;
    assert.deepEqual([icone.type, icone.instanceDe!.distante, icone.instanceDe!.pilotee], ['INSTANCE', true, 'Icon#1:2']);
    assert.deepEqual(icone.liaisons.map((liaison) => [liaison.champ, liaison.variable.nom]).sort(),
      [['fills', 'neutral/surface/foreground'], ['height', `icon/${{ sm: 'small', md: 'medium', lg: 'large' }[variant.valeurs.Size]}`], ['width', `icon/${{ sm: 'small', md: 'medium', lg: 'large' }[variant.valeurs.Size]}`]]);
    assert.ok(!variant.layers.some((layer) => layer.nom === 'Glyph'), 'Glyph est retiré');
  }
  assert.ok(base.releve.proprietes.some((propriete) => propriete.type === 'INSTANCE_SWAP' && propriete.nom === 'Icon#1:2'));
});

test('les couches de F6 se posent sur P0 et sur p18 sans constat de la portée ni de typographie, et sans toucher au composant de F5', () => {
  const avant = JSON.stringify({ releve: P0.releve, catalogue: P0.catalogue });
  // La lecture de p18 n'est pas complète : l'axe Kind y porte des termes de palette (hypothèse 2), ce que le profil FP1 mesure.
  for (const composant of [avecLesCouchesF6(P0), avecLesCouchesF6(composantDuProfil(profilParId('p18')))]) {
    assert.deepEqual(constatsDeLaPortee(composant.releve, composant.catalogue), []);
    assert.deepEqual(constatsDeTypographie(composant.releve, composant.catalogue).map((constat) => constat.id), ['C67:Icon:limite:icones-permises-non-lues']);
  }
  assert.deepEqual(verifierLaLecture(avecLesCouchesF6(P0)), { sansLecture: [], malLus: [] });
  assert.equal(JSON.stringify({ releve: P0.releve, catalogue: P0.catalogue }), avant);
  assert.equal(GRAINE_PAR_DEFAUT, 7105);
});

test('les opérateurs S et I rendent les nombres de cas du plan : 43 S, 58 I, soit 101, et 371 avec F5', () => {
  const attendus: Record<string, number> = { S1: 7, S2: 15, S3: 21, I1: 4, I2: 6, I3: 5, I4: 5, I5: 7, I6: 31 };
  for (const [operateur, nombre] of Object.entries(attendus)) assert.equal(duOperateur(operateur).length, nombre, operateur);
  assert.equal(F6.length, 101);
  assert.equal(duOperateur('S1').length + duOperateur('S2').length + duOperateur('S3').length, 43);
  assert.equal(F6.length - 43, 58);
  const section = tousLesCasDeLaSectionB(P0);
  assert.equal(section.length, 371);
  assert.equal(tousLesCas(P0).length, 270);
  assert.deepEqual(section.slice(270).map((entree) => entree.id), F6.map((entree) => entree.id));
  assert.equal(new Set(section.map((entree) => entree.id)).size, 371);
});

test('les cas de F6 qui dépendent d\'une question non confirmée portent le verdict mesure et son identifiant', () => {
  assert.deepEqual(parQuestion(F6), {
    'Q-F6-6': ['S1-5', 'S1-6', 'S1-7'],
    'Q-F6-2': ['S2-5', 'S2-6', 'S2-7', 'S2-9', 'S2-12', 'S2-13'],
    'Q-F6-7': ['S3-9', 'S3-10', 'S3-11'],
    'Q-F6-1': ['I2-3', 'I3-3'],
    'Q-F6-5': ['I3-5'],
    'Q-F6-4': ['I5-4', 'I5-5', 'I5-6', 'I5-7'],
    'Q-F6-3': ['I6-17', 'I6-18', 'I6-19', 'I6-20', 'I6-21', 'I6-22', 'I6-23', 'I6-25', 'I6-28', 'I6-30', 'I6-31'],
  });
});

test('chaque cas de F6 a un identifiant <opérateur>-<n> dans l\'ordre, une description qui commence par l\'opérateur et un verdict cohérent', () => {
  for (const operateur of new Set(F6.map((entree) => entree.operateur))) {
    duOperateur(operateur).forEach((entree, rang) => assert.equal(entree.id, `${operateur}-${rang + 1}`));
  }
  for (const entree of F6) {
    assert.equal(entree.famille, 'F6');
    assert.ok(entree.entree.description.startsWith(`${entree.operateur} :`), entree.id);
    assert.equal(entree.verdict === 'mesure', entree.question !== undefined, entree.id);
    assert.ok(entree.entree.materialiser !== undefined || entree.operateur === 'I6', entree.id);
  }
});

test('S1 : un texte sans style ni variable donne C64 sur un variant ou sur les 12 ; des styles mixtes restent en attente de Q-F6-6', () => {
  assert.deepEqual(cas('S1-1').attendus, [a64('Label', 'sans-style-ni-variables', [premier])]);
  assert.deepEqual(cas('S1-2').attendus, [a64('Label', 'sans-style-ni-variables', ['Size=md, State=hover'])]);
  assert.deepEqual(cas('S1-3').attendus, [a64('Label', 'sans-style-ni-variables', ['Size=lg, State=disabled'])]);
  assert.equal(cas('S1-4').attendus.length, 1, 'un même défaut sur 12 variants est un seul constat (P23)');
  assert.ok(cas('S1-4').attendus[0].cle.startsWith('Label|sans-style-ni-variables||@12 variants'));
  assert.deepEqual(['S1-5', 'S1-6', 'S1-7'].map((id) => [cas(id).verdict, cas(id).question, cas(id).attendus[0].cle]),
    Array(3).fill(['mesure', 'Q-F6-6', 'Label|styles-mixtes||@Size=md, State=hover']));
});

test('S2 : un style différent se juge dans son groupe de taille ; le groupe de taille, trois variants, un texte masqué et deux layers de même nom ont leur oracle', () => {
  assert.deepEqual(['S2-1', 'S2-2', 'S2-3', 'S2-4'].map((id) => cas(id).attendus),
    ['Size=sm, State=default', 'Size=md, State=hover', 'Size=lg, State=pressed', 'Size=lg, State=disabled'].map((nom) => [a64('Label', 'style-different', [nom], 'Label/Caption')]));
  assert.deepEqual(['S2-5', 'S2-6', 'S2-7'].map((id) => [cas(id).verdict, cas(id).question, cas(id).attendus]), Array(3).fill(['mesure', 'Q-F6-2', []]));
  assert.deepEqual(cas('S2-8').attendus, [], 'deux variants : un seul voisin ne fait pas une unanimité');
  assert.equal(cas('S2-9').question, 'Q-F6-2');
  assert.deepEqual(cas('S2-10').attendus, [], 'trois styles différents : aucune unanimité');
  assert.deepEqual(cas('S2-11').attendus, [], 'deux layers de même nom aux styles unanimes');
  assert.deepEqual(cas('S2-12').attendus.map((attendu) => attendu.cle),
    ['Text|style-different||Label/Serif@Size=md, State=hover', 'Text|style-different||Label/Mono@Size=md, State=hover']);
  assert.deepEqual([cas('S2-12').verdict, cas('S2-12').question], ['mesure', 'Q-F6-2']);
  assert.deepEqual([cas('S2-13').verdict, cas('S2-13').attendus], ['mesure', []], 'un layer renommé');
  assert.deepEqual([cas('S2-14').attendus, cas('S2-15').attendus], [[], []], 'un texte masqué, un texte sous un parent masqué');
});

test('S3 : une taille ou une graisse liée hors de typography donne mauvaise-collection, une liaison absente chez un seul variant sans-liaison-comme-les-autres', () => {
  assert.deepEqual(cas('S3-1').attendus, [a65('Label', 'mauvaise-collection', [premier], 'fontSize', 'dimension/none')]);
  assert.deepEqual(['S3-1', 'S3-2', 'S3-3', 'S3-4', 'S3-5', 'S3-6', 'S3-7', 'S3-8'].map((id) => cas(id).attendus[0].code), Array(8).fill('C65'));
  assert.deepEqual(cas('S3-5').attendus, [a65('Label', 'mauvaise-collection', [premier], 'fontWeight', 'dimension/none')]);
  assert.deepEqual(['S3-9', 'S3-10', 'S3-11'].map((id) => [cas(id).verdict, cas(id).question]), Array(3).fill(['mesure', 'Q-F6-7']));
  assert.deepEqual(['S3-12', 'S3-13', 'S3-14', 'S3-15'].map((id) => cas(id).attendus),
    [[a65('Label', 'sans-liaison-comme-les-autres', [premier], 'fontSize')], [a65('Label', 'sans-liaison-comme-les-autres', ['Size=lg, State=disabled'], 'fontSize')],
      [a65('Label', 'sans-liaison-comme-les-autres', [premier], 'fontWeight')], [a65('Label', 'sans-liaison-comme-les-autres', ['Size=lg, State=disabled'], 'fontWeight')]]);
  assert.deepEqual(['S3-16', 'S3-17', 'S3-18', 'S3-19', 'S3-20', 'S3-21'].map((id) => cas(id).attendus), Array(6).fill([]), 'liaisons valides, autre champ, illisible, collection absente');
});

test('I1 à I3 : l\'icône qui n\'est pas une instance de library, sa taille et sa couleur donnent le motif de C66 qui les décrit', () => {
  assert.deepEqual(['I1-1', 'I1-2', 'I1-3', 'I1-4'].map((id) => cas(id).attendus),
    ['instance-locale', 'pas-une-instance', 'pas-une-instance', 'pas-une-instance'].map((motif) => [a66('Icon', motif, [premier])]));
  assert.deepEqual(cas('I2-1').attendus, [a66('Icon', 'taille-sans-variable', [premier])]);
  assert.deepEqual(cas('I2-2').attendus, [a66('Icon', 'taille-hors-icone', [premier], { champ: 'width', detail: 'sizing/16' }), a66('Icon', 'taille-hors-icone', [premier], { champ: 'height', detail: 'sizing/16' })]);
  assert.deepEqual([cas('I2-3').verdict, cas('I2-3').question, cas('I2-3').attendus], ['mesure', 'Q-F6-1', []]);
  assert.deepEqual(cas('I2-4').attendus.map((attendu) => attendu.cle.split('|').slice(1, 4).join('|')), [`taille-hors-icone|width|dimension/none@${premier}`, `taille-hors-icone|height|dimension/none@${premier}`]);
  assert.deepEqual([cas('I2-5').attendus, cas('I2-6').attendus], [[], []], 'largeur seule liée, deux variables de layout/icon');
  assert.deepEqual(cas('I3-1').attendus, [a66('Icon', 'couleur-sans-variable', [premier])]);
  assert.deepEqual(cas('I3-2').attendus, [a66('Icon', 'couleur-hors-premier-plan', [premier], { detail: 'neutral/surface/border' })]);
  assert.deepEqual([cas('I3-3').question, cas('I3-3').attendus, cas('I3-5').question, cas('I3-5').attendus], ['Q-F6-1', [], 'Q-F6-5', []]);
  assert.deepEqual(cas('I3-4').attendus, [a66('Icon', 'couleur-hors-premier-plan', [premier], { detail: 'color/primary/light/500' })]);
});

test('I4 et I5 : un constat par nom de layer, aucun pour une icône masquée, un constat unique pour 12 variants ; la propriété absente donne C67', () => {
  assert.deepEqual(cas('I4-1').attendus, [a66('icon-right', 'couleur-sans-variable', [premier])]);
  assert.deepEqual(cas('I4-2').attendus, [a66('icon-left', 'couleur-sans-variable', [premier]), a66('icon-right', 'couleur-sans-variable', [premier])]);
  assert.deepEqual([cas('I4-3').attendus, cas('I4-4').attendus], [[], []]);
  assert.equal(cas('I4-5').attendus.length, 1);
  assert.ok(cas('I4-5').attendus[0].cle.startsWith('Icon|couleur-sans-variable||@12 variants'));
  assert.deepEqual(cas('I5-1').attendus, [a67('Icon', 'propriete-absente', [premier], 'Missing#9:9')]);
  assert.ok(cas('I5-2').attendus[0].cle.startsWith('Icon|propriete-absente||Icon#1:2@12 variants'));
  assert.deepEqual(cas('I5-3').attendus, [a67('Icon', 'icone-non-pilotee', [premier])]);
  assert.deepEqual(['I5-4', 'I5-5', 'I5-6', 'I5-7'].map((id) => [cas(id).verdict, cas(id).question, cas(id).attendus]), Array(4).fill(['mesure', 'Q-F6-4', []]));
});

test('I6 : 31 layers, 10 non-icônes, 6 icônes, 7 ambiguës et 8 couples ; les trois définitions se comparent sans pinner le kit', () => {
  assert.equal(DEFINITIONS_D_ICONE.length, 31);
  assert.deepEqual(DEFINITIONS_D_ICONE.slice(0, 10).map((d) => d.nom), ['Silicone', 'Silicon', 'Lexicon', 'Semiconductor', 'Iconoclast', 'Iconography', 'IconButton', 'icon-container', 'icon-label', 'Icon']);
  assert.ok(DEFINITIONS_D_ICONE.slice(0, 10).every((d) => !d.estUneIcone && d.verdict === 'attendu'));
  assert.deepEqual(DEFINITIONS_D_ICONE.slice(10, 16).map((d) => [d.nom, d.type, d.estUneIcone, d.verdict]),
    [['icon', 'INSTANCE', true, 'attendu'], ['Icon/Left', 'INSTANCE', true, 'attendu'], ['leading-icon', 'INSTANCE', true, 'attendu'],
      ['trailing icon', 'INSTANCE', true, 'attendu'], ['Icon', 'INSTANCE', true, 'attendu'], ['Slot', 'INSTANCE', true, 'attendu']]);
  assert.deepEqual(DEFINITIONS_D_ICONE.slice(16, 23).map((d) => [d.nom, d.verdict]), ['Pictogram', 'Glyph', 'icône', 'Symbol', 'Vector', 'Ico', 'icons'].map((nom) => [nom, 'mesure']));
  assert.deepEqual(DEFINITIONS_D_ICONE.slice(23).map((d) => `${d.nom}:${d.type}`),
    ['icon:INSTANCE', 'icon:FRAME', 'icon:VECTOR', 'icon:BOOLEAN_OPERATION', 'Silicone:INSTANCE', 'Silicone:FRAME', 'Silicone:VECTOR', 'Silicone:BOOLEAN_OPERATION']);
  assert.equal(duOperateur('I6').filter((entree) => entree.verdict === 'mesure').length, 11);
  assert.ok(duOperateur('I6').every((entree) => entree.ecartConnu === 'E-26'));
  // Un vecteur nommé icon est une icône pour les trois fonctions, une icône de library ou un texte nommé Lexicon n'est jamais jugé par C49.
  assert.deepEqual(verdictsDesTroisFonctions(base, DEFINITIONS_D_ICONE[25]), { c66: true, c49: true, c17: true });
  assert.equal(verdictsDesTroisFonctions(base, DEFINITIONS_D_ICONE[2]).c49, false);
});

test('les 180 faux positifs : 60 profils, 88 valeurs attestées, 9 valeurs limites et 23 composants de F6', () => {
  assert.equal(FP.length, 180);
  const compte = (operateur: string): number => FP.filter((entree) => entree.operateur === operateur).length;
  assert.deepEqual(['FP1', 'FP2', 'FP3', 'FP4'].map(compte), [60, 88, 9, 23]);
  for (const operateur of ['FP1', 'FP2', 'FP3', 'FP4']) FP.filter((entree) => entree.operateur === operateur).forEach((entree, rang) => assert.equal(entree.id, `${operateur}-${rang + 1}`));
  assert.equal(new Set(FP.map((entree) => entree.id)).size, 180);
  assert.deepEqual(parQuestion(FP), { 'Q-F5-5': ['FP2-59', 'FP2-62', 'FP2-65', 'FP2-68'], 'Q-F5-10': ['FP3-1', 'FP3-2', 'FP3-3', 'FP3-4'] });
  assert.ok(FP.slice(0, 60).every((entree) => entree.attendus.length === 0));
  assert.ok(FP.filter((entree) => entree.operateur === 'FP4').every((entree) => entree.attendus.length === 0));
});

test('FP2 : l\'oracle d\'une valeur attestée vient des registres, pas du corpus', () => {
  const fp2 = (valeur: string, categorie = ''): CasDeVariants => FP.find((entree) => entree.operateur === 'FP2' && entree.entree.description.includes(`l'unique valeur ${valeur} (${categorie}`))!;
  assert.deepEqual(fp2('XXL').attendus, [c10('XXL', '2xl')], 'XXL est une forme tolérée de 2xl');
  assert.deepEqual(fp2('Rest').attendus, [c8('Rest', 'default')]);
  assert.deepEqual(fp2('Hovered').attendus, [c8('Hovered', 'hover')]);
  assert.deepEqual(fp2('Disable').attendus, [c8('Disable', 'disabled')]);
  // Small, Medium et Large sont les formes de dossier du registre des tailles : le plan les compte à tort parmi les formes tolérées.
  assert.deepEqual([fp2('Small').attendus, fp2('Medium').attendus, fp2('Large').attendus], [[], [], []]);
  assert.deepEqual([fp2('Primary').attendus, fp2('Solid').attendus, fp2('Default').attendus, fp2('Mini').attendus], [[], [], [], []]);
  assert.deepEqual([fp2('Critical').verdict, fp2('Critical').attendus], ['mesure', [c8('Critical', 'danger')]]);
  assert.deepEqual([fp2('Error', 'palette').verdict, fp2('Error', 'palette').attendus.map((attendu) => attendu.cle)], ['mesure', ['Error>danger']]);
  assert.deepEqual([fp2('Error', 'etat').verdict, fp2('Error', 'etat').attendus], ['attendu', []], 'Error est un état sans forme tolérée');
  assert.equal(FP.filter((entree) => entree.operateur === 'FP2' && entree.attendus.length > 0).length, 13);
});

test('FP3 et FP4 : quatre valeurs à point ou à barre en attente de Q-F5-10, 23 composants de F6 sans constat attendu', () => {
  assert.deepEqual(FP.filter((entree) => entree.operateur === 'FP3').map((entree) => entree.verdict), [...Array(4).fill('mesure'), ...Array(5).fill('attendu')]);
  assert.deepEqual(FP.filter((entree) => entree.operateur === 'FP4').map((entree) => entree.ecartConnu), [...Array(11).fill(undefined), ...Array(10).fill('E-26'), undefined, undefined]);
  assert.deepEqual(FP.filter((entree) => entree.operateur === 'FP4').slice(11, 21).map((entree) => entree.entree.description.split(' ')[4]),
    ['Silicone', 'Silicon', 'Lexicon', 'Semiconductor', 'Iconoclast', 'Iconography', 'IconButton', 'icon-container', 'icon-label', 'Icon']);
});

test('les 32 interactions sont les 16 couples du plan sur P0 et sur p18, chacun avec son oracle', () => {
  assert.equal(INTERACTIONS.length, 32);
  assert.deepEqual(INTERACTIONS.map((entree) => entree.id), COUPLES.flatMap((couple) => [`${couple}-P0`, `${couple}-p18`]));
  assert.equal(COUPLES.length, 16);
  assert.deepEqual(parQuestion(INTERACTIONS), { 'Q-F5-4': ['V1+V1-P0', 'V1+V1-p18'], 'Q-F5-3': ['A3+V1-P0', 'A3+V1-p18'], 'Q-F5-2': ['A4+V1-P0', 'A4+V1-p18'], 'Q-F6-5': ['I2+I3-P0', 'I2+I3-p18'] });
  for (const entree of INTERACTIONS) assert.ok(entree.entree.description.startsWith(`${entree.operateur} sur ${entree.id.endsWith('p18') ? 'p18' : 'P0'} :`), entree.id);
});

test('V1+M1, V1+O1 et V1+V1 : les constats de chaque dégradation restent indépendants, sans présélection', () => {
  const retire = P0.releve.variants.find((variant) => variant.valeurs.Style === 'outline')!.valeurs;
  const c31 = codes(interaction('V1+M1', 'P0')).C31;
  assert.equal(c31, 1, 'seule la combinaison retirée manque');
  const m1 = interaction('V1+M1', 'P0').attendus;
  assert.ok(m1.some((attendu) => attendu.cle === c7('Style', 'Tonal').cle));
  assert.deepEqual(m1.find((attendu) => attendu.code === 'C12')!.candidats, ['outline']);
  assert.equal(m1.find((attendu) => attendu.code === 'C31')!.cle, `Color=${retire.Color}|Size=${retire.Size}|State=${retire.State}|Style=Tonal`);
  const o1 = interaction('V1+O1', 'P0').attendus;
  assert.deepEqual(o1.find((attendu) => attendu.code === 'C12')!.candidats, ['outline'], 'l\'orphelin d\'un autre axe n\'entre pas dans les candidats');
  assert.ok(o1.some((attendu) => attendu.cle === 'button/color/primary/solid/small/selected/background|sans-variant'));
  const v1 = interaction('V1+V1', 'P0');
  assert.deepEqual(v1.attendus.filter((attendu) => attendu.code === 'C7').map((attendu) => attendu.cle).sort(), ['Color=Destructive', 'Size=Compact']);
  assert.ok(v1.attendus.every((attendu) => attendu.code !== 'C12' && attendu.code !== 'C13'));
});

test('V3+V4, M1+O5, A3+V1, O2+M1 et A4+V1 : C8 seul, C31 de la combinaison retirée, rien pour le second axe, sans-variant plutôt qu\'inutilisé', () => {
  for (const profil of ['P0', 'p18'] as const) {
    assert.deepEqual(interaction('V3+V4', profil).attendus, [c8('hovered', 'hover')]);
    assert.deepEqual(interaction('A3+V1', profil).attendus, []);
    assert.equal(codes(interaction('M1+O5', profil)).C31, 1);
    assert.equal(codes(interaction('O2+M1', profil)).C31, 1);
  }
  const m1o5 = interaction('M1+O5', 'P0').attendus;
  const retire = P0.releve.variants.find((variant) => variant.valeurs.Size === 'lg')!;
  assert.ok(m1o5.some((attendu) => attendu.cle === c7('Size', 'lg').cle));
  assert.ok(!m1o5.some((attendu) => attendu.code === 'C33' && attendu.cle.startsWith(`${retire.id}|`)), 'C33 ne vise que les variants présents');
  assert.ok(interaction('O2+M1', 'P0').attendus.some((attendu) => attendu.cle === 'button/color/primary/solid/small/default/border|sans-variant'));
  assert.ok(!interaction('O2+M1', 'P0').attendus.some((attendu) => attendu.cle.endsWith('/border|inutilise')));
  assert.ok(interaction('A4+V1', 'P0').attendus.some((attendu) => attendu.cle === c7('Variant', 'Tonal').cle));
  assert.ok(interaction('A4+V1', 'p18').attendus.some((attendu) => attendu.cle === c7('Kind', 'Tonal').cle));
});

test('les couples de F6 : deux constats distincts, mauvaise-collection seul, seul l\'écart signalé, deux C66, C66 et C67, C64 seul', () => {
  const A = avecLesCouchesF6(P0).releve.variants;
  const nomA = A[0].nom;
  const nomB = A[36].nom;
  assert.deepEqual(interaction('S2+S1', 'P0').attendus, [a64('Label', 'style-different', [nomA], 'Label/Caption'), a64('Label', 'sans-style-ni-variables', [nomB])]);
  assert.deepEqual(interaction('S3+S3', 'P0').attendus, [a65('Label', 'mauvaise-collection', [nomA], 'fontSize', 'dimension/none')]);
  assert.deepEqual(interaction('S2+S2', 'P0').attendus, [a64('Label', 'style-different', [nomA], 'Label/Caption')]);
  assert.deepEqual(interaction('I1+I2', 'P0').attendus, [a66('Icon', 'instance-locale', [nomA]), a66('Icon', 'taille-sans-variable', [nomA])]);
  assert.deepEqual(interaction('I1+I5', 'P0').attendus, [a66('Icon', 'instance-locale', [nomA]), a67('Icon', 'propriete-absente', [nomA], 'Missing#9:9')]);
  assert.deepEqual(interaction('S1+I6', 'P0').attendus, [a64('Silicone', 'sans-style-ni-variables', [nomA])]);
  assert.deepEqual(interaction('I2+I3', 'P0').attendus, [a66('Icon', 'taille-sans-variable', [nomA])]);
  const v1i2 = interaction('V1+I2', 'P0').attendus;
  assert.ok(v1i2.some((attendu) => attendu.cle === c7('Style', 'Tonal').cle) && v1i2.some((attendu) => attendu.cle === a66('Icon', 'taille-sans-variable', [nomA]).cle), 'l\'union des deux oracles');
  assert.deepEqual(interaction('S1+I6', 'p18').attendus.length, 1);
});

test('chaque cas de F6, faux positif ou interaction que l\'on dégrade revient à la base une fois la dégradation annulée', () => {
  const echantillon: CasDeVariants[] = [
    'S1-1', 'S1-6', 'S2-9', 'S2-12', 'S3-1', 'S3-12', 'S3-21', 'I1-3', 'I2-3', 'I3-5', 'I4-2', 'I4-4', 'I5-1', 'I5-4',
  ].map(cas);
  echantillon.push(parId(FP, 'FP4-12'), parId(FP, 'FP4-22'), interaction('V1+I2', 'P0'), interaction('S1+I6', 'p18'), interaction('I2+I3', 'P0'), interaction('V1+M1', 'P0'));
  for (const entree of echantillon) {
    const { composant, annuler, base: origine } = entree.entree.materialiser!();
    const avant = JSON.stringify({ releve: origine.releve, catalogue: origine.catalogue });
    const degrade = JSON.stringify({ releve: composant.releve, catalogue: composant.catalogue });
    assert.notEqual(degrade, avant, `${entree.id} dégrade quelque chose`);
    annuler();
    assert.equal(JSON.stringify({ releve: composant.releve, catalogue: composant.catalogue }), avant, `${entree.id} annulé`);
  }
  assert.equal(JSON.stringify({ releve: base.releve, catalogue: base.catalogue }), baseAvant);
});

test('Rel-1 et Rel-2 : un composant à ordre mélangé ou à noms d\'axe réécrits garde ses constats, et une différence se voit', () => {
  assert.equal(autreEcritureDuNom('Style'), 'style');
  assert.equal(autreEcritureDuNom('Icon'), undefined, 'un nom qui n\'est pas un axe n\'a pas d\'autre écriture');
  const copie = composantP0();
  const changes = reecrireLesNomsDAxe(copie);
  assert.deepEqual([...changes.entries()], [['Style', 'style'], ['Color', 'color'], ['Size', 'size'], ['State', 'state']]);
  assert.deepEqual(copie.releve.proprietes.filter((propriete) => propriete.type === 'VARIANT').map((propriete) => propriete.nom), ['style', 'color', 'size', 'state']);
  assert.ok(copie.releve.variants[0].nom.startsWith('style=solid, color=primary'));
  assert.deepEqual(Object.keys(copie.releve.variants[0].valeurs), ['style', 'color', 'size', 'state']);

  const s21 = cas('S2-1');
  const rendu = executerLesControles(s21.entree.materialiser!().composant, controlesDuCas(s21), 10_000);
  const origine = 'constats' in rendu ? rendu.constats : [];
  assert.ok(origine.some((constat) => constat.code === 'C67'), 'S2-1 émet au moins la limite de C67');
  const identique = verifierLesRelations(s21, origine, GRAINE_PAR_DEFAUT, 10_000);
  assert.deepEqual(identique.applicables, { ordre: true, 'nom-d-axe': true });
  assert.deepEqual([identique.ecarts, identique.exceptions], [[], []]);
  // Comparé à une origine vide, le même rejeu signale une différence dans les deux relations.
  const sansOrigine = verifierLesRelations(s21, [], GRAINE_PAR_DEFAUT, 10_000);
  assert.deepEqual(sansOrigine.ecarts.map((ecart) => ecart.relation).sort(), ['nom-d-axe', 'ordre']);
  const sansComposant = verifierLesRelations(parId(tousLesCas(P0), 'A1-1'), [], GRAINE_PAR_DEFAUT, 1000);
  assert.deepEqual(sansComposant.applicables, { ordre: false, 'nom-d-axe': false });
});

test('une même graine rend les mêmes cas de F6, de faux positifs et d\'interactions', () => {
  const noms = (liste: readonly CasDeVariants[]): string[] => liste.map((entree) => `${entree.id}|${entree.entree.description}`);
  assert.deepEqual(noms(tousLesCasDeF6(composantP0(), GRAINE_PAR_DEFAUT)), noms(F6));
  assert.deepEqual(noms(fauxPositifs(GRAINE_PAR_DEFAUT)), noms(FP));
  assert.deepEqual(noms(interactions(GRAINE_PAR_DEFAUT)), noms(INTERACTIONS));
});
