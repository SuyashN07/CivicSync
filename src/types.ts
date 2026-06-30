/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "citizen" | "authority";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  trustScore: number;
  badges: string[];
  createdAt: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface AIMetadata {
  category: string;
  severity: number; // 1-10
  safe_for_work: boolean;
  AI_confidence_score: number;
  department: string;
  verificationScore?: number; // Fix Validity Score (0-100)
  beforeImage?: string;
  afterImage?: string;
}

export type IssueStatus = "pending" | "verified" | "resolved" | "duplicate";

export interface Issue {
  id: string;
  title: string;
  description: string;
  geoHash?: string;
  location: GeoLocation;
  images: string[]; // Base64 or Cloud Storage URLs
  status: IssueStatus;
  aiMetadata?: AIMetadata;
  upvotes: number;
  upvotedBy: string[]; // list of uids
  reporterId: string;
  reporterName: string;
  createdAt: string;
  department?: string;
}

export interface Comment {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  text: string;
  isAiSummary: boolean;
  createdAt: string;
}

export interface TrustPointsLog {
  userId: string;
  points: number;
  reason: string;
  timestamp: string;
}
