import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Shield, 
  Lock, 
  Unlock, 
  Settings, 
  Users, 
  Key, 
  Bell
} from "lucide-react";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const NavItem = ({ href, icon, children }: NavItemProps) => {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <li>
      <Link href={href} className="block">
        <div
          className={`flex items-center p-2 rounded-lg ${
            isActive 
              ? "bg-primary text-white" 
              : "text-gray-700 hover:bg-gray-200"
          }`}
        >
          <span className="mr-3">{icon}</span>
          <span>{children}</span>
        </div>
      </Link>
    </li>
  );
};

export function Sidebar() {
  return (
    <div className="w-64 bg-white border-r shadow-sm">
      <div className="p-5 border-b">
        <h2 className="flex items-center text-xl font-semibold">
          <Shield className="h-6 w-6 mr-2 text-primary" />
          Data Privacy
        </h2>
      </div>

      <nav className="p-4">
        <ul className="space-y-2">
          <NavItem href="/" icon={<Shield className="h-5 w-5" />}>
            Dashboard
          </NavItem>
          <NavItem href="/encrypt" icon={<Lock className="h-5 w-5" />}>
            Encrypt
          </NavItem>
          <NavItem href="/decrypt" icon={<Unlock className="h-5 w-5" />}>
            Decrypt
          </NavItem>
          <NavItem href="/keys" icon={<Key className="h-5 w-5" />}>
            Keys
          </NavItem>
          <NavItem href="/users" icon={<Users className="h-5 w-5" />}>
            Users
          </NavItem>
          <NavItem href="/alerts" icon={<Bell className="h-5 w-5" />}>
            Alerts
          </NavItem>
          <NavItem href="/settings" icon={<Settings className="h-5 w-5" />}>
            Settings
          </NavItem>
        </ul>
      </nav>
    </div>
  );
}