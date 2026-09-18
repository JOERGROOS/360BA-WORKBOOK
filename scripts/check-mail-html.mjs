import assert from 'node:assert/strict';
const { html, escapeHtml } = await import('../lib/mail-html.ts');

assert.equal(escapeHtml('<a href=x>'), '&lt;a href=x&gt;');
assert.ok(html('<a href=x>').includes('&lt;a href=x&gt;'), 'HTML-Injektion wird escaped, nicht ausgeführt');
assert.ok(html('Link: https://example.com/w/abc').includes('<a href="https://example.com/w/abc"'), 'echte URL wird verlinkt');
console.log('ok');
