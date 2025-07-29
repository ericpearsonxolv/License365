const { CosmosClient } = require("@azure/cosmos");
const fetch = require("node-fetch");

// Environment variables: must match those set in SWA/Azure portal!
const ATLASSIAN_API_BASE_URL = process.env.ATLASSIAN_API_BASE_URL || "https://api.atlassian.com";
const ATLASSIAN_API_TOKEN = process.env.ATLASSIAN_API_TOKEN;
const ATLASSIAN_EMAIL = process.env.ATLASSIAN_EMAIL;
const ATLASSIAN_ORG_ID = process.env.ATLASSIAN_ORG_ID;

const COSMOS_DB_ENDPOINT = process.env.COSMOS_DB_ENDPOINT;
const COSMOS_DB_KEY = process.env.COSMOS_DB_KEY;
const COSMOS_DB_DATABASE = process.env.COSMOS_DB_DATABASE || "license365";
const COSMOS_ATLASSIAN_USER_CONTAINER = process.env.COSMOS_ATLASSIAN_USER_CONTAINER || "users_atlassian";

// Validation utility
function validateEnvVars(context) {
  const missing = [];
  if (!ATLASSIAN_API_BASE_URL) missing.push("ATLASSIAN_API_BASE_URL");
  if (!ATLASSIAN_API_TOKEN) missing.push("ATLASSIAN_API_TOKEN");
  if (!ATLASSIAN_EMAIL) missing.push("ATLASSIAN_EMAIL");
  if (!ATLASSIAN_ORG_ID) missing.push("ATLASSIAN_ORG_ID");
  if (!COSMOS_DB_ENDPOINT) missing.push("COSMOS_DB_ENDPOINT");
  if (!COSMOS_DB_KEY) missing.push("COSMOS_DB_KEY");
  if (!COSMOS_DB_DATABASE) missing.push("COSMOS_DB_DATABASE");
  if (!COSMOS_ATLASSIAN_USER_CONTAINER) missing.push("COSMOS_ATLASSIAN_USER_CONTAINER");

  if (missing.length) {
    context.log.error("Missing environment variables: " + missing.join(", "));
    context.res = {
      status: 500,
      body: { error: "Server configuration error. Missing: " + missing.join(", ") }
    };
    return false;
  }
  return true;
}

// Helper: Fetch ALL users using Atlassian pagination
async function fetchAllAtlassianUsers(context, url, token, email) {
  let allUsers = [];
  let pageUrl = url;
  let page = 1;
  while (pageUrl) {
    context.log(`Fetching users page ${page}: ${pageUrl}`);
    const res = await fetch(pageUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "From": email
      }
    });
    if (!res.ok) {
      throw new Error(`Atlassian API error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const users = data.users || data.values || data.data || data;
    if (!Array.isArray(users)) {
      throw new Error("API did not return a users array.");
    }
    allUsers = allUsers.concat(users);
    pageUrl = data.links && data.links.next ? data.links.next : null;
    page++;
  }
  return allUsers;
}

module.exports = async function (context, req) {
  // Validate all required environment variables
  if (!validateEnvVars(context)) return;

  // Cosmos DB client and container
  const client = new CosmosClient({ endpoint: COSMOS_DB_ENDPOINT, key: COSMOS_DB_KEY });
  const container = client.database(COSMOS_DB_DATABASE).container(COSMOS_ATLASSIAN_USER_CONTAINER);

  // --- POST: Sync Atlassian users into Cosmos DB ---
  if (req.method === "POST") {
    try {
      // Construct Atlassian users API URL
      const url = `${ATLASSIAN_API_BASE_URL}/admin/v1/orgs/${ATLASSIAN_ORG_ID}/users`;

      // **Fetch ALL users with paging!**
      const users = await fetchAllAtlassianUsers(context, url, ATLASSIAN_API_TOKEN, ATLASSIAN_EMAIL);

      if (!Array.isArray(users) || users.length === 0) {
        context.log.error("No users found in Atlassian response.");
        context.res = { status: 500, body: { error: "No Atlassian users found" } };
        return;
      }

      // Upsert all users into Cosmos DB
      await Promise.all(users.map(u =>
        container.items.upsert({
          id: u.account_id || u.id,
          displayName: u.display_name || u.name,
          email: u.email,
          isActive: u.active || u.account_status === "active",
          ...u
        })
      ));

      context.res = { status: 200, body: { message: "Atlassian users synced", count: users.length } };
    } catch (err) {
      context.log.error("Exception syncing Atlassian users", err);
      context.res = { status: 500, body: { error: err.message } };
    }
    return;
  }

  // --- GET: Return all users from Cosmos DB ---
  try {
    const { resources } = await container.items.readAll().fetchAll();
    context.res = { status: 200, body: { users: resources } };
  } catch (err) {
    context.log.error("Exception reading Atlassian users from Cosmos DB", err);
    context.res = { status: 500, body: { error: err.message } };
  }
};