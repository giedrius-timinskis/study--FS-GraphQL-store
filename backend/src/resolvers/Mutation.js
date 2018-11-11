// This is a RESOLVER for retrieving data via a GraphQL interface from Prisma
// Look at ../generated/prisma.graphql for the API of methods available

const Mutations = {
  // createItem returns a promise
  async createItem(
    parent,
    args, // data passed into the query
    ctx, // context, contains the database defined in generated/prisma.graphql
    info // ???, definitely contains a FE query
  ) {
    // TODO: Check if user is logged in before creating
    const item = await ctx.db.mutation.createItem({
      data: { ...args },
    }, info)

    return item;
  },
  updateItem(
    parent,
    args,
    ctx,
    info
  ) {
    // first take copy of the updates
    const updates = { ...args };
    // Remove ID from the updates because we don't want to be changing it
    delete updates.id;
    // Run update method
    return ctx.db.mutation.updateItem({
      data: updates,
      where: {
        id: args.id,
      }
    }, info);
  },
  async deleteItem(
    parent,
    args,
    ctx,
    info
  ) {
    const where = { id: args.id };
    // 1. Find the item
    const item = await ctx.db.query.item({ where }, `{ id title }`);
    // 2. Check if user owns item/has permissions
    // TODO:
    // 3. Delete it.
    return ctx.db.mutation.deleteItem({ where }, info);
  }
};

module.exports = Mutations;
