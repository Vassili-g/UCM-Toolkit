/**
 * La table des rôles de rendu : sa forme publiée, sa nature obligatoire, et la
 * lecture d'un contrat qui porte sa propre table.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  identifiantsDeRoles,
  kindDeNature,
  natureDuRole,
  natureDuRoleDuContrat,
  roleDeRendu,
  tableDesRolesDeRendu,
} from '../src/format/roles-de-rendu';
import type { RoleDeRendu } from '../src/format/roles-de-rendu';

test('la table publie les cinq rôles, dans l’ordre et la forme que les contrats portent', () => {
  // Octet pour octet : l'ordre des clés et des propriétés se lit dans le JSON.
  assert.equal(
    JSON.stringify(tableDesRolesDeRendu()),
    '{"background":{"kind":"paint","cssProperties":["background-color"]},'
      + '"foreground":{"kind":"paint","cssProperties":["color","fill"]},'
      + '"icon":{"kind":"paint","cssProperties":["color","fill"]},'
      + '"border":{"kind":"stroke","cssProperties":["box-shadow"]},'
      + '"ring":{"kind":"stroke","cssProperties":["outline-color","outline-width"],"fallback":"box-shadow"}}',
  );
});

test('la table rend une copie neuve : modifier le résultat ne change pas la table', () => {
  const premiere = tableDesRolesDeRendu();
  premiere.background.cssProperties.push('x');
  delete premiere.ring;
  assert.deepEqual(tableDesRolesDeRendu().background.cssProperties, ['background-color']);
  assert.ok('ring' in tableDesRolesDeRendu());
});

test('chaque rôle a une nature, peinture ou contour', () => {
  assert.ok(identifiantsDeRoles().length > 0);
  for (const identifiant of identifiantsDeRoles()) {
    const nature = roleDeRendu(identifiant)?.nature;
    assert.ok(nature === 'peinture' || nature === 'contour', `${identifiant} n'a pas de nature`);
    assert.equal(tableDesRolesDeRendu()[identifiant].kind, kindDeNature(nature));
  }
});

test('une description sans nature ne compile pas', () => {
  // @ts-expect-error `nature` est obligatoire : `npm run typecheck` échoue si ce rôle compile.
  const sansNature: RoleDeRendu = { cssProperties: ['color'] };
  assert.equal(sansNature.cssProperties.length, 1);
});

test('un nom qui n’est pas un rôle partagé n’a pas de nature, même hérité d’Object.prototype', () => {
  assert.equal(natureDuRole('background'), 'peinture');
  assert.equal(natureDuRole('ring'), 'contour');
  assert.equal(natureDuRole('scale-1'), null);
  assert.equal(natureDuRole('constructor'), null);
  assert.equal(roleDeRendu('__proto__'), null);
});

test('un contrat sans table, ou à table vide, se lit avec la table du kit', () => {
  for (const rendering of [undefined, null, {}, { roles: {} }, { roles: [] }]) {
    assert.equal(natureDuRoleDuContrat(rendering, 'foreground'), 'peinture');
    assert.equal(natureDuRoleDuContrat(rendering, 'ring'), 'contour');
    assert.equal(natureDuRoleDuContrat(rendering, 'halo'), null);
  }
});

test('un contrat qui porte sa table se lit avec elle seule, jamais avec celle du kit', () => {
  // Un contrat ancien : quatre rôles, `ring` n'existait pas, `icon` y était un contour.
  const ancien = {
    roles: {
      background: { kind: 'paint', cssProperties: ['background-color'] },
      foreground: { kind: 'paint', cssProperties: ['color'] },
      icon: { kind: 'stroke', cssProperties: ['box-shadow'] },
      border: { kind: 'stroke', cssProperties: ['box-shadow'] },
    },
  };
  assert.equal(natureDuRoleDuContrat(ancien, 'icon'), 'contour');
  assert.equal(natureDuRoleDuContrat(ancien, 'border'), 'contour');
  assert.equal(natureDuRoleDuContrat(ancien, 'ring'), null);
  // Un rôle propre au contrat, inconnu du kit, a la nature que le contrat lui donne.
  assert.equal(natureDuRoleDuContrat({ roles: { halo: { kind: 'stroke' } } }, 'halo'), 'contour');
});

test('un rôle cité sans `kind` lisible prend la nature de la table du kit', () => {
  const rendering = { roles: { foreground: { cssProperties: ['color'] }, halo: {}, border: null } };
  assert.equal(natureDuRoleDuContrat(rendering, 'foreground'), 'peinture');
  assert.equal(natureDuRoleDuContrat(rendering, 'border'), 'contour');
  assert.equal(natureDuRoleDuContrat(rendering, 'halo'), null);
});
