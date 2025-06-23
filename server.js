const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const ACTIONS = require('./src/actions/Actions');
// Add Docker service import
const DockerService = require('./src/services/dockerService');
const dockerService = new DockerService();

// Import routes
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');

// Passport configuration - import after routes
require('./config/passport');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {

        origin: process.env.CLIENT_URL || "http://localhost:3000",


        methods: ["GET", "POST"],
        credentials: true
    }
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://sajal:sajal123@cluster0.urmyxu4.mongodb.net/codesync-pro', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({

    origin: process.env.CLIENT_URL || 'http://localhost:3000',

    credentials: true,            // <-- Allow the browser to send cookies
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  }));
  
// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'codesync-pro-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb+srv://sajal:sajal123@cluster0.urmyxu4.mongodb.net/codesync-pro',
        touchAfter: 24 * 3600
    }),
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes); // Add this line to handle /auth/* routes as well
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve static files from the React app build directory only if it exists
const buildPath = path.join(__dirname, 'build');
if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
} else {
    console.warn('⚠️ Build directory not found. Run "npm run build" to create production build.');
}

const userSocketMap = {};
function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

function compileAndRunCode(code, language, inputs = [], callback) {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    let fileName, command;
    const timestamp = Date.now();
    const startTime = Date.now();

    let inputData = '';
    if (inputs && inputs.length > 0) {
        inputData = inputs.map(input => input.value).join('\n') + '\n';
    }

    switch (language) {
        case 'javascript':
            fileName = `temp_${timestamp}.js`;
            let modifiedCode = code;
            if (inputs.length > 0) {
                const inputValues = inputs.map(input => `"${input.value}"`).join(', ');
                modifiedCode = `
                const inputs = [${inputValues}];
                let inputIndex = 0;
                const readline = { question: (prompt, callback) => { 
                    console.log(prompt + inputs[inputIndex] || ''); 
                    callback(inputs[inputIndex++] || ''); 
                }};
                
                ${code}
                `;
            }
            fs.writeFileSync(path.join(tempDir, fileName), modifiedCode);
            command = `node ${path.join(tempDir, fileName)}`;
            break;
            
        case 'python':
            fileName = `temp_${timestamp}.py`;
            let pythonCode = code;
            if (inputs.length > 0) {
                const inputFileName = `input_${timestamp}.txt`;
                fs.writeFileSync(path.join(tempDir, inputFileName), inputData);
                pythonCode = `
import sys
sys.stdin = open('${inputFileName}', 'r')

${code}
`;
            }
            fs.writeFileSync(path.join(tempDir, fileName), pythonCode);
            command = `cd ${tempDir} && python3 ${fileName}`;
            break;
            
        case 'cpp':
        case 'clike':
            fileName = `temp_${timestamp}.cpp`;
            const executableName = `temp_${timestamp}`;
            fs.writeFileSync(path.join(tempDir, fileName), code);
            if (inputs.length > 0) {
                const inputFileName = `input_${timestamp}.txt`;
                fs.writeFileSync(path.join(tempDir, inputFileName), inputData);
                command = `cd ${tempDir} && g++ ${fileName} -o ${executableName} && ./${executableName} < ${inputFileName}`;
            } else {
                command = `cd ${tempDir} && g++ ${fileName} -o ${executableName} && ./${executableName}`;
            }
            break;
            
        default:
            callback({ error: 'Language not supported for compilation' });
            return;
    }

    exec(command, { timeout: 15000, cwd: tempDir }, (error, stdout, stderr) => {
        const executionTime = Date.now() - startTime;
        
        try {
            if (fs.existsSync(path.join(tempDir, fileName))) {
                fs.unlinkSync(path.join(tempDir, fileName));
            }
            if (language === 'clike' || language === 'cpp') {
                const execPath = path.join(tempDir, `temp_${timestamp}`);
                if (fs.existsSync(execPath)) {
                    fs.unlinkSync(execPath);
                }
            }
            const inputFileName = `input_${timestamp}.txt`;
            if (fs.existsSync(path.join(tempDir, inputFileName))) {
                fs.unlinkSync(path.join(tempDir, inputFileName));
            }
        } catch (e) {
            console.log('Cleanup error:', e);
        }

        if (error) {
            callback({ 
                error: error.message, 
                stderr: stderr,
                executionTime 
            });
        } else {
            callback({ 
                output: stdout, 
                stderr: stderr,
                executionTime 
            });
        }
    });
}

