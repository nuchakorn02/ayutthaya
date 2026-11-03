export function shouldSendDiscordNotification(eventType, settings) {
  if (!settings.enabled) return false;
  if (eventType === 'import') return settings.notify_on_import !== false;
  if (eventType === 'edit') return settings.notify_on_edit !== false;
  if (eventType === 'delete') return settings.notify_on_delete !== false;
  return true;
}

export function resolveDiscordImportTemplate(configuredTemplate, environmentTemplate) {
  return configuredTemplate ?? environmentTemplate ?? '';
}
