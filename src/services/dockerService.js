const Docker = require('dockerode');
const path = require('path');
const fs = require('fs');
const tar = require('tar-fs');

class DockerService {
    constructor() {
        this.containers = new Map(); // roomId -> container info
        this.docker = null;
        this.requiredImages = ['ubuntu:latest', 'ubuntu:20.04'];
        this.initDocker();
    }

    initDocker() {
        try {
            this.docker = new Docker({
                socketPath: '/var/run/docker.sock'
            });
        } catch (error) {
            console.error('❌ Failed to initialize Docker:', error.message);
            throw new Error('Docker initialization failed. Please check Docker installation and permissions.');
        }
    }

    async testDockerConnection() {
        try {
            await this.docker.ping();
            return true;
        } catch (error) {
            if (error.code === 'EACCES') {
                throw new Error('Permission denied connecting to Docker socket. Run: sudo chmod 666 /var/run/docker.sock');
            } else if (error.code === 'ENOENT') {
                throw new Error('Docker socket not found. Is Docker running?');
            } else if (error.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to Docker daemon. Is Docker running?');
            }
            throw error;
        }
    }

    async ensureImagesAvailable() {
        for (const imageName of this.requiredImages) {
            try {
                await this.docker.getImage(imageName).inspect();
                console.log(`✅ Image ${imageName} is available`);
            } catch (error) {
                if (error.statusCode === 404) {
                    console.log(`📦 Pulling image ${imageName}...`);
                    try {
                        await this.pullImage(imageName);
                        console.log(`✅ Successfully pulled ${imageName}`);
                    } catch (pullError) {
                        console.error(`❌ Failed to pull ${imageName}:`, pullError.message);
                        throw new Error(`Required Docker image ${imageName} not available and pull failed`);
                    }
                } else {
                    throw error;
                }
            }
        }
    }

