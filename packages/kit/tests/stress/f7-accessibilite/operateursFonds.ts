/**
 * Les opérateurs de fonds et de limites sur P0 : F1 (dégradés), F2 (images et vidéos), F3 (modes de fusion), F4 (peintures superposées),
 * F5 (visibilité), F6 (fond porté par un frère) et F7 (peintures inconnues ou sans couleur). Un fond ou une peinture que le relevé ne
 * permet pas de calculer donne une limite et aucun verdict. Le texte des cas est gris (#808080, 3,95:1 sur blanc) : posé sur un fond
 * lisible, il échoue, donc une limite sans constat prouve que le kit n'a pas jugé.
 */
import {
  attenduSurLeFond, contrasteAttendu, fabrique, limiteAttendue, nomDeLaCible, PLAGE_DU_TEXTE, repliAttendu, type AttenduAcc, type CasAccessibilite, type CauseAttendue,
} from './cas.js';
import type { ComposantDeContraste } from './composantDeContraste.js';
import { cadre, peintureDeType, solide, type Degradation } from './degradation.js';
import { couleurDeHex } from './oracleContraste.js';

const BLANC = '#FFFFFF';
const GRIS = '#808080';
const blanc = couleurDeHex(BLANC);
const grisOpaque = [couleurDeHex(GRIS)];

const DEGRADES = ['GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND'] as const;
/** Les 19 modes de fusion de Figma. */
const MODES_DE_FUSION = [
  'PASS_THROUGH', 'NORMAL', 'DARKEN', 'MULTIPLY', 'LINEAR_BURN', 'COLOR_BURN', 'LIGHTEN', 'SCREEN', 'LINEAR_DODGE', 'COLOR_DODGE', 'OVERLAY',
  'SOFT_LIGHT', 'HARD_LIGHT', 'DIFFERENCE', 'EXCLUSION', 'HUE', 'SATURATION', 'COLOR', 'LUMINOSITY',
] as const;

