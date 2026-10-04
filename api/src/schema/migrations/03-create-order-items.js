/*
 * 03-create-order-items.js | Layer: Schema (migration)
 * Creates order_items, the join table of PDF §4.3, with its foreign keys and quantity check.
 * Must NOT insert data; the seed does that.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onDelete: 'CASCADE',
      },
      menu_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'menu_items', key: 'id' },
        onDelete: 'RESTRICT',
      },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
    });
    await queryInterface.addConstraint('order_items', {
      type: 'check',
      name: 'order_items_quantity_positive',
      fields: ['quantity'],
      where: { quantity: { [Sequelize.Op.gt]: 0 } },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_items');
  },
};
