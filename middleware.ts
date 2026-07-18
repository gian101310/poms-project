import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/kiosk", "/public", "/api/kiosk", "/api/public-sheets", "/api/setup", "/api/cron", "/api/auth/geocheck"];
const STAFF_ONLY_PATHS = ["/dashboard", "/checklist", "/handover", "/attendance", "/performance", "/break"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && !isPublic) {
    const sessionId = request.cookies.get("poms_session_id")?.value;
    const validSession = sessionId
      ? await supabase.from("login_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("profile_id", user.id)
        .is("logout_at", null)
        .maybeSingle()
      : { data: null, error: null };

    if (!sessionId || validSession.error || !validSession.data) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "session");
      const redirect = NextResponse.redirect(url);
      redirect.cookies.delete("poms_session_id");
      return redirect;
    }

    const { data: profile } = await supabase.from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isStaffOnly = STAFF_ONLY_PATHS.some((p) => path === p || path.startsWith(p + "/"));
    if (isStaffOnly && ["manager", "super_admin"].includes(profile?.role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/overview";
      return NextResponse.redirect(url);
    }
  }

  if (user && path === "/login" && request.cookies.get("poms_session_id")?.value) {
    const url = request.nextUrl.clone();
    const { data: profile } = await supabase.from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    url.pathname = ["manager", "super_admin"].includes(profile?.role) ? "/overview" : "/dashboard";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
