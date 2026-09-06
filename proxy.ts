import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Runs before every matched request: refreshes the Supabase session cookie and
 * guards `/dashboard` and `/send-receipt` (redirect to `/login` when signed
 * out), and bounces signed-in users away from `/login`.
 *
 * (`proxy` is the Next 16 replacement for the deprecated `middleware` file.)
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match everything except:
     * - _next/static, _next/image (build assets)
     * - favicon.ico, and files with an extension (images, fonts, etc.)
     * API routes handle their own auth and return JSON 401s, so skip them here.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)",
  ],
};
