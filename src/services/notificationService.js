const { Notification, User } = require('../models');

/**
 * Créer une notification pour un utilisateur
 */
const creerNotification = async (userId, titre, message, type, transaction = null) => {
  try {
    const notification = await Notification.create({
      user_id: userId,
      titre,
      message,
      type,
      lu: false
    }, { transaction });

    console.log(`[NotificationService] Notification créée - User: ${userId}, Type: ${type}`);
    return notification;
  } catch (error) {
    console.error('[NotificationService] Erreur creerNotification:', error);
    throw error;
  }
};

/**
 * Créer des notifications pour plusieurs utilisateurs
 */
const creerNotificationsMultiples = async (userIds, titre, message, type, transaction = null) => {
  try {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      titre,
      message,
      type,
      lu: false
    }));

    await Notification.bulkCreate(notifications, { transaction });

    console.log(`[NotificationService] ${notifications.length} notifications créées - Type: ${type}`);
    return notifications.length;
  } catch (error) {
    console.error('[NotificationService] Erreur creerNotificationsMultiples:', error);
    throw error;
  }
};

/**
 * Notifier les étudiants d'une classe
 */
const notifierEtudiantsClasse = async (classeId, titre, message, type, transaction = null) => {
  try {
    const { Etudiant } = require('../models');
    
    const etudiants = await Etudiant.findAll({
      where: { classe_id: classeId },
      attributes: ['user_id'],
      transaction
    });

    const userIds = etudiants.map(e => e.user_id);

    if (userIds.length > 0) {
      await creerNotificationsMultiples(userIds, titre, message, type, transaction);
    }

    return userIds.length;
  } catch (error) {
    console.error('[NotificationService] Erreur notifierEtudiantsClasse:', error);
    throw error;
  }
};

/**
 * Notifier un RUP
 */
const notifierRUP = async (rupId, titre, message, type, transaction = null) => {
  try {
    await creerNotification(rupId, titre, message, type, transaction);
  } catch (error) {
    console.error('[NotificationService] Erreur notifierRUP:', error);
    throw error;
  }
};

module.exports = {
  creerNotification,
  creerNotificationsMultiples,
  notifierEtudiantsClasse,
  notifierRUP
};