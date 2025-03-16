import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Download, Upload, Loader2 } from "lucide-react";

export default function KeyBackupSection() {
  const { toast } = useToast();
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [backupData, setBackupData] = useState("");

  // Backup keys mutation
  const backupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/keys/backup");
      return await res.json();
    },
    onSuccess: (data) => {
      // If browser supports, trigger a download
      try {
        const blob = new Blob([data.backup], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `key-backup-${new Date().toISOString().substring(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to create download:", error);
      }

      toast({
        title: "Backup created",
        description: "Key backup has been generated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Backup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Restore keys mutation
  const restoreMutation = useMutation({
    mutationFn: async (backup: string) => {
      const res = await apiRequest("POST", "/api/keys/restore", { backup });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Restore successful",
        description: `${data.restored} keys have been restored successfully`,
      });
      setIsRestoreDialogOpen(false);
      setBackupData("");
    },
    onError: (error: Error) => {
      toast({
        title: "Restore failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRestore = () => {
    if (!backupData.trim()) {
      toast({
        title: "No backup data",
        description: "Please paste your backup data first",
        variant: "destructive",
      });
      return;
    }
    restoreMutation.mutate(backupData);
  };

  return (
    <>
      <Card className="mt-8 p-6">
        <h3 className="text-lg font-medium text-gray-900">Key Backup & Recovery</h3>
        <p className="mt-1 text-sm text-gray-500">Ensure your keys are securely backed up to prevent data loss</p>
        
        <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Regular key backups are essential. If you lose your keys, you won't be able to decrypt your data.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex space-x-3">
          <Button 
            className="bg-secondary hover:bg-emerald-600"
            onClick={() => backupMutation.mutate()}
            disabled={backupMutation.isPending}
          >
            {backupMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Backup...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Create Backup
              </>
            )}
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsRestoreDialogOpen(true)}
            disabled={restoreMutation.isPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            Restore from Backup
          </Button>
        </div>
      </Card>

      {/* Restore Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Restore Keys from Backup</DialogTitle>
            <DialogDescription>
              Paste your backup data below to restore your encryption keys. This will not overwrite existing keys.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              rows={10}
              placeholder="Paste your backup data here..."
              className="font-mono text-sm"
              value={backupData}
              onChange={(e) => setBackupData(e.target.value)}
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsRestoreDialogOpen(false);
                setBackupData("");
              }}
              disabled={restoreMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRestore}
              disabled={restoreMutation.isPending || !backupData.trim()}
            >
              {restoreMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                "Restore Keys"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
