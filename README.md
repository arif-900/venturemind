# VentureMind — Real-Data Location Intelligence & Business Feasibility Engine

> **Academic Project:** Final Year B.Tech Capstone Project  
> **Discipline:** Computer Science & Engineering  
> **Core Theme:** Evidence-Grounded Spatial Intelligence, Financial Modeling, and Decision Support for Entrepreneurs  

---

## 1. Abstract

Starting a new small business is inherently risky. Studies by startup failure researchers (e.g., CB Insights, 2023) show that a significant fraction of new ventures fail within the first two years, primarily due to running out of cash, misjudging local market demand, or picking poor physical locations. While modern entrepreneurs often turn to generative AI chatbots for advice, general-purpose Large Language Models (LLMs) frequently hallucinate: they fabricate fictitious business names, generate arbitrary footfall statistics, and provide overly optimistic advice detached from reality.

**VentureMind** is an engineering project designed to eliminate this guesswork. It is a full-stack decision-support platform that grounds business planning in genuine external evidence. By connecting directly to OpenStreetMap (via Nominatim) and Mapbox Places APIs, VentureMind performs bounded geographic competitor searches, calculates physical distances using the Haversine metric, and separates direct competitors from indirect demographic feeders (such as colleges and schools). Financial runway is computed using deterministic arithmetic rather than statistical estimates. Finally, verified evidence is supplied to Google Gemini 3.8 Flash under strict prompting constraints requiring grounded strategic analysis, differentiation advice, and field verification warnings without synthetic data fallbacks.

---

## 2. Problem Statement

Entrepreneurs seeking to open physical enterprises (such as coaching academies, cafes, clinics, or retail shops) face three critical bottlenecks:

1. **Spatial Uncertainty & Hidden Competition:** Open web searches often return scattered or sponsored results that fail to show the true density of nearby rivals within walking or driving radius.
2. **The Generative AI Hallucination Trap:** Standard AI assistants routinely fabricate business names, invent market statistics, and falsely claim low competition simply because they lack access to local registry data.
3. **Financial Miscalculation:** Founders frequently confuse gross revenue with cash burn, failing to model how many months of operational runway their starting capital will support before reaching break-even.

VentureMind addresses these problems by enforcing a strict **Zero-Synthetic-Data policy**: if an area has zero registered competitors in open registries, the platform reports zero honestly and advises a physical field survey, rather than generating fake competitors.

---

## 3. Project Objectives

- **Empirical Geospatial Discovery:** Allow users to search any city, neighborhood, or street coordinate and discover genuine operating businesses within an adjustable radius (500m to 5,000m).
- **Domain-Specific Competitor Classification:** Understand the specific business model (e.g., a "Bank Coaching Center") and classify discovered businesses into *Direct Competitors* (exam coaching academies), *Indirect Feeder Hubs* (degree colleges educating target aspirants), and *Unverified Listings*.
- **Deterministic Financial Runway Modeling:** Provide transparent, auditable cash runway and net monthly burn calculations based on user-supplied financial assumptions.
- **Evidence-Constrained AI Reasoning:** Ground Gemini 3.8 Flash in verified Points of Interest (POIs) to produce structured strategic evaluations with candidate alternative area comparisons.
- **Multi-Tenant Security:** Protect proprietary business concepts and financial records using Supabase authentication and PostgreSQL Row-Level Security (RLS).

---

## 4. System Architecture

The project follows a modular three-tier architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             CLIENT TIER                                 │
│  React 19 + TypeScript + Vite + Mapbox GL JS + Tailwind/CSS UI          │
│  - Dashboard Overview       - Interactive Location Map (Color Pins)     │
│  - New Business Form        - Real Competitor Inspection List           │
│  - Financial Runway Modeler - AI Decision Memo View                     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SERVICE & INTEGRATION LAYER                     │
│  src/lib/services/                                                      │
│  ├── realtimeIntelligenceService.ts                                      │
│  │   ├── OpenStreetMap Nominatim Bounded Query (viewbox + extratags)    │
│  │   ├── Mapbox Places Geocoding & Proximity API                        │
│  │   ├── Haversine Distance Engine                                      │
│  │   └── Business-Specific Relevance Classifier                         │
│  ├── geminiService.ts (Zod Schema Validation & Structured JSON Parsing) │
│  └── businessService.ts (Supabase Client CRUD)                          │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
                    ▼                                 ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│          EXTERNAL REAL APIs           │ │       DATABASE & AUTH         │
