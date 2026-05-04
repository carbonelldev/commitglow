import { HttpStatusScreen } from "@/components/http-status-screen";
import { getHttpStatusPage } from "@/lib/http-status-pages";

export default function GatewayTimeoutPage() {
  return <HttpStatusScreen page={getHttpStatusPage(504)!} />;
}
