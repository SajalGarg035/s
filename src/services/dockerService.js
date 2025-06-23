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

            const containerConfig = {
                Image: 'ubuntu:latest',
                name: `codesync-${roomId}`,
                Cmd: ['/bin/bash'],
                Tty: true,
                OpenStdin: true,
                WorkingDir: '/workspace',
                HostConfig: {
                    Memory: 512 * 1024 * 1024, // 512MB
                    CpuQuota: 50000, // 50% CPU
                    CpuPeriod: 100000,
                    NetworkMode: 'bridge', // Allow network for package installation
                    AutoRemove: true,
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

            // Install essential development tools
            try {
                console.log(`📦 Installing development tools in Ubuntu container...`);
                
                // Update package list
                await this.execInContainer(container, ['apt-get', 'update']);
                
                // Install essential packages
                await this.execInContainer(container, [
                    'apt-get', 'install', '-y',
                    'curl', 'wget', 'git', 'vim', 'nano', 'build-essential',
                    'python3', 'python3-pip', 'nodejs', 'npm',
                    'gcc', 'g++', 'make', 'cmake',
                    'openjdk-11-jdk',
                    'tree', 'htop', 'unzip', 'zip'
                ]);
                
                // Install code-server for enhanced editing (optional)
                console.log(`📝 Setting up additional tools...`);
                await this.execInContainer(container, [
                    'sh', '-c', 
                    'pip3 install --upgrade pip && ' +
                    'npm install -g typescript ts-node nodemon'
                ]);
                
            } catch (toolError) {
                console.warn(`⚠️ Some development tools failed to install:`, toolError.message);
                // Continue anyway - basic functionality should still work
            }

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
            }
            
            throw error;
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
                Cmd: ['/bin/bash', '-i'],  // Interactive bash shell
                AttachStdin: true,
                AttachStdout: true,
                AttachStderr: true,
                Tty: true,
                Env: [
                    'TERM=xterm-256color', 
                    'PS1=\\[\\033[01;32m\\]\\u@codesync\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ ',
                    'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
                ]
            });

            const stream = await exec.start({
                hijack: true,
                stdin: true,
                Tty: true
            });

            // Send initial setup commands
            setTimeout(() => {
                stream.write('cd /workspace\n');
                stream.write('export PS1="\\[\\033[01;32m\\]\\u@codesync\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ "\n');
                stream.write('clear\n');
                stream.write('echo "Welcome to CodeSync Ubuntu Environment!"\n');
                stream.write('echo "Available tools: python3, node, npm, gcc, g++, java, git"\n');
                stream.write('ls -la\n');
            }, 200);

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

    async getFileTree(roomId, targetPath = '/workspace') {
        try {
            const containerInfo = await this.getContainer(roomId);
            
            // Use ls -la to get detailed file information
            const exec = await containerInfo.container.exec({
                Cmd: ['sh', '-c', `find "${targetPath}" -maxdepth 3 | head -50`],
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
                        const files = this.parseFileTree(output, targetPath);
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

    async parseFileTree(output, basePath) {
        const lines = output.trim().split('\n').filter(line => line.trim());
        const files = [];
        
        for (const line of lines) {
            const fullPath = line.trim();
            if (!fullPath || fullPath === basePath) continue;
            
            const name = path.basename(fullPath);
            if (name && !name.startsWith('.')) {
                // Check if it's a directory by trying to stat it
                const isDir = await this.isDirectoryPath(fullPath, basePath);
                
                files.push({
                    name,
                    path: fullPath,
                    type: isDir ? 'directory' : 'file'
                });
            }
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
                stream.on('end', () => {
                    resolve(true); // test command succeeded, it's a directory
                });
                stream.on('error', () => {
                    resolve(false); // test command failed, it's a file
                });
            });
        } catch (error) {
            // If we can't determine, assume it's a file if it has an extension
            return !path.extname(filePath);
        }
    }

    async createFile(roomId, filePath, type = 'file', content = '') {
        try {
            const containerInfo = await this.getContainer(roomId);
            
            if (type === 'directory') {
                await this.execInContainer(containerInfo.container, ['mkdir', '-p', filePath]);
            } else {
                // Create parent directory if it doesn't exist
                const dir = path.dirname(filePath);
                if (dir !== '.' && dir !== '/') {
                    await this.execInContainer(containerInfo.container, ['mkdir', '-p', dir]);
                }

                // Create empty file or file with content
                if (content) {
                    await this.writeFile(roomId, filePath, content);
                } else {
                    await this.execInContainer(containerInfo.container, ['touch', filePath]);
                }
            }

            console.log(`✅ Created ${type}: ${filePath} in room ${roomId}`);
            return true;

        } catch (error) {
            console.error('❌ Error creating file:', error);
            throw error;
        }
    }

    async deleteFile(roomId, filePath) {
        try {
            const containerInfo = await this.getContainer(roomId);
            
            await containerInfo.container.exec({
                Cmd: ['rm', '-rf', filePath],
                AttachStdout: true,
                AttachStderr: true
            });

            console.log(`✅ Deleted: ${filePath} in room ${roomId}`);
            return true;

        } catch (error) {
            console.error('❌ Error deleting file:', error);
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
                
                stream.on('data', (chunk) => {
                    content += chunk.toString();
                });

                stream.on('end', () => {
                    resolve(content);
                });

                stream.on('error', reject);
            });

        } catch (error) {
            console.error('❌ Error reading file:', error);
            throw error;
        }
    }

    async writeFile(roomId, filePath, content) {
        try {
            const containerInfo = await this.getContainer(roomId);
            
            // Create parent directory if it doesn't exist
            const dir = path.dirname(filePath);
            if (dir !== '.') {
                await this.execInContainer(containerInfo.container, ['mkdir', '-p', dir]);
            }

            // Use cat with heredoc to avoid shell escaping issues
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

            // Write content and close
            stream.write(content);
            stream.end();

            return new Promise((resolve, reject) => {
                stream.on('end', () => {
                    console.log(`✅ Written file: ${filePath} in room ${roomId}`);
                    resolve(true);
                });

                stream.on('error', reject);
            });

        } catch (error) {
            console.error('❌ Error writing file:', error);
            throw error;
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

module.exports = new DockerService();
