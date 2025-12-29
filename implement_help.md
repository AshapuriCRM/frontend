backend:

const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
{
name: {
type: String,
required: [true, "Employee name is required"],
trim: true,
maxlength: [100, "Employee name cannot be more than 100 characters"],
},
email: {
type: String,
lowercase: true,
trim: true,
match: [
/^\w+([.-]?\w+)_@\w+([.-]?\w+)_(\.[a-zA-Z]{2,})+$/,
        "Please enter a valid email",
      ],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^[+]?[\d\s-()]{10,15}$/, "Please enter a valid phone number"],
},
address: {
street: { type: String, trim: true },
city: { type: String, trim: true },
state: { type: String, trim: true },
pinCode: { type: String, trim: true },
country: { type: String, default: "India", trim: true },
},
category: {
type: String,
required: [true, "Job category is required"],
trim: true,
},
categoryId: {
type: mongoose.Schema.Types.ObjectId,
ref: "JobCategory",
},
dateJoined: {
type: Date,
required: [true, "Date joined is required"],
default: Date.now,
},
dob: {
type: Date,
},
salary: {
type: Number,
required: [true, "Salary is required"],
min: [0, "Salary cannot be negative"],
},
status: {
type: String,
enum: ["active", "inactive", "terminated", "on-leave"],
default: "active",
},
companyId: {
type: mongoose.Schema.Types.ObjectId,
ref: "Company",
required: [true, "Company ID is required"],
},
documents: {
aadhar: { type: String, trim: true },
pan: { type: String, trim: true, uppercase: true },
uan: { type: String, trim: true, uppercase: true },
bankAccount: {
accountNumber: {
type: String,
trim: true,
required: [true, "Account number is required"],
},
ifscCode: {
type: String,
trim: true,
uppercase: true,
required: [true, "IFSC code is required"],
},
bankName: {
type: String,
trim: true,
required: [true, "Bank name is required"],
},
},
photo: { type: String, trim: true },
},
emergencyContact: {
name: { type: String, trim: true },
relationship: { type: String, trim: true },
phone: { type: String, trim: true },
},
workSchedule: {
shiftType: {
type: String,
enum: ["day", "night", "rotating"],
default: "day",
},
workingDays: { type: Number, default: 26, min: 1, max: 31 },
workingHours: { type: Number, default: 8, min: 1, max: 24 },
},
pf: {
type: {
type: String,
enum: ["percentage", "fixed"],
default: "percentage",
},
value: {
type: Number,
min: [0, "PF value cannot be negative"],
default: 12,
},
},
esic: {
type: {
type: String,
enum: ["percentage", "fixed"],
default: "percentage",
},
value: {
type: Number,
min: [0, "ESIC value cannot be negative"],
default: 0.75,
},
},
createdBy: {
type: mongoose.Schema.Types.ObjectId,
ref: "User",
required: true,
},
},
{
timestamps: true,
toJSON: { virtuals: true },
toObject: { virtuals: true },
}
);

// Virtual for years of service
employeeSchema.virtual("yearsOfService").get(function () {
const now = new Date();
const joined = this.dateJoined;
return Math.floor((now - joined) / (365.25 _ 24 _ 60 _ 60 _ 1000));
});

// Indexes for better query performance
employeeSchema.index({ companyId: 1, status: 1 });
employeeSchema.index({ email: 1 }, { unique: true });
employeeSchema.index({ category: 1 });
employeeSchema.index({ dateJoined: 1 });
employeeSchema.index({ name: "text", email: "text" });

// Pre-save middleware to update company employee count
employeeSchema.post("save", async function () {
const Company = mongoose.model("Company");
const count = await mongoose.model("Employee").countDocuments({
companyId: this.companyId,
status: "active",
});
await Company.findByIdAndUpdate(this.companyId, { employeeCount: count });
});

// Post-remove middleware to update company employee count
employeeSchema.post("findOneAndDelete", async function (doc) {
if (doc) {
const Company = mongoose.model("Company");
const count = await mongoose.model("Employee").countDocuments({
companyId: doc.companyId,
status: "active",
});
await Company.findByIdAndUpdate(doc.companyId, { employeeCount: count });
}
});

module.exports = mongoose.model("Employee", employeeSchema);

---

