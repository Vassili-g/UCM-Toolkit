/** L'onglet Historique de la Configuration sur un DOM minimal, et la date des lots que la Configuration affiche. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Bilan } from '../src/messages';
import { TEXTES } from '../src/ui/textes';

/** Ce que l'Historique et les composants du socle emploient du DOM, avec les classes, les attributs et le texte. */
class Noeud {
  children: Noeud[] = [];
  readonly attributs = new Map<string, string>();
  readonly evenements = new Map<string, (evenement?: unknown) => void>();
  readonly classes = new Set<string>();
  hidden = false;
  disabled = false;
  type = '';
  id = '';
  tabIndex = 0;
  valeur = '';
  readonly classList = {
    add: (...noms: string[]) => noms.forEach((nom) => this.classes.add(nom)),
    contains: (nom: string) => this.classes.has(nom),
    toggle: () => {},
  };
  constructor(readonly tag: string) {}
  get className(): string { return [...this.classes].join(' '); }
  set className(valeur: string) { this.classes.clear(); valeur.split(/\s+/u).filter(Boolean).forEach((nom) => this.classes.add(nom)); }
  get textContent(): string { return this.tag === '#text' ? this.valeur : this.children.map((enfant) => enfant.textContent).join(''); }
  set textContent(texte: string) { this.children = [texteDe(texte)]; }
  append(...enfants: (Noeud | string)[]): void { this.children.push(...enfants.map((enfant) => (typeof enfant === 'string' ? texteDe(enfant) : enfant))); }
  appendChild(enfant: Noeud): Noeud { this.append(enfant); return enfant; }
  replaceChildren(...enfants: Noeud[]): void { this.children = enfants; }
  setAttribute(nom: string, valeur: string): void { this.attributs.set(nom, valeur); }
  addEventListener(type: string, action: (evenement?: unknown) => void): void { this.evenements.set(type, action); }
}
function texteDe(valeur: string): Noeud {
  const noeud = new Noeud('#text');
  noeud.valeur = valeur;
  return noeud;
}
(globalThis as { document?: unknown }).document = {
  createElement: (tag: string) => new Noeud(tag),
  createElementNS: (_espace: string, tag: string) => new Noeud(tag),
  createTextNode: texteDe,
};

/** Les descendants qui portent toutes les classes données, dans l'ordre du document. */
function tous(racine: Noeud, ...classes: string[]): Noeud[] {
  const trouves: Noeud[] = [];
  const parcourir = (noeud: Noeud): void => {
    for (const enfant of noeud.children) {
      if (classes.every((classe) => enfant.classes.has(classe))) trouves.push(enfant);
      parcourir(enfant);
    }
  };
  parcourir(racine);
  return trouves;
}
const textes = (noeuds: readonly Noeud[]): string[] => noeuds.map((noeud) => noeud.textContent);

const modules = Promise.all([import('../src/ui/historique'), import('../src/ui/aAppliquer')]);

/** Le moment présent des tests : un mardi après-midi, heure locale. */
const maintenant = (): Date => new Date(2026, 9, 20, 15, 0);
const iso = (annee: number, mois: number, jour: number, heure: number, minute: number): string => new Date(annee, mois - 1, jour, heure, minute).toISOString();

type Renommage = NonNullable<Bilan['dernierRenommage']>;
type Import = NonNullable<Bilan['dernierImport']>;

const renommage: Renommage = {
  nombre: 12, reviennent: 3, heure: iso(2026, 10, 20, 14, 32),
  collections: [
    {
      id: 'c1', nom: 'color-brands', exclue: false,
      lignes: [
        { type: 'variable', aujourdhui: 'background/default', ancien: 'bg/default', sort: 'revient' },
        { type: 'variable', aujourdhui: 'font-size/body-large', ancien: 'fontSize/bodyLarge', sort: 'revient' },
        { type: 'variable', aujourdhui: 'text/hover-strong', ancien: 'text/hover', sort: 'change-depuis' },
        { type: 'collection', aujourdhui: 'color-brands', ancien: 'colorBrands', sort: 'revient' },
      ],
    },
    { id: 'c2', nom: 'Couleurs', exclue: true, lignes: [{ type: 'variable', aujourdhui: 'brand/primary-hover', ancien: 'brand/primaryHovered', sort: 'revient' }] },
    { id: null, nom: null, exclue: false, lignes: [{ type: 'variable', aujourdhui: null, ancien: 'old/name', sort: 'change-depuis' }] },
  ],
};
const minusculesTirets = { casse: 'minuscules', separateur: 'tiret' } as const;
const pascal = { casse: 'PascalCase', separateur: 'camelCase' } as const;
const dernierImport: Import = {
  heure: iso(2026, 10, 20, 14, 35),
  lignes: [
    { sorte: 'ecriture', avant: { groupes: pascal, variables: pascal }, apres: { groupes: pascal, variables: minusculesTirets } },
    { sorte: 'terme', terme: 'hover', avant: null, apres: ['hovered'] },
    { sorte: 'terme', terme: 'background', avant: ['bg'], apres: ['bg', 'bkg'] },
    { sorte: 'terme', terme: 'identique', avant: ['a'], apres: ['a'] },
    { sorte: 'autres', nombre: 2 },
  ],
};

