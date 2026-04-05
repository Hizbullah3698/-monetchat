
"use client";

import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Search, Loader2 } from 'lucide-react';
import { useLocation } from '@/hooks/use-location';
import { Separator } from './ui/separator';

export default function LocationPrompt() {
  const { location, requestLocation, isPrompted, setAsPrompted, searchLocationByAddress, loading } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [manualLocation, setManualLocation] = useState('');

  useEffect(() => {
    // Only show the prompt if it hasn't been shown before and we don't have a location
    if (!isPrompted && !location) {
      setIsOpen(true);
    }
  }, [isPrompted, location]);

  const handleAllow = () => {
    requestLocation();
    setIsOpen(false);
    setAsPrompted();
  };

  const handleSearch = async () => {
    if (!manualLocation) return;
    const success = await searchLocationByAddress(manualLocation);
    if (success) {
      setIsOpen(false);
      setAsPrompted();
    }
  };

  const handleDeny = () => {
    setIsOpen(false);
    setAsPrompted();
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Share Your Location?
          </AlertDialogTitle>
          <AlertDialogDescription>
            To help you find sellers near you, See & Seek can use your current location or you can enter it manually.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className='space-y-4'>
          <Button onClick={handleAllow} className='w-full' disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
            Use My Current Location
          </Button>

          <div className="flex items-center space-x-2">
            <Separator className='flex-1' />
            <span className='text-xs text-muted-foreground'>OR</span>
            <Separator className='flex-1' />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-location">Enter location manually</Label>
            <div className="flex gap-2">
              <Input
                id="manual-location"
                placeholder="e.g., New York, NY or your ZIP code"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <Button onClick={handleSearch} disabled={loading || !manualLocation} variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="mt-4">
          <Button onClick={handleDeny} variant="outline" disabled={loading}>
            Maybe Later
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
