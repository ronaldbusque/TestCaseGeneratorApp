import { FakerCategory } from '@/lib/types/testData';

// Define categories matching the UI in the images
export const fakerCategories: FakerCategory[] = [
  {
    name: 'All',
    types: [] // Will be populated dynamically from all categories
  },
  {
    name: 'Basic',
    types: [
      { name: 'Boolean', description: 'True or false values' },
      { name: 'Character Sequence', description: 'Create simple sequences of characters, digits, and symbols' },
      { name: 'Number', description: 'Integer values with configurable range' },
      { name: 'Decimal Number', description: 'Floating point numbers with configurable precision' },
      { name: 'Blank', description: 'Always generates a null value' },
      { name: 'AI-Generated', description: 'Custom data generated by AI based on your description' }
    ]
  },
  {
    name: 'Advanced',
    types: [
      { name: 'Binomial Distribution', description: 'Generates numbers based on a binomial distribution with a specific probability of success' },
      { name: 'Buzzword', description: 'contextually-based, radical, proactive' }
    ]
  },
  {
    name: 'Date & Time',
    types: [
      { name: 'Date', description: 'Random date within a specified range' },
      { name: 'Future Date', description: 'Date in the future' },
      { name: 'Past Date', description: 'Date in the past' },
      { name: 'Date of Birth', description: 'Birth date based on age range' },
      { name: 'Time', description: 'Time values in various formats' }
    ]
  },
  {
    name: 'Car',
    types: [
      { name: 'Car Make', description: 'Honda, Ford, Pontiac' },
      { name: 'Car Model', description: 'Prelude, Mustang, Trans Am' },
      { name: 'Car Model Year', description: '1994, 2008, 2001' },
      { name: 'Car VIN', description: 'A random car VIN number, not correlated to other car fields' }
    ]
  },
  {
    name: 'Location',
    types: [
      { name: 'City', description: 'New York, Berlin, London' },
      { name: 'Address', description: 'Complete street address' },
      { name: 'Address Line 2', description: 'Room, Apt, Floor, Suite, or PO box number' },
      { name: 'Zip Code', description: 'Postal codes in various formats' },
      { name: 'Airport Code', description: 'LAX, NWR, JFK' },
      { name: 'Airport Continent', description: 'NA, AF, EU' },
      { name: 'Airport Country Code', description: 'US, CA, DE' },
      { name: 'Airport Elevation (Feet)', description: '11, 200, 123' },
      { name: 'Airport GPS Code', description: 'WAOP, YBDN, ZGXN' },
      { name: 'Airport Latitude', description: 'The latitude of the airport' },
      { name: 'Airport Longitude', description: 'The longitude of the airport' },
      { name: 'Airport Municipality', description: 'Wenzhou, Singleton, Melbourne' },
      { name: 'Airport Name', description: 'Kodak Airport, Van Nuys Airport, Halifax County Airport' },
      { name: 'Airport Region Code', description: 'US-PA, AU-QLD, MY-13' }
    ]
  },
  {
    name: 'Nature',
    types: [
      { name: 'Animal Common Name', description: 'Wombat, common, Owl, snowy, Jungle kangaroo' },
      { name: 'Animal Scientific Name', description: 'Vombatus ursinus, Nyctea scandiaca, Macropus agilis' }
    ]
  },
  {
    name: 'IT',
    types: [
      { name: 'App Bundle ID', description: 'Three part app bundle id: com.google.powerflex, com.microsoft.prodder' },
      { name: 'App Name', description: 'Fake app names' },
      { name: 'App Version', description: 'Random 2 and 3 part app version numbers' },
      { name: 'Avatar', description: 'Random avatar image url from Robohash' },
      { name: 'Base64 Image URL', description: 'Base64 encoded image urls' },
      { name: 'Bitcoin Address', description: 'Cryptocurrency wallet addresses' }
    ]
  },
  {
    name: 'Commerce',
    types: [
      { name: 'Product Name', description: 'Generic product names' },
      { name: 'Product SKU', description: 'Random SKU codes' },
      { name: 'Product Price', description: 'Price values with currency options' }
    ]
  },
  {
    name: 'Crypto',
    types: [
      { name: 'Bitcoin Address', description: 'Cryptocurrency wallet addresses' }
    ]
  },
  {
    name: 'Construction',
    types: [
      { name: 'Material', description: 'Common building materials' },
      { name: 'Tool', description: 'Construction tools and equipment' },
      { name: 'Project Type', description: 'Types of construction projects' }
    ]
  },
  {
    name: 'Health',
    types: [
      { name: 'Blood Type', description: 'A+, B-, O+, AB-' },
      { name: 'Medical Condition', description: 'Common medical conditions' },
      { name: 'Medication', description: 'Common medication names' },
      { name: 'Hospital', description: 'Hospital names' },
      { name: 'Medical Record Number', description: 'Formatted medical record numbers' }
    ]
  },
  {
    name: 'Personal',
    types: [
      { name: 'First Name', description: 'Common first names' },
      { name: 'Last Name', description: 'Common last names' },
      { name: 'Full Name', description: 'Complete name with title and suffix options' },
      { name: 'Email', description: 'Valid email addresses' },
      { name: 'Phone Number', description: 'Formatted phone numbers with various patterns' },
      { name: 'Social Security Number', description: 'Formatted US SSN' },
      { name: 'Date of Birth', description: 'Dates within age ranges' }
    ]
  },
  {
    name: 'Products',
    types: [
      { name: 'Product Name', description: 'Generic product names' },
      { name: 'Product SKU', description: 'Random SKU codes' },
      { name: 'Product Price', description: 'Price values with currency options' },
      { name: 'Product Category', description: 'Common product categories' },
      { name: 'Product Description', description: 'Detailed product descriptions' }
    ]
  },
  {
    name: 'Travel',
    types: [
      { name: 'Flight Number', description: 'Airline flight numbers' },
      { name: 'Booking Reference', description: 'Travel booking codes' },
      { name: 'Hotel Name', description: 'Realistic hotel names' },
      { name: 'Destination', description: 'Popular travel destinations' },
      { name: 'Travel Date', description: 'Future travel dates' },
      { name: 'Seat Assignment', description: 'Aircraft seat numbers' }
    ]
  }
];

// Populate the "All" category with all types from other categories
fakerCategories[0].types = fakerCategories
  .slice(1)
  .flatMap(category => 
    category.types.map(type => ({
      ...type,
      category: category.name
    }))
  ); 

// This list identifies all the types in categories that are missing in the type definitions
// Will be logged in the console when imported/used
// HELPER SECTION - Keep this commented out as it's just for reference
/*
const getMissingTypes = () => {
  // Import the type definitions to compare
  const { fakerTypeDefinitions } from './faker-type-definitions';
  
  // Extract all types from categories (excluding the All category)
  const allCategoryTypes = fakerCategories
    .slice(1)
    .flatMap(category => category.types.map(type => type.name));
  
  // Get all defined types
  const definedTypes = Object.keys(fakerTypeDefinitions);
  
  // Find types that are in categories but not in definitions
  return allCategoryTypes.filter(type => !definedTypes.includes(type));
};

// Uncomment to debug if needed:
// console.log('Missing types:', getMissingTypes());
*/ 