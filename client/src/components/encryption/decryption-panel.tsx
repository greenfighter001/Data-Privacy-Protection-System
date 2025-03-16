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

export default function DecryptionPanel() {
  const { toast } = useToast();
  const [inputType, setInputType] = useState<string>("text");
  const [algorithm, setAlgorithm] = useState<string>("aes-256-cbc");
  const [keyId, setKeyId] = useState<string>("");
  const [ciphertext, setCiphertext] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [originalFileName, setOriginalFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available keys
  const { data: keys, isLoading: isLoadingKeys } = useQuery<EncryptionKey[]>({
    queryKey: ["/api/keys"],
  });

  // Decrypt mutation
  const decryptMutation = useMutation({
    mutationFn: async ({ keyId, data, resourceName }: { keyId: number, data: string, resourceName?: string }) => {
      const res = await apiRequest("POST", "/api/decrypt", { keyId, data, resourceName });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Decryption failed",
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
      
      // Extract original file name from encrypted_filename.enc
      if (selectedFile.name.startsWith('encrypted_') && selectedFile.name.endsWith('.enc')) {
        const fileName = selectedFile.name.substring(10, selectedFile.name.length - 4);
        setOriginalFileName(fileName);
      } else {
        setOriginalFileName(selectedFile.name);
      }
      
      // Read file content
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // Handle text files directly
        if (selectedFile.type.startsWith('text/') || selectedFile.name.endsWith('.enc')) {
          setFileContent(content);
          setCiphertext(content); // For backward compatibility with text mode
        } else {
          setFileContent(content);
        }
        setUploadProgress(100);
        
        toast({
          title: "File loaded",
          description: `${selectedFile.name} is ready to decrypt`,
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
      
      // Assume encrypted files are text files
      reader.readAsText(selectedFile);
    }
  };

  const handleDecrypt = () => {
    if (inputType === "text") {
      if (!ciphertext) {
        toast({
          title: "Input required",
          description: "Please enter text to decrypt",
          variant: "destructive",
        });
        return;
      }
      
      if (!keyId) {
        toast({
          title: "Key required",
          description: "Please select a decryption key",
          variant: "destructive",
        });
        return;
      }
      
      decryptMutation.mutate({
        keyId: parseInt(keyId),
        data: ciphertext,
        resourceName: "text"
      });
    } else if (inputType === "file") {
      if (!file || !fileContent) {
        toast({
          title: "File required",
          description: "Please select a file to decrypt",
          variant: "destructive",
        });
        return;
      }
      
      if (!keyId) {
        toast({
          title: "Key required",
          description: "Please select a decryption key",
          variant: "destructive",
        });
        return;
      }
      
      decryptMutation.mutate({
        keyId: parseInt(keyId),
        data: fileContent,
        resourceName: originalFileName || file.name
      });
    }
  };

  const copyToClipboard = () => {
    if (decryptMutation.data?.decrypted) {
      navigator.clipboard.writeText(decryptMutation.data.decrypted);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Decrypted text copied to clipboard",
      });

      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const downloadDecryptedFile = () => {
    if (decryptMutation.data?.decrypted) {
      // Try to determine if result is base64 data
      let isBase64 = false;
      let mimeType = 'text/plain';
      let fileName = originalFileName || 'decrypted_file';
      
      // Check if the content is likely base64 with data URL (starts with data:)
      if (decryptMutation.data.decrypted.startsWith('data:')) {
        isBase64 = true;
        const matches = decryptMutation.data.decrypted.match(/^data:([^;]+);base64,/);
        if (matches && matches.length > 1) {
          mimeType = matches[1];
          // Choose appropriate file extension based on mime type
          const ext = mimeType.split('/')[1] || 'bin';
          fileName = `${fileName.split('.')[0]}.${ext}`;
        }
      }
      
      // Create blob from appropriate source
      let blob;
      if (isBase64) {
        // Extract base64 data part
        const base64Data = decryptMutation.data.decrypted.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: mimeType });
      } else {
        // Normal text content
        blob = new Blob([decryptMutation.data.decrypted], { type: 'text/plain' });
        fileName = fileName.includes('.') ? fileName : `${fileName}.txt`;
      }
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded",
        description: "Decrypted file has been downloaded",
      });
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium text-gray-900">Decrypt Data</h3>
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
                  setCiphertext("");
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
          <Label htmlFor="decryption-algorithm">Algorithm</Label>
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
          <Label htmlFor="decryption-key">Decryption Key</Label>
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
            <Label htmlFor="ciphertext">Ciphertext</Label>
            <Textarea
              id="ciphertext"
              rows={6}
              className="mt-1 font-mono"
              placeholder="Enter the encrypted text you want to decrypt"
              value={ciphertext}
              onChange={(e) => setCiphertext(e.target.value)}
            />
          </div>
        ) : (
          <div>
            <Label htmlFor="encrypted-file-upload">Encrypted File</Label>
            <div className="mt-1">
              <input
                type="file"
                id="encrypted-file-upload"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-secondary transition-colors"
                onClick={() => fileInputRef.current?.click()}>
                {file ? (
                  <div className="space-y-2">
                    <FileText className="h-10 w-10 mx-auto text-secondary" />
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
                      <p className="text-sm font-medium text-gray-900">Click to upload an encrypted file</p>
                      <p className="text-xs text-gray-500">or drag and drop</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Decrypt Button */}
        <Button
          className="w-full bg-secondary hover:bg-emerald-600"
          onClick={handleDecrypt}
          disabled={decryptMutation.isPending || 
                  (inputType === "text" ? !ciphertext : !fileContent) || 
                  !keyId}
        >
          {decryptMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Decrypting...
            </>
          ) : (
            <>
              {inputType === "text" ? "Decrypt Text" : "Decrypt File"}
            </>
          )}
        </Button>
        
        {/* Result Area */}
        {decryptMutation.data?.decrypted && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="plaintext-result">Decryption Result</Label>
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
                    onClick={downloadDecryptedFile}
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
                id="plaintext-result"
                rows={6}
                className={`${decryptMutation.data.decrypted.startsWith('data:') ? 'text-xs font-mono' : ''}`}
                readOnly
                value={decryptMutation.data.decrypted.startsWith('data:') ? 
                  'Binary file content (base64 encoded). Click download to save.' : 
                  decryptMutation.data.decrypted}
              />
            </div>
            {inputType === "file" && (
              <p className="text-xs text-gray-500 mt-2">
                {file && originalFileName ? `Original filename: ${originalFileName}` : ''}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
