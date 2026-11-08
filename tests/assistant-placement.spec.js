import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { sharedBackend, sharedIds } from './shared-backend';

const catalog = JSON.parse(readFileSync(new URL('../src/function-catalog.json', import.meta.url), 'utf8'));
const views = [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 1050 }];
const launcher = page => page.getByRole('button', { name: 'KI-Assistent öffnen', exact: true });

async function filledBackend(page, role = 'admin') {
  const base = await sharedBackend(page, { role });
  const state = { actions: [], writes: [] };
  const items = ['link', 'news', 'contact'].flatMap((kind, group) => [0, 1].map(index => ({
    id: `placement-${kind}-${index}`, kind, title: `${kind === 'link' ? 'Prüfunterlagen' : kind === 'news' ? 'Prüfneuigkeit' : 'Prüfkontakt'} ${index + 1}`,
    body: 'Synthetischer Inhalt für die Prüfung freier Karten und Bedienelemente.', href: '', phone: '', studio_id: sharedIds.studio,
    reader_roles: ['admin', 'studio_manager', 'employee'], published: true, position: group * 2 + index, revision: 1, editable: role === 'admin',
  })));
  await page.route('https://teamhub-test.supabase.co/functions/v1/team-assistant', route => {
    state.actions.push(route.request().postDataJSON().action);
    return route.fulfill({ json: { code: 'assistant_status', mode: 'search', reason: 'model_missing' } });
  });
  await page.route('https://teamhub-test.supabase.co/rest/v1/**', async route => {
    const url = new URL(route.request().url()), name = url.pathname.split('/').at(-1);
    const send = data => route.fulfill({ json: data });
    if (/^(save_|create_|publish_|archive_|mark_)/.test(name)) state.writes.push(name);
    if (name === 'team_access_context') return send({ version: 10,
      pages: ['dashboard', 'tasks', 'calendar', 'learning', 'knowledge', 'chat', 'feedback'],
      capabilities: catalog.filter(c => role === 'admin' || c.roles.includes(role)).map(c => c.key), can_design: false });
    if (name === 'team_home_data') return send({ can_manage: role === 'admin', items });
    if (name === 'my_team_dashboard') return send({ today: '2026-11-08', counts: { open: 1, overdue: 1, today: 0, done: 0 },
      tasks: [{ id: '00000000-0000-4000-8000-000000008881', title: 'Persönliche Prüfaufgabe', status: 'open', studio_id: sharedIds.studio, due_date: '2026-11-07', assignee_id: sharedIds.user }],
      learning: [{ id: '00000000-0000-4000-8000-000000008882', title: 'Persönlicher Prüfkurs', lessons_read: 0, lesson_count: 2, quiz_passed: false }],
      knowledge: [{ id: '00000000-0000-4000-8000-000000008883', title: 'Freigegebene Prüfanleitung', category: 'Studio' }] });
    if (name === 'team_notification_inbox') return send({ items: [], total: 0, unread: 0 });
    return route.fallback();
  });
  return { ...base, state };
}

async function collisions(page) {
  return launcher(page).evaluate(button => {
    const r = button.getBoundingClientRect();
    const overlap = other => Math.min(r.right, other.right, innerWidth) - Math.max(r.left, other.left, 0) > 1
      && Math.min(r.bottom, other.bottom, innerHeight) - Math.max(r.top, other.top, 0) > 1;
    return [...document.querySelectorAll('main .home-function-grid>button,main .home-content-card,main .pilot-stats>button,main .pilot-row,main .team-task-list>button,main .team-pagination button,main input,main select,main textarea,main .button')]
      .filter(el => el.getClientRects().length && overlap(el.getBoundingClientRect()))
      .map(el => el.getAttribute('aria-label') || el.textContent.trim().slice(0, 90));
  });
}

async function unobstructed(locator) {
  return locator.evaluate(el => {
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return x >= 0 && x < innerWidth && y >= 0 && y < innerHeight && !!hit && (hit === el || el.contains(hit));
  });
}

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-11-08T10:00:00Z')); });

