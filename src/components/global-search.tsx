"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";

export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="w-full max-w-[150px] sm:max-w-xs md:max-w-sm">
      <Input 
        placeholder="Search..." 
        className="h-9 bg-background transition-all" 
        defaultValue={searchParams.get("q") || ""}
        onChange={(e) => {
          const val = e.target.value;
          const params = new URLSearchParams(searchParams.toString());
          if (val) params.set("q", val);
          else params.delete("q");
          router.push(`${pathname}?${params.toString()}`);
        }}
      />
    </div>
  );
}
