// When operation is the same as defined in prisma.graphql we can use this helper to passs it through
const { forwardTo } = require('prisma-binding');
const { hasPermission } = require('../utils');
const Query = {
  // ===
  // async items(parent, args, ctx, info) {
  //   const items = await ctx.db.query.items();

  //   return items;
  // } 
  // same as:
  items: forwardTo('db'),
  item: forwardTo('db'),
  itemsConnection: forwardTo('db'),
  me(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      return null;
    }
    return ctx.db.query.user({
      where: { id: ctx.request.userId },
    }, info);
  },
  async users(parent, args, ctx, info) {
    // 1. Check if the user is logged in
    if (!ctx.request.userId) {
      throw new Error('You must be logged in!');
    }
    // 2. Check if the user has the permissions to query all users
    hasPermission(ctx.request.user, ['ADMIN', 'PERMISSIONUPDATE']);
    // 3. If the user has the permissions, query all the users
    return ctx.db.query.users({}, info);
  },
};

module.exports = Query;
