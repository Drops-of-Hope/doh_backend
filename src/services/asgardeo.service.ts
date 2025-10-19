// src/services/asgardeo.service.ts
// Minimal service to interact with Asgardeo Management and SCIM APIs

const ASGARDEO_ORG = process.env.ASGARDEO_ORG || "dropsofhope";
const ASGARDEO_TOKEN_URL = process.env.ASGARDEO_TOKEN_URL || `https://api.asgardeo.io/t/${ASGARDEO_ORG}/oauth2/token`;
const ASGARDEO_SCIM_BASE = process.env.ASGARDEO_SCIM_BASE || `https://api.asgardeo.io/t/${ASGARDEO_ORG}/scim2`;
const ASGARDEO_ADMIN_BASE = process.env.ASGARDEO_ADMIN_BASE || `https://api.asgardeo.io/t/${ASGARDEO_ORG}/api/server/v1`;

const ASGARDEO_CLIENT_ID = process.env.ASGARDEO_CLIENT_ID || "";
const ASGARDEO_CLIENT_SECRET = process.env.ASGARDEO_CLIENT_SECRET || "";

export interface AsgardeoRole {
  id: string;
  name?: string;
  displayName?: string;
}

type JsonValue = unknown;
async function httpJson(url: string, init: RequestInit): Promise<JsonValue> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: JsonValue = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    // ignore JSON parse errors; keep raw text
    data = text;
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${res.statusText}`) as Error & { status?: number; data?: JsonValue };
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const AsgardeoService = {
  // Obtain a management API token using client_credentials
  getManagementAccessToken: async (scope: string = "internal_user_mgt_update") => {
    if (!ASGARDEO_CLIENT_ID || !ASGARDEO_CLIENT_SECRET) {
      throw new Error("Asgardeo credentials are not configured (ASGARDEO_CLIENT_ID/ASGARDEO_CLIENT_SECRET)");
    }
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      scope,
    });
    const basic = Buffer.from(`${ASGARDEO_CLIENT_ID}:${ASGARDEO_CLIENT_SECRET}`).toString("base64");
    const data = (await httpJson(ASGARDEO_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    })) as { access_token?: string } | JsonValue;
    if (data && typeof data === "object" && "access_token" in data) {
      return (data as { access_token: string }).access_token;
    }
    throw new Error("Failed to obtain Asgardeo management token");
  },

  // Fetch SCIM user to inspect roles/groups
  getScimUser: async (userId: string, mgmtToken: string) => {
    return await httpJson(`${ASGARDEO_SCIM_BASE}/Users/${encodeURIComponent(userId)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${mgmtToken}` },
    });
  },

  // Try to find role ID by role name using SCIM Roles (v2), Admin Roles API, then SCIM Groups
  findRoleOrGroupId: async (roleName: string, mgmtToken: string): Promise<{ id: string; kind: "role" | "group" }> => {
    console.log(`🔍 Searching for role/group: "${roleName}"`);
    
    // Strip "Internal/" prefix if present (Asgardeo stores as "CampaignOrg" but returns as "Internal/CampaignOrg")
    const baseRoleName = roleName.replace(/^Internal\//, "");
    console.log(`🔍 Base role name (without Internal/ prefix): "${baseRoleName}"`);
    
    // 1) Try SCIM2 Roles endpoint first (most reliable for application roles)
    try {
      const url = `${ASGARDEO_SCIM_BASE}/v2/Roles?filter=${encodeURIComponent(`displayName eq \"${baseRoleName}\"`)}`;
      console.log(`📡 SCIM2 Roles API URL: ${url}`);
      const data = (await httpJson(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${mgmtToken}` },
      })) as JsonValue;
      console.log(`📦 SCIM2 Roles API response:`, JSON.stringify(data, null, 2));
      
      const resources = ((): Array<Record<string, unknown>> => {
        if (data && typeof data === "object") {
          const maybe = (data as Record<string, unknown>)["Resources"];
          if (Array.isArray(maybe)) return maybe as Array<Record<string, unknown>>;
        }
        return [];
      })();
      
      console.log(`📋 Found ${resources.length} roles via SCIM2 Roles API`);
      if (resources.length > 0) {
        console.log(`📋 Available roles:`, resources.map(r => ({ displayName: r.displayName, id: r.id })));
      }
      
      const match = resources.find((r) => r?.displayName === baseRoleName);
      if (match && ("id" in match) && typeof match.id === "string") {
        console.log(`✅ Found role via SCIM2 Roles API:`, { id: match.id, displayName: match.displayName });
        return { id: match.id, kind: "role" };
      }
    } catch (err) {
      console.warn(`⚠️ SCIM2 Roles API failed:`, err instanceof Error ? err.message : err);
      // ignore and try next method
    }

    // 2) Try Admin roles API (v1) - search with both formats
    try {
      const url = `${ASGARDEO_ADMIN_BASE}/roles?filter=${encodeURIComponent(`displayName eq \"${baseRoleName}\" or name eq \"${baseRoleName}\"`)}`;
      console.log(`📡 Admin Roles API URL: ${url}`);
      const data = (await httpJson(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${mgmtToken}` },
      })) as JsonValue;
      console.log(`📦 Admin Roles API response:`, JSON.stringify(data, null, 2));
      
      const items = ((): Array<Record<string, unknown>> => {
        if (data && typeof data === "object") {
          const maybe = (data as Record<string, unknown>)["Resources"];
          if (Array.isArray(maybe)) return maybe as Array<Record<string, unknown>>;
          const r1 = (data as Record<string, unknown>)["resources"];
          if (Array.isArray(r1)) return r1 as Array<Record<string, unknown>>;
        }
        return [];
      })();
      
      console.log(`📋 Found ${items.length} roles via Admin API`);
      if (items.length > 0) {
        console.log(`📋 Available roles:`, items.map(r => ({ name: r.name, displayName: r.displayName, id: r.id })));
      }
      
      const match = items.find((r) => 
        r?.name === baseRoleName || r?.displayName === baseRoleName
      );
      if (match && ("id" in match) && typeof match.id === "string") {
        console.log(`✅ Found role via Admin API:`, { id: match.id, name: match.name, displayName: match.displayName });
        return { id: match.id, kind: "role" };
      }
    } catch (err) {
      console.warn(`⚠️ Admin Roles API failed:`, err instanceof Error ? err.message : err);
      // ignore and try groups
    }

    // 2) SCIM Groups API - try both with and without prefix
    try {
      const url = `${ASGARDEO_SCIM_BASE}/Groups?filter=${encodeURIComponent(`displayName eq \"${baseRoleName}\" or displayName eq \"${roleName}\"`)}`;
      console.log(`📡 SCIM Groups API URL: ${url}`);
      const data = (await httpJson(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${mgmtToken}` },
      })) as JsonValue;
      console.log(`📦 SCIM Groups API response:`, JSON.stringify(data, null, 2));
      const resources = ((): Array<Record<string, unknown>> => {
        if (data && typeof data === "object") {
          const maybe = (data as Record<string, unknown>)["Resources"];
          if (Array.isArray(maybe)) return maybe as Array<Record<string, unknown>>;
        }
        return [];
      })();
      console.log(`📋 Found ${resources.length} groups via SCIM API`);
      if (resources.length > 0) {
        console.log(`📋 Available groups:`, resources.map(g => ({ displayName: g.displayName, id: g.id })));
      }
      // Try matching with or without prefix
      const match = resources.find((g) => g?.displayName === roleName || g?.displayName === baseRoleName);
      if (match && ("id" in match) && typeof match.id === "string") {
        console.log(`✅ Found group via SCIM API:`, { id: match.id, displayName: match.displayName });
        return { id: match.id, kind: "group" };
      }
    } catch (err) {
      console.warn(`⚠️ SCIM Groups API failed:`, err instanceof Error ? err.message : err);
      // ignore
    }

    console.error(`❌ Unable to resolve role/group id for "${roleName}" or "${baseRoleName}"`);
    throw new Error(`Unable to resolve role/group id for ${roleName}`);
  },

  // Assign role to user (via SCIM2 v2 Roles endpoint - add user to role's users array)
  assignCampaignOrganizer: async (userId: string, mgmtToken: string, roleName = "Internal/CampaignOrg") => {
    const found = await AsgardeoService.findRoleOrGroupId(roleName, mgmtToken);

    if (found.kind === "role") {
      // For SCIM2 v2 Roles: PATCH the role to add the user to its users array
      console.log(`📝 Adding user ${userId} to role ${found.id} via SCIM2 v2/Roles PATCH`);
      const payload: Record<string, unknown> = {
        Operations: [
          {
            op: "add",
            path: "users",
            value: [
              {
                value: userId,
              },
            ],
          },
        ],
        schemas: [
          "urn:ietf:params:scim:api:messages:2.0:PatchOp",
        ],
      };
      await httpJson(`${ASGARDEO_SCIM_BASE}/v2/Roles/${encodeURIComponent(found.id)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${mgmtToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      console.log(`✅ Successfully added user to role via SCIM2 v2/Roles`);
    } else {
      // Add user to group members
      const payload: Record<string, unknown> = {
        Operations: [
          {
            op: "add",
            path: "members",
            value: [
              {
                value: userId,
              },
            ],
          },
        ],
        schemas: [
          "urn:ietf:params:scim:api:messages:2.0:PatchOp",
        ],
      };
      await httpJson(`${ASGARDEO_SCIM_BASE}/Groups/${encodeURIComponent(found.id)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${mgmtToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    }
  },
};

export default AsgardeoService;
