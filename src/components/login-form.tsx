"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Grid, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required" }),
  role: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "",
    },
  });

  // Pre-fill email based on role selection for the demo
  const handleRoleChange = (value: string) => {
    form.setValue("role", value);
    if (value === "fleet_manager") form.setValue("email", "manager@transitops.dev");
    if (value === "dispatcher") form.setValue("email", "driver@transitops.dev");
    if (value === "safety_officer") form.setValue("email", "safety@transitops.dev");
    if (value === "financial_analyst") form.setValue("email", "finance@transitops.dev");
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid credentials.", {
          description: "Please check your email and password.",
        });
      } else {
        toast.success("Successfully logged in!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      toast.error("An error occurred during sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-muted/30">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-md bg-amber-600/20 flex items-center justify-center text-amber-600 border border-amber-600/30">
              <Grid className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">TransitOps</h1>
          </div>
          <p className="text-muted-foreground font-medium text-lg tracking-wide mb-16">
            Smart Transport Operations Platform
          </p>

          <div className="space-y-4">
            <h2 className="text-xl font-medium mb-6">One login, four roles:</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-600" />
                Fleet Manager
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-600" />
                Dispatcher
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-600" />
                Safety Officer
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-600" />
                Financial Analyst
              </li>
            </ul>
          </div>
        </div>
        
        <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          TRANSITOPS © 2026 • RBAC ENABLED
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex items-center justify-center p-8 bg-[#1a1a1a] text-zinc-100">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Sign in to your account</h1>
            <p className="text-zinc-400">Enter your credentials to continue</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@transitops.dev"
                {...form.register("email")}
                className="bg-[#222222] border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-amber-600"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-400">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...form.register("password")}
                  className="bg-[#222222] border-zinc-800 text-white focus-visible:ring-amber-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-red-400">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">Role (RBAC)</Label>
              <Select onValueChange={handleRoleChange} value={form.watch("role")}>
                <SelectTrigger className="bg-[#222222] border-zinc-800 text-white focus:ring-amber-600">
                  <SelectValue placeholder="Select a role to pre-fill email" />
                </SelectTrigger>
                <SelectContent className="bg-[#222222] border-zinc-800 text-white">
                  <SelectItem value="fleet_manager">Fleet Manager</SelectItem>
                  <SelectItem value="dispatcher">Dispatcher</SelectItem>
                  <SelectItem value="safety_officer">Safety Officer</SelectItem>
                  <SelectItem value="financial_analyst">Financial Analyst</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="remember" className="rounded border-zinc-800 bg-[#222222] text-amber-600 focus:ring-amber-600" />
                <label htmlFor="remember" className="text-sm font-medium text-zinc-300">Remember me</label>
              </div>
              <a href="#" className="text-sm font-medium text-amber-500 hover:text-amber-400">Forgot password?</a>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-6"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* <div className="pt-8">
            <p className="text-sm text-zinc-500 mb-4">Access is scoped by role after login:</p>
            <ul className="text-sm text-zinc-400 space-y-2">
              <li>• Fleet Manager → Fleet, Maintenance</li>
              <li>• Dispatcher → Dashboard, Trips</li>
              <li>• Safety Officer → Drivers, Compliance</li>
              <li>• Financial Analyst → Fuel & Expenses, Analytics</li>
            </ul>
          </div> */}
        </div>
      </div>
    </div>
  );
}
