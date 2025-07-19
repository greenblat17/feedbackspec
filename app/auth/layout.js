import { getSEOTags } from "../../libs/seo.js";
import config from "../../config.js";

export const metadata = getSEOTags({
  title: `Sign in | ${config.appName}`,
  description:
    "Sign in to your account to access your dashboard and manage your feedback specifications.",
  canonicalUrlRelative: "/auth",
});

export default function AuthLayout({ children }) {
  return <div className="min-h-screen">{children}</div>;
}
