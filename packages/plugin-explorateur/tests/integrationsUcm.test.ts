/** Les intégrations UCM facultatives : recette Palettes, association à un cran, profil d'architecture. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { CONVENTIONS, ESPACE_ARCHITECT, normaliserLesNoms } from '@ucm-kit/core/referentiel';
import { FORMAT_RECETTE, recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { indexer } from '../src/indexation';
import { lireLeVocabulaire } from '../src/lecture';
import { lireLaRecette, validerAssociation, variablesDeLAssociation } from '../src/integrations/palettes';
import { coucheRangee, controlerLeProfil, indexDuVocabulaire, nuanceAttendue, variableDuNom } from '../src/integrations/profilUcm';
import type { VocabulaireDuReleve } from '../src/modele';
import { exporterReleve, importerReleve } from '../src/releves';
import { alias, constructeur, couleur, projetLibre } from './fixtures';
import { couchesDuProfilAvecLimites, releveDuProfilAvecLimites } from './fixturesDesLimites';

function recetteAvec(...noms: string[]): Recette {
  const palettes = noms.map((nom, rang) => ({ id: `p${rang}`, nom, reference: '#3366FF', derive: { lien: true, soft: [0, 0], vivid: [0, 0] } }) as unknown as Palette);
  return { ...recetteParDefaut(), palettes };
}

test('la recette se classe sans migration : absente, illisible, future', () => {
  assert.equal(lireLaRecette('').etat, 'absente');
  assert.equal(lireLaRecette('{ casse').etat, 'illisible');
  assert.equal(lireLaRecette(JSON.stringify({ formatVersion: FORMAT_RECETTE + 1 })).etat, 'future');
  assert.equal(lireLaRecette(JSON.stringify({ formatVersion: FORMAT_RECETTE - 1 })).etat, 'illisible');
});

test('une association se refuse hors d’une variable de couleur, d’une palette, d’une intensité ou d’un cran de la recette', () => {
  const index = indexer(projetLibre());
  const recette = recetteAvec('primary');
  const valide = { palette: 'p0', intensite: 'soft' as const, theme: 'light' as const, cran: 700 };
  assert.equal(validerAssociation(index, recette, 'papier', valide), null);
  assert.equal(validerAssociation(index, recette, 'zero', valide), 'type');
  assert.equal(validerAssociation(index, recette, 'papier', { ...valide, palette: 'inconnue' }), 'palette');
  assert.equal(validerAssociation(index, recette, 'papier', { ...valide, intensite: null }), 'intensite');
  assert.equal(validerAssociation(index, recette, 'papier', { ...valide, cran: 750 }), 'cran');
});

test('les variables d’un cran viennent de la table des dossiers, dans le sens du thème ; le neutre ajoute les siennes', () => {
  const recette = recetteAvec('primary', 'neutral');
  const normal = variablesDeLAssociation(recette, { palette: 'p0', intensite: 'soft', theme: 'light', cran: 700 });
  assert.deepEqual(normal, ['solid/default', 'page/foreground', 'page/border']);
  const inverse = variablesDeLAssociation({ ...recette, texteDesBoutons: { light: 'noir', dark: 'noir' } }, { palette: 'p0', intensite: 'soft', theme: 'light', cran: 700 });
  assert.deepEqual(inverse, ['solid/default', 'ring']);
  const neutre = variablesDeLAssociation(recette, { palette: 'p1', intensite: 'soft', theme: 'dark', cran: 500 });
  assert.deepEqual(neutre, ['surface/pressed', 'disabled/foreground', 'disabled/border'], 'en Dark, surface/pressed vise le 500');
  const neutreLight = variablesDeLAssociation(recette, { palette: 'p1', intensite: 'soft', theme: 'light', cran: 500 });
  assert.deepEqual(neutreLight, ['disabled/foreground', 'disabled/border']);
});

test('un nom de theme porte sa variable de dossier et son support', () => {
  assert.equal(variableDuNom('primary/solid/hover')?.variable, 'solid/hover');
  assert.equal(variableDuNom('success/vivid/ring')?.support.peint[0], 'ring');
  assert.equal(variableDuNom('neutral/page/foreground-main')?.variable, 'page/foreground-main');
  assert.deepEqual(variableDuNom('neutral/scale/0')?.support.portees, []);
  assert.equal(variableDuNom('primary/identity'), null);
  assert.equal(nuanceAttendue('primary/solid/hover', 'light', recetteAvec('primary')), 800);
  assert.equal(nuanceAttendue('primary/solid/foreground', 'light', recetteAvec('primary')), null);
});

test('un nom de theme porte sa variable de dossier quelle que soit son écriture', () => {
  assert.equal(variableDuNom('Primary/Solid/default')?.variable, 'solid/default');
  assert.equal(variableDuNom('PRIMARY/SOLID/DEFAULT')?.variable, 'solid/default');
  assert.equal(variableDuNom('Neutral/Page/ForegroundMain')?.variable, 'page/foreground-main');
  assert.equal(variableDuNom('Primary/Identity'), null);
  assert.equal(nuanceAttendue('Primary/Solid/Hover', 'light', recetteAvec('primary')), 800);
});

const SOLID = ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR'];

/** Un fichier remappé : `theme` en deux modes, aliasé vers `brands` et `utility`. `ecrire` change l'écriture des noms de `theme`. */
function fichierRemappe(aliasDeHover = 'b-800', portees: string[] = SOLID, ecrire: (nom: string) => string = (nom) => nom) {
  const c = constructeur('Multimarque');
  c.collection('c', 'Composants', ['M']);
  c.collection('t', 'Thème', ['Light', 'Dark']);
  c.collection('b', 'Marques', ['M']);
  c.collection('u', 'Utilitaires', ['M']);
  c.collection('p', 'Catalogue', ['M']);
  c.variable('bouton', 'c', 'button/bg', 'COLOR', { M: alias('t-hover') });
  c.variable('t-hover', 't', ecrire('primary/solid/hover'), 'COLOR', { Light: alias(aliasDeHover), Dark: alias('b-800') }, { portees });
  c.variable('t-defaut', 't', ecrire('primary/solid/default'), 'COLOR', { Light: alias('b-700'), Dark: alias('b-700') }, { portees: SOLID });
  c.variable('t-echelle', 't', ecrire('neutral/scale/0'), 'COLOR', { Light: alias('u-0'), Dark: alias('u-0') }, { portees: [] });
  c.variable('t-identite', 't', ecrire('primary/identity'), 'COLOR', { Light: alias('b-700'), Dark: alias('b-700') }, { portees: [] });
  c.variable('b-700', 'b', 'primary/light/700', 'COLOR', { M: alias('cat') }, { portees: [] });
  c.variable('b-600', 'b', 'primary/light/600', 'COLOR', { M: alias('cat') }, { portees: [] });
  c.variable('b-800', 'b', 'primary/light/800', 'COLOR', { M: alias('cat') }, { portees: [] });
  c.variable('u-0', 'u', 'neutral/0', 'COLOR', { M: alias('cat') }, { portees: [] });
  c.variable('cat', 'p', 'colors/blue/700', 'COLOR', { M: couleur('#1E40AF') }, { portees: [] });
  return indexer(c.releve());
}

