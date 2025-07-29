// .github/scripts/take-snapshot.js

const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const SNAPSHOT_API_URL = process.env.SNAPSHOT_API_URL;

// Node 18+ has global fetch; for older, use: import fetch from 'node-fetch';

async function getGraphToken() {
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default"
  });
  const res = await fetch(url, {
    method: "POST",
    body: params,
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
  if (!res.ok) throw new Error("Failed to obtain Graph token");
  const data = await res.json();
  return data.access_token;
}

async function getAllGraphUsers(accessToken) {
  let users = [];
  let url = "https://graph.microsoft.com/v1.0/users?$select=id,displayName,userPrincipalName,mail,accountEnabled,department,jobTitle,createdDateTime";
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) throw new Error(`Graph fetch failed: ${res.statusText}`);
    const data = await res.json();
    users = users.concat(data.value || []);
    url = data['@odata.nextLink'] || null;
  }
  return users;
}

(async () => {
  try {
    const token = await getGraphToken();
    const users = await getAllGraphUsers(token);
    console.log(`Fetched ${users.length} users from Microsoft Graph.`);

    const res = await fetch(SNAPSHOT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ users })
    });

    if (!res.ok) {
      throw new Error(`Snapshot API failed: ${res.status} ${await res.text()}`);
    }

    const respBody = await res.json();
    console.log("Snapshot API response:", respBody);

  } catch (err) {
    console.error("Snapshot error:", err.message || err);
    process.exit(1);
  }
})();