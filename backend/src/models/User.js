const mongoose = require('mongoose');

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true, // stores bcrypt hash — never plaintext
    },
    role: {
      type: String,
      enum: ['doctor', 'receptionist'],
      required: true,
    },
    credentials: {
      type: String, // optional doctor title / credentials (e.g. "MD, Cardiology")
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    toJSON: {
      transform(_doc, ret) {
        delete ret.password; // never expose the hash in serialized output
        return ret;
      },
    },
  }
);

// Explicit unique index on email (redundant with unique:true but makes intent clear
// and allows the index to be referenced by name in error handling)
UserSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model('User', UserSchema);

module.exports = User;