test('une association rangée sous un ancien nom se lit sous le nouveau ; usage et l’inconnu se lisent sans couche', () => {
  assert.equal(coucheRangee('brand'), 'brands');
  assert.equal(coucheRangee('color-brands'), 'brands');
  assert.equal(coucheRangee('color-utilities'), 'utility');
  assert.equal(coucheRangee('layouts'), 'layout');
  assert.equal(coucheRangee('brands'), 'brands');
  assert.equal(coucheRangee('toString'), null);
  assert.equal(coucheRangee('theme'), 'theme');
  assert.equal(coucheRangee('usage'), null);
  assert.equal(coucheRangee('autre'), null);
});

const COUCHES_REMAPPEES = { c: 'components', t: 'theme', b: 'brands', u: 'utility', p: 'primitives' } as const;

test('un fichier à la forme du fichier remappé ne rend aucun constat', () => {
  assert.deepEqual(controlerLeProfil(fichierRemappe(), COUCHES_REMAPPEES, { recette: recetteAvec('primary') }).constats, []);
});

test('une couleur de composant vise theme, même si components admet layout pour une autre nature', () => {
  const c = constructeur('Cible couleur de composant');
  c.collection('c', 'Composants', ['M']);
  c.collection('t', 'Thème', ['Light']);
  c.collection('l', 'Layout', ['M']);
  c.variable('composant-vers-layout', 'c', 'button/color', 'COLOR', { M: alias('layout') });
  c.variable('layout', 'l', 'radius/button', 'FLOAT', { M: { nature: 'nombre', nombre: 4 } });
  const controle = controlerLeProfil(indexer(c.releve()), { c: 'components', t: 'theme', l: 'layout' });
  assert.deepEqual(controle.constats.map(({ regle, variable, coucheCible }) => [regle, variable, coucheCible]), [['couche', 'composant-vers-layout', 'layout']]);
});

