/** P1 (P27, 5.2) : une règle écrite autrement que sa propriété est détachée pour l'Exporter et pour Architect, au même moment. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { ContractProp } from '@ucm-kit/core/format';
import { mergeBooleanDescriptions } from 'ucm-plugin-socle/src/composant/contract/mergeBooleanDescriptions';
import { buildRules } from 'ucm-plugin-socle/src/composant/contract/rulesModel';
import { cibleCompacte, modeleDeRegles, reglesManquantes } from 'ucm-plugin-socle/src/composant/template/modele';
import type { ContratLu } from 'ucm-plugin-socle/src/composant/template/modele';

import { constatsDeRegles, proprietesDuModele } from '../src/regles';
import type { ReleveDesRegles } from '../src/regles';

/** La propriété Figma, sa clé dans le contrat, le texte que la règle écrit. Le dernier cas s'écrit comme la propriété. */
const CAS = [
  { propriete: 'Icon Left', cle: 'iconLeft', texte: 'iconleft', detachee: true },
  { propriete: 'Icon Left', cle: 'iconLeft', texte: 'ICONLEFT', detachee: true },
  { propriete: 'Icon Left', cle: 'iconLeft', texte: 'Icon_Left', detachee: true },
  { propriete: 'Show Label', cle: 'showLabel', texte: 'show_label', detachee: true },
  { propriete: 'Leading Icon', cle: 'leadingIcon', texte: 'leadingicon', detachee: true },
  { propriete: 'Icon Left', cle: 'iconLeft', texte: 'iconLeft', detachee: false },
] as const;

/** Ce que l'Exporter écrit pour une règle `@boolean` : la clé que `buildRules` range, puis les avertissements de la fusion. */
function cote(cas: (typeof CAS)[number]): { documentees: string[]; avertissements: string[] } {
  const props: Record<string, ContractProp> = { [cas.cle]: { type: 'boolean', default: true } };
  const { booleanDescriptions } = buildRules([{ tag: 'boolean', prop: cas.texte, content: 'Affiche l’icône.' }]);
  const avertissements: string[] = [];
  mergeBooleanDescriptions(props, booleanDescriptions, avertissements);
  return { documentees: Object.keys(booleanDescriptions), avertissements };
}

function releve(cas: (typeof CAS)[number], documentees: string[]): ReleveDesRegles {
  const contrat = { props: { [cas.cle]: { type: 'boolean', default: true } } } as unknown as ContratLu;
  const modele = modeleDeRegles('Button', contrat);
  const presentes = documentees.map(cibleCompacte);
  return {
    composant: { id: '1:2', nom: 'Button' },
    instancePresente: true,
    modele,
    proprietes: proprietesDuModele(modele),
    publiees: [cas.cle],
    documentees,
    presentes,
    manquantes: reglesManquantes(modele, new Set(presentes)),
  };
}

for (const cas of CAS) {
  test(`P1 : propriété « ${cas.propriete} », règle « ${cas.texte} » : l’Exporter et Architect ${cas.detachee ? 'détachent la règle' : 'rattachent la règle'}`, () => {
    const exporter = cote(cas);
    const constats = constatsDeRegles(releve(cas, exporter.documentees));
    if (cas.detachee) {
      assert.equal(exporter.avertissements.length, 1, 'l’Exporter avertit');
      assert.deepEqual(constats.map((constat) => [constat.code, constat.faits.ecart, constat.faits.propriete, constat.faits.regle]), [
        ['C45', 'regle-renommee', cas.cle, exporter.documentees[0]],
      ]);
    } else {
      assert.deepEqual(exporter.avertissements, [], 'l’Exporter n’avertit pas');
      assert.deepEqual(constats, []);
    }
  });
}
