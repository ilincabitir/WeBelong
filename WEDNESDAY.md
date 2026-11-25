# Wednesday — Profiles + Friends + Posts backend (combined Tue + Wed)

State at start:
- Backend auth complete (`e54b695`), frontend auth complete (`472af1f`), tree clean.
- No profile, friendship, post, or comment code exists.
- Thursday is only 2–3 h and must produce the feed UI, so **all post/friends backends must land today**.

Budget: ~8 h 20 min, two breaks. If you only get 6 h, stop after the posts backend (6:25) and push the friends UI to Friday morning.

| Time | Block | Output |
|---|---|---|
| 0:00–0:20 | Kickoff | both apps running, auth verified |
| 0:20–1:45 | Profiles backend | uploads + get/update/search |
| 1:45–3:00 | Profiles frontend | view + edit profile |
| 3:00–3:15 | Break | |
| 3:15–4:55 | Friends backend | requests, accept, list, unfriend |
| 4:55–6:25 | Posts + comments backend | CRUD + feed filtering |
| 6:25–6:40 | Break | |
| 6:40–7:40 | Friends frontend | People + Friends pages |
| 7:40–8:10 | Integration + commits | green end-to-end |
| 8:10–8:20 | Buffer | |

Keep your existing **layer packages** (`model`, `repository`, `service`, `controller`, `dto`, `config`, `exception`). Do not introduce domain packages mid-week.

---

## Block 0 — Kickoff (20 min)

- [ ] `git status` clean; pull nothing (local only).
- [ ] Start Postgres, backend (`.\mvnw.cmd spring-boot:run`), frontend (`npm run dev`).
- [ ] Log in with the Monday user; confirm `/api/auth/me` still returns 200.
- [ ] Open `\d users` once to know the current schema.
- [ ] Create an `uploads/` folder? No — the service will create it.

---

## Block 1 — Profiles backend (85 min)

### New files

```
model/                (no changes)
dto/PublicUserResponse.java
dto/UpdateProfileRequest.java
service/StorageService.java
service/UserService.java
controller/FileController.java
controller/UserController.java
config/WebConfig.java
```

### 1.1 Uploads

- [ ] `StorageService.store(MultipartFile file)`:
  - reject empty files, non-`image/*` content types, > 5 MB;
  - filename = `UUID` + original extension, lowercased;
  - write to `uploads/` (create directories on first use);
  - return `"/api/files/" + filename`.
- [ ] `FileController`: `POST /api/files/upload` with `@RequestParam("file") MultipartFile`, returns `{ "url": "..." }`.
- [ ] `WebConfig implements WebMvcConfigurer`: map `/api/files/**` to the absolute `uploads/` path:
  ```java
  registry.addResourceHandler("/api/files/**")
          .addResourceLocations(Path.of("uploads").toAbsolutePath().toUri().toString());
  ```
- [ ] `SecurityConfig`: permit **GET** `/api/files/**`, keep POST authenticated.
  ```java
  .requestMatchers(HttpMethod.GET, "/api/files/**").permitAll()
  ```
  Without this, `<img src="/api/files/...">` returns 401 because browsers don't send the Authorization header.
- [ ] `application.properties`:
  ```properties
  spring.servlet.multipart.max-file-size=5MB
  spring.servlet.multipart.max-request-size=6MB
  ```

### 1.2 Profiles

- [ ] `PublicUserResponse` — same as `UserResponse` **without email**:
  `id, username, displayName, bio, avatarUrl, coverUrl, themeColor, fontFamily, createdAt` + `from(User)`.
- [ ] `UpdateProfileRequest`:
  ```java
  record UpdateProfileRequest(
      @NotBlank @Size(max = 60) String displayName,
      @Size(max = 300) String bio,
      @Size(max = 500) String avatarUrl,
      @Size(max = 500) String coverUrl,
      @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String themeColor,
      @Size(max = 40) String fontFamily
  ) {}
  ```
- [ ] `UserService`:
  - `PublicUserResponse getProfile(Long id)` → 404 if missing;
  - `UserResponse updateMe(User current, UpdateProfileRequest req)` — validate `fontFamily` against the allow-list (`system-ui`, `Georgia`, `Verdana`, `Trebuchet MS`, `Courier New`, `Times New Roman`), otherwise 400; save; return `UserResponse`;
  - `List<PublicUserResponse> search(String q, Long me)` → blank query returns empty; max 20 results; exclude self; case-insensitive match on username or display name.
