# MITANEKO Backend API

Backend API pour la plateforme MITANEKO - Plateforme de Gouvernance Participative Urbaine.

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm ou yarn

## 🚀 Installation

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your configuration:

```bash
cp .env.example .env
```

### 3. Setup database

Create PostgreSQL database, then apply the schema (structure only), then optionally the seed (fictional data):

```bash
createdb mitaneko_db
psql mitaneko_db -f schema.sql
psql mitaneko_db -f seed.sql
```

The `seed.sql` file is for local/demo use only; production databases typically skip it or use their own import.

## 🏃 Running

### Development mode

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Production mode

```bash
npm run build
npm start
```

## 📚 API Documentation

### Health Check

```bash
GET /health
GET /api/health
```

### Authentication

#### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean@example.com",
  "password": "SecurePassword123",
  "telephone": "+261323456789"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "jean@example.com",
  "password": "SecurePassword123"
}
```

#### Refresh Token
```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

### Signalements

#### List signalements
```bash
GET /api/signalements?commune_id=xxx&quartier_id=yyy&status=priorise
```

#### Create signalement
```bash
POST /api/signalements
Authorization: Bearer your_access_token
Content-Type: multipart/form-data

{
  "titre": "Route dégradée",
  "description": "La route est en mauvais état",
  "categorie": "infrastructure",
  "quartier_id": "xxx",
  "latitude": -19.8596,
  "longitude": 46.8646,
  "adresse": "Rue X, Antananarivo",
  "photos": [file1, file2]
}
```

#### Get signalement
```bash
GET /api/signalements/:id
```

#### Get GeoJSON for map
```bash
GET /api/signalements/map/geojson?commune_id=xxx
```

## 🗂️ Project Structure

```
backend/
├── src/
│   ├── config/          # Database & environment config
│   ├── controllers/     # Business logic (to implement)
│   ├── middleware/      # Express middleware
│   ├── models/          # Database models (to implement)
│   ├── routes/          # API routes
│   ├── services/        # Service layer (to implement)
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions (to implement)
│   └── index.ts         # App entry point
├── scripts/             # Database & seed scripts
├── schema.sql           # PostgreSQL schema (structure uniquement)
├── seed.sql             # Données fictives (après schema.sql)
├── .env.example         # Environment variables template
├── package.json
└── tsconfig.json
```

## 🧪 Testing

```bash
npm test
npm run test:watch
```

## 🔍 Linting

```bash
npm run lint
npm run lint:fix
```

## 📋 Main Features to Implement

- [x] Project structure & configuration
- [x] Authentication (register, login, JWT)
- [ ] Signalement CRUD operations
- [ ] Vote system
- [ ] Action tracking
- [ ] User profile management
- [ ] Commune dashboard
- [ ] Analytics & reporting
- [ ] File upload & image processing
- [ ] Notifications
- [ ] WebSocket real-time updates
- [ ] Rate limiting & validation
- [ ] Comprehensive error handling
- [ ] API documentation (Swagger)

## 🔐 Security Notes

- ✅ HTTPS/CORS configured
- ✅ Helmet for security headers
- ✅ JWT authentication
- ✅ Password hashing with bcrypt
- ❌ Rate limiting (to implement)
- ❌ Input validation (to complete)
- ❌ SQL injection prevention (to verify)

## 📞 API Endpoints Summary

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token

### Signalements
- `GET /api/signalements` - List all signalements
- `GET /api/signalements/:id` - Get signalement details
- `POST /api/signalements` - Create signalement
- `PUT /api/signalements/:id` - Update signalement
- `DELETE /api/signalements/:id` - Delete signalement
- `GET /api/signalements/map/geojson` - Get map data

### Votes
- `POST /api/votes/signalements/:id/votes` - Vote for signalement
- `DELETE /api/votes/signalements/:id/votes` - Remove vote

### Actions
- `GET /api/actions` - List actions
- `POST /api/actions` - Create action
- `PUT /api/actions/:id` - Update action

### Comments
- `GET /api/comments` - List comments
- `POST /api/comments` - Create comment
- `DELETE /api/comments/:id` - Delete comment

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Communes
- `GET /api/communes` - List communes
- `GET /api/communes/:id` - Get commune details
- `GET /api/communes/:id/dashboard` - Get commune dashboard
- `GET /api/communes/:id/stats` - Get commune statistics

### Analytics
- `GET /api/analytics` - Get analytics
- `GET /api/analytics/reports` - Get reports

## 🤝 Contributing

Please ensure all code follows the TypeScript strict mode and includes proper error handling.

## 📄 License

MIT

---

**Created:** May 2026  
**Version:** 1.0.0  
**Team:** MITANEKO Development Team
