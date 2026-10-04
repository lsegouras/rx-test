/*
 * order.js | Layer: Schema (model)
 * Sequelize model of orders (PDF §4.2). placed_at and status get their defaults from the database.
 * Must NOT hold queries, scoring or transition rules.
 */
const { DataTypes } = require('sequelize');

/**
 * Defines the Order model.
 * @param {import('sequelize').Sequelize} sequelize connection the model is registered on
 * @returns {import('sequelize').ModelStatic<import('sequelize').Model>} the Order model
 * @see PDF §4.2
 */
function defineOrder(sequelize) {
  return sequelize.define(
    'Order',
    {
      customer_name: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } },
      type: { type: DataTypes.STRING, allowNull: false },
      placed_at: { type: DataTypes.DATE },
      promised_at: { type: DataTypes.DATE, allowNull: true },
      is_vip: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: DataTypes.STRING },
    },
    { tableName: 'orders' },
  );
}

module.exports = defineOrder;
