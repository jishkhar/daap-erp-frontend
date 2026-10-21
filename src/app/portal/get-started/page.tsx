import { redirect } from "next/navigation";

/** The old "Get started" page moved to Settings → Setup (opened from the card at the top of Settings → General). Kept so saved links still work. */
export default function GetStartedPage() {
  redirect("/portal/settings/setup");
}
