# Webelong — 1-Week Build Plan

**Deadline:** Sunday, Nov 29, 2026
**Stack:** Java 21 / Spring Boot · React 19 + Ant Design · PostgreSQL

---

## 1. Where the project stands today

| Area | State |
|---|---|
| Backend | Bare Spring Boot skeleton — one main class, no entities, no endpoints, no security |
| Frontend | Bare Vite + React + AntD template, `App.tsx` still the Vite demo page |
| Database | Native PostgreSQL 18 service **already running** on `localhost:5432`, database `webelong` exists, login `postgres/ilinca123` works ✅ |
| Docker | `friendship-postgres` container is **crash-looping** (restart count 6). Postgres 18 changed its volume layout to `/var/lib/postgresql`, and port 5432 is already taken by the native service. |
| Git | Backend is **not a git repository** |

**Decision: use the native PostgreSQL and drop Docker.** It already matches `application.properties` and already has the `webelong` DB. Run `docker compose down` and remove/ignore `docker-compose.yml` — every minute spent fixing a redundant container is wasted.

---

## 2. Time budget (assumed)

| Day | Your availability | Planned hours |
|---|---|---|
| Mon | 2–3 h | 3 |
| Tue | 1–2 h | 2 |
| Wed | many | 7 |
| Thu | 2–3 h | 3 |
| Fri | many | 7 |
| Sat | many | 7 |
| Sun | many | 7 |
| **Total** | | **36 h** |

Honest estimate of the full feature list: **~45 h solo.** The gap closes by (a) having me scaffold entities/repos/controllers/CRUD screens, so your hours go to integration, decisions and debugging, and (b) the cut ladder in §7.

---

## 3. Weekly shape

Build in **vertical slices** — every session ends with something clickable in the browser, never "backend done, UI later."

- **Mon–Thu** = the required feature set, demo-able by Thursday night.
- **Fri–Sat** = the "additional" features + hardening.
- **Sun** = buffer, regression pass, demo prep, deploy.

| Day | Focus | Definition of done |
|---|---|---|
| **Mon (3h)** | Foundation + auth end-to-end | Register and log in from the browser; refresh keeps you logged in |
| **Tue (2h)** | Profiles end-to-end | Edit name/bio/avatar/cover/theme; changes persist and render |
| **Wed (7h)** | Friends end-to-end + posts backend | Two accounts can become friends; posts + comments exist in the API |
| **Thu (3h)** | Feed + post/comment UI | Full content loop: post → friend sees it today → comments → "all caught up" |
| **Fri (7h)** | Notifications + private messages | Bell badge + notifications page; two browsers chat |
| **Sat (7h)** | Hardening, polish, tests, seed data | Validation/authorization airtight; `mvn test` and `npm run build` green |
| **Sun (7h)** | Buffer + regression + demo | Fresh-DB setup works from README; demo script rehearsed |

---

## 4. Day-by-day

### Monday — Foundation + auth (3h)

**0:00–0:20 — Environment**
- [ ] `docker compose down` (kill the crash-looping container); confirm `webelong` DB reachable.
- [ ] `git init` in `Webelong/`, root `.gitignore` covering `target/`, `node_modules/`, `uploads/`, `.env`.
- [ ] First commit of the current skeleton.
- [ ] Add deps: `spring-boot-starter-security`, `jjwt-api` / `jjwt-impl` / `jjwt-jackson`, `spring-security-test`.

**0:20–1:50 — Backend auth**
- [ ] `User` entity: id, username (unique), email (unique), passwordHash, displayName, bio, avatarUrl, coverUrl, themeColor, fontFamily, createdAt.
- [ ] `UserRepository`, DTOs (`RegisterRequest`, `LoginRequest`, `AuthResponse`, `UserResponse`).
- [ ] `AuthService`: BCrypt hashing, duplicate-username check, credential check, JWT issue.
- [ ] `JwtService` + `JwtAuthFilter` + `SecurityConfig` (stateless, `/api/auth/**` public, everything else authenticated, CSRF off, CORS for `localhost:5173`).
- [ ] `AuthController`: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
- [ ] Verify with Postman/curl: register → login → `/me` with token; wrong password → 401; duplicate username → 409.

