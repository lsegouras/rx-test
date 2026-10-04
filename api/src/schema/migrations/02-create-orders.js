/*
 * 02-create-orders.js | Layer: Schema (migration)
 * Creates orders (PDF §4.2). type and status are VARCHAR on purpose: their valid values
 * are domain constants owned by the Module, so a status rule change needs no migration.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      customer_name: { type: Sequelize.STRING, allowNull: false },
      type: { type: Sequelize.STRING, allowNull: false },
      placed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      promised_at: { type: Sequelize.DATE, allowNull: true },
      is_vip: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'received' },
    });
    // The queue always filters by status.
    await queryInterface.addIndex('orders', ['status'], { name: 'orders_status_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('orders');
  },
};
