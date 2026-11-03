export type DiscordEventType = 'import' | 'edit' | 'delete' | 'test';

export interface DiscordNotificationSettings {
  enabled: boolean;
  notify_on_import?: boolean;
  notify_on_edit?: boolean;
  notify_on_delete?: boolean;
}

export function shouldSendDiscordNotification(
  eventType: DiscordEventType | undefined,
  settings: DiscordNotificationSettings
): boolean;

export function resolveDiscordImportTemplate(
  configuredTemplate: string | undefined,
  environmentTemplate: string | undefined
): string;
