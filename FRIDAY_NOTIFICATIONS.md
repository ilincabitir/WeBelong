# Friday — Notifications (≈4 h)

Current state: auth, profiles, friendships, posts, comments, feed, and all their UIs are committed (`860dce9`). Notifications have **no code yet**: no model, endpoints, page, or navbar badge.

Goal: a friend request or a comment on your post appears on a dedicated Notifications page, with a working unread badge and per-notification / mark-all read.

---

## 1. Data model

```
notifications
├── id           bigint PK
├── recipient_id bigint NOT NULL   → users
├── actor_id     bigint NOT NULL   → users
├── type         varchar(20)       FRIEND_REQUEST | COMMENT
├── post_id      bigint NULL       plain id, NOT a foreign key
├── is_read      boolean NOT NULL  default false
└── created_at   timestamptz NOT NULL
```

Decisions:

- **`post_id` is a plain column, not a relation.** Deleting a post must not fail on a FK; `PostService.delete` will call `deleteForPost(postId)` explicitly.
- **Column name `is_read`, field name `read`.** `isRead` as a boolean getter would serialise as `isRead`; we want the API field `read`.
- Every notification has an **actor** so the UI can show an avatar and name without extra lookups.
- No recipient in the DTO — a user only ever sees their own.

---

## 2. Timebox

| Time | Step |
|---|---|
| 0:00–0:15 | Baseline: run apps, confirm current features |
| 0:15–0:45 | Entity + enum + repository |
| 0:45–1:15 | Service + DTO + creation hooks |
| 1:15–1:45 | Controller + Postman verification |
| 1:45–2:05 | Frontend API + unread context + navbar bell |
| 2:05–3:05 | Notifications page + CSS + routes |
| 3:05–3:40 | Two-user end-to-end test |
| 3:40–4:00 | Build, fix, commit |

If you finish early, start private messaging; if behind, use the cut line in §8.

---

## 3. Backend files

```
model/NotificationType.java
model/Notification.java
repository/NotificationRepository.java
dto/NotificationResponse.java
service/NotificationService.java
controller/NotificationController.java
```

### 3.1 `NotificationType`

```java
public enum NotificationType {
    FRIEND_REQUEST,
    COMMENT
}
```

### 3.2 `Notification` entity

- `@Entity @Table(name = "notifications")` + index on `(recipient_id, is_read)`.
- `@ManyToOne(LAZY)` for `recipient` and `actor`, both `nullable = false`.
- `@Enumerated(STRING) @Column(length = 20)` for `type`.
- `@Column(name = "post_id") Long postId;`
- `@Column(name = "is_read", nullable = false) boolean read;`
- `@Column(nullable = false, updatable = false) Instant createdAt;` + `@PrePersist`.
- Lombok `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`.

### 3.3 Repository

```java
Page<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId, Pageable pageable);

long countByRecipientIdAndReadFalse(Long recipientId);

Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);

@Modifying
@Query("""
    update Notification n set n.read = true
    where n.recipient.id = :recipientId and n.read = false
    """)
int markAllRead(@Param("recipientId") Long recipientId);

@Modifying
@Query("""
    update Notification n set n.read = true
    where n.recipient.id = :recipientId
      and n.actor.id = :actorId
      and n.type = :type
      and n.read = false
    """)
int markReadByActor(@Param("recipientId") Long recipientId,
                    @Param("actorId") Long actorId,
                    @Param("type") NotificationType type);

void deleteByPostId(Long postId);
```

Bulk updates require `@Transactional` on the service method.

### 3.4 DTO

```java
public record NotificationResponse(
        Long id,
        String type,                    // FRIEND_REQUEST | COMMENT
        PublicUserResponse actor,
        Long postId,
        boolean read,
        Instant createdAt
) {
    public static NotificationResponse from(Notification n) { ... }
}
```

Map inside the service transaction (`open-in-view=false`).

### 3.5 Service

```java
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notifications;

    @Transactional
    public void notifyFriendRequest(User requester, User addressee) { ... }

    @Transactional
    public void notifyComment(User commenter, Post post) { ... }   // skip if same user

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> list(User current, int page, int size) { ... }

    @Transactional(readOnly = true)
    public long unreadCount(User current) { ... }

    @Transactional
    public void markRead(User current, Long id) { ... }            // findByIdAndRecipientId → 404

    @Transactional
    public void markAllRead(User current) { ... }

    @Transactional
    public void markFriendRequestRead(User recipient, Long actorId) { ... }

    @Transactional
    public void deleteForPost(Long postId) { ... }
}
```

