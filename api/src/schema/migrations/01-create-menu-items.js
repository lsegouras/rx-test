/*
 * 01-create-menu-items.js | Layer: Schema (migration)
 * Creates menu_items with the database constraints of PDF §4.1.
 * Must NOT insert data; the seed does that.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('menu_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false, unique: true },
      category: { type: Sequelize.STRING, allowNull: false },
      prep_time_minutes: { type: Sequelize.INTEGER, allowNull: false },
    });
    await queryInterface.addConstraint('menu_items', {
      type: 'check',
      name: 'menu_items_prep_time_minutes_positive',
      fields: ['prep_time_minutes'],
      where: { prep_time_minutes: { [Sequelize.Op.gt]: 0 } },
    });
    await queryInterface.addConstraint('menu_items', {
      type: 'check',
      name: 'menu_items_category_valid',
      fields: ['category'],
      where: { category: ['starter', 'main_course', 'dessert', 'drink'] },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('menu_items');
  },
};