const express = require("express");
const {
createEmployee,
getEmployees,
getEmployee,
updateEmployee,
deleteEmployee,
getEmployeesByCompany,
updateEmployeeStatus,
searchEmployees,
getEmployeeStats,
} = require("../controllers/employeeController");
const { protect } = require("../middleware/auth");
const { body } = require("express-validator");
const { validate } = require("../middleware/validate");

const router = express.Router();
const { uploadEmployeePhotoOptional } = require("../middleware/imageUpload");

// Validation rules
const createEmployeeValidation = [
body("name")
.trim()
.isLength({ min: 2, max: 100 })
.withMessage("Employee name must be between 2 and 100 characters"),
body("email")
.optional()
.isString()
.withMessage("Please provide a valid email"),
body("phone")
.matches(/^[+]?[\d\s-()]{10,15}$/)
.withMessage("Please provide a valid phone number"),
body("category")
.trim()
.isLength({ min: 2, max: 50 })
.withMessage("Category must be between 2 and 50 characters"),
body("categoryId")
.optional()
.isMongoId()
.withMessage("Please provide a valid category ID"),
body("salary")
.isNumeric()
.isFloat({ min: 0 })
.withMessage("Salary must be a positive number"),
body("companyId")
.isMongoId()
.withMessage("Please provide a valid company ID"),
body("dateJoined")
.optional()
.isISO8601()
.withMessage("Please provide a valid date"),
body("dob")
.optional()
.isISO8601()
.withMessage("Please provide a valid date of birth")
.custom((value) => {
if (value) {
const dob = new Date(value);
const age = (new Date() - dob) / (365.25 _ 24 _ 60 _ 60 _ 1000);
if (age < 18 || age > 100) {
throw new Error("Employee age must be between 18 and 100 years");
}
}
return true;
}),
// Address (optional)
body("address.street").optional().isString().trim(),
body("address.city").optional().isString().trim(),
body("address.state").optional().isString().trim(),
body("address.pinCode").optional().isString().trim(),
body("address.country").optional().isString().trim(),
// Documents (optional container)
body("documents.aadhar").optional().isString().trim(),
body("documents.pan").optional().isString().trim(),
body("documents.uan").optional().isString().trim(),
// Bank account (required in schema)
body("documents.bankAccount.accountNumber")
.exists({ checkFalsy: true })
.withMessage("Account number is required")
.bail()
.isString()
.trim(),
body("documents.bankAccount.ifscCode")
.exists({ checkFalsy: true })
.withMessage("IFSC code is required")
.bail()
.isString()
.trim(),
body("documents.bankAccount.bankName")
.exists({ checkFalsy: true })
.withMessage("Bank name is required")
.bail()
.isString()
.trim(),
// Photo (optional)
body("documents.photo").optional().isString().trim(),
// PF (optional)
body("pf.type")
.optional()
.isIn(["percentage", "fixed"])
.withMessage("PF type must be 'percentage' or 'fixed'"),
body("pf.value")
.optional()
.isFloat({ min: 0 })
.withMessage("PF value must be a positive number"),
// ESIC (optional)
body("esic.type")
.optional()
.isIn(["percentage", "fixed"])
.withMessage("ESIC type must be 'percentage' or 'fixed'"),
body("esic.value")
.optional()
.isFloat({ min: 0 })
.withMessage("ESIC value must be a positive number"),
// Emergency contact (optional)
body("emergencyContact.name").optional().isString().trim(),
body("emergencyContact.relationship").optional().isString().trim(),
body("emergencyContact.phone").optional().isString().trim(),
// Work schedule (optional container, but with constraints)
body("workSchedule.shiftType")
.optional()
.isIn(["day", "night", "rotating"])
.withMessage("shiftType must be one of day, night, rotating"),
body("workSchedule.workingDays")
.optional()
.isInt({ min: 1, max: 31 })
.withMessage("workingDays must be between 1 and 31"),
body("workSchedule.workingHours")
.optional()
.isInt({ min: 1, max: 24 })
.withMessage("workingHours must be between 1 and 24"),
];

const updateEmployeeValidation = [
body("name")
.optional()
.trim()
.isLength({ min: 2, max: 100 })
.withMessage("Employee name must be between 2 and 100 characters"),
body("email")
.optional()
.isEmail()
.normalizeEmail()
.withMessage("Please provide a valid email"),
body("phone")
.optional()
.matches(/^[+]?[\d\s-()]{10,15}$/)
.withMessage("Please provide a valid phone number"),
body("category")
.optional()
.trim()
.isLength({ min: 2, max: 50 })
.withMessage("Category must be between 2 and 50 characters"),
body("categoryId")
.optional()
.isMongoId()
.withMessage("Please provide a valid category ID"),
body("salary")
.optional()
.isNumeric()
.isFloat({ min: 0 })
.withMessage("Salary must be a positive number"),
body("companyId")
.optional()
.isMongoId()
.withMessage("Please provide a valid company ID"),
body("status")
.optional()
.isIn(["active", "inactive", "terminated", "on-leave"])
.withMessage("Status must be active, inactive, terminated, or on-leave"),
body("dateJoined")
.optional()
.isISO8601()
.withMessage("Please provide a valid date"),
body("dob")
.optional()
.isISO8601()
.withMessage("Please provide a valid date of birth")
.custom((value) => {
if (value) {
const dob = new Date(value);
const age = (new Date() - dob) / (365.25 _ 24 _ 60 _ 60 _ 1000);
if (age < 18 || age > 100) {
throw new Error("Employee age must be between 18 and 100 years");
}
}
return true;
}),
// Address (optional fields)
body("address.street").optional().isString().trim(),
body("address.city").optional().isString().trim(),
body("address.state").optional().isString().trim(),
body("address.pinCode").optional().isString().trim(),
body("address.country").optional().isString().trim(),
// Documents
body("documents.aadhar").optional().isString().trim(),
body("documents.pan").optional().isString().trim(),
body("documents.uan").optional().isString().trim(),
body("documents.bankAccount.accountNumber").optional().isString().trim(),
body("documents.bankAccount.ifscCode").optional().isString().trim(),
body("documents.bankAccount.bankName").optional().isString().trim(),
body("documents.photo").optional().isString().trim(),
// PF (optional)
body("pf.type")
.optional()
.isIn(["percentage", "fixed"])
.withMessage("PF type must be 'percentage' or 'fixed'"),
body("pf.value")
.optional()
.isFloat({ min: 0 })
.withMessage("PF value must be a positive number"),
// ESIC (optional)
body("esic.type")
.optional()
.isIn(["percentage", "fixed"])
.withMessage("ESIC type must be 'percentage' or 'fixed'"),
body("esic.value")
.optional()
.isFloat({ min: 0 })
.withMessage("ESIC value must be a positive number"),
// Emergency contact
body("emergencyContact.name").optional().isString().trim(),
body("emergencyContact.relationship").optional().isString().trim(),
body("emergencyContact.phone").optional().isString().trim(),
// Work schedule
body("workSchedule.shiftType")
.optional()
.isIn(["day", "night", "rotating"])
.withMessage("shiftType must be one of day, night, rotating"),
body("workSchedule.workingDays")
.optional()
.isInt({ min: 1, max: 31 })
.withMessage("workingDays must be between 1 and 31"),
body("workSchedule.workingHours")
.optional()
.isInt({ min: 1, max: 24 })
.withMessage("workingHours must be between 1 and 24"),
];

const statusUpdateValidation = [
body("status")
.isIn(["active", "inactive", "terminated", "on-leave"])
.withMessage("Status must be active, inactive, terminated, or on-leave"),
];

// Apply authentication middleware to all routes
router.use(protect);

// @route GET /api/employees/stats
// @desc Get employee statistics
// @access Private
router.get("/stats", getEmployeeStats);

// @route GET /api/employees/search
// @desc Search employees
// @access Private
router.get("/search", searchEmployees);

// @route GET /api/employees/company/:companyId
// @desc Get employees by company
// @access Private
router.get("/company/:companyId", getEmployeesByCompany);

// @route POST /api/employees
// @desc Create new employee
// @access Private
// Accept multipart/form-data with optional photo field
router.post(
"/",
uploadEmployeePhotoOptional,
createEmployeeValidation,
validate,
createEmployee
);

// @route GET /api/employees
// @desc Get all employees with pagination
// @access Private
router.get("/", getEmployees);

// @route GET /api/employees/:id
// @desc Get single employee
// @access Private
router.get("/:id", getEmployee);

