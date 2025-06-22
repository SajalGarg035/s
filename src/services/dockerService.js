const Docker = require('dockerode');
const path = require('path');
const fs = require('fs');
const tar = require('tar-fs');

class DockerService {
    constructor() {
        this.docker = new Docker();
        this.containers = new Map(); // roomId -> container info
    }

    async createContainer(roomId, options = {}) {
        try {
            const containerConfig = {
                Image: 'node:18-alpine',
                name: `codesync-${roomId}`,
                Cmd: ['/bin/sh'],
                Tty: true,
                OpenStdin: true,
                WorkingDir: '/workspace',
                HostConfig: {
                    Memory: 256 * 1024 * 1024, // 256MB
                    CpuQuota: 50000, // 50% CPU
                    CpuPeriod: 100000,
                    NetworkMode: 'none', // Disable network access
                    AutoRemove: true,
                    Binds: options.binds || []
                },
                Env: [
                    'NODE_ENV=development',
                    'TERM=xterm-256color'
                ],
                ...options
            };

            // Create container
            const container = await this.docker.createContainer(containerConfig);
            
            // Start container
            await container.start();

            // Create workspace directory
            await container.exec({
                Cmd: ['mkdir', '-p', '/workspace'],
                AttachStdout: true,
                AttachStderr: true
            });

            // Install common development tools
            await container.exec({
                Cmd: ['sh', '-c', 'apk add --no-cache python3 py3-pip gcc g++ make curl git vim nano'],
                AttachStdout: true,
                AttachStderr: true
            });

            const containerInfo = {
                id: container.id,
                container,
                roomId,
                createdAt: new Date(),
                terminals: new Map()
            };

            this.containers.set(roomId, containerInfo);
            
            console.log(`✅ Container created for room ${roomId}: ${container.id}`);
            return containerInfo;

        } catch (error) {
            console.error('❌ Error creating container:', error);
            throw error;
        }
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
                Cmd: ['/bin/sh'],
                AttachStdin: true,
                AttachStdout: true,
                AttachStderr: true,
                Tty: true
            });

            const stream = await exec.start({
                hijack: true,
                stdin: true
            });

            containerInfo.terminals.set(terminalId, {
                exec,
                stream,
                createdAt: new Date()
            });

            console.log(`✅ Terminal created for room ${roomId}, terminal ${terminalId}`);
            return { exec, stream };

        } catch (error) {
            console.error('❌ Error creating terminal:', error);
            throw error;
        }
    }

    async getFileTree(roomId, targetPath = '/workspace') {
        try {
            const containerInfo = await this.getContainer(roomId);
            
            const exec = await containerInfo.container.exec({
                Cmd: ['find', targetPath, '-type', 'f', '-o', '-type', 'd'],
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

    parseFileTree(output, basePath) {
        const lines = output.trim().split('\n').filter(line => line.trim());
        const fileMap = new Map();
        
        lines.forEach(line => {
            const fullPath = line.trim();
            if (!fullPath || fullPath === basePath) return;
            
            const relativePath = fullPath.replace(basePath, '').replace(/^\//, '');
            const parts = relativePath.split('/');
            const name = parts[parts.length - 1];
            
            if (name) {
                fileMap.set(fullPath, {
                    name,
                    path: fullPath,
                    type: fullPath.endsWith('/') ? 'directory' : 'file',
                    children: []
                });
            }
        });

        // Build tree structure
        const tree = [];
        const sortedPaths = Array.from(fileMap.keys()).sort();
        
        sortedPaths.forEach(fullPath => {
            const item = fileMap.get(fullPath);
            const parentPath = path.dirname(fullPath);
            
            if (parentPath === basePath || parentPath === '.') {
                tree.push(item);
            } else if (fileMap.has(parentPath)) {
                fileMap.get(parentPath).children.push(item);
            }
        });

        return tree;
    }

    async createFile(roomId, filePath, type = 'file', content = '') {
        try {
            const containerInfo = await this.getContainer(roomId);
            
            if (type === 'directory') {
                await containerInfo.container.exec({
                    Cmd: ['mkdir', '-p', filePath],
                    AttachStdout: true,
                    AttachStderr: true
                });
            } else {
                // Create parent directory if it doesn't exist
                const dir = path.dirname(filePath);
                await containerInfo.container.exec({
                    Cmd: ['mkdir', '-p', dir],
                    AttachStdout: true,
                    AttachStderr: true
                });

                // Create file with content
                await containerInfo.container.exec({
                    Cmd: ['sh', '-c', `echo "${content}" > "${filePath}"`],
                    AttachStdout: true,
                    AttachStderr: true
                });
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
            
            // Escape content for shell
            const escapedContent = content.replace(/'/g, "'\"'\"'");
            
            await containerInfo.container.exec({
                Cmd: ['sh', '-c', `echo '${escapedContent}' > "${filePath}"`],
                AttachStdout: true,
                AttachStderr: true
            });

            console.log(`✅ Written file: ${filePath} in room ${roomId}`);
            return true;

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
