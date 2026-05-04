import { HttpStatusScreen } from "@/components/http-status-screen";
import { getHttpStatusPage } from "@/lib/http-status-pages";

export default function RequestTimeoutPage() {
  return <HttpStatusScreen page={getHttpStatusPage(408)!} />;
}
