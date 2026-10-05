import { redirect } from "next/navigation";

// Growth is listed in the sidebar but disabled for now; anyone landing here directly goes back to the dashboard.
export default function GrowthPage() {
  redirect("/portal/dashboard");
}
