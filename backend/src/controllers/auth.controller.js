const { validationResult } = require('express-validator');
const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const Hospital = require('../models/Hospital');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

// @desc   Register a new user
// @route  POST /api/v1/auth/register
// @access Public
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, 'Validation failed', errors.array());
    }

    const { name, email, password, role, phone } = req.body;

    // Check duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, 409, 'An account with this email already exists.');
    }

    // Create user
    const user = await User.create({ name, email, password, role, phone });

    // Create role-specific profile
    if (role === 'patient') {
      await PatientProfile.create({ user: user._id });
    } else if (role === 'doctor') {
      const { specialization, registrationNumber, experience } = req.body;
      if (!specialization) {
        return sendError(res, 400, 'Specialization is required for doctor registration.');
      }
      await DoctorProfile.create({
        user: user._id,
        specialization,
        registrationNumber: registrationNumber || '',
        experience: Number(experience) || 0,
        isVerified: false,
      });
    } else if (role === 'hospital') {
      const { hospitalName, registrationNumber, type } = req.body;
      if (!hospitalName) {
        return sendError(res, 400, 'Hospital name is required for hospital registration.');
      }
      await Hospital.create({
        user: user._id,
        hospitalName,
        registrationNumber: registrationNumber || '',
        type: type || 'private',
      });
    }

    const token = user.generateToken();

    logger.info(`New ${role} registered: ${email}`);
    return sendSuccess(res, 201, 'Registration successful', {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Login user
// @route  POST /api/v1/auth/login
// @access Public
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, 'Validation failed', errors.array());
    }

    const { email, password } = req.body;

    // Explicitly select password (it's excluded by default)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return sendError(res, 401, 'Invalid email or password.');
    }

    if (!user.isActive) {
      return sendError(res, 403, 'Your account has been deactivated. Please contact support.');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid email or password.');
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = user.generateToken();

    logger.info(`User logged in: ${email} [${user.role}]`);
    return sendSuccess(res, 200, 'Login successful', {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get current authenticated user
// @route  GET /api/v1/auth/me
// @access Private
const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    let profile = null;

    if (user.role === 'patient') {
      profile = await PatientProfile.findOne({ user: user._id });
    } else if (user.role === 'doctor') {
      profile = await DoctorProfile.findOne({ user: user._id }).populate('hospital', 'hospitalName address');
    } else if (user.role === 'hospital') {
      profile = await Hospital.findOne({ user: user._id });
    }

    return sendSuccess(res, 200, 'Profile retrieved', { user, profile });
  } catch (error) {
    next(error);
  }
};

// @desc   Update current user profile
// @route  PATCH /api/v1/auth/profile
// @access Private
const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, 'Validation failed', errors.array());
    }

    const { name, phone } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    });

    // Update role-specific profile fields
    const profileData = req.body.profile || {};
    if (Object.keys(profileData).length > 0) {
      if (user.role === 'patient') {
        await PatientProfile.findOneAndUpdate(
          { user: user._id },
          profileData,
          { new: true, runValidators: true, upsert: true }
        );
      } else if (user.role === 'doctor') {
        const allowedDoctorFields = ['bio', 'languages', 'consultationFee', 'isAcceptingAppointments', 'availability'];
        const doctorUpdate = {};
        allowedDoctorFields.forEach((f) => {
          if (profileData[f] !== undefined) doctorUpdate[f] = profileData[f];
        });
        if (Object.keys(doctorUpdate).length > 0) {
          await DoctorProfile.findOneAndUpdate({ user: user._id }, doctorUpdate, { new: true });
        }
      } else if (user.role === 'hospital') {
        const allowedHospitalFields = ['operatingHours', 'facilities', 'departments', 'taxRate'];
        const hospitalUpdate = {};
        allowedHospitalFields.forEach((f) => {
          if (profileData[f] !== undefined) hospitalUpdate[f] = profileData[f];
        });
        if (Object.keys(hospitalUpdate).length > 0) {
          await Hospital.findOneAndUpdate({ user: user._id }, hospitalUpdate, { new: true });
        }
      }
    }

    return sendSuccess(res, 200, 'Profile updated successfully', { user });
  } catch (error) {
    next(error);
  }
};

// @desc   Logout (client-side token removal; documented for clarity)
// @route  POST /api/v1/auth/logout
// @access Private
const logout = (req, res) => {
  return sendSuccess(res, 200, 'Logged out successfully. Please discard your token.');
};

module.exports = { register, login, getMe, updateProfile, logout };