for (const role of ['employee', 'studio_manager', 'admin']) for (const view of views) {
  test(`assistant never covers filled dashboard controls: ${role}, ${view.width}px`, async ({ page }) => {
    await page.setViewportSize(view);
    const { state } = await filledBackend(page, role);
    await page.goto('/tests/workspace.html?start=dashboard');
    await expect(page.locator('.home-content-card')).toHaveCount(6);
    await expect(launcher(page)).toBeVisible();
    expect(await unobstructed(launcher(page))).toBe(true);
    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
      await page.evaluate(f => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * f, behavior: 'instant' }), fraction);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      expect(await collisions(page), `overlap at ${fraction * 100}% scroll`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      // A card's right-hand arrow/action is the area previously hidden by the launcher.
      const hitChecks = await page.locator('.home-content-card').evaluateAll(cards => cards.flatMap(card => {
        const action = card.querySelector('.home-card-action'), r = action.getBoundingClientRect();
        const x = Math.min(r.right - 3, innerWidth - 1), y = r.top + r.height / 2;
        const headerBottom = document.querySelector('.team-shell-topbar').getBoundingClientRect().bottom;
        if (y <= headerBottom || y >= innerHeight || x < 0) return [];
        const target = document.elementFromPoint(x, y);
        return [{ title: card.querySelector('h4').textContent, hit: !!target && card.contains(target) }];
      }));
      expect(hitChecks.filter(check => !check.hit)).toEqual([]);
      expect(await unobstructed(page.getByRole('banner').getByRole('button', { name: 'Abmelden', exact: true }))).toBe(true);
    }
    expect((await launcher(page).boundingBox()).height).toBeGreaterThanOrEqual(44);
    await expect(page.locator('.team-online .floating-assistant')).toHaveCount(0);
    if (role === 'admin' && view.width <= 390) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: `test-results/assistant-placement-${view.width}-top.png` });
    }
    expect(state.writes).toEqual([]); expect(state.actions).toEqual([]);
  });
}

test('keyboard reaches the launcher after header actions and both activation keys open source search', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { state } = await filledBackend(page, 'employee');
  await page.goto('/tests/workspace.html?start=dashboard');
  for (const key of ['Enter', 'Space']) {
    await expect(launcher(page)).toBeVisible();
    await page.getByRole('banner').getByRole('button', { name: 'Abmelden', exact: true }).focus();
    await page.keyboard.press('Tab'); await expect(launcher(page)).toBeFocused();
    expect(await unobstructed(launcher(page))).toBe(true);
    await page.keyboard.press(key);
    await expect(page.getByRole('heading', { name: 'Dein KI-Assistent', exact: true })).toBeVisible();
    await expect(launcher(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Menü öffnen', exact: true }).click();
    await page.getByRole('button', { name: 'Meine Übersicht', exact: true }).click();
  }
  expect(state.actions.every(action => action === 'status')).toBe(true);
  expect(state.writes).toEqual([]);
});

for (const view of [{ width: 320, height: 568 }, { width: 740, height: 360 }]) {
  test(`launcher text can grow and wrap in ${view.width}x${view.height}`, async ({ page }) => {
    await page.setViewportSize(view); await filledBackend(page);
    await page.goto('/tests/workspace.html?start=dashboard');
    await expect(launcher(page)).toBeVisible();
    // Stress the new label at twice its normal size without changing app state.
    await launcher(page).evaluate(el => { el.style.fontSize = '24px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await collisions(page)).toEqual([]);
    expect(await unobstructed(launcher(page))).toBe(true);
    expect(await unobstructed(page.getByRole('banner').getByRole('button', { name: 'Abmelden', exact: true }))).toBe(true);
    expect(await unobstructed(page.getByRole('banner').getByRole('button', { name: /Benachrichtigungen:/ }))).toBe(true);
  });
}