export function operateurF(base: ComposantDeContraste): CasAccessibilite[] {
  const faire = fabrique(base);
  const cible = nomDeLaCible(base);
  const cas: CasAccessibilite[] = [];
  const numero = (operateur: string): number => cas.filter((c) => c.operateur === operateur).length + 1;
  const limiteDuTexte = (cause: CauseAttendue): AttenduAcc => limiteAttendue({ usage: 'texte', layer: 'Texte', cause, plage: PLAGE_DU_TEXTE, variants: [cible] });
  const constatDuTexte = (): AttenduAcc[] => attenduSurLeFond(grisOpaque, [blanc], null, cible);
  /** Le cas : un fond posé sur le `Root` et un texte gris, ou le fond blanc et une liste de peintures pour le texte. */
  const surLeFond = (peintures: ReturnType<typeof solide>[]) => (d: Degradation): void => {
    d.scene({ fond: null });
    d.remplacerLesPeintures(d.racine(), 'fills', peintures);
    d.ajouterUnTexte('Texte', { peintures: [solide(GRIS)] });
  };
  const surLeTexte = (peintures: ReturnType<typeof solide>[]) => (d: Degradation): void => {
    d.scene();
    d.ajouterUnTexte('Texte', { peintures });
  };

  // F1 et F2 : un dégradé, une image ou une vidéo en fond, puis en peinture du texte.
  for (const type of DEGRADES) {
    cas.push(faire(`F1-${numero('F1')}`, 'F1', { description: `${type} en fond du Root`, degrader: surLeFond([peintureDeType(type)]), attendus: [limiteDuTexte('degrade')] }));
  }
  for (const type of DEGRADES) {
    cas.push(faire(`F1-${numero('F1')}`, 'F1', { description: `${type} en peinture du texte`, degrader: surLeTexte([peintureDeType(type)]), attendus: [limiteDuTexte('degrade')] }));
  }
  for (const type of ['IMAGE', 'VIDEO']) {
    cas.push(faire(`F2-${numero('F2')}`, 'F2', { description: `${type} en fond du Root`, degrader: surLeFond([peintureDeType(type)]), attendus: [limiteDuTexte('image')] }));
  }
  for (const type of ['IMAGE', 'VIDEO']) {
    cas.push(faire(`F2-${numero('F2')}`, 'F2', { description: `${type} en peinture du texte`, degrader: surLeTexte([peintureDeType(type)]), attendus: [limiteDuTexte('image')] }));
  }

  // F3 : le mode de fusion d'une peinture du texte (19 valeurs), puis trois sur le fond.
  for (const mode of MODES_DE_FUSION) {
    const lisible = mode === 'NORMAL' || mode === 'PASS_THROUGH';
    cas.push(faire(`F3-${numero('F3')}`, 'F3', {
      description: `mode de fusion ${mode} sur la peinture grise du texte, fond blanc`, degrader: surLeTexte([solide(GRIS, { blendMode: mode })]),
      attendus: lisible ? constatDuTexte() : [limiteDuTexte('peinture-superposee')],
    }));
  }
  for (const mode of ['MULTIPLY', 'OVERLAY', 'PASS_THROUGH']) {
    cas.push(faire(`F3-${numero('F3')}`, 'F3', {
      description: `mode de fusion ${mode} sur le fond blanc du Root, texte gris`, degrader: surLeFond([solide(BLANC, { blendMode: mode })]),
      attendus: mode === 'PASS_THROUGH' ? constatDuTexte() : [limiteDuTexte('peinture-superposee')],
    }));
  }

  // F4 : des peintures superposées sur le texte, de la plus basse à la plus haute.
  const translucide = (indice: number) => solide(GRIS, { alpha: 0.5, indice });
  const f4: [string, ReturnType<typeof solide>[], AttenduAcc[]][] = [
    ['un dégradé sous un solide translucide', [peintureDeType('GRADIENT_LINEAR', { indice: 0 }), translucide(1)], [limiteDuTexte('peinture-superposee')]],
    ['un solide translucide sous un dégradé', [translucide(0), peintureDeType('GRADIENT_LINEAR', { indice: 1 })], [limiteDuTexte('peinture-superposee')]],
    ['un dégradé masqué sous un solide gris', [peintureDeType('GRADIENT_LINEAR', { indice: 0, visible: false }), solide(GRIS, { indice: 1 })], constatDuTexte()],
    ['un dégradé sous un solide gris opaque', [peintureDeType('GRADIENT_LINEAR', { indice: 0 }), solide(GRIS, { indice: 1 })], constatDuTexte()],
    ['une image sous un solide gris opaque', [peintureDeType('IMAGE', { indice: 0 }), solide(GRIS, { indice: 1 })], constatDuTexte()],
    ['deux dégradés', [peintureDeType('GRADIENT_LINEAR', { indice: 0 }), peintureDeType('GRADIENT_RADIAL', { indice: 1 })], [limiteDuTexte('peinture-superposee')]],
  ];
  for (const [description, peintures, attendus] of f4) cas.push(faire(`F4-${numero('F4')}`, 'F4', { description, degrader: surLeTexte(peintures), attendus }));

  // F5 : un layer masqué, ou sous un ancêtre masqué, n'est pas vu ; la peinture masquée d'un ancêtre laisse voir le fond suivant.
  const texteGris = (parent: ReturnType<Degradation['racine']>, d: Degradation, visible = true) => d.ajouterUnTexte('Texte', { peintures: [solide(GRIS)] }, { parent, visible });
  cas.push(faire(`F5-${numero('F5')}`, 'F5', { description: 'texte masqué', degrader: (d) => { texteGris(d.scene(), d, false); }, attendus: [] }));
  cas.push(faire(`F5-${numero('F5')}`, 'F5', {
    description: 'texte visible sous un parent masqué', degrader: (d) => { const p = cadre(d, 'Parent', d.scene(), []); d.fixer(p, 'visible', false); texteGris(p, d); }, attendus: [],
  }));
  cas.push(faire(`F5-${numero('F5')}`, 'F5', {
    description: 'texte visible sous un grand-parent masqué',
    degrader: (d) => { const g = cadre(d, 'Grand-parent', d.scene(), []); d.fixer(g, 'visible', false); texteGris(cadre(d, 'Parent', g, []), d); }, attendus: [],
  }));
  cas.push(faire(`F5-${numero('F5')}`, 'F5', {
    description: 'texte visible sous un parent masqué qui porte un fond noir opaque',
    degrader: (d) => { const p = cadre(d, 'Parent', d.scene(), [solide('#000000')]); d.fixer(p, 'visible', false); texteGris(p, d); }, attendus: [],
  }));
  cas.push(faire(`F5-${numero('F5')}`, 'F5', {
    description: 'fond noir opaque d\'un ancêtre masqué : le texte se mesure sur le fond blanc du Root',
    degrader: (d) => { texteGris(cadre(d, 'Zone', d.scene(), [solide('#000000', { visible: false })]), d); }, attendus: constatDuTexte(),
  }));
  cas.push(faire(`F5-${numero('F5')}`, 'F5', {
    description: 'fond noir opaque d\'un ancêtre à opacité de peinture 0 : le texte se mesure sur le fond blanc du Root',
    degrader: (d) => { texteGris(cadre(d, 'Zone', d.scene(), [solide('#000000', { opacite: 0 })]), d); }, attendus: constatDuTexte(),
  }));

  // F6 : un frère placé sous le texte est-il un fond (Q-F7-4) ? Le Root n'a pas de peinture, la page Figma est blanche, le texte est blanc.
  const clair = '#93C5FD';
  const sansFond = (d: Degradation): ReturnType<Degradation['racine']> => { d.sansElevation(); d.pageFigma(BLANC); return d.scene({ fond: null }); };
  const texteBlanc = (d: Degradation): void => { d.ajouterUnTexte('Texte', { peintures: [solide(BLANC)] }, { dimensions: { x: 12, y: 16, largeur: 24, hauteur: 16 } }); };
  const frere = (d: Degradation, hex: string, o: { alpha?: number; largeur?: number } = {}): void => {
    d.ajouterUnLayer({ nom: 'Fond', peintures: [solide(hex, { alpha: o.alpha })], dimensions: { x: 0, y: 0, largeur: o.largeur ?? 48, hauteur: 48 } });
  };
  const surLaPageFigma = (couches: ReturnType<typeof couleurDeHex>[]): AttenduAcc[] => attenduSurLeFond([blanc], couches, blanc, cible).map((a) => ({ ...a, cle: a.cle + 'page-figma', type: 'verifier' as const }));
  const f6: [string, (d: Degradation) => void, AttenduAcc[]][] = [
    ['un frère dessous qui couvre le texte', (d) => { sansFond(d); frere(d, clair); texteBlanc(d); }, attenduSurLeFond([blanc], [couleurDeHex(clair)], null, cible)],
    ['un frère dessous qui ne couvre le texte qu\'en partie', (d) => { sansFond(d); frere(d, clair, { largeur: 20 }); texteBlanc(d); }, [limiteAttendue({ usage: 'texte', layer: 'Texte', cause: 'fond-indetermine', plage: PLAGE_DU_TEXTE, variants: [cible] })]],
    ['un frère au-dessus du texte', (d) => { sansFond(d); texteBlanc(d); frere(d, clair); }, surLaPageFigma([])],
    ['un frère translucide dessous qui couvre le texte', (d) => { sansFond(d); frere(d, '#2563EB', { alpha: 0.5 }); texteBlanc(d); }, surLaPageFigma([couleurDeHex('#2563EB', 0.5)])],
  ];
  for (const [description, degrader, attendus] of f6) {
    cas.push(faire(`F6-${numero('F6')}`, 'F6', {
      description, degrader, attendus: [...attendus, repliAttendu(BLANC)], hypothese: 'H4',
    }));
  }

  // F7 : un type de peinture inconnu, une peinture unie sans couleur.
  cas.push(faire(`F7-${numero('F7')}`, 'F7', { description: 'peinture PATTERN sur le texte', degrader: surLeTexte([peintureDeType('PATTERN')]), attendus: [limiteDuTexte('peinture-superposee')] }));
  cas.push(faire(`F7-${numero('F7')}`, 'F7', { description: 'peinture SOLID sans couleur sur le texte', degrader: surLeTexte([peintureDeType('SOLID')]), attendus: [limiteDuTexte('couleur-absente')] }));
  return cas;
}
