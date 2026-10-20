// Simple License API for Render
// Handles license activation and validation

const express = require('express');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());

// Initialize Firebase Admin SDK
// You'll need to download the service account key from Firebase Console
// and set it as an environment variable in Render
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://m-maintena-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'License API is running' });
});

// Activate license endpoint
app.post('/api/activate', async (req, res) => {
  try {
    const { licenseKey, hwid, os, ip } = req.body;

    if (!licenseKey || !hwid || !os) {
      return res.status(400).json({ success: false, error: 'License key, HWID, and OS are required' });
    }

    // Get license from Firestore
    const licenseDoc = await db.collection('licenses').doc(licenseKey).get();

    if (!licenseDoc.exists) {
      return res.status(404).json({ success: false, error: 'Invalid license key' });
    }

    const licenseData = licenseDoc.data();

    // Check if revoked
    if (licenseData.is_revoked) {
      return res.status(403).json({ success: false, error: 'License has been revoked by admin' });
    }

    // Check expiration
    if (licenseData.expires_at && licenseData.expires_at.toDate() < new Date()) {
      return res.status(403).json({ success: false, error: 'License has expired' });
    }

    // Check activation count
    const maxActivations = licenseData.max_activations || 1;
    const activationCount = licenseData.activation_count || 0;

    if (activationCount >= maxActivations) {
      return res.status(403).json({
        success: false,
        error: `License has been used ${activationCount} times (limit: ${maxActivations})`
      });
    }

    // Update license with device info
    await db.collection('licenses').doc(licenseKey).update({
      is_activated: true,
      hwid: hwid,
      os: os,
      activation_count: activationCount + 1,
      last_activated_at: admin.firestore.FieldValue.serverTimestamp(),
      last_ip: ip || null
    });

    res.json({
      success: true,
      message: 'License activated successfully',
      activationCount: activationCount + 1,
      maxActivations: maxActivations,
      expiresAt: licenseData.expires_at ? licenseData.expires_at.toDate().toISOString() : null,
      clientName: licenseData.client_name
    });
  } catch (error) {
    console.error('Error activating license:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate license endpoint
app.post('/api/validate', async (req, res) => {
  try {
    const { licenseKey, hwid, os, ip } = req.body;

    if (!licenseKey || !hwid || !os) {
      return res.status(400).json({ success: false, error: 'License key, HWID, and OS are required' });
    }

    // Get license from Firestore
    const licenseDoc = await db.collection('licenses').doc(licenseKey).get();

    if (!licenseDoc.exists) {
      return res.status(404).json({ success: false, error: 'License not found on server' });
    }

    const licenseData = licenseDoc.data();

    // Check if revoked
    if (licenseData.is_revoked) {
      return res.status(403).json({ success: false, error: 'License has been revoked by admin' });
    }

    // Check expiration
    if (licenseData.expires_at && licenseData.expires_at.toDate() < new Date()) {
      return res.status(403).json({ success: false, error: 'License has expired' });
    }

    // Check HWID matches
    if (licenseData.hwid && licenseData.hwid !== hwid) {
      return res.status(403).json({ success: false, error: 'License does not match this device (different HWID)' });
    }

    // Check OS matches
    if (licenseData.os && licenseData.os !== os) {
      return res.status(403).json({ success: false, error: 'License does not match this device (different OS)' });
    }

    // Update last seen info
    await db.collection('licenses').doc(licenseKey).update({
      last_seen_at: admin.firestore.FieldValue.serverTimestamp(),
      last_ip: ip || null
    });

    res.json({
      success: true,
      message: 'License valid',
      expiresAt: licenseData.expires_at ? licenseData.expires_at.toDate().toISOString() : null,
      clientName: licenseData.client_name
    });
  } catch (error) {
    console.error('Error validating license:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`License API running on port ${PORT}`);
});
