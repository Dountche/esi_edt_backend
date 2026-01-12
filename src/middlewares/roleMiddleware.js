const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Accès refusé. Rôles autorisés : ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Middleware pour RUP uniquement
 */
const rupMiddleware = roleMiddleware('RUP');

/**
 * Middleware pour PROFESSEUR uniquement
 */
const professeurMiddleware = roleMiddleware('PROFESSEUR');

/**
 * Middleware pour ETUDIANT uniquement
 */
const etudiantMiddleware = roleMiddleware('ETUDIANT');

/**
 * Middleware pour RUP ou PROFESSEUR
 */
const rupOuProfesseurMiddleware = roleMiddleware('RUP', 'PROFESSEUR');

module.exports = {
  roleMiddleware,
  rupMiddleware,
  professeurMiddleware,
  etudiantMiddleware,
  rupOuProfesseurMiddleware
};