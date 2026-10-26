import type { Role } from "@prisma/client";

export const STAFF_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "STAFF", "ZONAL_OFFICER"];

const ALL: Role[] = STAFF_ROLES;
const MANAGERS: Role[] = ["SUPER_ADMIN", "ADMIN"];
const OFFICE: Role[] = ["SUPER_ADMIN", "ADMIN", "STAFF"];

/**
 * What each role may do. Zonal officers get lead and submission permissions too, but every query
 * and action they touch is additionally narrowed to their zones (see `src/lib/zones.ts`).
 */
export const PERMISSIONS = {
  "dashboard:view": ALL,
  // Listings: staff prepare drafts; only admins put anything live, remove it or change its sale state.
  "properties:manage": OFFICE,
  "properties:publish": MANAGERS,
  "projects:manage": MANAGERS,
  "catalogue:manage": MANAGERS,
  "zones:manage": MANAGERS,
  "passport:manage": OFFICE,
  "costs:manage": MANAGERS,
  "developers:manage": MANAGERS,
  "plotfit:manage": ["SUPER_ADMIN"],
  // Leads, appointments and purchase requests.
  "leads:manage": ALL,
  "leads:export": MANAGERS,
  "purchases:manage": ALL,
  // Owner submissions: everyone reviews and inspects; admins approve, publish or reject.
  "submissions:review": ALL,
  "submissions:approve": MANAGERS,
  "customers:view": OFFICE,
  "uploads:create": OFFICE,
  "buildtrace:manage": OFFICE,
  "buildtrace:create": MANAGERS,
  "buildtrace:approve": MANAGERS,
  "users:manage": MANAGERS,
  "settings:manage": ["SUPER_ADMIN"],
  "audit:view": MANAGERS,
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission) {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export function isStaff(role: Role) {
  return STAFF_ROLES.includes(role);
}

/** Roles a person may give to team members. Admins manage staff and zonal officers; only Super Admins create admins. */
export function assignableRoles(role: Role): Role[] {
  if (role === "SUPER_ADMIN") return ["SUPER_ADMIN", "ADMIN", "STAFF", "ZONAL_OFFICER"];
  if (role === "ADMIN") return ["STAFF", "ZONAL_OFFICER"];
  return [];
}
