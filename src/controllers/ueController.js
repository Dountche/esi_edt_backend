const Joi = require('joi');
const { UniteEnseignement, Classe, Matiere, Specialite, Filiere, Cycle } = require('../models');

const createUE = async (req, res) => {
  const schema = Joi.object({
    code: Joi.string().min(2).max(20).required(),
    nom: Joi.string().min(2).max(200).required(),
    classe_id: Joi.number().integer().required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { code, nom, classe_id } = value;

    // Vérifier que la classe existe
    const classe = await Classe.findByPk(classe_id);
    if (!classe) {
      return res.status(404).json({
        success: false,
        message: 'Classe introuvable'
      });
    }

    // Vérifier les permissions (RUP peut créer UE uniquement pour ses classes)
    if (req.user.role === 'RUP' && classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez créer des UE que pour vos propres classes.'
      });
    }

    // Vérifier si l'UE existe déjà
    const ueExists = await UniteEnseignement.findOne({
      where: { code, classe_id }
    });

    if (ueExists) {
      return res.status(400).json({
        success: false,
        message: 'Une UE avec ce code existe déjà pour cette classe'
      });
    }

    const ue = await UniteEnseignement.create({
      code,
      nom,
      classe_id,
      coefficient_total: 0,
      volume_horaire_total: 0
    });

    // Récupérer avec les relations
    const ueComplete = await UniteEnseignement.findByPk(ue.id, {
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

    console.log(`[UE] UE créée - ID: ${ue.id}, Code: ${code}, Classe: ${classe.nom}`);

    return res.status(201).json({
      success: true,
      message: 'Unité d\'enseignement créée avec succès',
      data: { ue: ueComplete }
    });

  } catch (error) {
    console.error('[UE] Erreur createUE:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'UE',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAllUEs = async (req, res) => {
  try {
    const { classe_id } = req.query;

    if (!classe_id) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre classe_id est requis'
      });
    }

    // Vérifier que la classe existe
    const classe = await Classe.findByPk(classe_id);
    if (!classe) {
      return res.status(404).json({
        success: false,
        message: 'Classe introuvable'
      });
    }

    // Vérifier les permissions (RUP ne peut voir que ses classes)
    if (req.user.role === 'RUP' && classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez voir les UE que de vos propres classes.'
      });
    }

    const ues = await UniteEnseignement.findAll({
      where: { classe_id },
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire']
        },
        {
          model: Matiere,
          as: 'matieres',
          attributes: ['id', 'nom', 'code', 'coefficient', 'volume_horaire']
        }
      ],
      order: [['code', 'ASC']]
    });

    // Ajouter le nombre de matières à chaque UE
    const uesWithCount = ues.map(ue => {
      const ueJSON = ue.toJSON();
      return {
        ...ueJSON,
        nombre_matieres: ueJSON.matieres ? ueJSON.matieres.length : 0
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        ues: uesWithCount,
        total: ues.length
      }
    });

  } catch (error) {
    console.error('[UE] Erreur getAllUEs:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des UE',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getUEById = async (req, res) => {
  try {
    const { id } = req.params;

    const ue = await UniteEnseignement.findByPk(id, {
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom', 'annee_scolaire', 'rup_id'],
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
          model: Matiere,
          as: 'matieres',
          attributes: ['id', 'nom', 'code', 'coefficient', 'volume_horaire', 'periode']
        }
      ]
    });

    if (!ue) {
      return res.status(404).json({
        success: false,
        message: 'UE introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && ue.classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé.'
      });
    }

    const ueJSON = ue.toJSON();
    ueJSON.nombre_matieres = ueJSON.matieres ? ueJSON.matieres.length : 0;

    return res.status(200).json({
      success: true,
      data: { ue: ueJSON }
    });

  } catch (error) {
    console.error('[UE] Erreur getUEById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'UE',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateUE = async (req, res) => {
  const schema = Joi.object({
    code: Joi.string().min(2).max(20).optional(),
    nom: Joi.string().min(2).max(200).optional()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { id } = req.params;
    const { code, nom } = value;

    const ue = await UniteEnseignement.findByPk(id, {
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'rup_id']
        }
      ]
    });

    if (!ue) {
      return res.status(404).json({
        success: false,
        message: 'UE introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && ue.classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez modifier que les UE de vos propres classes.'
      });
    }

    // Vérifier si le nouveau code existe déjà
    if (code && code !== ue.code) {
      const codeExists = await UniteEnseignement.findOne({
        where: { code, classe_id: ue.classe_id }
      });

      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Une UE avec ce code existe déjà pour cette classe'
        });
      }
    }

    await ue.update({ code, nom });

    // Récupérer avec les relations
    const ueComplete = await UniteEnseignement.findByPk(id, {
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'nom']
        },
        {
          model: Matiere,
          as: 'matieres',
          attributes: ['id', 'nom', 'code']
        }
      ]
    });

    console.log(`[UE] UE modifiée - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'UE modifiée avec succès',
      data: { ue: ueComplete }
    });

  } catch (error) {
    console.error('[UE] Erreur updateUE:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de l\'UE',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteUE = async (req, res) => {
  try {
    const { id } = req.params;

    const ue = await UniteEnseignement.findByPk(id, {
      include: [
        {
          model: Classe,
          as: 'classe',
          attributes: ['id', 'rup_id']
        },
        {
          model: Matiere,
          as: 'matieres'
        }
      ]
    });

    if (!ue) {
      return res.status(404).json({
        success: false,
        message: 'UE introuvable'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'RUP' && ue.classe.rup_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Vous ne pouvez supprimer que les UE de vos propres classes.'
      });
    }

    // Vérifier s'il y a des matières liées
    if (ue.matieres && ue.matieres.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer cette UE car des matières y sont liées',
        data: {
          nombre_matieres: ue.matieres.length
        }
      });
    }

    await ue.destroy();

    console.log(`[UE] UE supprimée - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'UE supprimée avec succès'
    });

  } catch (error) {
    console.error('[UE] Erreur deleteUE:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'UE',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createUE,
  getAllUEs,
  getUEById,
  updateUE,
  deleteUE
};