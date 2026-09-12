import { AppShell } from "@/components/layout/app-shell";

/**
 * COHORT — the entire product lives on this single route.
 * The AppShell switches internal views client-side; the public trial
 * data comes from /api/trials, and all private eligibility computation
 * stays on the device.
 */
export default function Page() {
  return <AppShell />;
}
