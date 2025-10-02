import { FieldDefinition } from './types';

export interface SchemaTemplate {
  key: string;
  name: string;
  description: string;
  category: string;
  fields: Array<Pick<FieldDefinition, 'name' | 'type' | 'options'>>;
}

export const SCHEMA_TEMPLATES: SchemaTemplate[] = [
  {
    key: 'person-basic',
    name: 'Person (Basic)',
    description: 'First name, last name, email, and phone number fields.',
    category: 'People',
    fields: [
      { name: 'firstName', type: 'First Name', options: {} },
      { name: 'lastName', type: 'Last Name', options: {} },
      { name: 'email', type: 'Email', options: {} },
      { name: 'phoneNumber', type: 'Phone Number', options: {} },
    ],
  },
  {
    key: 'address-block',
    name: 'Address Block',
    description: 'Street, secondary line, city, state, postal code, country.',
    category: 'Location',
    fields: [
      { name: 'addressLine1', type: 'Address', options: {} },
      { name: 'addressLine2', type: 'Address Line 2', options: {} },
      { name: 'city', type: 'City', options: {} },
      { name: 'state', type: 'State', options: {} },
      { name: 'postalCode', type: 'Zip Code', options: {} },
      { name: 'country', type: 'Country', options: {} },
    ],
  },
  {
    key: 'company-basic',
    name: 'Company (Basic)',
    description: 'Company name, website URL, and buzzword tagline.',
    category: 'Business',
    fields: [
      { name: 'companyName', type: 'Company Name', options: {} },
      { name: 'companyUrl', type: 'URL', options: {} },
      { name: 'companyTagline', type: 'Buzzword', options: {} },
    ],
  },
  {
    key: 'order-record',
    name: 'Order Record',
    description: 'Order id, customer reference, status, amount, and dates.',
    category: 'Commerce',
    fields: [
      { name: 'orderId', type: 'UUID', options: {} },
      { name: 'customerId', type: 'UUID', options: {} },
      { name: 'status', type: 'Custom List', options: { values: 'pending, processing, fulfilled, cancelled' } },
      { name: 'orderAmount', type: 'Decimal Number', options: { min: 10, max: 500, multipleOf: 0.01 } },
      { name: 'orderDate', type: 'Date', options: {} },
    ],
  },
  {
    key: 'product-catalog',
    name: 'Product Catalog',
    description: 'Product name, SKU, category, price, and stock.',
    category: 'Commerce',
    fields: [
      { name: 'productName', type: 'Product Name', options: {} },
      { name: 'sku', type: 'Product SKU', options: {} },
      { name: 'category', type: 'Product Category', options: {} },
      { name: 'price', type: 'Product Price', options: { min: 5, max: 200 } },
      { name: 'inStock', type: 'Boolean', options: {} },
    ],
  },
];