**1:50–2:40 — Frontend auth**
- [ ] `npm i axios react-router-dom`.
- [ ] `api.ts` — axios instance, token header, 401 → redirect to `/login`.
- [ ] `AuthContext` (token in `localStorage`, user bootstrap via `/me`), `ProtectedRoute`.
- [ ] `LoginPage`, `RegisterPage` (AntD `Form`), `AppLayout` (Header + Sider menu shell).
- [ ] Routes: `/login`, `/register`, `/` protected.

**2:40–3:00 — Buffer / commit**
- [ ] Register + log in in the browser, refresh, log out.
- [ ] Commit: `feat: auth end-to-end`.

> ⚠️ **Version risk:** Spring Boot **4.1.2** is very new; most tutorials and StackOverflow answers target 3.x. If Security config fights you for more than ~20 minutes, downgrade to Spring Boot **3.5.x** (Java 21 is compatible) and move on. Do not burn Monday debugging framework version quirks.

---

### Tuesday — Profiles (2h)

**Backend (1h)**
- [ ] `StorageService`: multipart upload → `uploads/` with UUID filename; `POST /api/files/upload`; serve via `/api/files/{name}`. Max 5 MB, image content types only.
- [ ] `GET /api/users/{id}`, `PUT /api/users/me`, `GET /api/users?q=` (search by username/display name, exclude self).
- [ ] Profile update validates: display name length, bio length, hex colour format, font from an allow-list.

**Frontend (1h)**
- [ ] `ProfilePage` (`/profile/:id` and `/profile/me`): cover image, avatar, display name, bio, themed accent colour.
- [ ] "Edit profile" drawer: display name, bio, avatar upload, cover upload, theme colour picker, font selector.
- [ ] People search page (`/people`) with "Add friend" placeholder buttons (wired Wednesday).

**DoD:** change your name, bio, colours and avatar; reload — everything persists.

---

### Wednesday — Friends + posts backend (7h)

**Friends (3h)**
- [ ] `Friendship` entity: requester, addressee, status `PENDING | ACCEPTED`, timestamps; unique pair constraint; no self-requests; no duplicates in either direction.
- [ ] Endpoints:
  - `POST /api/friends/requests/{userId}` (send)
  - `GET /api/friends/requests` (incoming + outgoing)
  - `POST /api/friends/requests/{id}/accept`
  - `POST /api/friends/requests/{id}/decline`
  - `GET /api/friends` (accepted, either side)
  - `DELETE /api/friends/{userId}` (unfriend)
- [ ] Frontend: `/friends` page (list + pending requests with Accept/Decline), search page buttons wired, friend state reflected on profiles ("Add friend" / "Pending" / "Friends").

**Posts + comments backend (4h)**
- [ ] `Post`: author, content, imageUrl, backgroundColor, fontFamily, textColor, createdAt, updatedAt.
- [ ] `Comment`: post, author, content, imageUrl, createdAt.
- [ ] Endpoints:
  - `POST /api/posts`, `PUT /api/posts/{id}`, `DELETE /api/posts/{id}` (author only)
  - `GET /api/feed?page=&size=` — **friends only, created today only**, newest first
  - `GET /api/users/{id}/posts?page=` — full history for profile pages (only if friend, or self)
  - `GET /api/posts/{id}/comments`, `POST /api/posts/{id}/comments`, `DELETE /api/comments/{id}`
- [ ] Service-layer authorization: only friends can comment, only author can edit/delete.
- [ ] Verify feed filtering with seeded rows (`createdAt` yesterday vs today).

**DoD:** two accounts become friends via API/UI; posts and comments return correctly scoped data.

---

### Thursday — Feed + post UI (3h)

