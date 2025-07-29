const { CosmosClient } = require("@azure/cosmos");
const fetch = require("node-fetch");

// ENV
const API_BASE = process.env.ATLASSIAN_API_BASE_URL || "https://api.atlassian.com";
const API_TOKEN = process.env.ATLASSIAN_API_TOKEN;
const ORG_ID = process.env.ATLASSIAN_ORG_ID;
const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_DB_KEY;
const COSMOS_DB = process.env.COSMOS_DB_DATABASE || "license365";
const COSMOS_CONTAINER = process.env.COSMOS_ATLASSIAN_LICENSE_CONTAINER || "licenses_atlassian";

// Validate env vars
function validateEnv(context) {
  const missing = [];
  if (!API_TOKEN) missing.push("ATLASSIAN_API_TOKEN");
  if (!ORG_ID) missing.push("ATLASSIAN_ORG_ID");
  if (!COSMOS_ENDPOINT) missing.push("COSMOS_DB_ENDPOINT");
  if (!COSMOS_KEY) missing.push("COSMOS_DB_KEY");
  if (!COSMOS_DB) missing.push("COSMOS_DB_DATABASE");
  if (!COSMOS_CONTAINER) missing.push("COSMOS_ATLASSIAN_LICENSE_CONTAINER");
  if (missing.length > 0) {
    context.log.error("Missing env:", missing.join(", "));
    return false;
  }
  return true;
}

// Helper: Fetch Atlassian products (with basic paging support)
async function fetchAllAtlassianProducts(context, apiUrl) {
  let allProducts = [];
  let nextUrl = apiUrl;
  let page = 1;
  try {
    while (nextUrl) {
      const res = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          Accept: "application/json"
        }
      });
      if (!res.ok) {
        context.log.error(`Atlassian API error (page ${page}): ${res.status} ${res.statusText}`);
        throw new Error(`Atlassian API error: ${res.statusText}`);
      }
      const data = await res.json();
      // Patch: handle paged and non-paged responses
      const products = data.products || data.data || [];
      if (!Array.isArray(products)) throw new Error("Invalid Atlassian products array.");
      allProducts = allProducts.concat(products);

      // Support Atlassian API paging via "links.next"
      nextUrl = data.links && data.links.next ? data.links.next : null;
      page++;
    }
  } catch (err) {
    context.log.error("Exception in fetchAllAtlassianProducts:", err.message);
    throw err;
  }
  return allProducts;
}

module.exports = async function (context, req) {
  if (!validateEnv(context)) {
    context.res = { status: 500, body: { error: "Server misconfiguration (env)" } };
    return;
  }

  const client = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY });
  const container = client.database(COSMOS_DB).container(COSMOS_CONTAINER);

  // POST = Sync products/seats info from Atlassian
  if (req.method === "POST") {
    try {
      const apiUrl = `${API_BASE}/admin/v1/orgs/${ORG_ID}/products`;

      // PATCH: Support paged responses from Atlassian
      const products = await fetchAllAtlassianProducts(context, apiUrl);

      if (!products || !Array.isArray(products) || products.length === 0) {
        context.res = { status: 500, body: { error: "No Atlassian products found" } };
        return;
      }

      // Upsert all products into Cosmos
      await Promise.all(
        products.map(product =>
          container.items.upsert({
            id: product.product_id,
            productId: product.product_id,
            productName: product.product_name,
            productKey: product.product_key,
            seatsUsed: product.seats?.used || 0,
            seatCount: product.seats?.total || 0,
            syncTimestamp: new Date().toISOString(),
            ...product
          })
        )
      );

      context.res = { status: 200, body: { message: "Atlassian licenses synced", count: products.length } };
    } catch (err) {
      context.log.error("Exception syncing Atlassian products:", err.message || err);
      context.res = { status: 500, body: { error: err.message || "Unknown error" } };
    }
    return;
  }

  // GET = Return all license/product records
  try {
    const { resources } = await container.items.readAll().fetchAll();
    context.res = { status: 200, body: { licenses: resources } };
  } catch (err) {
    context.res = { status: 500, body: { error: err.message } };
  }
};