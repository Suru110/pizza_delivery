<<<<<<< HEAD
# 🍕 Pizza Oven - Full Stack Pizza Delivery Application

A feature-rich, high-performance pizza ordering application built using **React (Vite)**, **Node.js/Express**, **MongoDB**, **Socket.io** (WebSockets), and **Nodemailer**.

Features a beautiful, luxury Dark Mode UI crafted with vanilla CSS, a custom 4-step pizza customizer, live progress tracker, and an admin inventory editor with automatic email alerts.

---

## 🛠️ Prerequisites

- **Node.js**: v18+ (Your system has Node.js v24.14.1, which is fully supported).
- **MongoDB**: You can run MongoDB locally, or use a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).

---

## ⚙️ Configuration Setup

Navigate to the `backend/` directory and check the `.env` configuration file:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/pizza_delivery
JWT_SECRET=supersecretjwtkey123!
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
ADMIN_EMAIL=admin@pizzadelivery.com
RAZORPAY_KEY_ID=rzp_test_dummykeyid123
RAZORPAY_KEY_SECRET=rzp_test_dummysecret456
FRONTEND_URL=http://localhost:5173
```

> [!TIP]
> **Email & SMTP Support**: If `EMAIL_USER` and `EMAIL_PASS` are left empty, the application will automatically spin up an **Ethereal Mail** test account on startup and output links to preview verification emails directly in the backend terminal console.

---

## 🚀 How to Start the Application

You will need to start the backend API server and the frontend client concurrently.

### 1. Start the Backend API Server
Open a terminal in the project root and run:
```bash
cd backend
npm run dev
# Or run with Node:
node server.js
```
The server will seed default menu options and ingredients stock automatically once it successfully connects to MongoDB.

### 2. Start the Frontend client
Open a separate terminal in the project root and run:
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🍕 Testing the Application Flow

### Step 1: Administrator Registration
1. Since the database is empty initially, the **first user** who registers in the signup screen becomes an **Admin** automatically.
2. Register your first account (e.g., `admin@test.com`).
3. Check the **backend terminal logs** to retrieve the 6-digit email verification OTP.
4. Input the code to verify the account and log in.

### Step 2: Customer Registration
1. Open a new incognito window or log out, and register a second account (e.g., `user@test.com`). This account will have the standard `user` role.
2. Retrieve the verification code from the backend console, verify, and log in.

### Step 3: Customize a Pizza & Pay
1. On the user dashboard, click **Create Custom Pizza** to open the 4-step builder.
2. Select your crust, sauce, cheese type, and veggie/meat toppings. Notice how the price updates dynamically.
3. Add to cart.
4. Click **Place Order & Pay**.
5. Since we are running in local test mode, a **Razorpay Sandbox Simulator** modal will pop up. Click **Authorize & Confirm Payment** to simulate a successful payment instantly.

### Step 4: Live Order Tracking (WebSockets)
1. After checkout, you will be navigated to the **My Orders** screen, showing the active order tracker.
2. Log back in with the **Admin account** in another tab/window.
3. Navigate to **Manage Orders**.
4. Change the order status (e.g., set to **In the kitchen** or **Sent to delivery**).
5. Watch the **Customer tracking stepper** update instantly in real-time without reloading the page!

### Step 5: Inventory Stock Alerts
1. Logged in as Admin, navigate to the **Inventory** tab.
2. Find an item (e.g., **Thin Crust** or **Classic Marinara**).
3. Click the edit icon, adjust the stock below its threshold (e.g., set to `15`), and save.
4. An automated **Low Stock Alert Email** will trigger and print its contents (or Ethereal URL) in the backend logs, alerting the admin to restock.
5. Click **Reset All Stock to 100** to refill all ingredients instantly.
=======
# pizza_delivery
>>>>>>> 6a2c9744575ccf698b69f360b5446d482252e150
