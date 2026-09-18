import { UserRoleType } from "@/db/schema";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  roles: UserRoleType[];
}

export function hasRole(user: SessionUser | null | undefined, role: UserRoleType): boolean {
  if (!user || !user.roles) return false;
  return user.roles.includes(role);
}

export function hasAnyRole(user: SessionUser | null | undefined, roles: UserRoleType[]): boolean {
  if (!user || !user.roles) return false;
  return roles.some((r) => user.roles.includes(r));
}
