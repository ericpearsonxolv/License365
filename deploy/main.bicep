// ============================================================================
//  Platform Reporting Dashboard PoC - Azure Deployment via Bicep
//  This template provisions the Function App, Cosmos DB, Redis Cache,
//  and a Storage Account for static hosting. Static website properties
//  have been removed—enable them post-deployment via CLI.
// ============================================================================

@description('Azure AD tenant ID used by the licensing functions for Graph API calls.')
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

@allowed(['Basic','Standard','Premium'])
@description('Tier for Azure Cache for Redis.')
param redisTier string = 'Basic'

// Generate unique names
var unique = uniqueString(resourceGroup().id)
var storageAccountName = toLower('${prefix}stg${unique}')
var functionAppName    = toLower('${prefix}func${unique}')
var cosmosAccountName  = toLower('${prefix}cosmos${unique}')
var redisName          = toLower('${prefix}redis${unique}')

// App Service plan (consumption)
resource appPlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${prefix}-plan'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2022-09-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: appPlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'AZURE_TENANT_ID'
          value: azureTenantId
        }
        {
          name: 'COSMOS_DB_ENDPOINT'
          value: cosmos.properties.documentEndpoint
        }
        {
          name: 'COSMOS_DB_KEY'
          value: listKeys(resourceId('Microsoft.DocumentDB/databaseAccounts', cosmosAccountName), '2023-04-15').primaryMasterKey
        }
        {
          name: 'COSMOS_DB_DATABASE'
          value: cosmosDbName
        }
        {
          name: 'COSMOS_DB_CONTAINER'
          value: userContainerName
        }
        {
          name: 'COSMOS_SKU_CONTAINER'
          value: skuContainerName
        }
        {
          name: 'REDIS_URL'
          value: concat(
            'rediss://:',
            listKeys(resourceId('Microsoft.Cache/Redis', redisName), '2023-08-01').primaryKey,
            '@',
            redis.properties.hostName,
            ':6380'
          )
        }
      ]
    }
  }
}

// Cosmos DB account
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        failoverPriority: 0
        locationName: location
      }
    ]
    databaseAccountOfferType: 'Standard'
  }
}

// SQL database
resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  name: '${cosmos.name}/${cosmosDbName}'
  properties: {}
}

// User snapshots container
resource userContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  name: '${cosmos.name}/${cosmosDb.name}/${userContainerName}'
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

// SKU container
resource skuContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  name: '${cosmos.name}/${cosmosDb.name}/${skuContainerName}'
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

// Storage account (static website will be enabled via CLI)
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

// Outputs
output functionAppName string = functionAppName
output functionAppUrl  string = 'https://${functionAppName}.azurewebsites.net'
output storageStaticSiteUrl string = 'https://${storageAccountName}.z13.web.core.windows.net'
output cosmosEndpoint string = cosmos.properties.documentEndpoint
