import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import Layout from "@/components/layout/layout";
import UserList from "@/components/user-management/user-list";
import RoleList from "@/components/user-management/role-list";
import AddUserDialog from "@/components/user-management/add-user-dialog";

export default function UserManagementPage() {
  const { user } = useAuth();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // This page is admin-only, redirect non-admin users
  if (user && user.role !== "admin") {
    return <Redirect to="/" />;
  }

  return (
    <Layout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">User Management</h2>
            <p className="mt-1 text-sm text-gray-500">Manage users and their permissions</p>
          </div>
          <div>
            <button 
              type="button" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              onClick={() => setIsAddUserOpen(true)}
            >
              Add New User
            </button>
          </div>
        </div>
        
        {/* User List Component */}
        <UserList />
        
        {/* Role Management Component */}
        <RoleList />
        
        {/* Add User Dialog */}
        <AddUserDialog 
          isOpen={isAddUserOpen} 
          onClose={() => setIsAddUserOpen(false)}
        />
      </div>
    </Layout>
  );
}
