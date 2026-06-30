# 📘 CivicSync — Technical Documentation & Architecture Manual

This document details the software design, system architecture, API schemas, and interactive mapping mechanics of **CivicSync**, a hyperlocal community problem solver.

---

## 🏛️ System Overview

CivicSync operates on a full-stack, event-driven architecture that combines a high-performance React frontend with an Express.js server and an advanced multi-agent AI pipeline.

### Core Objectives
1. **Reduce Friction in Civic Reporting**: Give citizens a seamless single-tap reporting interface utilizing smart geolocating and camera uploads.
2. **Automate Municipal Administrative Burden**: Use Gemini's multimodal reasoning to analyze, categorize, route, and deduplicate reports dynamically.
3. **Foster Local Community Pride**: Incentivize participation through gamified Trust Scores and community engagement loops.

---

## 🗺️ Interactive GIS Mapping & Geolocation

To resolve rendering glitches and coordinate mismatches, CivicSync utilizes a native Leaflet maps integration synchronized with OpenStreetMap APIs.

### 1. Browser Geolocation API
On launch, the map container initiates a high-accuracy geolocation query:
```typescript
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    // Map view centers seamlessly on user coordinates
    map.setView([latitude, longitude], 14);
  },
  { enableHighAccuracy: true, timeout: 6000 }
);
```

### 2. Reverse Geocoding via Nominatim
To translate latitude and longitude coordinates into human-readable street names anywhere in the world (e.g., India or San Francisco), the backend/frontend queries the OpenStreetMap Nominatim endpoint:
```typescript
fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
  .then((res) => res.json())
  .then((data) => {
    const resolvedAddress = data.display_name || `${lat}, ${lng}`;
    // Assign address to the reported incident
  });
```

### 3. Dynamic Map Container Resizing
To prevent Leaflet's standard grey-background rendering bug (which occurs when Leaflet cannot calculate the container's physical height/width on load), a native `ResizeObserver` monitors size changes and triggers `map.invalidateSize()`:
```typescript
const resizeObserver = new ResizeObserver(() => {
  map.invalidateSize();
});
resizeObserver.observe(containerRef.current);
```

---

## 🤖 Multi-Agent AI Pipeline

CivicSync leverages Gemini's `gemini-2.5` series models to process user tickets in sequence.

```
       [Citizen Uploads Photo & Description]
                         │
                         ▼
             ┌───────────────────────┐
             │     Triage Agent      │ (Vision & Assessment)
             └───────────┬───────────┘
                         │ 
                         ▼ [Category, Urgency, Structural Analysis]
             ┌───────────────────────┐
             │     Routing Agent     │ (Department Assignment)
             └───────────┬───────────┘
                         │
                         ▼ [Assigned Department]
             ┌───────────────────────┐
             │  Deduplication Agent  │ (Contextual Overlap Audit)
             └───────────────────────┘
```

### 1. The Triage Agent
* **Input**: User-provided image (base64) + issue description.
* **Function**: Executes multimodal analysis to extract category, severity level, description tags, and safety risks.
* **Output**: Structured JSON following an schema interface.

### 2. The Routing Agent
* **Input**: Issue category + resolved geocoded address.
* **Function**: Matches the incident against town ordinances and municipal responsibilities to assign the appropriate bureau.
* **Output**: Selected department string (e.g., `"Department of Public Works"`).

### 3. The Deduplication Agent
* **Input**: Incident category + geodistance matrix of existing active local tickets.
* **Function**: Identifies if the new submission represents a problem that has already been registered (e.g., several people reporting the same broken traffic light).
* **Output**: Boolean matches with list references of duplicated IDs.

---

## 📡 API Endpoints Spec sheet

### 1. Get User Profile
* **Endpoint**: `GET /api/users/profile`
* **Query Parameters**: `uid?: string` (defaults to `"citizen-hero-1"`)
* **Response**:
  ```json
  {
    "uid": "citizen-hero-1",
    "displayName": "Aarav Sharma",
    "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150",
    "trustScore": 120,
    "badges": ["Urban Sentinel", "Pothole Patrol"]
  }
  ```

### 2. Analyze & Pipeline Report
* **Endpoint**: `POST /api/issues/analyze`
* **Body**:
  ```json
  {
    "image": "data:image/jpeg;base64,...",
    "description": "Deep pothole forming in the middle lane.",
    "location": {
      "lat": 19.0760,
      "lng": 72.8777,
      "address": "Bandra Kurla Complex, Mumbai, India"
    }
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "triageResult": {
      "category": "Pothole",
      "severity": "critical",
      "urgency": 8,
      "summary": "Damaging pothole affecting vehicular flow"
    },
    "department": "Department of Public Works",
    "deduplicationResult": {
      "isDuplicate": false,
      "duplicateOf": null
    }
  }
  ```

### 3. Verification & Resolution Audit
* **Endpoint**: `POST /api/issues/verify`
* **Body**:
  ```json
  {
    "issueId": "issue-001",
    "evidenceImage": "data:image/jpeg;base64,..."
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "isResolved": true,
    "matchingConfidence": 0.94,
    "explanation": "Visual analysis confirms the pothole has been fully asphalted and leveled."
  }
  ```

---

## 🧪 Verification & Development

To compile and verify code integrity:
```bash
# Validate TypeScript compiles cleanly
npm run lint

# Compile and package application bundle
npm run build
```
