/*
 * orders.repository.js | Layer: Repository
 * Data access for orders: Sequelize queries that return plain objects, never model instances.
 * Must NOT score, sort by priority, decide which statuses are active or throw domain errors.
 */
const { sequelize, Order, OrderItem, MenuItem } = require('../schema/models');

/** Flattens an Order instance and its included items into the plain shape the Module works with. */
function toPlainOrder(order) {
  return {
    id: order.id,
    customer_name: order.customer_name,
    type: order.type,
    is_vip: order.is_vip,
    status: order.status,
    placed_at: order.placed_at,
    promised_at: order.promised_at,
    items: order.items.map((item) => ({
      name: item.menuItem.name,
      quantity: item.quantity,
      prep_time_minutes: item.menuItem.prep_time_minutes,
    })),
  };
}

/**
 * Orders in any of the given statuses, with their items and menu items, in one query (no N+1).
 * @param {readonly string[]} statuses chosen by the Module
 * @returns {Promise<object[]>} plain orders, in no particular order
 * @see PDF §9.1
 */
async function findByStatuses(statuses) {
  const orders = await Order.findAll({
    where: { status: statuses },
    include: [{ model: OrderItem, as: 'items', include: [{ model: MenuItem, as: 'menuItem' }] }],
  });
  return orders.map(toPlainOrder);
}

/**
 * @param {number} id
 * @returns {Promise<{ id: number, status: string } | null>} null when no order has this id
 */
async function findById(id) {
  return Order.findByPk(id, { attributes: ['id', 'status'], raw: true });
}

/**
 * Sets the status only if the order still has the expected one (UPDATE ... WHERE id AND status).
 * @param {number} id
 * @param {string} from status the caller validated
 * @param {string} to new status
 * @returns {Promise<number>} rows changed: 1, or 0 when the status was no longer `from`
 */
async function updateStatusIfCurrent(id, from, to) {
  const [affectedRows] = await Order.update({ status: to }, { where: { id, status: from } });
  return affectedRows;
}

/**
 * @param {number[]} ids
 * @returns {Promise<{ id: number }[]>} the menu items that exist among the given ids
 */
async function findMenuItemsByIds(ids) {
  return MenuItem.findAll({ where: { id: ids }, attributes: ['id'], raw: true });
}

/**
 * Inserts an order and its items in one transaction: both are stored, or neither.
 * @param {{ customer_name: string, type: string, is_vip: boolean, status: string, placed_at: Date,
 *   promised_at: Date | null, items: { menu_item_id: number, quantity: number }[] }} order
 * @returns {Promise<{ id: number, status: string, placed_at: Date }>}
 * @see PDF §11.1
 */
async function createOrder({ items, ...order }) {
  return sequelize.transaction(async (transaction) => {
    const created = await Order.create(order, { transaction });
    const rows = items.map((item) => ({ ...item, order_id: created.id }));
    await OrderItem.bulkCreate(rows, { transaction, validate: true });
    return { id: created.id, status: created.status, placed_at: created.placed_at };
  });
}

module.exports = {
  findByStatuses,
  findById,
  updateStatusIfCurrent,
  findMenuItemsByIds,
  createOrder,
};