- [ ] `UserRepository` additions:
  ```java
  @Query("""
     select u from User u
     where u.id <> :me and (
       lower(u.username)      like lower(concat('%', :q, '%')) or
       lower(u.displayName)   like lower(concat('%', :q, '%'))
     )
     order by u.displayName
     """)
  List<User> search(@Param("me") Long me, @Param("q") String q, Pageable pageable);
  ```
- [ ] `UserController`:
  - `GET /api/users/{id}` → `PublicUserResponse`
  - `GET /api/users?q=` → `List<PublicUserResponse>`
  - `PUT /api/users/me` → `UserResponse` (self only, uses `@AuthenticationPrincipal User`)

### Checkpoint 1:45

- [ ] Upload a PNG → URL opens in a browser tab **without a token**.
- [ ] `PUT /api/users/me` with a new display name → 200, persists after restart.
- [ ] `GET /api/users?q=ili` finds the user, never returns `email`.
- [ ] Commit: `feat: profile API and image uploads`.

---

## Block 2 — Profiles frontend (75 min)

### New files

```
api/users.ts
pages/ProfilePage.tsx
```

### Edits

```
api/client.ts        (no change)
auth/AuthContext.tsx (add refreshUser)
layouts/AppLayout.tsx (avatar links to profile)
App.tsx              (route /profile/:id)
```

- [ ] `api/users.ts`:
  ```ts
  getUser(id): Promise<PublicUser>
  updateMe(body): Promise<User>
  searchUsers(q): Promise<PublicUser[]>
  uploadImage(file: File): Promise<{ url: string }>
  ```
  Upload must pass `FormData` and **not** set `Content-Type` manually.
- [ ] `AuthContext`: add `refreshUser(): Promise<void>` = `meRequest()` → `setUser`, exposed through the context. Needed so the header avatar/name update after editing.
- [ ] `ProfilePage`:
  - `useParams()`; `id === undefined` → own user;
  - fetch profile on mount, loading + error states;
  - cover strip (image or theme-colour gradient), `Avatar` (size 96), display name, `@username`, bio;
  - own profile → "Edit profile" button opens a `Drawer`/`Modal` with `Form`:
    displayName, bio, avatar upload, cover upload, `<input type="color">` or AntD `ColorPicker`, font `Select` with the allow-list;
  - saving → `updateMe` → `refreshUser` → refetch profile → success message;
  - other profiles → placeholder button ("Add friend" wired in Block 7).
- [ ] `AppLayout`: wrap avatar/name in `<Link to="/profile/me">`.
- [ ] `App.tsx`: `<Route path="/profile/:id" element={<ProfilePage />} />` inside the protected/layout routes.

### Checkpoint 3:00

- [ ] Edit display name, bio, theme colour, font, avatar, cover → all persist after refresh.
- [ ] Header avatar updates immediately.
- [ ] Visiting `/profile/<other-id>` shows that user's public fields.
- [ ] Commit: `feat: profile page and editing`.

---

## Block 3 — Friends backend (100 min)

### New files

```
model/Friendship.java
model/FriendshipStatus.java        (PENDING, ACCEPTED)
repository/FriendshipRepository.java
dto/FriendshipDto.java
dto/FriendRequestsResponse.java
dto/FriendStatusResponse.java
service/FriendshipService.java
controller/FriendshipController.java
```

### 3.1 Entity and repository

- [ ] `Friendship`: `id`, `requester`, `addressee` (`@ManyToOne(LAZY)`), `status` (`@Enumerated(STRING)`), `createdAt`, `respondedAt`.
- [ ] Table constraint: unique `(requester_id, addressee_id)`.
- [ ] Lombok: `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder` — **not** `@Data` (equals/hashCode recursion).
- [ ] Repository queries:
  ```java
  Optional<Friendship> findByRequesterIdAndAddresseeId(Long requesterId, Long addresseeId);
  List<Friendship> findByAddresseeIdAndStatus(Long userId, FriendshipStatus status);
  List<Friendship> findByRequesterIdAndStatus(Long userId, FriendshipStatus status);

  @Query("""
     select f from Friendship f
     where f.status = :status
       and (f.requester.id = :userId or f.addressee.id = :userId)
     """)
  List<Friendship> findAllForUser(@Param("userId") Long userId,
                                  @Param("status") FriendshipStatus status);
  ```

### 3.2 Service rules

- [ ] Send: self → 400; already ACCEPTED either direction → 409; reverse PENDING exists → 409 "This user already sent you a request"; own PENDING exists → 409.
- [ ] Accept/decline: only the **addressee** may act → 403 otherwise; only PENDING rows → 409 otherwise.
- [ ] Decline = delete the row.
- [ ] Unfriend: find ACCEPTED in either direction → delete; 404 if none.
- [ ] Friend list: `findAllForUser(me, ACCEPTED)` → map the *other* user to `PublicUserResponse`, sorted by display name.
- [ ] Status endpoint: `NONE | OUTGOING | INCOMING | FRIENDS`.
- [ ] `areFriends(Long a, Long b)` public helper — **PostService will reuse it** for feed and comments.