async function banc() {
  const [{ creerHistorique }] = await modules;
  const clics: string[] = [];
  const historique = creerHistorique({ annulerLeRenommage: () => clics.push('renommage'), annulerLImport: () => clics.push('import') }, maintenant);
  const element = historique.element as unknown as Noeud;
  return { historique, element, clics };
}

test('la date d’un lot s’écrit à l’heure locale : aujourd’hui, hier, un autre jour, une autre année', () => {
  const maintenantLocal = maintenant();
  assert.equal(TEXTES.quandLeLot(iso(2026, 10, 20, 14, 32), maintenantLocal), 'aujourd’hui à 14:32');
  assert.equal(TEXTES.quandLeLot(iso(2026, 10, 19, 17, 5), maintenantLocal), 'hier à 17:05');
  assert.equal(TEXTES.quandLeLot(iso(2026, 10, 14, 9, 12), maintenantLocal), 'le 14 octobre à 09:12');
  assert.equal(TEXTES.quandLeLot(iso(2025, 10, 14, 9, 12), maintenantLocal), 'le 14 octobre 2025 à 09:12');
  assert.equal(TEXTES.quandLeLot(iso(2026, 3, 1, 8, 0), maintenantLocal), 'le 1er mars à 08:00');
  assert.equal(TEXTES.quandLeLot(iso(2026, 10, 31, 23, 59), new Date(2026, 10, 1, 0, 5)), 'hier à 23:59', 'hier passe la limite du mois');
});

test('un texte qui ne se lit pas comme une date revient tel quel, après « à »', () => {
  assert.equal(TEXTES.quandLeLot('14:32', maintenant()), 'à 14:32');
  assert.equal(TEXTES.quandLeLot('hier soir', maintenant()), 'à hier soir');
  assert.equal(TEXTES.quandLeLot('2026-13-45T99:99:99Z', maintenant()), 'à 2026-13-45T99:99:99Z');
});

test('les textes de la ligne du lot et de la confirmation comptent les noms qui reviennent', () => {
  assert.equal(TEXTES.renommagesALHeure(12, 'aujourd’hui à 14:32'), '12 noms, aujourd’hui à 14:32');
  assert.equal(TEXTES.importeALHeure(3, 'hier à 17:05'), '3 règles changées, hier à 17:05');
  assert.equal(TEXTES.importeALHeure(1, 'hier à 17:05'), '1 règle changée, hier à 17:05');
  assert.equal(TEXTES.confirmerLAnnulation(12), 'Annuler le renommage ? 12 noms reprennent leur ancien nom.');
  assert.equal(TEXTES.confirmerLAnnulation(1), 'Annuler le renommage ? 1 nom reprend son ancien nom.');
  assert.equal(TEXTES.nomsNeReviendrontPas(5), '5 noms ne reviendront pas.');
  assert.equal(TEXTES.nomsNeReviendrontPas(1), '1 nom ne reviendra pas.');
});

test('un historique vide dit qu’il n’y a rien à annuler', async () => {
  const { historique, element } = await banc();
  historique.poser(null, null);
  assert.deepEqual(textes(tous(element, 'historique-note')), ['Rien à annuler pour l’instant.', 'Après chaque renommage ou import, l’état d’avant apparaît ici.']);
  assert.equal(tous(element, 'config-section').length, 0);
});

