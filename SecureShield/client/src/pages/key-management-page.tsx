import { useState } from "react";
import Layout from "@/components/layout/layout";
import KeyList from "@/components/key-management/key-list";
import GenerateKeyDialog from "@/components/key-management/generate-key-dialog";
import KeyBackupSection from "@/components/key-management/key-backup-section";

export default function KeyManagementPage() {
  const [isGenerateKeyOpen, setIsGenerateKeyOpen] = useState(false);

  return (
    <Layout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Key Management</h2>
            <p className="mt-1 text-sm text-gray-500">Manage your encryption and decryption keys</p>
          </div>
          <div>
            <button 
              type="button" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              onClick={() => setIsGenerateKeyOpen(true)}
            >
              Generate New Key
            </button>
          </div>
        </div>
        
        {/* Key List Component */}
        <KeyList />
        
        {/* Key Backup Section */}
        <KeyBackupSection />
        
        {/* Generate Key Dialog */}
        <GenerateKeyDialog 
          isOpen={isGenerateKeyOpen} 
          onClose={() => setIsGenerateKeyOpen(false)}
        />
      </div>
    </Layout>
  );
}