### 3.3 Controller

| Method | Path | Returns |
|---|---|---|
| GET | `/api/friends` | `PublicUserResponse[]` |
| GET | `/api/friends/requests` | `{ incoming: [...], outgoing: [...] }` |
| POST | `/api/friends/requests/{userId}` | 201 `FriendshipDto` |
| POST | `/api/friends/requests/{requestId}/accept` | 200 `FriendshipDto` |
| POST | `/api/friends/requests/{requestId}/decline` | 204 |
| DELETE | `/api/friends/{userId}` | 204 |
| GET | `/api/friends/status/{userId}` | `{ status: "FRIENDS" }` |

`FriendshipDto`: `id`, `user` (the other party as `PublicUserResponse`), `createdAt`.

### Checkpoint 4:55

Two users, two tokens in Postman:

- [ ] A → B request 201; repeat 409; self 400.
- [ ] B `GET /requests` shows it incoming; A sees it outgoing.
- [ ] A tries to accept own request → 403.
- [ ] B accepts → both `GET /friends` contain each other.
- [ ] Status is `FRIENDS` both ways.
- [ ] Unfriend → status `NONE`.
- [ ] Commit: `feat: friendship API`.

---

## Block 4 — Posts + comments backend (90 min)

### New files

```
model/Post.java
model/Comment.java
repository/PostRepository.java
repository/CommentRepository.java
dto/CreatePostRequest.java
dto/UpdatePostRequest.java
dto/PostResponse.java
dto/CommentRequest.java
dto/CommentResponse.java
dto/PageResponse.java
service/PostService.java
controller/PostController.java
```

### 4.1 Entities

- [ ] `Post`: `id`, `author`, `content` (2000), `imageUrl`, `backgroundColor` (default `#ffffff`), `fontFamily` (default `system-ui`), `textColor` (default `#1f1f1f`), `createdAt`, `updatedAt` (`@PreUpdate`).
- [ ] `Comment`: `id`, `post`, `author`, `content` (1000), `imageUrl`, `createdAt`.
- [ ] Rule: a post must have non-blank content **or** an image → 400 otherwise. Same for comments.
- [ ] Colours validated with `^#[0-9a-fA-F]{6}$`; fonts from the same allow-list.
- [ ] Delete post: `commentRepository.deleteByPostId(id)` then delete the post (avoids a bidirectional mapping).

### 4.2 Feed and history

- [ ] Do **not** write one giant JPQL query with `CASE`. Get friend IDs from `FriendshipService`, then:
  ```java
  Page<Post> findByAuthorIdInAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
      Collection<Long> authorIds, Instant start, Instant end, Pageable pageable);
  ```
- [ ] Empty friend list → return an empty `PageResponse`, never run `IN ()`.
- [ ] "Today" = server timezone:
  ```java
  ZoneId zone = ZoneId.systemDefault();
  Instant start = LocalDate.now(zone).atStartOfDay(zone).toInstant();
  Instant end   = LocalDate.now(zone).plusDays(1).atStartOfDay(zone).toInstant();
  ```
- [ ] Profile history: `GET /api/users/{id}/posts` allowed only for **self or friends**, otherwise 403.
- [ ] Add `@EntityGraph(attributePaths = "author")` (or map DTOs inside a `@Transactional` service) because `open-in-view=false` is set.

### 4.3 Controller

| Method | Path | Rule |
|---|---|---|
| POST | `/api/posts` | authenticated → 201 |
| PUT | `/api/posts/{id}` | author only → 200 |
| DELETE | `/api/posts/{id}` | author only → 204 |
| GET | `/api/feed?page=0&size=10` | friends + today only |
| GET | `/api/users/{id}/posts?page=0&size=10` | self or friend |
| GET | `/api/posts/{id}` | self or friend |
| GET | `/api/posts/{id}/comments` | self or friend |
| POST | `/api/posts/{id}/comments` | self or friend → 201 |
| DELETE | `/api/comments/{id}` | comment author or post author → 204 |

- [ ] `PageResponse<T>` = `content, page, size, totalElements, last`. Do **not** return Spring's `Page` directly; `last` is what powers Thursday's "You're all caught up".
- [ ] `PostResponse`: `id, author (PublicUserResponse), content, imageUrl, backgroundColor, fontFamily, textColor, createdAt, updatedAt`.
- [ ] `CommentResponse`: `id, author, content, imageUrl, createdAt`.