- [ ] `PostCard`: author avatar/name, relative time, text, image, custom background colour + font, edit/delete menu on own posts.
- [ ] `CreatePost` modal: text, image upload, background colour + font pickers, live preview.
- [ ] `FeedPage`: fetch page 0, "Load more", end state **"You're all caught up"** when the API has no more posts.
- [ ] Comments: inline expand or drawer; text + image comment form; author delete.
- [ ] `ProfilePage`: that user's full post history (older posts live only here, as specified).
- [ ] Edit-post flow reusing the composer.

**DoD:** account A posts with a custom colour → account B (friend) sees it in today's feed → B comments with an image → A sees the comment. Yesterday's posts appear only on the profile.

---

### Friday — Notifications + messaging (7h)

**Notifications (2.5h)**
- [ ] `Notification`: recipient, actor, type (`FRIEND_REQUEST`, `COMMENT`), post reference, read flag, createdAt.
- [ ] Create on friend request and on comment-to-post-author (never notify yourself).
- [ ] `GET /api/notifications`, `PUT /api/notifications/{id}/read`, `PUT /api/notifications/read-all`, `GET /api/notifications/unread-count`.
- [ ] Notifications page + bell badge in header; accepting a request directly from the page.

**Messaging (4h)**
- [ ] `Message`: sender, recipient, content, createdAt, readAt. Flat table — no conversation entity.
- [ ] `GET /api/messages/{friendId}?page=` (friends only), `POST /api/messages/{friendId}`, `GET /api/messages/conversations` (friend + last message + unread count), `PUT /api/messages/{friendId}/read`.
- [ ] Messages page: conversation list + chat pane, polling every 5 s, unread badges.
- [ ] **No WebSockets** — polling is correct for this scope and saves hours.

**0.5h buffer** — fix whatever slipped.

---

### Saturday — Hardening + polish (7h)

- [ ] Global `@RestControllerAdvice`: consistent `{ "message": ..., "errors": {...} }`; 400/401/403/404/409 handling.
- [ ] Bean validation on every request DTO (`@NotBlank`, `@Size`, `@Email`, `@Pattern` for hex colours).
- [ ] Authorization audit — walk every endpoint and ask "can a non-friend do this?"
- [ ] Frontend: loading skeletons, empty states, error toasts, disabled buttons while submitting, 401 handling, basic mobile layout (AntD `Grid`).
- [ ] Theme rendering: profile accent colour + font actually applied; safe fallback to defaults.
- [ ] Seed data: `DataInitializer` (`@Profile("dev")`) with 3 users, friendships, posts across 2 days, comments, messages.
- [ ] Tests (target ~5, not 50): auth register/login, duplicate username, friend request → accept, feed excludes non-friends and yesterday's posts, edit-other's-post → 403.
- [ ] `mvn test` green, `npm run build` green, `npm run lint` clean.

---

### Sunday — Buffer + demo (7h)

- [ ] Work through anything unfinished in cut-ladder order — **do not start new features**.
- [ ] Fresh-environment test: drop/recreate `webelong`, start backend, start frontend, register two users, run the full script.
- [ ] Full regression checklist (§8).
- [ ] `README.md`: prerequisites, DB setup, run commands, feature list, API summary, screenshots.
- [ ] Demo script: 2 accounts, 2 browsers, ~5 minutes, covering every requirement in order.
- [ ] Optional deploy (Render/Railway backend + Vercel frontend) — **only if everything else is green**.
- [ ] Final commit + tag.

---

## 5. Technical decisions (lock these, don't revisit)

| Topic | Decision | Why |
|---|---|---|
| Auth | JWT (HS256, 24 h) in `Authorization: Bearer`, BCrypt | Simple, stateless, expected in a portfolio project |
| Refresh tokens | **No** | Not a stated requirement |
| DB migrations | **No Flyway** — `ddl-auto=update` | One week; avoid migration overhead |
| Images | Local disk `./uploads`, UUID names, served by API | No cloud account, no secrets |
| Messaging | 5 s polling | WebSockets cost hours for little visible gain |
| State | React Context + axios, no Redux | App is small |
| Routing | React Router | Standard |
| Styling | AntD components + small CSS file | AntD is mandated |
| Pagination | Page/size only | Predictable and easy to debug |

