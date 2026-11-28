/**
 * Le comparateur du banc, sans moteur : le rendu lu se fabrique depuis le modèle de vérité, et chaque défaut s'injecte dans ce rendu.
 * Le comparateur doit voir chaque défaut, laisser passer un écart que la perte prévue couvre, et refuser une perte au mauvais chemin
 * ou au mauvais objet. Le document est une pièce à quatre variantes (taille et état) que l'hôte pose, avec ses valeurs imposées.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { ajouterUnJeu, calqueDe, idDeCopie, instancier, poserUnCalque, surcharger } from './generateur/capacites';
import { comparer, ecartsDeRendu, type Diagnostic } from './generateur/comparateur';
import { EQUIVALENCES, PROJECTION } from './generateur/equivalences';
import { generer, tirerSpec } from './generateur/generateur';
import { actualiserInventaires, actualiserLesCouleurs, alias, copie, dresserCarte, resoudreLesModes } from './generateur/modele';
import { CODE_DE_PERTE, PERTES, PROPRIETES_PARTIELLES } from './generateur/pertes';
import { RACINE, jetonDeVariable, type RenduNormalise } from './generateur/rendu';
import { reduireLeDocumentDuBanc, signatureDEcart } from './generateur/reductionDuBanc';
import { occurrencesAtteignables, renduAttendu, type Cible } from './generateur/verite';
import type { DocumentGenere } from './generateur/types';
import { TABLE } from './couvertureFigma.table';

const jet = (nom: string) => jetonDeVariable('components', nom);
const RACINE_DE_LA_PIECE = RACINE;

interface Options {
  /** Une seconde variante `Size=Large, State=Default` : la sélection de cette coordonnée n'est plus unique. */
  doublon?: boolean;
  /** Deux `Label` frères dans chaque variante, et une valeur imposée au second. */
  homonymes?: boolean;
}

/**
 * L'hôte pose `Piece` dans son variant `v` : l'instance cite `Size=Small, State=Hover`, que l'hôte a peinte (texte et accent) et dont
 * il règle le slot (largeur et opacité, sans borne). Les variantes `Hover` portent un `Accent` que `Default` n'a pas.
 */
