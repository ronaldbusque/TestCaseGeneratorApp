import { FakerTypeDefinition } from '@/lib/types/testData';

export const fakerTypeDefinitions: Record<string, FakerTypeDefinition> = {
  // Basic types
  "Boolean": {
    fakerMethod: "datatype.boolean",
    options: []
  },
  "Character Sequence": {
    fakerMethod: "string.alphanumeric",
    options: [
      {
        name: "length",
        label: "Length",
        type: "number",
        default: 10,
        min: 1,
        max: 1000
      },
      {
        name: "casing",
        label: "Case Style",
        type: "select",
        default: "mixed",
        options: [
          { value: "lower", label: "Lowercase" },
          { value: "upper", label: "Uppercase" },
          { value: "mixed", label: "Mixed Case" }
        ]
      }
    ]
  },
  "Blank": {
    fakerMethod: null,
    options: []
  },
  
  // Add Number type with range options
  "Number": {
    fakerMethod: "number.int",
    options: [
      {
        name: "min",
        label: "Min Value",
        type: "number",
        default: 1,
        min: -1000000,
        max: 1000000
      },
      {
        name: "max",
        label: "Max Value",
        type: "number",
        default: 1000,
        min: -1000000,
        max: 1000000
      },
      {
        name: "precision",
        label: "Decimal Places",
        type: "number",
        default: 0,
        min: 0,
        max: 10
      }
    ]
  },
  
  // Add Decimal Number type
  "Decimal Number": {
    fakerMethod: "number.float",
    options: [
      {
        name: "min",
        label: "Min Value",
        type: "number",
        default: 0,
        min: -1000000,
        max: 1000000
      },
      {
        name: "max",
        label: "Max Value",
        type: "number",
        default: 100,
        min: -1000000,
        max: 1000000
      },
      {
        name: "precision",
        label: "Decimal Places",
        type: "number",
        default: 2,
        min: 1,
        max: 10
      }
    ]
  },
  
  // Vehicle types
  "Car Make": {
    fakerMethod: "vehicle.manufacturer",
    options: []
  },
  "Car Model": {
    fakerMethod: "vehicle.model",
    options: []
  },
  "Car Model Year": {
    fakerMethod: "vehicle.year",
    options: [
      {
        name: "min",
        label: "Min Year",
        type: "number",
        default: 1970,
        min: 1900,
        max: 2023
      },
      {
        name: "max",
        label: "Max Year",
        type: "number",
        default: 2023,
        min: 1900,
        max: 2030
      }
    ]
  },
  "Car VIN": {
    fakerMethod: "vehicle.vin",
    options: []
  },
  
  // Text types
  "Buzzword": {
    fakerMethod: "hacker.phrase",
    options: []
  },
  "Catch Phrase": {
    fakerMethod: "company.catchPhrase",
    options: []
  },
  
  // Date and Time types
  "Date": {
    fakerMethod: "date.anytime",
    options: [
      {
        name: "fromDate",
        label: "From Date",
        type: "text",
        default: "2020-01-01"
      },
      {
        name: "toDate",
        label: "To Date",
        type: "text",
        default: "2023-12-31"
      },
      {
        name: "format",
        label: "Format",
        type: "select",
        default: "ISO",
        options: [
          { value: "ISO", label: "ISO 8601 (UTC)" },
          { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
          { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
          { value: "YYYY-MM-DD", label: "YYYY-MM-DD" }
        ]
      }
    ]
  },
  "Future Date": {
    fakerMethod: "date.future",
    options: [
      {
        name: "days",
        label: "Days from now",
        type: "number",
        default: 365,
        min: 1,
        max: 3650
      },
      {
        name: "format",
        label: "Format",
        type: "select",
        default: "ISO",
        options: [
          { value: "ISO", label: "ISO 8601 (UTC)" },
          { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
          { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
          { value: "YYYY-MM-DD", label: "YYYY-MM-DD" }
        ]
      }
    ]
  },
  "Past Date": {
    fakerMethod: "date.past",
    options: [
      {
        name: "days",
        label: "Days ago",
        type: "number",
        default: 365,
        min: 1,
        max: 3650
      },
      {
        name: "format",
        label: "Format",
        type: "select",
        default: "ISO",
        options: [
          { value: "ISO", label: "ISO 8601 (UTC)" },
          { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
          { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
          { value: "YYYY-MM-DD", label: "YYYY-MM-DD" }
        ]
      }
    ]
  },
  "Time": {
    fakerMethod: "date.anytime",
    options: [
      {
        name: "format",
        label: "Format",
        type: "select",
        default: "HH:MM:SS",
        options: [
          { value: "HH:MM", label: "24h (HH:MM)" },
          { value: "HH:MM:SS", label: "24h with seconds (HH:MM:SS)" },
          { value: "hh:MM AM/PM", label: "12h (hh:MM AM/PM)" }
        ]
      }
    ]
  },
  
  // Location types
  "City": {
    fakerMethod: "location.city",
    options: []
  },
  "Address Line 2": {
    fakerMethod: "location.secondaryAddress",
    options: []
  },
  "Airport Code": {
    fakerMethod: "airline.airport.iataCode",
    options: []
  },
  "Address": {
    fakerMethod: "location.streetAddress",
    options: [
      {
        name: "includeSecondary",
        label: "Include Secondary Address",
        type: "boolean",
        default: false
      }
    ]
  },
  "Zip Code": {
    fakerMethod: "location.zipCode",
    options: [
      {
        name: "format",
        label: "Format",
        type: "select",
        default: "#####",
        options: [
          { value: "#####", label: "5 Digit (12345)" },
          { value: "#####-####", label: "9 Digit (12345-6789)" }
        ]
      }
    ]
  },
  
  // IT types
  "App Bundle ID": {
    fakerMethod: "system.commonFileExt",
    options: [
      {
        name: "company",
        label: "Company Prefix",
        type: "text",
        default: ""
      },
      {
        name: "format",
        label: "Format",
        type: "select",
        default: "com.{company}.{product}",
        options: [
          { value: "com.{company}.{product}", label: "com.company.product" },
          { value: "org.{company}.{product}", label: "org.company.product" },
          { value: "io.{company}.{product}", label: "io.company.product" }
        ]
      }
    ]
  },
  "App Version": {
    fakerMethod: "system.semver",
    options: []
  },
  "Bitcoin Address": {
    fakerMethod: "finance.bitcoinAddress",
    options: []
  },
  
  // Personal types
  "First Name": {
    fakerMethod: "person.firstName",
    options: [
      {
        name: "gender",
        label: "Gender",
        type: "select",
        default: "",
        options: [
          { value: "", label: "Any" },
          { value: "male", label: "Male" },
          { value: "female", label: "Female" }
        ]
      }
    ]
  },
  "Last Name": {
    fakerMethod: "person.lastName",
    options: []
  },
  "Full Name": {
    fakerMethod: "person.fullName",
    options: [
      {
        name: "includeTitle",
        label: "Include Title",
        type: "boolean",
        default: false
      },
      {
        name: "includeSuffix",
        label: "Include Suffix",
        type: "boolean",
        default: false
      }
    ]
  },
  "Email": {
    fakerMethod: "internet.email",
    options: [
      {
        name: "provider",
        label: "Provider",
        type: "select",
        default: "",
        options: [
          { value: "", label: "Random" },
          { value: "gmail.com", label: "Gmail" },
          { value: "yahoo.com", label: "Yahoo" },
          { value: "outlook.com", label: "Outlook" },
          { value: "company.com", label: "Company" }
        ]
      }
    ]
  },
  "Phone Number": {
    fakerMethod: "phone.number",
    options: [
      {
        name: "format",
        label: "Format",
        type: "select",
        default: "",
        options: [
          { value: "", label: "Random" },
          { value: "###-###-####", label: "###-###-####" },
          { value: "(###) ###-####", label: "(###) ###-####" },
          { value: "+# ### ###-####", label: "+# ### ###-####" },
          { value: "+## ## ########", label: "+## ## ########" }
        ]
      }
    ]
  },
  "Social Security Number": {
    fakerMethod: "finance.accountNumber",
    options: [
      {
        name: "format",
        label: "Format",
        type: "select",
        default: "###-##-####",
        options: [
          { value: "###-##-####", label: "###-##-####" },
          { value: "#########", label: "#########" }
        ]
      }
    ]
  },
  "Date of Birth": {
    fakerMethod: "date.birthdate",
    options: [
      {
        name: "minAge",
        label: "Min Age",
        type: "number",
        default: 18,
        min: 0,
        max: 100
      },
      {
        name: "maxAge",
        label: "Max Age",
        type: "number",
        default: 65,
        min: 1,
        max: 120
      },
      {
        name: "format",
        label: "Format",
        type: "select",
        default: "ISO",
        options: [
          { value: "ISO", label: "ISO 8601 (UTC)" },
          { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
          { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
          { value: "YYYY-MM-DD", label: "YYYY-MM-DD" }
        ]
      }
    ]
  },
  
  // Nature types
  "Animal Common Name": {
    fakerMethod: "animal.type",
    options: []
  },
  "Animal Scientific Name": {
    fakerMethod: "animal.cat",
    options: []
  },
  
  // Add more type definitions as needed...
}; 