Rules:

- `notifyComment`: `if (post.getAuthor().getId().equals(commenter.getId())) return;`
- `notifyFriendRequest`: recipient is the addressee, actor is the requester.
- `markRead`: only the recipient may mark; `findByIdAndRecipientId` returning empty → **404** (not 403, so you don't leak existence).
- Clamp page/size like `PostService` (max 50).

### 3.6 Creation hooks

**`FriendshipService.sendRequest`** — inject `NotificationService`, after `friendships.save(friendship)`:

```java
notifications.notifyFriendRequest(current, target);
```

**`FriendshipService.accept` / `decline`** — after the state change/delete:

```java
notifications.markFriendRequestRead(current, friendship.getRequester().getId());
```

**`PostService.addComment`** — inject `NotificationService`, after `comments.save(comment)`:

```java
notifications.notifyComment(current, post);
```

**`PostService.delete`** — before/after deleting the post:

```java
notifications.deleteForPost(postId);
```

No circular dependency: `NotificationService` depends only on the repository. `FriendshipService` and `PostService` depend on it.

### 3.7 Controller

| Method | Path | Response |
|---|---|---|
| GET | `/api/notifications?page=0&size=20` | `PageResponse<NotificationResponse>` |
| GET | `/api/notifications/unread-count` | `{ "count": 3 }` |
| PUT | `/api/notifications/{id}/read` | 204 |
| PUT | `/api/notifications/read-all` | 204 |

All use `@AuthenticationPrincipal User current`. No SecurityConfig change.

---

## 4. Backend verification (Postman)

You need A and B, friends. All requests with A's token.

| # | Action | Expected |
|---|---|---|
| 1 | B sends A a friend request | — |
| 2 | `GET /api/notifications` as A | 1 item, `type: FRIEND_REQUEST`, actor B, `read: false` |
| 3 | `GET /api/notifications/unread-count` as A | `{ "count": 1 }` |
| 4 | `PUT /api/notifications/{id}/read` as A | 204; list shows `read: true`; count 0 |
| 5 | `PUT /api/notifications/read-all` as A | 204 |
| 6 | `PUT /api/notifications/{id}/read` as C | 404 |
| 7 | `GET /api/notifications` as C | empty list |
| 8 | A posts; B comments | A gets `COMMENT` notification |
| 9 | A comments on A's own post | no new notification |
| 10 | A declines B's new request | related notification becomes read |
| 11 | `DELETE /api/posts/{id}` for a commented post | notification with that `postId` disappears |

Check the table:

```powershell
$env:PGPASSWORD='ilinca123'
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d webelong -c "\d notifications"
```

---

## 5. Frontend files

```
api/notifications.ts
notifications/NotificationsContext.tsx
pages/NotificationsPage.tsx
pages/NotificationsPage.css
```

Edits:

```
layouts/AppLayout.tsx        add Notifications nav item + badge
App.tsx                      route /notifications
pages/ConnectionsPage.tsx    open the Requests tab from ?tab=requests
```

### 5.1 API

```ts
export interface AppNotification {
  id: number;
  type: 'FRIEND_REQUEST' | 'COMMENT';
  actor: PublicUser;
  postId: number | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationPage {
  content: AppNotification[];
  page: number;
  size: number;
  totalElements: number;
  last: boolean;
}

getNotifications(page, size)
getUnreadCount(): Promise<number>
markNotificationRead(id): Promise<void>
markAllNotificationsRead(): Promise<void>
```

### 5.2 Unread context

`NotificationsProvider`:

- state `unreadCount`.
- `refreshUnread()` → `getUnreadCount()` (ignore errors).
- effect: refresh on mount, every 30 s, and on `window` focus.
- expose `unreadCount`, `refreshUnread`.

Wrap the layout content in `AppLayout` (inside the authenticated tree):

```tsx
<NotificationsProvider>
  <Layout>...</Layout>
</NotificationsProvider>
```

The notifications page and navbar both consume it, so marking read updates the badge immediately.

### 5.3 Navbar

Add a fourth nav link:

```tsx
<NavLink to="/notifications" ...>
  <Badge count={unreadCount} size="small" offset={[2, -2]}>
    <BellOutlined />
  </Badge>
  <span className="app-nav-label">Notifications</span>
</NavLink>
```

Active state follows the existing pattern. Keep the bell inside the nav so it works on mobile (labels hide under 420 px, badge stays).

### 5.4 Notifications page

- Fetch page 0 on mount; "Load more" while `!last`.
- Item content:
  - `FRIEND_REQUEST`: actor avatar + "**{name}** sent you a friend request."
  - `COMMENT`: "**{name}** commented on your post."
- Unread items: subtle accent background + dot; read items plain.
- Meta: relative time (`timeAgo`).
- Actions:
  - Friend request → "View requests" navigates to `/friends?tab=requests`.
  - Comment → "View your posts" navigates to `/profile/me`.
- Clicking the row:
  1. if unread → `markNotificationRead(id)` and update local state;
  2. `refreshUnread()`;
  3. navigate.
- Header button "Mark all as read" → `markAllNotificationsRead()`, set all local items read, `refreshUnread()`.
- Empty state: "You're all caught up."
- Error alert + loading skeleton/spinner.

### 5.5 ConnectionsPage tab deep-link

Controlled tabs with `useSearchParams`:

```tsx
const [params, setParams] = useSearchParams();
const activeTab = params.get('tab') ?? 'search';

<Tabs
  activeKey={activeTab}
  onChange={(key) => setParams({ tab: key })}
  ...
/>
```

This makes "View requests" land on the right tab.

---

## 6. End-to-end test

Two browsers, A and B, friends:

1. B sends A a request → A's bell shows **1** within 30 s (or on focus).
2. A opens Notifications → sees "B sent you a friend request", unread styling.
3. "View requests" → Connections opens the Requests tab.
4. Accept → backend marks the notification read; badge eventually returns to 0.
5. A creates a post; B comments → A's bell increments; page shows "B commented on your post".
6. A comments on their own post → **no** new notification.
7. Click the comment notification → lands on A's profile, post visible.
8. "Mark all as read" → badge 0 immediately, all rows plain.
9. A third user C sees an empty notifications page.
10. Delete a commented post as A → its notification disappears.

Then `npm run build` and `.\mvnw.cmd -q compile`.

---

## 7. Definition of done

- [ ] Friend request creates exactly one notification for the addressee.
- [ ] Comment creates one notification for the post author, never for the commenter.
- [ ] Accept/decline marks the related request notification read.
- [ ] Unread count endpoint + navbar badge.
- [ ] Mark-one and mark-all, recipient-only.
- [ ] Notification page with distinct unread styling, links, empty state.
- [ ] Deleting a post removes its notifications.
- [ ] Builds green; commit `feat: notifications`.

---

## 8. Cut line (in order)

1. Pagination → return the latest 50 in one list.
2. "Mark all as read" → per-item only.
3. Polling → refresh only on page load and window focus.
4. Notification cleanup on post delete → accept dead links temporarily.
5. Relative timestamps → `toLocaleString`.

**Never cut:** creation on friend request + comment, recipient-only access, unread badge, the separate page.

---

## 9. Pitfalls

| Problem | Cause |
|---|---|
| Notification rows never appear | Entity/table not created — restart backend |
| `isRead` in JSON instead of `read` | Field/getter naming; use `@Column(name="is_read") boolean read` |
| Badge never updates after reading | Page doesn't call `refreshUnread()` |
| Badge stale after accept | `accept` didn't mark the request notification read |
| 500 deleting a post | `post_id` was a real FK; keep it a plain column |
| Notification for your own comment | Missing `actor.id == post.author.id` skip |
| Lazy initialisation error | DTO mapping outside the service transaction |
| Circular bean dependency | `NotificationService` importing `FriendshipService` — it must not |
| Mark read returns 200 for someone else's notification | Looking up by id only instead of `(id, recipientId)` |
| `onChange` tab resets on refresh | Tabs not controlled by `useSearchParams` |

Next block after this: private messaging, which reuses the same unread-badge pattern.
