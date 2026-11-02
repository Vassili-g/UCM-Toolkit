/**
 * Les opérateurs de dégradation du thème dans un composant (T1 et T2, constat C59) des stress tests F3. Un texte lié à
 * `surface/foreground` se pose sur un fond de surface : `surface/default`, `hover` ou `pressed` (Q-F3-10 y ajoute `subtle`).
 * Le texte, son fond et leurs ancêtres forment un second arbre `Zone` dans le variant, pour que les fonds de `Root` ne
 * répondent pas à la place du fond posé.
 *
 * Deux formes par situation : la liaison directe à `theme` (C80 sur chaque liaison directe, C59 selon le fond) et le token de
 * `components` aliasé à la variable de thème, que Q-F3-9 fait résoudre. Les cas dont l'attendu change avec Q-F3-9 sont `mesure` :
 * toutes les formes par token, et les formes directes où l'on attend un C59, puisque la décision provisoire de Q-F3-9 laisse
 * alors C80 seul. La correction attendue est le token de `components` dont l'alias vise `page/foreground`, s'il est unique.
 */
import type { LayerLu, LiaisonLue, VariableDuCatalogue } from '../../../src/controles/index.js';
import type { ConstatAttendu } from '../commun/types.js';
import type { VariantDeCarte } from './carte.js';
import { GRAINE_PAR_DEFAUT, type ComposantDeBase } from './composantDeBase.js';
import {
  attendu, Degradation, jetonCouleur, lieuDe, liaisonDeCible, Registre, variableLue, variantsOu,
  type CasDeComposant, type LieuDeConstat,
} from './operateursAxes.js';
import { ajouterAvecCodes, ajouterUnLayer, peintureUnie } from './operateursPeinture.js';

const CODES_DE_T: readonly string[] = ['C59', 'C80'];

/** La clé d'un C59 : comme `cleDeConstat`, qui lit `plageDebut` dans les faits de ce code. */
const cleDeC59 = (lieu: LieuDeConstat): string => [lieu.variant, lieu.layer, lieu.champ, lieu.plageDebut ?? '', lieu.token].join('|');

type Fond = 'aucun' | 'en dur' | 'surface/default' | 'surface/hover' | 'surface/pressed' | 'surface/subtle' | 'solid/default' | 'page/foreground' | 'ancetre' | 'frere';

/** Les dix fonds de T1, et le C59 que la règle attend pour chacun. `subtle` dépend de Q-F3-10. */
const FONDS: readonly (readonly [Fond, c59: boolean])[] = [
  ['aucun', true], ['en dur', true], ['surface/default', false], ['surface/hover', false], ['surface/pressed', false],
  ['surface/subtle', false], ['solid/default', true], ['page/foreground', true], ['ancetre', false], ['frere', true],
];

