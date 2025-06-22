# Job Importer Dashboard - Frontend

A modern, responsive React dashboard built with Next.js 15 for managing job feed imports. This frontend application provides a comprehensive interface for monitoring job import activities, managing feed configurations, and viewing detailed import statistics.

## 🚀 Features

### ✅ **Core Functionality**
- **Real-time Dashboard** - Monitor all job import activities in one place
- **Feed Management** - Add, configure, and manage multiple job feeds
- **Import History** - Detailed view of all import logs with job-level data
- **Search & Filtering** - Advanced search across feeds and import logs
- **Pagination** - Efficient handling of large datasets
- **Real-time Updates** - Live status updates via WebSocket connection

### ✅ **User Experience**
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Loading States** - Smooth loading indicators for all operations
- **Error Handling** - Comprehensive error boundaries with retry options
- **Toast Notifications** - Real-time feedback for user actions
- **Optimistic Updates** - Instant UI feedback with rollback on failure

### ✅ **Advanced Features**
- **Manual Import Triggering** - Start imports on-demand with progress tracking
- **Feed Status Toggle** - Enable/disable feeds with visual feedback
- **Multi-category Selection** - Organize feeds by categories and job types
- **Date Range Filtering** - Filter imports by specific date ranges
- **Export Ready** - Prepared for data export functionality

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **State Management**: React Hooks + Context
- **Real-time**: WebSocket
- **HTTP Client**: Native Fetch API

## 📁 Project Structure

\`\`\`
src/
├── app/                          # Next.js App Router
│   ├── import-log/[id]/         # Import log detail pages
│   │   └── page.tsx
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   ├── loading.tsx              # Global loading component
│   └── page.tsx                 # Dashboard home page
├── components/                   # Reusable UI components
│   ├── ui/                      # shadcn/ui components
│   ├── add-feed-modal.tsx       # Add new feed modal
│   ├── enhanced-feed-manager.tsx # Feed management interface
│   ├── error.tsx                # Error boundary component
│   ├── header.tsx               # Navigation header
│   ├── loader.tsx               # Loading spinner component
│   ├── pagination.tsx           # Pagination controls
│   ├── table.tsx                # Reusable table components
│   └── toast.tsx                # Toast notification system
├── hooks/                       # Custom React hooks
│   ├── use-toast.ts            # Toast notification hook
│   └── use-websocket.ts        # WebSocket connection hook
├── lib/                         # Utility functions and API
│   ├── api-client.ts           # API client with error handling
│   └── sample-data.ts          # Mock data for development
└── types/                       # TypeScript type definitions
    └── index.ts                # All interface definitions
\`\`\`

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- Backend API server (optional for development)

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd job-importer-dashboard
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   \`\`\`

3. **Environment Configuration**
   
   Create a `.env.local` file in the root directory:
   \`\`\`env
   # Backend API Configuration
   NEXT_PUBLIC_API_URL=http://localhost:3001
   
   # WebSocket Configuration  
   NEXT_PUBLIC_WS_URL=ws://localhost:3001
   
   # Development Mode
   NODE_ENV=development
   \`\`\`

4. **Start the development server**
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   \`\`\`

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001` | Yes |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL (leave empty to disable) | `ws://localhost:3001` | No |
| `NODE_ENV` | Environment mode | `development` | No |

### API Endpoints

The frontend expects the following backend API endpoints:

#### Feed Management
- `GET /api/feeds?search=<term>` - Fetch feeds with optional search
- `POST /api/feeds` - Create new feed
- `PATCH /api/feeds/:id` - Update feed (status, configuration)
- `DELETE /api/feeds/:id` - Delete feed

#### Import Management  
- `GET /api/import-logs?search=<term>&date=<date>&page=<num>&limit=<num>` - Fetch import logs
- `GET /api/import-logs/:id` - Fetch detailed import log with jobs
- `POST /api/import/start?feedId=<id>` - Start manual import
- `GET /api/import/status/:id` - Get import progress status

### WebSocket Events

The application listens for these WebSocket events:

