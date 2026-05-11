/**
 * Tiny boolean expression evaluator for `when:` clauses.
 *
 * Supports: `predicate_name`, `and(a, b, ...)`, `or(a, b, ...)`, `not(a)`.
 * Tokens are predicate names previously evaluated to booleans.
 */

type Token = { kind: "name" | "lparen" | "rparen" | "comma"; value: string };

const NAME = /[A-Za-z_][A-Za-z_0-9]*/;

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === undefined) break;
    if (ch === " " || ch === "\t" || ch === "\n") {
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ kind: "lparen", value: "(" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ kind: "rparen", value: ")" });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ kind: "comma", value: "," });
      i++;
      continue;
    }
    const match = input.slice(i).match(new RegExp(`^${NAME.source}`));
    if (!match) {
      throw new Error(`unexpected character at ${i}: ${ch}`);
    }
    tokens.push({ kind: "name", value: match[0] });
    i += match[0].length;
  }
  return tokens;
}

export function evalCondition(expr: string, predicates: Record<string, boolean>): boolean {
  if (expr.trim() === "") return true;
  const tokens = tokenize(expr);
  let cursor = 0;

  function peek(): Token | undefined {
    return tokens[cursor];
  }
  function consume(): Token {
    const t = tokens[cursor];
    if (!t) throw new Error("unexpected end of expression");
    cursor++;
    return t;
  }

  function parseExpr(): boolean {
    const t = consume();
    if (t.kind !== "name") throw new Error(`expected name, got ${t.kind}`);

    if (peek()?.kind === "lparen") {
      consume(); // lparen
      const args: boolean[] = [];
      if (peek()?.kind !== "rparen") {
        args.push(parseExpr());
        while (peek()?.kind === "comma") {
          consume(); // comma
          args.push(parseExpr());
        }
      }
      const close = consume();
      if (close.kind !== "rparen") throw new Error("expected closing paren");

      switch (t.value) {
        case "and":
          return args.every(Boolean);
        case "or":
          return args.some(Boolean);
        case "not":
          if (args.length !== 1) throw new Error("not() takes exactly one argument");
          return !(args[0] as boolean);
        default:
          throw new Error(`unknown function ${t.value}`);
      }
    }

    if (!(t.value in predicates)) {
      throw new Error(`unknown predicate: ${t.value}`);
    }
    return predicates[t.value] === true;
  }

  const result = parseExpr();
  if (cursor !== tokens.length) {
    throw new Error("trailing tokens after expression");
  }
  return result;
}
