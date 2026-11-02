/**
 * Les opérateurs de dégradation des rôles (R1 et R2 : C24, issu de C17) des stress tests F3. Le rôle attendu d'une liaison vient de
 * la table de l'inventaire 4.2 (`CIBLES` de `operateursAxes.ts`) : fond `background`, trait `border`, texte `foreground`,
 * icône `icon`, anneau `ring`. Un token d'un autre rôle porte aussi d'autres scopes : l'oracle ajoute alors le C18 que la règle
 * de scope du plan donne, parce que le token lié est vraiment incompatible avec le champ.
 */
import type { ConstatAttendu } from '../commun/types.js';
import { type RoleDeCouleur } from './carte.js';
import { GRAINE_PAR_DEFAUT, type ComposantDeBase } from './composantDeBase.js';
import {
  attendu, attendusDePortee, CIBLES, Degradation, jetonCouleur, lieuDe, liaisonDeCible, Registre, type CasDeComposant, type NomDeCible,
} from './operateursAxes.js';

/** R1 : pour chaque cible, les rôles que la table ne lui admet pas. 5 + 4 + 4 + 4 + 5 = 22 cas. */
const ROLES_REFUSES: readonly (readonly [NomDeCible, readonly RoleDeCouleur[]])[] = [
  ['fond', ['foreground', 'text', 'icon', 'border', 'ring']],
  ['trait', ['background', 'text', 'icon', 'ring']],
  ['texte', ['background', 'icon', 'border', 'ring']],
  ['icone', ['background', 'text', 'border', 'ring']],
  ['anneau', ['background', 'border', 'foreground', 'text', 'icon']],
];

type SuiteDuRole = 'correction' | 'absent' | 'double';

/** R2 : [cible, rôle posé, suite]. Le rôle attendu manque au catalogue (3) ou y figure deux fois (2). */
const ROLES_SANS_CANDIDAT_UNIQUE: readonly (readonly [NomDeCible, RoleDeCouleur, SuiteDuRole])[] = [
  ['fond', 'foreground', 'absent'], ['trait', 'background', 'absent'], ['texte', 'background', 'absent'],
  ['fond', 'foreground', 'double'], ['icone', 'background', 'double'],
];

export function operateursRoles(base: ComposantDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeComposant[] {
  const registre = new Registre(base, graine);
  const carte = base.carte;

  const lierAUnAutreRole = (operateur: string, cible: NomDeCible, roleFaux: RoleDeCouleur, suite: SuiteDuRole): void => {
    const variant = registre.tirer(operateur, carte.variants);
    const deBase = liaisonDeCible(carte, variant.id, cible);
    const faux = jetonCouleur(carte, variant, roleFaux);
    if (!deBase || !faux) return;
    const juste = { cle: deBase.cle, nom: deBase.nom };
    const degradation = new Degradation(base);
    const variableFausse = degradation.variable(faux.cle);
    degradation.lierA(deBase, variableFausse);
    const lieu = lieuDe(deBase, faux.nom);
    let c24: ConstatAttendu;
    if (suite === 'absent') {
      degradation.retirer(degradation.catalogue.variables, degradation.variable(juste.cle));
      c24 = attendu('C24', 'question', lieu, { candidats: [] });
    } else if (suite === 'double') {
      degradation.cloner(degradation.variable(juste.cle));
      c24 = attendu('C24', 'question', lieu, { candidats: [juste.nom, juste.nom] });
    } else {
      c24 = attendu('C24', 'correction', lieu, { apres: juste });
    }
    registre.ajouter(operateur, degradation, {
      description: `${operateur} : ${CIBLES[cible].layer} (${cible}) du variant ${variant.nom} lié au rôle ${roleFaux}, ${CIBLES[cible].role} attendu`,
      attendus: [c24, ...attendusDePortee(deBase, CIBLES[cible].sorte, variableFausse)],
    });
  };

  for (const [cible, roles] of ROLES_REFUSES) for (const role of roles) lierAUnAutreRole('R1', cible, role, 'correction');
  for (const [cible, role, suite] of ROLES_SANS_CANDIDAT_UNIQUE) lierAUnAutreRole('R2', cible, role, suite);
  return registre.cas;
}
