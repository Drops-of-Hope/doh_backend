// Script to check what roles/groups exist in Asgardeo
import AsgardeoService from "../services/asgardeo.service.js";

const ASGARDEO_ORG = process.env.ASGARDEO_ORG || "dropsofhope";
const ASGARDEO_ADMIN_BASE = process.env.ASGARDEO_ADMIN_BASE || `https://api.asgardeo.io/t/${ASGARDEO_ORG}/api/server/v1`;
const ASGARDEO_SCIM_BASE = process.env.ASGARDEO_SCIM_BASE || `https://api.asgardeo.io/t/${ASGARDEO_ORG}/scim2`;

async function main() {
  console.log("🔐 Getting Asgardeo management token...");
  const token = await AsgardeoService.getManagementAccessToken("internal_user_mgt_list internal_user_mgt_view internal_role_mgt_view");
  console.log("✅ Got token:", token.substring(0, 20) + "...");

  console.log("\n📋 Fetching all roles from Admin Roles API...");
  try {
    const rolesUrl = `${ASGARDEO_ADMIN_BASE}/roles`;
    console.log(`URL: ${rolesUrl}`);
    const rolesResponse = await fetch(rolesUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const rolesText = await rolesResponse.text();
    console.log(`Status: ${rolesResponse.status} ${rolesResponse.statusText}`);
    console.log("Response:", rolesText);
    
    if (rolesResponse.ok) {
      const rolesData = JSON.parse(rolesText);
      const roles = rolesData.Resources || rolesData.resources || rolesData.data || [];
      console.log(`\n✅ Found ${roles.length} roles:`);
      roles.forEach((role: Record<string, unknown>, i: number) => {
        console.log(`  ${i + 1}. ${role.displayName || role.name} (id: ${role.id})`);
      });
    }
  } catch (err) {
    console.error("❌ Admin Roles API error:", err instanceof Error ? err.message : err);
  }

  console.log("\n📋 Fetching all groups from SCIM Groups API...");
  try {
    const groupsUrl = `${ASGARDEO_SCIM_BASE}/Groups`;
    console.log(`URL: ${groupsUrl}`);
    const groupsResponse = await fetch(groupsUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const groupsText = await groupsResponse.text();
    console.log(`Status: ${groupsResponse.status} ${groupsResponse.statusText}`);
    console.log("Response:", groupsText);
    
    if (groupsResponse.ok) {
      const groupsData = JSON.parse(groupsText);
      const groups = groupsData.Resources || [];
      console.log(`\n✅ Found ${groups.length} groups:`);
      groups.forEach((group: Record<string, unknown>, i: number) => {
        console.log(`  ${i + 1}. ${group.displayName} (id: ${group.id})`);
      });
    }
  } catch (err) {
    console.error("❌ SCIM Groups API error:", err instanceof Error ? err.message : err);
  }

  console.log("\n🔍 Searching specifically for 'CampaignOrg' variations...");
  const searchTerms = ["CampaignOrg", "Internal/CampaignOrg", "Campaign Organizer", "campaign organizer"];
  
  for (const term of searchTerms) {
    console.log(`\n  Searching for: "${term}"`);
    try {
      await AsgardeoService.findRoleOrGroupId(term, token);
      console.log(`  ✅ Found!`);
    } catch (err) {
      console.log(`  ❌ Not found: ${err instanceof Error ? err.message : err}`);
    }
  }
}

main().catch(console.error);
