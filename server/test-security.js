require('dotenv').config();
const { sanitizeInputs } = require('./src/middleware/security');

const tests = [
  { input: '<script>alert(1)</script>', label: 'script tag' },
  { input: 'javascript:alert(1)', label: 'javascript: URI' },
  { input: '<iframe src="evil"></iframe>', label: 'iframe' },
  { input: '<img src=x onerror=alert(1)>', label: 'img onerror' },
  { input: 'Hello World', label: 'clean string' },
  { input: '1995-03-15T08:30:00Z', label: 'ISO date' },
  { input: '__proto__', label: 'proto pollution key' },
  { input: '\0null byte', label: 'null byte' },
];

tests.forEach(t => {
  const req = { body: { val: t.input }, query: {}, params: {} };
  sanitizeInputs(req, {}, () => {});
  console.log(`  ${t.label.padEnd(22)} ${JSON.stringify(t.input).padEnd(40)} → ${JSON.stringify(req.body.val)}`);
});

console.log('\n✅ XSS sanitizer test complete');
