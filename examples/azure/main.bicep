targetScope = 'resourceGroup'

@description('Region approved for the network and the separately created VNet data gateway.')
param location string = resourceGroup().location

@minLength(3)
@maxLength(64)
param networkName string = 'bi-serving-vnet'

@minLength(3)
@description('Accountable team or service owner; not an individual credential.')
param owner string

@allowed([
  'dev'
  'test'
  'prod'
])
param environment string = 'dev'

@description('Review all prefixes for overlap with existing Azure, AWS, GCP, and on-premises networks.')
param networkPrefix string = '10.90.0.0/16'
param dataGatewayPrefix string = '10.90.1.0/27'
param privateEndpointPrefix string = '10.90.2.0/24'

resource network 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: networkName
  location: location
  tags: {
    workload: 'powerbi-serving'
    environment: environment
    owner: owner
  }
  properties: {
    addressSpace: {
      addressPrefixes: [
        networkPrefix
      ]
    }
    subnets: [
      {
        name: 'bi-data-gateway'
        properties: {
          addressPrefix: dataGatewayPrefix
          delegations: [
            {
              name: 'powerplatform-data-gateway'
              properties: {
                serviceName: 'Microsoft.PowerPlatform/vnetaccesslinks'
              }
            }
          ]
          serviceEndpoints: [
            {
              service: 'Microsoft.Storage'
            }
          ]
        }
      }
      {
        name: 'bi-private-endpoints'
        properties: {
          addressPrefix: privateEndpointPrefix
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

output virtualNetworkId string = network.id
output dataGatewaySubnetId string = '${network.id}/subnets/bi-data-gateway'
output privateEndpointSubnetId string = '${network.id}/subnets/bi-private-endpoints'
output nextStep string = 'Network foundation only. Apply approved DNS, routes, network controls and private endpoints, then create and test the VNet data gateway separately.'
