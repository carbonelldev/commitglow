export type HttpStatusPage = {
  code: number;
  title: string;
  label: string;
  message: string;
  action: string;
};

export const httpStatusPages = [
  {
    code: 400,
    title: "Bad Request",
    label: "Malformed input",
    message: "The request could not be understood. Check the URL or submitted data and try again.",
    action: "Review Request",
  },
  {
    code: 401,
    title: "Unauthorized",
    label: "Sign-in required",
    message: "This page needs an authenticated session before CommitGlow can continue.",
    action: "Sign In",
  },
  {
    code: 402,
    title: "Payment Required",
    label: "Plan gate",
    message: "The requested workflow is reserved for a plan with billing access enabled.",
    action: "View Pricing",
  },
  {
    code: 403,
    title: "Forbidden",
    label: "Access denied",
    message: "Your account does not have permission to open this resource.",
    action: "Go Dashboard",
  },
  {
    code: 404,
    title: "Not Found",
    label: "Route missing",
    message: "The page you requested is not part of this release train.",
    action: "Go Home",
  },
  {
    code: 405,
    title: "Method Not Allowed",
    label: "Wrong method",
    message: "This endpoint exists, but it does not accept the HTTP method used by the request.",
    action: "Go Home",
  },
  {
    code: 408,
    title: "Request Timeout",
    label: "Timed out",
    message: "The request took too long to complete. Refresh the page when your connection is stable.",
    action: "Retry Home",
  },
  {
    code: 409,
    title: "Conflict",
    label: "State mismatch",
    message: "The requested change conflicts with the current workspace or project state.",
    action: "Open Dashboard",
  },
  {
    code: 410,
    title: "Gone",
    label: "Removed",
    message: "This resource used to exist, but it has been removed or retired.",
    action: "Go Home",
  },
  {
    code: 418,
    title: "I'm a Teapot",
    label: "Protocol joke",
    message: "The server refuses to brew coffee. Commit notes are still available.",
    action: "Ship Notes",
  },
  {
    code: 422,
    title: "Unprocessable Content",
    label: "Validation failed",
    message: "The request was readable, but one or more fields could not be processed.",
    action: "Try Again",
  },
  {
    code: 423,
    title: "Locked",
    label: "Resource locked",
    message: "This resource is locked while another operation finishes.",
    action: "Open Dashboard",
  },
  {
    code: 425,
    title: "Too Early",
    label: "Replay unsafe",
    message: "The request arrived before it was safe to process. Try again in a moment.",
    action: "Retry Home",
  },
  {
    code: 429,
    title: "Too Many Requests",
    label: "Rate limited",
    message: "Too many requests arrived in a short window. Pause briefly, then try again.",
    action: "Go Home",
  },
  {
    code: 451,
    title: "Unavailable For Legal Reasons",
    label: "Restricted",
    message: "This resource cannot be served from the current context.",
    action: "Go Home",
  },
  {
    code: 500,
    title: "Internal Server Error",
    label: "Server fault",
    message: "CommitGlow hit an unexpected issue while handling the request.",
    action: "Go Home",
  },
  {
    code: 501,
    title: "Not Implemented",
    label: "Unsupported",
    message: "This server does not support the requested capability yet.",
    action: "Go Home",
  },
  {
    code: 502,
    title: "Bad Gateway",
    label: "Upstream failed",
    message: "An upstream service returned an invalid response before CommitGlow could continue.",
    action: "Go Home",
  },
  {
    code: 503,
    title: "Service Unavailable",
    label: "Temporarily offline",
    message: "The service is temporarily unavailable. Try again after a short cooldown.",
    action: "Go Home",
  },
  {
    code: 504,
    title: "Gateway Timeout",
    label: "Upstream timeout",
    message: "An upstream service took too long to respond.",
    action: "Go Home",
  },
] satisfies HttpStatusPage[];

export function getHttpStatusPage(code: number) {
  return httpStatusPages.find((page) => page.code === code);
}

export function getStatusActionHref(code: number) {
  if (code === 401) {
    return "/auth/sign-in";
  }

  if (code === 402) {
    return "/pricing";
  }

  if ([403, 409, 423].includes(code)) {
    return "/dashboard";
  }

  return "/";
}
