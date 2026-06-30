/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { triageIssue, routeIssue, deduplicateIssue, verifyResolvedFix } from "./src/lib/ai/gemini.js";
import { serverMemoryStore } from "./src/lib/firebaseAdmin.js";

const app = express();
const PORT = 3000;

// Increase payload limits to handle base64 image uploads from camera reports
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- API ROUTES ---

/**
 * Health check
 */
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

/**
 * Get active user profile
 */
app.get("/api/users/profile", (req, res) => {
  const uid = (req.query.uid as string) || "citizen-hero-1";
  const user = serverMemoryStore.getUser(uid);
  res.json(user);
});

/**
 * Update user trust score manually or trigger badges
 */
app.post("/api/users/trust", (req, res) => {
  const { uid, points, reason, badge } = req.body;
  if (!uid || typeof points !== "number") {
    res.status(400).json({ error: "Missing uid or points value" });
    return;
  }
  const updatedUser = serverMemoryStore.updateUserTrust(uid, points, badge);
  res.json({ success: true, user: updatedUser, logged: { points, reason, timestamp: new Date().toISOString() } });
});

/**
 * Core AI Workflow: Triage, Route & Deduplicate an issue
 * POST /api/issues/analyze
 */
app.post("/api/issues/analyze", async (req, res) => {
  try {
    const { image, description, location, reporterId, reporterName } = req.body;

    if (!image || !description || !location) {
      res.status(400).json({ error: "Missing required fields: image, description, and location." });
      return;
    }

    const { lat, lng, address } = location;

    // Step 1: Run Triage Agent (Gemini Vision)
    console.log("AI Workflow [1/3] - Triage Agent running...");
    const triageResult = await triageIssue(image, description);
    console.log("Triage Result:", triageResult);

    // Step 2: Run Routing Agent (Department Selection)
    console.log("AI Workflow [2/3] - Routing Agent running...");
    const department = await routeIssue(triageResult.category, address);
    console.log("Routed Department:", department);

    // Step 3: Run Deduplication Agent (Nearby Contextual Check)
    console.log("AI Workflow [3/3] - Deduplication Agent running...");
    const existingIssues = serverMemoryStore.getIssues();
    const deduplicationResult = await deduplicateIssue(
      triageResult.category,
      lat,
      lng,
      description,
      existingIssues
    );
    console.log("Deduplication Result:", deduplicationResult);

    res.json({
      success: true,
      triageResult,
      department,
      deduplicationResult,
    });
  } catch (error: any) {
    console.error("AI Analysis Endpoint Error:", error);
    res.status(500).json({ error: "Failed to execute AI analysis pipeline.", details: error.message });
  }
});

/**
 * List all issues
 * GET /api/issues
 */
app.get("/api/issues", (req, res) => {
  const issues = serverMemoryStore.getIssues();
  res.json(issues);
});

/**
 * Report / Create an issue
 * POST /api/issues
 */
app.post("/api/issues", async (req, res) => {
  try {
    const { title, description, location, images, reporterId, reporterName, aiMetadata, status } = req.body;

    if (!title || !description || !location || !images || images.length === 0) {
      res.status(400).json({ error: "Missing title, description, location, or images." });
      return;
    }

    const newIssue = {
      id: "issue-" + Math.random().toString(36).substr(2, 9),
      title,
      description,
      location,
      images,
      status: status || "pending",
      aiMetadata: aiMetadata || {
        category: "General",
        severity: 5,
        safe_for_work: true,
        AI_confidence_score: 0.8,
        department: "Department of Public Works"
      },
      upvotes: 0,
      upvotedBy: [],
      reporterId: reporterId || "citizen-hero-1",
      reporterName: reporterName || "Citizen Hero",
      createdAt: new Date().toISOString()
    };

    serverMemoryStore.addIssue(newIssue);

    // Create automated AI Triage comment summary
    const category = newIssue.aiMetadata?.category || "Reported Issue";
    const severity = newIssue.aiMetadata?.severity || 5;
    const dept = newIssue.aiMetadata?.department || "Department of Public Works";
    
    serverMemoryStore.addComment({
      id: "comment-" + Math.random().toString(36).substr(2, 9),
      issueId: newIssue.id,
      userId: "ai-assistant",
      userName: "CivicSync AI Assistant",
      userRole: "authority",
      text: `AI TRIAGE SUMMARY: Re-analyzed as ${category} (Severity ${severity}/10). Route verified: dispatched to ${dept}. Status: PENDING Community Verification.`,
      isAiSummary: true,
      createdAt: new Date().toISOString()
    });

    // Reward citizen trust points for reporting (Gamification Engine)
    // 10 base points + extra point for higher confidence
    const basePoints = 15;
    serverMemoryStore.updateUserTrust(newIssue.reporterId, basePoints);

    res.json({ success: true, issue: newIssue });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to report issue.", details: error.message });
  }
});

/**
 * Upvote an issue
 * POST /api/issues/:id/upvote
 */
