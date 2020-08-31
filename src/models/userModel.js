import mongoose from 'mongoose'
import uniqueValidator from 'mongoose-unique-validator';
import nestedSets from "../lib/nestedSets";

const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    unique: true,
    required: [true, "can't be blank"]
  },
  designation: {
    type: String,
    required: true
  },
  emailId: {
    type: String,
    unique: true,
    required: [true, "can't be blank"]
  },
  joiningDate: {
    type: Date,
    default: new Date()
  },
  deleted: {
    type: Boolean,
    default: false
  },
  reports: {
    type: Number,
    min: 0,
    default: 0
  },
  lft: {
    type: Number,
    min: 0,
    index: true
  },
  rgt: {
    type: Number,
    min: 0,
    index: true
  },
  parentId: {
    type: Schema.ObjectId,
    index: true
  }
});
userSchema.index({ lft: 1, rgt: 1 });
userSchema.plugin(nestedSets);
userSchema.plugin(uniqueValidator, {message: 'is already taken.'});

export default userSchema
