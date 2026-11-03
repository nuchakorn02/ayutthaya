import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveDiscordImportTemplate,
  shouldSendDiscordNotification,
} from './discordNotifications.mjs';

test('honors each Discord notification preference', () => {
  assert.equal(shouldSendDiscordNotification('import', { enabled: true, notify_on_import: false }), false);
  assert.equal(shouldSendDiscordNotification('edit', { enabled: true, notify_on_edit: false }), false);
  assert.equal(shouldSendDiscordNotification('delete', { enabled: true, notify_on_delete: false }), false);
  assert.equal(shouldSendDiscordNotification('import', { enabled: true, notify_on_import: true }), true);
  assert.equal(shouldSendDiscordNotification(undefined, { enabled: true }), true);
});

test('never sends notifications while Discord is disabled', () => {
  assert.equal(shouldSendDiscordNotification('import', { enabled: false }), false);
});

test('uses the configured import template and falls back to the environment value', () => {
  assert.equal(resolveDiscordImportTemplate('configured', 'environment'), 'configured');
  assert.equal(resolveDiscordImportTemplate('', 'environment'), '');
  assert.equal(resolveDiscordImportTemplate(undefined, 'environment'), 'environment');
});
