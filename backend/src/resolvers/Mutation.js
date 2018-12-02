const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');

const { transport, createEmail } = require('../mail');
const { hasPermission } = require('../utils');

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
    if (!ctx.request.userId) {
      throw new Error('You must be logged in to do that!');
    }

    const item = await ctx.db.mutation.createItem({
      data: {
        // This is how to create a Relationship between Item and User in Prisma
        user: {
          connect: {
            id: ctx.request.userId,
          }
        },
        ...args
      },
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
    const item = await ctx.db.query.item({ where }, `{ id title user { id permissions } }`);
    // 2. Check if user owns item/has permissions
    const ownsItem = item.user.id === ctx.request.userId;

    const hasPermissions = ctx.request.user && ctx.request.user.permissions.some(permission => ['ADMIN', 'ITEMDELETE'].includes(permission));
    if (!ownsItem || !hasPermissions) {
      throw new Error('You do not have the permission to do that.');
    }
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
  },
  async requestReset(parent, args, ctx, info) {
    // 1. Check if it's a real user
    const user = await ctx.db.query.user({ where: { email: args.email } });

    if (!user) {
      throw new Error(`No user found for email ${args.email}`);
    }

    // 2. Set reset token and expiry on the user
    const randomBytesPromisified = promisify(randomBytes);
    const resetToken = (await randomBytesPromisified(20)).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 Hour from now
    const res = await ctx.db.mutation.updateUser({
      where: { email: args.email },
      data: { resetToken, resetTokenExpiry }
    });
    // 3. Email user the reset token
    const mailRes = await transport.sendMail({
      from: 'giedriustiminskis@gmail.com',
      to: user.email,
      subject: 'Your Password Reset Token',
      html: createEmail(`
        Your password reset token is here!\n\n
        <a href="${process.env.FRONTEND_URL}/reset?resetToken=${resetToken}">Click here to reset.</a>
      `)
    });

    // 4. Return the message
    return { message: 'Password reset email sent.' };
  },
  async resetPassword(parent, args, ctx, info) {
    // 1. Check if the passwords match
    if (args.password !== args.confirmPassword) {
      throw new Error('Passwords do not match.');
    }
    // 2. Check if reset token is legit
    // 3. Check if reset token is expired
    const [user] = await ctx.db.query.users({
      where: {
        resetToken: args.resetToken,
        resetTokenExpiry_gte: Date.now() - 3600000,
      },
    });
    if (!user) {
      throw new Error('This token is invalid or expired.');
    }
    // 4. Hash the new password
    const password = await bcrypt.hash(args.password, 10);
    // 5. Save the new password to the user and remove old resetToken fields
    const updatedUser = await ctx.db.mutation.updateUser({
      where: { email: user.email },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
    // 6. Generate JWT
    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);
    // 7. Set the JWT cookie
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
    });
    // 8. Return the new user
    return updatedUser;
  },
  async updatePermissions(parent, args, ctx, info) {
    // 1. Check if user logged in
    if (!ctx.request.userId) {
      throw new Error('You must be logged in!');
    }
    // 2. Query the current user
    const currentUser = await ctx.db.query.user({
      where: {
        id: ctx.request.userId,
      }
    }, info);
    // 3. Check if the user has permissions to updat epermissions
    hasPermission(currentUser, ['ADMIN', 'PERMISSIONUPDATE']);
    // 4. Update permissions
    return ctx.db.mutation.updateUser({
      data: {
        permissions: {
          set: args.permissions, // Need to do this when it's enum in prisma
        }
      },
      where: {
        id: args.userId
      },
    }, info);
  },
  async addToCart(parent, args, ctx, info) {
    // 1. Make sure the user is signed in
    const { userId } = ctx.request;
    if (!userId) {
      throw new Error('You must be signed in!');
    }
    // 2. Query the users current cart
    const [existingCartItem] = await ctx.db.query.cartItems({
      where: {
        user: { id: userId },
        item: { id: args.id },
      },
    });
    // 3. Check if the item is already in their cart. Increment by 1 if it is
    if (existingCartItem) {
      return ctx.db.mutation.updateCartItem({
        where: { id: existingCartItem.id },
        data: { quantity: existingCartItem.quantity + 1 },
      }, info);
    }
    // 4. If the item is not in the cart, create a fresh CartItem for that user
    return ctx.db.mutation.createCartItem({
      data: {
        user: {
          connect: { id: userId },
        },
        item: { connect: { id: args.id } },
      },
    }, info);
  },
};

module.exports = Mutations;
