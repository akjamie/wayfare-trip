import type { DayRoute, ItineraryStop, RouteLeg, RouteMode } from "./types.js";

export const WALK_KMH = 5;
export const DRIVE_KMH = 30;

export interface Point {
  lat: number;
  lon: number;
}

export function haversineKm(a: Point, b: Point): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function legBetween(fromId: string, from: Point, toId: string, to: Point): RouteLeg {
  const distanceKm = Math.round(haversineKm(from, to) * 10) / 10;
  const mode: RouteMode = distanceKm <= 2 ? "walk" : "drive";
  const speed = mode === "walk" ? WALK_KMH : DRIVE_KMH;
  const durationMin = Math.round((distanceKm / speed) * 60);
  return { from: fromId, to: toId, distanceKm, durationMin, mode };
}

/**
 * Build a day route: hotel → stops (nearest-neighbor) → hotel.
 * With no hotel, keep itinerary order and connect consecutive stops.
 * Zero stops → empty route.
 */
export function buildRoute(
  hotel: { id: string; lat: number; lon: number } | null,
  stops: ItineraryStop[],
): DayRoute {
  if (stops.length === 0) {
    return { legs: [], totalDistanceKm: 0, totalDurationMin: 0 };
  }

  let ordered: ItineraryStop[];
  if (hotel) {
    const remaining = [...stops];
    ordered = [];
    let cur: Point = { lat: hotel.lat, lon: hotel.lon };
    while (remaining.length > 0) {
      let bestIdx = 0;
      let bestDist = haversineKm(cur, remaining[0]);
      for (let i = 1; i < remaining.length; i += 1) {
        const d = haversineKm(cur, remaining[i]);
        if (d < bestDist - 1e-9) {
          bestDist = d;
          bestIdx = i;
        } else if (Math.abs(d - bestDist) <= 1e-9 && remaining[i].id < remaining[bestIdx].id) {
          bestIdx = i;
        }
      }
      const next = remaining.splice(bestIdx, 1)[0];
      ordered.push(next);
      cur = next;
    }
  } else {
    ordered = [...stops];
  }

  const legs: RouteLeg[] = [];
  if (hotel) {
    let prevId = hotel.id;
    let prev: Point = { lat: hotel.lat, lon: hotel.lon };
    for (const s of ordered) {
      legs.push(legBetween(prevId, prev, s.id, s));
      prevId = s.id;
      prev = s;
    }
    legs.push(legBetween(prevId, prev, hotel.id, { lat: hotel.lat, lon: hotel.lon }));
  } else {
    for (let i = 1; i < ordered.length; i += 1) {
      legs.push(legBetween(ordered[i - 1].id, ordered[i - 1], ordered[i].id, ordered[i]));
    }
  }

  const totalDistanceKm = Math.round(legs.reduce((sum, l) => sum + l.distanceKm, 0) * 10) / 10;
  const totalDurationMin = legs.reduce((sum, l) => sum + l.durationMin, 0);
  return { legs, totalDistanceKm, totalDurationMin };
}
