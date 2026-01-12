const { Etudiant, EmploiTemps, Creneau, Classe, Semestre, Matiere, Professeur, Salle, User, UniteEnseignement, Specialite, Filiere, Cycle } = require('../models');

const getMonEmploiTemps = async (req, res) => {
  try {
    // Récupérer l'étudiant connecté
    const etudiant = await Etudiant.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire']
        }
      ]
    });

    if (!etudiant) {
      return res.status(404).json({
        success: false,
        message: 'Profil étudiant introuvable'
      });
    }

    // Récupérer le semestre actif
    const semestreActif = await Semestre.findOne({
      where: { actif: true }
    });

    if (!semestreActif) {
      return res.status(404).json({
        success: false,
        message: 'Aucun semestre actif trouvé'
      });
    }

    // Récupérer l'emploi du temps de la classe
    const emploiTemps = await EmploiTemps.findOne({
      where: {
        classe_id: etudiant.classe_id,
        semestre_id: semestreActif.id
      },
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire'],
          include: [
            {
              model: Specialite,
              as: 'specialite',
              attributes: ['id', 'nom'],
              include: [
                { model: Filiere, as: 'filiere', attributes: ['id', 'nom'] },
                { model: Cycle, as: 'cycle', attributes: ['id', 'nom'] }
              ]
            }
          ]
        },
        {
          model: Semestre,
          as: 'semestre',
          attributes: ['id', 'nom', 'date_debut', 'date_fin']
        },
        {
          model: Creneau,
          as: 'creneaux',
          include: [
            {
              model: Matiere,
              as: 'matiere',
              attributes: ['id', 'nom', 'code', 'coefficient', 'volume_horaire']
            },
            {
              model: Professeur,
              as: 'professeur',
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'nom', 'prenom']
                }
              ]
            },
            {
              model: Salle,
              as: 'salle',
              attributes: ['id', 'nom', 'type']
            }
          ]
        }
      ]
    });

    if (!emploiTemps) {
      return res.status(404).json({
        success: false,
        message: 'Aucun emploi du temps trouvé pour votre classe'
      });
    }

    // Organiser les créneaux par jour et par semaine
    const creneauxParJour = {};
    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    
    jours.forEach(jour => {
      creneauxParJour[jour] = emploiTemps.creneaux.filter(c => c.jour_semaine === jour);
    });

    return res.status(200).json({
      success: true,
      data: {
        etudiant: {
          id: etudiant.id,
          matricule: etudiant.matricule,
          classe: etudiant.classe
        },
        emploi_temps: {
          id: emploiTemps.id,
          classe: emploiTemps.classe,
          semestre: emploiTemps.semestre,
          statut: emploiTemps.statut,
          creneaux_par_jour: creneauxParJour,
          total_creneaux: emploiTemps.creneaux.length
        }
      }
    });

  } catch (error) {
    console.error('[EtudiantConsultation] Erreur getMonEmploiTemps:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'emploi du temps',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


const getMaMaquette = async (req, res) => {
  try {
    // Récupérer l'étudiant connecté
    const etudiant = await Etudiant.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire'],
          include: [
            {
              model: Specialite,
              as: 'specialite',
              attributes: ['id', 'nom'],
              include: [
                { model: Filiere, as: 'filiere', attributes: ['id', 'nom'] },
                { model: Cycle, as: 'cycle', attributes: ['id', 'nom'] }
              ]
            }
          ]
        }
      ]
    });

    if (!etudiant) {
      return res.status(404).json({
        success: false,
        message: 'Profil étudiant introuvable'
      });
    }

    // Récupérer toutes les UE de la classe avec leurs matières
    const ues = await UniteEnseignement.findAll({
      where: { classe_id: etudiant.classe_id },
      include: [
        {
          model: Matiere,
          as: 'matieres',
          attributes: ['id', 'nom', 'code', 'coefficient', 'volume_horaire', 'periode'],
          include: [
            {
              model: require('../models').Attribution,
              as: 'attributions',
              include: [
                {
                  model: Professeur,
                  as: 'professeur',
                  include: [
                    {
                      model: User,
                      as: 'user',
                      attributes: ['id', 'nom', 'prenom']
                    }
                  ]
                },
                {
                  model: Semestre,
                  as: 'semestre',
                  attributes: ['id', 'nom', 'actif']
                }
              ]
            }
          ]
        }
      ],
      order: [
        ['code', 'ASC'],
        [{ model: Matiere, as: 'matieres' }, 'code', 'ASC']
      ]
    });

    // Calculer les totaux
    let coefficientTotal = 0;
    let volumeHoraireTotal = 0;

    ues.forEach(ue => {
      coefficientTotal += parseFloat(ue.coefficient_total) || 0;
      volumeHoraireTotal += parseInt(ue.volume_horaire_total) || 0;
    });

    return res.status(200).json({
      success: true,
      data: {
        etudiant: {
          id: etudiant.id,
          matricule: etudiant.matricule,
          classe: etudiant.classe
        },
        maquette: {
          unites_enseignement: ues,
          totaux: {
            coefficient_total: coefficientTotal,
            volume_horaire_total: volumeHoraireTotal,
            nombre_ues: ues.length,
            nombre_matieres: ues.reduce((total, ue) => total + (ue.matieres ? ue.matieres.length : 0), 0)
          }
        }
      }
    });

  } catch (error) {
    console.error('[EtudiantConsultation] Erreur getMaMaquette:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la maquette',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getMonEmploiTemps,
  getMaMaquette
};