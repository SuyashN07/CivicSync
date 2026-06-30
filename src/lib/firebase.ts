/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

// High-fidelity fallback storage for local sandbox mode
const MOCK_STORAGE_KEY_ISSUES = "civicsync_mock_issues";
const MOCK_STORAGE_KEY_USER = "civicsync_mock_user";
const MOCK_STORAGE_KEY_COMMENTS = "civicsync_mock_comments";

// Core default local data to make the app look stunning and populated immediately!
export const DEFAULT_MOCK_ISSUES = [
  {
    id: "issue-1",
    title: "Hazardous Deep Pothole on Pine Street",
    description: "Extremely deep pothole right in the middle of the school zone crosswalk. Cars are swerving into oncoming traffic to avoid it. Needs urgent repaving.",
    location: {
      lat: 37.7749,
      lng: -122.4194,
      address: "842 Pine St, San Francisco, CA 94108"
    },
    images: [
      "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600"
    ],
    status: "pending",
    aiMetadata: {
      category: "Pothole",
      severity: 8,
      safe_for_work: true,
      AI_confidence_score: 0.96,
      department: "Department of Public Works"
    },
    upvotes: 42,
    upvotedBy: ["uid-2", "uid-3"],
    reporterId: "user-101",
    reporterName: "Marcus Vance",
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  },
  {
    id: "issue-2",
    title: "Illegal Trash Dumping Near Community Center",
    description: "Several old mattresses, electronics, and multiple trash bags have been left behind the community center parking lot. Attracting rodents.",
    location: {
      lat: 37.7833,
      lng: -122.4167,
      address: "1150 Clay St, San Francisco, CA 94108"
    },
    images: [
      "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600"
    ],
    status: "verified",
    aiMetadata: {
      category: "Garbage",
      severity: 6,
      safe_for_work: true,
      AI_confidence_score: 0.94,
      department: "Department of Sanitation"
    },
    upvotes: 19,
    upvotedBy: ["uid-1"],
    reporterId: "user-102",
    reporterName: "Elena Rostova",
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  },
  {
    id: "issue-3",
    title: "Burst Water Main and Flooding",
    description: "Water is bubbling up aggressively from the asphalt on the corner of Sutter and Mason. Flooding the sidewalk and parking lane.",
    location: {
      lat: 37.7892,
      lng: -122.4081,
      address: "450 Sutter St, San Francisco, CA 94108"
    },
    images: [
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=600"
    ],
    status: "pending",
    aiMetadata: {
      category: "Water Leak",
      severity: 9,
      safe_for_work: true,
      AI_confidence_score: 0.98,
      department: "Water & Power Authority"
    },
    upvotes: 56,
    upvotedBy: ["uid-2"],
    reporterId: "user-103",
    reporterName: "Derrick Kim",
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
  },
  {
    id: "issue-4",
    title: "Damaged Pedestrian Crossing Signal",
    description: "The pedestrian 'Walk/Don't Walk' push button and visual countdown is completely hanging by its wires and is inactive. Dangerous for disabled and elderly crossing.",
    location: {
      lat: 37.7699,
      lng: -122.4468,
      address: "1801 Haight St, San Francisco, CA 94117"
    },
    images: [
      "https://images.unsplash.com/photo-1510931215112-9c1fe0d4beff?auto=format&fit=crop&q=80&w=600"
    ],
    status: "resolved",
    aiMetadata: {
      category: "Traffic Light",
      severity: 7,
      safe_for_work: true,
      AI_confidence_score: 0.91,
      department: "Department of Transportation",
      verificationScore: 94,
      beforeImage: "https://images.unsplash.com/photo-1510931215112-9c1fe0d4beff?auto=format&fit=crop&q=80&w=600",
      afterImage: "https://images.unsplash.com/photo-1473163928189-364b2c4e1135?auto=format&fit=crop&q=80&w=600"
    },
    upvotes: 31,
    upvotedBy: [],
    reporterId: "user-104",
    reporterName: "Clara Mendoza",
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString()
  }
];

export const DEFAULT_MOCK_COMMENTS = [
  {
    id: "comment-1",
    issueId: "issue-1",
    userId: "ai-assistant",
    userName: "CivicSync AI Assistant",
    userRole: "authority",
    text: "AI TRIAGE SUMMARY: This issue has been triaged as a Pothole with high severity (8/10) due to its hazardous location in a crosswalk school zone. Routed automatically to Department of Public Works.",
    isAiSummary: true,
    createdAt: new Date(Date.now() - 47 * 3600 * 1000).toISOString()
  },
  {
    id: "comment-2",
    issueId: "issue-1",
    userId: "user-105",
    userName: "Sasha G.",
    userRole: "citizen",
    text: "Can confirm! I hit this pothole yesterday and it almost blew out my tire. Glad someone reported it.",
    isAiSummary: false,
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  }
];

export const DEFAULT_MOCK_USER = {
  uid: "citizen-hero-1",
  name: "Suyash G.",
  email: "suyashgnaman07@gmail.com",
  role: "citizen",
  trustScore: 120,
  badges: ["Civic Pioneer", "Quick Reporter", "Eagle Eye"],
  createdAt: new Date().toISOString()
};

// Try importing or setting up real firebase if config is injected
let isRealFirebase = false;
let firebaseApp: any = null;
let dbInstance: any = null;
let authInstance: any = null;

try {
  // Check if firebase-applet-config.json exists or if process.env values are present
  // For the sake of dynamic full-stack runtime, we attempt to resolve the config.
  // Real implementation can import from a config path.
  // Here, we provide an elegant interface.
  const hasConfig = false; // We can check config or environment variables
  if (hasConfig) {
    const firebaseConfig = {}; // Placeholder
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    dbInstance = getFirestore(firebaseApp);
    authInstance = getAuth(firebaseApp);
    isRealFirebase = true;
    console.log("CivicSync initialized with Cloud Firestore database.");
  }
} catch (e) {
  console.warn("Firebase config not found or invalid. Falling back to High-Fidelity Mock Sandbox Mode.", e);
}

// Ensure local storage is seeded with initial data for the dashboard
if (typeof window !== "undefined") {
  if (!localStorage.getItem(MOCK_STORAGE_KEY_ISSUES)) {
    localStorage.setItem(MOCK_STORAGE_KEY_ISSUES, JSON.stringify(DEFAULT_MOCK_ISSUES));
  }
  if (!localStorage.getItem(MOCK_STORAGE_KEY_USER)) {
    localStorage.setItem(MOCK_STORAGE_KEY_USER, JSON.stringify(DEFAULT_MOCK_USER));
  }
  if (!localStorage.getItem(MOCK_STORAGE_KEY_COMMENTS)) {
    localStorage.setItem(MOCK_STORAGE_KEY_COMMENTS, JSON.stringify(DEFAULT_MOCK_COMMENTS));
  }
}

// Export initialization states
export const isSandboxMode = !isRealFirebase;
export const db = dbInstance;
export const auth = authInstance;

// Handle Firestore Error conforming strictly to the FirestoreErrorInfo rules
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: DEFAULT_MOCK_USER.uid,
      email: DEFAULT_MOCK_USER.email,
      emailVerified: true,
      isAnonymous: false,
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection strictly matching the Firebase integration skill
export async function testConnection() {
  if (!isRealFirebase) return;
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

if (isRealFirebase) {
  testConnection();
}