// @route PUT /api/employees/:id
// @desc Update employee
// @access Private
// Accept multipart/form-data with optional photo field
router.put(
"/:id",
uploadEmployeePhotoOptional,
updateEmployeeValidation,
validate,
updateEmployee
);

// @route PUT /api/employees/:id/status
// @desc Update employee status
// @access Private
router.put(
"/:id/status",
statusUpdateValidation,
// validate,
updateEmployeeStatus
);

// @route DELETE /api/employees/:id
// @desc Delete employee
// @access Private
router.delete("/:id", deleteEmployee);

module.exports = router;

---

const Employee = require("../models/Employee");
const Company = require("../models/Company");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const { uploadEmployeePhotoToCloudinary } = require("../utils/imageUploader");

// @desc Create new employee
// @route POST /api/employees
// @access Private
const createEmployee = async (req, res) => {
console.log("[Employees][Create] Request reached.");
try {
const errors = validationResult(req);
if (!errors.isEmpty()) {
// Cleanup uploaded temp file if present
try {
if (req.file && req.file.path) {
const fs = require("fs");
if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
}
} catch (\_e) {}
return res.status(400).json({
success: false,
errors: errors.array(),
});
}

    // Handle JSON bodies that may come in as strings due to multipart/form-data
    const parseMaybeJSON = (val) => {
      if (typeof val !== "string") return val;
      try {
        return JSON.parse(val);
      } catch (_e) {
        return val;
      }
    };

    const name = req.body.name;
    const email = req.body.email;
    const phone = req.body.phone;
    const address = parseMaybeJSON(req.body.address);
    const category = req.body.category;
    const categoryId = req.body.categoryId;
    const dateJoined = req.body.dateJoined;
    const dob = req.body.dob;
    const salary = req.body.salary;
    const companyId = req.body.companyId;
    const documents = parseMaybeJSON(req.body.documents) || {};
    const emergencyContact = parseMaybeJSON(req.body.emergencyContact);
    const workSchedule = parseMaybeJSON(req.body.workSchedule);
    const pf = parseMaybeJSON(req.body.pf);
    const esic = parseMaybeJSON(req.body.esic);

    // Check if company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: "Company not found",
      });
    }

    // Check if employee with same email already exists
    if (email) {
      const existingEmployee = await Employee.findOne({ email });
      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          error: "Employee with this email already exists",
        });
      }
    }

    // Upload photo to Cloudinary if provided
    let photoUrl = documents?.photo;
    if (req.file && req.file.path) {
      try {
        console.log(
          `[Employees][Create] Photo file present. Uploading to Cloudinary. path=${req.file.path}`
        );
        const uploaded = await uploadEmployeePhotoToCloudinary(req.file.path, {
          folder: `employee-photos/${companyId}`,
        });
        photoUrl = uploaded.secure_url;
        console.log(
          `[Employees][Create] Photo uploaded to Cloudinary. url=${photoUrl}`
        );
      } catch (uploadErr) {
        console.error(
          `[Employees][Create] Failed uploading photo to Cloudinary: ${uploadErr?.message}`
        );
        return res.status(500).json({
          success: false,
          error: uploadErr.message || "Failed to upload photo",
        });
      }
    }

    // Create employee
    const employee = new Employee({
      name,
      email,
      phone,
      address,
      category,
      categoryId,
      dateJoined,
      dob,
      salary,
      companyId,
      documents: { ...(documents || {}), photo: photoUrl },
      emergencyContact,
      workSchedule,
      pf,
      esic,
      createdBy: req.user._id,
    });

    await employee.save();

    // Populate company info before returning
    await employee.populate("companyId", "name location");

    res.status(201).json({
      success: true,
      data: employee,
    });

} catch (error) {
console.error("[Employees][Create] Error:", error);
res.status(500).json({
success: false,
error: error.message || "Error creating employee",
});
}
};

