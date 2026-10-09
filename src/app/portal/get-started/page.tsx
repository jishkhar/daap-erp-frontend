import { redirect } from "next/navigation";

/** The old "Get started" page moved to Settings → Setup. Kept so saved links still work. */
export default function GetStartedPage() {
  redirect("/portal/settings/setup");
}
