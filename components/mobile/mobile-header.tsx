"use client"
import { EnhancedDigitalClock } from "@/components/enhanced-digital-clock"
import { ConnectionStatus } from "@/components/connection-status"
import Image from "next/image"

interface MobileHeaderProps {
  currentTime?: Date
}

export function MobileHeader({ currentTime }: MobileHeaderProps) {
  return (
    <header className="bg-[#000033] border-b border-[#00FFFF]/30 p-2 flex items-center justify-between space-x-2 sticky top-0 z-10">
      <div className="flex items-center space-x-2">
        <div className="w-10 h-10 relative">
          <Image
            src="/images/space-billiard-logo.png"
            alt="Space Billiard Logo"
            width={40}
            height={40}
            className="rounded-full border border-[#00FFFF]/30 glow-effect-cyan"
          />
        </div>
        <div className="flex flex-col">
          <h1 className="text-[#00FFFF] text-xl font-bold tracking-wider">SPACE</h1>
          <h1 className="text-[#00FFFF] text-xl font-bold tracking-wider">BILLIARD</h1>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <EnhancedDigitalClock currentTime={currentTime} />
        <ConnectionStatus />
      </div>
    </header>
  )
}
