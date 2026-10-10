"use client";

import { useState } from "react";
import { BranchForm } from "@/components/portal/BranchForm";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  branchToDraft,
  EMPTY_BRANCH,
  validateBranch,
  type BranchDraft,
  type BranchErrors,
  type BranchRow,
} from "@/lib/branchSchema";
import { useSaveBranch } from "@/hooks/useBranches";
import { useGstRegistrations } from "@/hooks/useTaxes";
import { useTeamUsers } from "@/hooks/useTeam";
import {
  hasPermission,
  refreshStaffSession,
  useStaffSession,
} from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

export type GstRegistration = {
  id: string;
  gstin: string;
  state_name: string | null;
  state_code: string;
  is_active: boolean;
};

/** Add (branch = null) or edit a branch. Used by the branch list and the branch detail page; calls `onSaved` with the saved branch. */
export function BranchEditModal({
  branch,
  onClose,
  onSaved,
}: {
  branch: BranchRow | null;
  onClose: () => void;
  onSaved: (saved: BranchRow | null) => void;
}) {
  const session = useStaffSession();
  const canWrite = hasPermission(session, "branches", "write");
  const canViewGst = hasPermission(session, "settings", "view");
  const canViewUsers = hasPermission(session, "staff", "view");
  const gst = useGstRegistrations(canViewGst);
  const team = useTeamUsers(canViewUsers);
  const saveBranch = useSaveBranch();
  const [draft, setDraft] = useState<BranchDraft>(() =>
    branch ? branchToDraft(branch) : { ...EMPTY_BRANCH },
  );
  const [errors, setErrors] = useState<BranchErrors>({});
  const busy = saveBranch.isPending;

  const set = (patch: Partial<BranchDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors((cur) => {
      const next = { ...cur };
      for (const k of Object.keys(patch) as (keyof BranchDraft)[])
        delete next[k];
      return next;
    });
  };
  const gstOptions = (gst.data?.registrations ?? [])
    .filter((r) => r.is_active || r.id === draft.gst_registration_id)
    .map((r) => ({
      id: r.id,
      label: `${r.gstin} — ${r.state_name ?? r.state_code}`,
    }));

  function save() {
    const checked = validateBranch(draft, {
      gstRequired: canViewGst && gstOptions.length > 0,
    });
    if (!checked.ok) {
      setErrors(checked.errors);
      return toast.error(
        "Check the highlighted fields",
        "Required fields are marked with *.",
      );
    }
    const before = branch?.gst_registration_id ?? "";
    const relink =
      canViewGst && canWrite && draft.gst_registration_id !== before;
    saveBranch.mutate(
      {
        id: draft.id,
        body: checked.body,
        ...(relink
          ? { gstRegistrationId: draft.gst_registration_id || null }
          : {}),
      },
      {
        onSuccess: async ({ saved, linkError }) => {
          if (linkError)
            toast.error(
              "Branch saved, but the GST registration wasn't set",
              linkError,
            );
          toast.success(draft.id ? "Branch updated" : "Branch added");
          await refreshStaffSession(); // the branch switcher and every branch dropdown read the stored session
          onSaved(saved ?? null);
        },
        onError: (e) => toast.error("Couldn't save the branch", e.message),
      },
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      width="lg"
      title={draft.id ? "Edit branch" : "Add branch"}
      description="Fields marked * are required."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={save}>
            {draft.id ? "Save changes" : "Add branch"}
          </Button>
        </>
      }
    >
      <BranchForm
        draft={draft}
        errors={errors}
        set={set}
        gstOptions={gstOptions}
        gstVisible={canViewGst}
        managers={
          canViewUsers
            ? (team.data ?? [])
                .filter((u) => u.status === "active")
                .map((u) => ({ id: u.id, name: u.name }))
            : null
        }
      />
    </Modal>
  );
}