test('le dernier renommage montre sa ligne, sa note, les noms qui ne reviendront pas et une carte par collection', async () => {
  const { historique, element, clics } = await banc();
  historique.poser(renommage, null);
  assert.deepEqual(textes(tous(element, 'config-titre')), ['Dernier renommage']);
  assert.equal(tous(element, 'config-renommage')[0]!.textContent, '12 noms, aujourd’hui à 14:32');
  assert.equal(tous(element, 'historique-note')[0]!.textContent, 'Seul le dernier renommage est gardé.');
  // 6 noms affichés, 3 reviennent : 3 ne reviendront pas.
  assert.deepEqual(textes(tous(element, 'historique-avertissement')), ['3 noms ne reviendront pas.']);
  const [annuler] = tous(element, 'btn');
  assert.equal(annuler!.textContent, 'Annuler le renommage');
  assert.equal(annuler!.disabled, false);
  annuler!.evenements.get('click')!({ preventDefault() {} });
  assert.deepEqual(clics, ['renommage']);

  assert.deepEqual(textes(tous(element, 'config-nom')), ['color-brands', 'Couleurs', 'Introuvables']);
  assert.deepEqual(textes(tous(element, 'historique-liste')[0]!.children.map((carte) => tous(carte, 'meta')[0]!)), ['4 noms', '1 nom', '1 nom']);
  const tetes = tous(element, 'tete-bouton');
  assert.deepEqual(tetes.map((tete) => tete.attributs.get('aria-expanded')), ['true', 'false', 'false'], 'la première carte est ouverte');
  tetes[1]!.evenements.get('click')!();
  assert.equal(tetes[1]!.attributs.get('aria-expanded'), 'true');
  historique.poser(renommage, null);
  assert.deepEqual(tous(element, 'tete-bouton').map((tete) => tete.attributs.get('aria-expanded')), ['true', 'true', 'false'], 'un bilan garde les cartes ouvertes');
});

test('le diff marque les segments qui changent, met la collection en tête et grise un nom changé depuis', async () => {
  const { historique, element } = await banc();
  historique.poser(renommage, null);
  const [premiere, , introuvables] = tous(element, 'historique-liste')[0]!.children;
  const lignes = tous(premiere!, 'diff');
  assert.equal(lignes.length, 4);
  assert.deepEqual(textes(tous(premiere!, 'colonnes-tete')[0]!.children), ['Aujourd’hui', 'Après l’annulation']);
  // La collection vient d'abord, avec sa mention.
  assert.equal(lignes[0]!.textContent.startsWith('color-brands collection'), true);
  assert.deepEqual(textes(tous(lignes[0]!, 'meta')), ['collection']);
  // Un segment sur deux : seul le premier change.
  assert.deepEqual(textes(tous(lignes[1]!, 'seg-ancien')), ['background']);
  assert.deepEqual(textes(tous(lignes[1]!, 'seg-nouveau')), ['bg']);
  // Le nombre de segments diffère : tout est marqué.
  assert.deepEqual(textes(tous(lignes[2]!, 'seg-ancien')), ['font-size', 'body-large']);
  assert.deepEqual(textes(tous(lignes[2]!, 'seg-nouveau')), ['fontSize', 'bodyLarge']);
  // Un nom changé depuis : gris, sans marque, avec la raison.
  assert.equal(lignes[3]!.classes.has('reste'), true);
  assert.equal(tous(lignes[3]!, 'seg-ancien').length + tous(lignes[3]!, 'seg-nouveau').length, 0);
  assert.equal(tous(lignes[3]!, 'chemin')[0]!.textContent, 'text/hover-strong');
  assert.equal(tous(lignes[3]!, 'chemin-apres')[0]!.textContent, 'Changé dans Figma depuis');
  // Un objet disparu.
  const [disparu] = tous(introuvables!, 'diff');
  assert.equal(tous(disparu!, 'chemin-apres')[0]!.textContent, 'Supprimé dans Figma');
  assert.equal(tous(disparu!, 'chemin')[0]!.textContent, 'old/name');
});

test('une collection exclue porte la pastille « Non analysée » et la phrase qui dit quoi cocher', async () => {
  const { historique, element } = await banc();
  historique.poser(renommage, null);
  const exclue = tous(element, 'historique-liste')[0]!.children[1]!;
  assert.deepEqual(textes(tous(exclue, 'pastille', 'pastille-attente')), ['Non analysée']);
  const corps = tous(exclue, 'corps')[0]!;
  assert.equal(corps.children[0]!.classes.has('historique-note'), true);
  assert.equal(corps.children[0]!.textContent, 'Cochez cette collection dans Réglages pour rétablir ses noms.');
  assert.equal(tous(tous(element, 'historique-liste')[0]!.children[0]!, 'pastille').length, 0);
});

test('sans nom qui revienne, le bouton d’annulation reste inactif et aucun avertissement ne s’ajoute pour un lot complet', async () => {
  const { historique, element } = await banc();
  historique.poser({ ...renommage, reviennent: 0 }, null);
  assert.equal(tous(element, 'btn')[0]!.disabled, true);
  const complet: Renommage = { ...renommage, reviennent: 1, collections: [{ id: 'c', nom: 'c', exclue: false, lignes: [{ type: 'variable', aujourdhui: 'a/b', ancien: 'a/c', sort: 'revient' }] }] };
  historique.poser(complet, null);
  assert.equal(tous(element, 'historique-avertissement').length, 0);
  assert.equal(tous(element, 'btn')[0]!.disabled, false);
  historique.bloquer({ renommage: true, importe: false });
  assert.equal(tous(element, 'btn')[0]!.disabled, true, 'inactif pendant la demande');
  historique.bloquer({ renommage: false, importe: false });
  assert.equal(tous(element, 'btn')[0]!.disabled, false);
});