**Entity sketch**

```
User(id, username, email, passwordHash, displayName, bio,
     avatarUrl, coverUrl, themeColor, fontFamily, createdAt)

Friendship(id, requester, addressee, status, createdAt, respondedAt)
     unique(requester, addressee)

Post(id, author, content, imageUrl, backgroundColor,
     fontFamily, textColor, createdAt, updatedAt)

Comment(id, post, author, content, imageUrl, createdAt)

Notification(id, recipient, actor, type, post, read, createdAt)

Message(id, sender, recipient, content, createdAt, readAt)
```

**Backend packages:** `config`, `security`, `user`, `friendship`, `post`, `comment`, `notification`, `message`, `file`, `common`.

**Frontend routes:** `/login`, `/register`, `/` (feed), `/profile/:id`, `/people`, `/friends`, `/notifications`, `/messages`, `/messages/:friendId`.

---

## 6. Feature → requirement checklist

- [ ] Register / login / logout, hashed passwords, account editing
- [ ] Own profile page; edit colours, fonts, display name, description, avatar, cover
- [ ] User search; send/receive/accept/decline friend requests; personal friend list only
- [ ] Create posts (text + image); edit own posts; per-post background colour + font
- [ ] Feed = friends' posts from **today only**; ends with **"You're all caught up"**
- [ ] Comments on friends' posts, text + images
- [ ] Older posts reachable only through a friend's profile
- [ ] Notifications page: friend requests + comments on your posts
- [ ] Private messaging between friends with stored history

---

## 7. Cut ladder (if you're behind, cut from the top)

1. Image comments → text-only comments
2. Notifications: derive friend requests from pending requests; skip comment notifications
3. Messaging: drop polling, add a refresh button
4. Post styling: colour only, no font picker
5. Tests → manual checklist only
6. Profile cover image → just avatar

**Never cut:** auth, profiles, friends, posts, today-only feed + caught-up state, notifications page, minimal messaging.

A missing "additional" feature costs less than a broken required one.

---

## 8. Sunday regression checklist

**Auth:** register duplicate username → clear error · wrong password → 401 · refresh keeps session · logout clears token · protected route redirects.
**Profiles:** edit every field · upload avatar + cover · invalid colour rejected · view another profile.
**Friends:** search · request · duplicate request blocked · self-request blocked · accept · decline · unfriend · non-friend cannot see friend list.
**Posts:** create with image + colours · edit own · cannot edit someone else's · delete own · yesterday's post absent from feed · present on profile.
**Feed:** only friends' posts · only today · newest first · pagination · "You're all caught up".
**Comments:** friend can comment with image · non-friend blocked · author delete.
**Notifications:** request → notification · comment → notification · mark read · unread badge · no self-notifications.
**Messages:** friend-only · history persists · unread badge clears · non-friend blocked.
**Build:** `mvn test` green · `npm run build` green · app starts against a freshly created DB.

---

## 9. Working habits

- Start every session with 10 minutes: read yesterday's commit, run the app, pick the next checkbox.
- Commit at every DoD — never end a session with uncommitted work.
- Timebox bugs to 20 minutes; if stuck, downgrade the approach or ask me.
- Keep one Postman collection / `.http` file with every endpoint — it makes Friday's notifications work trivial.
- No feature work on Sunday. Only finishing.

---

## 10. Start here, right now (Monday, first 20 minutes)

1. `docker compose down` — stop the crash-looping container.
2. `git init` + root `.gitignore` + first commit.
3. Add the security/JWT dependencies to `pom.xml`.
4. Create the `User` entity + repository.
5. Create `AuthController` with a hard-coded "hello" endpoint and confirm the app boots against `webelong`.
