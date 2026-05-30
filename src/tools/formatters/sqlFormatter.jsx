"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Database, Minimize2 } from "lucide-react";
import { copyToClipboard, downloadText } from "@/lib/helpers";

// ============================================================
// SQL FORMATTER ENGINE
// Pure JS — no external dependency
// Handles: SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP,
// JOINs, subqueries, CTEs, window functions, CASE expressions
// ============================================================

// ── SQL Keywords ──────────────────────────────────────────────
const KEYWORDS_UPPERCASE = new Set([
  "SELECT","FROM","WHERE","AND","OR","NOT","IN","EXISTS","BETWEEN",
  "LIKE","ILIKE","IS","NULL","TRUE","FALSE","AS","ON","JOIN",
  "LEFT","RIGHT","INNER","OUTER","FULL","CROSS","NATURAL",
  "INSERT","INTO","VALUES","UPDATE","SET","DELETE",
  "CREATE","TABLE","VIEW","INDEX","DATABASE","SCHEMA","SEQUENCE",
  "ALTER","DROP","TRUNCATE","RENAME","ADD","COLUMN","CONSTRAINT",
  "PRIMARY","FOREIGN","KEY","UNIQUE","REFERENCES","CHECK","DEFAULT",
  "GROUP","BY","ORDER","HAVING","LIMIT","OFFSET","FETCH","NEXT","ROWS","ONLY",
  "UNION","INTERSECT","EXCEPT","ALL","DISTINCT","TOP",
  "CASE","WHEN","THEN","ELSE","END",
  "WITH","RECURSIVE","LATERAL",
  "OVER","PARTITION","WINDOW","ROWS","RANGE","UNBOUNDED","PRECEDING","FOLLOWING","CURRENT","ROW",
  "COUNT","SUM","AVG","MIN","MAX","COALESCE","NULLIF","NULLS","FIRST","LAST",
  "CAST","CONVERT","EXTRACT","DATE","TIME","TIMESTAMP","INTERVAL",
  "IF","THEN","BEGIN","COMMIT","ROLLBACK","TRANSACTION","SAVEPOINT",
  "GRANT","REVOKE","PRIVILEGES","ON","TO","FROM","WITH","OPTION",
  "EXPLAIN","ANALYZE","VERBOSE","DESCRIBE","SHOW",
  "RETURNING","CONFLICT","NOTHING","DO","EXCLUDED",
  "ASC","DESC","NULLS","FIRST","LAST",
  "PROCEDURE","FUNCTION","TRIGGER","EVENT","REPLACE","TEMPORARY","TEMP",
  "USING","LANGUAGE","RETURNS","DECLARE","RAISE","NOTICE","EXCEPTION",
  "ANY","SOME","ARRAY","OPERATOR","TYPE","DOMAIN","EXTENSION",
  "INNER","NATURAL","STRAIGHT_JOIN","FORCE","USE","IGNORE",
]);

const CLAUSE_STARTERS = new Set([
  "SELECT","FROM","WHERE","GROUP","ORDER","HAVING","LIMIT","OFFSET",
  "UNION","INTERSECT","EXCEPT","INSERT","INTO","VALUES","UPDATE",
  "SET","DELETE","CREATE","ALTER","DROP","TRUNCATE","WITH",
  "RETURNING","FETCH","ON","CONFLICT",
]);

const JOIN_KEYWORDS = new Set([
  "JOIN","INNER","LEFT","RIGHT","FULL","CROSS","NATURAL","STRAIGHT_JOIN",
]);

