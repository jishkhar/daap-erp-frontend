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
