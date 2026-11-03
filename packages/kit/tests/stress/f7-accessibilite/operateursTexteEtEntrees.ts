/**
 * Les opérateurs de texte mixte et d'entrées dégradées sur P0 : T1 et T2 (plusieurs plages, plusieurs TEXT de même nom, un même nom
 * dans deux variants), L1 (vingt entrées que le relevé ne devrait pas porter) et L2 (lectures manquées). Un cas de L1 n'attend aucun
 * constat : seule une exception du contrôle y compte (P20). Le cycle de `parent` de L1-13 ne finit jamais : `couchesDesAncetres` ne
 * garde pas les ancêtres déjà vus. Le harnais l'exécute dans un processus à délai (`risqueDeBoucle`).
 */
import {
  contrasteAttendu, fabrique, nomDeLaCible, type AttenduAcc, type CasAccessibilite,
} from './cas.js';
import { themeDuCatalogue, type ComposantDeContraste } from './composantDeContraste.js';
import { solide, type Degradation, type PlageDeTexte } from './degradation.js';
import { atteintLeSeuil, estUnGrandTexte, rapportDeHex, seuilDuTexte, tronquerA2 } from './oracleContraste.js';

const BLANC = '#FFFFFF';
const NOIR = '#000000';
const FAIBLE = '#BBBBBB';
const AUTRE = '#AAAAAA';
const GRIS = '#808080';

