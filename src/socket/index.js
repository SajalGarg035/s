import { io } from 'socket.io-client';

let socket = null;

export function initSocket() {
  if (!socket) {
    socket = io(
      process.env.REACT_APP_SERVER_URL || 'http://localhost:5000',
      {
        transports: ['websocket'],
        autoConnect: false,
        withCredentials: true
      }
    );
  }
  return new Promise((resolve, reject) => {
    socket.connect();
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (err) => reject(err));
  });
}
