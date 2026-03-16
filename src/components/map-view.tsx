"use client";

import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import type { Seller, Coordinates } from "@/lib/types";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

type MapViewProps = {
  sellers: Seller[];
  buyerLocation: Coordinates | null;
  selectedSeller: Seller | null;
};

const UserMarker = () => (
  <div className="relative">
    <div className="absolute w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2"></div>
  </div>
);


export default function MapView({ sellers, buyerLocation, selectedSeller }: MapViewProps) {
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Reading env variables needs to be in a useEffect for client components
    setApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  }, []);

  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

  const mapCenter = selectedSeller?.location || (sellers.length > 0 ? sellers[0].location : buyerLocation) || { lat: 34.0522, lng: -118.2437 };

  if (apiKey === undefined) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted p-8">
        <div className="text-center bg-card p-6 rounded-lg shadow-md border-destructive border-2">
          <p className="font-bold text-destructive text-xl mb-2">Google Maps API Key Missing</p>
          <p className="text-sm text-muted-foreground">
            To display the map, you need to add a Google Maps API Key.
          </p>
          <div className="text-left bg-muted p-4 rounded-md my-4 text-sm">
            <p>1. Go to the <a href="https://console.cloud.google.com/google/maps-apis/overview" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud Console</a> and enable the <strong>Maps JavaScript API</strong>.</p>
            <p className="mt-2">2. Create an API Key and copy it.</p>
            <p className="mt-2">3. Create a file named <code className="bg-background px-1 py-0.5 rounded-sm font-mono text-xs">.env.local</code> in your project&apos;s root folder.</p>
            <p className="mt-2">4. Add your key to the file:</p>
            <pre className="bg-background p-2 rounded-md mt-1 font-mono text-xs overflow-x-auto">
              <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE</code>
            </pre>
          </div>
          <p className="text-xs text-muted-foreground">After adding the key, please restart the application.</p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        zoom={11}
        center={mapCenter}
        mapId={mapId}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
        className="w-full h-full"
        key={JSON.stringify(mapCenter)}
      >
        {buyerLocation && (
          <AdvancedMarker position={buyerLocation} title={"Your Location"}>
            <UserMarker />
          </AdvancedMarker>
        )}
        {sellers.map((seller) => (
          <AdvancedMarker
            key={seller.id}
            position={seller.location}
            title={seller.name}
          >
            <Pin
              background={selectedSeller?.id === seller.id ? "hsl(var(--accent))" : "hsl(var(--primary))"}
              borderColor={selectedSeller?.id === seller.id ? "hsl(var(--accent))" : "hsl(var(--primary))"}
              glyphColor={selectedSeller?.id === seller.id ? "hsl(var(--accent-foreground))" : "hsl(var(--primary-foreground))"}
            >
              <MapPin className="w-4 h-4" />
            </Pin>
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  );
}