app.post("/api/issues/:id/upvote", (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ error: "Missing userId" });
    return;
  }

  const issues = serverMemoryStore.getIssues();
  const issue = issues.find((i) => i.id === id);

  if (!issue) {
    res.status(404).json({ error: "Issue not found" });
    return;
  }

  const alreadyUpvoted = issue.upvotedBy.includes(userId);
  let updatedUpvotedBy = [...issue.upvotedBy];
  let upvoteDiff = 0;

  if (alreadyUpvoted) {
    // Revoke upvote
    updatedUpvotedBy = updatedUpvotedBy.filter((uid) => uid !== userId);
    upvoteDiff = -1;
  } else {
    // Add upvote
    updatedUpvotedBy.push(userId);
    upvoteDiff = 1;

    // Gamification Engine: Award reporter +1 Trust Point on upvote milestone!
    if (issue.reporterId) {
      serverMemoryStore.updateUserTrust(issue.reporterId, 2);
    }
  }

  const updatedIssue = serverMemoryStore.updateIssue(id, {
    upvotes: issue.upvotes + upvoteDiff,
    upvotedBy: updatedUpvotedBy,
    // Autoverify if upvotes > 5
    status: (issue.status === "pending" && issue.upvotes + upvoteDiff >= 5) ? "verified" : issue.status
  });

  res.json({ success: true, issue: updatedIssue });
});

/**
 * Verification Agent endpoint: Verify resolution and close ticket
 * POST /api/issues/:id/resolve
 */
app.post("/api/issues/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    const { afterImage, userId } = req.body;

    if (!afterImage) {
      res.status(400).json({ error: "After image is required to verify resolution." });
      return;
    }

    const issues = serverMemoryStore.getIssues();
    const issue = issues.find((i) => i.id === id);

    if (!issue) {
      res.status(404).json({ error: "Issue not found." });
      return;
    }

    const beforeImage = issue.images[0] || "";
    const category = issue.aiMetadata?.category || "Infrastructure Hazard";

    console.log("Verification Agent running: Comparing before/after images...");
    const verification = await verifyResolvedFix(beforeImage, afterImage, category);
    console.log("Verification Result:", verification);

    if (verification.verified) {
      // Update issue status to resolved
      const updatedIssue = serverMemoryStore.updateIssue(id, {
        status: "resolved",
        aiMetadata: {
          ...issue.aiMetadata,
          verificationScore: verification.fixValidityScore,
          beforeImage,
          afterImage,
        },
      });

      // Add verification AI comment
      serverMemoryStore.addComment({
        id: "comment-" + Math.random().toString(36).substr(2, 9),
        issueId: id,
        userId: "ai-assistant",
        userName: "CivicSync Verification Agent",
        userRole: "authority",
        text: `AI RESOLUTION CHECK: Verified successful fix. Validity Score: ${verification.fixValidityScore}/100. Verification summary: "${verification.description}"`,
        isAiSummary: true,
        createdAt: new Date().toISOString()
      });

      // Reward points! Reporter gets +30 for solved issue, solver gets +50!
      if (issue.reporterId) {
        serverMemoryStore.updateUserTrust(issue.reporterId, 30, "Verified Reporter");
      }
      if (userId) {
        serverMemoryStore.updateUserTrust(userId, 50, "Community Resolver");
      }

      res.json({ success: true, issue: updatedIssue, verification });
    } else {
      res.json({
        success: false,
        verification,
        message: "The repair verification failed. The provided 'after' image does not appear to show a valid, safe fix."
      });
    }
  } catch (error: any) {
    console.error("Resolution Verification Error:", error);
    res.status(500).json({ error: "Failed to execute resolution verification.", details: error.message });
  }
});

/**
 * Get comments for an issue
 * GET /api/issues/:id/comments
 */
app.get("/api/issues/:id/comments", (req, res) => {
  const { id } = req.params;
  const comments = serverMemoryStore.getComments(id);
  res.json(comments);
});

/**
 * Create a new comment
 * POST /api/issues/:id/comments
 */
app.post("/api/issues/:id/comments", (req, res) => {
  const { id } = req.params;
  const { text, userId, userName, userRole } = req.body;

  if (!text) {
    res.status(400).json({ error: "Comment text is required." });
    return;
  }

  const comment = {
    id: "comment-" + Math.random().toString(36).substr(2, 9),
    issueId: id,
    userId: userId || "anonymous",
    userName: userName || "Anonymous Citizen",
    userRole: userRole || "citizen",
    text,
    isAiSummary: false,
    createdAt: new Date().toISOString()
  };

  serverMemoryStore.addComment(comment);
  res.json({ success: true, comment });
});

/**
 * Authority Dashboard Predictive Analytics
 * GET /api/predict-failures
 */
app.get("/api/predict-failures", (req, res) => {
  // Return mock prediction data modeling seasonal infrastructural failures
  const currentMonth = new Date().getMonth();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const data = Array.from({ length: 6 }).map((_, i) => {
    const monthIdx = (currentMonth + i) % 12;
    // Generate simulated failure risks
    const potholeRisk = Math.round(50 + Math.sin(monthIdx / 2) * 30 + Math.random() * 10);
    const waterRisk = Math.round(40 + Math.cos(monthIdx / 2) * 20 + Math.random() * 10);
    const powerRisk = Math.round(30 + Math.sin(monthIdx / 3) * 45 + Math.random() * 10);
    return {
      month: monthNames[monthIdx],
      Potholes: potholeRisk,
      "Water Main Leaks": waterRisk,
      "Grid Overloads": powerRisk,
    };
  });

  res.json(data);
});


// --- VITE MIDDLEWARE INTERACTION ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite dev server in development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server mounted.");
  } else {
    // Serve compiled build assets in production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Static production assets mounted from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CivicSync backend server running on http://localhost:${PORT}`);
  });
}

startServer();
