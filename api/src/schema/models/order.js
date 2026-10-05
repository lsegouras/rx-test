/*
 * order.js | Layer: Schema (model)
 * Sequelize model of orders (PDF §4.2). The database has defaults for placed_at and status; the Module sends both.
 * Must NOT list statuses or types: the validation reuses domain constants owned by the Module.
 */
const { DataTypes } = require('sequelize');
const { ORDER_TYPES } = require('../../module/priority');
const { ORDER_STATUSES } = require('../../module/transitions');

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
      type: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [ORDER_TYPES] } },
      placed_at: { type: DataTypes.DATE },
      promised_at: { type: DataTypes.DATE, allowNull: true },
      is_vip: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: DataTypes.STRING, validate: { isIn: [ORDER_STATUSES] } },
    },
    { tableName: 'orders' },
  );
}

module.exports = defineOrder;
