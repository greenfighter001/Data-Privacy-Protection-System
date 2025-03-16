import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";

// Define role data
const roles = [
  {
    id: 1,
    name: 'Administrator',
    description: 'Full system access and control',
    users: 1,
    createdAt: 'Jan 10, 2023',
    permissions: [
      'User management',
      'Key management',
      'Encryption/Decryption',
      'System configuration',
      'Audit logs'
    ]
  },
  {
    id: 2,
    name: 'Manager',
    description: 'Can manage users and view reports',
    users: 1,
    createdAt: 'Jan 10, 2023',
    permissions: [
      'Limited user management',
      'Key management',
      'Encryption/Decryption',
      'Audit logs'
    ]
  },
  {
    id: 3,
    name: 'Standard User',
    description: 'Basic encryption and key management',
    users: 2,
    createdAt: 'Jan 10, 2023',
    permissions: [
      'Own key management',
      'Encryption/Decryption',
      'View own audit logs'
    ]
  },
  {
    id: 4,
    name: 'Guest',
    description: 'View-only access to encrypted data',
    users: 0,
    createdAt: 'Mar 15, 2023',
    permissions: [
      'View shared encrypted data',
      'No key management',
      'Limited audit logs'
    ]
  }
];

export default function RoleList() {
  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between px-6">
        <div>
          <CardTitle>Role Management</CardTitle>
          <CardDescription>Configure roles and their associated permissions</CardDescription>
        </div>
        <Button className="bg-accent hover:bg-violet-700">
          Add New Role
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        <div className="border-t border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map(role => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">
                      {role.name}
                    </TableCell>
                    <TableCell>
                      {role.description}
                    </TableCell>
                    <TableCell>
                      {role.users}
                    </TableCell>
                    <TableCell>
                      {role.createdAt}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="mr-3">
                        <PencilIcon className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-900 hover:bg-red-50"
                        disabled={role.name === 'Administrator'} // Prevent deleting the admin role
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
