# CodeScan AI – OpenRouter Integration

An AI-powered code analysis assistant that helps developers understand, review, and troubleshoot code using Large Language Models (LLMs) through the OpenRouter API.

## Overview

CodeScan AI is a web-based AI assistant designed to make code analysis easier. Users can interact with the AI through a simple chat interface, provide code for analysis, and receive AI-generated explanations and suggestions.

The application uses a Node.js backend and a web-based frontend, with OpenRouter acting as the AI model gateway.

## Project Demo

🎥 **Watch the CodeScan AI Demonstration**

[▶ Watch Project Demo](YOUR_YOUTUBE_VIDEO_LINK_HERE)

The demonstration covers the application's interface, AI-powered code analysis, debugging assistance, and supported file and image inputs.

## Features

- **AI-Powered Code Analysis:** Submit code and receive AI-generated explanations and analysis.
- **Code Understanding:** Ask questions about code and understand its functionality.
- **Debugging Assistance:** Get help identifying and troubleshooting coding issues.
- **File and Image Support:** Supports file and image inputs where enabled and supported by the configured model.
- **Interactive Chat Interface:** Communicate with the AI through a simple web interface.
- **OpenRouter Integration:** Connect to different AI models available through OpenRouter.
- **Configurable AI Model:** Change the AI model through environment variables.
- **Backend API:** Node.js and Express handle communication between the frontend and AI provider.

## Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Frontend structure |
| CSS3 | User interface styling |
| JavaScript | Frontend functionality |
| Node.js | Backend runtime |
| Express.js | Backend server and API |
| OpenRouter API | AI model integration |
| dotenv | Environment configuration |

## Project Structure

```text
CodeScan-AI/
│
├── public/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── server.js
├── package.json
├── package-lock.json
├── .gitignore
├── SETUP.md
└── README.md
```

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/AnshuRay-ar/CodeScan-AI-OpenRouter-Integration.git
```

### 2. Open the Project Folder

```bash
cd CodeScan-AI-OpenRouter-Integration
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory.

```env
PORT=3000

AI_API_URL=https://openrouter.ai/api/v1/chat/completions

AI_MODEL=your_preferred_model

OPENROUTER_API_KEY=your_openrouter_api_key

ALLOW_IMAGES=true
```

Replace the placeholder values with your actual configuration.

Get your API key from [OpenRouter](https://openrouter.ai/).

**Important:** Never share your API key or upload your `.env` file to GitHub.

### 5. Start the Application

```bash
node server.js
```

### 6. Open the Application

Visit the following address in your browser:

```text
http://localhost:3000
```

## Configuration

You can customize the AI integration through environment variables.

| Variable | Description |
|---|---|
| PORT | Port on which the server runs |
| AI_API_URL | OpenRouter chat completions endpoint |
| AI_MODEL | AI model used for responses |
| OPENROUTER_API_KEY | API authentication key |
| ALLOW_IMAGES | Enables or disables image input |

## How It Works

1. The user interacts with the CodeScan AI frontend.
2. The frontend collects the user's message and supported attachments.
3. The request is sent to the Node.js backend.
4. The backend prepares the request and communicates with the OpenRouter API.
5. OpenRouter routes the request to the configured AI model.
6. The AI-generated response is returned to the backend.
7. The frontend displays the response to the user.

## API Health Check

The backend provides a health-check endpoint:

```text
GET /api/health
```

It can be used to check whether the backend server is running and view the configured AI provider and model.

## Security

- Keep API keys in environment variables.
- Do not commit `.env` files.
- Do not expose private API credentials in frontend JavaScript.
- Use your own OpenRouter API key when running the project.

## Future Improvements

- Support for additional AI providers.
- More advanced code review capabilities.
- Improved file analysis.
- Code optimization suggestions.
- Enhanced conversation management.

## Author

Developed as an AI-powered code analysis project using JavaScript, Node.js, Express.js and OpenRouter.

---

**CodeScan AI – Making Code Understanding Smarter with AI.**
