const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
console.log("Private key preview:", serviceAccount.private_key?.slice(0, 30));


const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://customer-dashboard---atl-default-rtdb.firebaseio.com/',
});

const db = admin.database();

app.use(cors({ origin: true }));
app.use(express.json());

// Email sanitizer
function sanitizeEmail(email) {
  return email.toLowerCase().replace(/\./g, ',');
}

// POST /validate-user
app.post("/validate-user", async (req, res) => {
  const { email, unitNo, projectId } = req.body;

  console.log("REQ BODY:", req.body);

  if (!email || !unitNo || !projectId) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  const sanitizedEmail = email.toLowerCase().replace(/\./g, ',');
  console.log("Validating for:", projectId, sanitizedEmail);
  try {
    const snapshot = await db.ref(`${projectId}/users/${sanitizedEmail}`).once("value");
    const userData = snapshot.val();
    console.log("Firebase snapshot result:", userData);

    if (!userData) {
      return res.status(404).json({ message: "User not found." });
    }

    const dbUnit = userData.Unit_No || "";
    if (dbUnit.toLowerCase() !== unitNo.toLowerCase()) {
      return res.status(401).json({ message: "Unit No mismatch." });
    }

    // return the full user data
    return res.status(200).json(userData);

  } catch (error) {
    console.error("Validation error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }

});



// POST /signup (analytics / log)
app.post('/signup', async (req, res) => {
  const { email, unitNo, projectId, name, mobile } = req.body;
  console.log("Signup attempt:", { email, unitNo, projectId });

  if (!email || !unitNo || !projectId) {
    return res.status(400).json({ message: "Email, Unit No, and Project ID are required." });
  }

  try {
    const usersRef = db.ref(`${projectId}/signedinuser`);
    const snapshot = await usersRef.once("value");
    const usersData = snapshot.val() || {};

    // Check if unitNo already exists (case-insensitive match)
    const unitAlreadyExists = Object.values(usersData).some(
      user => user.Unit_No?.toLowerCase() === unitNo.toLowerCase()
    );

    if (unitAlreadyExists) {
      return res.status(400).json({ message: "This Unit No is already registered for the selected project." });
    }

    // Save user under sanitized email
    const sanitizedEmail = sanitizeEmail(email);
    const userRef = usersRef.child(sanitizedEmail);
    await userRef.set({
      email,
      Unit_No: unitNo,
      name,
      mobile,
      createdAt: new Date().toISOString(),
    });

    return res.json({ message: "Signup successful!" });
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({ message: "Signup failed." });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}. Access it via Render public URL.`);

});
