# AI Interview Agent

An AI-powered interview agent that conducts realistic mock interviews using online LLM APIs and real-time video communication.

## Features

- Real-time video and audio communication using LiveKit
- AI interview questions and responses powered by Mistral API
- Text-to-speech for AI responses
- Speech-to-text for user input
- Responsive UI built with React and Material UI

## Project Structure

```
ai-interview-agent/
├── client/                 # Frontend React application
│   ├── public/             # Static files
│   └── src/                # React components & logic
├── server/                 # Backend Node.js application
│   ├── config/             # Configuration files
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Express middleware
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── utils/              # Utility functions
├── docker/                 # Docker configuration
└── .env.example            # Environment variables example
```

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Docker and Docker Compose (optional, for containerized deployment)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/ai-interview-agent.git
   cd ai-interview-agent
   ```

2. Install dependencies

   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

3. Set up environment variables
   
   ```bash
   # In the root directory
   cp .env.example .env
   ```
   
   Then edit the `.env` file to add your API keys and configuration.

### Starting the Development Server

1. Start the backend server
   
   ```bash
   cd server
   npm run dev
   ```

2. In a new terminal, start the frontend development server
   
   ```bash
   cd client
   npm start
   ```

3. Access the application at http://localhost:3000

### Using Docker

1. Make sure Docker and Docker Compose are installed

2. Build and start the containers
   
   ```bash
   docker-compose up --build
   ```

3. Access the application at http://localhost:3000

## API Integration

This project uses online LLM APIs (Mistral or OpenAI) for generating interview questions and responses.

### Setting up Mistral API

1. Get an API key from [Mistral AI](https://mistral.ai/api/)
2. Add your API key to the `.env` file:
   ```
   LLM_TYPE=mistral
   LLM_API_KEY=your_mistral_api_key
   LLM_MODEL=mistral-7b-instruct-v0.2
   ```

### Setting up OpenAI API (Alternative)

1. Get an API key from [OpenAI](https://openai.com/api/)
2. Add your API key to the `.env` file:
   ```
   LLM_TYPE=openai
   LLM_API_KEY=your_openai_api_key
   LLM_MODEL=gpt-3.5-turbo
   ```

## LiveKit Configuration

1. Set up LiveKit server credentials
   ```
   LIVEKIT_API_KEY=your_livekit_api_key
   LIVEKIT_API_SECRET=your_livekit_api_secret
   LIVEKIT_URL=ws://localhost:7880
   ```

2. Update the LiveKit configuration in `livekit.yaml` to match these credentials.

## Next Steps

- [ ] Implement speech-to-text for user input
- [ ] Implement text-to-speech for AI responses
- [ ] Add interview session recording and playback
- [ ] Add feedback and analytics for interview performance
- [ ] Implement user authentication and session management
- [ ] Add interview templates for different job types