io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    socket.on(ACTIONS.JOIN, async ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        
        // Initialize Docker container for the room with error handling
        try {
            const containerInfo = await dockerService.getContainer(roomId);
            socket.emit('docker:container-ready', { 
                containerId: containerInfo.id,
                status: 'ready'
            });
        } catch (error) {
            console.error('Error initializing container:', error);
            
            // Special handling for Docker socket permission errors
            if (error.code === 'EACCES' && 
                error.syscall === 'connect' && 
                error.address === '/var/run/docker.sock') {
                socket.emit('docker:container-error', { 
                    error: 'Permission denied connecting to Docker socket. Please add your user to the docker group: sudo usermod -aG docker $USER' 
                });
            } else {
                socket.emit('docker:container-error', { error: error.message });
            }
        }
        
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
        console.log(`👤 ${username} joined room ${roomId}`);
    });

    // Docker Terminal Operations
    socket.on('docker:connect-terminal', async ({ roomId, containerId }) => {
        try {
            const terminalId = `${socket.id}-${Date.now()}`;
            const { exec, stream } = await dockerService.createTerminal(roomId, terminalId);
            
            console.log(`🔌 Terminal connected for ${socket.id}, stream writable: ${stream.writable}`);
            
            // Handle terminal output
            stream.on('data', (chunk) => {
                const data = chunk.toString();
                socket.emit('docker:terminal-data', data);
            });

            stream.on('end', () => {
                console.log('🔚 Terminal stream ended for', socket.id);
                socket.emit('docker:terminal-disconnected');
            });

            stream.on('error', (error) => {
                console.error('❌ Terminal stream error:', error);
                socket.emit('docker:terminal-error', error.message);
            });

            stream.on('close', () => {
                console.log('🔒 Terminal stream closed for', socket.id);
                socket.emit('docker:terminal-disconnected');
            });

            // Store stream reference for input
            socket.terminalStream = stream;
            socket.terminalExec = exec;
            socket.terminalId = terminalId;
            socket.roomId = roomId;
            
            socket.emit('docker:terminal-connected', { terminalId });
            
        } catch (error) {
            console.error('Terminal connection error:', error);
            socket.emit('docker:terminal-error', error.message);
        }
    });

    socket.on('docker:terminal-input', ({ data }) => {
        console.log(`⌨️ Terminal input from ${socket.id}: "${data}" (length: ${data.length})`);
        
        if (!socket.terminalStream) {
            console.warn('⚠️ No terminal stream for socket:', socket.id);
            socket.emit('docker:terminal-error', 'No terminal connection found. Please reconnect.');
            return;
        }

        if (socket.terminalStream.destroyed) {
            console.warn('⚠️ Terminal stream destroyed for socket:', socket.id);
            socket.emit('docker:terminal-error', 'Terminal connection destroyed. Please reconnect.');
            return;
        }

        if (!socket.terminalStream.writable) {
            console.warn('⚠️ Terminal stream not writable for socket:', socket.id);
            socket.emit('docker:terminal-error', 'Terminal not writable. Please reconnect.');
            return;
        }

        try {
            const written = socket.terminalStream.write(data);
            console.log(`✅ Data written to terminal: ${written}, data: "${data}"`);
            
            if (!written) {
                console.warn('⚠️ Terminal stream buffer full, waiting for drain');
                socket.terminalStream.once('drain', () => {
                    console.log('✅ Terminal stream drained');
                });
            }
        } catch (error) {
            console.error('❌ Error writing to terminal:', error);
            socket.emit('docker:terminal-error', `Failed to write to terminal: ${error.message}`);
        }
    });

    socket.on('docker:terminal-resize', ({ rows, cols }) => {
        console.log(`📐 Terminal resize: ${cols}x${rows} for ${socket.id}`);
        if (socket.terminalExec) {
            try {
                socket.terminalExec.resize({ h: rows, w: cols });
                console.log(`✅ Terminal resized to ${cols}x${rows}`);
            } catch (error) {
                console.error('❌ Terminal resize error:', error);
                socket.emit('docker:terminal-error', `Resize failed: ${error.message}`);
            }
        }
    });

    // Add a test endpoint for terminal functionality
    socket.on('docker:test-terminal', ({ roomId }) => {
        console.log(`🧪 Testing terminal for room ${roomId}, socket ${socket.id}`);
        
        if (socket.terminalStream && socket.terminalStream.writable) {
            try {
                socket.terminalStream.write('echo "Terminal test successful"\r');
                socket.emit('docker:test-result', { success: true, message: 'Test command sent' });
            } catch (error) {
                socket.emit('docker:test-result', { success: false, message: error.message });
            }
        } else {
            socket.emit('docker:test-result', { 
                success: false, 
                message: `Terminal not available. Stream exists: ${!!socket.terminalStream}, Writable: ${socket.terminalStream?.writable}` 
            });
        }
    });

    // File System Operations
    socket.on('docker:get-file-tree', async ({ roomId, containerId, path = '/workspace' }) => {
        try {
            console.log(`📁 Getting file tree for room ${roomId}, path: ${path}`);
            const files = await dockerService.getFileTree(roomId, path);
            socket.emit('docker:file-tree', { files, path });
        } catch (error) {
            console.error('Error getting file tree:', error);
            socket.emit('docker:file-error', { error: error.message, operation: 'get-file-tree' });
        }
    });

    socket.on('docker:create-file', async ({ roomId, containerId, path, type = 'file', content = '' }) => {
        try {
            console.log(`📝 Creating ${type}: ${path} in room ${roomId}`);
            
            if (!path || path.trim() === '') {
                throw new Error('File path is required');
            }
            
            await dockerService.createFile(roomId, path, type, content);
            socket.emit('docker:file-created', { path, type, success: true });
            
            // Refresh file tree for all clients in the room
            try {
                const files = await dockerService.getFileTree(roomId, '/workspace');
                io.to(roomId).emit('docker:file-tree', { files, path: '/workspace' });
            } catch (treeError) {
                console.warn('Failed to refresh file tree:', treeError.message);
            }
            
            // Broadcast to other clients in room
            socket.to(roomId).emit('docker:file-created', { path, type });
            
        } catch (error) {
            console.error('Error creating file:', error);
            const errorMessage = error.message || `Failed to create ${type}`;
            socket.emit('docker:file-error', { error: errorMessage, operation: 'create-file', path });
            socket.emit('docker:file-created', { path, type, success: false, error: errorMessage });
        }
    });

    socket.on('docker:delete-file', async ({ roomId, containerId, path }) => {
        try {
            console.log(`🗑️ Deleting: ${path} in room ${roomId}`);
            
            if (!path || path.trim() === '') {
                throw new Error('File path is required');
            }
            
            await dockerService.deleteFile(roomId, path);
            socket.emit('docker:file-deleted', { path, success: true });
            
            // Refresh file tree for all clients in the room
            try {
                const files = await dockerService.getFileTree(roomId, '/workspace');
                io.to(roomId).emit('docker:file-tree', { files, path: '/workspace' });
            } catch (treeError) {
                console.warn('Failed to refresh file tree:', treeError.message);
            }
            
            // Broadcast to other clients in room
            socket.to(roomId).emit('docker:file-deleted', { path });
            
        } catch (error) {
            console.error('Error deleting file:', error);
            const errorMessage = error.message || 'Failed to delete file';
            socket.emit('docker:file-error', { error: errorMessage, operation: 'delete-file', path });
            socket.emit('docker:file-deleted', { path, success: false, error: errorMessage });
        }
    });

    socket.on('docker:read-file', async ({ roomId, containerId, path }) => {
        try {
            console.log(`📖 Reading file: ${path} in room ${roomId}`);
            
            if (!path || path.trim() === '') {
                throw new Error('File path is required');
            }
            
            const content = await dockerService.readFile(roomId, path);
            socket.emit('docker:file-content', { path, content });
            
        } catch (error) {
            console.error('Error reading file:', error);
            const errorMessage = error.message || 'Failed to read file';
            socket.emit('docker:file-error', { error: errorMessage, operation: 'read-file', path });
            socket.emit('docker:file-content', { path, content: '', error: errorMessage });
        }
    });

    socket.on('docker:write-file', async ({ roomId, containerId, path, content }) => {
        try {
            console.log(`💾 Writing file: ${path} in room ${roomId} (${content?.length || 0} bytes)`);
            
            // Validate inputs
            if (!path || path.trim() === '') {
                throw new Error('File path is required');
            }
            
            if (content === undefined || content === null) {
                throw new Error('File content is required');
            }
            
            await dockerService.writeFile(roomId, path, content);
            socket.emit('docker:file-saved', { path, success: true });
            
            // Refresh file tree to show updated file size/date
            try {
                const files = await dockerService.getFileTree(roomId, '/workspace');
                socket.emit('docker:file-tree', { files, path: '/workspace' });
            } catch (treeError) {
                console.warn('Failed to refresh file tree:', treeError.message);
            }
            
            // Broadcast file change to other clients (but not the content to avoid loops)
            socket.to(roomId).emit('docker:file-changed', { path, timestamp: new Date().toISOString() });
            
        } catch (error) {
            console.error('Error writing file:', error);
            const errorMessage = error.message || 'Failed to save file';
            socket.emit('docker:file-error', { error: errorMessage, operation: 'write-file', path });
            socket.emit('docker:file-saved', { path, success: false, error: errorMessage });
        }
    });

    socket.on('docker:upload-file', async ({ roomId, containerId, fileName, content, path = '/workspace' }) => {
        try {
            const filePath = `${path}/${fileName}`.replace(/\/+/g, '/'); // Clean up double slashes
            console.log(`⬆️ Uploading file: ${filePath} in room ${roomId}`);
            
            await dockerService.writeFile(roomId, filePath, content);
            socket.emit('docker:file-uploaded', { path: filePath, success: true });
            
            // Refresh file tree for all clients
            const files = await dockerService.getFileTree(roomId, '/workspace');
            io.to(roomId).emit('docker:file-tree', { files, path: '/workspace' });
        } catch (error) {
            console.error('Error uploading file:', error);
            socket.emit('docker:file-error', { error: error.message, operation: 'upload-file', path: fileName });
            socket.emit('docker:file-uploaded', { path: fileName, success: false, error: error.message });
        }
    });

    socket.on('docker:download-file', async ({ roomId, containerId, path }) => {
        try {
            console.log(`⬇️ Downloading file: ${path} in room ${roomId}`);
            const content = await dockerService.readFile(roomId, path);
            const fileName = path.split('/').pop();
            socket.emit('docker:file-download', { fileName, content, success: true });
        } catch (error) {
            console.error('Error downloading file:', error);
            socket.emit('docker:file-error', { error: error.message, operation: 'download-file', path });
            socket.emit('docker:file-download', { success: false, error: error.message });
        }
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.COMPILE_CODE, ({ roomId, code, language, username, inputs = [], executionMode = 'no-input', startTime }) => {
        console.log(`🚀 Compiling ${language} code in room ${roomId} with ${inputs.length} inputs`);
        const actualStartTime = startTime || Date.now();
        
        compileAndRunCode(code, language, inputs, (result) => {
            io.to(roomId).emit(ACTIONS.COMPILATION_RESULT, {
                result,
                username: userSocketMap[socket.id],
                executionTime: result.executionTime,
                inputs: inputs
            });
        });
    });

    socket.on(ACTIONS.SEND_MESSAGE, ({ roomId, message, username }) => {
        socket.in(roomId).emit(ACTIONS.RECEIVE_MESSAGE, {
            message,
            username,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('disconnecting', async () => {
        const rooms = [...socket.rooms];
        
        // Cleanup terminal connections
        if (socket.terminalStream && !socket.terminalStream.destroyed) {
            try {
                socket.terminalStream.end();
            } catch (e) {
                console.log('Terminal cleanup error:', e.message);
            }
        }
        
        // Remove terminal from container info
        if (socket.roomId && socket.terminalId) {
            try {
                const containerInfo = dockerService.containers.get(socket.roomId);
                if (containerInfo && containerInfo.terminals.has(socket.terminalId)) {
                    containerInfo.terminals.delete(socket.terminalId);
                }
            } catch (e) {
                console.log('Terminal map cleanup error:', e.message);
            }
        }
        
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        
        console.log(`👋 ${userSocketMap[socket.id]} disconnected`);
        delete userSocketMap[socket.id];
    });

    socket.on('error', (error) => {
        console.error('🔥 Socket error:', error);
    });
});

// Cleanup idle containers every 10 minutes
setInterval(() => {
    dockerService.cleanupIdleContainers();
}, 10 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down server...');
    
    // Cleanup all containers
    for (const [roomId] of dockerService.containers) {
        await dockerService.cleanup(roomId);
    }
    
    process.exit(0);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
});

// Enhanced 404 page with modern design
app.get('*', (req, res) => {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>404 — Page Not Found</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: linear-gradient(135deg, #1a1a2e, #16213e, #1a1a2e);
            color: #e2e8f0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            position: relative;
            overflow: hidden;
          }
          
          .background-grid {
            position: absolute;
            inset: 0;
            background-image: 
              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
            background-size: 50px 50px;
            z-index: 1;
          }
          
          .container {
            max-width: 800px;
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 40px;
            text-align: center;
            position: relative;
            z-index: 2;
            box-shadow: 0 25px 50px rgba(0,0,0,0.2);
            overflow: hidden;
          }
          
          .glowing-border {
            position: absolute;
            inset: 0;
            border: 2px solid transparent;
            border-radius: 24px;
            background: linear-gradient(45deg, #3b82f6, #8b5cf6, #06b6d4) border-box;
            -webkit-mask: 
              linear-gradient(#fff 0 0) padding-box, 
              linear-gradient(#fff 0 0);
            -webkit-mask-composite: destination-out;
            mask-composite: exclude;
            animation: borderGlow 4s linear infinite;
          }
          
          @keyframes borderGlow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          .error-code {
            font-size: 120px;
            font-weight: 800;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 20px;
            line-height: 1;
            position: relative;
          }
          
          .error-code::after {
            content: '404';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            color: rgba(59, 130, 246, 0.1);
            z-index: -1;
            transform: translateY(4px);
          }
          
          h1 {
            font-size: 32px;
            margin-bottom: 16px;
            color: #fff;
          }
          
          p {
            color: #94a3b8;
            margin-bottom: 32px;
            font-size: 18px;
            line-height: 1.6;
          }
          
          .btn-home {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
            position: relative;
            overflow: hidden;
          }
          
          .btn-home::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.2),
              transparent
            );
            transition: 0.5s;
          }
          
          .btn-home:hover::before {
            left: 100%;
          }
          
          .btn-home:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 40px rgba(59, 130, 246, 0.3);
          }
          
          .illustration {
            max-width: 400px;
            margin: 0 auto 40px;
          }
          
          .illustration img {
            width: 100%;
            height: auto;
            border-radius: 16px;
          }
          
          .floating-elements {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 1;
          }
          
          .floating-element {
            position: absolute;
            font-size: 24px;
            opacity: 0.3;
            animation: float 6s ease-in-out infinite;
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(10deg); }
          }
          
          @media (max-width: 640px) {
            .container { padding: 24px; }
            .error-code { font-size: 80px; }
            h1 { font-size: 24px; }
            p { font-size: 16px; }
            .btn-home { width: 100%; justify-content: center; }
          }
        </style>
      </head>
      <body>
        <div class="background-grid"></div>
        <div class="floating-elements">
          <div class="floating-element" style="top: 10%; left: 10%">⚛️</div>
          <div class="floating-element" style="top: 20%; right: 15%">💻</div>
          <div class="floating-element" style="bottom: 15%; left: 20%">🚀</div>
          <div class="floating-element" style="bottom: 25%; right: 10%">⚡</div>
        </div>
        <div class="container">
          <div class="glowing-border"></div>
          <div class="illustration">
            <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                 alt="Coding Illustration" />
          </div>
          <div class="error-code">404</div>
          <h1>Page Not Found</h1>
          <p>The page you're looking for seems to have wandered off into the digital void. Let's get you back to familiar territory.</p>
          <a href="/" class="btn-home">
            <span>← Return to Homepage</span>
          </a>
        </div>
      </body>
      </html>
    `);
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

    console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);


});