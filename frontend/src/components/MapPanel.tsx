/** Leaflet map panel — district-aggregated public points or per-complaint
 *  staff points. Uses CircleMarkers (no external icon assets required). */
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import type { MapPoint } from '../lib/types';

const PRIORITY_COLOR: Record<string, string> = {
  LOW: '#64748b',
  MEDIUM: '#0ea5e9',
  HIGH: '#f59e0b',
  CRITICAL: '#dc2626',
};

export default function MapPanel({
  points,
  height = 420,
}: {
  points: MapPoint[];
  height?: number;
}) {
  return (
    <div style={{ height }} className="overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={[14.52, 75.73]}
        zoom={7}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p, i) => (
          <CircleMarker
            key={`${p.latitude}-${p.longitude}-${p.complaintId ?? i}-${i}`}
            center={[p.latitude, p.longitude]}
            radius={p.count ? Math.min(24, 8 + (p.count ?? 1) * 2) : 9}
            pathOptions={{
              color: PRIORITY_COLOR[p.priority] ?? '#1b5ff5',
              fillColor: PRIORITY_COLOR[p.priority] ?? '#1b5ff5',
              fillOpacity: 0.45,
              weight: 2,
            }}
          >
            <Tooltip direction="top" opacity={1}>
              <div className="text-xs">
                <strong>{p.district ?? 'Unknown district'}</strong>
                <br />
                {p.complaintId ? (
                  <>
                    {p.complaintId}
                    <br />
                  </>
                ) : null}
                {p.category.replace(/_/g, ' ')} · {p.status.replace(/_/g, ' ')}
                <br />
                {p.count ? `${p.count} complaint${p.count > 1 ? 's' : ''}` : p.priority}
                {p.departmentName ? (
                  <>
                    <br />
                    {p.departmentName}
                  </>
                ) : null}
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
