import mongoose from 'mongoose'
import userSchema from '../models/userModel'

const User = mongoose.model('User', userSchema);

const addUser = async (req, res) => {
  if (req && Object.keys(req.body).length !== 0) {
    const newUser = new User(req.body);
    try {
      const user = await newUser.save();
      console.log('Created a new user for following data: ', req.body);
      res.status(200).json(user)
    } catch (error) {
      console.log({ error }, req.body, 'Error in creating a new user');
      res.status(500).send(error)
    }
  } else {
    console.log(req.body, 'Incorrect format used for creating a user');
    res.status(400).send({ error: 'Incorrect format used for creating a user' })
  }
};

const getUser = async (req, res) => {
  if (req && Object.keys(req.query).length === 0) {
    try {
      const user = await User.find({ deleted: false });
      console.log('Getting all users where deleted=false');
      res.status(200).json(user)
    } catch (error) {
      console.log({ error }, req.query, 'Error in finding all the users with deleted=false');
      res.status(500).send(error, ...req.query)
    }
  } else if (req.query.all) {
    try {
      const user = await User.find();
      console.log('Getting all users');
      res.status(200).json(user)
    } catch (error) {
      console.log({ error }, req.query, 'Error in finding all the users');
      res.status(500).send(error, ...req.query)
    }
  } else {
    let userData = {};
    const query = { deleted: false, ...req.query };
    try {
      const user = await User.findOne(query);
      if (user) {
        const ancestors = await user.ancestors();
        const subordinates = await user.subordinates();
        userData = {
          data: user,
          ancestors,
          subordinates
        };
        console.log('Getting user data for query: ', req.query);
        res.status(200).json(userData)
      } else {
        console.log({ query }, req.query, 'Finding a non-existent user');
        res.status(400).send({ error: 'No such user found', ...req.query })
      }
    } catch (error) {
      console.log({ error, query }, req.query, 'Error in finding the user');
      res.status(500).send(error, ...req.query)
    }
  }
};

const updateUser = async (req, res) => {
  if (
    req &&
    req.query &&
    Object.keys(req.query).length !== 0 &&
    Object.keys(req.body).length !== 0
  ) {
    try {
      if (req.body.deleted || req.body.parentId) {
        const user = await User.findOne(req.query);
        // we dont want to hard delete any user, hence just update
        if (req.body.deleted) {
          const softDeletedUser = await user.softDelete();
          console.log(`Soft deleted user: ${user._id}`);
          res.status(200).json(softDeletedUser)
        }
        // parent needs to be updated
        else if (req.body.parentId) {
          const parentUpdatedUser = await user.parentUpdate(req.body);
          console.log(`Updated ${user._id} parent to ${req.body.parentId}`);
          res.status(200).json(parentUpdatedUser)
        }
      } else {
        // only update personal data
        const updatedUser = await User.findOneAndUpdate(
          req.query,
          { $set: req.body },
          { useFindAndModify: false, new: true }
        );
        console.log(`Updated user data ${req.query} to: `, req.body);
        res.status(200).json(updatedUser)
      }
    } catch (err) {
      console.log(err, req.query, req.body, 'Error in updating the user');
      res.status(500).send(err, req.query, req.body)
    }
  } else {
    console.log(req.body, req.query, 'Incorrect format used for updating a user');
    res
      .status(400)
      .send({ error: 'Incorrect format used for updating a user', ...req.body, ...req.query })
  }
};

const deleteUser = async (req, res) => {
  if (req && req.query && Object.keys(req.query).length !== 0) {
    try {
      const user = await User.findOne(req.query);
      if (user) {
        const deletedUser = await user.remove(req.query);
        console.log(`Hard deleted user ${req.query}`);
        res.status(200).json(deletedUser)
      } else {
        console.log(req.query, 'Deleting a non-existent user');
        res.status(400).send({ error: 'No such user found', ...req.query })
      }
    } catch (error) {
      console.log({ error }, req.query, 'Error in deleting the user');
      res.status(500).send(error, ...req.query)
    }
  } else {
    console.log(req.body, 'Incorrect format used for deleting a user');
    res.status(400).send({ error: 'Incorrect format used for deleting a user' })
  }
};

export { addUser, getUser, updateUser, deleteUser }
