/**
 * La lecture des typages installés de Figma et le classement d'une paire (type, propriété) par la table de couverture.
 * Seule source de cette lecture : le test de la table et le test de la capture d'Architect l'importent.
 */
import fs from 'node:fs';

import ts from 'typescript';

import { TABLE, type Entree } from './couvertureFigma.table';

const fichierDesTypages = require.resolve('@figma/plugin-typings/plugin-api.d.ts');
const source = ts.createSourceFile(fichierDesTypages, fs.readFileSync(fichierDesTypages, 'utf8'), ts.ScriptTarget.Latest, true);
const interfaces = new Map<string, ts.InterfaceDeclaration>();
const alias = new Map<string, ts.TypeAliasDeclaration>();
for (const instruction of source.statements) {
  if (ts.isInterfaceDeclaration(instruction)) interfaces.set(instruction.name.text, instruction);
  else if (ts.isTypeAliasDeclaration(instruction)) alias.set(instruction.name.text, instruction);
}

/** Propriétés d'une interface et de celles qu'elle étend ; les méthodes n'en sont pas. */
export function proprietesDe(nom: string, vus: readonly string[] = []): Set<string> {
  const declaration = interfaces.get(nom);
  const proprietes = new Set<string>();
  if (!declaration || vus.includes(nom)) return proprietes;
  for (const clause of declaration.heritageClauses ?? []) {
    for (const parent of clause.types) {
      for (const propriete of proprietesDe(parent.expression.getText(source), [...vus, nom])) proprietes.add(propriete);
    }
  }
  for (const membre of declaration.members) {
    if (ts.isPropertySignature(membre)) proprietes.add(membre.name.getText(source).replace(/^['"]|['"]$/g, ''));
  }
  return proprietes;
}

/** Interfaces nommées par l'union d'un alias, en descendant dans les alias qu'elle cite. */
export function interfacesDeLAlias(nom: string): string[] {
  const type = alias.get(nom)?.type;
  const noms: string[] = [];
  const parcourir = (noeud: ts.TypeNode): void => {
    if (ts.isUnionTypeNode(noeud)) noeud.types.forEach(parcourir);
    else if (ts.isParenthesizedTypeNode(noeud)) parcourir(noeud.type);
    else if (ts.isTypeReferenceNode(noeud)) {
      const cible = noeud.typeName.getText(source);
      if (alias.has(cible)) noms.push(...interfacesDeLAlias(cible));
      else if (interfaces.has(cible)) noms.push(cible);
    }
  };
  if (type) parcourir(type);
  return noms;
}

/** Les types de nœud de l'union `SceneNode`. */
export const typesDeNoeud = interfacesDeLAlias('SceneNode');

export const typesDeLEntree = (entree: Entree): readonly string[] => (entree.types === 'noeuds' ? typesDeNoeud : entree.types);
const proprietesLues = new Map<string, readonly string[]>();
/** Les propriétés d'un type, lues une fois. */
export function proprietesDuType(type: string): readonly string[] {
  let lues = proprietesLues.get(type);
  if (!lues) proprietesLues.set(type, (lues = [...proprietesDe(type)]));
  return lues;
}

export const proprietesDeLEntree = (entree: Entree, type: string): readonly string[] =>
  entree.proprietes === '*' ? proprietesDuType(type) : entree.proprietes;

/** L'indice de la première entrée de la table qui reconnaît la paire, comme le dit l'en-tête de la table ; -1 sinon. */
export function classement(type: string, propriete: string): number {
  return TABLE.findIndex((entree) => typesDeLEntree(entree).includes(type) && proprietesDeLEntree(entree, type).includes(propriete));
}