// ── Tokenizer ─────────────────────────────────────────────────
function tokenizeSql(sql) {
  const tokens = [];
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];

    // Whitespace
    if (/\s/.test(ch)) {
      let ws = "";
      while (i < sql.length && /\s/.test(sql[i])) ws += sql[i++];
      tokens.push({ type: "whitespace", value: ws });
      continue;
    }

    // Line comment --
    if (ch === "-" && sql[i + 1] === "-") {
      let s = "--";
      i += 2;
      while (i < sql.length && sql[i] !== "\n") s += sql[i++];
      tokens.push({ type: "comment_line", value: s });
      continue;
    }

    // Block comment /* */
    if (ch === "/" && sql[i + 1] === "*") {
      let s = "/*";
      i += 2;
      while (i < sql.length) {
        if (sql[i] === "*" && sql[i + 1] === "/") { s += "*/"; i += 2; break; }
        s += sql[i++];
      }
      tokens.push({ type: "comment_block", value: s });
      continue;
    }

    // Hash comment (MySQL)
    if (ch === "#") {
      let s = "#";
      i++;
      while (i < sql.length && sql[i] !== "\n") s += sql[i++];
      tokens.push({ type: "comment_line", value: s });
      continue;
    }

    // Single-quoted string
    if (ch === "'") {
      let s = "'";
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") { s += "''"; i += 2; continue; } // escaped quote
        if (sql[i] === "\\") { s += sql[i] + (sql[i + 1] || ""); i += 2; continue; }
        if (sql[i] === "'") { s += "'"; i++; break; }
        s += sql[i++];
      }
      tokens.push({ type: "string", value: s });
      continue;
    }

    // Double-quoted identifier or string (ANSI SQL / PostgreSQL)
    if (ch === '"') {
      let s = '"';
      i++;
      while (i < sql.length) {
        if (sql[i] === '"' && sql[i + 1] === '"') { s += '""'; i += 2; continue; }
        if (sql[i] === '"') { s += '"'; i++; break; }
        s += sql[i++];
      }
      tokens.push({ type: "quoted_identifier", value: s });
      continue;
    }

    // Backtick identifier (MySQL)
    if (ch === "`") {
      let s = "`";
      i++;
      while (i < sql.length && sql[i] !== "`") s += sql[i++];
      s += "`"; i++;
      tokens.push({ type: "quoted_identifier", value: s });
      continue;
    }

    // Square bracket identifier (SQL Server)
    if (ch === "[") {
      let s = "[";
      i++;
      while (i < sql.length && sql[i] !== "]") s += sql[i++];
      s += "]"; i++;
      tokens.push({ type: "quoted_identifier", value: s });
      continue;
    }

    // Dollar-quoted string (PostgreSQL) $$...$$
    if (ch === "$") {
      // Check for $$ or $tag$
      let tag = "$";
      let j   = i + 1;
      while (j < sql.length && sql[j] !== "$" && !/\s/.test(sql[j])) tag += sql[j++];
      if (j < sql.length && sql[j] === "$") {
        tag += "$"; // complete tag like $$ or $body$
        const endTag = tag;
        let s = tag;
        i = j + 1;
        while (i < sql.length) {
          const endIdx = sql.indexOf(endTag, i);
          if (endIdx === -1) { s += sql.slice(i); i = sql.length; break; }
          s += sql.slice(i, endIdx + endTag.length);
          i = endIdx + endTag.length;
          break;
        }
        tokens.push({ type: "string", value: s });
        continue;
      }
    }

    // Number
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(sql[i + 1]))) {
      let s = "";
      while (i < sql.length && /[0-9._eExX+\-abcdefABCDEF]/.test(sql[i])) {
        s += sql[i++];
      }
      tokens.push({ type: "number", value: s });
      continue;
    }

    // Punctuation
    if ("(),.;".includes(ch)) {
      tokens.push({ type: "punctuation", value: ch });
      i++;
      continue;
    }

    // Operators
    const TWO_CHAR = ["!=","<>","<=",">=","::","||","&&","--","/*","*/","!~","~*","!~*"];
    let matched = false;
    for (const op of TWO_CHAR) {
      if (sql.slice(i, i + op.length) === op) {
        tokens.push({ type: "operator", value: op });
        i += op.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    if ("<>=!+-*/%^&|~@#".includes(ch)) {
      tokens.push({ type: "operator", value: ch });
      i++;
      continue;
    }

    // Identifier or keyword
    if (/[a-zA-Z_@#]/.test(ch)) {
      let s = "";
      while (i < sql.length && /[a-zA-Z0-9_$.]/.test(sql[i])) s += sql[i++];
      // Lookahead for qualified names like schema.table
      const upper = s.toUpperCase();
      if (KEYWORDS_UPPERCASE.has(upper)) {
        tokens.push({ type: "keyword", value: s, upper });
      } else {
        tokens.push({ type: "identifier", value: s });
      }
      continue;
    }

    // Colon (parameter placeholder :param)
    if (ch === ":") {
      let s = ":";
      i++;
      while (i < sql.length && /[a-zA-Z0-9_]/.test(sql[i])) s += sql[i++];
      tokens.push({ type: s.length > 1 ? "parameter" : "operator", value: s });
      continue;
    }

    // Question mark (parameter placeholder)
    if (ch === "?") {
      tokens.push({ type: "parameter", value: "?" });
      i++;
      continue;
    }

    // Dollar parameter ($1, $2 — PostgreSQL)
    if (ch === "$" && /[0-9]/.test(sql[i + 1])) {
      let s = "$";
      i++;
      while (i < sql.length && /[0-9]/.test(sql[i])) s += sql[i++];
      tokens.push({ type: "parameter", value: s });
      continue;
    }

    // Fallthrough
    tokens.push({ type: "other", value: ch });
    i++;
  }

  return tokens.filter((t) => t.type !== "whitespace");
}

// ── SQL Formatter ─────────────────────────────────────────────
function formatSql(raw, options = {}) {
  const {
    indentSize      = 2,
    useTabs         = false,
    keywordCase     = "upper",    // upper | lower | preserve
    identifierCase  = "preserve", // upper | lower | preserve
    commaPosition   = "end",      // end | start
    linesBetween    = 1,          // blank lines between statements
    removeComments  = false,
    maxLineLength   = 80,
  } = options;

  if (!raw || !raw.trim()) {
    return { success: false, output: "", error: "Input is empty." };
  }

  const indent = useTabs ? "\t" : " ".repeat(indentSize);

  try {
    const tokens = tokenizeSql(raw.trim());
    const output = renderSql(tokens, {
      indent,
      keywordCase,
      identifierCase,
      commaPosition,
      linesBetween,
      removeComments,
      maxLineLength,
    });

    // Count stats
    const stmts = (output.match(/\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bCREATE\b|\bALTER\b|\bDROP\b/gi) || []).length;

    return {
      success: true,
      output:  output.trimEnd(),
      stats: {
        inputLength:  raw.length,
        outputLength: output.length,
        inputLines:   raw.split("\n").length,
        outputLines:  output.split("\n").length,
        statements:   stmts,
        tokenCount:   tokens.length,
      },
    };
  } catch (e) {
    return { success: false, output: "", error: `Format error: ${e.message}` };
  }
}

function formatKeyword(word, mode) {
  if (mode === "upper")    return word.toUpperCase();
  if (mode === "lower")    return word.toLowerCase();
  return word;
}

function formatIdentifier(word, mode) {
  if (mode === "upper")    return word.toUpperCase();
  if (mode === "lower")    return word.toLowerCase();
  return word;
}

function renderSql(tokens, opts) {
  const {
    indent,
    keywordCase,
    identifierCase,
    commaPosition,
    linesBetween,
    removeComments,
  } = opts;

  let out       = "";
  let depth     = 0;
  let i         = 0;
  let newStatement = true;

  function pad(d = depth) {
    return indent.repeat(Math.max(0, d));
  }

  function peek(n = 1) { return tokens[i + n]; }
  function prev(n = 1) { return tokens[i - n]; }

  function nextMeaningfulKeyword() {
    for (let j = i + 1; j < tokens.length; j++) {
      if (tokens[j].type === "keyword") return tokens[j].upper;
    }
    return null;
  }

  function isJoinKeyword(upper) {
    return JOIN_KEYWORDS.has(upper) || upper === "JOIN";
  }

  // Track whether we're inside a parenthesized expression
  let parenDepth = 0;

  while (i < tokens.length) {
    const tok = tokens[i];

    // Comments
    if (tok.type === "comment_line" || tok.type === "comment_block") {
      if (removeComments) { i++; continue; }

      if (!out.endsWith("\n")) out += "\n";
      out += `${pad()}${tok.value.trim()}\n`;
      i++;
      continue;
    }

    // Keyword handling
    if (tok.type === "keyword") {
      const upper = tok.upper || tok.value.toUpperCase();
      const word  = formatKeyword(tok.value, keywordCase);

      // Statement separator — start new line for top-level clauses
      if (CLAUSE_STARTERS.has(upper) && parenDepth === 0) {

        // Multiple statements (;-separated)
        if (upper === "SELECT" || upper === "INSERT" || upper === "UPDATE" ||
            upper === "DELETE" || upper === "CREATE" || upper === "ALTER"  ||
            upper === "DROP"   || upper === "TRUNCATE") {
          if (out.trim()) {
            out = out.trimEnd();
            out += "\n";
            if (linesBetween > 0) out += "\n".repeat(linesBetween);
          }
          out += `${pad()}${word}`;
        } else if (upper === "FROM" || upper === "WHERE" || upper === "HAVING" ||
                   upper === "GROUP" || upper === "ORDER" || upper === "LIMIT" ||
                   upper === "OFFSET" || upper === "UNION" || upper === "INTERSECT" ||
                   upper === "EXCEPT" || upper === "RETURNING" || upper === "FETCH" ||
                   upper === "INTO"  || upper === "VALUES" || upper === "SET"   ||
                   upper === "ON CONFLICT") {
          out = out.trimEnd();
          out += `\n${pad()}${word}`;
        } else if (upper === "WITH") {
          if (out.trim()) out = out.trimEnd() + "\n\n";
          out += `${pad()}${word}`;
        } else {
          if (!out.endsWith("\n") && !out.endsWith(" ")) out += " ";
          out += word;
        }

        out += " ";
        i++;
        continue;
      }

      // JOIN keywords — new line, same depth
      if (isJoinKeyword(upper) && parenDepth === 0) {
        out = out.trimEnd();
        out += `\n${pad()}${word} `;
        i++;
        continue;
      }

      // AND / OR at root level — new line with indent
      if ((upper === "AND" || upper === "OR") && parenDepth === 0) {
        out = out.trimEnd();
        out += `\n${pad(depth + 1)}${word} `;
        i++;
        continue;
      }

      // ON (join condition) — inline or new line
      if (upper === "ON" && parenDepth === 0) {
        if (!out.endsWith(" ")) out += " ";
        out += `${word} `;
        i++;
        continue;
      }

      // CASE expression
      if (upper === "CASE") {
        if (!out.endsWith(" ")) out += " ";
        out += `${word}\n`;
        depth++;
        i++;
        continue;
      }

      if (upper === "WHEN" || upper === "ELSE") {
        out = out.trimEnd();
        out += `\n${pad()}${word} `;
        i++;
        continue;
      }

      if (upper === "THEN") {
        if (!out.endsWith(" ")) out += " ";
        out += `${word} `;
        i++;
        continue;
      }

      if (upper === "END") {
        depth = Math.max(0, depth - 1);
        out   = out.trimEnd();
        out  += `\n${pad()}${word}`;
        i++;
        continue;
      }

      // OVER — window function
      if (upper === "OVER") {
        if (!out.endsWith(" ")) out += " ";
        out += `${word} `;
        i++;
        continue;
      }

      // AS — inline
      if (upper === "AS") {
        if (!out.endsWith(" ")) out += " ";
        out += `${word} `;
        i++;
        continue;
      }

      // BY (GROUP BY, ORDER BY)
      if (upper === "BY") {
        if (!out.endsWith(" ")) out += " ";
        out += `${word}\n${pad(depth + 1)}`;
        i++;
        continue;
      }

      // Default keyword — inline with space
      if (!out.endsWith(" ") && !out.endsWith("\n")) out += " ";
      out += word;
      out += " ";
      i++;
      continue;
    }

    // Identifiers
    if (tok.type === "identifier" || tok.type === "quoted_identifier") {
      const word = tok.type === "identifier"
        ? formatIdentifier(tok.value, identifierCase)
        : tok.value; // quoted identifiers preserve as-is

      if (!out.endsWith(" ") && !out.endsWith("\n") && !out.endsWith("(") &&
          !out.endsWith(".") && !out.endsWith(",")) {
        out += " ";
      }
      out += word;
      i++;
      continue;
    }

    // Strings
    if (tok.type === "string") {
      if (!out.endsWith(" ") && !out.endsWith("\n") && !out.endsWith("(") &&
          !out.endsWith(",") && !out.endsWith("=") && !out.endsWith("!")) {
        out += " ";
      }
      out += tok.value;
      i++;
      continue;
    }

    // Numbers
    if (tok.type === "number") {
      if (!out.endsWith(" ") && !out.endsWith("\n") && !out.endsWith("(") &&
          !out.endsWith("-") && !out.endsWith("+")) {
        out += " ";
      }
      out += tok.value;
      i++;
      continue;
    }

    // Parameters (:name, ?, $1)
    if (tok.type === "parameter") {
      if (!out.endsWith(" ") && !out.endsWith("(") && !out.endsWith(",")) out += " ";
      out += tok.value;
      i++;
      continue;
    }

    // Punctuation
    if (tok.type === "punctuation") {
      const p = tok.value;

      if (p === "(") {
        parenDepth++;
        // Check if subquery follows
        const nextKw = peek()?.type === "keyword" ? peek().upper : null;
        const isSubquery = nextKw === "SELECT" || nextKw === "WITH";

        if (isSubquery) {
          if (!out.endsWith(" ")) out += " ";
          out += "(\n";
          depth++;
          out += `${pad()}`;
        } else {
          out = out.trimEnd();
          out += "(";
        }
        i++;
        continue;
      }

      if (p === ")") {
        parenDepth = Math.max(0, parenDepth - 1);
        const prevKw = tokens[i - 1];
        out = out.trimEnd();

        // Check if we opened a subquery
        const nextAfter = peek();
        if (depth > 0 && (prevKw?.type === "keyword" || prevKw?.type === "identifier")) {
          depth--;
          out += "\n" + pad() + ")";
        } else {
          out += ")";
        }
        i++;
        continue;
      }

      if (p === ",") {
        if (commaPosition === "start" && parenDepth === 0) {
          out = out.trimEnd();
          out += "\n" + pad() + ",";
          out += " ";
        } else {
          out = out.trimEnd();
          out += ",\n";
          if (parenDepth > 0) {
            out += pad(depth) + "  "; // extra indent inside parens
          } else {
            out += pad(depth + 1);
          }
        }
        i++;
        continue;
      }

      if (p === ";") {
        out = out.trimEnd();
        out += ";\n";
        depth = 0;
        parenDepth = 0;
        i++;
        continue;
      }

      if (p === ".") {
        out = out.trimEnd();
        out += ".";
        i++;
        continue;
      }

      out += p;
      i++;
      continue;
    }

    // Operators
    if (tok.type === "operator") {
      const op = tok.value;

      if (op === "::") {
        // PostgreSQL cast operator — no spaces
        out = out.trimEnd();
        out += "::";
        i++;
        continue;
      }

      if (!out.endsWith(" ") && !out.endsWith("\n")) out += " ";
      out += op;
      out += " ";
      i++;
      continue;
    }

    // Other
    out += tok.value;
    i++;
  }

  // Clean up excessive blank lines
  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

// ── SQL Minifier ──────────────────────────────────────────────
function minifySql(raw) {
  if (!raw.trim()) {
    return { success: false, output: "", error: "Input is empty." };
  }

  try {
    const tokens = tokenizeSql(raw.trim());
    let out  = "";
    let prev = null;

    for (const tok of tokens) {
      if (tok.type === "comment_line" || tok.type === "comment_block") continue;

      const val = tok.type === "keyword"
        ? tok.value.toUpperCase()
        : tok.value;

      if (prev) {
        const needsSpace =
          // keywords need spaces around them
          tok.type === "keyword" ||
          prev.type === "keyword" ||
          // identifiers need space between each other and numbers
          (prev.type === "identifier" && tok.type === "identifier") ||
          (prev.type === "identifier" && tok.type === "number") ||
          (prev.type === "number"     && tok.type === "identifier") ||
          // string needs space before/after in most cases
          (prev.type === "string" && tok.type !== "punctuation" && tok.type !== "operator") ||
          (tok.type === "string" && prev.type !== "punctuation" && prev.type !== "operator") ||
          // operators need surrounding spaces
          (prev.type === "operator" && tok.type !== "punctuation") ||
          (tok.type === "operator" && prev.type !== "punctuation" && prev.value !== "(");

        if (
          needsSpace &&
          prev.value !== "(" && tok.value !== ")" &&
          prev.value !== "." && tok.value !== "." &&
          prev.value !== "," && tok.value !== ";" &&
          prev.value !== "::" && tok.value !== "::"
        ) {
          out += " ";
        }
      }

      out += val;
      prev = tok;
    }

    return {
      success: true,
      output:  out,
      stats: {
        inputLength:  raw.length,
        outputLength: out.length,
        saved:        raw.length - out.length,
        savedPct:     Math.round(((raw.length - out.length) / raw.length) * 100),
      },
    };
  } catch (e) {
    return { success: false, output: "", error: e.message };
  }
}

// ── SQL Analyzer ──────────────────────────────────────────────
function analyzeSql(sql) {
  const upper = sql.toUpperCase();
  return {
    selects:    (upper.match(/\bSELECT\b/g) || []).length,
    inserts:    (upper.match(/\bINSERT\b/g) || []).length,
    updates:    (upper.match(/\bUPDATE\b/g) || []).length,
    deletes:    (upper.match(/\bDELETE\b/g) || []).length,
    creates:    (upper.match(/\bCREATE\b/g) || []).length,
    joins:      (upper.match(/\bJOIN\b/g) || []).length,
    subqueries: (upper.match(/\(\s*SELECT/gi) || []).length,
    ctes:       (upper.match(/\bWITH\b/g) || []).length,
    conditions: (upper.match(/\bWHERE\b/g) || []).length,
    groupBys:   (upper.match(/\bGROUP\s+BY\b/g) || []).length,
    orderBys:   (upper.match(/\bORDER\s+BY\b/g) || []).length,
    windows:    (upper.match(/\bOVER\s*\(/g) || []).length,
    tables:     [...new Set((upper.match(/(?:FROM|JOIN|UPDATE|INTO)\s+([a-zA-Z_][a-zA-Z0-9_.]*)/gi) || []).map((m) => m.split(/\s+/).pop()))].length,
    parameters: (sql.match(/:[a-zA-Z_]\w*|\$\d+|\?/g) || []).length,
  };
}

// ============================================================
// CONSTANTS
// ============================================================

const SAMPLES = {
  select: `select u.id,u.name,u.email,u.created_at,count(o.id) as order_count,sum(o.total_amount) as total_spent,avg(o.total_amount) as avg_order_value from users u left join orders o on u.id=o.user_id inner join user_profiles up on u.id=up.user_id where u.status='active' and u.created_at>='2024-01-01' and (u.role='customer' or u.role='premium') group by u.id,u.name,u.email,u.created_at having count(o.id)>0 order by total_spent desc,u.name asc limit 50 offset 0`,

  cte: `with monthly_revenue as(select date_trunc('month',o.created_at) as month,sum(o.total_amount) as revenue,count(distinct o.user_id) as unique_customers,count(o.id) as total_orders from orders o where o.status='completed' and o.created_at>=current_date-interval'12 months' group by 1),revenue_growth as(select month,revenue,unique_customers,total_orders,lag(revenue)over(order by month) as prev_revenue,round((revenue-lag(revenue)over(order by month))/nullif(lag(revenue)over(order by month),0)*100,2) as growth_pct from monthly_revenue)select month,revenue,unique_customers,total_orders,prev_revenue,growth_pct,sum(revenue)over(order by month rows between unbounded preceding and current row) as cumulative_revenue from revenue_growth order by month desc`,

  insert: `insert into products(name,description,sku,price,cost_price,category_id,brand_id,stock_quantity,weight_kg,is_active,metadata,created_at,updated_at)values('Premium Wireless Headphones','High-quality noise-cancelling headphones with 30-hour battery life','SKU-WH-001',299.99,145.00,3,7,150,0.35,true,'{"color":"black","warranty_years":2,"bluetooth_version":"5.0"}',now(),now()),('USB-C Hub 7-in-1','Expand your connectivity with 7 ports including HDMI 4K and USB-A 3.0','SKU-HB-007',49.99,22.50,5,12,300,0.12,true,'{"ports":7,"max_power_delivery":100}',now(),now()) on conflict(sku) do update set price=excluded.price,stock_quantity=stock_quantity+excluded.stock_quantity,updated_at=now()`,

  window: `select employee_id,department_id,first_name,last_name,salary,hire_date,row_number()over(partition by department_id order by salary desc) as dept_rank,rank()over(partition by department_id order by salary desc) as salary_rank,dense_rank()over(partition by department_id order by salary desc) as dense_rank,percent_rank()over(partition by department_id order by salary) as percentile,sum(salary)over(partition by department_id) as dept_total,avg(salary)over(partition by department_id) as dept_avg,salary-avg(salary)over(partition by department_id) as vs_dept_avg,first_value(salary)over(partition by department_id order by salary desc rows between unbounded preceding and unbounded following) as highest_in_dept,lag(salary,1,0)over(partition by department_id order by hire_date) as prev_hire_salary,lead(hire_date)over(partition by department_id order by hire_date) as next_hire_date from employees where department_id is not null order by department_id,dept_rank`,

  create: `create table if not exists orders(id bigserial primary key,user_id bigint not null references users(id) on delete cascade,status varchar(20) not null default 'pending' check(status in('pending','processing','shipped','delivered','cancelled','refunded')),subtotal numeric(12,2) not null check(subtotal>=0),tax_amount numeric(12,2) not null default 0 check(tax_amount>=0),shipping_amount numeric(12,2) not null default 0 check(shipping_amount>=0),total_amount numeric(12,2) generated always as(subtotal+tax_amount+shipping_amount) stored,currency_code char(3) not null default 'USD',shipping_address_id bigint references addresses(id),billing_address_id bigint references addresses(id),notes text,metadata jsonb default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),deleted_at timestamptz);create index idx_orders_user_id on orders(user_id);create index idx_orders_status on orders(status) where deleted_at is null;create index idx_orders_created_at on orders(created_at desc);`,
};

const DIALECTS = [
  { value: "standard", label: "Standard SQL" },
  { value: "postgresql", label: "PostgreSQL"  },
  { value: "mysql",     label: "MySQL"        },
  { value: "mssql",     label: "SQL Server"   },
  { value: "sqlite",    label: "SQLite"       },
];

const KEYWORD_CASE_OPTIONS = [
  { value: "upper",    label: "UPPER" },
  { value: "lower",    label: "lower" },
  { value: "preserve", label: "Preserve" },
];

const INDENT_OPTIONS = [
  { value: 2,     label: "2 spaces" },
  { value: 4,     label: "4 spaces" },
  { value: "tab", label: "Tabs"     },
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── Toggle ────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        title={description}
        className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
          checked ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`} />
      </button>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </label>
  );
}

// ── Panel header ──────────────────────────────────────────────
function PanelHeader({ label, meta, actions }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        {meta && <span className="text-xs text-gray-400 tabular-nums">{meta}</span>}
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────
function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
      <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-xs font-mono text-red-700 leading-relaxed break-all">{message}</p>
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────
function CopyButton({ text, label = "Copy" }) {
  const [state, setState] = useState("idle");

  async function handleCopy() {
    if (!text) return;
    const ok = await copyToClipboard(text);
    setState(ok ? "copied" : "error");
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      disabled={!text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded-lg transition-colors"
    >
      {state === "copied" ? (
        <>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

// ── Stats bar ─────────────────────────────────────────────────
function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      {[
        { label: "Input",      value: `${stats.inputLength?.toLocaleString()} chars`  },
        { label: "Output",     value: `${stats.outputLength?.toLocaleString()} chars` },
        { label: "Lines",      value: stats.outputLines?.toLocaleString()              },
        { label: "Statements", value: stats.statements?.toLocaleString()              },
        { label: "Tokens",     value: stats.tokenCount?.toLocaleString()              },
      ].map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">{label}:</span>
          <span className="font-mono font-semibold text-gray-700">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Size comparison ───────────────────────────────────────────
function SizeComparison({ original, minified }) {
  if (!original || !minified) return null;
  const saved    = original.length - minified.length;
  const savedPct = Math.round((saved / original.length) * 100);
  const miniPct  = Math.round((minified.length / original.length) * 100);

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Size Reduction</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs font-bold text-green-700">
          <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {savedPct}% smaller
        </span>
      </div>
      <div className="space-y-2">
        {[
          { label: "Original", size: original.length, pct: 100,     color: "bg-gray-400"  },
          { label: "Minified", size: minified.length, pct: miniPct, color: "bg-green-500" },
        ].map(({ label, size, pct, color }) => (
          <div key={label}>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{label}</span>
              <span className={`font-mono font-semibold ${label === "Minified" ? "text-green-600" : "text-gray-600"}`}>
                {size.toLocaleString()} chars
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 pt-1">
        {[
          { label: "Original", value: `${original.length.toLocaleString()} chars`, color: "text-gray-700"  },
          { label: "Minified", value: `${minified.length.toLocaleString()} chars`, color: "text-green-600" },
          { label: "Saved",    value: `${saved.toLocaleString()} chars`,            color: "text-blue-600"  },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Line numbers ──────────────────────────────────────────────
function LineNumbers({ text }) {
  if (!text) return null;
  const count = text.split("\n").length;
  return (
    <div
      className="select-none text-right pr-3 pt-3.5 pb-3.5 text-xs font-mono text-gray-300 leading-relaxed bg-gray-50 border-r border-gray-200 min-w-[44px] overflow-hidden flex-shrink-0"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i + 1} className="leading-relaxed">{i + 1}</div>
      ))}
    </div>
  );
}

// ── SQL Analysis panel ────────────────────────────────────────
function SqlAnalysisPanel({ sql }) {
  if (!sql.trim()) return null;
  const a = analyzeSql(sql);

  const items = [
    { label: "SELECT",     value: a.selects,    color: "text-blue-600",   icon: "🔍" },
    { label: "INSERT",     value: a.inserts,    color: "text-green-600",  icon: "➕" },
    { label: "UPDATE",     value: a.updates,    color: "text-amber-600",  icon: "✏️" },
    { label: "DELETE",     value: a.deletes,    color: "text-red-600",    icon: "🗑️" },
    { label: "CREATE",     value: a.creates,    color: "text-purple-600", icon: "🏗️" },
    { label: "JOINs",      value: a.joins,      color: "text-indigo-600", icon: "🔗" },
    { label: "Subqueries", value: a.subqueries, color: "text-teal-600",   icon: "📦" },
    { label: "CTEs",       value: a.ctes,       color: "text-cyan-600",   icon: "🧩" },
    { label: "WHERE",      value: a.conditions, color: "text-orange-600", icon: "🔎" },
    { label: "Windows",    value: a.windows,    color: "text-rose-600",   icon: "📊" },
    { label: "Tables",     value: a.tables,     color: "text-emerald-600",icon: "🗄️" },
    { label: "Parameters", value: a.parameters, color: "text-gray-600",   icon: "📌" },
  ];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Query Analysis
        </span>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {items.map(({ label, value, color, icon }) => (
          <div key={label} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl">
            <span className="text-base flex-shrink-0">{icon}</span>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-medium">{label}</p>
              <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Performance hints */}
      {(a.selects > 0 || a.joins > 0) && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-gray-100 pt-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Performance hints
          </p>
          {a.joins > 3 && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              <svg width="12" height="12" className="flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {a.joins} JOINs detected — ensure all join columns are properly indexed
            </div>
          )}
          {a.subqueries > 2 && (
            <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
              <svg width="12" height="12" className="flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {a.subqueries} subqueries — consider CTEs for readability and potential optimization
            </div>
          )}
          {a.windows > 0 && (
            <div className="flex items-start gap-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 px-3 py-2 rounded-lg">
              <svg width="12" height="12" className="flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {a.windows} window function{a.windows !== 1 ? "s" : ""} — these run after WHERE/GROUP BY/HAVING
            </div>
          )}
          {a.selects > 0 && a.conditions === 0 && (
            <div className="flex items-start gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 px-3 py-2 rounded-lg">
              <svg width="12" height="12" className="flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              No WHERE clause — full table scan will occur. Add a condition if filtering is needed.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Empty output ──────────────────────────────────────────────
function EmptyOutput({ mode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
      <span className="text-3xl opacity-20">{mode === "minify" ? "🗜️" : "🗄️"}</span>
      <p className="text-xs text-gray-300">
        {mode === "minify" ? "Minified SQL appears here" : "Formatted SQL appears here"}
      </p>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function SqlFormatter() {
  const [input,          setInput]          = useState("");
  const [output,         setOutput]         = useState("");
  const [error,          setError]          = useState(null);
  const [stats,          setStats]          = useState(null);
  const [mode,           setMode]           = useState("format");
  const [indentSize,     setIndentSize]     = useState(2);
  const [keywordCase,    setKeywordCase]    = useState("upper");
  const [commaPosition,  setCommaPosition]  = useState("end");
  const [removeComments, setRemoveComments] = useState(false);
  const [showLines,      setShowLines]      = useState(true);
  const [showAnalysis,   setShowAnalysis]   = useState(false);
  const [autoProcess,    setAutoProcess]    = useState(false);
  const [activeSample,   setActiveSample]   = useState(null);

  // ── Process ──────────────────────────────────────────────────
  const handleProcess = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Please enter SQL to process.");
      setOutput("");
      setStats(null);
      return;
    }

    if (mode === "minify") {
      const result = minifySql(trimmed);
      if (result.success) {
        setOutput(result.output);
        setError(null);
        setStats(result.stats);
      } else {
        setOutput("");
        setError(result.error);
        setStats(null);
      }
    } else {
      const result = formatSql(trimmed, {
        indentSize:    indentSize === "tab" ? 2 : indentSize,
        useTabs:       indentSize === "tab",
        keywordCase,
        commaPosition,
        removeComments,
      });
      if (result.success) {
        setOutput(result.output);
        setError(null);
        setStats(result.stats);
      } else {
        setOutput("");
        setError(result.error);
        setStats(null);
      }
    }
  }, [input, mode, indentSize, keywordCase, commaPosition, removeComments]);

  // Auto process
  useEffect(() => {
    if (!autoProcess || !input.trim()) return;
    const t = setTimeout(handleProcess, 400);
    return () => clearTimeout(t);
  }, [input, autoProcess, handleProcess]);

  // Re-run on option changes
  useEffect(() => {
    if (input.trim() && output) handleProcess();
  }, [indentSize, keywordCase, commaPosition, removeComments, mode]);

  // Ctrl+Enter
  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleProcess();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleProcess]);

  function handleClear() {
    setInput("");
    setOutput("");
    setError(null);
    setStats(null);
    setActiveSample(null);
  }

  function loadSample(key) {
    setInput(SAMPLES[key]);
    setOutput("");
    setError(null);
    setStats(null);
    setActiveSample(key);
  }

  const inputMeta  = input  ? `${input.length.toLocaleString()} chars`  : null;
  const outputMeta = output ? `${output.length.toLocaleString()} chars · ${output.split("\n").length} lines` : null;

  return (
    <div className="space-y-4">

      {/* ── Mode selector ────────────────────────────────────── */}
<div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
  {[
    { value: "format", label: "Format / Beautify", icon: Database },
    { value: "minify", label: "Minify", icon: Minimize2 },
  ].map((m) => {
    const Icon = m.icon;
    return (
      <button
        key={m.value}
        onClick={() => {
          setMode(m.value);
          setOutput("");
          setError(null);
          setStats(null);
        }}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex-1 justify-center ${
          mode === m.value
            ? "bg-white text-blue-700 shadow-sm border border-gray-200"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Icon size={16} />
        <span>{m.label}</span>
      </button>
    );
  })}
</div>

      {/* ── Options toolbar ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">

        {/* Primary action */}
        <button
          onClick={handleProcess}
          data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {mode === "minify" ? "Minify SQL" : "Format SQL"}
        </button>

        {/* Format options */}
        {mode === "format" && (
          <>
            {/* Indent */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Indent:</span>
              <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
                {INDENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setIndentSize(opt.value)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      indentSize === opt.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Keyword case */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Keywords:</span>
              <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
                {KEYWORD_CASE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setKeywordCase(opt.value)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      keywordCase === opt.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Comma position */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Comma:</span>
              <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
                {[
                  { value: "end",   label: "End"   },
                  { value: "start", label: "Start" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCommaPosition(opt.value)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      commaPosition === opt.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Toggle
              checked={removeComments}
              onChange={setRemoveComments}
              label="Remove comments"
              description="Strip all SQL comments (-- and /* */)"
            />
          </>
        )}

        <Toggle
          checked={showLines}
          onChange={setShowLines}
          label="Line numbers"
          description="Show line numbers in output"
        />
        <Toggle
          checked={autoProcess}
          onChange={setAutoProcess}
          label="Auto format"
          description="Format automatically as you type"
        />
        <Toggle
          checked={showAnalysis}
          onChange={setShowAnalysis}
          label="Analysis"
          description="Show query analysis panel"
        />

        {/* Sample buttons */}
        <div className="flex items-center gap-1 ml-auto flex-wrap">
          {[
            { key: "select", label: "SELECT + JOINs"  },
            { key: "cte",    label: "CTE + Window"    },
            { key: "insert", label: "INSERT + UPSERT" },
            { key: "window", label: "Window functions"},
            { key: "create", label: "CREATE TABLE"    },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => loadSample(key)}
              className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors whitespace-nowrap ${
                activeSample === key
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "text-blue-600 hover:bg-blue-50 border-blue-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Kbd hint */}
        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↵</kbd>
        </div>
      </div>

      {/* ── Two-panel layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Input */}
        <div className="flex flex-col">
          <PanelHeader
            label="SQL Input"
            meta={inputMeta}
            actions={
              input && (
                <button
                  onClick={handleClear}
                  className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Clear
                </button>
              )
            }
          />
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError(null);
            }}
            placeholder={`Paste SQL to ${mode}...\n\nSupports:\n• SELECT / INSERT / UPDATE / DELETE\n• JOINs (INNER, LEFT, RIGHT, FULL, CROSS)\n• CTEs (WITH ... AS), subqueries\n• Window functions (OVER, PARTITION BY)\n• CASE expressions, aggregate functions\n• CREATE TABLE, ALTER, DROP statements\n• Multi-database: PostgreSQL, MySQL, SQL Server`}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[400px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <PanelHeader
            label={mode === "minify" ? "Minified SQL" : "Formatted SQL"}
            meta={outputMeta}
            actions={
              <>
                {output && <CopyButton text={output} />}
                {output && (
                  <button
                    onClick={() => downloadText(
                      output,
                      mode === "minify" ? "minified.sql" : "formatted.sql",
                      "application/sql"
                    )}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download
                  </button>
                )}
              </>
            }
          />
          <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[400px] relative">
            {output && showLines && mode === "format" && (
              <LineNumbers text={output} />
            )}
            {output ? (
              <textarea
                value={output}
                readOnly
                spellCheck={false}
                className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[400px] text-gray-800 cursor-default select-all whitespace-pre-wrap"
              />
            ) : (
              <div className="flex-1 relative">
                <EmptyOutput mode={mode} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────── */}
      <ErrorBanner message={error} />

      {/* ── Stats ────────────────────────────────────────────── */}
      {stats && mode === "format" && <StatsBar stats={stats} />}

      {/* ── Size comparison ──────────────────────────────────── */}
      {stats && mode === "minify" && (
        <SizeComparison original={input} minified={output} />
      )}

      {/* ── Analysis ─────────────────────────────────────────── */}
      {showAnalysis && input.trim() && (
        <SqlAnalysisPanel sql={output || input} />
      )}

    </div>
  );
}