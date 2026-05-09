const fs = require('fs');
const path = require('path');

function routeFile(name) {
  return path.join(__dirname, '..', name);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readRouteDefinition(fileName, method, routePath) {
  const source = fs.readFileSync(routeFile(fileName), 'utf8');
  const pattern = new RegExp(`router\\.${method}\\(\\s*['"]${escapeRegExp(routePath)}['"]\\s*,([\\s\\S]*?)\\n\\s*\\}\\);`);
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Route ${method.toUpperCase()} ${routePath} not found in ${fileName}`);
  }
  return match[0];
}

describe('route security classification', () => {
  test.each([
    '/api/nakath',
    '/api/porondam',
    '/api/chat',
    '/api/horoscope',
    '/api/share',
    '/api/rectification',
    '/api/predictions',
    '/api/weekly-lagna',
    '/api/reading',
    '/api/enhanced',
    '/api/jyotish',
  ])('%s is protected by paid app access at mount', (routePrefix) => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'index.js'), 'utf8');
    const pattern = new RegExp(`app\\.use\\(\\s*['"]${escapeRegExp(routePrefix)}['"][^;]*paidAccess`);
    expect(source).toMatch(pattern);
  });

  test.each([
    ['chat.js', 'post', '/ask', ['phoneAuth', 'requireSubscription', 'aiUserLimiter', 'distributedAiUserLimiter', 'budgetGuard']],
    ['horoscope.js', 'post', '/ai-analysis', ['phoneAuth', 'requireSubscription', 'aiUserLimiter']],
    ['horoscope.js', 'post', '/full-report-ai', ['reportLimiter', 'phoneAuth', 'requireSubscription', 'reportUserLimiter', 'distributedReportUserLimiter', 'budgetGuard']],
    ['reading.js', 'post', '/full', ['phoneAuth', 'requireSubscription', 'reportUserLimiter', 'distributedReportUserLimiter', 'budgetGuard']],
    ['porondam.js', 'post', '/report', ['aiLimiter', 'phoneAuth', 'requireSubscription', 'aiUserLimiter', 'distributedAiUserLimiter', 'budgetGuard']],
  ])('%s %s %s includes paid-route middleware', (fileName, method, routePath, middleware) => {
    const routeDefinition = readRouteDefinition(fileName, method, routePath);
    middleware.forEach(name => expect(routeDefinition).toContain(name));
  });

  test.each([
    ['user.js', 'get', '/reports'],
    ['user.js', 'get', '/chats'],
    ['user.js', 'get', '/porondam'],
    ['notifications.js', 'get', '/history'],
    ['notifications.js', 'get', '/unread-count'],
    ['notifications.js', 'get', '/maraka-apala'],
    ['notifications.js', 'post', '/maraka-apala/full'],
    ['notifications.js', 'get', '/today'],
  ])('%s %s %s requires active subscription', (fileName, method, routePath) => {
    const routeDefinition = readRouteDefinition(fileName, method, routePath);
    expect(routeDefinition).toContain('requireSubscription');
  });

  test.each([
    ['pricing.js', 'get', '/live-stats'],
    ['pricing.js', 'get', '/unit-economics'],
    ['pricing.js', 'post', '/persist-stats'],
    ['weeklyLagna.js', 'post', '/generate'],
    ['horoscope.js', 'get', '/prompt-analytics'],
  ])('%s %s %s requires admin', (fileName, method, routePath) => {
    const routeDefinition = readRouteDefinition(fileName, method, routePath);
    expect(routeDefinition).toContain('requireAdmin');
  });

  test('RevenueCat webhook verifies the shared secret', () => {
    const source = fs.readFileSync(routeFile('revenuecat.js'), 'utf8');
    const routeDefinition = readRouteDefinition('revenuecat.js', 'post', '/webhook');
    expect(routeDefinition).toContain('verifyWebhook');
    expect(source).toContain('crypto.timingSafeEqual');
    expect(source).toContain('claimWebhookEvent');
    expect(source).toContain('buildRevenueCatEventId');
  });
});
