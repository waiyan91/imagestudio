# Image Studio

Image Studio is a client-side web application for generating and editing images using various AI models. It provides a user-friendly chat-style interface to interact with state-of-the-art image generation models from OpenAI and Google. This application is designed for static hosting and can be deployed to platforms like Netlify without requiring a backend server.
## Demo website
https://imagestudiodev.netlify.app/
## Features

- **Multiple AI Models:** Supports a range of models including OpenAI's DALL-E 3 and Google's Imagen 4.
- **Image Generation:** Create images from text prompts.
- **Image Editing:** Modify existing images with text descriptions (requires a supported model).
- **Prompt Enhancement:** Automatically enhance your prompts for better results using Google Gemini.
- **Customizable Outputs:** Control parameters like image size, quality, and aspect ratio.
- **Local History:** Your generation history is saved in your browser for easy access.
- **API Key Management:** Securely save your API keys in the browser's local storage.

## Screenshots

### Application Interface
![Application Interface](docs/screenshots/Screenshot%202025-08-31%20at%201.29.40%E2%80%AFAM.png)
*Main application interface with API key input and model selection*

![Model Configuration](docs/screenshots/Screenshot%202025-08-31%20at%201.30.12%E2%80%AFAM.png)
*Model configuration and operation mode selection*

![Image Generation](docs/screenshots/Screenshot%202025-08-31%20at%201.30.21%E2%80%AFAM.png)
*Image generation interface with prompt input and parameters*

## Supported Models

### OpenAI
- DALL-E 3
- GPT Image 1 (supports editing)

### Google
- Gemini 2.5 Flash
- Imagen 4
- Imagen 4 Ultra
- Imagen 4 Fast

## Getting Started

⚠️ **Important Notes:**
- **No Authentication Required:** Password protection has been completely removed - the application is publicly accessible
- **API Keys Required:** You must provide your own OpenAI and/or Google API keys to use the application
- **Browser-Based:** All data is stored locally in your browser

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v20 or later)
- npm, yarn, or pnpm

### Installation

1. **Clone the repo**
   ```sh
   git clone https://github.com/your_username/imagestudio.git
   ```
2. **Install NPM packages**
   ```sh
   npm install
   ```
3. **Run the development server**
   ```sh
   npm run dev
   ```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Configuration

This application requires API keys for the AI models you wish to use. API keys are entered directly in the application and stored in your browser's local storage.

1. **Obtain API Keys:**
    - Get an [OpenAI API key](https://platform.openai.com/account/api-keys)
    - Get a [Google API key](https://makersuite.google.com/app/apikey)

2. **Enter Keys in the UI:**
    - Open the application in your browser
    - Enter your OpenAI and/or Google API keys in the respective input fields at the top of the page
    - Click "Save Keys" to store them securely in your browser's local storage

**Note:** No environment variables are needed for this static deployment. All API calls are made directly from the browser to the respective AI services.

## Usage

The application has two main modes of operation: "Generate" and "Edit".

### Generate Mode
1. Select "Generate" as the operation mode.
2. Choose your desired AI model.
3. Enter a descriptive text prompt of the image you want to create.
4. Adjust parameters like size, quality, and count as needed.
5. Click "Generate".

### Edit Mode
*Note: Image editing is currently only supported by the "OpenAI GPT Image 1" model.*

1. Select "Edit" as the operation mode.
2. Upload the image you want to modify.
3. Enter a text prompt describing the changes you want to make.
4. Click "Edit Image".

## Architecture

This application is built as a **static website** with no backend server:

- **Client-Side Only:** All AI API calls are made directly from the browser
- **Local Storage:** Image generation history is stored in browser IndexedDB
- **Static Export:** Built as static HTML/CSS/JS files for optimal performance
- **No Server Costs:** Can be hosted on any static hosting service

## Deployment

This application can be deployed as a static website to any static hosting service. Here are instructions for popular platforms:

### Netlify (Recommended)

1. **Connect Repository:** Connect your GitHub/GitLab repository to Netlify
2. **Build Settings:**
   - Build Command: `npm run build`
   - Publish Directory: `out`
3. **Deploy:** Netlify will automatically build and deploy your application

### Vercel

1. **Connect Repository:** Connect your GitHub repository to Vercel
2. **Configure Build:**
   - Framework Preset: Next.js
   - Build Command: `npm run build`
3. **Deploy:** Vercel will automatically build and deploy your application

### Other Platforms

This static application can also be deployed to:
- GitHub Pages
- Cloudflare Pages
- AWS S3 + CloudFront
- Any other static hosting service

Simply build the application with `npm run build` and upload the contents of the `out` directory.

## Recent Changes

- ✅ **Removed Password Protection:** Application is now publicly accessible without authentication
- ✅ **Client-Side Only:** No backend server required - all API calls happen in the browser
- ✅ **Static Export:** Application builds to static files for optimal performance
- ✅ **Netlify Compatible:** Easy deployment to static hosting services
