module.exports = async function (context, req) {
  const { domain, region, token } = req.body;
  // Optional: Validate admin role via Graph API

  const prefix = domain.replace(/\W/g, '').toLowerCase().substring(0, 8);
  
  // Trigger Bicep deployment or GitHub Actions
  await runDeploymentWithPrefix(prefix, region, token);

  context.res = { status: 200, body: { message: 'Deployment started' } };
};