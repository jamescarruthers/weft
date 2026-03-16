import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { ParsedRow } from '../types';
import { parsePragmas } from './pragmas';
import { computeSliderRange } from '../utils/sliderRange';

function getTrailingComment(code: string, node: acorn.Node): string {
  const lineEnd = code.indexOf('\n', node.end);
  const rest = code.slice(node.end, lineEnd === -1 ? undefined : lineEnd);
  const commentMatch = rest.match(/\/\/(.*)$/);
  return commentMatch ? commentMatch[1] : '';
}

function inferValueType(value: any): ParsedRow['valueType'] {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'function') return 'function';
  if (typeof value === 'object' && value !== null) return 'object';
  return 'unknown';
}

function extractReferences(node: acorn.Node, declaredNames: Set<string>): string[] {
  const refs: Set<string> = new Set();
  const builtins = new Set(['Math', 'console', 'JSON', 'Date', 'parseInt', 'parseFloat',
    'isNaN', 'isFinite', 'undefined', 'null', 'true', 'false', 'NaN', 'Infinity',
    'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp', 'Error', 'Map', 'Set',
    'Promise', 'Symbol', 'Proxy', 'Reflect', 'globalThis', 'window', 'document']);

  walk.simple(node, {
    Identifier(id: any) {
      if (!declaredNames.has(id.name) && !builtins.has(id.name)) {
        refs.add(id.name);
      }
    },
    MemberExpression(me: any) {
      if (me.object.type === 'Identifier' && !declaredNames.has(me.object.name) && !builtins.has(me.object.name)) {
        refs.add(me.object.name);
      }
    }
  });

  return Array.from(refs);
}

function tryEvalLiteral(node: any): any {
  switch (node.type) {
    case 'Literal': return node.value;
    case 'UnaryExpression':
      if (node.operator === '-' && node.argument.type === 'Literal') {
        return -node.argument.value;
      }
      return undefined;
    case 'ArrayExpression':
      try {
        return node.elements.map((el: any) => el ? tryEvalLiteral(el) : null);
      } catch { return undefined; }
    case 'ObjectExpression':
      try {
        const obj: Record<string, any> = {};
        for (const prop of node.properties) {
          const key = prop.key.name || prop.key.value;
          obj[key] = tryEvalLiteral(prop.value);
        }
        return obj;
      } catch { return undefined; }
    case 'TemplateLiteral':
      if (node.expressions.length === 0) return node.quasis[0].value.cooked;
      return undefined;
    default: return undefined;
  }
}

export function parseNodeCode(code: string): { rows: ParsedRow[]; errors: string[]; title?: string } {
  const rows: ParsedRow[] = [];
  const errors: string[] = [];

  if (!code.trim()) return { rows, errors, title: undefined };

  // Check for a leading comment that names the node
  let title: string | undefined;
  let codeToParse = code;
  const titleMatch = code.match(/^\s*\/\/\s*(.+)/);
  if (titleMatch) {
    title = titleMatch[1].trim();
    // Remove the title comment line before parsing
    codeToParse = code.slice(code.indexOf('\n') + 1);
    if (!codeToParse.trim()) return { rows, errors, title };
  }

  let ast: acorn.Node;
  try {
    ast = acorn.parse(codeToParse, {
      ecmaVersion: 2022,
      sourceType: 'module',
      allowReturnOutsideFunction: true,
    });
  } catch (e: any) {
    errors.push(e.message);
    return { rows, errors, title };
  }

  const body = (ast as any).body as any[];
  const declaredNames = new Set<string>();

  // First pass: collect all declared names
  for (const stmt of body) {
    if (stmt.type === 'VariableDeclaration') {
      for (const decl of stmt.declarations) {
        if (decl.id.type === 'Identifier') {
          declaredNames.add(decl.id.name);
        } else if (decl.id.type === 'ObjectPattern') {
          for (const prop of decl.id.properties) {
            if (prop.value?.name) declaredNames.add(prop.value.name);
            else if (prop.key?.name) declaredNames.add(prop.key.name);
          }
        }
      }
    } else if (stmt.type === 'FunctionDeclaration' && stmt.id) {
      declaredNames.add(stmt.id.name);
    } else if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
      if (stmt.expression.left.type === 'Identifier') {
        declaredNames.add(stmt.expression.left.name);
      }
    }
  }

  // Second pass: build rows
  for (const stmt of body) {
    const comment = getTrailingComment(codeToParse, stmt);
    const pragmas = parsePragmas(comment);
    const stmtCode = codeToParse.slice(stmt.start, stmt.end);

    if (stmt.type === 'VariableDeclaration') {
      const kind = stmt.kind as 'var' | 'let' | 'const';

      for (const decl of stmt.declarations) {
        if (decl.id.type === 'ObjectPattern' && decl.init) {
          // Destructuring: const { sin, cos } = Math
          for (const prop of decl.id.properties) {
            const name = prop.value?.name || prop.key?.name;
            if (name) {
              rows.push({
                kind,
                name,
                valueType: 'unknown',
                initialValue: undefined,
                currentValue: undefined,
                references: extractReferences(decl.init, declaredNames),
                pragmas,
                code: stmtCode,
              });
            }
          }
          continue;
        }

        const name = decl.id.type === 'Identifier' ? decl.id.name : '_';
        const literalVal = decl.init ? tryEvalLiteral(decl.init) : undefined;
        const isLiteral = literalVal !== undefined;
        const refs = decl.init ? extractReferences(decl.init, declaredNames) : [];

        let valueType: ParsedRow['valueType'] = 'unknown';
        let initialValue: any = undefined;

        if (isLiteral) {
          initialValue = literalVal;
          valueType = inferValueType(literalVal);
        } else if (decl.init) {
          // It's an expression
          valueType = 'unknown';
        }

        let range = pragmas.range;
        if (!range && (kind === 'var' || kind === 'let') && valueType === 'number') {
          range = computeSliderRange(initialValue);
        }

        rows.push({
          kind: isLiteral ? kind : (kind === 'const' ? 'const' : kind),
          name,
          valueType,
          initialValue,
          currentValue: initialValue,
          references: refs,
          range,
          pragmas,
          code: stmtCode,
        });
      }
    } else if (stmt.type === 'FunctionDeclaration' && stmt.id) {
      rows.push({
        kind: 'function',
        name: stmt.id.name,
        valueType: 'function',
        initialValue: undefined,
        currentValue: undefined,
        references: [],
        pragmas,
        code: stmtCode,
      });
    } else if (stmt.type === 'ExpressionStatement') {
      const expr = stmt.expression;
      if (expr.type === 'AssignmentExpression' && expr.left.type === 'Identifier') {
        const name = expr.left.name;
        const refs = extractReferences(expr.right, declaredNames);
        rows.push({
          kind: 'expression',
          name,
          valueType: 'unknown',
          initialValue: undefined,
          currentValue: undefined,
          references: refs,
          pragmas,
          code: stmtCode,
        });
      } else {
        const refs = extractReferences(expr, declaredNames);
        rows.push({
          kind: 'expression',
          name: `_expr_${rows.length}`,
          valueType: 'unknown',
          initialValue: undefined,
          currentValue: undefined,
          references: refs,
          pragmas,
          code: stmtCode,
        });
      }
    } else {
      // Complex: class, loop, if, etc.
      rows.push({
        kind: 'complex',
        name: `_block_${rows.length}`,
        valueType: 'unknown',
        initialValue: undefined,
        currentValue: undefined,
        references: extractReferences(stmt, declaredNames),
        pragmas,
        code: stmtCode,
      });
    }
  }

  return { rows, errors, title };
}
