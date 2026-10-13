"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpGet, erpSend } from "@/lib/erp";
import { queryKeys } from "@/lib/queryKeys";

export type RoleAssignment = {
  id: string;
  branch_id: string | null;
  role_id: string;
  role_code: string;
  role_name: string;
};

/** A person who can sign in to the portal, with the roles they hold (each for one branch or all). */
export type TeamUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  status: "active" | "disabled";
  last_login_at: string | null;
  roles: RoleAssignment[];
};

export type Role = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  /** "store" = portal pages, "pos" = the till, "organization" = the built-in administrator. */
  category: "store" | "pos" | "organization";
  user_count: number;
  permissions: string[];
};

/** One row of the role editor's grid: the permissions behind each column, plus actions that fit none of them. */
export type CataloguePage = {
  key: string;
  label: string;
  group: string;
  module: string;
  view: string[];
  write: string[];
  delete: string[];
  other: string[];
};

export type RoleCatalogue = {
  categories: ("store" | "pos")[];
  pages: CataloguePage[];
  /** What a till login may hold. */
  pos: string[];
  pos_only: string[];
};

export type RoleInput = {
  name: string;
  description: string | null;
  category?: "store" | "pos";
  permissions: string[];
};

/** Everyone on the team. `enabled: false` (e.g. without permission to see them) fetches nothing. */
export function useTeamUsers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.teamUsers,
    queryFn: () => erpGet<TeamUser[]>("/api/v1/users"),
    enabled,
  });
}

/** The roles and what each can do. */
export function useRoles() {
  return useQuery({
    queryKey: queryKeys.roles,
    queryFn: () => erpGet<Role[]>("/api/v1/roles"),
  });
}

export function useRoleCatalogue() {
  return useQuery({
    queryKey: queryKeys.roleCatalogue,
    queryFn: () => erpGet<RoleCatalogue>("/api/v1/roles/catalogue"),
    staleTime: 10 * 60_000,
  });
}

/** Creating, editing or deleting a role changes the lists of roles and of people (their badges). */
function useRefreshRoles() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.roles }),
      qc.invalidateQueries({ queryKey: queryKeys.team }),
      qc.invalidateQueries({ queryKey: queryKeys.cashiers }),
    ]);
}

export function useCreateRole() {
  const refresh = useRefreshRoles();
  return useMutation({
    mutationFn: (input: RoleInput) =>
      erpSend<Role>("/api/v1/roles", "POST", input),
    onSuccess: refresh,
  });
}

export function useUpdateRole() {
  const refresh = useRefreshRoles();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: Omit<RoleInput, "category"> & { id: string }) =>
      erpSend<Role>(`/api/v1/roles/${id}`, "PATCH", input),
    onSuccess: refresh,
  });
}

export function useDeleteRole() {
  const refresh = useRefreshRoles();
  return useMutation({
    mutationFn: (id: string) => erpSend(`/api/v1/roles/${id}`, "DELETE"),
    onSuccess: refresh,
  });
}

export function useDuplicateRole() {
  const refresh = useRefreshRoles();
  return useMutation({
    mutationFn: (id: string) =>
      erpSend<Role>(`/api/v1/roles/${id}/duplicate`, "POST"),
    onSuccess: refresh,
  });
}

/** A change to a person's access shows in the team list, in each branch's cashiers (who can bill there) and in the managers a branch
 * can pick. */
function useRefreshTeam() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.team }),
      qc.invalidateQueries({ queryKey: queryKeys.cashiers }),
      qc.invalidateQueries({ queryKey: queryKeys.branches }),
    ]);
}

export type NewUser = {
  name: string;
  email: string;
  phone: string | null;
  password: string;
  roles: { role_id: string; branch_id: string | null }[];
};

export function useCreateUser() {
  const refresh = useRefreshTeam();
  return useMutation({
    mutationFn: (input: NewUser) => erpSend("/api/v1/users", "POST", input),
    onSuccess: refresh,
  });
}

/** Give a person a role for one branch (null = all branches). */
export function useGrantRole() {
  const refresh = useRefreshTeam();
  return useMutation({
    mutationFn: (input: {
      userId: string;
      role_id: string;
      branch_id: string | null;
    }) =>
      erpSend(`/api/v1/users/${input.userId}/roles`, "POST", {
        role_id: input.role_id,
        branch_id: input.branch_id,
      }),
    onSuccess: refresh,
  });
}

export function useRemoveRole() {
  const refresh = useRefreshTeam();
  return useMutation({
    mutationFn: (input: { userId: string; assignmentId: string }) =>
      erpSend(
        `/api/v1/users/${input.userId}/roles/${input.assignmentId}`,
        "DELETE",
      ),
    onSuccess: refresh,
  });
}

/** Set a new password; the person is signed out everywhere. */
export function useResetPassword() {
  const refresh = useRefreshTeam();
  return useMutation({
    mutationFn: (input: { userId: string; new_password: string }) =>
      erpSend(`/api/v1/users/${input.userId}/password`, "POST", {
        new_password: input.new_password,
      }),
    onSuccess: refresh,
  });
}

/** Disable a person (signed out everywhere) or re-enable them. */
export function useSetUserStatus() {
  const refresh = useRefreshTeam();
  return useMutation({
    mutationFn: (input: { userId: string; status: "active" | "disabled" }) =>
      erpSend(`/api/v1/users/${input.userId}`, "PATCH", {
        status: input.status,
      }),
    onSuccess: refresh,
  });
}
