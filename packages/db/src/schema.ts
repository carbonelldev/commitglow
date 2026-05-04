import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const planEnum = pgEnum("plan", ["free", "pro", "team"]);
export const organizationRoleEnum = pgEnum("organization_role", ["owner", "admin", "member"]);
export const providerEnum = pgEnum("provider", ["github", "gitlab", "bitbucket", "gitea"]);
export const outputTypeEnum = pgEnum("output_type", ["release_notes", "changelog", "social_post", "email_update", "update_card"]);
export const usageEventTypeEnum = pgEnum("usage_event_type", ["generation", "repo_sync", "export"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  plan: planEnum("plan").notNull().default("free"),
  polarCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    plan: planEnum("plan").notNull().default("free"),
    polarCustomerId: text("stripe_customer_id"),
    isPersonal: boolean("is_personal").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("organizations_slug_unique_idx").on(table.slug),
    index("organizations_owner_id_idx").on(table.ownerId)
  ]
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    role: organizationRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("organization_members_org_user_unique_idx").on(table.organizationId, table.userId),
    index("organization_members_user_id_idx").on(table.userId),
    index("organization_members_organization_id_idx").on(table.organizationId)
  ]
);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => [
    index("projects_user_id_idx").on(table.userId),
    index("projects_organization_id_idx").on(table.organizationId)
  ]
);

export const repositories = pgTable(
  "repositories",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    integrationId: text("integration_id").references(() => integrations.id, { onDelete: "set null" }),
    provider: providerEnum("provider").notNull().default("github"),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    defaultBranch: text("default_branch").notNull().default("main"),
    isPrivate: boolean("is_private").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => [index("repositories_project_id_idx").on(table.projectId), index("repositories_integration_id_idx").on(table.integrationId)]
);

export const repoConnections = pgTable(
  "repo_connections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    provider: providerEnum("provider").notNull().default("github"),
    providerAccountId: text("provider_account_id"),
    providerAccountName: text("provider_account_name"),
    accessTokenRef: text("access_token_ref"),
    scopes: text("scopes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => [
    index("repo_connections_user_id_idx").on(table.userId),
    index("repo_connections_organization_id_idx").on(table.organizationId)
  ]
);

export const commits = pgTable(
  "commits",
  {
    id: text("id").primaryKey(),
    repositoryId: text("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
    sha: text("sha").notNull(),
    message: text("message").notNull(),
    authorName: text("author_name"),
    authorEmail: text("author_email"),
    committedAt: timestamp("committed_at"),
    url: text("url"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (table) => [index("commits_repository_id_idx").on(table.repositoryId)]
);

export const changelogs = pgTable(
  "changelogs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    repositoryId: text("repository_id").references(() => repositories.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    version: text("version"),
    body: text("body").notNull().default(""),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => [index("changelogs_project_id_idx").on(table.projectId)]
);

export const generatedOutputs = pgTable(
  "generated_outputs",
  {
    id: text("id").primaryKey(),
    changelogId: text("changelog_id").references(() => changelogs.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    type: outputTypeEnum("type").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (table) => [index("generated_outputs_project_id_idx").on(table.projectId)]
);

export const integrations = pgTable(
  "integrations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    provider: providerEnum("provider").notNull(),
    providerAccountId: text("provider_account_id"),
    providerAccountName: text("provider_account_name"),
    accessTokenRef: text("access_token_ref"),
    refreshTokenRef: text("refresh_token_ref"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => [
    index("integrations_user_id_idx").on(table.userId),
    index("integrations_organization_id_idx").on(table.organizationId)
  ]
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    type: usageEventTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull().default(1),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (table) => [
    index("usage_events_user_id_idx").on(table.userId),
    index("usage_events_organization_id_idx").on(table.organizationId)
  ]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  ownedOrganizations: many(organizations),
  organizationMemberships: many(organizationMembers),
  integrations: many(integrations),
  usageEvents: many(usageEvents)
}));

export const organizationRelations = relations(organizations, ({ one, many }) => ({
  owner: one(user, { fields: [organizations.ownerId], references: [user.id] }),
  members: many(organizationMembers),
  projects: many(projects),
  usageEvents: many(usageEvents)
}));

export const organizationMemberRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
  user: one(user, { fields: [organizationMembers.userId], references: [user.id] })
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, { fields: [projects.organizationId], references: [organizations.id] }),
  repositories: many(repositories),
  changelogs: many(changelogs),
  generatedOutputs: many(generatedOutputs)
}));
