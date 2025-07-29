const fetch = require('node-fetch');
const { CosmosClient } = require("@azure/cosmos");

// Cosmos config: use CURRENT user container!
const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT;
const cosmosKey = process.env.COSMOS_DB_KEY;
const cosmosDbName = process.env.COSMOS_DB_DATABASE || "license365";
const currentContainer = process.env.COSMOS_DB_CURRENT || "userSnapshots";
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
const url = endpoint && deployment
  ? `${endpoint.endsWith('/') ? endpoint : endpoint + '/'}openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`
  : undefined;

// Standard response headers (add CORS, etc)
function responseHeaders(contentType = "application/json") {
  return {
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "frame-ancestors 'self'",
    "Access-Control-Allow-Origin": "https://license365.thefoc.io",
    "Vary": "Origin",
    "Content-Type": contentType,
    "Cache-Control": "no-cache"
  };
}

// Fetch current users for the tenant from Cosmos
async function fetchCurrentUsersFromCosmos(context) {
  context.log("Fetching current users from Cosmos DB...");
  if (!cosmosEndpoint || !cosmosKey) throw new Error("Missing Cosmos DB configuration.");
  const tenantId = process.env.AZURE_TENANT_ID;
  const client = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });
  const container = client.database(cosmosDbName).container(currentContainer);

  const query = {
    query: "SELECT * FROM c WHERE c.tenantId = @tenantId",
    parameters: [{ name: "@tenantId", value: tenantId }]
  };
  const { resources } = await container.items.query(query).fetchAll();
  context.log(`Fetched ${resources.length} current users from Cosmos DB.`);
  return resources;
}

module.exports = async function (context, req) {
  context.log("========== GetLicenseRecommendations FUNCTION START ==========");
  context.log("AZURE_OPENAI_ENDPOINT:", endpoint);
  context.log("AZURE_OPENAI_DEPLOYMENT:", deployment);
  context.log("AZURE_OPENAI_API_KEY present?", !!apiKey);
  context.log("COSMOS_DB_ENDPOINT:", cosmosEndpoint);
  context.log("COSMOS_DB_KEY present?", !!cosmosKey);
  context.log("COSMOS_DB_DATABASE:", cosmosDbName);
  context.log("COSMOS_DB_CURRENT (users container):", currentContainer);

  if (!endpoint || !deployment || !apiKey) {
    context.res = {
      status: 500,
      headers: responseHeaders(),
      body: { error: "Missing OpenAI API configuration in environment variables. Check AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_API_KEY." }
    };
    return;
  }

  if (!cosmosEndpoint || !cosmosKey) {
    context.res = {
      status: 500,
      headers: responseHeaders(),
      body: { error: "Missing Cosmos DB configuration in environment variables. Check COSMOS_DB_ENDPOINT and COSMOS_DB_KEY." }
    };
    return;
  }

  try {
    // Get users array: prefer body, else fetch current users from Cosmos DB
    let users = req.body?.users;
    if (!users || !Array.isArray(users)) {
      context.log("No users array in body, pulling from Cosmos DB...");
      users = await fetchCurrentUsersFromCosmos(context);
    }
    if (!users || !Array.isArray(users) || users.length === 0) {
      context.res = { status: 400, headers: responseHeaders(), body: { error: "No user data available from request or Cosmos DB." } };
      return;
    }

    // Accept a custom prompt (from dashboard's text box)
    const userPrompt = req.body?.prompt?.trim();

    // Compose OpenAI prompt
    const openAIPrompt = `
      Here is Microsoft 365 user and license assignment data for context:

      ${JSON.stringify(users.slice(0, 100), null, 2)}

      ${userPrompt || `
      I am an IT administrator. Please analyze the data and provide recommendations to right-size licensing, reduce unused licenses, spot anomalies, and suggest optimizations. Output should be clear, actionable, and concise for executive IT leaders.
      `}
    `;

    // Query Azure OpenAI
    context.log("Posting to OpenAI endpoint:", url);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are Xolv License AI Agent, a Microsoft licensing and cost optimization expert. Your answers should be concise, prescriptive, and executive-ready."
          },
          { role: "user", content: openAIPrompt }
        ],
        temperature: 0.2,
        max_tokens: 400 // Lowered from 700 to help reduce quota hits
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      // Handle Azure OpenAI 429 rate limit gracefully
      if (res.status === 429) {
        context.log.warn("Azure OpenAI rate limit hit (429).");
        context.res = {
          status: 429,
          headers: responseHeaders(),
          body: {
            error: "The License AI Agent is temporarily rate-limited by Microsoft. Please wait 1–2 minutes and try again. For higher usage, request a quota increase: https://aka.ms/oai/quotaincrease"
          }
        };
        return;
      }
      context.log.error(`OpenAI API error: ${res.status} - ${errText}`);
      throw new Error(`OpenAI API error: ${res.status} - ${errText}`);
    }
    const data = await res.json();

    // Always return AI summary text
    context.res = {
      status: 200,
      headers: responseHeaders(),
      body: { recommendation: data.choices?.[0]?.message?.content || "No recommendation found." }
    };
  } catch (err) {
    context.log.error("Function crashed:", err);
    context.res = {
      status: 500,
      headers: responseHeaders(),
      body: { error: err.message || "OpenAI API failed", stack: err.stack }
    };
  }
};