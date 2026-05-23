import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3-geo';
import { feature } from 'topojson-client';
import { findCountry, normalizeString } from '../utils/countries';
import { X } from 'lucide-react';

interface WorldMapProps {
  guessedIsoCodes: Set<string>;
  showFailureCross: boolean;
  onCountryClick?: (countryName: string) => void;
}

interface MapFeature {
  type: string;
  id: string | number;
  properties: {
    name: string;
  };
  geometry: GeoJSON.Geometry;
}

export default function WorldMap({ guessedIsoCodes, showFailureCross, onCountryClick }: WorldMapProps) {
  const [countries, setCountries] = useState<MapFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });

  // Handle responsive resizing
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // Keep a 16:9 or similar wide aspect ratio
        const height = Math.max(300, width * 0.55);
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Fetch and parse TopoJSON map data
  useEffect(() => {
    const fetchMap = async () => {
      try {
        const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
        if (!res.ok) throw new Error('Failed to fetch map');
        const topology = await res.json();

        // Convert TopoJSON to GeoJSON features
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geojson = feature(topology, topology.objects.countries) as any;
        setCountries(geojson.features);
        setLoading(false);
      } catch (err) {
        console.error('Error loading world map:', err);
        setError(true);
        setLoading(false);
      }
    };

    fetchMap();
  }, []);

  // Define projection and path generator
  // We use Equal Earth projection which is visually pleasant and has equal area mapping
  const projection = d3.geoEqualEarth()
    .scale(dimensions.width / 5.8)
    .translate([dimensions.width / 2, dimensions.height / 1.9]);

  const pathGenerator = d3.geoPath().projection(projection);

  // Helper to check if a map country matches any in our database and gets its status
  const getCountryStatus = (feat: MapFeature) => {
    const mapCountryName = feat.properties.name;
    const matched = findCountry(mapCountryName);

    if (!matched) {
      // Fallback matching logic for custom names in TopoJSON
      let fallbackMatched = null;
      if (normalizeString(mapCountryName).includes("united states")) {
        fallbackMatched = findCountry("United States of America");
      } else if (normalizeString(mapCountryName) === "dem. rep. congo") {
        fallbackMatched = findCountry("Democratic Republic of the Congo");
      } else if (normalizeString(mapCountryName) === "congo") {
        fallbackMatched = findCountry("Republic of the Congo");
      } else if (normalizeString(mapCountryName) === "russia") {
        fallbackMatched = findCountry("Russia");
      }

      if (fallbackMatched) {
        return {
          dbCountry: fallbackMatched,
          isGuessed: guessedIsoCodes.has(fallbackMatched.isoA3)
        };
      }
      return { dbCountry: null, isGuessed: false };
    }

    return {
      dbCountry: matched,
      isGuessed: guessedIsoCodes.has(matched.isoA3)
    };
  };

  if (loading) {
    return (
      <div className="glass-container" style={{
        height: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '24px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(99, 102, 241, 0.2)',
          borderTopColor: 'var(--neon-indigo)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>
          Loading World Map Geo-Data...
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-container" style={{
        height: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '24px',
        color: 'var(--neon-red)'
      }}>
        <X size={48} />
        <p style={{ fontWeight: 600 }}>Failed to load the world map.</p>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Please make sure you are connected to the internet, then refresh the page.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="glass-container" style={{
      position: 'relative',
      padding: '16px',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '350px'
    }}>
      {/* Dynamic failure cross animation over the map */}
      {showFailureCross && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(239, 68, 68, 0.15)',
          zIndex: 10,
          pointerEvents: 'none',
          backdropFilter: 'blur(2px)'
        }}>
          <div className="cross-animation" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '120px',
            height: '120px',
            borderRadius: '30px',
            background: 'var(--neon-red)',
            boxShadow: '0 0 40px var(--neon-red-glow)',
            color: '#ffffff'
          }}>
            <X size={80} strokeWidth={3} />
          </div>
        </div>
      )}

      {/* SVG Canvas Map */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        style={{ pointerEvents: 'auto', background: '#0e1124', borderRadius: '12px' }}
      >
        {/* Ocean Background */}
        <rect
          width={dimensions.width}
          height={dimensions.height}
          className="map-ocean"
        />

        {/* Graticule lines (latitude/longitude grid lines for high-fidelity) */}
        <path
          d={pathGenerator(d3.geoGraticule10()) || undefined}
          className="map-graticule"
        />

        {/* Map Countries */}
        <g>
          {countries.map((feat, idx) => {
            const { dbCountry, isGuessed } = getCountryStatus(feat);
            const pathData = pathGenerator(feat as unknown as GeoJSON.Feature) || '';

            if (!pathData) return null;

            return (
              <path
                key={feat.id || idx}
                d={pathData}
                className={`map-country ${isGuessed ? 'guessed' : ''}`}
                onClick={() => {
                  if (onCountryClick && dbCountry) {
                    onCountryClick(dbCountry.name);
                  }
                }}
              >
                <title>{feat.properties.name}</title>
              </path>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
