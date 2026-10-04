/*
 * index.js | Layer: Schema (models)
 * Opens the Sequelize connection, registers the three models explicitly and links them.
 * Must NOT create or alter tables; the schema is created only by migrations (PDF §9.1).
 */
const { Sequelize } = require('sequelize');
const config = require('../../config');
const defineMenuItem = require('./menu-item');
const defineOrder = require('./order');
const defineOrderItem = require('./order-item');

const sequelize = new Sequelize(config.databaseUrl, {
  dialect: 'postgres',
  logging: config.dbLog ? console.log : false,
  // No columns beyond PDF §4 plus id: snake_case names and no createdAt / updatedAt.
  define: { underscored: true, timestamps: false },
});

const MenuItem = defineMenuItem(sequelize);
const Order = defineOrder(sequelize);
const OrderItem = defineOrderItem(sequelize);

Order.hasMany(OrderItem, { as: 'items', foreignKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
MenuItem.hasMany(OrderItem, { foreignKey: 'menu_item_id' });
OrderItem.belongsTo(MenuItem, { as: 'menuItem', foreignKey: 'menu_item_id' });

module.exports = { sequelize, MenuItem, Order, OrderItem };
