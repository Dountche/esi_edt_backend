const { Op } = require('sequelize');

const { Creneau, EmploiTemps, Classe, Attribution } = require('../models');

// Convertir une heure "HH:MM" en minutes
const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Créneaux autorisés
// Créneaux autorisés
const CRENEAUX_AUTORISES = [
  // Matin Standard
  { debut: '07:30', fin: '11:45' },
  // Matin EPS/Divisé
  { debut: '07:30', fin: '09:30' },
  { debut: '09:45', fin: '11:45' },

  // Après-midi Standard
  { debut: '14:00', fin: '18:15' },
  // Après-midi EPS/Divisé
  { debut: '14:00', fin: '16:00' },
  { debut: '16:15', fin: '18:15' }
];

// Groupes incompatibles (4h15 vs 2h + 2h)
const GROUPES_INCOMPATIBLES = [
  {
    long: { debut: '07:30', fin: '11:45' },
    courts: [
      { debut: '07:30', fin: '09:30' },
      { debut: '09:45', fin: '11:45' }
    ]
  },
  {
    long: { debut: '14:00', fin: '18:15' },
    courts: [
      { debut: '14:00', fin: '16:00' },
      { debut: '16:15', fin: '18:15' }
    ]
  }
];


// Vérifier si un créneau est dans la liste blanche
const estCreneauAutorise = (heure_debut, heure_fin) =>
  CRENEAUX_AUTORISES.some(c =>
    c.debut === heure_debut && c.fin === heure_fin
  );

const trouverGroupeIncompatible = (heure_debut, heure_fin) =>
  GROUPES_INCOMPATIBLES.find(g =>
    (g.long.debut === heure_debut && g.long.fin === heure_fin) ||
    g.courts.some(c => c.debut === heure_debut && c.fin === heure_fin)
  );

///service de vérification de disponibilité d'un créneau
const verifierDisponibilite = async (
  data,
  creneauIdExistant = null,
  transaction = null
) => {
  const {
    professeur_id,
    salle_id,
    jour_semaine,
    heure_debut,
    heure_fin,
    semaine_numero
  } = data;

  const conflits = [];

  // vérifier la validité des heures
  const debutMinutes = timeToMinutes(heure_debut);
  const finMinutes = timeToMinutes(heure_fin);

  if (finMinutes <= debutMinutes) {
    return {
      disponible: false,
      conflits: [{
        type: 'horaire_invalide',
        message: 'L\'heure de fin doit être postérieure à l\'heure de début'
      }]
    };
  }

  if (!estCreneauAutorise(heure_debut, heure_fin)) {
    return {
      disponible: false,
      conflits: [{
        type: 'creneau_non_autorise',
        message: 'Créneau non autorisé',
        creneaux_autorises: CRENEAUX_AUTORISES
      }]
    };
  }

  //verifier les incompatibilités 4h15 vs 2h + 2h
  const groupe = trouverGroupeIncompatible(heure_debut, heure_fin);

  if (groupe) {
    const creneauxExistants = await Creneau.findAll({
      where: {
        jour_semaine,
        semaine_numero,
        id: creneauIdExistant
          ? { [Op.ne]: creneauIdExistant }
          : { [Op.ne]: null },
        [Op.or]: [{ professeur_id }, { salle_id }]
      },
      transaction
    });

    const existeLong = creneauxExistants.some(c =>
      c.heure_debut === groupe.long.debut &&
      c.heure_fin === groupe.long.fin
    );

    const existeCourt = groupe.courts.some(court =>
      creneauxExistants.some(c =>
        c.heure_debut === court.debut &&
        c.heure_fin === court.fin
      )
    );

    if (
      heure_debut === groupe.long.debut &&
      heure_fin === groupe.long.fin &&
      existeCourt
    ) {
      return {
        disponible: false,
        conflits: [{
          type: 'incompatibilite_creneaux',
          message:
            'Un créneau long ne peut pas coexister avec des créneaux courts sur la même plage.'
        }]
      };
    }

    if (
      !(heure_debut === groupe.long.debut && heure_fin === groupe.long.fin) &&
      existeLong
    ) {
      return {
        disponible: false,
        conflits: [{
          type: 'incompatibilite_creneaux',
          message:
            'Un créneau court ne peut pas coexister avec un créneau long sur la même plage.'
        }]
      };
    }
  }

  // verifier les conflits de professeur
  const conflitsProfesseur = await Creneau.findAll({
    where: {
      professeur_id,
      jour_semaine,
      semaine_numero,
      id: creneauIdExistant
        ? { [Op.ne]: creneauIdExistant }
        : { [Op.ne]: null },
      heure_debut: { [Op.lt]: heure_fin },
      heure_fin: { [Op.gt]: heure_debut }
    },
    include: [{
      model: EmploiTemps,
      as: 'emploi_temps',
      include: [{
        model: Classe,
        as: 'classe',
        attributes: ['id', 'nom']
      }]
    }],
    transaction
  });

  conflitsProfesseur.forEach(c => {
    conflits.push({
      type: 'professeur',
      message: 'Le professeur a déjà un cours à ce créneau',
      creneau_existant: {
        id: c.id,
        jour: c.jour_semaine,
        heure_debut: c.heure_debut,
        heure_fin: c.heure_fin,
        classe: c.emploi_temps.classe.nom,
        semaine: c.semaine_numero
      }
    });
  });


  // verifier les conflits de salle
  const conflitsSalle = await Creneau.findAll({
    where: {
      salle_id,
      jour_semaine,
      semaine_numero,
      id: creneauIdExistant
        ? { [Op.ne]: creneauIdExistant }
        : { [Op.ne]: null },
      heure_debut: { [Op.lt]: heure_fin },
      heure_fin: { [Op.gt]: heure_debut }
    },
    include: [{
      model: EmploiTemps,
      as: 'emploi_temps',
      include: [{
        model: Classe,
        as: 'classe',
        attributes: ['id', 'nom']
      }]
    }],
    transaction
  });

  conflitsSalle.forEach(c => {
    conflits.push({
      type: 'salle',
      message: 'La salle est déjà occupée à ce créneau',
      creneau_existant: {
        id: c.id,
        jour: c.jour_semaine,
        heure_debut: c.heure_debut,
        heure_fin: c.heure_fin,
        classe: c.emploi_temps.classe.nom,
        semaine: c.semaine_numero
      }
    });
  });

  return {
    disponible: conflits.length === 0,
    conflits
  };
};

// Vérifier qu'une matière est bien attribuée à un professeur pour une classe et un semestre donnés
const verifierAttribution = async (
  matiere_id,
  professeur_id,
  classe_id,
  semestre_id,
  transaction = null
) => {
  const attribution = await Attribution.findOne({
    where: {
      matiere_id,
      professeur_id,
      classe_id,
      semestre_id
    },
    transaction
  });

  if (!attribution) {
    return {
      valide: false,
      message:
        'Aucune attribution trouvée pour ce professeur et cette matière dans cette classe'
    };
  }

  return { valide: true };
};

module.exports = {
  verifierDisponibilite,
  verifierAttribution
};
