import config from "../../config.js";
import { getSEOTags } from "../../libs/seo.js";

export const metadata = getSEOTags({
  title: `Sign-in to ${config.appName}`,
  canonicalUrlRelative: "/auth/signin",
});

export default function Layout({ children }) {
  return <>{children}</>;
}