### Checkpoint 6:25

Using tokens for A and B (friends), and C (not a friend):

- [ ] A posts → 201.
- [ ] B `/api/feed` sees it; C does not.
- [ ] B posts; A feed sees both, newest first.
- [ ] A edits B's post → 403.
- [ ] Backdate one post to yesterday in psql → disappears from feed, still on the profile.
- [ ] B comments with text + image → A sees it; C gets 403.
- [ ] Delete post → its comments are gone.
- [ ] Commit: `feat: posts, comments and daily feed API`.

---

## Block 5 — Friends frontend (60 min)

### New files

```
api/friends.ts
pages/PeoplePage.tsx
pages/FriendsPage.tsx
```

- [ ] `api/friends.ts` mirrors the seven endpoints with types.
- [ ] `PeoplePage`:
  - `Input.Search` (debounced 300 ms) → `searchUsers`;
  - on mount also fetch `getFriends()` + `getRequests()` and build a `Map<userId, "FRIENDS"|"OUTGOING"|"INCOMING">`;
  - action per row: Add friend / Pending / Accept / Friends (+ Unfriend);
  - sending updates the row without a full refetch.
- [ ] `FriendsPage` with `Tabs`:
  - **Friends**: list + Unfriend (Popconfirm);
  - **Requests** (`Badge` with incoming count): incoming with Accept/Decline, outgoing as read-only "Pending".
- [ ] `ProfilePage`: replace the placeholder with the real friend button using `GET /friends/status/{id}`.
- [ ] `AppLayout`: add navigation to Feed, People, Friends (AntD `Menu mode="horizontal"` or a `Sider`). Keep Profile, Notifications, Messages for later.
- [ ] `App.tsx`: routes `/people` and `/friends`.

### Checkpoint 7:40

- [ ] Two browsers: A searches "B", sends request; B sees it on Friends → Requests, accepts; both appear in each other's Friends.
- [ ] Profile button changes Add friend → Pending → Friends.
- [ ] Unfriend works from the list.
- [ ] Commit: `feat: people search and friend requests UI`.

---

## Block 6 — Integration + commits (30 min)

- [ ] Restart backend from scratch; confirm all tables exist (`users`, `friendship`, `post`, `comment`).
- [ ] `npm run build` (catches `noUnusedLocals` / type-only import errors).
- [ ] `.\mvnw.cmd -q compile`.
- [ ] Walk the Postman scripts once more with fresh users.
- [ ] Update `PLAN.md` progress if you keep notes.
- [ ] Push? No remote configured — local commits are enough.

---

## Cut line (decide at these times)

| If behind at… | Cut |
|---|---|
| 1:45 | Skip cover image upload (avatar only), keep search |
| 4:55 | Drop `GET /friends/status/{id}` and use the friends/requests maps client-side |
| 6:25 | Ship friends UI as a single simple page (no tabs, no People search) |
| 7:40 | Push friends UI to Friday morning; keep commits clean |

**Never cut:** posts/feed backend, friend acceptance flow, profile edit persistence. Thursday's entire feed UI depends on the feed API.

---

## End-of-day definition of done

- [ ] Uploads work and render without auth headers.
- [ ] View + edit any profile; search users; public payloads never include email or hashes.
- [ ] Friend request → accept → friends list → unfriend, enforced server-side.
- [ ] Posts CRUD with author-only rules.
- [ ] Feed returns friends' posts from today only; yesterday's posts appear on profiles.
- [ ] Comments with images; non-friends blocked.
- [ ] `mvn compile` and `npm run build` green.
- [ ] Six commits, one per block.

---

## Pitfalls

1. `spring.jpa.open-in-view=false` means DTO mapping must happen inside a transaction — annotate service methods `@Transactional(readOnly = true)` or use `@EntityGraph`.
2. Never return `User` or `Friendship` entities. Only DTOs — otherwise emails/hashes leak and lazy proxies explode.
3. Friend uniqueness must be checked in **both directions**, not just requester→addressee.
4. `GET /api/files/**` must be `permitAll`, or every avatar is broken in the browser while working in Postman.
5. Do not set `Content-Type` when uploading `FormData`.
6. The feed must never run `IN ()` for a user with zero friends — short-circuit to an empty page.
7. "Today" is server timezone; note it in the README so the demo is predictable.
8. `PageResponse.last` is mandatory for Thursday's "You're all caught up".
9. Unfriend/decline delete rows; don't leave `DECLINED` states around.
10. Restart the backend after adding entities — `ddl-auto=update` creates the tables at startup.