test('une couleur de composant vers typography ou primitives est signalée', () => {
  const c = constructeur('Cibles interdites');
  c.collection('c', 'Composants', ['M']);
  c.collection('y', 'Typographie', ['M']);
  c.collection('p', 'Catalogue', ['M']);
  c.variable('vers-typography', 'c', 'button/color', 'COLOR', { M: alias('typo') });
  c.variable('vers-primitives', 'c', 'button/border', 'COLOR', { M: alias('prim') });
  c.variable('typo', 'y', 'font/color', 'COLOR', { M: couleur('#112233') });
  c.variable('prim', 'p', 'colors/blue/700', 'COLOR', { M: couleur('#1E40AF') });
  const controle = controlerLeProfil(indexer(c.releve()), { c: 'components', y: 'typography', p: 'primitives' });
  assert.deepEqual(
    controle.constats.filter(({ regle }) => regle === 'couche').map(({ variable, coucheCible }) => [variable, coucheCible]),
    [['vers-typography', 'typography'], ['vers-primitives', 'primitives']],
  );
});

test('un alias de solid/hover vers la 700 en Light rend un constat de nuance', () => {
  const constats = controlerLeProfil(fichierRemappe('b-700'), COUCHES_REMAPPEES, { recette: recetteAvec('primary') }).constats;
  assert.deepEqual(constats.map((constat) => `${constat.regle}:${constat.variable}:${constat.attendue}`), ['nuance:t-hover:800']);
});

test('en Dark inversé, la 600 est attendue pour solid/hover', () => {
  const recette = { ...recetteAvec('primary'), texteDesBoutons: { light: 'blanc', dark: 'blanc' } } as Recette;
  const constats = controlerLeProfil(fichierRemappe(), COUCHES_REMAPPEES, { recette }).constats;
  // Light reste normal et vise 800 : seul Dark, qui vise 800 au lieu de 600, déroge.
  assert.deepEqual(constats.map((constat) => `${constat.regle}:${constat.mode}:${constat.attendue}`), ['nuance:t:Dark:600']);
  const lightInverse = { ...recetteAvec('primary'), texteDesBoutons: { light: 'noir', dark: 'noir' } } as Recette;
  // Light inversé attend 600 et le trouve ; Dark normal attend 800 et le trouve.
  assert.deepEqual(controlerLeProfil(fichierRemappe('b-600'), COUCHES_REMAPPEES, { recette: lightInverse }).constats, []);
});

test('une variable de dossier sans portée rend un constat de portée, avec les portées de la table', () => {
  const constats = controlerLeProfil(fichierRemappe('b-800', []), COUCHES_REMAPPEES).constats;
  assert.deepEqual(constats.map((constat) => `${constat.regle}:${constat.variable}:${constat.attendue}`), ['portee:t-hover:FRAME_FILL, SHAPE_FILL, STROKE_COLOR']);
});

const RESUME = (constats: ReturnType<typeof controlerLeProfil>['constats']) => constats.map((constat) => `${constat.regle}:${constat.variable}:${constat.attendue}`);

test('un thème renommé selon chaque convention rend les mêmes constats de portée et de nuance que le thème en minuscules', () => {
  const recette = recetteAvec('primary');
  const ecrire = (convention: (typeof CONVENTIONS)[number]['convention']) => (nom: string): string => {
    const { propositions } = normaliserLesNoms([{ id: 'a', nom, portee: 'p', categorie: 'variables' }], { variables: convention });
    return propositions[0]?.nouveauNom ?? nom;
  };
  const attendus = RESUME(controlerLeProfil(fichierRemappe('b-700', []), COUCHES_REMAPPEES, { recette }).constats);
  assert.deepEqual(attendus, ['nuance:t-hover:800', 'portee:t-hover:FRAME_FILL, SHAPE_FILL, STROKE_COLOR']);
  for (const choix of CONVENTIONS) {
    const index = fichierRemappe('b-700', [], ecrire(choix.convention));
    assert.deepEqual(RESUME(controlerLeProfil(index, COUCHES_REMAPPEES, { recette }).constats), attendus, choix.id);
    assert.deepEqual(controlerLeProfil(fichierRemappe('b-800', SOLID, ecrire(choix.convention)), COUCHES_REMAPPEES, { recette }).constats, [], choix.id);
  }
});

