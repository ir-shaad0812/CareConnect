import { redirect } from "next/navigation";
import { cookies } from "next/headers";

interface BookingReviewRedirectPageProps {
  params: Promise<{
    id: string;
  }>;
}

function parseRoleFromCookie(value?: string): string | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as {
      role?: string;
    };

    return parsed.role;
  } catch {
    return undefined;
  }
}

function parseRoleFromToken(token?: string): string | undefined {
  if (!token) return undefined;

  try {
    const payload = token.split(".")[1];
    if (!payload) return undefined;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = Buffer.from(padded, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as { role?: string };

    return parsed.role;
  } catch {
    return undefined;
  }
}

export default async function BookingReviewRedirectPage({
  params,
}: BookingReviewRedirectPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("careconnect_user")?.value;
  const accessToken =
    cookieStore.get("accessToken")?.value ||
    cookieStore.get("careconnect_token")?.value;

  const role = parseRoleFromCookie(userCookie) ?? parseRoleFromToken(accessToken);

  if (role === "careseeker") {
    redirect(`/dashboard/careseeker/reviews?bookingId=${encodeURIComponent(id)}`);
  }

  if (role === "caregiver") {
    redirect("/dashboard/caregiver/reviews");
  }

  redirect(`/dashboard/reviews/write?bookingId=${encodeURIComponent(id)}`);
}