test('le dernier import montre les règles d’aujourd’hui et celles d’après l’annulation, sans les lignes identiques', async () => {
  const [, { specimenDeConvention }] = await modules;
  const { historique, element, clics } = await banc();
  historique.poser(null, dernierImport);
  assert.deepEqual(textes(tous(element, 'config-titre')), ['Dernier import']);
  assert.equal(tous(element, 'config-renommage')[0]!.textContent, '5 règles changées, aujourd’hui à 14:35', '3 lignes détaillées et 2 autres');
  const [annuler] = tous(element, 'btn');
  assert.equal(annuler!.textContent, 'Annuler l’import');
  annuler!.evenements.get('click')!({ preventDefault() {} });
  assert.deepEqual(clics, ['import']);
  assert.deepEqual(textes(tous(element, 'colonnes-tete')[0]!.children), ['Aujourd’hui', 'Après l’annulation']);
  const regles = tous(element, 'diff', 'regle');
  assert.equal(regles.length, 3, 'les groupes inchangés et le terme identique ne s’affichent pas');
  // Écriture : aujourd'hui = après l'import, après l'annulation = avant l'import.
  assert.deepEqual(textes(regles[0]!.children), [`Écrire les variables en${specimenDeConvention(minusculesTirets)}`, `Écrire les variables en${specimenDeConvention(pascal)}`]);
  // Terme absent avant l'import.
  assert.deepEqual(textes(tous(regles[1]!.children[0]!, 'jeton', 'jeton-neutre')), ['hovered', 'hover']);
  assert.deepEqual(textes(tous(regles[1]!.children[1]!, 'meta')), ['Aucune règle']);
  assert.equal(regles[1]!.children[0]!.textContent, 'hovered→hover');
  // Formes remplacées des deux côtés.
  assert.equal(regles[2]!.children[0]!.textContent, 'bgbkg→background');
  assert.equal(regles[2]!.children[1]!.textContent, 'bg→background');
  assert.deepEqual(textes(tous(element, 'corps')[0]!.children.filter((enfant) => enfant.tag === 'span')), ['2 autres règles changées']);
});

test('l’écriture inchangée côté groupes ne produit qu’une ligne, et une règle d’écriture absente avant l’import en produit deux', async () => {
  const { historique, element } = await banc();
  historique.poser(null, { heure: dernierImport.heure, lignes: [{ sorte: 'ecriture', avant: null, apres: { groupes: pascal, variables: pascal } }, { sorte: 'autres', nombre: 1 }] });
  assert.equal(tous(element, 'diff', 'regle').length, 2);
  assert.deepEqual(textes(tous(element, 'meta')), ['Aucune règle', 'Aucune règle', '1 autre règle changée']);
  assert.equal(tous(element, 'config-renommage')[0]!.textContent, '3 règles changées, aujourd’hui à 14:35');
});

test('après une annulation réussie, une ligne verte précède l’Historique, et elle disparaît quand on la retire', async () => {
  const { historique, element } = await banc();
  historique.poser(null, dernierImport);
  historique.reussite(12);
  const [resultat] = tous(element, 'resultat');
  assert.equal(resultat!.attributs.get('role'), 'status');
  assert.equal(resultat!.textContent, '✓ 12 noms rétablisLes renommages reviennent dans l’onglet Renommages.');
  assert.equal(element.children[0], resultat, 'en tête');
  assert.equal(tous(resultat!, 'meta')[0]!.textContent, 'Les renommages reviennent dans l’onglet Renommages.');
  const coche = resultat!.children[0]!.children[0]!.children[0]!;
  assert.equal(coche.attributs.get('aria-hidden'), 'true');
  assert.equal(TEXTES.nomsRetablis(1), '1 nom rétabli');
  historique.reussite(null);
  assert.equal(tous(element, 'resultat').length, 0);
  // Sans renommage ni import, une réussite à montrer évite la page vide.
  historique.poser(null, null);
  historique.reussite(3);
  assert.equal(tous(element, 'historique-note').length, 0);
  assert.equal(tous(element, 'resultat').length, 1);
});

test('les segments qui changent : mêmes longueurs, rangs différents ; sinon tout', async () => {
  const [{ segmentsQuiChangent }] = await modules;
  assert.deepEqual(segmentsQuiChangent('a/b/c', 'a/x/c'), [1]);
  assert.deepEqual(segmentsQuiChangent('a/b', 'a/b'), []);
  assert.deepEqual(segmentsQuiChangent('a/b', 'x'), [0, 1]);
  assert.deepEqual(segmentsQuiChangent('x', 'a/b/c'), [0, 1, 2]);
});
