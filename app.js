const express = require('express');
const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;


// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://customer-dashboard---atl-default-rtdb.firebaseio.com/',
});

const db = admin.database();

app.use(cors({ origin: true }));
app.use(express.json());

// Helper: Convert email to Firebase-safe key
function sanitizeEmail(email) {
  return email.toLowerCase().replace(/\./g, ',');
}

// ✅ Validate user
app.post('/validate-user', async (req, res) => {
  const { email, unitNo } = req.body;
  console.log("🔍 Validating:", { email, unitNo });

  if (!email || !unitNo) {
    return res.status(400).json({ message: "Email and Unit No are required." });
  }

  try {
    const sanitizedEmail = sanitizeEmail(email);
    const userSnapshot = await db.ref(`users/${sanitizedEmail}`).once('value');
    const user = userSnapshot.val();

    if (user && String(user.Flat_No).toLowerCase() === unitNo.toLowerCase()) {
      return res.json(user); // success
    } else {
      return res.status(400).json({ message: "Invalid Email or Unit No." });
    }
  } catch (error) {
    console.error("❌ Validation Error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ✅ Signup Route (for analytics/logging purposes)
app.post('/signup', async (req, res) => {
  const { email, unitNo } = req.body;
  console.log("📥 Signup attempt:", { email, unitNo });

  if (!email || !unitNo) {
    return res.status(400).json({ message: "Email and Unit No are required." });
  }

  try {
    const newUserRef = db.ref('signedupUsers').push();
    await newUserRef.set({
      Email: email,
      Flat_No: unitNo,
      createdAt: new Date().toISOString(),
    });

    res.json({ message: "Signup successful!" });
  } catch (error) {
    console.error("❌ Signup Error:", error);
    res.status(500).json({ message: "Signup failed." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
