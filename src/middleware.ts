import { NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/", "/login"];
const COOKIE = "hamsaye_session";
const SECRET = process.env.SESSION_SECRET || "hamsaye-dev-secret-change-me";

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [userId, sig] = token.split(".");
  if (!userId || !sig) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(userId));
  const expectedHex = bytesToHex(mac);
  const a = hexToBytes(sig);
  const b = hexToBytes(expectedHex);
  if (!a || !b) return false;
  return timingSafeEqual(a, b);
}

function clearSession(res: NextResponse) {
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/illustrations") ||
    pathname.startsWith("/uploads") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const raw = req.cookies.get(COOKIE)?.value;
  const sessionOk = await isValidSession(raw);
  const isPublic = PUBLIC.includes(pathname);

  if (raw && !sessionOk) {
    if (!isPublic && !pathname.startsWith("/api")) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return clearSession(NextResponse.redirect(url));
    }
    return clearSession(NextResponse.next());
  }

  if (!sessionOk && !isPublic && !pathname.startsWith("/api")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (sessionOk && (pathname === "/login" || pathname === "/")) {
    if (req.nextUrl.searchParams.get("force") === "1") {
      return clearSession(NextResponse.next());
    }
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
