import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Sign in | ${config.appName}`,
  description:
    "Sign in to your account to access your dashboard and manage your feedback specifications.",
  canonicalUrlRelative: "/auth",
});

export default function AuthLayout({ children }) {
  return <div className="min-h-screen">{children}</div>;
}
