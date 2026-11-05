/**
 * Les opérateurs de cible et de variants désactivés sur P0 : Z1 à Z4 (C52, racine sous 24 px ou 44 px) et X1 à X5 (C53, variants
 * `disabled` exclus et comptés). C52 mesure la racine seule et suppose interactif tout composant dont un axe d'états porte un état
 * autre que `default` et `disabled` (E-40). P0 a 12 variants `Disabled` : un cas qui désactive un variant de plus attend 13.
 * Les cas à dimensions illisibles ne jugent pas C52 : seule une exception du contrôle y compte (P20).
 */
import {
  attenduDeLaPaire, cibleAttendue, desactivesAttendu, fabrique, nomDeLaCible, tailleAttendue, type AttenduAcc, type CasAccessibilite,
} from './cas.js';
import type { ComposantDeContraste } from './composantDeContraste.js';
import { solide, type Degradation } from './degradation.js';

const BLANC = '#FFFFFF';
const NOIR = '#000000';
const FAIBLE = '#B8B8B8';
const dimensions = (largeur: number, hauteur: number) => ({ x: 0, y: 0, largeur, hauteur });

export function operateurZ(base: ComposantDeContraste): CasAccessibilite[] {
  const faire = fabrique(base);
  const cible = nomDeLaCible(base);
  const cas: CasAccessibilite[] = [];
  const numero = (operateur: string): number => cas.filter((c) => c.operateur === operateur).length + 1;
  const racineDe = (largeur: number, hauteur: number) => (d: Degradation): void => { d.fixer(d.racine(), 'dimensions', dimensions(largeur, hauteur)); };

  // Z1 : la frontière de 24 px (corriger) et de 44 px (vérifier) se lit sur le plus petit côté de la racine.
  const attendusDe = (largeur: number, hauteur: number): AttenduAcc[] => (Math.min(largeur, hauteur) < 44 ? [cibleAttendue(largeur, hauteur, [cible])] : []);
  for (const cote of [23.99, 24, 43.99, 44]) {
    cas.push(faire(`Z1-${numero('Z1')}`, 'Z1', { description: `racine carrée de ${cote} px`, degrader: racineDe(cote, cote), attendus: attendusDe(cote, cote) }));
  }
  for (const [largeur, hauteur] of [[23.99, 100], [100, 23.99], [24, 200], [44, 30], [100, 43.99], [100, 44]] as const) {
    cas.push(faire(`Z1-${numero('Z1')}`, 'Z1', { description: `racine de ${largeur} × ${hauteur} px`, degrader: racineDe(largeur, hauteur), attendus: attendusDe(largeur, hauteur) }));
  }
  for (const [largeur, hauteur, quoi] of [[0, 0, '0 × 0'], [NaN, NaN, 'NaN × NaN'], [Infinity, Infinity, 'infinie'], [-5, 48, 'de largeur négative']] as const) {
    cas.push(faire(`Z1-${numero('Z1')}`, 'Z1', {
      description: `racine ${quoi} : le contrôle ne lève pas`, degrader: racineDe(largeur, hauteur), attendus: [], codesJuges: ['C49', 'C50', 'C51'],
    }));
  }

  // Z2 : l'interactivité vient de l'axe d'états. Une racine de 20 px est accusée seulement dans un composant interactif.
  const axes: [string, string, readonly string[] | null, 'oui' | 'non' | 'mesure'][] = [
    ['State', 'State', ['default'], 'non'], ['State', 'State', ['default', 'disabled'], 'non'], ['State', 'State', ['default', 'hover'], 'oui'],
    ['State', 'State', ['default', 'focus'], 'oui'], ['State', 'State', ['default', 'pressed'], 'oui'], ['State', 'State', ['default', 'selected'], 'oui'],
    ['State', 'State', ['Default', 'Hovered'], 'oui'], ['State', 'State', ['rest', 'press'], 'oui'], ['State', 'State', ['on', 'off'], 'mesure'],
    ['State', 'State', ['Active', 'Inactive'], 'mesure'], ['State', 'State', ['default', 'loading'], 'mesure'], ['aucun axe', 'State', null, 'non'],
    ['Status', 'Status', ['Success', 'Error'], 'non'], ['État', 'État', ['Défaut', 'Survol'], 'oui'],
  ];
  for (const [libelle, nom, valeurs, attendu] of axes) {
    const interactif = attendu === 'oui';
    cas.push(faire(`Z2-${numero('Z2')}`, 'Z2', {
      description: `racine de 20 × 20 px, ${valeurs ? `axe ${libelle} {${valeurs.join(', ')}}` : libelle} : ${attendu === 'mesure' ? 'interactif à trancher, aucun C52 attendu' : interactif ? 'interactif' : 'pas interactif'}`,
      degrader: (d) => {
        d.fixer(d.racine(), 'dimensions', dimensions(20, 20));
        const propriete = d.releve.proprietes.find((p) => p.nom === 'State')!;
        if (valeurs === null) d.retirer(d.releve.proprietes, propriete);
        else { d.fixer(propriete, 'nom', nom); d.fixer(propriete, 'valeurs', [...valeurs]); }
      },
      attendus: interactif ? [cibleAttendue(20, 20, [cible])] : [],
      ...(attendu === 'mesure' ? { verdict: 'mesure' as const, question: 'E-40', ecartConnu: 'E-40' } : {}),
    }));
  }

  // Z3 : une dimension illisible, un variant sans racine ou à deux racines n'accuse personne ; la racine masquée reste mesurée.
  cas.push(faire(`Z3-${numero('Z3')}`, 'Z3', {
    description: 'racine de 20 × 20 px dont les dimensions n\'ont pas été lues : aucune accusation',
    degrader: (d) => { const racine = d.racine(); d.fixer(racine, 'dimensions', dimensions(20, 20)); d.inserer(d.releve.lecture.manquees, { layer: racine.id, champ: 'dimensions', motif: 'illisible' }); },
    attendus: [],
  }));
  cas.push(faire(`Z3-${numero('Z3')}`, 'Z3', {
    description: 'variant sans racine : un layer orphelin dont le parent est absent du variant',
    degrader: (d) => {
      const racine = d.scene();
      d.retirer(d.cible.layers, racine);
      const orphelin = d.ajouterUnLayer({ nom: 'Orphelin', parent: null });
      d.fixer(orphelin, 'parent', 'absent');
    },
    attendus: [],
  }));
  cas.push(faire(`Z3-${numero('Z3')}`, 'Z3', {
    description: 'deux racines : le Root de 48 px et un second cadre de 20 px sans parent', sansRelation: ['ordre'],
    degrader: (d) => { d.scene(); d.ajouterUnLayer({ nom: 'Second', type: 'FRAME', parent: null, dimensions: dimensions(20, 20) }); },
    attendus: [],
  }));
  cas.push(faire(`Z3-${numero('Z3')}`, 'Z3', {
    description: 'racine masquée de 20 × 20 px : elle reste mesurée', degrader: (d) => { const racine = d.racine(); d.fixer(racine, 'dimensions', dimensions(20, 20)); d.fixer(racine, 'visible', false); },
    attendus: [cibleAttendue(20, 20, [cible])],
  }));

  // Z4 : un constat par couple de dimensions et de seuil.
  const [v0, v1, v2] = base.releve.variants;
  cas.push(faire(`Z4-${numero('Z4')}`, 'Z4', {
    description: 'trois variants de 20, 30 et 36 px : un constat par taille',
    degrader: (d) => { [20, 30, 36].forEach((cote, rang) => d.fixer(d.racine(d.releve.variants[rang]), 'dimensions', dimensions(cote, cote))); },
    attendus: [cibleAttendue(20, 20, [v0.nom]), cibleAttendue(30, 30, [v1.nom]), cibleAttendue(36, 36, [v2.nom])],
  }));
  cas.push(faire(`Z4-${numero('Z4')}`, 'Z4', {
    description: 'trois variants de 30 px : un seul constat qui les nomme',
    degrader: (d) => { [0, 1, 2].forEach((rang) => d.fixer(d.racine(d.releve.variants[rang]), 'dimensions', dimensions(30, 30))); },
    attendus: [cibleAttendue(30, 30, [v0.nom, v1.nom, v2.nom])],
  }));
  return cas;
}

