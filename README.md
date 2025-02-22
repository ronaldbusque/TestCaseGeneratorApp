# AI Test Case Generator

A modern web application that leverages AI models to automatically generate comprehensive test cases from requirements and various input file formats.

![AI Test Case Generator](public/app-screenshot.png)

## 🌟 Features

- 🤖 **Multiple AI Models**
  - Google Gemini Integration
  - OpenAI O1-Mini Integration
  - Smart model switching with session management

- 📄 **Multi-Format Document Support**
  - PDF files
  - Word documents (DOC, DOCX)
  - Plain text files (TXT)
  - HTML files
  - Images (PNG, JPEG, JPG, GIF, WEBP)

- 🔍 **Advanced Document Processing**
  - OCR for images using Tesseract.js
  - PDF text extraction
  - Word document parsing
  - Structure preservation
  - Metadata extraction

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

- 🎨 **Modern User Interface**
  - Responsive design
  - Drag-and-drop file upload
  - Real-time processing feedback
  - Smooth animations
  - Interactive test case management
  - Smart grouping by functional areas

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- API keys for AI services:
  - Google Gemini API key
  - OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/test-case-generator.git
cd test-case-generator
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory and add your API keys:
```env
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_OPENAI_API_URL=your_openai_api_url
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Technology Stack

- **Framework**: Next.js 14.2
- **UI Library**: React 18.2
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Document Processing**:
  - mammoth (Word documents)
  - pdfjs-dist (PDF files)
  - tesseract.js (OCR)
  - html-to-text
  - turndown (HTML to Markdown)
- **AI Integration**:
  - @google/generative-ai
  - OpenAI API
- **Type Safety**: TypeScript
- **Testing**: Jest

## 📖 Usage Guide

1. **Select AI Model**
   - Choose between Google Gemini or OpenAI O1-Mini
   - Each model has its own strengths for different types of requirements

2. **Choose Generation Type**
   - High-level Test Scenarios: For planning and coverage analysis
   - Detailed Test Cases: For step-by-step test execution

3. **Input Requirements**
   - Upload relevant documents (PDF, Word, images, etc.)
   - Enter additional requirements in the text area
   - View extracted content from uploaded files

4. **Generate Test Cases**
   - Click "Generate Test Cases" button
   - Wait for AI processing
   - Review generated test cases organized by functional areas

5. **Manage Test Cases**
   - View test cases grouped by functional areas
   - Edit or copy test cases as needed
   - Regenerate test cases if needed
   - Switch between high-level and detailed views

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

- Google Gemini AI for advanced test case generation
- OpenAI for the O1-Mini model integration
- The open-source community for the amazing libraries used in this project

## 📞 Support

For support, please open an issue in the GitHub repository or contact the maintainers.

---

Built with ❤️ using Next.js and AI 