export function operateurT(base: ComposantDeContraste): CasAccessibilite[] {
  const faire = fabrique(base);
  const cible = nomDeLaCible(base);
  const cas: CasAccessibilite[] = [];
  const numero = (operateur: string): number => cas.filter((c) => c.operateur === operateur).length + 1;

  const plage = (debut: number, fin: number, couleur: string, fontSize = 14, fontWeight = 400): PlageDeTexte =>
    ({ debut, fin, fontSize, fontWeight, peintures: [solide(couleur)] });
  /** Le constat de la plage `debut-fin` du texte `Label`, ou aucun quand la couleur atteint le seuil de sa classe. */
  const attenduDePlage = (debut: number, fin: number, couleur: string, fontSize = 14, fontWeight = 400, variants = [cible], extra: Partial<Parameters<typeof contrasteAttendu>[0]> = {}): AttenduAcc[] => {
    const seuil = seuilDuTexte(fontSize, fontWeight, 'AA');
    const rapport = rapportDeHex(couleur, BLANC);
    if (atteintLeSeuil(rapport, seuil)) return [];
    return [contrasteAttendu({
      usage: estUnGrandTexte(fontSize, fontWeight) ? 'grand-texte' : 'texte', layer: 'Label', plage: `${debut}-${fin}`, rapport, seuil, variants, premierPlan: couleur, fondHex: BLANC, ...extra,
    })];
  };
  const texteDePlages = (...plages: PlageDeTexte[]) => (d: Degradation): void => { d.scene({ racineEnDur: true }); d.ajouterUnLayer({ nom: 'Label', type: 'TEXT', plages }); };

  // T1 : chaque plage se juge à sa couleur, sa taille et sa graisse.
  cas.push(faire(`T1-${numero('T1')}`, 'T1', {
    description: `deux plages de couleurs différentes, ${FAIBLE} et ${AUTRE}, qui échouent toutes deux`, degrader: texteDePlages(plage(0, 5, FAIBLE), plage(5, 10, AUTRE)),
    attendus: [...attenduDePlage(0, 5, FAIBLE), ...attenduDePlage(5, 10, AUTRE)],
  }));
  cas.push(faire(`T1-${numero('T1')}`, 'T1', {
    description: `trois plages dont la deuxième seule échoue (${FAIBLE})`, degrader: texteDePlages(plage(0, 4, NOIR), plage(4, 7, FAIBLE), plage(7, 10, NOIR)), attendus: attenduDePlage(4, 7, FAIBLE),
  }));
  cas.push(faire(`T1-${numero('T1')}`, 'T1', {
    description: `une plage de 24 px et une de 14 px de même couleur ${GRIS} (3,95:1) : seule la petite échoue`, degrader: texteDePlages(plage(0, 5, GRIS, 24), plage(5, 10, GRIS, 14)),
    attendus: attenduDePlage(5, 10, GRIS, 14),
  }));
  cas.push(faire(`T1-${numero('T1')}`, 'T1', {
    description: `une plage de 18,7 px en 700 et une en 400 de même couleur ${GRIS} : seule la plage en 400 échoue`, degrader: texteDePlages(plage(0, 5, GRIS, 18.7, 700), plage(5, 10, GRIS, 18.7, 400)),
    attendus: attenduDePlage(5, 10, GRIS, 18.7, 400),
  }));
  cas.push(faire(`T1-${numero('T1')}`, 'T1', {
    description: `une plage vide (5 à 5) en ${FAIBLE} après une plage noire : aucun caractère, aucun constat`, degrader: texteDePlages(plage(0, 5, NOIR), plage(5, 5, FAIBLE)), attendus: [],
  }));
  const modes = (rapports: readonly (readonly [string, number])[], mode: string, autres: number) => ({ mode, autresModes: autres, rapports });
  cas.push(faire(`T1-${numero('T1')}`, 'T1', {
    description: `plage 0-5 liée à un token du thème (${FAIBLE} en Light, noir en Dark) et plage 5-10 noire en dur`,
    degrader: (d) => {
      d.scene({ racineEnDur: true });
      const texte = d.ajouterUnLayer({ nom: 'Label', type: 'TEXT', plages: [plage(0, 5, NOIR), plage(5, 10, NOIR)] });
      d.lier(texte, d.nouvelleVariable({ nom: 'test/plage', collection: themeDuCatalogue(d.catalogue), valeurs: [FAIBLE, NOIR] }), { plage: 0 });
    },
    attendus: attenduDePlage(0, 5, FAIBLE, 14, 400, [cible], modes([['theme en Light', tronquerA2(rapportDeHex(FAIBLE, BLANC))], ['theme en Dark', 21]], 'theme en Light', 0)),
  }));
  cas.push(faire(`T1-${numero('T1')}`, 'T1', {
    description: `plage 0-5 en dur ${FAIBLE} et plage 5-10 liée à un token du thème noir dans les deux modes`,
    degrader: (d) => {
      d.scene({ racineEnDur: true });
      const texte = d.ajouterUnLayer({ nom: 'Label', type: 'TEXT', plages: [plage(0, 5, FAIBLE), plage(5, 10, NOIR)] });
      d.lier(texte, d.nouvelleVariable({ nom: 'test/plage', collection: themeDuCatalogue(d.catalogue), valeurs: [NOIR, NOIR] }), { plage: 1 });
    },
    attendus: attenduDePlage(0, 5, FAIBLE, 14, 400, [cible], { autresModes: 1 }),
  }));
  cas.push(faire(`T1-${numero('T1')}`, 'T1', {
    description: `deux TEXT nommés Label dans le même variant, en ${FAIBLE} et ${AUTRE} : un constat, à la pire couleur, sans layer en double`,
    degrader: (d) => { d.scene({ racineEnDur: true }); d.ajouterUnLayer({ nom: 'Label', type: 'TEXT', plages: [plage(0, 10, AUTRE)] }); d.ajouterUnLayer({ nom: 'Label', type: 'TEXT', plages: [plage(0, 10, FAIBLE)] }); },
    attendus: attenduDePlage(0, 10, FAIBLE), layersUniques: true,
  }));

  // T2 : le même TEXT dans deux variants. L'identifiant ne porte pas la plage (Q-F7-12).
  const [v0, v1] = base.releve.variants;
  const labelDans = (d: Degradation, rang: number, plages: PlageDeTexte[]): void => {
    const variant = d.releve.variants[rang];
    d.scene({ variant, racineEnDur: true });
    d.ajouterUnLayer({ variant, nom: 'Label', type: 'TEXT', plages });
  };
  cas.push(faire(`T2-${numero('T2')}`, 'T2', {
    description: `Label de 14 px dans un variant, de 24 px dans l'autre, tous deux en ${FAIBLE} : un constat par classe de texte`,
    degrader: (d) => { labelDans(d, 0, [plage(0, 10, FAIBLE, 14)]); labelDans(d, 1, [plage(0, 10, FAIBLE, 24)]); },
    attendus: [...attenduDePlage(0, 10, FAIBLE, 14, 400, [v0.nom]), ...attenduDePlage(0, 10, FAIBLE, 24, 400, [v1.nom])],
  }));
  cas.push(faire(`T2-${numero('T2')}`, 'T2', {
    description: `Label de 14 px en ${FAIBLE}, de 10 caractères dans un variant et de 12 dans l'autre : un seul groupe`,
    degrader: (d) => { labelDans(d, 0, [plage(0, 10, FAIBLE)]); labelDans(d, 1, [plage(0, 12, FAIBLE)]); },
    attendus: [{ ...attenduDePlage(0, 10, FAIBLE, 14, 400, [v0.nom, v1.nom])[0], cle: 'texte|Label||' }], verdict: 'mesure', question: 'Q-F7-12', hypothese: 'H14',
  }));
  return cas;
}

