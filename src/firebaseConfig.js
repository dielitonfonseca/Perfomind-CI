// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app"; // Adicione getApps e getApp
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrOgs2Mfz7rBSdTdGEim143t6zkZoSBDQ",
  authDomain: "os-data-c0d3f.firebaseapp.com",
  projectId: "os-data-c0d3f",
  storageBucket: "os-data-c0d3f.firebasestorage.app",
  messagingSenderId: "597708132918",
  appId: "1:597708132918:web:1bd968b8a2a30b768f3e97",
  measurementId: "G-VJNECX5HLN"
};

// Initialize Firebase
// Verifica se já existe uma instância do app Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };


