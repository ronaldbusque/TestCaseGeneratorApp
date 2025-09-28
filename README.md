# QualityForge AI Suite

A comprehensive suite of AI-powered tools for quality assurance and testing professionals, including test case generation, SQL assistance, and test data generation.

![QualityForge AI](public/app-screenshot.png)

## 🌟 Features

### 🧪 Test Case Generator

- 🤖 **Unified AI Orchestration**
  - Vercel AI SDK-powered pipeline with provider-agnostic orchestration
  - Configurable planner → writer → reviewer pipeline with optional multi-pass review
  - Built-in telemetry surfacing stage durations, reviewer notes, and slice-level warnings
- 🔀 **Configurable LLM Providers**
  - Choose OpenAI, Google Gemini, or OpenRouter per tool from the in-app settings page
  - Set custom model names per provider (e.g., `gpt-4.1-mini`, `gemini-1.5-pro-latest`, `openrouter/auto`)
  - Providers auto-populate based on API keys present in `.env.local`

- 📄 **Lightweight Document Support**
  - Text and markdown files read inline
  - Other formats (PDF, DOCX, images) sent with contextual metadata
  - Multimodal models interpret original files directly – no custom OCR

- 💡 **Dual Test Generation Modes**
  - High-level Test Scenarios
    - Concise, focused test objectives
    - Organized by functional areas
    - Perfect for test planning and coverage analysis
    - Emphasis on WHAT needs to be tested
  - Detailed Test Cases
    - Comprehensive test steps
    - Preconditions and expected results
    - Test data suggestions
    - Visual verification steps for images

### 💾 SQL Assistant

- 🔄 **Multiple SQL Functions**
  - **Generate**: Create SQL queries from natural language descriptions
  - **Validate**: Check SQL queries for errors and optimize them
  - **Convert**: Transform SQL between different dialects

- 🛢️ **Multi-Dialect Support**
  - MySQL
  - PostgreSQL
  - SQL Server
  - Oracle
  - SQLite

- 📊 **Schema Understanding**
  - Import database schemas for context-aware assistance
  - Support for both SQL DDL and JSON schema formats
  - Smart schema type detection

- 🔍 **Error Detection & Optimization**
  - Detailed SQL validation with error highlighting
  - Performance optimization suggestions
  - Query improvement recommendations

### 📊 Test Data Generator

- 🧩 **Flexible Schema Definition**
  - Visual schema builder with field editor
  - 50+ data types across multiple categories
  - Customizable field options and constraints

- 🤖 **AI-Enhanced Data Generation**
  - Contextual data enhancement through AI
  - Custom rules for more realistic test data
  - Correlated field values generation

- 📤 **Multiple Export Formats**
  - CSV with custom delimiters
  - JSON with formatting options
  - SQL insert statements
  - Excel spreadsheets

- 🔄 **Preview and Iteration**
  - Live data preview before export
  - Table and raw format views
  - Quick field adjustments
  - One-click regeneration

- 🔧 **Advanced Options**
  - Custom line endings
  - BOM inclusion options
  - Header control for CSV exports
  - Customizable data ranges and patterns

## 🚀 Getting Started

### Prerequisites

- Node.js 22.x or higher (required by the OpenAI Agents SDK)
- npm or yarn package manager
- OpenAI API key with access to GPT-4.1 or later reasoning models

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/qualityforge-suite.git
cd qualityforge-suite
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory and add your API keys:
```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
NEXT_PUBLIC_OPENAI_MODEL=gpt-4.1-mini

# Optional provider keys
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-pro-latest
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openrouter/auto
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

6. Visit **Settings → Provider Settings** to choose your provider for each tool and override the model names as needed.

## 🛠️ Technology Stack

- **Framework**: Next.js 14.2
- **UI Library**: React 18.2
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Document Handling**:
  - Lightweight client-side previews for text-based uploads
  - Multimodal models interpret binary files directly (PDF, DOCX, images)
- **Data Generation**:
  - Faker.js
- **AI Integration**:
  - Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/gateway`)
  - Vercel AI Gateway (optional) for centralized routing, analytics, and rate controls
  - OpenAI-compatible REST providers (OpenRouter / custom endpoints)
  - Native Gemini client for direct Google-hosted models when preferred
- **Type Safety**: TypeScript
- **Testing**: Jest

## 📖 Usage Guide

### Test Case Generator

1. **Select LLM Provider**
   - Visit **Settings → Provider Settings** to choose OpenAI, Gemini, or OpenRouter for each tool
   - Providers appear automatically when the corresponding API keys are present in `.env.local`

2. **Choose Generation Type**
   - High-level Test Scenarios: For planning and coverage analysis
   - Detailed Test Cases: For step-by-step test execution

3. **Input Requirements**
   - Upload relevant documents (PDF, Word, images, etc.)
   - Enter additional requirements in the text area
   - Preview text snippets or metadata summaries for each file

4. **Generate Test Cases**
   - Click "Generate Test Cases" button
   - Wait for AI processing
   - Review generated test cases organized by functional areas

5. **Manage Test Cases**
   - View test cases grouped by functional areas
   - Edit or copy test cases as needed
   - Regenerate test cases if needed
   - Switch between high-level and detailed views

### SQL Assistant

1. **Choose SQL Function**
   - Generate: Create new SQL from descriptions
   - Validate: Check existing SQL for issues
   - Convert: Transform between SQL dialects

2. **Configure Dialects**
   - Select source dialect (for Convert mode)
   - Select target dialect
   - Import schema if available

3. **Input Requirements**
   - Enter natural language description (for Generate)
   - Enter SQL query (for Validate and Convert)
   - Optionally provide schema context

4. **Process Request**
   - Click action button
   - Review SQL output
   - Check error messages or optimizations
   - Copy results to clipboard

### Test Data Generator

1. **Define Schema**
   - Add fields with the "Add Another Field" button
   - Select data types from the type dropdown
   - Configure field options

2. **Set Export Options**
   - Choose export format (CSV, JSON, SQL, Excel)
   - Configure row count and format-specific options
   - Set line endings and other preferences

3. **Preview Data**
   - Click "Preview" to see a sample of generated data
   - Toggle between table view and raw format view

4. **Enhance with AI**
   - Enter instructions for AI enhancement
   - Apply customizations to make data more realistic
   - Preview enhanced data

5. **Generate & Export**
   - Click "Generate Data" to create and download the file
   - Files are generated in the specified format
   - No local storage of generated data

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for the Agents SDK and reasoning models
- Faker.js for powerful test data generation
- The open-source community for the amazing libraries used in this project

## 📞 Support

For support, please open an issue in the GitHub repository or contact the maintainers.

---

Built with ❤️ using Next.js and AI 