    async pullImage(imageName) {
        return new Promise((resolve, reject) => {
            this.docker.pull(imageName, (err, stream) => {
                if (err) {
                    reject(err);
                    return;
                }

                this.docker.modem.followProgress(stream, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });
        });
    }

    async createContainer(roomId, options = {}) {
        try {
            // Test Docker connection first
            await this.testDockerConnection();
            
            // Ensure required images are available
            await this.ensureImagesAvailable();

            const containerName = `codesync-${roomId}`;

            // Check if container already exists and clean it up
            try {
                const existingContainer = this.docker.getContainer(containerName);
                const containerInfo = await existingContainer.inspect();
                
                console.log(`🔄 Found existing container ${containerName}, cleaning up...`);
                
                // Stop the container if it's running
                if (containerInfo.State.Running) {
                    await existingContainer.stop();
                }
                
                // Remove the container
                await existingContainer.remove();
                console.log(`🗑️ Removed existing container ${containerName}`);
                
            } catch (error) {
                // Container doesn't exist, which is fine
                if (error.statusCode !== 404) {
                    console.log('Cleanup error (non-critical):', error.message);
                }
            }

            const containerConfig = {
                Image: 'ubuntu:latest',
                name: containerName,
                Cmd: ['/bin/bash'],
                Tty: true,
                OpenStdin: true,
                WorkingDir: '/workspace',
                HostConfig: {
                    Memory: 512 * 1024 * 1024, // 512MB
                    CpuQuota: 50000, // 50% CPU
                    CpuPeriod: 100000,
                    NetworkMode: 'bridge', // Allow network for package installation
                    AutoRemove: false, // Don't auto-remove so we can manage it manually
                    Binds: options.binds || []
                },
                Env: [
                    'DEBIAN_FRONTEND=noninteractive',
                    'TERM=xterm-256color',
                    'LC_ALL=C.UTF-8',
                    'LANG=C.UTF-8'
                ],
                ...options
            };

            // Create container
            console.log(`🐳 Creating Ubuntu container for room ${roomId}...`);
            const container = await this.docker.createContainer(containerConfig);
            
            // Start container
            console.log(`🚀 Starting container ${container.id}...`);
            await container.start();

            // Create workspace directory
            await this.execInContainer(container, ['mkdir', '-p', '/workspace']);

            // Install essential development tools (in background to not block)
            this.installDevelopmentTools(container, roomId);

            const containerInfo = {
                id: container.id,
                container,
                roomId,
                createdAt: new Date(),
                terminals: new Map()
            };

            this.containers.set(roomId, containerInfo);
            
            console.log(`✅ Ubuntu container created for room ${roomId}: ${container.id}`);
            return containerInfo;

        } catch (error) {
            console.error('❌ Error creating container:', error);
            
            if (error.code === 'EACCES') {
                throw new Error('Permission denied connecting to Docker socket. Please add your user to the docker group: sudo usermod -aG docker $USER');
            } else if (error.code === 'ENOENT') {
                throw new Error('Docker socket not found. Please ensure Docker is installed and running.');
            } else if (error.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to Docker daemon. Please start Docker service.');
            } else if (error.message.includes('no such image')) {
                throw new Error('Required Docker image not found. Please run: docker pull ubuntu:latest');
            } else if (error.statusCode === 409) {
                // Container name conflict - try to clean up and retry once
                console.log('🔄 Container name conflict detected, attempting cleanup and retry...');
                try {
                    await this.forceCleanupContainer(roomId);
                    // Wait a moment for cleanup to complete
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    // Retry creation (but only once to avoid infinite recursion)
                    return await this.createContainer(roomId, { ...options, _retryAttempt: true });
                } catch (retryError) {
                    throw new Error(`Failed to create container after cleanup: ${retryError.message}`);
                }
            }
            
            throw error;
        }
    }

    async forceCleanupContainer(roomId) {
        const containerName = `codesync-${roomId}`;
        
        try {
            // List all containers with this name (including stopped ones)
            const containers = await this.docker.listContainers({ all: true });
            const matchingContainers = containers.filter(c => 
                c.Names.some(name => name === `/${containerName}`)
            );

            for (const containerData of matchingContainers) {
                const container = this.docker.getContainer(containerData.Id);
                
                try {
                    // Stop the container if it's running
                    if (containerData.State === 'running') {
                        await container.stop();
                    }
                    
                    // Remove the container
                    await container.remove();
                    console.log(`🗑️ Force removed container ${containerData.Id}`);
                } catch (cleanupError) {
                    console.log(`Cleanup error for ${containerData.Id}:`, cleanupError.message);
                }
            }
        } catch (error) {
            console.log('Force cleanup error:', error.message);
        }
    }

    async installDevelopmentTools(container, roomId) {
        try {
            console.log(`📦 Installing development tools for room ${roomId}...`);
            
            // Update package list and install essential tools
            const commands = [
                'apt-get update',
                'apt-get install -y curl wget vim nano git build-essential',
                'apt-get install -y python3 python3-pip nodejs npm',
                'apt-get clean'
            ];

            for (const cmd of commands) {
                try {
                    await this.execInContainer(container, ['sh', '-c', cmd]);
                } catch (error) {
                    console.log(`Tool installation warning: ${error.message}`);
                }
            }
            
            console.log(`✅ Development tools installed for room ${roomId}`);
        } catch (error) {
            console.log(`Development tools installation failed for room ${roomId}:`, error.message);
            // Don't throw error as this is non-critical
        }
    }

    async execInContainer(container, cmd) {
        const exec = await container.exec({
            Cmd: cmd,
            AttachStdout: true,
            AttachStderr: true
        });

        const stream = await exec.start();
        
        return new Promise((resolve, reject) => {
            let output = '';
            
            stream.on('data', (chunk) => {
                output += chunk.toString();
            });

            stream.on('end', () => {
                resolve(output);
            });

            stream.on('error', reject);
        });
    }

    async getContainer(roomId) {
        const containerInfo = this.containers.get(roomId);
        
        if (!containerInfo) {
            return await this.createContainer(roomId);
        }

        try {
            // Check if container is still running
            const containerData = await containerInfo.container.inspect();
            if (!containerData.State.Running) {
                // Container stopped, remove from map and create new one
                this.containers.delete(roomId);
                return await this.createContainer(roomId);
            }
            return containerInfo;
        } catch (error) {
            // Container doesn't exist, create new one
            this.containers.delete(roomId);
            return await this.createContainer(roomId);
        }
    }

    async createTerminal(roomId, terminalId) {
        try {
            const containerInfo = await this.getContainer(roomId);
            
            const exec = await containerInfo.container.exec({
                Cmd: ['/bin/bash'],
                AttachStdin: true,
                AttachStdout: true,
                AttachStderr: true,
                Tty: true,
                Env: [
                    'TERM=xterm-256color',
                    'HOME=/workspace',
                    'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
                    'PS1=\\u@container:\\w\\$ '
                ]
            });

            const stream = await exec.start({
                hijack: true,
                stdin: true,
                Tty: true
            });

            // Set up proper stream handling
            stream.setEncoding = () => {}; // Prevent encoding issues
            
            // Make sure the stream is writable
            console.log(`📝 Terminal stream created - writable: ${stream.writable}, readable: ${stream.readable}`);

            // Send initial setup commands after a short delay
            setTimeout(() => {
                try {
                    if (stream.writable) {
                        stream.write('cd /workspace\r');
                        stream.write('clear\r');
                        console.log(`✅ Initial commands sent to terminal ${terminalId}`);
                    }
                } catch (error) {
                    console.error('Error sending initial commands:', error);
                }
            }, 500);

            containerInfo.terminals.set(terminalId, {
                exec,
                stream,
                createdAt: new Date()
            });

            console.log(`✅ Ubuntu terminal created for room ${roomId}, terminal ${terminalId}`);
            return { exec, stream };

        } catch (error) {
            console.error('❌ Error creating terminal:', error);
            throw error;
        }
    }

    async writeFile(roomId, filePath, content) {
        try {
            const containerInfo = await this.getContainer(roomId);
            
            // Create parent directory if it doesn't exist
            const dir = require('path').dirname(filePath);
            if (dir !== '.' && dir !== '/') {
                await this.execInContainer(containerInfo.container, ['mkdir', '-p', dir]);
            }

            // Use a simpler approach with cat and stdin
            const exec = await containerInfo.container.exec({
                Cmd: ['sh', '-c', `cat > "${filePath}"`],
                AttachStdin: true,
                AttachStdout: true,
                AttachStderr: true
            });

            const stream = await exec.start({
                hijack: true,
                stdin: true
            });

            return new Promise((resolve, reject) => {
                let errorOutput = '';
                
                stream.on('data', (chunk) => {
                    const data = chunk.toString();
                    if (data.includes('No such file') || data.includes('Permission denied')) {
                        errorOutput += data;
                    }
                });

                stream.on('end', () => {
                    if (errorOutput) {
                        reject(new Error(errorOutput));
                    } else {
                        console.log(`✅ Written file: ${filePath} in room ${roomId}`);
                        resolve(true);
                    }
                });

                stream.on('error', (error) => {
                    reject(error);
                });

                // Write content and close stream
                try {
                    stream.write(content);
                    stream.end();
                } catch (writeError) {
                    reject(writeError);
                }
            });

        } catch (error) {
            console.error('❌ Error writing file:', error);
            throw error;
        }
    }

    async readFile(roomId, filePath) {
        try {
            const containerInfo = await this.getContainer(roomId);
            
            const exec = await containerInfo.container.exec({
                Cmd: ['cat', filePath],
                AttachStdout: true,
                AttachStderr: true
            });

            const stream = await exec.start();
            
            return new Promise((resolve, reject) => {
                let content = '';
                let errorOutput = '';
                
                stream.on('data', (chunk) => {
                    const data = chunk.toString();
                    // Check if this is stderr output (Docker combines stdout and stderr)
                    if (data.includes('No such file') || data.includes('Permission denied') || data.includes('cat:')) {
                        errorOutput += data;
                    } else {
                        content += data;
                    }
                });

                stream.on('end', () => {
                    if (errorOutput && content.length === 0) {
                        reject(new Error(`File not found or permission denied: ${filePath}`));
                    } else {
                        resolve(content);
                    }
                });

                stream.on('error', reject);
            });

        } catch (error) {
            console.error('❌ Error reading file:', error);
            throw error;
        }
    }

    async createFile(roomId, filePath, type = 'file', content = '') {
        try {
            const containerInfo = await this.getContainer(roomId);
            
            if (type === 'directory') {
                await this.execInContainer(containerInfo.container, ['mkdir', '-p', filePath]);
                console.log(`✅ Created directory: ${filePath} in room ${roomId}`);
            } else {
                // Create parent directory if it doesn't exist
                const dir = require('path').dirname(filePath);
                if (dir !== '.' && dir !== '/') {
                    await this.execInContainer(containerInfo.container, ['mkdir', '-p', dir]);
                }

                if (content) {
                    await this.writeFile(roomId, filePath, content);
                } else {
                    // Create empty file
                    await this.execInContainer(containerInfo.container, ['touch', filePath]);
                }
                console.log(`✅ Created file: ${filePath} in room ${roomId}`);
            }

            return true;

        } catch (error) {
            console.error('❌ Error creating file:', error);
            throw error;
        }
    }

    async deleteFile(roomId, filePath) {
        try {
            const containerInfo = await this.getContainer(roomId);
            
            const exec = await containerInfo.container.exec({
                Cmd: ['rm', '-rf', filePath],
                AttachStdout: true,
                AttachStderr: true
            });

            const stream = await exec.start();
            
            return new Promise((resolve, reject) => {
                let errorOutput = '';
                
                stream.on('data', (chunk) => {
                    const data = chunk.toString();
                    if (data.includes('No such file') || data.includes('Permission denied')) {
                        errorOutput += data;
                    }
                });

                stream.on('end', () => {
                    if (errorOutput) {
                        reject(new Error(errorOutput));
                    } else {
                        console.log(`✅ Deleted: ${filePath} in room ${roomId}`);
                        resolve(true);
                    }
                });

                stream.on('error', reject);
            });

        } catch (error) {
            console.error('❌ Error deleting file:', error);
            throw error;
        }
    }

    async getFileTree(roomId, targetPath = '/workspace') {
        try {
            const containerInfo = await this.getContainer(roomId);
            
            // Use ls -la to get file information
            const exec = await containerInfo.container.exec({
                Cmd: ['ls', '-la', targetPath],
                AttachStdout: true,
                AttachStderr: true
            });

            const stream = await exec.start();
            
            return new Promise((resolve, reject) => {
                let output = '';
                
                stream.on('data', (chunk) => {
                    output += chunk.toString();
                });

                stream.on('end', () => {
                    try {
                        const files = this.parseFileTreeSimple(output, targetPath);
                        resolve(files);
                    } catch (error) {
                        reject(error);
                    }
                });

                stream.on('error', reject);
            });

        } catch (error) {
            console.error('❌ Error getting file tree:', error);
            throw error;
        }
    }

    async parseFileTreeSimple(output, basePath) {
        const lines = output.trim().split('\n').filter(line => line.trim());
        const files = [];
        
        for (const line of lines) {
            if (!line.trim() || line.startsWith('total ')) continue;
            
            // Parse ls -la output: permissions, links, owner, group, size, date, time, name
            const parts = line.trim().split(/\s+/);
            if (parts.length < 9) continue;
            
            const permissions = parts[0];
            const size = parseInt(parts[4]) || 0;
            const name = parts.slice(8).join(' '); // Handle names with spaces
            
            // Skip . and .. entries
            if (name === '.' || name === '..') continue;
            
            // Skip hidden files (starting with .)
            if (name.startsWith('.')) continue;
            
            // Determine if it's a directory from permissions (first character 'd')
            const isDirectory = permissions.startsWith('d');
            
            const fullPath = basePath === '/' ? `/${name}` : `${basePath}/${name}`;
            
            files.push({
                name,
                path: fullPath,
                type: isDirectory ? 'directory' : 'file',
                permissions,
                size: isDirectory ? null : size
            });
        }

        return files.sort((a, b) => {
            // Directories first, then files
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    }

    async isDirectoryPath(filePath, roomId) {
        try {
            const containerInfo = this.containers.get(roomId);
            if (!containerInfo) return false;

            const exec = await containerInfo.container.exec({
                Cmd: ['test', '-d', filePath],
                AttachStdout: true,
                AttachStderr: true
            });

            const stream = await exec.start();
            
            return new Promise((resolve) => {
                let exitCode = 1;
                
                stream.on('end', () => {
                    resolve(exitCode === 0); // test returns 0 for success (directory exists)
                });
                
                stream.on('error', () => {
                    resolve(false);
                });
                
                // Get exit code from exec
                exec.inspect().then(data => {
                    exitCode = data.ExitCode || 1;
                }).catch(() => {
                    exitCode = 1;
                });
            });
        } catch (error) {
            // If we can't determine, assume it's a file if it has an extension
            return !require('path').extname(filePath);
        }
    }

    async cleanup(roomId) {
        try {
            const containerInfo = this.containers.get(roomId);
            if (containerInfo) {
                // Close all terminals
                containerInfo.terminals.forEach((terminal) => {
                    try {
                        terminal.stream.end();
                    } catch (e) {
                        console.log('Terminal cleanup error:', e.message);
                    }
                });

                // Stop and remove container
                try {
                    await containerInfo.container.stop();
                    await containerInfo.container.remove();
                } catch (e) {
                    console.log('Container cleanup error:', e.message);
                }

                this.containers.delete(roomId);
                console.log(`✅ Cleaned up container for room ${roomId}`);
            }
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }

    async cleanupIdleContainers() {
        const now = new Date();
        const maxIdleTime = 30 * 60 * 1000; // 30 minutes

        for (const [roomId, containerInfo] of this.containers.entries()) {
            const idleTime = now - containerInfo.createdAt;
            if (idleTime > maxIdleTime) {
                console.log(`🧹 Cleaning up idle container for room ${roomId}`);
                await this.cleanup(roomId);
            }
        }
    }
}

module.exports = DockerService;
