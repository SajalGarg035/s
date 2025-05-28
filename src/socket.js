import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempt: 'Infinity',
        timeout: 20000,
        transports: ['websocket'],
    };
    
    return io('http://72.145.9.233:5000', options);
};