/** Un thème dont l'unique mode porte un autre nom que `Light` ; `t-hover` vise la 700 au lieu de la 800. */
function fichierEnMode(nomDuMode: string) {
  const c = constructeur('Mode libre');
  c.collection('t', 'Thème', [nomDuMode]);
  c.collection('b', 'Marques', ['M']);
  c.collection('p', 'Catalogue', ['M']);
  c.variable('t-hover', 't', 'primary/solid/hover', 'COLOR', { [nomDuMode]: alias('b-700') }, { portees: SOLID });
  c.variable('b-700', 'b', 'primary/light/700', 'COLOR', { M: alias('cat') }, { portees: [] });
  c.variable('cat', 'p', 'colors/blue/700', 'COLOR', { M: couleur('#1E40AF') }, { portees: [] });
  return indexer(c.releve());
}

const COUCHES_EN_MODE = { t: 'theme', b: 'brands', p: 'primitives' } as const;
const JOUR_EST_LIGHT: VocabulaireDuReleve = { personnalises: [{ terme: ['light'], remplace: [['jour']] }], ecartsUcm: [] };

test('un mode Jour déclaré comme light est contrôlé ; sans la règle, il ne rend aucun constat', () => {
  const recette = recetteAvec('primary');
  const index = fichierEnMode('Jour');
  assert.deepEqual(RESUME(controlerLeProfil(index, COUCHES_EN_MODE, { recette, indexDuVocabulaire: indexDuVocabulaire(JOUR_EST_LIGHT) }).constats), ['nuance:t-hover:800']);
  assert.deepEqual(controlerLeProfil(index, COUCHES_EN_MODE, { recette }).constats, []);
  assert.deepEqual(controlerLeProfil(index, COUCHES_EN_MODE, { recette, indexDuVocabulaire: indexDuVocabulaire({ personnalises: [], ecartsUcm: [] }) }).constats, []);
  assert.deepEqual(RESUME(controlerLeProfil(fichierEnMode('LIGHT'), COUCHES_EN_MODE, { recette }).constats), ['nuance:t-hover:800']);
});

test('[theme-mode-inconnu] un mode que ni UCM ni le fichier ne désignent est une limite du profil, une seule fois par mode', () => {
  const recette = recetteAvec('primary');
  const jour = fichierEnMode('Jour');
  const controle = controlerLeProfil(jour, COUCHES_EN_MODE, { recette });
  assert.deepEqual(controle.constats, []);
  assert.deepEqual(controle.limites, [{ cause: 'mode-non-reconnu', cle: 'mode-non-reconnu:t:t:Jour', variable: 't-hover', mode: 't:Jour' }]);
  // Déclaré comme une écriture de light, le mode est contrôlé : plus de limite.
  assert.deepEqual(controlerLeProfil(jour, COUCHES_EN_MODE, { recette, indexDuVocabulaire: indexDuVocabulaire(JOUR_EST_LIGHT) }).limites, []);
  // Sans recette, la nuance n'est pas jugée : le mode n'y change rien.
  assert.deepEqual(controlerLeProfil(jour, COUCHES_EN_MODE).limites, []);
  // Deux variables dans le même mode : une seule limite.
  const c = constructeur('Mode libre');
  c.collection('t', 'Thème', ['Jour']);
  c.collection('b', 'Marques', ['M']);
  c.collection('p', 'Catalogue', ['M']);
  c.variable('t-hover', 't', 'primary/solid/hover', 'COLOR', { Jour: alias('b-700') }, { portees: SOLID });
  c.variable('t-defaut', 't', 'primary/solid/default', 'COLOR', { Jour: alias('b-700') }, { portees: SOLID });
  c.variable('b-700', 'b', 'primary/light/700', 'COLOR', { M: alias('cat') }, { portees: [] });
  c.variable('cat', 'p', 'colors/blue/700', 'COLOR', { M: couleur('#1E40AF') }, { portees: [] });
  assert.equal(controlerLeProfil(indexer(c.releve()), COUCHES_EN_MODE, { recette }).limites.length, 1);
});

