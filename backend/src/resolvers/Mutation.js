const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
  },
  async signup(parent, args, ctx, info) {
    args.email = args.email.toLowerCase();
    // Hash the password
    const password = await bcrypt.hash(args.password, 10);
    // Create the user in the database
    const user = await ctx.db.mutation.createUser({
      data: {
        ...args,
        password,
        permissions: { set: ['USER'] },
      }
    }, info);

    // Create a JWT token for the user
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    // Set JWT as cookie on the response
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
    });

    // Return the user to the browser
    return user;
  },
  async signin(parent, { email, password }, ctx, info) {
    // 1. Check if user with the email exists
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      throw new Error(`No user found for email ${email}`);
    }
    // 2. Check if the password is correct
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error('Invalid password');
    }
    // 3. Generate the JWT token
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    // 4. Set the cookie with the token
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
    });
    // 5. Return the user
    return user;
  },
  signout(parent, args, ctx, info) {
    ctx.response.clearCookie('token');
    return { message: 'Logged out succesfully. ' };
  }
};

module.exports = Mutations;
