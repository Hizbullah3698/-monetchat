
"use client";

import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
    const { login } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const onSubmit = async (values: any) => {
        setIsLoading(true);
        try {
            await login(values.email, values.password);
            toast({
                title: "Welcome back!",
                description: "You have successfully signed in.",
            });
            router.push("/");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Something went wrong. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container flex h-screen w-screen flex-col items-center justify-center">
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                <div className="flex flex-col space-y-2 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Welcome back
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Enter your email to sign in to your account
                    </p>
                </div>
                <AuthForm type="login" onSubmit={onSubmit} isLoading={isLoading} />
                <p className="px-8 text-center text-sm text-muted-foreground">
                    <Link
                        href="/register"
                        className="hover:text-brand underline underline-offset-4"
                    >
                        Don&apos;t have an account? Sign Up
                    </Link>
                </p>
            </div>
        </div>
    );
}
