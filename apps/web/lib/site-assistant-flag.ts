/** Kept free of imports so the public shell can read it in server and client bundles alike. */
export const siteAssistantEnabled = (
  environment: Record<string, string | undefined> = process.env,
) => environment.SITE_CHATBOT_ENABLED !== 'false';
