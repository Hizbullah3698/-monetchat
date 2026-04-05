
"use client";

import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
    const { register } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const onSubmit = async (values: any) => {
        setIsLoading(true);
        try {
            await register(values.email, values.password, values.displayName, values.phone);
            toast({
                title: "Account created!",
                description: "You have successfully registered.",
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
                        Create an account
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Enter your email below to create your account
                    </p>
                </div>
                <AuthForm type="register" onSubmit={onSubmit} isLoading={isLoading} />
                <p className="px-8 text-center text-sm text-muted-foreground">
                    <Link
                        href="/login"
                        className="hover:text-brand underline underline-offset-4"
                    >
                        Already have an account? Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
}