test('un rôle de theme que la table ne reconnaît pas est une limite ; identity n’en donne pas', () => {
  const controle = controlerLeProfil(indexer(releveDuProfilAvecLimites()), couchesDuProfilAvecLimites(), { recette: recetteAvec('primary') });
  assert.deepEqual(controle.limites.filter((limite) => limite.cause === 'role-inconnu').map((limite) => limite.variable), ['mystere']);
  const identite = fichierRemappe();
  assert.deepEqual(controlerLeProfil(identite, COUCHES_REMAPPEES, { recette: recetteAvec('primary') }).limites, []);
  assert.equal(identite.variables.get('t-identite')?.nom, 'primary/identity');
});

test('une valeur absente d’un mode, et un alias vers une collection sans couche, sont des limites', () => {
  const controle = controlerLeProfil(indexer(releveDuProfilAvecLimites()), couchesDuProfilAvecLimites(), { recette: recetteAvec('primary') });
  assert.deepEqual(controle.constats, []);
  assert.deepEqual(controle.limites.map((limite) => `${limite.cause}:${limite.variable}:${limite.mode ?? ''}:${limite.cible ?? ''}`).sort(), [
    'cible-sans-couche:bordure:composants:Valeur:hors-couche',
    'mode-non-reconnu:hover:theme:Jour:',
    'mode-sans-valeur:defaut:theme:Jour:',
    'role-inconnu:mystere::',
  ]);
});

test('une exception du designer retire un constat, jamais une limite', () => {
  const index = indexer(releveDuProfilAvecLimites());
  const exceptions = new Set(['role-inconnu:mystere', 'mode-sans-valeur:defaut:theme:Jour', 'cible-sans-couche:bordure:composants:Valeur']);
  assert.equal(controlerLeProfil(index, couchesDuProfilAvecLimites(), { recette: recetteAvec('primary'), exceptions }).limites.length, 4);
});

test('le vocabulaire d’un relevé est indexé une fois ; un vocabulaire illisible se lit sans règle', () => {
  assert.equal(indexDuVocabulaire(undefined), undefined);
  assert.equal(indexDuVocabulaire(JOUR_EST_LIGHT), indexDuVocabulaire(JOUR_EST_LIGHT));
  assert.equal(indexDuVocabulaire({ personnalises: 3, ecartsUcm: null } as unknown as VocabulaireDuReleve), undefined);
  assert.equal(indexDuVocabulaire(null as unknown as VocabulaireDuReleve), undefined);
});

test('un relevé exporté sans vocabulaire se réimporte sans règle ; avec vocabulaire, il le garde', () => {
  const releve = fichierEnMode('Jour').releve;
  const sans = importerReleve(exporterReleve(releve));
  assert.ok('releve' in sans);
  if (!('releve' in sans)) return;
  assert.equal(sans.releve.vocabulaire, undefined);
  assert.equal(indexDuVocabulaire(sans.releve.vocabulaire), undefined);
  const avec = importerReleve(exporterReleve({ ...releve, vocabulaire: JOUR_EST_LIGHT }));
  assert.ok('releve' in avec);
  if (!('releve' in avec)) return;
  assert.deepEqual(avec.releve.vocabulaire, JOUR_EST_LIGHT);
});

/** Une racine qui ne sait que lire : toute autre méthode manque, et ses lectures sont journalisées. */
function racineDeNommage(entrees: Readonly<Record<string, string>>) {
  const lectures: string[] = [];
  return {
    lectures,
    racine: Object.freeze({
      getSharedPluginDataKeys(espace: string) { lectures.push(`cles:${espace}`); return espace === ESPACE_ARCHITECT ? Object.keys(entrees) : []; },
      getSharedPluginData(espace: string, cle: string) { lectures.push(`lire:${espace}:${cle}`); return espace === ESPACE_ARCHITECT ? entrees[cle] ?? '' : ''; },
    }),
  };
}

const ECRITURE = JSON.stringify({ version: 1, groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: { casse: 'minuscules', separateur: 'tiret' } });
const TERME_JOUR = JSON.stringify({ version: 1, terme: ['light'], remplace: [['jour']] });

test('le vocabulaire du fichier se lit dans l’espace d’UCM Architect, sans rien écrire', () => {
  const { racine, lectures } = racineDeNommage({ ecriture: ECRITURE, 'terme:light': TERME_JOUR, 'autre:cle': 'x' });
  assert.deepEqual(lireLeVocabulaire(racine), { personnalises: [{ terme: ['light'], remplace: [['jour']] }], ecartsUcm: [] });
  assert.ok(lectures.every((lecture) => lecture.startsWith('cles:') || lecture.startsWith('lire:')));
  assert.ok(!lectures.includes(`lire:${ESPACE_ARCHITECT}:autre:cle`), 'une clé qui ne nomme rien n’est pas lue');
});

