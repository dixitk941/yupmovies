import { getStorage, getDownloadURL, ref } from "firebase/storage";
import admin from "firebase-admin";

// Initialize Firebase Admin (Server-side only)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "your-firebase-project.appspot.com",
  });
}

const storage = getStorage();

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { movieId, quality } = req.body;
  if (!movieId || !quality) return res.status(400).json({ error: "Missing parameters" });

  try {
    const filePath = `movies/${movieId}/${quality}.mp4`; // Adjust based on your structure
    const fileRef = ref(storage, filePath);
    const signedUrl = await getDownloadURL(fileRef);

    // Generate a secure redirect link (Blog Site)
    const redirectUrl = `https://my-blog-five-amber-64.vercel.app/redirect?token=${encodeURIComponent(signedUrl)}`;

    res.status(200).json({ success: true, redirectUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate link" });
  }
}
