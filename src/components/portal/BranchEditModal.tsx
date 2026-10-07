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
import { erp, useErpQuery } from "@/lib/erp";
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
type TeamUser = { id: string; name: string; status: "active" | "disabled" };

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
  const gst = useErpQuery<{ registrations: GstRegistration[] }>(
    canViewGst ? "/api/v1/tenant/gst-registrations" : null,
  );
  const team = useErpQuery<TeamUser[]>(canViewUsers ? "/api/v1/users" : null);
  const [draft, setDraft] = useState<BranchDraft>(() =>
    branch ? branchToDraft(branch) : { ...EMPTY_BRANCH },
  );
  const [errors, setErrors] = useState<BranchErrors>({});
  const [busy, setBusy] = useState(false);

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

  async function save() {
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
    setBusy(true);
    const res = draft.id
      ? await erp(`/api/v1/branches/${draft.id}`, "PATCH", checked.body)
      : await erp("/api/v1/branches", "POST", checked.body);
    if (res.error) {
      setBusy(false);
      return toast.error("Couldn't save the branch", res.error);
    }
    const saved = res.data as BranchRow | null;
    const branchId = draft.id ?? saved?.id;
    const before = branch?.gst_registration_id ?? "";
    if (
      canViewGst &&
      canWrite &&
      branchId &&
      draft.gst_registration_id !== before
    ) {
      const link = await erp(
        `/api/v1/branches/${branchId}/gst-registration`,
        "PUT",
        { gst_registration_id: draft.gst_registration_id || null },
      );
      if (link.error)
        toast.error(
          "Branch saved, but the GST registration wasn't set",
          link.error,
        );
    }
    setBusy(false);
    toast.success(draft.id ? "Branch updated" : "Branch added");
    await refreshStaffSession(); // the branch switcher and every branch dropdown read the stored session
    onSaved(saved);
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
