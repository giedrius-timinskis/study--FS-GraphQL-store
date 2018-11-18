// When operation is the same as defined in prisma.graphql we can use this helper to passs it through
const { forwardTo } = require('prisma-binding');

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
  }
};

module.exports = Query;