│  • OpenStreetMap (ODbL License)       │ │  Supabase (PostgreSQL 15)     │
│  • Mapbox Places API                  │ │  • Auth (JWT Session Tokens)  │
│  • Google Gemini 3.8 Flash API        │ │  • Row Level Security (RLS)   │
└───────────────────────────────────────┘ └───────────────────────────────┘
```

---

## 5. Mathematical Formulations & Algorithms

### 5.1 Spatial Distance Calculation (Haversine Formula)
To filter out external API results that lie outside the user-selected radius, VentureMind computes the great-circle distance between the query epicenter $(\phi_1, \lambda_1)$ and candidate POI coordinates $(\phi_2, \lambda_2)$:

$$\Delta \phi = \phi_2 - \phi_1$$

$$\Delta \lambda = \lambda_2 - \lambda_1$$

$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta \lambda}{2}\right)$$

$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$

$$d = R \cdot c$$

Where:
- $R \approx 6371\text{ km}$ (Earth's mean radius).
- Coordinates are converted from degrees to radians.
- Results are rounded to two decimal places and verified in unit tests.

### 5.2 Competitor Relevance Classification
Rather than treating all entities under a broad category (like "Education") as identical, the classifier inspects the business title, user description, POI name, POI tags, and OSM tags:

- **Direct Competitor:** POIs matching core offerings (e.g., for Bank Coaching: keywords `coaching`, `bank coaching`, `academy`, `ibps`, `sbi`, `rrb`).
- **Indirect Institution / Student Hub:** POIs providing student concentration without directly competing (e.g., degree colleges, polytechnics, universities), or non-competing K-12 primary and secondary schools.
- **Relevance Unverified:** POIs without sufficient descriptive tags.
- **Infrastructure Exclusion:** Non-commercial entities (roads, boundaries, waterways) are strictly filtered out.

### 5.3 Financial Runway Formulation
The platform avoids opaque statistical simulations in favor of transparent, user-verifiable arithmetic:

$$\text{Net Monthly Burn} = \text{Monthly Fixed Costs} - \text{Expected Monthly Revenue}$$

$$\text{Runway (Months)} = 
\begin{cases} 
\frac{\text{Starting Capital}}{\text{Net Monthly Burn}}, & \text{if Net Monthly Burn} > 0 \\
\infty \text{ (Self-Sustaining)}, & \text{if Net Monthly Burn} \le 0 
\end{cases}$$

---

## 6. Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19, TypeScript 5.9, Vite 8, Lucide React, Mapbox GL JS |
| **Styling** | Vanilla CSS + Tailwind utility tokens (custom dark theme) |
| **Backend / DB** | Supabase (PostgreSQL), Deno Edge Functions, Supabase Auth |
| **Security** | PostgreSQL Row-Level Security (RLS), JWT verification, input sanitization |
| **Validation** | Zod (schema validation for business requests and AI payloads) |
| **Geospatial APIs** | OpenStreetMap Nominatim API, Mapbox Places Geocoding API |
| **AI Reasoning** | Google Gemini 3.8 Flash (`generateContent` with JSON response mode) |
| **Testing** | Vitest (unit & integration tests), Oxlint |

---

## 7. Security & Database Design

VentureMind implements strict database isolation. All queries pass through Supabase Row-Level Security (RLS) policies:

```sql
-- Example RLS Policy for Business Requests Table
ALTER TABLE public.business_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only read their own business requests"
  ON public.business_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own business requests"
  ON public.business_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own business requests"
  ON public.business_requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own business requests"
  ON public.business_requests FOR DELETE
  USING (auth.uid() = user_id);
```

Anonymous or unauthorized requests to saved reports or business records return HTTP 401/403 errors, ensuring user confidentiality.

---

## 8. Installation & Local Development

### Prerequisites
- Node.js (v20 or higher recommended)
- npm or pnpm
- A Supabase project URL and Anon key
- Mapbox public access token (optional, for custom tiles)
- Google Gemini API key

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/venturemind.git
   cd venturemind
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the project root:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_MAPBOX_TOKEN=pk.your-mapbox-token
   GEMINI_API_KEY=your-gemini-api-key
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. **Execute Test Suite:**
   ```bash
   npm test
   ```

6. **Build for Production:**
   ```bash
   npm run build
   ```

---

## 9. Verification & Testing Summary

The project is backed by comprehensive automated test coverage (44 tests across 9 test files):

- `authValidation.test.ts`: Password strength, email regex, session lifecycle.
- `businessValidation.test.ts`: Zod schema validation for business categories, budgets, and objectives.
- `businessOwnership.test.ts`: Permission checks and multi-tenant isolation.
- `securityAudit.test.ts`: Anon access blocking and SQL injection sanity.
- `advancedIntelligence.test.ts`: Haversine formula correctness, spatial radius filtering, Bank Coaching Center relevance classification, and dual-source provenance metadata.
- `realtimeData.test.ts`: Real-time data integration, coverage notes, and schema contracts.

Live API verification has been confirmed with real searches in both regional towns (e.g., Nandyala) and major commercial centers (e.g., Ashok Nagar, Hyderabad).

---

## 10. References & Academic Citations

1. **OpenStreetMap Contributors** (2026). *OpenStreetMap Data*. Available under the Open Database License (ODbL) at [https://www.openstreetmap.org](https://www.openstreetmap.org).
2. **Mapbox Inc.** (2026). *Mapbox Geocoding and Search APIs*. [https://docs.mapbox.com/api/search/geocoding/](https://docs.mapbox.com/api/search/geocoding/).
3. **Sinnott, R. W.** (1984). "Virtues of the Haversine". *Sky and Telescope*, 68(2), p. 159. *(Derivation of great-circle distance using spherical trigonometry)*.
4. **Google DeepMind** (2025). *Gemini: A Family of Highly Capable Multimodal Models*. Google Research. [https://ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs).
5. **Supabase Inc.** (2025). *PostgreSQL Row Level Security (RLS) and Architecture Guide*. [https://supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security).
6. **CB Insights** (2023). *The Top 12 Reasons Startups Fail*. Research Report. *(Identified premature capital depletion and misjudged market need as leading causes of early-stage enterprise collapse)*.
