import { FieldDefinition } from './types';

export interface SchemaTemplate {
  key: string;
  name: string;
  description: string;
  fields: Array<Pick<FieldDefinition, 'name' | 'type' | 'options'>>;
}

export const SCHEMA_TEMPLATES: SchemaTemplate[] = [
  {
    key: 'person-basic',
    name: 'Person (Basic)',
    description: 'First name, last name, email, and phone number fields.',
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
    fields: [
      { name: 'companyName', type: 'Company Name', options: {} },
      { name: 'companyUrl', type: 'URL', options: {} },
      { name: 'companyTagline', type: 'Buzzword', options: {} },
    ],
  },
];
