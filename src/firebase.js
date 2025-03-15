import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBoR3A3ksIlmIzsW9s8LE02ExMT2Q4DQJg",
    authDomain: "goforcab-941.firebaseapp.com",
    projectId: "goforcab-941",
    storageBucket: "goforcab-941.firebasestorage.app",
    messagingSenderId: "418891489602",
    appId: "1:418891489602:web:155a8d181d90d72a8528db",
    measurementId: "G-4KCFN23SGG"
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);