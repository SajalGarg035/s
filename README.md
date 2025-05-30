# RealTime Collaborative Coding Platform
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/realtime-collab/releases)
[![Docker](https://img.shields.io/badge/docker-enabled-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16-brightgreen.svg)](https://nodejs.org/)

## Table of Contents
- [Live Demo](#live-demo)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Docker Setup](#docker-setup)
- [Contributing](#contributing)
- [License](#license)

## Live Demo

Access the running application at:  
http://72.145.9.233:3000/

![App Screenshot](./screenshots/demo.png)

## Features

- ⚡ Real-time code collaboration with multiple participants  
- 🎨 Syntax highlighting and code formatting  
- 🔗 RESTful API built with Express and Node.js  
- 🗄️ Persistent data storage using MongoDB  
- 📱 Responsive UI styled with Tailwind CSS & shadcn-ui  
- 🐳 Containerized deployment via Docker & Docker Compose  
- ☁️ Hosted on a virtual machine  

## Tech Stack

- Frontend: React, Tailwind CSS, shadcn-ui  
- Backend: Node.js, Express, Socket.IO  
- Database: MongoDB  
- Deployment: Docker, Docker Compose, Virtual Machine  

## Getting Started

### Prerequisites

- Node.js >= 16.x  
- Docker & Docker Compose (for containerized setup)  
- Git

### Installation

1. Clone the repo  
   ```bash
   git clone https://github.com/yourusername/realtime-collab.git
   cd realtime-collab
   ```

2. Install dependencies  
   ```bash
   npm install       # installs backend
   cd client && npm install   # installs frontend
   ```

3. Configure environment variables  
   - Create a `.env` file in the root:  
     ```bash
     MONGO_URI=<your-mongodb-uri>
     PORT=3000
     ```
   - (Optional) Customize `client/.env` if needed.

### Running Locally

```bash
# from project root
npm run dev       # starts both server and client with hot-reload
```

Browse to http://localhost:3000 to see the app.

## Docker Setup

Build and run all services in containers:

```bash
docker-compose up --build
```

This will start the backend, frontend, and MongoDB as separate services.

## Contributing

1. Fork the repository  
2. Create a new branch (`git checkout -b feature/YourFeature`)  
3. Make your changes & commit (`git commit -m 'Add amazing feature'`)  
4. Push to your branch (`git push origin feature/YourFeature`)  
5. Open a Pull Request

