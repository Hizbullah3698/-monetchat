
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { Loader2, Phone } from "lucide-react";

const authSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    displayName: z.string().optional(),
    phone: z.string().optional(),
});

type AuthValues = z.infer<typeof authSchema>;

interface AuthFormProps {
    type: "login" | "register";
    onSubmit: (values: AuthValues) => Promise<void>;
    isLoading?: boolean;
}

export function AuthForm({ type, onSubmit, isLoading }: AuthFormProps) {
    const form = useForm<AuthValues>({
        resolver: zodResolver(authSchema),
        defaultValues: {
            email: "",
            password: "",
            displayName: "",
            phone: "",
        },
    });

    return (
        <div className="grid gap-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {type === "register" && (
                        <>
                        <FormField
                            control={form.control}
                            name="displayName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Display Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5" />
                                        Phone Number
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="+965 XXXX XXXX" type="tel" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        </>
                    )}

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="name@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between">
                                    <FormLabel>Password</FormLabel>
                                    {type === "login" && (
                                        <Link
                                            href="/forgot-password"
                                            className="text-sm font-medium text-primary hover:underline"
                                        >
                                            Forgot password?
                                        </Link>
                                    )}
                                </div>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {type === "login" ? "Sign In" : "Create Account"}
                    </Button>
                </form>
            </Form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                    </span>
                </div>
            </div>

            <Button variant="outline" type="button" disabled={isLoading} className="w-full">
                Google (Placeholder)
            </Button>
        </div>
    );
}
