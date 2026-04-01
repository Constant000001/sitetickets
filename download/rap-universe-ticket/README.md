# RAP UNIVERSE - Système de Billetterie

## Installation

1. **Installer les dépendances :**
```bash
npm install
```

2. **Configurer la base de données :**
```bash
npx prisma generate
npx prisma db push
```

3. **Démarrer le serveur :**
```bash
npm run dev
```

## Accès

- **Page publique (achat de tickets) :** http://localhost:3000/
- **Page admin (validation) :** http://localhost:3000/admin

## Identifiants Admin

- **Username :** amgv
- **Mot de passe :** Mahudjro2006

## Prix du ticket

- **2 000 FCFA** (1 cocktail offert)

## Événement

- **Date :** Samedi 11 Avril 2026
- **Heure :** 15H00
- **Lieu :** La'Madre - Calavi

## Technologies

- Next.js 16
- Prisma + SQLite
- Tailwind CSS
- shadcn/ui
- QR Code (qrcode.react)
- PDF (jspdf)

## Structure

```
src/
├── app/
│   ├── page.tsx          # Page publique d'achat
│   ├── admin/page.tsx    # Dashboard admin
│   ├── scan/page.tsx     # Page de scan QR
│   └── api/
│       ├── auth/         # Authentification (login, verify, logout)
│       └── tickets/      # Gestion des tickets (CRUD, PDF, validation)
├── components/ui/        # Composants shadcn/ui
├── hooks/                # Hooks React
└── lib/
    ├── db.ts             # Client Prisma
    └── utils.ts          # Utilitaires
```
