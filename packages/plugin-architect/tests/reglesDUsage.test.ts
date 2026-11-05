/**
 * Les règles d'usage d'un composant (lot E10a) : noms de règle comparés sans espaces, tirets, soulignés ni suffixe `#1:2`, valeur
 * inconnue, cible vide, `@boolean` sur un axe, conteneurs (autre page, nom vide, noms compactés égaux, deux conteneurs, conteneur dans une
 * instance) et règle probablement renommée. La page est celle du harnais F8 : le composant `Button` (jeu de variants `Palette`, `Style`,
 * `State`, `Size`, booléennes `Has Icon` et `Loading`), son conteneur de règles et ses voisins, lus par `lireLesRegles` et le scan du socle.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '@ucm-kit/core/controles';

import { avecLeConteneur, avecLesRegles, reecrire, reglesDe, specDeLaForme, specR0 } from '../scripts/stress/f8-analyse/operateursRegles';
import { lireLaPage, type SpecDePage } from '../scripts/stress/f8-analyse/pageDeRegles';
import { sansLesReglesDe, type RegleEcrite } from '../scripts/stress/f8-analyse/profilsRegles';
import { retenirLesModeles } from '../src/regles';

const REDIGEE = 'Texte rédigé.';
const lire = async (spec: SpecDePage): Promise<Constat[]> => (await lireLaPage(spec)).constats;
const resume = (constats: readonly Constat[]): string[] => constats.filter(({ code }) => code === 'C45').map(({ code, faits }) => `${code}|${String(faits.ecart ?? '')}|${String(faits.propriete ?? faits.regle ?? '')}`);
const codes = (constats: readonly Constat[]): string[] => constats.map(({ code }) => code);
const booleenne = (cible: string): RegleEcrite => ({ tag: 'boolean', cible, contenu: REDIGEE });
const valeur = (cible: string): RegleEcrite => ({ tag: 'prop', cible, contenu: REDIGEE });

test('une règle écrite show_icon, show-icon, Show Icon#1:2 ou showIcon vise la propriété Show Icon (Q-F89-1)', async () => {
  const tuile = specDeLaForme('tile-link');
  for (const ecrit of ['show icon', 'show-icon', 'show_icon', 'showIcon', 'Show Icon#1:2']) {
    assert.deepEqual(resume(await lire(avecLesRegles(tuile, reecrire(reglesDe(tuile), 'showIcon', ecrit)))), [], ecrit);
  }
});

test('une valeur écrite Extra-Large vise la valeur Extra Large (Q-F89-1)', async () => {
  const bouton = specR0();
  const largeur = { nom: 'Width', type: 'VARIANT' as const, options: ['Extra Large', 'Small'] };
  const spec = { ...bouton, proprietes: [...bouton.proprietes, largeur] };
  const base = avecLesRegles(spec, [...reglesDe(bouton), valeur('width.Extra-Large'), valeur('width.small')]);
  assert.deepEqual(resume(await lire(base)), []);
});

test('un nom de conteneur écrit icon-button ou icon_button documente le composant Icon Button (Q-F89-1)', async () => {
  const bouton = specR0();
  for (const ecrit of ['icon-button', 'icon_button']) {
    const constats = await lire({ ...avecLeConteneur(bouton, { ecrit }), nom: 'Icon Button' });
    assert.deepEqual(codes(constats), [], ecrit);
  }
});

test('Size.xxl donne un C45 valeur-inconnue sans correction, qui cite l’axe et la règle (Q-F89-2)', async () => {
  const bouton = specR0();
  const constats = await lire(avecLesRegles(bouton, [...reglesDe(bouton), valeur('size.xxl')]));
  assert.deepEqual(resume(constats), ['C45|valeur-inconnue|size']);
  assert.equal(constats[0].correction, undefined);
  assert.equal(constats[0].faits.regle, 'size.xxl');
  assert.equal(constats[0].id, 'regles:C45:valeur-inconnue:size.xxl');
});

test('une valeur de l’axe, même écrite autrement, n’est pas inconnue', async () => {
  const bouton = specR0();
  assert.deepEqual(resume(await lire(avecLesRegles(bouton, reecrire(reglesDe(bouton), 'size.sm', 'Size.SM')))), []);
});

test('une cible @prop vide ou faite d’espaces donne un C45 sans-propriete, une fois pour toutes (N-72)', async () => {
  const bouton = specR0();
  for (const cible of ['', '   ']) {
    const constats = await lire(avecLesRegles(bouton, [...reglesDe(bouton), valeur(cible)]));
    assert.deepEqual(resume(constats), ['C45|sans-propriete|'], JSON.stringify(cible));
  }
  const deux = await lire(avecLesRegles(bouton, [...reglesDe(bouton), valeur(''), booleenne('')]));
  const c45 = deux.filter(({ code }) => code === 'C45');
  assert.equal(c45.length, 1);
  assert.equal(c45[0].faits.regles, 2);
});

test('@boolean posé sur un axe donne un C45 sans-propriete (N-73)', async () => {
  const bouton = specR0();
  const constats = await lire(avecLesRegles(bouton, [...reglesDe(bouton), booleenne('palette')]));
  assert.deepEqual(resume(constats), ['C45|sans-propriete|palette']);
  assert.equal(constats[0].faits.surUnAxe, 1);
});

test('une propriété dont le nom porte un point (Size.Mode) reste documentée par ses règles (N-74)', async () => {
  const bouton = specR0();
  const mode = { nom: 'Size.Mode', type: 'VARIANT' as const, options: ['compact', 'wide'] };
  const spec = { ...bouton, proprietes: [...bouton.proprietes, mode] };
  const regles = [...reglesDe(bouton), valeur('Size.Mode.compact'), valeur('Size.Mode.wide')];
  assert.deepEqual(resume(await lire(avecLesRegles(spec, regles))), []);
});

test('une instance de règles sur une autre page ne compte pas : C43 reste seul, avec la page du composant (Q-F89-5)', async () => {
  const constats = await lire(avecLeConteneur(specR0(), { emplacement: 'autre-page' }));
  assert.deepEqual(codes(constats), ['C43']);
  assert.equal(constats[0].correction?.apres.nom, 'creer');
  assert.equal(constats[0].faits.page, 'Composants');
});

test('une page sans instance de règles donne C43 seul, sans le point C44 « aucune instance » du moteur (Q-09)', async () => {
  const constats = await lire({ ...specR0(), conteneurs: [] });
  assert.deepEqual(codes(constats), ['C43']);
});

test('un conteneur au nom vide ou resté marqué est rempli par C43, jamais doublé, sans point C44 sur le même défaut (Q-F89-6)', async () => {
  for (const ecrit of ['', '[À compléter]']) {
    const lecture = await lireLaPage(avecLeConteneur(specR0(), { ecrit }));
    assert.deepEqual(codes(lecture.constats), ['C43'], JSON.stringify(ecrit));
    assert.equal(lecture.constats[0].correction?.apres.nom, 'remplir');
    assert.equal(lecture.releve.remplissable, true);
  }
});

test('deux conteneurs au nom vide : C43 ne choisit pas, le point du moteur reste', async () => {
  const bouton = specR0();
  const vide = { ecrit: '', regles: [], emplacement: 'page' as const };
  const constats = await lire({ ...bouton, conteneurs: [{ ...bouton.conteneurs[0], ecrit: '' }, vide] });
  assert.deepEqual(codes(constats), ['C44']);
});

test('deux composants au nom compacté égal ne partagent pas leur conteneur : un seul constat, du moteur (Q-F89-7)', async () => {
  const constats = await lire({ ...avecLeConteneur(specR0(), { ecrit: 'Icon Button' }), nom: 'IconButton', voisins: [{ nom: 'Icon Button' }] });
  assert.deepEqual(codes(constats), ['C44']);
  assert.match(String(constats[0].faits.titre), /le même nom une fois les espaces, tirets et soulignés retirés/);
});

test('deux composants de noms différents partagent la page sans se confondre', async () => {
  const constats = await lire({ ...specR0(), voisins: [{ nom: 'Button Group' }] });
  assert.deepEqual(codes(constats), []);
});

test('deux conteneurs pour un composant : C45 lit les règles du premier de la page, C44 dit que l’autre est ignoré (Q-F89-8)', async () => {
  const bouton = specR0();
  const sansPalette = sansLesReglesDe(reglesDe(bouton), 'palette');
  const second = { ecrit: 'Button', regles: reglesDe(bouton), emplacement: 'page' as const };
  const constats = await lire({ ...bouton, conteneurs: [{ ...bouton.conteneurs[0], regles: sansPalette }, second] });
  assert.deepEqual(resume(constats), ['C45|sans-regle|palette']);
  assert.deepEqual(codes(constats.filter(({ code }) => code === 'C44')), ['C44']);
});

test('un conteneur posé dans une instance d’un autre composant n’est lu que par son instance la plus proche (Q-F89-9)', async () => {
  const constats = await lire(avecLeConteneur(specR0(), { emplacement: 'instance' }));
  assert.deepEqual(codes(constats), []);
});

test('une propriété sans règle et une règle sans propriété au nom voisin forment une seule règle probablement renommée (Q-F89-13)', async () => {
  const bouton = specR0();
  const sans = sansLesReglesDe(reglesDe(bouton), 'palette');
  const posees = reglesDe(bouton).filter((regle) => regle.cible?.startsWith('palette.')).map((regle) => ({ ...regle, cible: regle.cible!.replace('palette.', 'palete.') }));
  const constats = await lire(avecLesRegles(bouton, [...sans, ...posees]));
  assert.deepEqual(resume(constats), ['C45|regle-renommee|palette']);
  assert.equal(constats[0].correction, undefined);
  assert.equal(constats[0].faits.regle, 'palete');
});

test('deux règles au nom voisin d’une même propriété ne se rattachent pas : deux constats séparés', async () => {
  const bouton = specR0();
  const sans = sansLesReglesDe(reglesDe(bouton), 'palette');
  const constats = await lire(avecLesRegles(bouton, [...sans, valeur('palete.primary'), valeur('palett.primary')]));
  assert.ok(!constats.some(({ faits }) => faits.ecart === 'regle-renommee'));
  assert.ok(constats.some(({ faits }) => faits.ecart === 'sans-regle'));
});

test('deux noms trop courts pour être voisins restent séparés', async () => {
  const bouton = specR0();
  const sans = sansLesReglesDe(reglesDe(bouton), 'palette');
  const constats = await lire(avecLesRegles(bouton, [...sans, valeur('pal.primary')]));
  assert.ok(!constats.some(({ faits }) => faits.ecart === 'regle-renommee'));
});

test('le modèle retenu d’un conteneur à remplir est celui de la création', async () => {
  const lecture = await lireLaPage(avecLeConteneur(specR0(), { ecrit: '' }));
  retenirLesModeles(lecture.releve);
  assert.ok(lecture.modeles.has('regles:creer:10:1'));
});
