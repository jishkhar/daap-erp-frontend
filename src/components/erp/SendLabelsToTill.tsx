"use client";

import { Printer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useBranches } from "@/hooks/useBranches";
import { useSendLabelsToTill } from "@/hooks/useLabels";
import type { Product } from "@/lib/erp";
import { toast } from "@/lib/toast";

const MAX = 10000;

/** "Send labels to till": the label printer is on the till, so the portal asks a branch's till to print this product's labels. The
 * request shows under Barcode Labels on that branch's tills. Serial/IMEI products have no shop label on the till, so no button. */
export function SendLabelsToTill({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const branches = useBranches(open);
  const send = useSendLabelsToTill();
  const tills = (branches.data ?? []).filter(
    (b) => b.status === "active" && b.accepts_pos,
  );
  const [branchId, setBranchId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  if (product.serialization_type !== "NONE") return null;
  const branch = branchId || tills[0]?.id || "";
  const valid =
    !!branch && Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX;

  function submit() {
    send.mutate(
      {
        branch_id: branch,
        note: note.trim() || undefined,
        lines: [{ variant_id: product.id, quantity }],
      },
      {
        onSuccess: () => {
          toast.success(
            `${quantity} label${quantity === 1 ? "" : "s"} sent`,
            "They show under Barcode Labels on that branch's tills.",
          );
          setOpen(false);
          setNote("");
        },
        onError: (e: Error) => toast.error("Couldn't send", e.message),
      },
    );
  }

  return (
    <>
      <Button
        className="mobile-page-action"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        <Printer size={15} /> Send labels to till
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Send labels to till"
        description={`The till at the branch prints ${product.barcode ? `${product.barcode} ` : ""}labels for ${product.name}.`}
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!valid || send.isPending} onClick={submit}>
              {send.isPending ? "Sending…" : "Send"}
            </Button>
          </>
        }
      >
        {branches.isLoading ? (
          <p className="text-[13px] text-ink-400">Loading branches…</p>
        ) : tills.length === 0 ? (
          <p className="text-[13px] text-ink-600">
            No branch sells in store, so there is no till to print on.
          </p>
        ) : (
          <div className="space-y-space-3">
            <Field label="Branch" htmlFor="labels-branch">
              <Select
                id="labels-branch"
                value={branch}
                onValueChange={(value) => setBranchId(value)}
              >
                {tills.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name} ({b.branch_code})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Number of labels" htmlFor="labels-quantity">
              <Input
                id="labels-quantity"
                type="number"
                min={1}
                max={MAX}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.floor(Number(e.target.value)))
                }
                className="w-28"
              />
            </Field>
            <Field
              label="Note for the till (optional)"
              htmlFor="labels-note"
              hint="E.g. which shelf, or why."
            >
              <Input
                id="labels-note"
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}
