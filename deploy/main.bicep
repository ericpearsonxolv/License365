// ============================================================================
// Platform Reporting Dashboard PoC - Azure Deployment via Bicep
//
// Deploys:
// * App Service Plan and Function App for API endpoints
// * Cosmos DB account with database and two containers (userSnapshots, skus)
// * Azure Cache for Redis
// * Storage Account for static website hosting (static website enabled after deployment)
//
// ============================================================================

@description('Azure AD tenant ID for Graph API calls.')
param azureTenantId string

@description('Name prefix applied to resources (letters and numbers only).')
param prefix string = 'focLic'

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Cosmos DB database name.')
param cosmosDbName string = 'license365'

@description('Cosmos DB container for user snapshots.')
param userContainerName string = 'userSnapshots'

@description('Cosmos DB container for SKU data.')
param skuContainerName string = 'skus'

@allowed([
  'Basic'
  'Standard'
  'Premium'
])
@description('Tier for Azure Cache for Redis.')
param redisTier string = 'Basic'

// Generate unique resource names per subscription/region
var unique = uniqueString(resourceGroup().id)
var storageAccountName = toLower('${prefix}stg${unique}')
var functionAppName    = toLower('${prefix}func${unique}')
var cosmosAccountName  = toLower('${prefix}cosmos${unique}')
var redisName          = toLower('${prefix}redis${unique}')

// App Service Plan (Consumption)
resource appPlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${prefix}-plan'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
}

// Cosmos DB account (SQL API)
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
  }
}

// Cosmos SQL database (child resource)
resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmos
  name: cosmosDbName
  properties: {
    resource: {
      id: cosmosDbName
    }
  }
}

// User snapshots container (child of cosmosDb)
resource userContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDb
  name: userContainerName
  properties: {
    resource: {
      id: userContainerName
      partitionKey: {
        paths: ['/tenantId']
        kind: 'Hash'
      }
    }
    options: {}
  }
}

// SKU data container (child of cosmosDb)
resource skuContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDb
  name: skuContainerName
  properties: {
    resource: {
      id: skuContainerName
      partitionKey: {
        paths: ['/tenantId']
        kind: 'Hash'
      }
    }
    options: {}
  }
}

// Storage account for static website
resource storage 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {}
}

// Redis cache
resource redis 'Microsoft.Cache/Redis@2023-08-01' = {
  name: redisName
  location: location
  properties: {
    sku: {
      name: redisTier
      family: 'C'
      capacity: 0
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

// Resource symbol reference for keys (fix linter warnings)
var cosmosKeys = cosmos.listKeys()
var redisKeys  = redis.listKeys()

// Function App for APIs
resource functionApp 'Microsoft.Web/sites@2022-09-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: appPlan.id
    siteConfig: {
      appSettings: [
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }
        { name: 'AZURE_TENANT_ID', value: azureTenantId }
        { name: 'COSMOS_DB_ENDPOINT', value: cosmos.properties.documentEndpoint }
        { name: 'COSMOS_DB_KEY', value: cosmosKeys.primaryMasterKey }
        { name: 'COSMOS_DB_DATABASE', value: cosmosDbName }
        { name: 'COSMOS_DB_CONTAINER', value: userContainerName }
        { name: 'COSMOS_SKU_CONTAINER', value: skuContainerName }
        {
          name: 'REDIS_URL'
          value: 'rediss://:${redisKeys.primaryKey}@${redis.properties.hostName}:6380'
        }
      ]
    }
  }
}

// Outputs for post-deployment actions
output functionAppName string = functionAppName
output functionAppUrl  string = 'https://${functionAppName}.azurewebsites.net'
output cosmosEndpoint  string = cosmos.properties.documentEndpoint
output storageStaticSiteUrl string = 'https://${storageAccountName}.z13.web.${environment().suffixes.storage}'
