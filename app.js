const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.urlencoded({ extended: true }));

// ✅ Make uploads folder publicly accessible
app.use("/uploads", express.static("uploads"));


// MongoDB connection
mongoose.connect('mongodb://localhost:27017/resto', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("Connected to MongoDB.."))
  .catch((err) => console.log(err));


// ********ADD the menu data********
// Get Menu API
app.get("/menulist", async (req, res) => {
  const productList = await ProductModal.find();
  res.json(productList);
});


// ********Team Schema and Model********
const TeamSchema = new mongoose.Schema({
  image: String,
  name: String,
  designation: String,
  facebook: String,
  twitter: String,
  instagram: String
});

const TeamModal = mongoose.model('team', TeamSchema);

// (Moved these Team routes down after multer initialization)


// ********Testimonial Schema and Model********
const TestimonialSchema = new mongoose.Schema({
  image: { type: String, default: "testimonial-1.jpg" }, // Default image
  quote: { type: String, required: true },
  name: { type: String, required: true },
  profession: { type: String, default: "Customer" },
  createdAt: { type: Date, default: Date.now }
});

const TestimonialModal = mongoose.model('testimonial', TestimonialSchema);

// Get Testimonials
app.get("/testimonial", async (req, res) => {
  try {
    const testimonial = await TestimonialModal.find().sort({ createdAt: -1 });
    res.json(testimonial);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Post Testimonial (Review)
app.post("/testimonial", async (req, res) => {
  try {
    const { name, profession, quote, image } = req.body;
    if (!name || !quote) {
      return res.status(400).json({ error: "Name and Quote are required" });
    }
    const newTestimonial = new TestimonialModal({
      name,
      profession: profession || "Customer",
      quote,
      image: image || "testimonial-1.jpg"
    });
    await newTestimonial.save();
    res.status(201).json(newTestimonial);
  } catch (err) {
    res.status(500).json({ error: "Failed to save review" });
  }
});

// Delete Testimonial
app.delete("/testimonial/:id", async (req, res) => {
  try {
    await TestimonialModal.findByIdAndDelete(req.params.id);
    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete review" });
  }
});



//*************************************/ THIS PART IS FOR DASHBOARD*******************************************************
// ********Product Schema and Model********

const ProductSchema = new mongoose.Schema({
  image: String,
  title: String,
  price: Number,
  ingredients: String,
  time: String,
  type: String
});

const ProductModal = mongoose.model('product', ProductSchema);

//*************** Configure Multer for file uploads ***********
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // folder where images will be saved
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ********Team CRUD Routes********
// Get Team API
app.get("/team", async (req, res) => {
  try {
    const team = await TeamModal.find();
    res.json(team);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Post Team API
app.post("/addteam", upload.single("image"), async (req, res) => {
  try {
    const { name, designation, facebook, twitter, instagram } = req.body;
    if (!name || !designation) {
      return res.status(400).json({ error: "Name and Designation are required" });
    }
    const newMember = new TeamModal({
      name,
      designation,
      facebook,
      twitter,
      instagram,
      image: req.file ? `/uploads/${req.file.filename}` : ""
    });
    await newMember.save();
    res.status(201).json(newMember);
  } catch (err) {
    res.status(500).json({ error: "Failed to save team member" });
  }
});

// Delete Team API
app.delete("/deleteteam/:id", async (req, res) => {
  try {
    await TeamModal.findByIdAndDelete(req.params.id);
    res.json({ message: "Member deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete member" });
  }
});

// Update Team API
app.put("/updateteam/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, designation, facebook, twitter, instagram } = req.body;
    const updateData = { name, designation, facebook, twitter, instagram };
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }
    const updatedMember = await TeamModal.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedMember);
  } catch (err) {
    res.status(500).json({ error: "Failed to update team member" });
  }
});


// Upload API with validation
app.post("/addproduct", upload.single("image"), async (req, res) => {
  try {
    const { title, price, ingredients, time, type } = req.body;

    if (!title || !price) {
      return res.status(400).json({ error: "Title and Price are required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    const newProduct = new ProductModal({
      title,
      price,
      ingredients,
      time,
      type,
      image: `/uploads/${req.file.filename}`, // ✅ save relative path
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Item uploaded successfully",
      data: {
        id: newProduct._id,
        title: newProduct.title,
        price: newProduct.price,
        ingredients: newProduct.ingredients,
        time: newProduct.time,
        type: newProduct.type,
        image: newProduct.image
      }
    });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Upload failed"
    });
  }
});



//*************Delete Product Item***********
app.delete("/deleteproduct/:_id", function (req, res) {
  const menuId = req.params._id;
  console.log("Deleting Menu ID:", menuId);

  ProductModal.findByIdAndDelete(menuId)
    .then((deletedItem) => {
      if (deletedItem) {
        res.status(200).json({ message: "Menu item deleted." });
      } else {
        res.status(404).json({ error: "Menu item not found." });
      }
    })
    .catch((err) => {
      res.status(500).json({ error: "Internal server error." });
    });
});


// Get single product for update
// Add these routes to your existing app.js file, after your other routes

//****************/ To Get single product for update**********************
app.get("/update/:_id", async (req, res) => {
  try {
    const product = await ProductModal.findById(req.params._id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({
      mimage: product.image,
      mtitle: product.title,
      mprice: product.price,
      mingredients: product.ingredients,
      mtime: product.time,
      mtype: product.type
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// **********************Update product******************************
app.put("/updatemenu/:_id", upload.single("image"), async (req, res) => {
  try {
    const { title, price, ingredients, time, type } = req.body;
    const updateData = {
      title: title,
      price: price,
      ingredients: ingredients,
      time: time,
      type: type
    };

    // If a new image was uploaded
    if (req.file) {
      updateData.image = "/uploads/" + req.file.filename;
    }

    const updatedProduct = await ProductModal.findByIdAndUpdate(
      req.params._id,
      updateData,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ****************************Reservation Schema and Model*************************
const ReservationSchema = new mongoose.Schema({
  name: String,
  email: String,
  date: String,
  people: String,
  message: String
});

const ReservationModal = mongoose.model("reservation", ReservationSchema);

// ADD Reservation API
app.post("/reservation", async (req, res) => {
  try {
    const { name, email, date, people, message } = req.body;

    if (!name || !email || !date || !people) {
      return res
        .status(400)
        .json({ error: "Name, Email, Date, and People are required" });
    }

    const newReservation = new ReservationModal({
      name,
      email,
      date,
      people,
      message
    });

    await newReservation.save();

    res.status(201).json({
      success: true,
      message: "Reservation made successfully",
      data: {
        id: newReservation._id,
        name: newReservation.name,
        email: newReservation.email,
        date: newReservation.date,
        people: newReservation.people,
        message: newReservation.message
      }
    });
  } catch (err) {
    console.error("Reservation Error:", err);
    res
      .status(500)
      .json({ error: err.message || "Reservation failed" });
  }
});

// ✅ Reservation list (GET)
app.get("/bookinglist", async (req, res) => {
  try {
    const bookingList = await ReservationModal.find();
    res.json(bookingList);
  } catch (err) {
    console.error("Error fetching reservations:", err);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
});

//*************Delete Reservation Item***********
app.delete("/deletebooking/:_id", function (req, res) {
  const bookingId = req.params._id;
  console.log("Deleting Booking ID:", bookingId);
  ReservationModal.findByIdAndDelete(bookingId)
    .then((deletedItem) => {
      if (deletedItem) {
        res.status(200).json({ message: "Booking item deleted." });
      } else {
        res.status(404).json({ error: "booking item not found." });
      }
    })
    .catch((err) => {
      res.status(500).json({ error: "Internal server error." });
    });
});

// ****************************Order Schema and Model*************************
const OrderSchema = new mongoose.Schema({
  tableNumber: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  specialRequests: {
    type: String,
    default: ""
  },
  items: [{
    _id: String,
    title: String,
    price: Number,
    quantity: Number
  }],
  totalPrice: {
    type: Number,
    required: true
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed'],
    default: 'pending'
  }
});

const OrderModal = mongoose.model("order", OrderSchema);

// ADD Order API
app.post("/placeorder", async (req, res) => {
  try {
    const { tableNumber, customerName, specialRequests, items, totalPrice } = req.body;

    if (!tableNumber || !customerName || !items || items.length === 0) {
      return res
        .status(400)
        .json({ error: "Table number, customer name, and items are required" });
    }

    const newOrder = new OrderModal({
      tableNumber,
      customerName,
      specialRequests: specialRequests || "",
      items,
      totalPrice
    });

    await newOrder.save();

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: {
        id: newOrder._id,
        tableNumber: newOrder.tableNumber,
        customerName: newOrder.customerName,
        specialRequests: newOrder.specialRequests,
        items: newOrder.items,
        totalPrice: newOrder.totalPrice,
        orderDate: newOrder.orderDate,
        status: newOrder.status
      }
    });
  } catch (err) {
    console.error("Order Error:", err);
    res
      .status(500)
      .json({ error: err.message || "Order placement failed" });
  }
});

// Get Orders List API for Dashboard
app.get("/orders", async (req, res) => {
  try {
    const orders = await OrderModal.find().sort({ orderDate: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Update Order Status API
app.put("/updateorder/:_id", async (req, res) => {
  try {
    const { status } = req.body;
    const updatedOrder = await OrderModal.findByIdAndUpdate(
      req.params._id,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Order API
app.delete("/deleteorder/:_id", async (req, res) => {
  try {
    const deletedOrder = await OrderModal.findByIdAndDelete(req.params._id);

    if (!deletedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});


// ********Newsletter Schema and Model********
const NewsletterSchema = new mongoose.Schema({
  email: String,
});

const NewsletterModal = mongoose.model('newsletter', NewsletterSchema);

// ********Settings Schema and Model********
const SettingsSchema = new mongoose.Schema({
  location: String,
  phone: String,
  operatingHours: String,
  salesTax: String,
  taxId: String,
  stripeKey: String,
  paypalId: String,
  kitchenPrinter: String,
  receiptPrinter: String
});

const SettingsModal = mongoose.model('settings', SettingsSchema);

// Get Settings API
app.get("/settings", async (req, res) => {
  try {
    let settings = await SettingsModal.findOne();
    if (!settings) {
      // Return default if none exists
      settings = {
        location: "123 Main St, Anytown, CA 90210",
        phone: "(555) 123-4567",
        operatingHours: "Mon-Fri: 9am - 5pm, Sat: 10am - 2pm",
        salesTax: "8.25",
        taxId: "TX-123456789",
        stripeKey: "sk_test_...",
        paypalId: "client_id_...",
        kitchenPrinter: "192.168.1.101",
        receiptPrinter: "192.168.1.102"
      };
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// Update Settings API
app.post("/settings", async (req, res) => {
  try {
    const updatedSettings = await SettingsModal.findOneAndUpdate(
      {},
      req.body,
      { upsert: true, new: true }
    );
    res.json(updatedSettings);
  } catch (err) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Get Newsletters

// POST Route (Add Email)
app.post("/newsletter", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const newEmail = new NewsletterModal({ email });
    await newEmail.save();

    res.status(201).json({ message: "Saved successfully" });

  } catch (error) {
    console.error(error);  // <-- IMPORTANT
    res.status(500).json({ error: "Server Error" });
  }
});


// GET Route (View All Emails)
app.get("/newsletter", async (req, res) => {
  try {
    const emails = await NewsletterModal.find();
    res.json(emails);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// DELETE Route (Remove Email)
app.delete("/newsletter/:id", async (req, res) => {
  try {
    const deletedEmail = await NewsletterModal.findByIdAndDelete(req.params.id);
    if (!deletedEmail) {
      return res.status(404).json({ error: "Newsletter subscription not found" });
    }
    res.json({ message: "Subscription removed successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// ********Blog Schema and Model********
const BlogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  date: { type: Date, default: Date.now },
  image: String,
  excerpt: String,
  content: String,
  createdAt: { type: Date, default: Date.now }
});

const BlogModal = mongoose.model('blog', BlogSchema);

// Get Blogs API
app.get("/blogs", async (req, res) => {
  try {
    const blogs = await BlogModal.find().sort({ date: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
});

// Post Blog API
app.post("/addblog", upload.single("image"), async (req, res) => {
  try {
    const { title, author, date, excerpt, content } = req.body;
    if (!title || !author) {
      return res.status(400).json({ error: "Title and Author are required" });
    }
    const newBlog = new BlogModal({
      title,
      author,
      date: date || Date.now(),
      excerpt,
      content,
      image: req.file ? `/uploads/${req.file.filename}` : ""
    });
    await newBlog.save();
    res.status(201).json(newBlog);
  } catch (err) {
    res.status(500).json({ error: "Failed to save blog post" });
  }
});

// Delete Blog API
app.delete("/deleteblog/:id", async (req, res) => {
  try {
    await BlogModal.findByIdAndDelete(req.params.id);
    res.json({ message: "Blog post deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete blog post" });
  }
});

// Update Blog API
app.put("/updateblog/:id", upload.single("image"), async (req, res) => {
  try {
    const { title, author, date, excerpt, content } = req.body;
    const updateData = { title, author, date, excerpt, content };
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }
    const updatedBlog = await BlogModal.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedBlog);
  } catch (err) {
    res.status(500).json({ error: "Failed to update blog post" });
  }
});

// GET Single Blog API
app.get("/blog/:id", async (req, res) => {
  try {
    const blog = await BlogModal.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blog post" });
  }
});

// Error handling for Multer
app.listen(5000, () => console.log('Server running on port 5000'));