export function operateursTheme(base: ComposantDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeComposant[] {
  const registre = new Registre(base, graine);
  const carte = base.carte;
  const sansEtatDesactive = variantsOu(carte, (variant) => !jetonCouleur(carte, variant, 'background')?.cible.nom.startsWith('disabled/'));

  /** La palette du thème que ce variant lit, par le préfixe de la cible de son fond. */
  const paletteDe = (variant: VariantDeCarte): string => jetonCouleur(carte, variant, 'background')!.cible.nom.split('/')[0];

  /** Un token de `components` aliasé à la variable de thème, dans tous les modes. */
  const tokenVers = (degradation: Degradation, modele: VariableDuCatalogue, nom: string, cible: VariableDuCatalogue): VariableDuCatalogue => {
    const modes = degradation.catalogue.collections.find((collection) => collection.cle === modele.collection)!.modes;
    return degradation.cloner(modele, { nom: `${modele.nom.split('/')[0]}/color/zone/${nom}`, valeurs: Object.fromEntries(modes.map((mode) => [mode.id, { alias: cible.cle }])) });
  };
  const lier = (degradation: Degradation, variant: string, layer: LayerLu, variable: VariableDuCatalogue, plage?: { debut: number; fin: number }): void => {
    const liaison: LiaisonLue = { champ: 'fills', ...(plage ? { plage } : { indice: 0 }), porteur: layer.id, variable: variableLue(variable) };
    degradation.inserer(layer.liaisons, liaison);
    degradation.zones.push({ variant, layer: layer.id, champ: 'fills' });
    if (plage) degradation.inserer(layer.texte!.plages.find((entree) => entree.debut === plage.debut)!.liaisons, liaison);
  };

  interface Situation { texte: LayerLu; fondLie: LayerLu | undefined; c80Directs: { layer: LayerLu; variable: VariableDuCatalogue }[] }

  /**
   * Bâtit le second arbre du variant. Le fond est lié à la variable de thème directement, ou par un token de `components`.
   * `plage` pose la couleur du texte sur une plage au lieu du layer.
   */
  const bâtir = (degradation: Degradation, variant: VariantDeCarte, fond: Fond, par: 'direct' | 'token', plage = false): Situation & { texteLie: VariableDuCatalogue } => {
    const palette = paletteDe(variant);
    const theme = (nom: string): VariableDuCatalogue => degradation.variableParNom(`${palette}/${nom}`)!;
    const modeleDeToken = degradation.variable(jetonCouleur(carte, variant, 'foreground')!.cle);
    const lieA = (variable: VariableDuCatalogue, nom: string): VariableDuCatalogue => (par === 'direct' ? variable : tokenVers(degradation, modeleDeToken, nom, variable));

    const zone = ajouterUnLayer(degradation, variant.id, { nom: 'Zone', type: 'FRAME', parent: null });
    const c80Directs: Situation['c80Directs'] = [];
    let fondLie: LayerLu | undefined;
    const poserLeFond = (layer: LayerLu, nom: string): void => {
      degradation.inserer(layer.peintures, peintureUnie('fills'));
      const variable = theme(nom);
      lier(degradation, variant.id, layer, lieA(variable, nom.replace('/', '-')));
      if (par === 'direct') c80Directs.push({ layer, variable });
      fondLie = layer;
    };
    let parentDuTexte = zone;
    if (fond === 'en dur') degradation.inserer(zone.peintures, peintureUnie('fills'));
    else if (fond === 'ancetre') {
      poserLeFond(zone, 'surface/default');
      const premier = ajouterUnLayer(degradation, variant.id, { nom: 'Niveau1', type: 'FRAME', parent: zone.id });
      const second = ajouterUnLayer(degradation, variant.id, { nom: 'Niveau2', type: 'FRAME', parent: premier.id });
      parentDuTexte = second;
    } else if (fond === 'frere') {
      poserLeFond(ajouterUnLayer(degradation, variant.id, { nom: 'Fond', type: 'RECTANGLE', parent: zone.id }), 'surface/default');
    } else if (fond !== 'aucun') poserLeFond(zone, fond);

    const texte = ajouterUnLayer(degradation, variant.id, { nom: 'Caption', type: 'TEXT', parent: parentDuTexte.id, peintures: [peintureUnie('fills')] });
    const surfaceForeground = theme('surface/foreground');
    const texteLie = lieA(surfaceForeground, 'surface-foreground');
    if (plage) {
      const rang = { debut: 0, fin: 5 };
      degradation.fixer(texte.texte!, 'plages', [{ ...rang, fontSize: 14, fontWeight: 500, peintures: [peintureUnie('fills')], liaisons: [] }]);
      degradation.retirer(texte.peintures, texte.peintures[0]);
      lier(degradation, variant.id, texte, texteLie, rang);
    } else lier(degradation, variant.id, texte, texteLie);
    if (par === 'direct') c80Directs.push({ layer: texte, variable: surfaceForeground });
    return { texte, fondLie, c80Directs, texteLie };
  };

  /** Les tokens de `components` aliasés à `page/foreground`, que la correction de C59 peut proposer : un, aucun ou deux de même nom. */
  const candidatsDePage = (degradation: Degradation, variant: VariantDeCarte, nombre: 0 | 1 | 2): VariableDuCatalogue[] => {
    const palette = paletteDe(variant);
    const page = degradation.variableParNom(`${palette}/page/foreground`)!;
    const modele = degradation.variable(jetonCouleur(carte, variant, 'foreground')!.cle);
    return Array.from({ length: nombre }, () => tokenVers(degradation, modele, 'page-foreground', page));
  };

  const ajouterLeCas = (
    libelle: string, variant: VariantDeCarte, degradation: Degradation, situation: Situation & { texteLie: VariableDuCatalogue },
    plan: { c59: boolean; par: 'direct' | 'token'; plage?: boolean; candidats: VariableDuCatalogue[]; question?: string },
  ): void => {
    const attendus: ConstatAttendu[] = situation.c80Directs.map(({ layer, variable }) => attendu('C80', 'a-faire', { variant: variant.id, layer: layer.id, champ: 'fills', token: variable.nom }));
    if (plan.c59) {
      const lieu: LieuDeConstat = { variant: variant.id, layer: situation.texte.id, champ: 'fills', ...(plan.plage ? { plageDebut: 0 } : {}), token: `${paletteDe(variant)}/surface/foreground` };
      const cle = cleDeC59(lieu);
      const [unique] = plan.candidats;
      attendus.push(plan.candidats.length === 1
        ? { code: 'C59', cle, forme: 'correction', apres: { cle: unique.cle, nom: unique.nom } }
        : { code: 'C59', cle, forme: 'question', candidats: plan.candidats.map((candidat) => candidat.nom) });
    }
    // Q-F3-9 : un token de components est résolu jusqu'au thème ; une liaison directe laisse C80 seul. Q-F3-10 : `subtle` est un fond.
    const question = plan.question ?? (plan.par === 'token' || plan.c59 ? 'Q-F3-9' : undefined);
    ajouterAvecCodes(registre, 'T1', degradation, {
      description: `T1 : ${libelle}, ${plan.par === 'direct' ? 'liaison directe à theme' : 'token de components'}, variant ${variant.nom}`,
      attendus, ...(question ? { verdict: 'mesure' as const, question } : {}),
    }, CODES_DE_T);
  };

  // T1. Dix fonds × (liaison directe, token), puis une plage de texte sans fond (direct, token), puis page/foreground absent ou en double.
  for (const [fond, c59] of FONDS) {
    for (const par of ['direct', 'token'] as const) {
      const variant = registre.tirer('T1', sansEtatDesactive);
      const degradation = new Degradation(base);
      const situation = bâtir(degradation, variant, fond, par);
      const candidats = candidatsDePage(degradation, variant, 1);
      ajouterLeCas(`texte de surface sur fond ${fond}`, variant, degradation, situation, { c59, par, candidats, ...(fond === 'surface/subtle' ? { question: 'Q-F3-10' } : {}) });
    }
  }
  for (const par of ['direct', 'token'] as const) {
    const variant = registre.tirer('T1', sansEtatDesactive);
    const degradation = new Degradation(base);
    const situation = bâtir(degradation, variant, 'aucun', par, true);
    ajouterLeCas('plage de texte de surface sans fond', variant, degradation, situation, { c59: true, par, plage: true, candidats: candidatsDePage(degradation, variant, 1) });
  }
  {
    // page/foreground absent du thème : aucun token ne peut être candidat.
    const variant = registre.tirer('T1', sansEtatDesactive);
    const degradation = new Degradation(base);
    const situation = bâtir(degradation, variant, 'aucun', 'direct');
    degradation.retirer(degradation.catalogue.variables, degradation.variableParNom(`${paletteDe(variant)}/page/foreground`)!);
    ajouterLeCas('texte de surface sans fond, page/foreground absent du catalogue', variant, degradation, situation, { c59: true, par: 'direct', candidats: [] });
  }
  {
    // Deux tokens de components de même nom visent page/foreground : une question à deux candidats.
    const variant = registre.tirer('T1', sansEtatDesactive);
    const degradation = new Degradation(base);
    const situation = bâtir(degradation, variant, 'aucun', 'direct');
    ajouterLeCas('texte de surface sans fond, deux tokens vers page/foreground', variant, degradation, situation, { c59: true, par: 'direct', candidats: candidatsDePage(degradation, variant, 2) });
  }

  // T2. Quatre liaisons à surface/foreground que C59 ne devrait pas juger ou dont le verdict dépend de Q-F3-8 et de Q-F3-9.
  const t2 = (libelle: string, question: string, poser: (degradation: Degradation, variant: VariantDeCarte, surface: VariableDuCatalogue) => ConstatAttendu[] | undefined): void => {
    const variant = registre.tirer('T2', sansEtatDesactive);
    const degradation = new Degradation(base);
    const attendus = poser(degradation, variant, degradation.variableParNom(`${paletteDe(variant)}/surface/foreground`)!);
    if (!attendus) return;
    ajouterAvecCodes(registre, 'T2', degradation, { description: `T2 : ${libelle}, variant ${variant.nom}`, attendus, verdict: 'mesure', question }, CODES_DE_T);
  };
  const liaisonDe = (variant: VariantDeCarte, nomDuLayer: string, champ: string) =>
    carte.liaisons.find((liaison) => liaison.variant === variant.id && liaison.nomDuLayer === nomDuLayer && liaison.champ === champ);
  t2('liaison héritée de .Bar à surface/foreground', 'Q-F3-8', (degradation, variant, surface) => {
    const heritee = liaisonDe(variant, '.Bar', 'fills');
    if (!heritee) return undefined;
    degradation.lierA(heritee, surface);
    return [];
  });
  t2('liaison héritée de Glyph, une dépendance, à surface/foreground', 'Q-F3-8', (degradation, variant, surface) => {
    if (!variant.layers.Glyph) return undefined;
    const glyph = degradation.layer(variant.id, 'Glyph');
    degradation.inserer(glyph.liaisons, { champ: 'fills', indice: 0, porteur: glyph.id, provenance: 'composant-principal', variable: variableLue(surface) });
    degradation.zones.push({ variant: variant.id, layer: glyph.id, champ: 'fills' });
    return [];
  });
  t2('fond de Root lié directement à surface/foreground', 'Q-F3-9', (degradation, variant, surface) => {
    const fond = liaisonDeCible(carte, variant.id, 'fond')!;
    degradation.lierA(fond, surface);
    const lieu = lieuDe(fond, surface.nom);
    return [attendu('C80', 'a-faire', lieu), { code: 'C59', cle: cleDeC59(lieu), forme: 'a-faire' }];
  });
  t2('trait de Root lié à surface/foreground', 'Q-F3-9', (degradation, variant, surface) => {
    const trait = liaisonDeCible(carte, variant.id, 'trait')!;
    degradation.lierA(trait, surface);
    return [attendu('C80', 'a-faire', lieuDe(trait, surface.nom))];
  });
  return registre.cas;
}
