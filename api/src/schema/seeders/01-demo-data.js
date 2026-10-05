/*
 * 01-demo-data.js | Layer: Schema (seed)
 * Demo data for the panel: menu items and orders that show every scenario of PDF §9.5.
 * Every date is an offset from the real UTC time of this seed run; it holds no calendar dates.
 * Re-runnable: it empties the three tables first. Must NOT be used by tests.
 */
const MS_PER_MINUTE = 60_000;

const MENU_ITEMS = [
  { name: 'Caesar Salad', category: 'starter', prep_time_minutes: 10 },
  { name: 'Grilled Salmon', category: 'main_course', prep_time_minutes: 20 },
  { name: 'Margherita Pizza', category: 'main_course', prep_time_minutes: 12 },
  { name: 'Chocolate Cake', category: 'dessert', prep_time_minutes: 8 },
  { name: 'Lemonade', category: 'drink', prep_time_minutes: 2 },
];

/** Orders of the demo. items are [menu item name, quantity]. */
function demoOrders(minutesAgo, minutesFromNow) {
  return [
    // Tie on score broken by promised_at: same type, VIP flag, items and placed_at as Fabio.
    // Their scores are equal; Elisa has a promised_at (too far away to add points), so she ranks above Fabio.
    {
      customer_name: 'Fabio Nunes',
      type: 'takeout',
      is_vip: false,
      status: 'received',
      placed_at: minutesAgo(25),
      promised_at: null,
      items: [['Margherita Pizza', 1], ['Chocolate Cake', 1]],
    },
    {
      customer_name: 'Elisa Rocha',
      type: 'takeout',
      is_vip: false,
      status: 'received',
      placed_at: minutesAgo(25),
      promised_at: minutesFromNow(180),
      items: [['Margherita Pizza', 1], ['Chocolate Cake', 1]],
    },
    // Wait-time cap: placed 2 hours ago, so wait points are at their maximum. dine_in, non-VIP.
    {
      customer_name: 'Ana Souza',
      type: 'dine_in',
      is_vip: false,
      status: 'received',
      placed_at: minutesAgo(120),
      promised_at: null,
      items: [['Caesar Salad', 1]],
    },
    // Complexity cap: 62 total prep minutes, so complexity points are at their maximum. takeout.
    {
      customer_name: 'Bruno Lima',
      type: 'takeout',
      is_vip: false,
      status: 'received',
      placed_at: minutesAgo(5),
      promised_at: minutesFromNow(45),
      items: [['Grilled Salmon', 3], ['Lemonade', 1]],
    },
    // PDF §5.3 example B: delivery, VIP, promised in 20 minutes.
    {
      customer_name: 'Carla Mendes',
      type: 'delivery',
      is_vip: true,
      status: 'received',
      placed_at: minutesAgo(10),
      promised_at: minutesFromNow(20),
      items: [['Margherita Pizza', 1]],
    },
    // PDF §5.3 example A: dine_in, non-VIP, no promise. Ties with Carla at seed time and ranks below her.
    {
      customer_name: 'Diego Alves',
      type: 'dine_in',
      is_vip: false,
      status: 'received',
      placed_at: minutesAgo(35),
      promised_at: null,
      items: [['Grilled Salmon', 2], ['Caesar Salad', 1]],
    },
    // preparing, in the active queue: dine_in VIP, the top of the queue at seed time.
    {
      customer_name: 'Gabriela Dias',
      type: 'dine_in',
      is_vip: true,
      status: 'preparing',
      placed_at: minutesAgo(50),
      promised_at: null,
      items: [['Margherita Pizza', 2]],
    },
    // preparing, in the active queue: delivery, non-VIP.
    {
      customer_name: 'Hugo Prado',
      type: 'delivery',
      is_vip: false,
      status: 'preparing',
      placed_at: minutesAgo(20),
      promised_at: minutesFromNow(50),
      items: [['Grilled Salmon', 1], ['Chocolate Cake', 1]],
    },
    // ready: stays out of the active queue.
    {
      customer_name: 'Iris Castro',
      type: 'takeout',
      is_vip: false,
      status: 'ready',
      placed_at: minutesAgo(40),
      promised_at: minutesFromNow(10),
      items: [['Margherita Pizza', 1]],
    },
    // Terminal statuses: stay out of the active queue.
    {
      customer_name: 'Joao Pires',
      type: 'dine_in',
      is_vip: false,
      status: 'picked_up',
      placed_at: minutesAgo(90),
      promised_at: null,
      items: [['Caesar Salad', 2]],
    },
    {
      customer_name: 'Karen Melo',
      type: 'delivery',
      is_vip: true,
      status: 'cancelled',
      placed_at: minutesAgo(30),
      promised_at: minutesFromNow(30),
      items: [['Lemonade', 2]],
    },
  ];
}

/** Maps a text column to the generated id, e.g. { 'Caesar Salad': 1 }. */
async function idsBy(queryInterface, table, column) {
  const [rows] = await queryInterface.sequelize.query(`SELECT id, ${column} AS key FROM ${table}`);
  return Object.fromEntries(rows.map((row) => [row.key, row.id]));
}

const EMPTY_TABLES = 'TRUNCATE order_items, orders, menu_items RESTART IDENTITY CASCADE';

module.exports = {
  async up(queryInterface) {
    // The only clock read of the seed: the real UTC instant of this run (PDF §9.5).
    const now = new Date();
    const minutesAgo = (minutes) => new Date(now.getTime() - minutes * MS_PER_MINUTE);
    const minutesFromNow = (minutes) => new Date(now.getTime() + minutes * MS_PER_MINUTE);
    const orders = demoOrders(minutesAgo, minutesFromNow);

    await queryInterface.sequelize.query(EMPTY_TABLES);
    await queryInterface.bulkInsert('menu_items', MENU_ITEMS);
    await queryInterface.bulkInsert('orders', orders.map(({ items, ...order }) => order));

    const menuItemIds = await idsBy(queryInterface, 'menu_items', 'name');
    const orderIds = await idsBy(queryInterface, 'orders', 'customer_name');
    const orderItems = orders.flatMap((order) =>
      order.items.map(([name, quantity]) => ({
        order_id: orderIds[order.customer_name],
        menu_item_id: menuItemIds[name],
        quantity,
      })),
    );
    await queryInterface.bulkInsert('order_items', orderItems);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(EMPTY_TABLES);
  },
};