// @desc Get all employees with pagination and filters
// @route GET /api/employees
// @access Private
const getEmployees = async (req, res) => {
try {
const {
page = 1,
limit = 10,
companyId,
status,
category,
search,
sortBy = "createdAt",
sortOrder = "desc",
} = req.query;

    // Build query
    const query = {};

    if (companyId) {
      query.companyId = companyId;
    }

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = { $regex: category, $options: "i" };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query with pagination
    const employees = await Employee.find(query)
      .populate("companyId", "name location")
      .populate("createdBy", "name email")
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Employee.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        employees,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          page: parseInt(page),
          limit: parseInt(limit),
        },
      },
    });

} catch (error) {
console.error("Get employees error:", error);
res.status(500).json({
success: false,
error: error.message || "Error fetching employees",
});
}
};

// @desc Get single employee by ID
// @route GET /api/employees/:id
// @access Private
const getEmployee = async (req, res) => {
try {
const employee = await Employee.findById(req.params.id)
.populate("companyId", "name location contactInfo")
.populate("createdBy", "name email");

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    res.status(200).json({
      success: true,
      data: employee,
    });

} catch (error) {
console.error("Get employee error:", error);
res.status(500).json({
success: false,
error: error.message || "Error fetching employee",
});
}
};

// @desc Update employee
// @route PUT /api/employees/:id
// @access Private
const updateEmployee = async (req, res) => {
try {
const errors = validationResult(req);
if (!errors.isEmpty()) {
// Cleanup uploaded temp file if present
try {
if (req.file && req.file.path) {
const fs = require("fs");
if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
}
} catch (\_e) {}
return res.status(400).json({
success: false,
errors: errors.array(),
});
}

    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    // Handle potential stringified JSON parts
    const parseMaybeJSON = (val) => {
      if (typeof val !== "string") return val;
      try {
        return JSON.parse(val);
      } catch (_e) {
        return val;
      }
    };

    const name = req.body.name;
    const email = req.body.email;
    const phone = req.body.phone;
    const address = parseMaybeJSON(req.body.address);
    const category = req.body.category;
    const categoryId = req.body.categoryId;
    const dateJoined = req.body.dateJoined;
    const dob = req.body.dob;
    const salary = req.body.salary;
    const companyId = req.body.companyId;
    const documents = parseMaybeJSON(req.body.documents);
    const emergencyContact = parseMaybeJSON(req.body.emergencyContact);
    const workSchedule = parseMaybeJSON(req.body.workSchedule);
    const pf = parseMaybeJSON(req.body.pf);
    const esic = parseMaybeJSON(req.body.esic);
    const status = req.body.status;

    // Check if email is being changed and if new email already exists
    if (email && email !== employee.email) {
      const existingEmployee = await Employee.findOne({
        email,
        _id: { $ne: req.params.id },
      });

      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          error: "Employee with this email already exists",
        });
      }
    }

    // Check if company exists when changing company
    if (companyId && companyId !== employee.companyId.toString()) {
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          error: "Company not found",
        });
      }
    }

    // Update fields
    if (name) employee.name = name;
    if (email) employee.email = email;
    if (phone) employee.phone = phone;
    if (address) employee.address = { ...employee.address, ...address };
    if (category) employee.category = category;
    if (categoryId) employee.categoryId = categoryId;
    if (dateJoined) employee.dateJoined = dateJoined;
    if (dob) employee.dob = dob;
    if (salary) employee.salary = salary;
    if (companyId) employee.companyId = companyId;
    // Merge document fields, handle optional uploaded photo
    if (documents) employee.documents = { ...employee.documents, ...documents };
    if (req.file && req.file.path) {
      try {
        const targetCompany = companyId || employee.companyId?.toString();
        console.log(
          `[Employees][Update] Photo file present. Uploading to Cloudinary. path=${req.file.path}, folder=employee-photos/${targetCompany}`
        );
        const uploaded = await uploadEmployeePhotoToCloudinary(req.file.path, {
          folder: `employee-photos/${targetCompany}`,
        });
        employee.documents = {
          ...(employee.documents || {}),
          photo: uploaded.secure_url,
        };
        console.log(
          `[Employees][Update] Photo uploaded to Cloudinary. url=${uploaded.secure_url}`
        );
      } catch (uploadErr) {
        console.error(
          `[Employees][Update] Failed uploading photo to Cloudinary: ${uploadErr?.message}`
        );
        return res.status(500).json({
          success: false,
          error: uploadErr.message || "Failed to upload photo",
        });
      }
    }
    if (emergencyContact)
      employee.emergencyContact = {
        ...employee.emergencyContact,
        ...emergencyContact,
      };
    if (workSchedule)
      employee.workSchedule = { ...employee.workSchedule, ...workSchedule };
    if (pf) employee.pf = { ...employee.pf, ...pf };
    if (esic) employee.esic = { ...employee.esic, ...esic };
    if (status) employee.status = status;

    await employee.save();

    // Populate company info before returning
    await employee.populate("companyId", "name location");

    res.status(200).json({
      success: true,
      data: employee,
    });

} catch (error) {
console.error("[Employees][Update] Error:", error);
res.status(500).json({
success: false,
error: error.message || "Error updating employee",
});
}
};

