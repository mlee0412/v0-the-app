import { Suspense } from "react"
import { UserManagement } from "@/components/admin/user-management"
import { UserManagementSkeleton } from "@/components/admin/user-management-skeleton"
import { PageHeader } from "@/components/ui/page-header"

export default function UsersPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title="User Management" description="Manage users and their permissions" />

      <Suspense fallback={<UserManagementSkeleton />}>
        <UserManagement />
      </Suspense>
    </div>
  )
}