\`\`\`typescript
// Import started
{
  type: "import_started",
  data: { feedId: string, feedName: string }
}

// Import completed
{
  type: "import_completed", 
  data: { feedId: string, jobCount: number }
}

// Import failed
{
  type: "import_failed",
  data: { feedId: string, error: string }
}

// Import progress
{
  type: "import_progress",
  data: { feedId: string, progress: number }
}
\`\`\`

## 📊 Data Models

### JobFeed Interface
\`\`\`typescript
interface JobFeed {
  id: string
  name: string
  url: string
  category?: string
  jobTypes?: string
  region?: string
  isActive: boolean
  lastImport?: string
  totalJobsImported: number
}
\`\`\`

### ImportLog Interface
\`\`\`typescript
interface ImportLog {
  id: string
  feedUrl: string
  totalJobs: number
  newJobs: number
  updatedJobs: number
  failedJobs: number
  timestamp: string
  status: "completed" | "failed" | "in_progress"
}
\`\`\`

### JobRecord Interface
\`\`\`typescript
interface JobRecord {
  id: string
  title: string
  company: string
  location: string
  status: "new" | "updated" | "failed"
  failureReason?: string
  url?: string
  importLogId: string
}
\`\`\`

## 🎨 UI Components

### Core Components

- **Header** - Navigation with logo and menu items
- **Dashboard** - Main dashboard with stats and tables
- **FeedManager** - Feed configuration and management
- **ImportLogDetails** - Detailed view of import results
- **AddFeedModal** - Modal for adding new feeds

### Utility Components

- **Table** - Reusable table with sorting and pagination
- **Loader** - Loading spinner with customizable sizes
- **Error** - Error boundary with retry functionality
- **Toast** - Notification system for user feedback
- **Pagination** - Page navigation controls

## 🔄 State Management

The application uses React's built-in state management:

- **Local State** - Component-level state with `useState`
- **Custom Hooks** - Shared logic with `useToast`, `useWebSocket`
- **Context** - Global state for toast notifications
- **Optimistic Updates** - Immediate UI feedback with rollback

## 🚦 Development Workflow

### Running in Development Mode

\`\`\`bash
# Start development server
npm run dev

# Run with different port
npm run dev -- -p 3001

# Build for production
npm run build

# Start production server
npm start
\`\`\`

### Code Quality

\`\`\`bash
# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
\`\`\`

### Testing

\`\`\`bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
\`\`\`

## 📱 Responsive Design

The dashboard is fully responsive with breakpoints:

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px  
- **Desktop**: > 1024px

Key responsive features:
- Collapsible navigation on mobile
- Stacked cards on smaller screens
- Horizontal scrolling for tables
- Touch-friendly buttons and controls

## 🔍 Search & Filtering

### Search Functionality
- **Debounced search** (500ms delay)
- **Real-time filtering** as you type
- **Multiple field search** (name, URL, category)
- **Case-insensitive matching**

### Filter Options
- **Date range filtering** with calendar picker
- **Status filtering** (active/inactive feeds)
- **Category filtering** with multi-select
- **Job type filtering** (full-time, part-time, etc.)

## 📊 Performance Optimizations

- **Code Splitting** - Automatic route-based splitting
- **Image Optimization** - Next.js Image component
- **Bundle Analysis** - Webpack bundle analyzer
- **Lazy Loading** - Components loaded on demand
- **Memoization** - React.memo for expensive components
- **Debounced Search** - Reduced API calls
- **Optimistic Updates** - Instant UI feedback

## 🛡 Error Handling

### Error Boundaries
- **Component-level** error boundaries
- **Global error** handling with fallback UI
- **Network error** handling with retry options
- **Validation errors** with user-friendly messages

### Error Recovery
- **Automatic retry** for failed requests
- **Manual refresh** buttons
- **Fallback data** when API is unavailable
- **Graceful degradation** for missing features

## 🔐 Security Considerations

- **Input Validation** - Client-side validation for all forms
- **XSS Prevention** - Sanitized user inputs
- **CSRF Protection** - Token-based authentication ready
- **Environment Variables** - Sensitive data in env files
- **HTTPS Ready** - Production deployment ready

## 🚀 Deployment

### Build for Production

\`\`\`bash
# Create production build
npm run build

# Test production build locally
npm start
\`\`\`

### Environment Setup

For production deployment, ensure these environment variables are set:

\`\`\`env
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_WS_URL=wss://your-websocket-domain.com
NODE_ENV=production
\`\`\`

The application uses Tailwind CSS with a custom theme:

\`\`\`css
/* globals.css */
:root {
  --primary: #3b82f6;
  --secondary: #64748b;
  --success: #10b981;
  --error: #ef4444;
  --warning: #f59e0b;
}
\`\`\`

### Adding New Features

1. **Create component** in `components/` directory
2. **Add types** in `types/index.ts`
3. **Update API client** in `lib/api-client.ts`
4. **Add routes** in `app/` directory
5. **Update navigation** in `components/header.tsx`

## 📚 API Integration Guide

### Setting up Backend Integration

1. **Update environment variables**
   \`\`\`env
   NEXT_PUBLIC_API_URL=http://your-backend-url
   \`\`\`

2. **Implement API endpoints** matching the expected interface

3. **Test API integration**
   \`\`\`bash
   # Check API connectivity
   curl http://your-backend-url/api/feeds
   \`\`\`

### Mock Data vs Real API

The application includes mock data for development:

\`\`\`typescript
// To use real API, update api-client.ts
const USE_MOCK_DATA = process.env.NODE_ENV === 'development'
\`\`\`

## 🐛 Troubleshooting

### Common Issues

**1. API Connection Failed**
\`\`\`
Error: Failed to fetch feeds
Solution: Check NEXT_PUBLIC_API_URL in .env.local
\`\`\`

**2. WebSocket Connection Failed**
\`\`\`
Error: WebSocket connection failed
Solution: Verify NEXT_PUBLIC_WS_URL and backend WebSocket server
\`\`\`

**3. Build Errors**
\`\`\`
Error: Type errors in build
Solution: Run npm run type-check to identify issues
\`\`\`

**4. Styling Issues**
\`\`\`
Error: Tailwind classes not working
Solution: Check tailwind.config.js and globals.css imports
\`\`\`

### Debug Mode

Enable debug logging:

\`\`\`typescript
// Add to .env.local
NEXT_PUBLIC_DEBUG=true
\`\`\`

## 📈 Performance Monitoring

### Metrics to Track

- **Page Load Time** - Time to interactive
- **API Response Time** - Backend request latency  
- **Bundle Size** - JavaScript bundle size
- **Core Web Vitals** - LCP, FID, CLS scores

### Monitoring Tools

- **Next.js Analytics** - Built-in performance monitoring
- **Next.js Analytics** - Real user monitoring
- **Google PageSpeed** - Performance auditing
- **Lighthouse** - Comprehensive auditing

## 🤝 Contributing

### Development Guidelines

1. **Follow TypeScript** strict mode
2. **Use Tailwind CSS** for styling
3. **Write tests** for new components
4. **Update documentation** for new features
5. **Follow naming conventions**

### Code Style

- **Components**: PascalCase (`FeedManager.tsx`)
- **Hooks**: camelCase with 'use' prefix (`useToast.ts`)
- **Types**: PascalCase interfaces (`JobFeed`)
- **Files**: kebab-case (`api-client.ts`)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

1. **Check documentation** - This README and inline comments
2. **Review issues** - Check existing GitHub issues
3. **Create issue** - Submit detailed bug reports
4. **Contact team** - Reach out to development team

---

## 📋 Quick Reference

### Key Commands
\`\`\`bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript checking
\`\`\`

### Important Files
- `app/page.tsx` - Main dashboard
- `components/enhanced-feed-manager.tsx` - Feed management
- `lib/api-client.ts` - API integration
- `types/index.ts` - Type definitions
- `.env.local` - Environment configuration

### Default Ports
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:3001

---

**Built with ❤️ using Next.js, TypeScript, and Tailwind CSS**
