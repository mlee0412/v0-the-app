import { PageHeader } from "@/components/ui/page-header"
import AddUserForm from "@/components/admin/add-user-form"

export default function UsersPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader title="User Management" description="Add and manage users for Space Billiards" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <AddUserForm />
        </div>
        <div>
          {/* This will be replaced by the existing UserManagement component */}
          <div className="bg-muted/30 rounded-lg p-6 h-full flex items-center justify-center">
            <p className="text-muted-foreground">User list will appear here</p>
          </div>
        </div>
      </div>
    </div>
  )
}
