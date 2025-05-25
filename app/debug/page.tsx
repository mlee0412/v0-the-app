import { DatabaseConnectionTester } from "@/components/database-connection-tester"

export default function DebugPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Database Debug Tools</h1>
      <DatabaseConnectionTester />
    </div>
  )
}
