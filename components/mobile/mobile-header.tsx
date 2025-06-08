"use client"

// Add imports at the top
import { ChevronRight } from "lucide-react"
import Image from "next/image"

// Add breadcrumb prop to the component interface
interface MobileHeaderProps {
  currentTime: Date
  breadcrumbs?: { label: string; path?: string }[]
  onBreadcrumbClick?: (path: string) => void
}

export function MobileHeader({ currentTime, breadcrumbs = [], onBreadcrumbClick }: MobileHeaderProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <header className="bg-black/80 border-b border-cyan-500/50 p-2 flex items-center justify-between">
      <div className="flex items-center">
        <Image
          src="/images/space-billiard-logo.png"
          alt="Space Billiard Logo"
          width={32}
          height={32}
          className="h-8 w-8 mr-2"
          priority
        />
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
            SPACE BILLIARD
          </h1>

          {/* Breadcrumb navigation */}
          {breadcrumbs.length > 0 && (
            <div
              className="flex items-center text-xs text-gray-400 mt-0.5 overflow-x-auto"
              role="navigation"
              aria-label="Breadcrumb"
            >
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <ChevronRight className="h-3 w-3 mx-1 text-gray-500" />}
                  {crumb.path && onBreadcrumbClick ? (
                    <button
                      onClick={() => onBreadcrumbClick(crumb.path!)}
                      className="hover:text-cyan-400 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50 rounded px-1"
                      aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className={index === breadcrumbs.length - 1 ? "text-cyan-400" : ""}>{crumb.label}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="bg-black border border-cyan-500 rounded-md px-2 py-1 shadow-lg shadow-cyan-500/20">
        <span className="text-lg font-mono text-cyan-400">{formatTime(currentTime)}</span>
      </div>
    </header>
  )
}