export function operateurL(base: ComposantDeContraste): CasAccessibilite[] {
  const faire = fabrique(base);
  const cible = nomDeLaCible(base);
  const cas: CasAccessibilite[] = [];
  const numero = (operateur: string): number => cas.filter((c) => c.operateur === operateur).length + 1;

  // L1 : aucune exception, quel que soit le défaut du relevé.
  const exception = (description: string, degrader: (d: Degradation) => void, plus: Partial<Parameters<typeof faire>[2]> = {}): void => {
    cas.push(faire(`L1-${numero('L1')}`, 'L1', { description: `${description} : le contrôle ne lève pas`, degrader, attendus: [], codesJuges: [], ...plus }));
  };
  const texteAvec = (peintures = [solide(NOIR)], plus: Partial<Parameters<Degradation['ajouterUnLayer']>[0]> = {}, plage: Partial<PlageDeTexte> = {}) => (d: Degradation): void => {
    d.scene();
    d.ajouterUnLayer({ nom: 'Texte', type: 'TEXT', plages: [{ peintures, ...plage }], ...plus });
  };
  const canal = (r: number, g: number, b: number, a: number) => ({ ...solide(NOIR), couleur: { r, g, b, a } });
  exception('canal rouge NaN', texteAvec([canal(NaN, 0, 0, 1)]));
  exception('alpha NaN', texteAvec([canal(0, 0, 0, NaN)]));
  exception('opacité de layer négative', texteAvec([solide(NOIR)], { opacite: -1 }));
  exception('opacité de layer à 2', texteAvec([solide(NOIR)], { opacite: 2 }));
  exception('taille de texte à 0', texteAvec([solide(NOIR)], {}, { fontSize: 0 }));
  exception('taille de texte NaN', texteAvec([solide(NOIR)], {}, { fontSize: NaN }));
  exception('taille de texte négative', texteAvec([solide(NOIR)], {}, { fontSize: -14 }));
  exception('taille de texte infinie', texteAvec([solide(NOIR)], {}, { fontSize: Infinity }));
  exception('graisse NaN', texteAvec([solide(NOIR)], {}, { fontWeight: NaN }));
  exception('dimensions de la racine NaN', (d) => { d.fixer(d.racine(), 'dimensions', { x: NaN, y: NaN, largeur: NaN, hauteur: NaN }); });
  exception('épaisseur de contour NaN', (d) => { d.scene(); d.ajouterUnLayer({ nom: 'Contour', peintures: [solide(GRIS, { champ: 'strokes' })], strokeWeight: NaN }); });
  exception('épaisseur de contour négative', (d) => { d.scene(); d.ajouterUnLayer({ nom: 'Contour', peintures: [solide(GRIS, { champ: 'strokes' })], strokeWeight: -1 }); });
  exception('cycle de parent entre deux cadres sans fond, avec un texte dessous', (d) => {
    const racine = d.scene();
    const a = d.ajouterUnLayer({ nom: 'A', type: 'FRAME', parent: racine });
    const b = d.ajouterUnLayer({ nom: 'B', type: 'FRAME', parent: a });
    d.fixer(a, 'parent', b.id);
    d.ajouterUnTexte('Texte', { peintures: [solide(FAIBLE)] }, { parent: b });
  }, { risqueDeBoucle: true, sansRelation: ['ordre', 'casse'] });
  exception('deux layers de même identifiant', (d) => {
    d.scene();
    const premier = d.ajouterUnTexte('Texte', { peintures: [solide(FAIBLE)] });
    const second = d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] });
    d.fixer(second, 'id', premier.id);
  });
  exception('variant sans layer', (d) => { d.fixer(d.cible, 'layers', []); });
  exception('aucun variant', (d) => { d.fixer(d.releve, 'variants', []); });
  exception('propriétés vides', (d) => { d.fixer(d.releve, 'proprietes', []); });
  exception('catalogue vide', (d) => { d.fixer(d.catalogue, 'collections', []); d.fixer(d.catalogue, 'variables', []); });
  exception('collection de thème sans mode', (d) => { d.fixer(themeDuCatalogue(d.catalogue), 'modes', []); });
  exception('alias en cycle entre deux variables, texte lié', (d) => {
    d.scene();
    const collection = d.nouvelleCollection('Cycle', ['Mode 1']);
    const a = d.nouvelleVariable({ nom: 'cycle/a', collection, valeurs: [{ alias: 'vide' }] });
    const b = d.nouvelleVariable({ nom: 'cycle/b', collection, valeurs: [{ alias: a.cle }] });
    d.fixer(a.valeurs!, collection.modes[0].id, { alias: b.cle });
    d.lier(d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] }), a, { plage: 0 });
  });

  // L2 : ce que le relevé dit ne pas avoir lu ne s'accuse pas (P21).
  const manquee = (champ: string, motif: string, quoi: (d: Degradation) => string) => (d: Degradation): void => { d.inserer(d.releve.lecture.manquees, { layer: quoi(d), champ, motif }); };
  cas.push(faire(`L2-${numero('L2')}`, 'L2', {
    description: 'racine de 20 px dont les dimensions n\'ont pas été lues', attendus: [],
    degrader: (d) => { d.fixer(d.racine(), 'dimensions', { x: 0, y: 0, largeur: 20, hauteur: 20 }); manquee('dimensions', 'illisible', (x) => x.racine().id)(d); },
  }));
  cas.push(faire(`L2-${numero('L2')}`, 'L2', {
    description: `texte ${FAIBLE} dont les fills n'ont pas été lus`, attendus: [],
    degrader: (d) => { d.scene(); const texte = d.ajouterUnTexte('Texte', { peintures: [solide(FAIBLE)] }); manquee('fills', 'illisible', () => texte.id)(d); },
  }));
  cas.push(faire(`L2-${numero('L2')}`, 'L2', {
    description: `texte ${FAIBLE} sur un Root dont les fills n'ont pas été lus`, attendus: [],
    degrader: (d) => { d.scene(); d.ajouterUnTexte('Texte', { peintures: [solide(FAIBLE)] }); manquee('fills', 'illisible', (x) => x.racine().id)(d); },
  }));
  cas.push(faire(`L2-${numero('L2')}`, 'L2', {
    description: `contour ${FAIBLE} dont les strokes n'ont pas été lus`, attendus: [],
    degrader: (d) => { d.scene(); const contour = d.ajouterUnLayer({ nom: 'Contour', peintures: [solide(FAIBLE, { champ: 'strokes' })], strokeWeight: 1 }); manquee('strokes', 'illisible', () => contour.id)(d); },
  }));
  cas.push(faire(`L2-${numero('L2')}`, 'L2', {
    description: `texte ${FAIBLE} dans un variant que le relevé dit ne pas avoir lu`, attendus: [],
    degrader: (d) => { d.scene(); d.ajouterUnTexte('Texte', { peintures: [solide(FAIBLE)] }); d.inserer(d.releve.lecture.variantsNonLus, d.cible.nom); },
  }));
  cas.push(faire(`L2-${numero('L2')}`, 'L2', {
    description: `texte ${FAIBLE} lu, alors que le nombre de layers non lus est inconnu : il reste accusé`,
    degrader: (d) => { d.scene(); d.ajouterUnTexte('Texte', { peintures: [solide(FAIBLE)] }); d.fixer(d.releve.lecture, 'layersNonLus', 'inconnu'); },
    attendus: [contrasteAttendu({ usage: 'texte', layer: 'Texte', plage: '0-10', rapport: rapportDeHex(FAIBLE, BLANC), seuil: 4.5, variants: [cible], premierPlan: FAIBLE, fondHex: BLANC })],
  }));
  return cas;
}
