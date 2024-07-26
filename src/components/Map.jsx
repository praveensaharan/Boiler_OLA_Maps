import React, { useState, useEffect, useRef } from "react";
import maplibregl from "maplibre-gl"; // Ensure maplibregl is imported
import { Map as MapLibreMap, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import polyline from "@mapbox/polyline";
import axios from "axios";
import AddressAutocomplete from "./AutoAddress";

const MapComponent = () => {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [distance, setDistance] = useState(null);
  const [time, setTime] = useState(null);

  const ApiKey = process.env.OLA_API;
  // Use refs to keep track of markers
  const originMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);

  const handleSelect = (selectedAddress, type) => {
    const { place_id, description } = selectedAddress;

    // Fetch place details to get coordinates
    axios
      .get(`https://api.olamaps.io/places/v1/details`, {
        params: {
          place_id,
          api_key: ApiKey,
        },
      })
      .then((response) => {
        const { lat, lng } = response.data.result.geometry.location;
        if (type === "origin") {
          setOrigin({ description, lat, lng });
        } else {
          setDestination({ description, lat, lng });
        }
      })
      .catch((error) => console.error("Error fetching place details:", error));
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const mapInstance = new MapLibreMap({
      container: mapContainerRef.current,
      center: [78.9629, 20.5937], // Centered over India
      zoom: 3.3,
      style:
        "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json",
      transformRequest: (url, resourceType) => {
        if (!url.includes("?")) {
          url += `?api_key=${ApiKey}`;
        } else {
          url += `&api_key=${ApiKey}`;
        }
        return { url, resourceType };
      },
    });

    const nav = new NavigationControl({
      visualizePitch: true,
    });
    mapInstance.addControl(nav, "top-left");

    setMap(mapInstance);

    return () => mapInstance.remove();
  }, []);

  useEffect(() => {
    if (map && origin && destination) {
      const fetchRoute = async () => {
        try {
          const apiUrl = `https://api.olamaps.io/routing/v1/directions?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&alternatives=false&steps=true&overview=full&language=en&traffic_metadata=false&api_key=${ApiKey}`;

          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              Accept: "application/json",
            },
            body: "",
          });

          const data = await response.json();
          const route = data.routes[0];

          if (route) {
            const distanceInMeters = route.legs[0].distance;
            const durationInSeconds = route.legs[0].duration;
            setDistance(distanceInMeters / 1000); // Convert to kilometers
            setTime(durationInSeconds / 60); // Convert to minutes

            const routeCoordinates = polyline
              .decode(route.overview_polyline)
              .map((coord) => [coord[1], coord[0]]);

            const geojson = {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: routeCoordinates,
              },
            };

            // Remove existing route layer if it exists
            if (map.getLayer("route")) {
              map.removeLayer("route");
              map.removeSource("route");
            }

            // Add new route layer
            map.addSource("route", {
              type: "geojson",
              data: geojson,
            });

            map.addLayer({
              id: "route",
              type: "line",
              source: "route",
              layout: {
                "line-join": "round",
                "line-cap": "round",
              },
              paint: {
                "line-color": "#4585EB",
                "line-width": 5,
              },
            });

            // Remove previous markers if they exist
            if (originMarkerRef.current) {
              originMarkerRef.current.remove();
            }
            if (destinationMarkerRef.current) {
              destinationMarkerRef.current.remove();
            }

            // Add markers for origin and destination
            originMarkerRef.current = new maplibregl.Marker({
              // color: "#00FF00",
              // iconImage: "https://icotar.com/avatar/hello.png",
            }) // Green for origin
              .setLngLat([origin.lng, origin.lat])
              .setPopup(
                new maplibregl.Popup().setText(`Origin: ${origin.description}`)
              )
              .addTo(map);

            destinationMarkerRef.current = new maplibregl.Marker({
              color: "#FF0000",
            }) // Red for destination
              .setLngLat([destination.lng, destination.lat])
              .setPopup(
                new maplibregl.Popup().setText(
                  `Destination: ${destination.description}`
                )
              )
              .addTo(map);

            // Calculate bounds and fit map
            const bounds = new maplibregl.LngLatBounds();
            routeCoordinates.forEach((coord) => {
              bounds.extend(coord);
            });

            // Include markers in bounds calculation
            bounds.extend([origin.lng, origin.lat]);
            bounds.extend([destination.lng, destination.lat]);

            map.fitBounds(bounds, {
              padding: { top: 50, bottom: 50, left: 50, right: 50 },
              maxZoom: 15,
            });
          }
        } catch (error) {
          console.error("Error fetching route:", error);
        }
      };

      fetchRoute();
    }
  }, [map, origin, destination]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-6 text-blue-700">Central Map</h1>
      {/* <p>{olaApiKey}</p> */}
      <div className="w-full max-w-md mx-auto">
        <AddressAutocomplete
          onSelect={(address) => handleSelect(address, "origin")}
        />
        <AddressAutocomplete
          onSelect={(address) => handleSelect(address, "destination")}
        />
      </div>
      {distance && (
        <div className="mt-4 p-4 bg-white border border-gray-300 rounded-lg shadow-md">
          <p className="text-lg font-semibold">
            Total distance between these two locations: {distance.toFixed(2)} km
          </p>
          {time && (
            <p className="text-lg font-semibold">
              Total time between these two locations: {time.toFixed(2)} minutes
            </p>
          )}
        </div>
      )}
      <div
        className="w-full md:w-4/5 lg:w-3/4 h-[80vh] mt-6 border-4 border-gray-300 shadow-lg mb-10"
        ref={mapContainerRef}
        id="central-map"
      />
    </div>
  );
};

export default MapComponent;
