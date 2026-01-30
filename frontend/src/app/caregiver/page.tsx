import { redirect } from "next/navigation";

/**
 * /caregiver  →  redirect to /caregivers  (the browse/search page)
 *
 * Individual caregiver profiles are at  /caregiver/[id]
 * Caregiver-specific protected pages:
 *   /caregiver/assignments
 *   /caregiver/service-area
 */
export default function CaregiverIndexPage() {
  redirect("/caregivers");
}
