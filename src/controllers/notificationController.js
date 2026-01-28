const { Notification } = require('../models');

/**
 * @desc Récupérer toutes les notifications de l'utilisateur connecté
 * @route GET /api/notifications?lu=false
 * @access Private (Authentifié)
 */
const getMesNotifications = async (req, res) => {
  try {
    const { lu } = req.query;

    // Construire les conditions
    const where = {
      user_id: req.user.id
    };

    if (lu !== undefined) {
      where.lu = lu === 'true';
    }

    const notifications = await Notification.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    // Compter les non lues
    const nonLues = await Notification.count({
      where: {
        user_id: req.user.id,
        lu: false
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        total: notifications.length,
        non_lues: nonLues
      }
    });

  } catch (error) {
    console.error('[Notifications] Erreur getMesNotifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Marquer une notification comme lue
 * @route PUT /api/notifications/:id/marquer-lu
 * @access Private (Authentifié)
 */
const marquerCommeLu = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByPk(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification introuvable'
      });
    }

    // Vérifier que la notification appartient à l'utilisateur
    if (notification.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé.'
      });
    }

    await notification.update({ lu: true });

    return res.status(200).json({
      success: true,
      message: 'Notification marquée comme lue',
      data: { notification }
    });

  } catch (error) {
    console.error('[Notifications] Erreur marquerCommeLu:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Marquer toutes les notifications comme lues
 * @route PUT /api/notifications/marquer-toutes-lues
 * @access Private (Authentifié)
 */
const marquerToutesLues = async (req, res) => {
  try {
    await Notification.update(
      { lu: true },
      {
        where: {
          user_id: req.user.id,
          lu: false
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Toutes les notifications ont été marquées comme lues'
    });

  } catch (error) {
    console.error('[Notifications] Erreur marquerToutesLues:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Supprimer une notification
 * @route DELETE /api/notifications/:id
 * @access Private (Authentifié)
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByPk(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification introuvable'
      });
    }

    // Vérifier que la notification appartient à l'utilisateur
    if (notification.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé.'
      });
    }

    await notification.destroy();

    console.log(`[Notifications] Notification supprimée - ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Notification supprimée avec succès'
    });

  } catch (error) {
    console.error('[Notifications] Erreur deleteNotification:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getMesNotifications,
  marquerCommeLu,
  marquerToutesLues,
  deleteNotification
};