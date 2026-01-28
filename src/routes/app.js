const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// === Middlewares globaux ===
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// === Import des routes ===
const authRoutes = require('./auth');
const cycleRoutes = require('./cycles');
const filiereRoutes = require('./filieres');
const specialiteRoutes = require('./specialites');
const classeRoutes = require('./classes');
const salleRoutes = require('./salles');
const semestreRoutes = require('./semestres');
const ueRoutes = require('./ues');
const matiereRoutes = require('./matieres');
const professeurRoutes = require('./professeurs');
const etudiantRoutes = require('./etudiants');
const attributionRoutes = require('./attributions');
const emploiTempsRoutes = require('./emplois-temps');
const creneauRoutes = require('./creneaux');
const etudiantConsultationRoutes = require('./etudiant-consultation');
const professeurConsultationRoutes = require('./professeur-consultation');
const exportRoutes = require('./exports');
const domaineRoutes = require('./domaines');
const dfrRoutes = require('./dfrs');
const indisponibiliteRoutes = require('./indisponibilites');
const notificationRoutes = require('./notifications');
const dashboardRoutes = require('./dashboard');


// === Déclaration des routes ===
app.use('/api/auth', authRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/filieres', filiereRoutes);
app.use('/api/specialites', specialiteRoutes);
app.use('/api/classes', classeRoutes);
app.use('/api/salles', salleRoutes);
app.use('/api/semestres', semestreRoutes);
app.use('/api/ues', ueRoutes);
app.use('/api/matieres', matiereRoutes);
app.use('/api/teachers', professeurRoutes);
app.use('/api/students', etudiantRoutes);
app.use('/api/attributions', attributionRoutes);
app.use('/api/emplois-temps', emploiTempsRoutes);
app.use('/api/creneaux', creneauRoutes);
app.use('/api/etudiants/consultation', etudiantConsultationRoutes);
app.use('/api/professeurs/consultation', professeurConsultationRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/domaines', domaineRoutes);
app.use('/api/dfrs', dfrRoutes);
app.use('/api/indisponibilites', indisponibiliteRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Route de test
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenue sur l\'API de gestion des emplois du temps - ESI',
    version: '1.0.0',
    status: 'En développement',
    devs: 'J.K; K.idt & Lacoste le caîman argenté'
  });
});

// === Gestion des routes non trouvées ===
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// === Gestion des erreurs globales ===
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur serveur interne',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;