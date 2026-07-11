import { z } from 'zod';

/** Max UTF-16 code units for a user CSS snippet (preferences text). */
export const MAX_CSS_SNIPPET_CHARS = 24_000;

/**
 * Controlled CSS snippet contract (Phase D).
 * Default off / empty so official classic look is unchanged.
 */
export const cssSnippetSchema = z.string().max(MAX_CSS_SNIPPET_CHARS);
export type CssSnippet = z.infer<typeof cssSnippetSchema>;

export const cssSnippetEnabledSchema = z.boolean();

export interface CssSnippetValidationResult {
  ok: boolean;
  errors: string[];
  /** Sanitized text safe to inject when ok. */
  sanitized: string;
}

const FORBIDDEN_PATTERNS: Array<{ re: RegExp; message: string }> = [
  { re: /@import\b/i, message: '@import is not allowed in Cardo CSS snippets.' },
  { re: /@namespace\b/i, message: '@namespace is not allowed in Cardo CSS snippets.' },
  { re: /expression\s*\(/i, message: 'CSS expression() is not allowed.' },
  { re: /javascript\s*:/i, message: 'javascript: URLs are not allowed.' },
  { re: /behavior\s*:/i, message: 'IE behavior is not allowed.' },
  { re: /-moz-binding\s*:/i, message: '-moz-binding is not allowed.' },
  {
    re: /url\s*\(\s*['"]?\s*https?:/i,
    message: 'Remote url() resources are not allowed.',
  },
  {
    re: /url\s*\(\s*['"]?\s*\/\//i,
    message: 'Protocol-relative url() resources are not allowed.',
  },
];

/**
 * Validate a user/theme CSS snippet.
 * Best-effort: reject dangerous constructs; require empty or non-empty CSS.
 * Selectors should target under [data-cardo-root] — we wrap injection accordingly.
 */
export function validateCssSnippet(raw: string): CssSnippetValidationResult {
  const sanitized = raw.replace(/\u0000/g, '').trimEnd();
  const errors: string[] = [];

  if (sanitized.length > MAX_CSS_SNIPPET_CHARS) {
    errors.push(`Snippet exceeds ${MAX_CSS_SNIPPET_CHARS} characters.`);
  }

  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.re.test(sanitized)) {
      errors.push(rule.message);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : '',
  };
}

export function wrapCssSnippetForRoot(snippet: string): string {
  const body = snippet.trim();
  if (!body) return '';
  // Scope selectors under the Cardo root so snippets cannot style host chrome outside the app.
  return `/* cardo css snippet */\n${prefixSnippetSelectors(body)}\n`;
}

/**
 * Best-effort: if a rule does not already mention data-cardo-root / data-cardo-theme,
 * prefix the selector list with [data-cardo-root].
 * Full CSS parsing is not attempted; malformed CSS is left to the browser.
 */
function prefixSnippetSelectors(css: string): string {
  // Skip @rules that are not allowed (already rejected) and leave @keyframes as-is if any slipped through.
  return css.replace(/(^|})([^{}@]+)\{/g, (full, brace: string, selectors: string) => {
    const trimmed = selectors.trim();
    if (!trimmed) return full;
    if (/data-cardo-root|data-cardo-theme/.test(trimmed)) {
      return `${brace}${selectors}{`;
    }
    const scoped = trimmed
      .split(',')
      .map((part) => {
        const sel = part.trim();
        if (!sel) return sel;
        if (sel.startsWith(':root') || sel.startsWith('html') || sel.startsWith('body')) {
          return `[data-cardo-root]`;
        }
        return `[data-cardo-root] ${sel}`;
      })
      .filter(Boolean)
      .join(', ');
    return `${brace}\n${scoped} {`;
  });
}
