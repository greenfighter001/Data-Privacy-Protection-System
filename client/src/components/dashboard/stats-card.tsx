import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { Link } from "wouter";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  linkText?: string;
  linkHref?: string;
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  linkText,
  linkHref
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className={`p-2 rounded-full ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h4 className="text-2xl font-bold">{value}</h4>
          </div>
        </div>
        {linkText && linkHref && (
          <div className="mt-4">
            <Link href={linkHref}>
              <span className="text-sm text-primary hover:underline cursor-pointer">
                {linkText}
              </span>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}