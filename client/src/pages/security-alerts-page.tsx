
import { Layout } from "@/components/layout/layout";
import SecurityAlerts from "@/components/dashboard/security-alerts";

export default function SecurityAlertsPage() {
  return (
    <Layout>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Security Alerts</h1>
        <SecurityAlerts />
      </div>
    </Layout>
  );
}
