/**
 * Les faux positifs de la section 4 du plan : 22 thèmes ciblés (FP1) et 72 cas de garantie (FP2, `garantiesDePalettes.ts`), en plus
 * des 48 profils que `mesurer.ts` mesure à part. Un thème ciblé est un composant conforme dont une seule propriété touche à la
 * frontière d'un contrôle ; il ne doit donner aucun constat C49 à C52. Seule l'information de repli sur la page Figma est attendue
 * pour le fichier libre, qui n'a ni thème ni élévation.
 */
import { fabrique, repliAttendu, type CasAccessibilite } from './cas.js';
import { type ComposantDeContraste, composantDeContraste } from './composantDeContraste.js';
import { casDeGarantie, type GarantiesDePalettes } from './garantiesDePalettes.js';
import { cadre, solide, type Degradation } from './degradation.js';
import { poserLaBorne } from './operateursBorne.js';
import { PROFILS } from './profils.js';

const BLANC = '#FFFFFF';
const NOIR = '#000000';
/** Un gris à 1,5:1 sur blanc : le contraste d'un élément désactivé. */
const DESACTIVE = '#D0D0D0';
const FAIBLE = '#CCCCCC';

const dimensions = (cote: number) => ({ x: 0, y: 0, largeur: cote, hauteur: cote });

