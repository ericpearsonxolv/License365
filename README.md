# License365

**License365** is a modern licensing and user management platform built with React, Vite, Tailwind CSS, and Azure Functions.
It provides dynamic dashboards, license usage analytics, and cloud-based user provisioning for Microsoft 365 and more.

---

## 🚀 Features

- **Interactive Dashboard:** Visualize and filter license assignments, users, and departments
- **Azure Functions API:** Fast, serverless backend for user and license data
- **Cloud-Native:** Built to deploy on Azure Static Web Apps with Bicep infrastructure
- **Modern Stack:** React, Vite, Tailwind, ESLint, PostCSS
- **Role-based Filtering and Search**
- **Azure Infrastructure:** Includes Cosmos DB, Redis Cache, and Function Apps
- **Easy Deployment with Azure Bicep templates**

---

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) (for deployment)
- [Yarn](https://yarnpkg.com/) or [npm](https://npmjs.com/) (package manager)

### Installation

`ash
git clone https://github.com/ericpearsonxolv/License365.git
cd License365
npm install   # or yarn install
`

## 🏗️ Azure Infrastructure

This project includes Azure Bicep templates for infrastructure deployment:

- **Function App:** Serverless compute for API endpoints
- **Cosmos DB:** Document database for user and license data
- **Redis Cache:** High-performance caching layer
- **Storage Account:** Static website hosting

### Deploy to Azure

`ash
# Deploy infrastructure using Bicep
az deployment group create \
  --resource-group <your-resource-group> \
  --template-file deploy/main.bicep \
  --parameters azureTenantId=<your-tenant-id>
`

## 📁 Project Structure

- src/ - React frontend application
- pi/ - Azure Functions backend
- deploy/ - Azure Bicep infrastructure templates
- public/ - Static assets and configuration files
- ag/ - RAG (Retrieval Augmented Generation) utilities
- scripts/ - Utility scripts for data processing

---

## 🚀 Deployment

This application is designed to be deployed as an Azure Static Web App with integrated Azure Functions for the backend API.

## 📄 License

This project is licensed under the MIT License.
