# LFP — Looking For Padel (starter app)

Structură de bază pentru aplicația mobilă LFP, construită cu **React Native + Expo**
și **Supabase** pentru autentificare și bază de date.

## Ce conține

- Login/Signup cu email+parolă (Supabase Auth)
- Home — dashboard live: Ready To Play (activare radar), Open Matches (listă meciuri, join)
- Create Match — formular rapid de creare meci
- Profile — nivel, mână preferată, club favorit, logout
- Navigare: tab-uri jos (Home/Profile) + stack pentru Login și Create Match (modal)
- Temă de brand (culori, spacing) în `src/theme.js`, ușor de extins

## Ce lipsește (de adăugat pe măsură ce avansezi)

- Available Players, Clubs, Events, Chat, Heatmap — sunt în structura descrisă
  în concept, dar nu au ecran propriu încă (doar placeholder în Home)
- AI Matchmaker / Smart Fill — necesită logică de recomandare (backend/edge
  function în Supabase, sau serviciu separat)
- Notificări push (Expo Notifications)
- Font Plus Jakarta Sans — trebuie încărcat cu `expo-font` + `@expo-google-fonts/plus-jakarta-sans`

## Cum pornești proiectul

1. Instalează Node.js (LTS) dacă nu-l ai deja
2. Instalează Expo CLI global (opțional, `npx` funcționează și fără):
   ```
   npm install -g expo-cli
   ```
3. În folderul proiectului:
   ```
   npm install
   npx expo start
   ```
4. Scanează codul QR cu aplicația **Expo Go** (iOS/Android) de pe telefon,
   sau apasă `i` / `a` în terminal pentru simulator iOS/Android

## Configurare Supabase (obligatoriu pentru login și date)

1. Creează cont gratuit pe https://supabase.com și un proiect nou
2. Din **Project Settings → API**, copiază `Project URL` și `anon public key`
3. Pune-le în `src/lib/supabase.js` (constantele `SUPABASE_URL` și `SUPABASE_ANON_KEY`)
4. Rulează SQL-ul din comentariul de la finalul fișierului `src/lib/supabase.js`
   în **SQL Editor** din Supabase, ca să creezi tabelele `profiles`, `matches`,
   `ready_to_play`

## Extensia VS Code recomandată

- **Expo Tools** (de la Expo) — autocompletare, debugging, preview direct din VS Code
- Alternativ: **React Native Tools** (Microsoft)
