import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Spinner({ className, ...props }: HTMLAttributes<SVGSVGElement>) {
  return <Loader2 className={cn("animate-spin", className)} {...props} />;
}
