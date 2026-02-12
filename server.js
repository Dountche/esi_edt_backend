require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');


const app = require("./src/routes/app");

const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

// === Middleware global ===
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());
app.use(helmet());

// === Création serveur HTTP + WebSocket ===
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET','POST']
  },
  transports: ['websocket', 'polling']
});

// Injecter io dans req
app.use((req, res, next) => {
  req.io = io;
  next();
});


io.on('connection', (socket) => {
  console.log('Client connecté :', socket.id);
  socket.on('disconnect', () => console.log('Client déconnecté :', socket.id));
});

// === Démarrage serveur ===
(async () => {
  try {

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Serveur lancé sur http://localhost:${PORT}`);
      console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
    });

    process.on('SIGINT', async () => {
      console.log('Arrêt du serveur...');
    });

  } catch (err) {
    console.error('Erreur démarrage serveur :', err);
    process.exit(1);
  }
})();