export function operateurX(base: ComposantDeContraste): CasAccessibilite[] {
  const faire = fabrique(base);
  const cible = nomDeLaCible(base);
  const cas: CasAccessibilite[] = [];
  const numero = (operateur: string): number => cas.filter((c) => c.operateur === operateur).length + 1;
  const desactives = base.releve.variants.filter((variant) => variant.valeurs.State === 'Disabled');
  const de = desactives.length;
  const premierDesactive = desactives[0].nom;
  const decrire = (d: Degradation) => d.variantOu({ State: 'Disabled' });
  const texteFaible = attenduDeLaPaire('texte', FAIBLE, BLANC, 'AA', [cible]);

  // X1 : l'écriture de l'état. `disabled` et `disable` sont exclus (Q-F7-10) ; les autres écritures restent mesurées.
  const ecritures: [string, boolean][] = [
    ['disabled', true], ['Disabled', true], ['DISABLED', true], ['disable', true], ['Disabled ', true], ['inactive', false], ['Inactive', false],
    ['unavailable', false], ['read-only', false], ['dimmed', false],
  ];
  ecritures.forEach(([ecriture, exclu]) => {
    cas.push(faire(`X1-${numero('X1')}`, 'X1', {
      description: `état « ${ecriture} », texte ${FAIBLE} à 2:1 : ${exclu ? 'exclu' : 'mesuré'}`,
      degrader: (d) => { d.fixer(d.cible.valeurs, 'State', ecriture); d.poserLaPaire('texte', FAIBLE, BLANC); },
      attendus: exclu ? [desactivesAttendu(de + 1)] : [...texteFaible, desactivesAttendu(de)],
      hypothese: 'H9',
    }));
  });

  // X2 : le nom de l'axe qui porte l'état.
  const axes: [string, string, boolean][] = [
    ['State', 'Disabled', true], ['states', 'Disabled', true], ['Status', 'Disabled', true], ['État', 'Disabled', true], ['Etat', 'Disabled', true],
    ['Mode', 'Disabled', false], ['Interaction', 'Disabled', false], ['Disabled', 'True', true], ['Enabled', 'False', true],
  ];
  axes.forEach(([axe, valeur, exclu]) => {
    cas.push(faire(`X2-${numero('X2')}`, 'X2', {
      description: `axe « ${axe} » à la valeur « ${valeur} », texte ${FAIBLE} à 2:1 : ${exclu ? 'exclu' : 'mesuré'}`,
      degrader: (d) => { d.fixer(d.cible.valeurs, 'State', undefined); d.fixer(d.cible.valeurs, axe, valeur); d.poserLaPaire('texte', FAIBLE, BLANC); },
      attendus: exclu ? [desactivesAttendu(de + 1)] : [...texteFaible, desactivesAttendu(de)],
      hypothese: 'H9',
    }));
  });

  // X3 : ce que C53 retire d'un variant désactivé. La proposition de Q-F7-10 garde le texte sous 12 px et retire le contraste et la cible.
  const x3: [string, (d: Degradation) => void, AttenduAcc[], Partial<{ ecartConnu: string }>][] = [
    ['texte de 11 px', (d) => { const v = decrire(d); d.scene({ variant: v }); d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)], fontSize: 11 }, { variant: v }); },
      [tailleAttendue('Texte', 11, [premierDesactive])], { ecartConnu: 'N-51' }],
    ['racine de 20 px', (d) => { const v = decrire(d); d.fixer(d.racine(v), 'dimensions', dimensions(20, 20)); }, [], {}],
    ['anneau d\'épaisseur 1', (d) => {
      const v = decrire(d);
      d.scene({ variant: v });
      d.ajouterUnLayer({ variant: v, nom: 'ring', peintures: [solide(NOIR, { champ: 'strokes' })], strokeWeight: 1 });
    }, [], {}],
    [`contour ${FAIBLE} sous 3:1`, (d) => {
      const v = decrire(d);
      d.scene({ variant: v });
      d.ajouterUnLayer({ variant: v, nom: 'Contour', peintures: [solide(FAIBLE, { champ: 'strokes' })], strokeWeight: 1 });
    }, [], {}],
  ];
  for (const [quoi, degrader, attendus, plus] of x3) {
    cas.push(faire(`X3-${numero('X3')}`, 'X3', {
      description: `variant désactivé avec ${quoi}`, degrader, attendus: [...attendus, desactivesAttendu(de)], hypothese: 'H19', ...plus,
    }));
  }

  // X4 : le nombre de variants désactivés. Un variant ôté du relevé ne compte plus.
  const garder = (n: number) => (d: Degradation): void => { for (const v of d.releve.variants.filter((entree) => entree.valeurs.State === 'Disabled').slice(n)) d.retirer(d.releve.variants, v); };
  for (const n of [0, 1, 3]) {
    cas.push(faire(`X4-${numero('X4')}`, 'X4', {
      description: `${n} variant${n > 1 ? 's' : ''} désactivé${n > 1 ? 's' : ''}`, degrader: garder(n), attendus: n === 0 ? [] : [desactivesAttendu(n)],
    }));
  }
  cas.push(faire(`X4-${numero('X4')}`, 'X4', {
    description: 'les 48 variants désactivés',
    degrader: (d) => { for (const v of d.releve.variants.filter((entree) => entree.valeurs.State !== 'Disabled')) d.fixer(v.valeurs, 'State', 'Disabled'); },
    attendus: [desactivesAttendu(base.releve.variants.length)],
  }));
  cas.push(faire(`X4-${numero('X4')}`, 'X4', {
    description: 'un jeu dont l\'axe d\'états n\'a que Disabled',
    degrader: (d) => {
      for (const v of d.releve.variants.filter((entree) => entree.valeurs.State !== 'Disabled')) d.retirer(d.releve.variants, v);
      d.fixer(d.releve.proprietes.find((p) => p.nom === 'State')!, 'valeurs', ['Disabled']);
    },
    attendus: [desactivesAttendu(de)],
  }));

  // X5 : l'état désactivé prime sur le focus d'un second axe ; un variant désactivé sans texte est compté.
  cas.push(faire(`X5-${numero('X5')}`, 'X5', {
    description: 'variant à deux axes d\'états, State=Disabled et Status=Focus, sans anneau : exclu, donc pas de C50:sans-anneau',
    degrader: (d) => { d.scene(); d.fixer(d.cible.valeurs, 'State', 'Disabled'); d.fixer(d.cible.valeurs, 'Status', 'Focus'); },
    attendus: [desactivesAttendu(de + 1)],
  }));
  cas.push(faire(`X5-${numero('X5')}`, 'X5', {
    description: 'variant désactivé sans texte', degrader: (d) => { d.scene({ variant: decrire(d) }); }, attendus: [desactivesAttendu(de)],
  }));
  return cas;
}
