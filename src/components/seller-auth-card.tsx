'use client';

import Link from 'next/link';
/* import { useRouter } from 'next/navigation'; */
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SellerAuthCardProps {
  title: string;
  description: string;
  buttonText: string;
  footerText: string;
  footerLink: string;
  footerLinkText: string;
  isLogin?: boolean;
}

export function SellerAuthCard({
  title,
  description,
  buttonText,
  footerText,
  footerLink,
  footerLinkText,
  isLogin = false,
}: SellerAuthCardProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* const router = useRouter(); // Handled by AuthContext */
  const { toast } = useToast();

  const { login, register } = useAuth();

  const handleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await login(email, password);
        toast({
          title: 'Login Successful',
          description: 'Redirecting to your dashboard...',
        });
        // Redirect handled in AuthContext or here if needed, but Context has default redirect.
        // For specific pages we might want to override.
      } else {
        await register(email, password);
        toast({
          title: 'Account Created',
          description: 'Welcome! Redirecting to your dashboard...',
        });
      }
    } catch (err) {
      console.error("Auth Error:", err);
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
      toast({
        variant: 'destructive',
        title: isLogin ? 'Login Failed' : 'Sign Up Failed',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        <Button className="w-full" onClick={handleAuth} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {buttonText}
        </Button>
        <div className="mt-4 text-center text-sm">
          {footerText}{' '}
          <Link href={footerLink} className="underline">
            {footerLinkText}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
