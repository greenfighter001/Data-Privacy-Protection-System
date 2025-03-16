import React from "react";
import { Switch, Route } from "wouter";
import { Layout } from "./components/layout/layout";
import { Toaster } from "./components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

// Simple placeholder pages
const DashboardPage = () => (
  <Layout>
    <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
    <p>Welcome to the Data Privacy Protection System</p>
  </Layout>
);

const EncryptPage = () => (
  <Layout>
    <h1 className="text-2xl font-bold mb-4">Encrypt Data</h1>
    <p>Encryption features will be implemented here</p>
  </Layout>
);

const DecryptPage = () => (
  <Layout>
    <h1 className="text-2xl font-bold mb-4">Decrypt Data</h1>
    <p>Decryption features will be implemented here</p>
  </Layout>
);

const KeysPage = () => (
  <Layout>
    <h1 className="text-2xl font-bold mb-4">Key Management</h1>
    <p>Key management will be configured here</p>
  </Layout>
);

const UsersPage = () => (
  <Layout>
    <h1 className="text-2xl font-bold mb-4">User Management</h1>
    <p>User management will be configured here</p>
  </Layout>
);

const AlertsPage = () => (
  <Layout>
    <h1 className="text-2xl font-bold mb-4">Security Alerts</h1>
    <p>Security alerts will be displayed here</p>
  </Layout>
);

const SettingsPage = () => (
  <Layout>
    <h1 className="text-2xl font-bold mb-4">Settings</h1>
    <p>Settings will be configured here</p>
  </Layout>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/encrypt" component={EncryptPage} />
          <Route path="/decrypt" component={DecryptPage} />
          <Route path="/keys" component={KeysPage} />
          <Route path="/users" component={UsersPage} />
          <Route path="/alerts" component={AlertsPage} />
          <Route path="/settings" component={SettingsPage} />
        </Switch>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
import React from "react";
import { Route, Switch } from "wouter";
import DashboardPage from "./pages/dashboard-page";
import AuthPage from "./pages/auth-page";
import EncryptionPage from "./pages/encryption-page";
import AuditPage from "./pages/audit-page";
import UsersPage from "./pages/users-page";
import SettingsPage from "./pages/settings-page";

function App() {
  // Simple auth check - replace with actual auth logic
  const isAuthenticated = true;

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/encryption" component={EncryptionPage} />
      <Route path="/audit" component={AuditPage} />
      <Route path="/users" component={UsersPage} />
      <Route path="/settings" component={SettingsPage} />
    </Switch>
  );
}

export default App;
