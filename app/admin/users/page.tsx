import { Suspense } from "react";
import { SupabaseUserManagement } from "@/components/admin/supabase-user-management"; // Changed import
import { UserManagementSkeleton } from "@/components/admin/user-management-skeleton";
import { PageHeader } from "@/components/ui/page-header";

export default function UsersPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="User Management (Staff)" // Clarified title
        description="Manage staff members and their permissions"
      />

      <Suspense fallback={<UserManagementSkeleton />}>
        <SupabaseUserManagement /> {/* Use the correct component */}
      </Suspense>
    </div>
  );
}