function documentAvecPiece(options: Options = {}): DocumentGenere {
  const doc = generer(4242, { ...tirerSpec(4242, 1), nom: 'Hote', anatomie: ['texte'], construction: ['homonymes'], variantes: 1, profondeur: 1, wrapperTaille: undefined, axes: [{ nom: 'Size', role: 'taille', valeurs: ['Small'] }] });
  const variable = (id: string, nom: string, type: 'COLOR' | 'FLOAT', valeur = 16) => {
    doc.variables.push({ id, key: `cle-${id}`, name: nom, variableCollectionId: 'c', resolvedType: type, scopes: ['ALL_SCOPES'], valuesByMode: { 'c:Valeur': type === 'COLOR' ? alias('theme-fond') : valeur } });
    return id;
  };
  const peinture = (id: string) => ({ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: alias(id) } });
  const t = {
    fondRepos: variable('fond-repos', 'Piece/Color/Rest/background', 'COLOR'),
    fondSurvol: variable('fond-survol', 'Piece/Color/Hover/background', 'COLOR'),
    texte: variable('texte-repos', 'Piece/Color/Rest/foreground', 'COLOR'),
    texteImpose: variable('texte-impose', 'Piece/Color/Override/foreground', 'COLOR'),
    accent: variable('accent-survol', 'Piece/Color/Hover/accent', 'COLOR'),
    accentImpose: variable('accent-impose', 'Piece/Color/Override/accent', 'COLOR'),
    anneau: variable('anneau', 'Piece/Color/Rest/ring', 'COLOR'),
    epaisseur: variable('epaisseur', 'Piece/Size/Medium/border-width', 'FLOAT', 2),
    gap: variable('gap', 'Piece/Size/Medium/gap', 'FLOAT', 8),
    petite: variable('petite', 'Piece/Size/Small/width', 'FLOAT'),
    grande: variable('grande', 'Piece/Size/Large/width', 'FLOAT'),
    borne: variable('borne', 'Piece/Size/Medium/min-width', 'FLOAT'),
    largeurDuSlot: variable('slot-largeur', 'Piece/Size/Slot/width', 'FLOAT'),
    opaciteDuSlot: variable('slot-opacite', 'Piece/Opacity/Slot/opacity', 'FLOAT', 1),
  };

  const variantes = [
    { id: 'p-sd', taille: 'Small', etat: 'Default' },
    { id: 'p-sh', taille: 'Small', etat: 'Hover' },
    { id: 'p-ld', taille: 'Large', etat: 'Default' },
    { id: 'p-lh', taille: 'Large', etat: 'Hover' },
    ...(options.doublon ? [{ id: 'p-ld-bis', taille: 'Large', etat: 'Default' }] : []),
  ];
  ajouterUnJeu(doc, {
    id: 'piece',
    nom: 'Piece',
    variantes: variantes.map(({ id, taille, etat }) => ({
      id,
      valeurs: { Size: taille, State: etat },
      props: {
        layoutMode: 'HORIZONTAL', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER', itemSpacing: 8,
        boundVariables: { itemSpacing: alias(t.gap), width: alias(taille === 'Small' ? t.petite : t.grande), minWidth: alias(t.borne) },
        fills: [peinture(etat === 'Hover' ? t.fondSurvol : t.fondRepos)],
      },
    })),
  });
  for (const { id, etat } of variantes) {
    const texte = (suffixe: string) => poserUnCalque(doc, id, { id: `${id}-${suffixe}`, type: 'TEXT', name: 'Label', props: { characters: 'Texte', fills: [peinture(t.texte)], layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG' } });
    texte('label');
    if (options.homonymes) texte('label2');
    poserUnCalque(doc, id, { id: `${id}-ring`, type: 'RECTANGLE', name: 'Ring', props: { strokes: [peinture(t.anneau)], strokeAlign: 'INSIDE', boundVariables: { strokeWeight: alias(t.epaisseur) } } });
    if (etat === 'Hover') poserUnCalque(doc, id, { id: `${id}-accent`, type: 'RECTANGLE', name: 'Accent', props: { fills: [peinture(t.accent)] } });
  }

  // `instancier` ne recopie pas les champs de la racine du maître : l'instance les reprend, sauf la boîte, que le slot règle.
  const maitre = calqueDe(doc, 'p-sh');
  const occurrence = instancier(doc, { id: 'occ', parent: 'v', maitre: 'p-sh', name: 'Piece' });
  for (const champ of ['layoutMode', 'primaryAxisAlignItems', 'counterAxisAlignItems', 'itemSpacing', 'fills']) occurrence.props[champ] = copie(maitre.props[champ]);
  occurrence.props.boundVariables = { itemSpacing: maitre.props.boundVariables.itemSpacing, width: alias(t.largeurDuSlot), opacity: alias(t.opaciteDuSlot) };
  surcharger(doc, 'occ', idDeCopie('occ', options.homonymes ? 'p-sh-label2' : 'p-sh-label'), 'fills', [peinture(t.texteImpose)]);
  surcharger(doc, 'occ', idDeCopie('occ', 'p-sh-accent'), 'fills', [peinture(t.accentImpose)]);

  resoudreLesModes(doc);
  actualiserLesCouleurs(doc);
  actualiserInventaires(doc);
  doc.oracle = dresserCarte(doc, [], []);
  return doc;
}

const ADRESSE = ['Piece#0'];
const occurrence = (o: { coordonnees?: Record<string, string>; etat?: string }): Cible => ({ variant: 'v', occurrence: { adresse: ADRESSE, ...o } });
const VERS_DEFAULT = occurrence({ etat: 'Default' });

/** Le contrat lu, tel que le modèle de vérité l'attend : une copie du rendu attendu, avec le lieu que le lecteur du kit y écrirait. */
function luDepuisLeModele(attendu: RenduNormalise, cheminDuContrat = 'variants[0].pieces[0]'): RenduNormalise {
  const lu = copie(attendu);
  lu.cheminDuContrat = cheminDuContrat;
  lu.adresses = Object.fromEntries(Object.keys(lu.calques).map((id) => [id, id === RACINE ? [] : id.split(' › ').map((s) => s.replace(/#\d+$/, '').toLowerCase())]));
  return lu;
}

const perte = (property: string, contractPath = 'variants[0].pieces[0]', plus: Record<string, unknown> = {}): Diagnostic => ({
  code: CODE_DE_PERTE, severity: 'warning', message: `${property} manque à l’adresse ["ring"].`, contractPath, figma: { property }, ...plus,
});

test('l’occurrence vers Default : la valeur imposée suit le calque, le calque absent ne reçoit rien, le slot règle la boîte', () => {
  const doc = documentAvecPiece();
  const { calques } = renduAttendu(doc, VERS_DEFAULT);
  assert.deepEqual(Object.keys(calques).sort(), [RACINE_DE_LA_PIECE, 'Label#0', 'Ring#0'], 'Accent n’existe pas en Default : l’accent imposé ne va nulle part');
  assert.deepEqual(calques['Label#0'].couleurs, [jet('Piece/Color/Override/foreground')], 'le texte imposé par l’hôte vaut dans la variante atteinte');
  assert.deepEqual(calques[RACINE_DE_LA_PIECE].couleurs, [jet('Piece/Color/Rest/background')], 'une couleur que l’hôte n’a pas imposée vient de la variante atteinte, pas de la variante citée');
  assert.deepEqual(calques[RACINE_DE_LA_PIECE].boite, { largeur: jet('Piece/Size/Slot/width'), opacite: jet('Piece/Opacity/Slot/opacity') }, 'le slot fait autorité : ni la largeur ni la borne de la racine de la pièce');
  assert.equal(calques[RACINE_DE_LA_PIECE].flux?.gap, jet('Piece/Size/Medium/gap'), 'le flux intérieur reste celui de la racine de la pièce');
  assert.equal(calques['Ring#0'].contours?.[0].largeur, jet('Piece/Size/Medium/border-width'));
});

test('sans changement d’axe ni d’état, le rendu est le dessin de l’instance, accent imposé compris', () => {
  const doc = documentAvecPiece();
  const { calques } = renduAttendu(doc, occurrence({}));
  assert.deepEqual(Object.keys(calques).sort(), [RACINE_DE_LA_PIECE, 'Accent#0', 'Label#0', 'Ring#0']);
  assert.deepEqual(calques['Accent#0'].couleurs, [jet('Piece/Color/Override/accent')]);
  assert.deepEqual(calques[RACINE_DE_LA_PIECE].couleurs, [jet('Piece/Color/Hover/background')]);
});

test('un axe exposé change la taille : l’accent imposé suit dans la variante qui le porte, la boîte reste celle du slot', () => {
  const doc = documentAvecPiece();
  const { calques } = renduAttendu(doc, occurrence({ coordonnees: { Size: 'Large' } }));
  assert.deepEqual(calques['Accent#0'].couleurs, [jet('Piece/Color/Override/accent')]);
  assert.deepEqual(calques['Label#0'].couleurs, [jet('Piece/Color/Override/foreground')]);
  assert.equal(calques[RACINE_DE_LA_PIECE].boite?.largeur, jet('Piece/Size/Slot/width'));
});

test('chaque variante atteignable par la taille et l’état se rend, la boîte du slot partout', () => {
  const doc = documentAvecPiece();
  const atteintes = occurrencesAtteignables(doc, 'v', ADRESSE, ['Size']);
  assert.equal(atteintes.length, 4);
  for (const o of atteintes) {
    const rendu = renduAttendu(doc, { variant: 'v', occurrence: o });
    assert.equal(rendu.nonResolu, undefined, JSON.stringify(o.coordonnees));
    assert.deepEqual(rendu.calques[RACINE_DE_LA_PIECE].boite, { largeur: jet('Piece/Size/Slot/width'), opacite: jet('Piece/Opacity/Slot/opacity') }, JSON.stringify(o.coordonnees));
    assert.deepEqual(rendu.calques['Label#0'].couleurs, [jet('Piece/Color/Override/foreground')], JSON.stringify(o.coordonnees));
    assert.equal('Accent#0' in rendu.calques, o.coordonnees!.State === 'Hover', JSON.stringify(o.coordonnees));
  }
});

test('une adresse qui ne désigne pas une instance n’a pas de rendu', () => {
  assert.throws(() => renduAttendu(documentAvecPiece(), { variant: 'v', occurrence: { adresse: ['Header#0'] } }), /occurrence introuvable/);
});

test('sélection double ou nulle : aucune variante choisie, résultat non résolu', () => {
  const double = renduAttendu(documentAvecPiece({ doublon: true }), occurrence({ coordonnees: { Size: 'Large' }, etat: 'Default' }));
  assert.equal(double.nonResolu, 'selection-non-unique');
  assert.deepEqual(double.calques, {});
  assert.equal(renduAttendu(documentAvecPiece(), occurrence({ coordonnees: { Size: 'Huge' } })).nonResolu, 'selection-non-unique');
  assert.equal(renduAttendu(documentAvecPiece({ doublon: true }), occurrence({ coordonnees: { Size: 'Small' }, etat: 'Default' })).nonResolu, undefined, 'une coordonnée à variante unique se résout');
});

test('deux frères de même nom sur le chemin d’un écart : non résolu, hors de l’état cité', () => {
  const doc = documentAvecPiece({ homonymes: true });
  assert.equal(renduAttendu(doc, VERS_DEFAULT).nonResolu, 'appariement-ambigu');
  const citee = renduAttendu(doc, occurrence({}));
  assert.equal(citee.nonResolu, undefined, 'sans changement, le renvoi se rend complet, sans apparier');
  assert.deepEqual(Object.keys(citee.calques).filter((k) => k.startsWith('Label')).sort(), ['Label#0', 'Label#1']);
});

test('un défaut injecté dans le rendu lu fait échouer le comparateur, et le rendu lu fidèle passe', () => {
  const doc = documentAvecPiece();
  const attendu = renduAttendu(doc, VERS_DEFAULT);
  assert.deepEqual(comparer(attendu, luDepuisLeModele(attendu), []), []);
  const racine = RACINE_DE_LA_PIECE;
  const defauts: { nom: string; injecter: (lu: RenduNormalise) => void; ecart: [string, string] }[] = [
    {
      nom: 'l’opacité du slot appliquée une seconde fois au contenu',
      injecter: (lu) => { lu.calques['Label#0'].boite = { opacite: lu.calques[racine].boite!.opacite }; },
      ecart: ['Label#0', 'boite'],
    },
    {
      nom: 'une borne de la racine de la pièce héritée malgré son absence sur le slot',
      injecter: (lu) => { lu.calques[racine].boite = { ...lu.calques[racine].boite, bornes: { minWidth: jet('Piece/Size/Medium/min-width') } }; },
      ecart: [racine, 'boite'],
    },
    {
      nom: 'la taille de la racine de la pièce appliquée malgré le slot',
      injecter: (lu) => { lu.calques[racine].boite = { ...lu.calques[racine].boite, largeur: jet('Piece/Size/Small/width') }; },
      ecart: [racine, 'boite'],
    },
    {
      nom: 'une valeur imposée perdue dans la variante atteinte',
      injecter: (lu) => { lu.calques['Label#0'].couleurs = [jet('Piece/Color/Rest/foreground')]; },
      ecart: ['Label#0', 'couleurs'],
    },
    {
      nom: 'une valeur imposée appliquée à un calque absent de la variante atteinte',
      injecter: (lu) => { lu.calques['Accent#0'] = { visible: true, couleurs: [jet('Piece/Color/Override/accent')] }; },
      ecart: ['Accent#0', 'calque'],
    },
  ];
  for (const defaut of defauts) {
    const lu = luDepuisLeModele(attendu);
    defaut.injecter(lu);
    const ecarts = comparer(attendu, lu, []);
    assert.deepEqual(ecarts.map((e) => [e.identite, e.champ]), [defaut.ecart], defaut.nom);
  }
});

test('une perte couvre l’écart seulement par son chemin, son objet et son champ', () => {
  const doc = documentAvecPiece();
  const attendu = renduAttendu(doc, VERS_DEFAULT);
  const lu = luDepuisLeModele(attendu);
  lu.calques['Ring#0'].contours = [{ couleur: attendu.calques['Ring#0'].contours![0].couleur, alignement: 'inside' }];
  assert.equal(comparer(attendu, lu, []).length, 1, 'la largeur du contour manque : un écart');
  assert.deepEqual(comparer(attendu, lu, [perte('strokeWeight')]), [], 'la perte de strokeWeight au renvoi couvre l’écart');
  assert.equal(comparer(attendu, lu, [perte('strokeWeight', 'variants[1].pieces[0]')]).length, 1, 'une perte au chemin d’un autre renvoi ne le couvre pas');
  assert.equal(comparer(attendu, lu, [perte('cornerRadius')]).length, 1, 'une perte d’un autre objet ne le couvre pas');
  assert.equal(comparer(attendu, lu, [perte('isMask')]).length, 1, 'une perte dont l’objet touche un autre champ de rendu ne le couvre pas');
  assert.equal(comparer(attendu, lu, [{ ...perte('strokeWeight'), code: 'UCM_EXPORT_NOTICE' }]).length, 1, 'une note d’export n’est pas une perte');
  assert.equal(comparer(attendu, { ...lu, cheminDuContrat: undefined }, [perte('strokeWeight')]).length, 1, 'sans lieu lu, aucune perte ne couvre');

  const regroupee = luDepuisLeModele(attendu, 'pieces.Piece.variants[2]');
  regroupee.calques['Ring#0'] = lu.calques['Ring#0'];
  const enClasse = (slotPath: string[], contractPath = 'pieces.Piece.variants') => perte('strokeWeight', contractPath, { slotPath });
  assert.deepEqual(comparer(attendu, regroupee, [enClasse(['ring'])]), [], 'une perte regroupée couvre le calque de son slotPath dans chaque variante du tableau');
  assert.equal(comparer(attendu, regroupee, [enClasse(['label'])]).length, 1, 'un autre slotPath ne le couvre pas');
  assert.equal(comparer(attendu, regroupee, [enClasse(['ring'], 'pieces.Autre.variants')]).length, 1, 'le tableau d’une autre pièce ne le couvre pas');
});

test('une occurrence non résolue des deux côtés passe avec la perte de sa cause, jamais sans elle ni avec une autre', () => {
  const doc = documentAvecPiece({ doublon: true });
  const attendu = renduAttendu(doc, occurrence({ coordonnees: { Size: 'Large' }, etat: 'Default' }));
  const lu: RenduNormalise = { variant: 'v', calques: {}, nonResolu: 'selection-non-unique', cheminDuContrat: 'variants[0].pieces[0]' };
  const selection: Diagnostic = { code: CODE_DE_PERTE, severity: 'warning', message: 'La sélection de variante n’est pas unique : aucun variant choisi.', contractPath: 'variants[0].pieces[0]' };
  const appariement: Diagnostic = { ...selection, message: 'Deux frères de même nom sur le chemin d’un écart.' };
  assert.deepEqual(comparer(attendu, lu, [selection]), []);
  assert.equal(comparer(attendu, lu, []).length, 1, 'sans perte, l’écart reste');
  assert.equal(comparer(attendu, lu, [appariement]).length, 1, 'la perte de l’autre cause ne couvre pas');
  assert.equal(comparer(attendu, lu, [{ ...selection, contractPath: 'variants[3].pieces[0]' }]).length, 1, 'la perte d’un autre renvoi ne couvre pas');
  assert.equal(comparer(attendu, { ...lu, nonResolu: undefined, calques: renduAttendu(documentAvecPiece(), VERS_DEFAULT).calques }, [selection]).length, 1, 'une lecture qui résout alors que le modèle ne résout pas est un écart que rien ne couvre');
  assert.equal(comparer(renduAttendu(documentAvecPiece(), VERS_DEFAULT), lu, [selection]).length, 1, 'une lecture qui ne résout pas alors que le modèle résout : aucune perte de transfert');
  assert.deepEqual(ecartsDeRendu(attendu, lu).map((e) => [e.identite, e.champ]), [[RACINE, 'resolution']]);
});

test('les seules pertes de résolution admises sont la sélection non unique et l’appariement ambigu', () => {
  assert.deepEqual(PERTES.filter((p) => p.champs.includes('resolution')).map((p) => p.cle), ['selection-non-unique', 'appariement-ambigu']);
  assert.ok(!PERTES.some((p) => /transfert/i.test(p.cle + p.cas)), 'le contrat n’écrit aucune perte de transfert');
  assert.equal(new Set(PERTES.map((p) => p.cle)).size, PERTES.length);
});

test('les propriétés de chaque ligne du §2.14 viennent de la table de couverture', () => {
  const lignes = PERTES.filter((p) => p.fondement === '§2.14');
  assert.equal(lignes.length, 15, 'une perte par ligne du §2.14');
  for (const ligne of lignes) assert.ok(ligne.proprietes.length > 0, `${ligne.cle} nomme au moins une propriété de l’API`);
  for (const [ligne, noms] of Object.entries(PROPRIETES_PARTIELLES)) {
    for (const nom of noms!) {
      const classee = TABLE.find((e) => e.classe === 'portable' && e.donnee !== undefined && e.proprietes !== '*' && e.proprietes.includes(nom));
      assert.ok(classee, `${nom} (ligne ${ligne}) est une propriété que la table classe portable avec une donnée perdue`);
    }
  }
});

test('la réduction ramène un document à défaut injecté à un plus petit document qui garde le défaut', async () => {
  const doc = documentAvecPiece();
  const FAUX = '{components.piece.color.defaut-injecte}';
  const ecartsDuDocument = async (d: DocumentGenere) => {
    const attendu = renduAttendu(d, VERS_DEFAULT);
    const lu = copie(attendu);
    lu.calques['Label#0'] = { ...lu.calques['Label#0'], couleurs: [FAUX] };
    return comparer(attendu, lu, []);
  };
  const [temoin, ...autres] = await ecartsDuDocument(doc);
  assert.deepEqual(autres, []);
  assert.equal(signatureDEcart(temoin), JSON.stringify(['v', 'Label#0', 'couleurs']));

  const reduit = await reduireLeDocumentDuBanc(doc, temoin, ecartsDuDocument);
  assert.ok(reduit.apres.calques < reduit.avant.calques, `${reduit.avant.calques} calques avant, ${reduit.apres.calques} après`);
  assert.ok(reduit.apres.variables < reduit.avant.variables);
  assert.deepEqual((await ecartsDuDocument(reduit.document)).map(signatureDEcart), [reduit.signature], 'le document réduit rend encore ce seul écart');
  for (const inutile of ['Ring', 'Accent', 'Header', 'Body']) assert.ok(!reduit.document.noeuds.some((n) => n.name === inutile), `${inutile} ne sert pas le défaut`);
});

test('chaque équivalence de projection cite la section de FORMAT.md qui la fonde, et le modèle la lit dans la liste', () => {
  assert.deepEqual(EQUIVALENCES.map((e) => e.cle).sort(), Object.keys(PROJECTION).sort());
  for (const e of EQUIVALENCES) assert.match(e.fondement, /^docs\/format\/FORMAT\.md, « [^»]+ »/, e.cle);

  const hote = documentAvecPiece();
  calqueDe(hote, 'header').props.boundVariables.itemSpacing = alias('taille-gap');
  const sans = (cle: keyof typeof PROJECTION, remplace: unknown) => renduAttendu(hote, { variant: 'v' }, { ...PROJECTION, [cle]: remplace } as typeof PROJECTION).calques;
  assert.equal(renduAttendu(hote, { variant: 'v' }).calques['Header#0'].flux?.gap, undefined, 'un conteneur à un seul enfant ne publie pas son gap');
  assert.ok(sans('gapDUnSeulEnfant', () => true)['Header#0'].flux?.gap, 'sans l’équivalence du gap, le modèle l’écrirait');
  assert.equal(renduAttendu(hote, { variant: 'v' }).calques['Piece#0'].compose, 'Piece');
  assert.equal(sans('nomDuJeuPourUneVariante', (d: DocumentGenere, m: string) => calqueDe(d, m).name)['Piece#0'].compose, 'Size=Small, State=Hover', 'sans l’équivalence du nom, le modèle écrirait celui de la variante');

  const spec = tirerSpec(4242, 1);
  const enveloppe = generer(4242, { ...spec, nom: 'Hote', anatomie: ['texte'], construction: ['wrapper-cache'], variantes: 1, profondeur: 1, axes: spec.axes.filter((a) => a.role !== 'taille'), wrapperTaille: { nom: 'Size', valeur: 'Medium', commun: false } });
  const calquesDe = (projection: typeof PROJECTION) => renduAttendu(enveloppe, { variant: 'v' }, projection).calques;
  assert.ok(calquesDe(PROJECTION)['.sizeWrapperHote#0'], 'le wrapper de taille reste dans la vue, comme un slot facultatif');
  assert.equal(calquesDe(PROJECTION)['.sizeWrapperHote#0'].compose, undefined, 'lu comme un cadre');
  assert.equal(calquesDe({ ...PROJECTION, instanceEnSlotFacultatif: () => false })['.sizeWrapperHote#0'], undefined, 'sans l’équivalence de l’instance, le cadre sans information sortirait de la vue');
  assert.ok(calquesDe({ ...PROJECTION, enveloppeDeTailleEnCadre: () => false })['.sizeWrapperHote#0'].compose, 'sans l’équivalence du wrapper, il serait un composant posé');
});
