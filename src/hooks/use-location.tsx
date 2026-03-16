
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Coordinates } from '@/lib/types';
import { useToast } from './use-toast';

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface AddressData {
  address_components: AddressComponent[];
  formatted_address: string;
}

interface LocationContextType {
  location: Coordinates | null;
  error: string | null;
  loading: boolean;
  city: string | null;
  country: string | null;
  isPrompted: boolean;
  requestLocation: () => void;
  setAsPrompted: () => void;
  searchLocationByAddress: (address: string) => Promise<boolean>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [isPrompted, setIsPrompted] = useState(false);
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    setApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null);
    const prompted = sessionStorage.getItem('locationPrompted');
    if (prompted) {
      setIsPrompted(true);
    }
  }, []);

  const setAsPrompted = () => {
    sessionStorage.setItem('locationPrompted', 'true');
    setIsPrompted(true);
  }

  const updateLocationDetails = (coords: Coordinates, addressData: AddressData) => {
    setLocation(coords);

    const addressComponents = addressData.address_components;
    const cityComp = addressComponents.find((c: AddressComponent) => c.types.includes('locality') || c.types.includes('postal_town'));
    const countryComp = addressComponents.find((c: AddressComponent) => c.types.includes('country'));

    setCity(cityComp ? cityComp.long_name : (addressData.formatted_address || ''));
    setCountry(countryComp ? countryComp.short_name : '');
  };

  const fetchCityAndCountry = async (coords: Coordinates) => {
    if (!apiKey) {
      toast({ variant: "destructive", title: "Configuration Error", description: "Google Maps API Key is missing." });
      return;
    }
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${apiKey}`);
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        updateLocationDetails(coords, data.results[0]);
      }
    } catch (e) {
      console.error("Failed to fetch city and country", e);
      toast({
        variant: "destructive",
        title: "Geocoding Error",
        description: "Could not fetch location details.",
      });
    }
  };

  const requestLocation = () => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation.",
      });
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      fetchCityAndCountry(newLocation);
      setLoading(false);
    };

    const onError = (error: GeolocationPositionError) => {
      setError(`Geolocation error: ${error.message}`);
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Geolocation Error",
        description: error.message,
      });
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  };

  const searchLocationByAddress = async (address: string): Promise<boolean> => {
    if (!apiKey) {
      toast({ variant: "destructive", title: "Configuration Error", description: "Google Maps API Key is missing." });
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`);
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        const newLocation = { lat, lng };
        updateLocationDetails(newLocation, data.results[0]);
        setLoading(false);
        return true;
      } else {
        setError(data.error_message || 'Could not find the location. Please try a different search term.');
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Location Not Found",
          description: "Please check your entry and try again.",
        });
        return false;
      }
    } catch (e) {
      console.error("Failed to search location", e);
      setError('An error occurred while searching for the location.');
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Search Error",
        description: "An unexpected error occurred. Please try again later.",
      });
      return false;
    }
  };


  return (
    <LocationContext.Provider value={{ location, error, loading, city, country, requestLocation, isPrompted, setAsPrompted, searchLocationByAddress }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
