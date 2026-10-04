/*
 * menu-item.js | Layer: Schema (model)
 * Sequelize model of menu_items (PDF §4.1). Menu items come from the seed; there is no CRUD.
 * Must NOT hold queries or business rules.
 */
const { DataTypes } = require('sequelize');

const MENU_ITEM_CATEGORIES = ['starter', 'main_course', 'dessert', 'drink'];

/**
 * Defines the MenuItem model.
 * @param {import('sequelize').Sequelize} sequelize connection the model is registered on
 * @returns {import('sequelize').ModelStatic<import('sequelize').Model>} the MenuItem model
 * @see PDF §4.1
 */
function defineMenuItem(sequelize) {
  return sequelize.define(
    'MenuItem',
    {
      name: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { notEmpty: true } },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [MENU_ITEM_CATEGORIES] },
      },
      prep_time_minutes: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    },
    { tableName: 'menu_items' },
  );
}

module.exports = defineMenuItem;
