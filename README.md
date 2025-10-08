# Sistema de Gestión de Órdenes de Trabajo

Complete work order management system for energy sector companies with web and mobile applications.

## 📋 Project Overview

This system provides a comprehensive solution for managing work orders in industrial plants with:
- **Role-based access control** (Employee, Team Leader, Supervisor)
- **Real-time metrics and KPIs**
- **Offline synchronization** for mobile devices
- **Multi-platform access** (Web + Mobile)
- **Advanced reporting** with PDF/Excel export

## 🏗️ Architecture

```
├── backend/          # Node.js + Express API server
├── frontend/         # React web application
├── mobile/           # React Native mobile app
└── database/         # PostgreSQL schema and migrations
```

### Technology Stack
- **Backend**: Node.js, Express, PostgreSQL, Socket.io, JWT
- **Frontend**: React, Material-UI, Chart.js, WebSocket
- **Mobile**: React Native, SQLite, AsyncStorage
- **Database**: PostgreSQL with real-time triggers
- **Authentication**: JWT with role-based permissions

## 🚀 Features

### Core Functionality
- ✅ Create and manage work orders
- ✅ Role-based access control
- ✅ Real-time status updates
- ✅ Offline operation capability
- ✅ Audit trail and history tracking

### Metrics & Reporting
- ✅ Real-time dashboards
- ✅ Performance KPIs
- ✅ Team productivity metrics
- ✅ PDF/Excel report generation
- ✅ Trend analysis and charts

### Security & Access
- ✅ JWT authentication
- ✅ Session management
- ✅ Device-based security (mobile)
- ✅ Automatic session expiration
- ✅ Access logging and monitoring

## 👥 User Roles

### Empleado (Employee)
- Create personal work orders
- Update order status (pending → in progress → completed)
- View only own work orders
- Offline operation on mobile

### Jefe de Equipo (Team Leader)
- View all team member orders
- Filter by status and project
- Generate team performance reports
- Assign work orders to team members

### Gerente/Supervisor (Manager/Supervisor)
- Access to all plant/project orders
- Global metrics and KPIs
- Cross-team comparative reports
- Strategic decision support dashboards

## 🔧 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- React Native CLI (for mobile development)

### Backend Setup
```bash
cd backend
npm install
npm run setup-db
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Mobile Setup
```bash
cd mobile
npm install
npx react-native run-ios    # iOS
npx react-native run-android # Android
```

## 📊 Key Metrics

The system tracks and displays:
- Orders by status (pending, in progress, completed)
- Average resolution time
- Team productivity metrics
- Plant/project performance indicators
- Resource utilization rates

## 🔄 Offline Capabilities

### Web Application
- Local storage for recent data
- Queue pending changes
- Auto-sync when connection restored

### Mobile Application
- SQLite local database
- Automatic background sync
- Secure offline authentication
- Conflict resolution strategies

## 📱 Mobile Features

- Biometric authentication support
- Push notifications for order updates
- Camera integration for work documentation
- GPS location tagging
- Barcode/QR code scanning

## 🛡️ Security Features

- JWT token-based authentication
- Role-based authorization
- Session timeout management
- Device security integration
- Audit logging for all actions
- Data encryption in transit

## 📋 API Documentation

The backend provides RESTful APIs for:
- User authentication and management
- Work order CRUD operations
- Metrics and reporting endpoints
- Real-time WebSocket connections
- Offline sync mechanisms

## 🔗 Integration Points

- Corporate authentication systems
- ERP system integration ready
- Third-party reporting tools
- Mobile device management
- Cloud storage for attachments

## 📈 Performance Requirements

- **Availability**: 95% uptime minimum
- **Real-time updates**: < 5 seconds
- **Mobile sync**: < 30 seconds when online
- **Report generation**: < 10 seconds for standard reports
- **Offline capability**: 24 hours minimum

## 🚧 Development Status

- [x] Project architecture design
- [x] Database schema implementation
- [x] Backend API development
- [x] Frontend web application
- [x] Mobile app structure
- [x] Authentication system
- [x] Offline synchronization
- [x] Metrics and reporting
- [x] Testing and validation

## 📞 Support

For technical support or feature requests, contact the development team.

---

**Version**: 1.0  
**Last Updated**: September 2025  
**Client**: Pablo Farias  
**Project Managers**: Rosario Presedo, Joaquín Villamediana