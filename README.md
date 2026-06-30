# 🏛️ CivicSync: Hyperlocal Civic Problem Solver

CivicSync is a next-generation full-stack application designed to empower citizens and streamline municipal workflows. It bridges the gap between active community members and city authorities through real-time issue tracking, interactive mapping, gamified citizen engagement, and multi-agent AI automation.

---

## 🎨 Visual Identity & Architecture

CivicSync features a beautifully crafted glassmorphic user interface built with desktop-first precision and mobile responsiveness. It uses:
* **Inter** for core readable content and functional data.
* **Space Grotesk** for clean, bold headings and structural displays.
* **JetBrains Mono** for numerical statistics, system badges, and localized metadata.

```
                  ┌───────────────────────────────┐
                  │      Interactive Frontend     │
                  │   (Vite + React + Tailwind)   │
                  └───────────────┬───────────────┘
                                  │ (HTTP / JSON)
                                  ▼
                  ┌───────────────────────────────┐
                  │        Express Backend        │
                  │        (Node / tsx)           │
                  └──────┬─────────────────┬──────┘
                         │                 │
                         ▼                 ▼
          ┌──────────────────────────┐   ┌──────────────────────────┐
          │     Gemini Multi-Agent   │   │    Server Memory Store   │
          │    Triage, Route, Verify │   │   Fidelity Civic DB      │
          └──────────────────────────┘   └──────────────────────────┘
```

---

## 🚀 Key Features

### 1. 🗺️ Live Leaflet Mapping & GPS Locating
* **Real-time Map Integration**: Replaced raw mockup designs with a fully functional Leaflet GIS engine, complete with interactive clusters and color-coded map pins.
* **Live GPS Coordinates Tracking**: Automatically queries the client's high-accuracy browser geolocation APIs on initialization. Displays a high-contrast pulsing blue beacon representing the user's current live location.
* **OpenStreetMap Reverse Geocoding**: Translates raw GPS latitude and longitude coordinates into precise physical street addresses using OpenStreetMap's Nominatim Web API, providing full compatibility for citizens reporting issues from India, San Francisco, or anywhere worldwide.
* **Layer Toggling**: Seamlessly switches between high-fidelity Street maps (CartoDB Voyager) and realistic Satellite imagery (ArcGIS Online).

### 2. 🤖 Multi-Agent AI Pipeline (Powered by Gemini)
* **Triage Agent (Vision)**: Automatically analyzes citizen-submitted photos (base64) along with text descriptions to extract categories (e.g., potholes, broken streetlights, trash pile-ups), structural detail, hazard severity, and urgency score.
* **Routing Agent**: Evaluates the category and physical address to instantly route the ticket to the optimal municipal department (e.g., *Department of Public Works*, *Environmental Protection*, *Transportation Bureau*).
* **Deduplication Agent**: Calculates distance thresholds and contextual semantic descriptions of nearby reports to detect duplicates, preventing congested municipal pipelines.
* **Verification Agent**: Validates uploaded fix photos submitted by authorities or community helpers to confirm that repairs are complete and genuine before closing a ticket.

### 3. 🎮 Gamified Citizen Engagement
* **Citizen Hero Trust System**: Reporting issues, verifying repairs, upvoting critical community concerns, and participating in civil discussions awards **Trust Points**.
* **Unlockable Civic Badges**: Earn recognition badges like *Urban Sentinel*, *Community Pillar*, or *Eco-Guardian* as participation increases.
* **Public Feed & Discussions**: An interactive list sidebar showcasing recent civic issues with custom-styled tags, progress tracking (Pending, In Progress, Verified), upvoting mechanics, and live comments.

### 4. 🏢 Authority Dashboard
* A specialized management console for municipal administrators and local dispatchers to:
  * View systemic graphs and category breakdowns.
  * Audit active, critical, and duplicates tickets.
  * Update repair statuses and trigger the **AI Verification Pipeline** with photo evidence.
  * Award direct trust incentives to reporters upon verified completion.

---

## 🛠️ Technology Stack & Dependencies

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, TypeScript | Component-based modern user experience |
| **Styling** | Tailwind CSS v4, Lucide Icons | Responsive utility utility styling & responsive icons |
| **Maps** | Leaflet, @types/leaflet | Interactive GIS mapping, clustering, and coordinates |
| **Backend** | Express, tsx | Server hosting & API proxying |
| **AI Engine** | Gemini API (`@google/genai`) | Multi-agent autonomous triage & verification workflows |
| **Persistence** | In-Memory Server Store | High-fidelity transient data storage |

---

## 📁 Directory Structure

* `/src/components/RealTimeMap.tsx`: Interactive Leaflet map stage featuring custom DivIcons, GPS positioning, tile toggling, and automatic resizing logic.
* `/src/components/ReportIssue.tsx`: Smart citizen issue submission form with photo uploading, auto-location geocoding, and category prediction.
* `/src/components/FeedSidebar.tsx`: Dynamic chronological feed of community tickets, discussions, voting, and comments.
* `/src/components/AuthorityDashboard.tsx`: Unified backoffice monitor tracking key analytics, department workloads, and ticket statuses.
* `/src/components/Navbar.tsx`: Global navigation header hosting real-time notification alerts, trust scores, and badge portfolios.
* `/server.ts`: Full-stack entrypoint coordinating express routers, middleware assets, and core backend endpoints.
* `/src/lib/ai/gemini.ts`: Multi-agent definitions managing prompts and structured schema outputs with Gemini.
* `/src/lib/firebaseAdmin.ts`: Server-side state store and mock authentication structures.

---

## 💻 Local Installation & Development

### 1. Clone & Install Dependencies
First, ensure that all required dependencies are installed:
```bash
npm install
```

### 2. Configure Environment Secrets
Create a `.env` file at the project root:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Launch Development Server
To boot the full-stack server under hot reloading:
```bash
npm run dev
```
The application will run on **http://localhost:3000**.
