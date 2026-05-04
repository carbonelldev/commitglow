import { HttpStatusScreen } from "@/components/http-status-screen";
import { getHttpStatusPage } from "@/lib/http-status-pages";

export default function NotFoundPage() {
  return <HttpStatusScreen page={getHttpStatusPage(404)!} />;
}
