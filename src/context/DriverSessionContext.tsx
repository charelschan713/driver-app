/**
 * DriverSessionContext — authoritative driver identity for the session.
 *
 * Source of truth: GET /driver-app/me (server-enforced, runs inside guard).
 * Set by (app)/_layout.tsx immediately after the role guard passes.
 *
 * Shape mirrors the /driver-app/me response:
 *   driver_id          — UUID of the user/driver
 *   full_name          — display name (e.g. "Charles Chan")
 *   email              — driver's email
 *   phone_country_code — e.g. "+61"
 *   phone_number       — e.g. "400000000"
 *   tenant_id          — active company UUID
 *   membership_status  — e.g. "active"
 *   availability_status — ONLINE | OFFLINE | ON_TRIP
 *
 * Usage:
 *   const driver = useDriverSession();
 *   driver?.full_name    // "Charles Chan"
 *   driver?.email        // "charles@..."
 *   driver?.first_name   // convenience helper (first word of full_name)
 *
 * Why not SecureStore?
 *   SecureStore reads are async and cause flash/jank on screen mount.
 *   Context is synchronous once set — no async reads needed in screens.
 *   The guard already validates freshness from the server on every cold mount.
 *
 * Why remove getStoredUser()?
 *   auth.ts no longer writes the 'user' SecureStore key — the mobile login
 *   endpoint (/auth/mobile/login) returns only access_token, not a user object.
 *   getStoredUser() was returning null for all drivers since Phase 1.
 *   This context replaces it as the single correct identity source.
 */

import React, { createContext, useContext } from 'react';

export interface DriverSession {
  driver_id:          string;
  full_name:          string;
  email:              string;
  phone_country_code: string | null;
  phone_number:       string | null;
  tenant_id:          string;
  membership_status:  string;
  availability_status: string;
  /** Convenience: first word of full_name */
  first_name:         string;
}

const DriverSessionContext = createContext<DriverSession | null>(null);

export function useDriverSession(): DriverSession | null {
  return useContext(DriverSessionContext);
}

interface Props {
  driver: DriverSession | null;
  children: React.ReactNode;
}

export function DriverSessionProvider({ driver, children }: Props) {
  return (
    <DriverSessionContext.Provider value={driver}>
      {children}
    </DriverSessionContext.Provider>
  );
}

/** Normalise raw /driver-app/me response into DriverSession shape. */
export function normalizeDriverSession(raw: any): DriverSession {
  const fullName: string = raw.full_name ?? '';
  return {
    driver_id:           raw.driver_id          ?? '',
    full_name:           fullName,
    email:               raw.email              ?? '',
    phone_country_code:  raw.phone_country_code ?? null,
    phone_number:        raw.phone_number        ?? null,
    tenant_id:           raw.tenant_id           ?? '',
    membership_status:   raw.membership_status   ?? 'active',
    availability_status: raw.availability_status ?? 'OFFLINE',
    first_name:          fullName.split(' ')[0] ?? 'Driver',
  };
}
