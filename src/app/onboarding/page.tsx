import Link from "next/link";
import { OnboardingForm } from "@/components/onboarding-form";
import { Card } from "@/components/ui/card";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#cffafe_0%,_#ffffff_45%,_#fef3c7_100%)]">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-amber-100 bg-white/85 p-8 shadow-2xl shadow-amber-100/40 backdrop-blur">
          <p className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Seller Application
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-900 sm:text-5xl">
            Launch your store with a guided onboarding flow
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-700">
            Fill your details, we review your request, and once approved you get your own isolated storefront and admin panel.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Card className="border-cyan-100 bg-cyan-50/70 p-4 text-sm">
              <p className="font-semibold text-cyan-800">1. Submit</p>
              <p className="mt-1 text-cyan-900">Send your store profile and contact details.</p>
            </Card>
            <Card className="border-amber-100 bg-amber-50/70 p-4 text-sm">
              <p className="font-semibold text-amber-800">2. Review</p>
              <p className="mt-1 text-amber-900">Admin validates slug, branding, and readiness.</p>
            </Card>
            <Card className="border-emerald-100 bg-emerald-50/70 p-4 text-sm">
              <p className="font-semibold text-emerald-800">3. Go Live</p>
              <p className="mt-1 text-emerald-900">Your store opens at `/store/your-slug`.</p>
            </Card>
          </div>
        </section>

        <OnboardingForm />

        <div className="text-sm text-zinc-600">
          Already approved? Visit{" "}
          <Link href="/" className="font-semibold text-cyan-700 underline">
            landing page
          </Link>{" "}
          and open your store URL.
        </div>
      </div>
    </main>
  );
}