// @desc Delete employee
// @route DELETE /api/employees/:id
// @access Private
const deleteEmployee = async (req, res) => {
try {
const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    await Employee.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });

} catch (error) {
console.error("Delete employee error:", error);
res.status(500).json({
success: false,
error: error.message || "Error deleting employee",
});
}
};

// @desc Get employees by company
// @route GET /api/employees/company/:companyId
// @access Private
const getEmployeesByCompany = async (req, res) => {
try {
const { companyId } = req.params;
const { status = "active", limit = 50 } = req.query;

    // Check if company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: "Company not found",
      });
    }

    const employees = await Employee.find({
      companyId,
      ...(status && { status }),
    })
      .select("name email phone category salary status dateJoined")
      .sort({ name: 1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: {
        company: {
          name: company.name,
          location: company.location,
        },
        employees,
        count: employees.length,
      },
    });

} catch (error) {
console.error("Get employees by company error:", error);
res.status(500).json({
success: false,
error: error.message || "Error fetching employees by company",
});
}
};

// @desc Update employee status
// @route PUT /api/employees/:id/status
// @access Private
const updateEmployeeStatus = async (req, res) => {
try {
const { status } = req.body;

    if (!["active", "inactive", "terminated", "on-leave"].includes(status)) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid status. Must be active, inactive, terminated, or on-leave",
      });
    }

    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    employee.status = status;
    await employee.save();

    res.status(200).json({
      success: true,
      data: employee,
    });

} catch (error) {
console.error("Update employee status error:", error);
res.status(500).json({
success: false,
error: error.message || "Error updating employee status",
});
}
};

// @desc Search employees
// @route GET /api/employees/search
// @access Private
const searchEmployees = async (req, res) => {
try {
const { q, companyId, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: "Search query must be at least 2 characters long",
      });
    }

    const query = {
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ],
      status: "active",
    };

    if (companyId) {
      query.companyId = companyId;
    }

    const employees = await Employee.find(query)
      .populate("companyId", "name location")
      .select("name email phone category salary companyId")
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: employees,
    });

} catch (error) {
console.error("Search employees error:", error);
res.status(500).json({
success: false,
error: error.message || "Error searching employees",
});
}
};

// @desc Get employee statistics
// @route GET /api/employees/stats
// @access Private
const getEmployeeStats = async (req, res) => {
try {
const { companyId } = req.query;

    const matchStage = companyId
      ? { companyId: new mongoose.Types.ObjectId(companyId) }
      : {};

    const stats = await Employee.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          activeEmployees: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          inactiveEmployees: {
            $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] },
          },
          terminatedEmployees: {
            $sum: { $cond: [{ $eq: ["$status", "terminated"] }, 1, 0] },
          },
          onLeaveEmployees: {
            $sum: { $cond: [{ $eq: ["$status", "on-leave"] }, 1, 0] },
          },
          averageSalary: { $avg: "$salary" },
          totalSalaryExpense: { $sum: "$salary" },
        },
      },
    ]);

    const result = stats[0] || {
      totalEmployees: 0,
      activeEmployees: 0,
      inactiveEmployees: 0,
      terminatedEmployees: 0,
      onLeaveEmployees: 0,
      averageSalary: 0,
      totalSalaryExpense: 0,
    };

    res.status(200).json({
      success: true,
      data: result,
    });

} catch (error) {
console.error("Get employee stats error:", error);
res.status(500).json({
success: false,
error: error.message || "Error fetching employee statistics",
});
}
};

module.exports = {
createEmployee,
getEmployees,
getEmployee,
updateEmployee,
deleteEmployee,
getEmployeesByCompany,
updateEmployeeStatus,
searchEmployees,
getEmployeeStats,
};
