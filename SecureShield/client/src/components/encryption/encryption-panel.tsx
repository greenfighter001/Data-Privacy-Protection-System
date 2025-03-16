import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, Copy, Check, Upload, FileUp, Download, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

interface EncryptionKey {
  id: number;
  name: string;
  algorithm: string;
  status: string;
}

export default function EncryptionPanel() {
  const { toast } = useToast();
  const [inputType, setInputType] = useState<string>("text");
  const [algorithm, setAlgorithm] = useState<string>("aes-256-cbc");
  const [keyId, setKeyId] = useState<string>("");
  const [plaintext, setPlaintext] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available keys
  const { data: keys, isLoading: isLoadingKeys } = useQuery<EncryptionKey[]>({
    queryKey: ["/api/keys"],
  });

  // Encrypt mutation
  const encryptMutation = useMutation({
    mutationFn: async ({ keyId, data, resourceName }: { keyId: number, data: string, resourceName?: string }) => {
      const res = await apiRequest("POST", "/api/encrypt", { keyId, data, resourceName });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Encryption failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadProgress(0);
      
      // Read file as text or base64
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };
      
      reader.onload = (e) => {
        // For binary files, we'll use base64 encoding
        const content = e.target?.result as string;
        setFileContent(content);
        setUploadProgress(100);
        
        toast({
          title: "File loaded",
          description: `${selectedFile.name} is ready to encrypt`,
        });
      };
      
      reader.onerror = () => {
        toast({
          title: "File error",
          description: "Could not read the file",
          variant: "destructive",
        });
        setFile(null);
      };
      
      // For text files, read as text, for binary files, read as base64
      const isTextFile = selectedFile.type.startsWith('text/') || 
                        ['application/json', 'application/xml', 'application/javascript'].includes(selectedFile.type);
      
      if (isTextFile) {
        reader.readAsText(selectedFile);
      } else {
        reader.readAsDataURL(selectedFile);
      }
    }
  };

  const handleEncrypt = () => {
    if (inputType === "text") {
      if (!plaintext) {
        toast({
          title: "Input required",
          description: "Please enter text to encrypt",
          variant: "destructive",
        });
        return;
      }
      
      if (!keyId) {
        toast({
          title: "Key required",
          description: "Please select an encryption key",
          variant: "destructive",
        });
        return;
      }
      
      encryptMutation.mutate({
        keyId: parseInt(keyId),
        data: plaintext,
        resourceName: "text"
      });
    } else if (inputType === "file") {
      if (!file || !fileContent) {
        toast({
          title: "File required",
          description: "Please select a file to encrypt",
          variant: "destructive",
        });
        return;
      }
      
      if (!keyId) {
        toast({
          title: "Key required",
          description: "Please select an encryption key",
          variant: "destructive",
        });
        return;
      }
      
      encryptMutation.mutate({
        keyId: parseInt(keyId),
        data: fileContent,
        resourceName: file.name
      });
    }
  };

  const copyToClipboard = () => {
    if (encryptMutation.data?.encrypted) {
      navigator.clipboard.writeText(encryptMutation.data.encrypted);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Encrypted text copied to clipboard",
      });

      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const downloadEncryptedFile = () => {
    if (encryptMutation.data?.encrypted) {
      const blob = new Blob([encryptMutation.data.encrypted], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `encrypted_${file?.name || 'data'}.enc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded",
        description: "Encrypted file has been downloaded",
      });
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium text-gray-900">Encrypt Data</h3>
      <div className="mt-5 space-y-4">
        {/* Input Type Selection */}
        <div>
          <Label>Input Type</Label>
          <div className="mt-2">
            <ToggleGroup type="single" value={inputType} onValueChange={(value) => {
              if (value) {
                setInputType(value);
                // Reset values when switching input types
                if (value === "text") {
                  setFile(null);
                  setFileContent("");
                } else {
                  setPlaintext("");
                }
              }
            }}>
              <ToggleGroupItem value="text" className="flex-1">Text</ToggleGroupItem>
              <ToggleGroupItem value="file" className="flex-1">File</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        
        {/* Algorithm Selection */}
        <div>
          <Label htmlFor="encryption-algorithm">Algorithm</Label>
          <Select value={algorithm} onValueChange={setAlgorithm}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select algorithm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aes-256-cbc">AES-256-CBC</SelectItem>
              <SelectItem value="aes-128-cbc">AES-128-CBC</SelectItem>
              <SelectItem value="rsa-2048">RSA-2048</SelectItem>
              <SelectItem value="ecc-p256">ECC-P256</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Key Selection */}
        <div>
          <Label htmlFor="encryption-key">Encryption Key</Label>
          <Select value={keyId} onValueChange={setKeyId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select key" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingKeys ? (
                <SelectItem value="loading" disabled>Loading keys...</SelectItem>
              ) : keys && keys.length > 0 ? (
                keys
                  .filter(key => key.status === "active")
                  .map(key => (
                    <SelectItem key={key.id} value={key.id.toString()}>
                      {key.name} ({key.algorithm})
                    </SelectItem>
                  ))
              ) : (
                <SelectItem value="none" disabled>No keys available</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        
        {/* Input Area - Text or File depending on selection */}
        {inputType === "text" ? (
          <div>
            <Label htmlFor="plaintext">Plaintext</Label>
            <Textarea
              id="plaintext"
              rows={6}
              className="mt-1"
              placeholder="Enter the text you want to encrypt"
              value={plaintext}
              onChange={(e) => setPlaintext(e.target.value)}
            />
          </div>
        ) : (
          <div>
            <Label htmlFor="file-upload">File Upload</Label>
            <div className="mt-1">
              <input
                type="file"
                id="file-upload"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}>
                {file ? (
                  <div className="space-y-2">
                    <FileText className="h-10 w-10 mx-auto text-primary" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{Math.round(file.size / 1024)} KB</p>
                    </div>
                    {uploadProgress < 100 && (
                      <Progress value={uploadProgress} className="h-2" />
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Click to upload a file</p>
                      <p className="text-xs text-gray-500">or drag and drop</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Encrypt Button */}
        <Button
          className="w-full"
          onClick={handleEncrypt}
          disabled={encryptMutation.isPending || 
                  (inputType === "text" ? !plaintext : !fileContent) || 
                  !keyId}
        >
          {encryptMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Encrypting...
            </>
          ) : (
            <>
              {inputType === "text" ? "Encrypt Text" : "Encrypt File"}
            </>
          )}
        </Button>
        
        {/* Result Area */}
        {encryptMutation.data?.encrypted && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="ciphertext-result">Encryption Result</Label>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="flex items-center"
                >
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  Copy
                </Button>
                {inputType === "file" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadEncryptedFile}
                    className="flex items-center"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                )}
              </div>
            </div>
            <div className="relative">
              <Textarea
                id="ciphertext-result"
                rows={6}
                className="font-mono text-xs"
                readOnly
                value={encryptMutation.data.encrypted}
              />
            </div>
            {inputType === "file" && (
              <p className="text-xs text-gray-500 mt-2">
                Save this encrypted content or download the file. You'll need it for decryption.
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