/** Les 22 thèmes ciblés sur la base P0, et ceux qui prennent le profil `divider-1`. */
export function themesCibles(base: ComposantDeContraste, graine: number): CasAccessibilite[] {
  const faire = fabrique(base);
  const profilDivider = PROFILS.find((p) => p.forme === 'divider-1' && p.modes === 2 && p.fond === 'opaque' && p.niveau === 'AA')!;
  const divider = composantDeContraste(profilDivider, graine);
  const fairePourDivider = fabrique(divider);
  const cas: CasAccessibilite[] = [];
  const ajouter = (fabriquer: typeof faire, description: string, degrader: (d: Degradation) => void, plus: Partial<Parameters<typeof faire>[2]> = {}): void => {
    cas.push(fabriquer(`FP1-${cas.length + 1}`, 'FP1', { description, degrader, attendus: [], ...plus }));
  };

  // Cinq états conformes avec un anneau de 2 px : Hover et Default en partie renommés, les variants désactivés ôtés.
  ajouter(faire, 'cinq états conformes (Default, Hover, Pressed, Focus, Selected) avec anneau de 2 px', (d) => {
    for (const variant of d.releve.variants.filter((v) => v.valeurs.State === 'Disabled')) d.retirer(d.releve.variants, variant);
    d.releve.variants.filter((v) => v.valeurs.State === 'Hover').forEach((v, rang) => { if (rang % 2 === 0) d.fixer(v.valeurs, 'State', 'Pressed'); });
    d.releve.variants.filter((v) => v.valeurs.State === 'Default').forEach((v, rang) => { if (rang % 2 === 0) d.fixer(v.valeurs, 'State', 'Selected'); });
    d.fixer(d.releve.proprietes.find((p) => p.nom === 'State')!, 'valeurs', ['Default', 'Hover', 'Pressed', 'Focus', 'Selected']);
  });
  // Un variant désactivé n'est pas jugé, même à 1,5:1.
  ajouter(faire, 'variant désactivé dont le texte est à 1,5:1', (d) => {
    const v = d.variantOu({ State: 'Disabled' });
    d.scene({ variant: v });
    d.ajouterUnTexte('Texte', { peintures: [solide(DESACTIVE)] }, { variant: v });
  });
  ajouter(faire, 'variant désactivé dont l\'icône est à 1,5:1', (d) => {
    const v = d.variantOu({ State: 'Disabled' });
    d.scene({ variant: v });
    d.ajouterUnLayer({ variant: v, nom: 'Pictogram', type: 'VECTOR', peintures: [solide(DESACTIVE)] });
  });
  // Le composant tel que le profil le fabrique, aux deux niveaux.
  ajouter(faire, 'fond opaque lié et texte conforme, niveau AA', () => undefined, { niveau: 'AA' });
  ajouter(faire, 'fond opaque lié et texte conforme, niveau AAA', () => undefined, { niveau: 'AAA' });
  for (const taille of [12, 13, 24]) {
    ajouter(faire, `texte noir de ${taille} px sur blanc`, (d) => { d.poserLaPaire('texte', NOIR, BLANC, { fontSize: taille }); });
  }
  ajouter(faire, 'racine interactive de 44 × 44', (d) => { d.fixer(d.racine(), 'dimensions', dimensions(44)); });
  ajouter(faire, 'racine interactive de 48 × 48', (d) => { d.fixer(d.racine(), 'dimensions', dimensions(48)); });
  ajouter(fairePourDivider, 'racine non interactive de 20 × 20 (divider-1, sans axe d\'états)', (d) => { d.fixer(d.racine(), 'dimensions', dimensions(20)); });
  for (const nom of ['ring', 'Focus Ring', '.Ring']) {
    ajouter(faire, `anneau de 2 px nommé « ${nom} » dans un variant en focus`, (d) => {
      const v = d.variantOu({ State: 'Focus' });
      d.scene({ variant: v });
      d.ajouterUnLayer({ variant: v, nom, peintures: [solide(NOIR, { champ: 'strokes' })], strokeWeight: 2 });
    });
  }
  ajouter(fairePourDivider, 'composant sans texte ni icône (divider-1) : le Root seul', (d) => { d.scene(); });
  // Un fichier libre : ni thème, ni élévation, la page Figma blanche. Chaque variant ne garde que son Root.
  ajouter(faire, 'fichier libre sans thème, page Figma blanche, texte noir conforme', (d) => {
    d.sansElevation();
    d.pageFigma(BLANC);
    for (const variant of d.releve.variants) {
      d.scene({ variant, fond: null });
      if (variant.valeurs.State === 'Focus') d.ajouterUnLayer({ variant, nom: 'ring', peintures: [solide(NOIR, { champ: 'strokes' })], strokeWeight: 2 });
    }
    d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] });
    d.fixer(d.catalogue, 'collections', []);
    d.fixer(d.catalogue, 'variables', []);
  }, { attendus: [repliAttendu(BLANC)] });
  ajouter(faire, `layer masqué dont le texte est ${FAIBLE} (1,6:1)`, (d) => { d.scene(); d.ajouterUnTexte('Texte', { peintures: [solide(FAIBLE)] }, { visible: false }); });
  ajouter(faire, `layer sous un parent masqué dont le texte est ${FAIBLE}`, (d) => {
    const parent = cadre(d, 'Parent', d.scene(), []);
    d.fixer(parent, 'visible', false);
    d.ajouterUnTexte('Texte', { peintures: [solide(FAIBLE)] }, { parent });
  });
  ajouter(faire, `contour ${FAIBLE} d'épaisseur 0 avec peinture visible`, (d) => { d.scene(); d.ajouterUnLayer({ nom: 'Contour', peintures: [solide(FAIBLE, { champ: 'strokes' })], strokeWeight: 0 }); });
  ajouter(faire, 'layer sans contour', (d) => { d.scene(); d.ajouterUnLayer({ nom: 'Forme', peintures: [solide(FAIBLE)] }); });
  ajouter(faire, 'texte noir d\'alpha 0,9 sur blanc', (d) => { d.scene(); d.ajouterUnTexte('Texte', { peintures: [solide(NOIR, { alpha: 0.9 })] }); });
  ajouter(faire, 'cinq collections de 2, 2, 3, 3 et 4 modes, couleurs conformes dans chaque combinaison', (d) => {
    poserLaBorne(d, { collections: [2, 2, 3, 3, 4].map((modes) => ({ modes })), variantes: [{ via: [0, 1, 2, 3, 4] }] });
  });
  return cas;
}

export interface FauxPositifs {
  readonly cas: CasAccessibilite[];
  readonly vides: GarantiesDePalettes['vides'];
}

/** Les 22 thèmes ciblés puis les 72 cas de garantie. */
export function tousLesFauxPositifs(base: ComposantDeContraste, graine: number): FauxPositifs {
  const garanties = casDeGarantie(base, graine);
  return { cas: [...themesCibles(base, graine), ...garanties.cas], vides: garanties.vides };
}
