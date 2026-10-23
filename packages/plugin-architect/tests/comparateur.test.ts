/** La logique pure du comparateur de fidélité, sur des relevés synthétiques : aucun navigateur. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

interface Element {
  texte: string;
  boite: number[];
  styles: Record<string, string>;
  classes: string[];
  dansPastille: boolean;
  zones?: string[];
}
interface Releve {
  elements: Element[];
  parSelecteur: Record<string, Element[]>;
}
interface CadreDuManifeste {
  cadre: string;
  lot: string;
  largeur: number;
  hauteur: number;
  sorte: string;
  selecteurs: string[];
  zonesDeDonnees?: string[];
  ecartsDeclares?: { texte: string; raison: string }[];
}
interface Resultat { cadre: string; ecarts: string[]; bornes?: string[] }
const { comparerCadre, verdict } = require('../galerie/comparer-maquette.cjs') as {
  comparerCadre: (cadre: CadreDuManifeste, maquette: Releve | null, galerie: Releve | null) => Resultat;
  verdict: (resultats: Resultat[]) => { ok: boolean; lignes: string[] };
};

const manifeste = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../galerie/cadres.json'), 'utf8')) as CadreDuManifeste[];
const cadre: CadreDuManifeste = { cadre: 't-essai', lot: 'U0', largeur: 640, hauteur: 300, sorte: 'seul', selecteurs: [] };

const element = (texte: string, surcharge: Partial<Element> = {}): Element => ({
  texte,
  boite: [10, 20, 100, 16],
  styles: { fontFamily: 'Inter', fontSize: '12px', fontWeight: '400', color: 'rgb(255, 255, 255)', backgroundColor: 'rgba(0, 0, 0, 0)' },
  classes: [],
  dansPastille: false,
  ...surcharge,
});
const releve = (...elements: Element[]): Releve => ({ elements, parSelecteur: {} });

test('deux relevés identiques ne donnent aucun écart', () => {
  const page = releve(element('Appliquer'), element('Annuler', { boite: [10, 50, 80, 16] }));
  assert.deepEqual(comparerCadre(cadre, page, page).ecarts, []);
  assert.equal(verdict([comparerCadre(cadre, page, page)]).ok, true);
});

test('une position décalée de 1 px passe, de plus de 1 px échoue', () => {
  const maquette = releve(element('Appliquer'));
  assert.deepEqual(comparerCadre(cadre, maquette, releve(element('Appliquer', { boite: [11, 21, 101, 17] }))).ecarts, []);
  const ecarts = comparerCadre(cadre, maquette, releve(element('Appliquer', { boite: [12, 20, 100, 16] }))).ecarts;
  assert.equal(ecarts.length, 1);
  assert.match(ecarts[0], /« Appliquer » : x 10\.0 dans la maquette, 12\.0 dans le plugin/);
});

test('une police changée fait échouer la comparaison', () => {
  const maquette = releve(element('Appliquer'));
  const galerie = releve(element('Appliquer', { styles: { ...element('').styles, fontWeight: '600', fontSize: '13px' } }));
  const resultat = comparerCadre(cadre, maquette, galerie);
  assert.equal(resultat.ecarts.length, 2);
  assert.match(resultat.ecarts.join('\n'), /fontWeight 400 dans la maquette, 600 dans le plugin/);
  assert.equal(verdict([resultat]).ok, false);
});

test('une couleur ou un fond changé échoue sans tolérance', () => {
  const maquette = releve(element('Appliquer'));
  const couleur = releve(element('Appliquer', { styles: { ...element('').styles, color: 'rgb(254, 255, 255)' } }));
  const fond = releve(element('Appliquer', { styles: { ...element('').styles, backgroundColor: 'rgb(1, 1, 1)' } }));
  assert.equal(comparerCadre(cadre, maquette, couleur).ecarts.length, 1);
  assert.equal(comparerCadre(cadre, maquette, fond).ecarts.length, 1);
});

test('un élément retiré du plugin fait échouer la comparaison', () => {
  const maquette = releve(element('Appliquer'), element('Annuler'));
  const resultat = comparerCadre(cadre, maquette, releve(element('Appliquer')));
  assert.deepEqual(resultat.ecarts, ['« Annuler » : 1 dans la maquette, absent du plugin']);
  assert.equal(verdict([resultat]).ok, false);
});

test('un élément ajouté au plugin, ou un texte changé, fait échouer la comparaison', () => {
  const maquette = releve(element('Appliquer'));
  assert.deepEqual(comparerCadre(cadre, maquette, releve(element('Appliquer'), element('Extra'))).ecarts, ['« Extra » : 1 dans le plugin, absent de la maquette']);
  const change = comparerCadre(cadre, maquette, releve(element('Valider'))).ecarts;
  assert.equal(change.length, 2);
});

test('un texte répété s’apparie dans l’ordre du document et signale un compte différent', () => {
  const maquette = releve(element('Voir', { boite: [0, 0, 30, 16] }), element('Voir', { boite: [0, 40, 30, 16] }));
  assert.deepEqual(comparerCadre(cadre, maquette, releve(element('Voir', { boite: [0, 0, 30, 16] }), element('Voir', { boite: [0, 40, 30, 16] }))).ecarts, []);
  const inverse = comparerCadre(cadre, maquette, releve(element('Voir', { boite: [0, 40, 30, 16] }), element('Voir', { boite: [0, 0, 30, 16] }))).ecarts;
  assert.equal(inverse.length, 2);
  assert.match(inverse[0], /« Voir » 1 : y/);
  assert.match(comparerCadre(cadre, maquette, releve(element('Voir', { boite: [0, 0, 30, 16] }))).ecarts[0], /2 dans la maquette, 1 dans le plugin/);
});

test('une pastille de repère et son contenu sont ignorés, le contour .repere aussi', () => {
  const maquette = releve(
    element('Appliquer', { classes: ['repere'] }),
    element('1', { classes: ['repere-n'] }),
    element('2', { dansPastille: true }),
  );
  assert.deepEqual(comparerCadre(cadre, maquette, releve(element('Appliquer'))).ecarts, []);
});

test('un cadre absent de la galerie ou de la maquette échoue', () => {
  const page = releve(element('Appliquer'));
  const sansGalerie = comparerCadre(cadre, page, null);
  assert.match(sansGalerie.ecarts[0], /cadre absent de la galerie/);
  assert.match(comparerCadre(cadre, null, page).ecarts[0], /cadre absent de la maquette/);
  const bilan = verdict([sansGalerie]);
  assert.equal(bilan.ok, false);
  assert.match(bilan.lignes.join('\n'), /t-essai : 1 écart/);
});

test('un sélecteur obligatoire vide, d’un côté ou de l’autre, échoue', () => {
  const avecSelecteur = { ...cadre, selecteurs: ['.vc-fil'] };
  const rempli = { elements: [], parSelecteur: { '.vc-fil': [element('')] } };
  const vide = { elements: [], parSelecteur: { '.vc-fil': [] } };
  assert.deepEqual(comparerCadre(avecSelecteur, rempli, rempli).ecarts, []);
  assert.deepEqual(comparerCadre(avecSelecteur, rempli, vide).ecarts, ['sélecteur obligatoire .vc-fil : aucun élément dans le plugin']);
  assert.deepEqual(comparerCadre(avecSelecteur, vide, rempli).ecarts, ['sélecteur obligatoire .vc-fil : aucun élément dans la maquette']);
});

test('un sélecteur apparié compare la boîte et les styles de ses éléments', () => {
  const avecSelecteur = { ...cadre, selecteurs: ['.vc-fil'] };
  const maquette = { elements: [], parSelecteur: { '.vc-fil': [element('')] } };
  const galerie = { elements: [], parSelecteur: { '.vc-fil': [element('', { boite: [10, 30, 100, 16] })] } };
  assert.match(comparerCadre(avecSelecteur, maquette, galerie).ecarts[0], /\.vc-fil : y 20\.0 dans la maquette, 30\.0 dans le plugin/);
});

test('un écart de position ou de nombre dans une zone de données est ignoré, un écart de couleur est relevé', () => {
  const avecZone = { ...cadre, zonesDeDonnees: ['.arbre'] };
  const dedans = (texte: string, surcharge: Partial<Element> = {}) => element(texte, { zones: ['.arbre'], ...surcharge });
  const maquette = releve(dedans('Button', { boite: [0, 0, 40, 16] }), element('Appliquer'));
  const decale = releve(dedans('Extra'), dedans('Button', { boite: [0, 90, 60, 20] }), dedans('Button', { boite: [0, 120, 60, 20] }), element('Appliquer'));
  assert.deepEqual(comparerCadre(avecZone, maquette, decale).ecarts, []);
  const teinte = { styles: { ...element('').styles, color: 'rgb(1, 2, 3)' } };
  const ecarts = comparerCadre(avecZone, maquette, releve(dedans('Button', teinte), element('Appliquer'))).ecarts;
  assert.equal(ecarts.length, 1);
  assert.match(ecarts[0], /« Button » \(zone de données\) : color rgb\(255, 255, 255\) dans la maquette, rgb\(1, 2, 3\) dans le plugin/);
  const horsZone = comparerCadre(avecZone, releve(element('Button')), releve(element('Button', { boite: [0, 90, 60, 20] })));
  assert.equal(horsZone.ecarts.length, 4, 'hors de la zone, la comparaison reste complète');
  const bornes = comparerCadre(avecZone, maquette, decale).bornes ?? [];
  assert.deepEqual(bornes, ['zone de données .arbre : 1 éléments dans la maquette, 3 dans le plugin, comparés sur les styles seuls']);
  assert.match(verdict([comparerCadre(avecZone, maquette, decale)]).lignes.join('\n'), /Borné dans t-essai :\n {2}zone de données \.arbre : 1 éléments/);
});

test('un texte déclaré en écart n’est ni un écart ni comparé, et le verdict le compte', () => {
  const declare = { ...cadre, ecartsDeclares: [{ texte: 'Chargement', raison: 'la maquette montre un état transitoire' }] };
  const maquette = releve(element('Appliquer'), element('Chargement'));
  const galerie = releve(element('Appliquer'), element('Extra'));
  assert.deepEqual(comparerCadre(declare, maquette, releve(element('Appliquer'))).ecarts, []);
  assert.deepEqual(comparerCadre(declare, maquette, galerie).ecarts, ['« Extra » : 1 dans le plugin, absent de la maquette']);
  const resultat = comparerCadre(declare, maquette, releve(element('Appliquer')));
  assert.deepEqual(resultat.bornes, ['écart déclaré « Chargement » : 1 dans la maquette, 0 dans le plugin (la maquette montre un état transitoire)']);
  assert.match(verdict([resultat]).lignes.join('\n'), /écart déclaré « Chargement » : 1 dans la maquette, 0 dans le plugin/);
});

test('le manifeste décrit les 43 cadres, chacun avec sa taille, sa sorte et son lot', () => {
  assert.equal(manifeste.length, 43);
  assert.equal(new Set(manifeste.map((entree) => entree.cadre)).size, 43);
  for (const entree of manifeste) {
    assert.ok(entree.largeur > 0 && entree.hauteur > 0, entree.cadre);
    assert.ok(['fenetre', 'seul'].includes(entree.sorte), entree.cadre);
    assert.match(entree.lot, /^U[1-8]$/, entree.cadre);
    assert.ok(Array.isArray(entree.selecteurs), entree.cadre);
    assert.ok(Array.isArray(entree.zonesDeDonnees ?? []) && (entree.ecartsDeclares ?? []).every(({ texte, raison }) => texte !== '' && raison !== ''), entree.cadre);
  }
  assert.ok(!manifeste.some((entree) => entree.cadre === 's-planche'));
  assert.deepEqual(manifeste.filter((entree) => entree.sorte === 'seul').map((entree) => entree.cadre), ['t-portees', 'x-button', 'x-button-corr', 'g-sans-cibles', 'g-autre', 'g-coller']);
});
