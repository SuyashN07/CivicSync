/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as admin from "firebase-admin";

let isInitialized = false;
let dbAdmin: any = null;
let authAdmin: any = null;

try {
  // If FIREBASE_SERVICE_ACCOUNT is available in process.env, initialize real admin SDK
  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountVar) {
    const serviceAccount = JSON.parse(serviceAccountVar);
    (admin as any).initializeApp({
      credential: (admin as any).credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    dbAdmin = (admin as any).firestore();
    authAdmin = (admin as any).auth();
    isInitialized = true;
    console.log("Firebase Admin SDK successfully initialized.");
  } else if ((admin as any).apps && (admin as any).apps.length > 0) {
    dbAdmin = (admin as any).firestore();
    authAdmin = (admin as any).auth();
    isInitialized = true;
  }
} catch (error) {
  console.warn("Failed to initialize real Firebase Admin SDK. Using high-fidelity server-side memory database instead.", error);
}

export const adminDb = dbAdmin;
export const adminAuth = authAdmin;
export const isAdminInitialized = isInitialized;

// Server-side memory database fallback to make all POST/GET API endpoints fully functional!
class ServerMemoryStore {
  private issues: any[] = [];
  private comments: any[] = [];
  private users: any[] = [];

  constructor() {
    this.reset();
  }

  public reset() {
    this.issues = [
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

    this.comments = [
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

    this.users = [
      {
        uid: "citizen-hero-1",
        name: "Suyash G.",
        email: "suyashgnaman07@gmail.com",
        role: "citizen",
        trustScore: 120,
        badges: ["Civic Pioneer", "Quick Reporter", "Eagle Eye"],
        createdAt: new Date().toISOString()
      }
    ];
  }

  public getIssues() {
    return this.issues;
  }

  public addIssue(issue: any) {
    this.issues.unshift(issue);
    return issue;
  }

  public updateIssue(id: string, updates: any) {
    const idx = this.issues.findIndex((i) => i.id === id);
    if (idx !== -1) {
      this.issues[idx] = { ...this.issues[idx], ...updates };
      return this.issues[idx];
    }
    return null;
  }

  public getComments(issueId: string) {
    return this.comments.filter((c) => c.issueId === issueId);
  }

  public addComment(comment: any) {
    this.comments.push(comment);
    return comment;
  }

  public getUser(uid: string) {
    return this.users.find((u) => u.uid === uid) || {
      uid,
      name: "Suyash G.",
      email: "suyashgnaman07@gmail.com",
      role: "citizen",
      trustScore: 120,
      badges: ["Civic Pioneer"],
      createdAt: new Date().toISOString()
    };
  }

  public updateUserTrust(uid: string, points: number, badge?: string) {
    const user = this.getUser(uid);
    user.trustScore = (user.trustScore || 0) + points;
    if (badge && !user.badges.includes(badge)) {
      user.badges.push(badge);
    }
    const idx = this.users.findIndex((u) => u.uid === uid);
    if (idx !== -1) {
      this.users[idx] = user;
    } else {
      this.users.push(user);
    }
    return user;
  }
}

export const serverMemoryStore = new ServerMemoryStore();
