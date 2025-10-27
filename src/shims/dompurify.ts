// Lightweight DOMPurify shim for development server (used in e2e)
// Provides a minimal sanitize implementation compatible with our sanitizer usage.

type Config = {
  ALLOWED_TAGS?: string[];
  ALLOWED_ATTR?: Record<string, string[]>;
  FORBID_TAGS?: string[];
  KEEP_CONTENT?: boolean;
};

const basicSanitize = (input: string, config: Config = {}) => {
  if (!input) return '';
  let out = String(input);

  // Remove dangerous tag blocks entirely
  out = out
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<(object|embed)[\s\S]*?>[\s\S]*?<\/\1>/gi, '');

  // Remove inline event handlers
  out = out.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Neutralize dangerous protocols in href/src
  out = out.replace(/\s(href|src)\s*=\s*(['"]?)(javascript:|data:|vbscript:|file:)/gi, ' $1=$2');

  const allowedTags = Array.isArray(config.ALLOWED_TAGS) ? config.ALLOWED_TAGS.map(t => t.toLowerCase()) : undefined;
  const allowedAttr = config.ALLOWED_ATTR ?? {};

  if (allowedTags) {
    out = out.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (match, tag, attrs) => {
      const isClosing = match.startsWith('</');
      const t = String(tag).toLowerCase();
      if (!allowedTags.includes(t)) {
        return '';
      }
      const permitted = new Set((allowedAttr[t] ?? []).map(a => a.toLowerCase()));
      if (isClosing) return `</${t}>`;
      if (permitted.size === 0) return `<${t}>`;

      const kept: string[] = [];
      const attrRegex = /([a-z0-9:-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
      let m: RegExpExecArray | null;
      while ((m = attrRegex.exec(attrs)) !== null) {
        const name = m[1].toLowerCase();
        if (permitted.has(name)) {
          kept.push(` ${name}=${m[2]}`);
        }
      }
      return `<${t}${kept.join('')}>`;
    });
  }

  // Apply FORBID_TAGS removal (if any survived)
  const forbid = (config.FORBID_TAGS ?? []).map(t => t.toLowerCase());
  if (forbid.length) {
    const f = forbid.join('|');
    out = out.replace(new RegExp(`<\\s*(?:${f})(?:\\s[^>]*)?>`, 'gi'), '')
             .replace(new RegExp(`<\\/\\s*(?:${f})\\s*>`, 'gi'), '');
  }

  // If ALLOWED_TAGS is explicitly [], strip all tags
  if (Array.isArray(config.ALLOWED_TAGS) && config.ALLOWED_TAGS.length === 0) {
    out = out.replace(/<[^>]*>/g, '');
  }

  return out;
};

const DOMPurify = {
  sanitize: basicSanitize,
};

export default DOMPurify;
