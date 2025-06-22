# Job Importer Dashboard

A full-stack web application for importing, managing, and monitoring job feeds from various sources. The system automatically fetches job data from RSS/XML feeds, processes them, and provides a comprehensive dashboard for tracking import activities.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Backend](#backend)
- [Frontend](#frontend)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)

## 🎯 Overview

The Job Importer Dashboard is designed to streamline the process of aggregating job postings from multiple RSS/XML feeds. It provides real-time monitoring, detailed analytics, and a user-friendly interface for managing job import operations.

### Key Capabilities

- **Feed Management**: Add, configure, and manage multiple job feed sources
- **Automated Imports**: Scheduled and manual job imports with real-time status updates
- **Data Processing**: Intelligent job parsing, deduplication, and categorization
- **Analytics Dashboard**: Comprehensive statistics and import history tracking
- **Real-time Updates**: WebSocket-powered live notifications and status updates
- **Error Handling**: Detailed failure tracking with specific error reasons

## ✨ Features

### 🔄 Import Management
- **Multiple Feed Sources**: Support for RSS/XML job feeds from various platforms
- **Real-time Processing**: Live import status with WebSocket notifications
- **Batch Operations**: Efficient processing of large job datasets
- **Error Recovery**: Robust error handling with detailed failure logs

### 📊 Analytics & Monitoring
- **Import Statistics**: Track total, new, updated, and failed job imports
- **Historical Data**: Complete import history with searchable logs
- **Performance Metrics**: Import duration and success rate tracking
- **Feed Analytics**: Per-feed statistics and performance monitoring

### 🎨 User Interface
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS
- **Real-time Updates**: Live dashboard updates without page refresh
- **Interactive Tables**: Sortable, filterable job and import data
- **Status Indicators**: Visual feedback for import progress and results

### 🔧 Administration
- **Feed Configuration**: Easy setup of new job feed sources
- **Import Scheduling**: Automated hourly imports via cron jobs
- **Manual Triggers**: On-demand import execution
- **System Monitoring**: Health checks and connection status

## 🏗️ Architecture

The application follows a modern full-stack architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│  (MongoDB)      │
│                 │    │                 │    │                 │
│ • Dashboard UI  │    │ • REST API      │    │ • Job Data      │
│ • Real-time     │    │ • WebSocket     │    │ • Import Logs   │
│ • Feed Mgmt     │    │ • Job Processor │    │ • Feed Config   │
└───���─────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Job Fetcher   │
                       │                 │
                       │ • RSS/XML Parse │
                       │ • Data Clean    │
                       │ • Cron Schedule │
                       └─────────────────┘
```

## 🔧 Backend

The backend is built with Node.js and Express, providing a robust API and job processing system.

### Core Components

#### **API Server** (`server.js`, `app.js`)
- **Express.js** REST API with comprehensive endpoints
- **WebSocket Server** for real-time client communication
- **CORS Configuration** for cross-origin requests
- **Error Handling** with detailed logging and user feedback

#### **Job Processing System**
- **Job Fetcher** (`Jobs/jobFetcher.js`): Automated RSS/XML feed processing
- **Job Worker** (`worker/jobWorker.js`): Background job processing with Bull queue
- **Cron Scheduler**: Hourly automated imports

#### **Data Models** (`models/`)
- **JobFeed**: Feed configuration and metadata
- **ImportLog**: Import history and statistics
- **Job**: Individual job records with full details

### Key Features

#### **Feed Management**
```javascript
// Add new job feed
POST /api/feeds
{
  "name": "Tech Jobs Feed",
  "url": "https://example.com/jobs.rss",
  "category": "Technology",
  "isActive": true
}
```

#### **Import Processing**
- **Automatic Scheduling**: Hourly cron job execution
- **Manual Triggers**: On-demand import via API
- **Real-time Status**: WebSocket notifications for import progress
- **Error Tracking**: Detailed failure logs with specific reasons

#### **Data Processing Pipeline**
1. **Fetch**: Retrieve RSS/XML data from configured feeds
2. **Parse**: Extract job information using xml2js
3. **Sanitize**: Clean and validate job data
4. **Process**: Categorize as new, updated, or failed
5. **Store**: Save to MongoDB with full audit trail
6. **Notify**: Send real-time updates via WebSocket

### Database Schema

#### **JobFeed Collection**
```javascript
{
  name: String,           // Feed display name
  url: String,            // RSS/XML feed URL
  category: String,       // Job category
  jobTypes: String,       // Employment types
  region: String,         // Geographic region
  isActive: Boolean,      // Enable/disable feed
  lastImport: Date,       // Last successful import
  totalJobsImported: Number // Cumulative job count
}
```

#### **ImportLog Collection**
```javascript
{
  feedUrl: String,        // Source feed URL
  feedName: String,       // Feed display name
  totalJobs: Number,      // Total jobs in feed
  totalImported: Number,  // Successfully processed
  newJobs: Number,        // New job postings
  updatedJobs: Number,    // Updated existing jobs
  failedJobs: Number,     // Failed to process
  status: String,         // completed|failed|in_progress
  timestamp: Date,        // Import start time
  duration: Number,       // Processing time (ms)
  failedJobDetails: [{    // Detailed failure info
    jobId: String,
    reason: String,
    title: String,
    url: String
  }]
}
```

## 🎨 Frontend

The frontend is built with Next.js 15 and TypeScript, providing a modern, responsive user interface.

### Core Components

#### **Dashboard** (`app/page.tsx`)
- **Import Statistics**: Real-time metrics and KPIs
- **Feed Management**: Interactive feed configuration
- **Import History**: Searchable, paginated import logs
- **Real-time Updates**: WebSocket integration for live data

#### **Feed Manager** (`components/enhanced-feed-manager.tsx`)
- **Feed CRUD Operations**: Add, edit, delete, and toggle feeds
- **Import Triggers**: Manual import execution with progress tracking
- **Status Monitoring**: Real-time import status with visual indicators
- **Error Handling**: User-friendly error messages and recovery options

#### **Import Details** (`app/import-log/[id]/page.tsx`)
- **Detailed Analytics**: Comprehensive import statistics
- **Job Breakdown**: Categorized job listings (new, updated, failed)
- **Failure Analysis**: Detailed error information and reasons
- **Export Options**: Data export and sharing capabilities

### Key Features

#### **Real-time Updates**
- **WebSocket Integration**: Live import status and notifications
- **Polling Fallback**: Ensures updates even without WebSocket
- **Toast Notifications**: User-friendly success/error messages
- **Auto-refresh**: Automatic data updates on import completion

#### **User Experience**
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Loading States**: Skeleton loaders and progress indicators
- **Error Boundaries**: Graceful error handling and recovery
- **Accessibility**: WCAG compliant with keyboard navigation

#### **Data Visualization**
- **Statistics Cards**: Key metrics with visual emphasis
- **Interactive Tables**: Sortable, filterable data grids
- **Status Badges**: Color-coded status indicators
- **Progress Tracking**: Real-time import progress visualization

### State Management

#### **React Hooks**
- **useState**: Component-level state management
- **useEffect**: Side effects and lifecycle management
- **useCallback**: Performance optimization for functions
- **useMemo**: Expensive computation memoization

#### **Custom Hooks**
- **useWebSocket**: WebSocket connection and message handling
- **useToast**: Toast notification system
- **useDebounce**: Input debouncing for search functionality

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **MongoDB Atlas** account (or local MongoDB)
- **Redis** (for job queue - optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd job-importer-dashboard
   ```

2. **Install backend dependencies**
   ```bash
   cd Server
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../Client
   npm install
   ```

### Configuration

#### **Backend Configuration** (`Server/.env`)
```env
# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/job-importer?retryWrites=true&w=majority

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# Server Configuration
PORT=3001
```

#### **Frontend Configuration** (`Client/.env.local`)
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# WebSocket Configuration
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### Running the Application

1. **Start the backend server**
   ```bash
   cd Server
   npm start
   ```

2. **Start the frontend development server**
   ```bash
   cd Client
   npm run dev
   ```

3. **Access the application**
   - Frontend: `http://localhost:3000` (or next available port)
   - Backend API: `http://localhost:3001`

## ⚙️ Configuration

### Feed Configuration

Add job feeds through the web interface or directly via API:

```javascript
// Example feed configurations
const feeds = [
  {
    name: "Remote Tech Jobs",
    url: "https://himalayas.app/jobs/rss",
    category: "Technology",
    jobTypes: "Remote",
    region: "Global",
    isActive: true
  },
  {
    name: "Startup Jobs",
    url: "https://angel.co/jobs.rss",
    category: "Startup",
    jobTypes: "Full-time",
    region: "USA",
    isActive: true
  }
];
```

### Import Scheduling

The system automatically imports from active feeds every hour. You can also trigger manual imports:

- **Automatic**: Cron job runs hourly (`0 * * * *`)
- **Manual**: Click "Import" button in the dashboard
- **API**: `POST /api/import/start?feedId={feedId}`

## 📚 API Documentation

### Feed Management

#### **Get All Feeds**
```http
GET /api/feeds?search={query}
```

#### **Create Feed**
```http
POST /api/feeds
Content-Type: application/json

{
  "name": "Feed Name",
  "url": "https://example.com/feed.rss",
  "category": "Technology",
  "isActive": true
}
```

#### **Update Feed**
```http
PATCH /api/feeds/{id}
Content-Type: application/json

{
  "isActive": false
}
```

#### **Delete Feed**
```http
DELETE /api/feeds/{id}
```

### Import Management

#### **Start Import**
```http
POST /api/import/start?feedId={feedId}
```

#### **Get Import Status**
```http
GET /api/import/status/{importId}
```

#### **Get Import Logs**
```http
GET /api/import-logs?page=1&limit=10&search={query}&date={date}
```

#### **Get Import Details**
```http
GET /api/import-logs/{id}
```

### WebSocket Events

#### **Connection Events**
- `connection_established`: WebSocket connection confirmed
- `import_started`: Import process initiated
- `import_completed`: Import finished successfully
- `import_failed`: Import encountered errors
- `import_progress`: Real-time progress updates

## 🛠️ Tech Stack

### **Backend Technologies**

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime Environment | 18+ |
| **Express.js** | Web Framework | ^5.1.0 |
| **MongoDB** | Database | Atlas Cloud |
| **Mongoose** | ODM | ^8.16.0 |
| **WebSocket** | Real-time Communication | ^4.8.1 |
| **Bull** | Job Queue | ^5.54.3 |
| **Redis** | Queue Storage | ^5.6.1 |
| **xml2js** | XML Parsing | ^0.6.2 |
| **axios** | HTTP Client | ^1.10.0 |
| **node-cron** | Task Scheduling | ^4.1.0 |
| **dotenv** | Environment Variables | ^16.5.0 |
| **cors** | Cross-Origin Requests | ^2.8.5 |

### **Frontend Technologies**

| Technology | Purpose | Version |
|------------|---------|---------|
| **Next.js** | React Framework | 15.2.4 |
| **React** | UI Library | 19+ |
| **TypeScript** | Type Safety | ^5.7.2 |
| **Tailwind CSS** | Styling Framework | ^3.4.1 |
| **Radix UI** | Component Library | Various |
| **Lucide React** | Icon Library | ^0.468.0 |
| **clsx** | Conditional Classes | ^2.1.1 |

### **Development Tools**

| Tool | Purpose |
|------|---------|
| **ESLint** | Code Linting |
| **Prettier** | Code Formatting |
| **Nodemon** | Development Server |
| **PostCSS** | CSS Processing |

### **Infrastructure**

| Service | Purpose |
|---------|---------|
| **MongoDB Atlas** | Cloud Database |
| **Redis Cloud** | Queue Storage (optional) |

### **Architecture Patterns**

- **RESTful API**: Standard HTTP methods and status codes
- **WebSocket Communication**: Real-time bidirectional updates
- **Component-Based UI**: Reusable React components
- **Custom Hooks**: Shared logic and state management
- **Error Boundaries**: Graceful error handling
- **Responsive Design**: Mobile-first approach
- **Type Safety**: Full TypeScript implementation

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Built with ❤️ for efficient job data management**