test('sans écriture rangée, le fichier se lit sans règle', () => {
  assert.equal(lireLeVocabulaire(racineDeNommage({}).racine), undefined);
  assert.equal(lireLeVocabulaire(racineDeNommage({ 'terme:light': TERME_JOUR }).racine), undefined);
  assert.equal(lireLeVocabulaire(racineDeNommage({ ecriture: '{ illisible' }).racine), undefined);
});

/** Un fichier aux noms libres, associé au profil par le designer. */
function fichierAssocie() {
  const c = constructeur('Multimarque');
  c.collection('c', 'Composants', ['M']);
  c.collection('t', 'Thème', ['M']);
  c.collection('b', 'Marques', ['M']);
  c.collection('p', 'Catalogue', ['M']);
  c.variable('bouton', 'c', 'button/bg', 'COLOR', { M: alias('t-solid') });
  c.variable('saut', 'c', 'button/border', 'COLOR', { M: alias('cat') });
  c.variable('t-solid', 't', 'primary/solid/default', 'COLOR', { M: alias('b-700') }, { portees: ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR'] });
  c.variable('t-texte', 't', 'primary/page/foreground', 'COLOR', { M: couleur('#000000') }, { portees: ['ALL_SCOPES'] });
  c.variable('b-700', 'b', 'primary/light/700', 'COLOR', { M: alias('cat') }, { portees: [] });
  c.variable('cat', 'p', 'colors/blue/700', 'COLOR', { M: couleur('#1E40AF') }, { portees: ['ALL_SCOPES'] });
  return indexer(c.releve());
}

const COUCHES_ASSOCIEES = { c: 'components', t: 'theme', b: 'brands', p: 'primitives' } as const;

test('le profil contrôle les couches, les valeurs directes et les portées, sur des noms libres', () => {
  const constats = controlerLeProfil(fichierAssocie(), COUCHES_ASSOCIEES, { recette: recetteAvec('primary') }).constats;
  assert.deepEqual(constats.map((constat) => `${constat.regle}:${constat.variable}`).sort(), [
    'couche:saut',
    'portee:cat',
    'portee:t-texte',
    'valeur-directe:t-texte',
  ]);
});

test('sans association, le profil ne contrôle rien : un groupe nommé usage n’active aucun contrôle', () => {
  assert.deepEqual(controlerLeProfil(indexer(projetLibre()), {}).constats, []);
  assert.deepEqual(controlerLeProfil(fichierAssocie(), {}).constats, []);
});

test('une exception du designer retire l’écart', () => {
  const index = fichierAssocie();
  const avec = controlerLeProfil(index, COUCHES_ASSOCIEES).constats;
  const exceptions = new Set(['couche:saut:c:M']);
  const sans = controlerLeProfil(index, COUCHES_ASSOCIEES, { exceptions }).constats;
  assert.equal(sans.some((constat) => exceptions.has(constat.cle)), false);
  assert.equal(sans.length, avec.length - 1);
});

test('une recette au format 8 se lit avec une palette figée : sa liste de nuances est la sienne, à une seule intensité', () => {
  const nuances = [0, 10, 20, 30, 40];
  const nulle = { clair: 0, sombre: 0, origine: 'tailwind' };
  const figee = { id: 'p-000000f8', nom: 'slate', reference: '#475569', derive: { lien: true, soft: nulle, vivid: nulle }, intensites: 1 as const, crans: nuances, figees: { light: ['#FFFFFF', '#E2E8F0', '#94A3B8', '#475569', '#0F172A'] } };
  const lue = lireLaRecette(JSON.stringify({ ...recetteParDefaut(), palettes: [figee] }));
  assert.equal(lue.etat, 'courante');
  if (lue.etat !== 'courante') return;
  assert.equal(lue.recette.formatVersion, FORMAT_RECETTE);
  const index = indexer(projetLibre());
  const variable = [...index.variables.values()].find((candidate) => candidate.type === 'COLOR')!.id;
  assert.equal(validerAssociation(index, lue.recette, variable, { palette: figee.id, intensite: null, theme: 'light', cran: 30 }), null);
  assert.equal(validerAssociation(index, lue.recette, variable, { palette: figee.id, intensite: null, theme: 'light', cran: 50 }), 'cran');
  assert.equal(validerAssociation(index, lue.recette, variable, { palette: figee.id, intensite: 'soft', theme: 'light', cran: 30 }), 'intensite');
});
