import Layout from "@/components/layout/layout";
import EncryptionPanel from "@/components/encryption/encryption-panel";
import DecryptionPanel from "@/components/encryption/decryption-panel";
import EncryptionHistory from "@/components/encryption/encryption-history";

export default function EncryptionPage() {
  return (
    <Layout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-gray-900">Encryption / Decryption</h2>
        <p className="mt-1 text-sm text-gray-500">Encrypt or decrypt your data using various algorithms</p>
        
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <EncryptionPanel />
          <DecryptionPanel />
        </div>
        
        <EncryptionHistory />
      </div>
    </Layout>
  );
}
