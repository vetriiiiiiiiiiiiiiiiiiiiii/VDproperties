import type { Role } from "@prisma/client";

export const STAFF_ROLES: Role[] = ["SUPER_ADMIN", "PROPERTY_MANAGER", "ENQUIRY_MANAGER", "PROJECT_MANAGER"];

export const PERMISSIONS = {
  "dashboard:view": ["SUPER_ADMIN", "PROPERTY_MANAGER", "ENQUIRY_MANAGER", "PROJECT_MANAGER"],
  "properties:manage": ["SUPER_ADMIN", "PROPERTY_MANAGER"],
  "projects:manage": ["SUPER_ADMIN", "PROPERTY_MANAGER"],
  "catalogue:manage": ["SUPER_ADMIN", "PROPERTY_MANAGER"],
  "passport:manage": ["SUPER_ADMIN", "PROPERTY_MANAGER"],
  "costs:manage": ["SUPER_ADMIN", "PROPERTY_MANAGER"],
  "developers:manage": ["SUPER_ADMIN", "PROPERTY_MANAGER"],
  "plotfit:manage": ["SUPER_ADMIN"],
  "leads:manage": ["SUPER_ADMIN", "ENQUIRY_MANAGER"],
  "leads:export": ["SUPER_ADMIN", "ENQUIRY_MANAGER"],
  "customers:view": ["SUPER_ADMIN", "ENQUIRY_MANAGER", "PROJECT_MANAGER"],
  "uploads:create": ["SUPER_ADMIN", "PROPERTY_MANAGER"],
  "buildtrace:manage": ["SUPER_ADMIN", "PROJECT_MANAGER"],
  "buildtrace:create": ["SUPER_ADMIN"],
  "buildtrace:approve": ["SUPER_ADMIN"],
  "users:manage": ["SUPER_ADMIN"],
  "settings:manage": ["SUPER_ADMIN"],
  "audit:view": ["SUPER_ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission) {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export function isStaff(role: Role) {
  return STAFF_ROLES.includes(role);
}
