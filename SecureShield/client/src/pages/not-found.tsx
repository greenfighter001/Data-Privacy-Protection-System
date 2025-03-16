import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Home, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="p-4 rounded-full bg-primary/10 mb-6">
        <Shield className="h-12 w-12 text-primary" />
      </div>
      
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <h1 className="text-4xl font-bold">404</h1>
      </div>
      
      <h2 className="text-2xl font-bold mb-2 text-center">Page Not Found</h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Sorry, we couldn't find the page you're looking for. It might have been moved,
        deleted, or perhaps never existed.
      </p>
      
      <Link href="/">
        <Button className="gap-2">
          <Home className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}