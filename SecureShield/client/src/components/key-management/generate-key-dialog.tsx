import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface GenerateKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// Validation schema for key generation
const keyGenerationSchema = z.object({
  name: z.string().min(1, "Key name is required"),
  algorithm: z.string().min(1, "Algorithm is required"),
});

type KeyGenerationValues = z.infer<typeof keyGenerationSchema>;

export default function GenerateKeyDialog({ isOpen, onClose }: GenerateKeyDialogProps) {
  const { toast } = useToast();
  
  // Setup form
  const form = useForm<KeyGenerationValues>({
    resolver: zodResolver(keyGenerationSchema),
    defaultValues: {
      name: "",
      algorithm: "aes-256-cbc",
    },
  });
  
  // Generate key mutation
  const generateKeyMutation = useMutation({
    mutationFn: async (values: KeyGenerationValues) => {
      const res = await apiRequest("POST", "/api/keys", values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Key generated",
        description: "New encryption key has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate key",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: KeyGenerationValues) => {
    generateKeyMutation.mutate(values);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate New Encryption Key</DialogTitle>
          <DialogDescription>
            Create a new encryption key for securing your data. Choose an algorithm based on your security needs.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter a name for this key" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="algorithm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Encryption Algorithm</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an algorithm" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="aes-256-cbc">AES-256-CBC (Recommended)</SelectItem>
                      <SelectItem value="aes-128-cbc">AES-128-CBC</SelectItem>
                      <SelectItem value="rsa-2048">RSA-2048</SelectItem>
                      <SelectItem value="ecc-p256">ECC-P256</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={generateKeyMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={generateKeyMutation.isPending}
              >
                {generateKeyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    Generating...
                  </>
                ) : (
                  "Generate Key"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
