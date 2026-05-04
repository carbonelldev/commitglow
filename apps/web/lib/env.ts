export const env = {
  databaseUrl: process.env.DATABASE_URL,
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  betterAuthUrl: process.env.BETTER_AUTH_URL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
  gitlabClientId: process.env.GITLAB_CLIENT_ID,
  gitlabClientSecret: process.env.GITLAB_CLIENT_SECRET,
  bitbucketApiToken: process.env.BITBUCKET_API_TOKEN,
  polarAccessToken: process.env.POLAR_ACCESS_TOKEN,
  polarWebhookSecret: process.env.POLAR_WEBHOOK_SECRET,
  polarServer: process.env.POLAR_SERVER,
  polarProProductId: process.env.POLAR_PRO_PRODUCT_ID,
  polarTeamProductId: process.env.POLAR_TEAM_PRODUCT_ID,
  aiGatewayApiKey: process.env.AI_GATEWAY_API_KEY
};

export function requireServerEnv(name: keyof typeof env) {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}
