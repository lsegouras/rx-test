/*
 * order-item.js | Layer: Schema (model)
 * Sequelize model of order_items (PDF §4.3). It is its own model because the join row carries quantity.
 * Must NOT hold queries or business rules.
 */
const { DataTypes } = require('sequelize');

/**
 * Defines the OrderItem model.
 * @param {import('sequelize').Sequelize} sequelize connection the model is registered on
 * @returns {import('sequelize').ModelStatic<import('sequelize').Model>} the OrderItem model
 * @see PDF §4.3
 */
function defineOrderItem(sequelize) {
  return sequelize.define(
    'OrderItem',
    {
      order_id: { type: DataTypes.INTEGER, allowNull: false },
      menu_item_id: { type: DataTypes.INTEGER, allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    },
    { tableName: 'order_items' },
  );
}

module.exports = defineOrderItem;
