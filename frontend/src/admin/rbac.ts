import type { AdminRole, CmsPageStatus } from "./api";

// Keep these lists in sync with backend role guards.
export const MENU_ADMIN_ROLES: AdminRole[] = ["superadmin", "admin", "editor", "publishing_officer", "author"];
export const CONTENT_ADMIN_ROLES: AdminRole[] = ["superadmin", "admin", "editor", "publishing_officer", "author"];
export const ADMIN_ONLY_ROLES: AdminRole[] = ["superadmin", "admin"];

export function isRoleAllowed(role: AdminRole | null | undefined, allowedRoles: readonly AdminRole[]) {
  if (!role) return false;
  return allowedRoles.includes(role);
}

const CMS_WORKFLOW_STATUSES: CmsPageStatus[] = [
  "draft",
  "department_review",
  "editor_review",
  "publishing_review",
  "published"
];

const CMS_ROLE_TRANSITIONS: Partial<Record<AdminRole, Partial<Record<CmsPageStatus, CmsPageStatus[]>>>> = {
  author: {
    draft: ["draft"],
    department_review: ["draft"],
    editor_review: ["draft"],
    publishing_review: ["draft"],
    published: ["draft"]
  },
  department_reviewer: {
    department_review: ["department_review", "editor_review"]
  },
  editor: {
    draft: ["draft", "editor_review", "publishing_review", "published"],
    department_review: ["draft", "editor_review", "publishing_review", "published"],
    editor_review: ["draft", "editor_review", "publishing_review", "published"],
    publishing_review: ["draft", "publishing_review", "published"],
    published: ["draft", "published"]
  },
  publishing_officer: {
    draft: ["draft", "publishing_review", "published"],
    department_review: ["draft", "publishing_review", "published"],
    editor_review: ["draft", "publishing_review", "published"],
    publishing_review: ["draft", "publishing_review", "published"],
    published: ["draft", "published"]
  },
  superadmin: {
    draft: CMS_WORKFLOW_STATUSES,
    department_review: CMS_WORKFLOW_STATUSES,
    editor_review: CMS_WORKFLOW_STATUSES,
    publishing_review: CMS_WORKFLOW_STATUSES,
    published: CMS_WORKFLOW_STATUSES
  }
};

function normalizeWorkflowRole(role: AdminRole | null | undefined): AdminRole {
  if (!role) return "author";
  if (role === "admin") return "superadmin";
  // Normalize any stray casing/spaces/hyphens coming from token/local storage.
  const cleaned = role.replace(/[\s-]+/g, "_").toLowerCase() as AdminRole;
  return cleaned;
}

export function getAllowedCmsWorkflowStatuses(
  role: AdminRole | null | undefined,
  fromStatus: CmsPageStatus | null
): CmsPageStatus[] {
  const normalizedRole = normalizeWorkflowRole(role);

  if (normalizedRole === "superadmin") {
    return CMS_WORKFLOW_STATUSES;
  }

  if (normalizedRole === "author") {
    return ["draft"];
  }

  // Creation rules aligned with backend
  if (!fromStatus) {
    if (normalizedRole === "department_reviewer") return ["department_review"];
    if (normalizedRole === "editor") return ["draft", "editor_review", "publishing_review", "published"];
    if (normalizedRole === "publishing_officer") return ["draft", "publishing_review", "published"];
    return ["draft"];
  }

  const transitions = CMS_ROLE_TRANSITIONS[normalizedRole];
  const allowedTargets = transitions?.[fromStatus] || [];
  const allowedSet = new Set<CmsPageStatus>([fromStatus, ...allowedTargets]);
  return CMS_WORKFLOW_STATUSES.filter((status) => allowedSet.has(status));
}
