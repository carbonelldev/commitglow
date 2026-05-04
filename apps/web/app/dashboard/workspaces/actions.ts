export {
  createOrganization as createWorkspace,
  switchOrganization as switchWorkspace,
  getOrganizationLimitState as getWorkspaceLimitState
} from "@/app/dashboard/organizations/actions";

export type { OrganizationFormState as WorkspaceFormState } from "@/app/dashboard/organizations/actions";
