"use client";

import { useState } from 'react';
import type { Coordinates } from '@/lib/types';

export function useGeolocation() {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const requestLocation = () => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setLoading(false);
    };

    const onError = (error: GeolocationPositionError) => {
      setError(`Geolocation error: ${error.message}`);
      setLoading(false);
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  }

  return { location, error, loading, requestLocation };
}
