const express = require("express");
const jwt = require("jsonwebtoken");
const { requireUser } = require("./utils.js");
const { UnauthorizedError } = require("../errors");
const { getUserByUsername, createUser, getUser, getOrdersByUser } = require("../db");

const usersRouter = express.Router();

// POST /api/users/register
usersRouter.post("/register", async (req, res, next) => {
  const { username, password } = req.body;
  try {
    const _user = await getUserByUsername(username);

    if (_user) {
      next({
        message: `User ${username} is already taken.`,
        name: UserTakenError(username),
        error: UserTakenError(username),
      });
    }

    if (password.length < 8) {
      next({
        message: "Password Too Short!",
        name: PasswordTooShortError(),
        error: PasswordTooShortError(),
      });
    }

    const user = await createUser({
      username,
      password,
    });

    const token = jwt.sign(user, process.env.JWT_SECRET);

    res.send({
      message: "Thank you for registering.",
      token,
      user: user,
    });
  } catch (error) {
    next({
      message: error.message,
      name: error.name,
      error: "Error",
    });
  }
});

// POST /api/users/login
usersRouter.post("/login", async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return next({
      name: "MissingUsernameOrPasswordError",
      message: "You must enter a username and password",
    });
  }

  try {
    const user = await getUser({ username, password });
    if (!user) {
      return next({
        name: "IncorrectUsernameOrPasswordError",
        message: "Username or password is incorrect",
      });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
    res.send({ message: "you're logged in!", token, user });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// GET /api/users/me
usersRouter.get("/me", requireUser, async (req, res, next) => {
  try {
    if (req.user) {
      res.send(req.user);
    }
  } catch (err) {
    console.log(err.message);
    next({
      error: UnauthorizedError(),
      name: UnauthorizedError(),
      message: "You must be logged in to perform this action",
    });
  }
});

// GET /api/users/:username/orders
usersRouter.get("/:username/orders", requireUser, async (req, res, next) => {
  try {
    if (req.user && req.user.username === req.params.username) {
      const orders = await getOrdersByUser(req.user);
      res.send(orders);
    } else {
      const user = await getUserByUsername(req.params.username);
      if (!user) {
        next({
          name: "NoUserError",
          message: "User does not exist.",
        });
      }
      const orders = await getOrdersByUser(user);
      res.send(orders);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = usersRouter;
