"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can also log the error to an error reporting service
    console.error("Error caught by boundary:", error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900 text-white">
          <div className="max-w-md w-full bg-gray-800 p-6 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h1>
            <div className="bg-gray-900 p-4 rounded mb-4 overflow-auto max-h-[300px]">
              <p className="text-red-300 mb-2">{this.state.error?.toString()}</p>
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-400 hover:text-blue-300">View component stack</summary>
                <pre className="mt-2 text-xs text-gray-400 whitespace-pre-wrap">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
