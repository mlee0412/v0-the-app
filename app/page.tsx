import { BilliardsTimerDashboard } from "@/components/billiards-timer-dashboard"
import { SpaceBackgroundAnimation } from "@/components/space-background-animation"

export default function Home() {
  return (
    <main className="min-h-screen">
      <SpaceBackgroundAnimation intensity={1} />
      <BilliardsTimerDashboard />
    </main>
  )
}
