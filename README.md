# DevSync 🚀

DevSync is a modern, real-time collaborative code editor built for seamless developer teamwork. Featuring live remote cursors, an integrated virtual file system, AI-powered coding assistance, GitHub Pull Request reviews, local code execution, and WebRTC video calling all built into a sleek, premium interface.

## ✨ Key Features

- **Real-Time Collaborative Editing**: Type together with zero latency via WebSockets. See where your teammates are typing with animated, color-coded remote cursors.
- **Virtual File System**: Create, switch, and delete multiple files in a single session. The editor automatically adjusts syntax highlighting and error checking based on the file extension.
- **WebRTC Video Chat**: P2P mesh-network video and audio calling directly inside the editor. Drag the floating video UI anywhere on the screen without minimizing your code.
- **Code Execution Engine**: Run JavaScript, TypeScript, and Python code securely on the backend with a built-in sliding terminal for instant stdout/stderr feedback.
- **GitHub PR Integration**: Instantly import any public GitHub Pull Request. DevSync fetches the raw diff and populates the file explorer so you can review code together live.
- **AI Coding Assistant**: 
  - *Autocomplete*: Press `Cmd/Ctrl + Space` in the editor for context-aware AI completions.
  - *AI Review*: Get instant inline comments and code reviews from our backend AI integration.
- **Premium UI**: Crafted with Tailwind CSS v4, Framer Motion animations, Lucide icons, and a custom Dark/Light mode toggle.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Editor**: Monaco Editor (`@monaco-editor/react`)
- **Styling**: Tailwind CSS v4 + Radix UI
- **Animations**: Framer Motion
- **WebRTC**: Native `RTCPeerConnection`
- **State/Sockets**: `socket.io-client`

### Backend
- **Server**: Node.js + Express
- **WebSockets**: Socket.io
- **Execution Environment**: `child_process.exec` (Node/Python)
- **AI Integration**: OpenAI SDK

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/DevSync.git
cd DevSync
```

### 2. Setup the Backend
Navigate to the backend directory, install dependencies, and configure your environment variables.
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
PORT=5000
OPENAI_API_KEY=your_openai_api_key_here
```

Start the backend development server:
```bash
npm run dev
```

### 3. Setup the Frontend
Open a new terminal window, navigate to the frontend directory, and install dependencies.
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory (optional, if your backend runs on a different port):
```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend development server:
```bash
npm run dev
```

### 4. Start Collaborating!
Open your browser and navigate to `http://localhost:5173`. 
Create a new room, share the URL or Room ID with your teammates, and start coding together!

## 📜 License
This project is licensed under the MIT License.
