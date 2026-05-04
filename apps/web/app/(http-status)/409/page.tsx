import { HttpStatusScreen } from "@/components/http-status-screen";
import { getHttpStatusPage } from "@/lib/http-status-pages";

export default function ConflictPage() {
  return <HttpStatusScreen page={getHttpStatusPage(409)!} />;
}
