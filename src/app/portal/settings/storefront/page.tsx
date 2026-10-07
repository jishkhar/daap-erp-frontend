import { redirect } from "next/navigation";

// Old link: the storefront settings now live under Sales channels.
export default function StorefrontRedirect() {
  redirect("/portal/settings/channels/online");
}
