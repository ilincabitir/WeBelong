# Monday — Auth end-to-end (3 h)

Goal: register → login → authenticated request, working in the browser.
Hard rule: **backend must be green before you touch React.** If it isn't green by 2:00, move the frontend part to Tuesday.

Verified stack facts:
- Spring Boot 4.1.2 → **Spring Security 7.1.2**, Hibernate 7.4.13, Java 21
- `spring-boot-starter-security` and `spring-boot-starter-security-test` are valid Boot 4.1.2 artifacts
- JJWT latest is **0.13.0**
- Native PostgreSQL 18.7 at `jdbc:postgresql://localhost:5432/webelong` (Docker removed)

---

## 0. Agenda

| Time | Block | Output |
|---|---|---|
| 0:00–0:05 | Pre-flight | clean tree, app boots |
| 0:05–0:15 | Dependencies + JWT secret | pom + properties |
| 0:15–0:35 | `User` entity + repository + DTOs | `users` table created |
| 0:35–0:50 | Error contract | `{ "message": ... }` everywhere |
| 0:50–1:05 | `JwtService` | token generate/parse |
| 1:05–1:25 | `JwtAuthFilter` | token → SecurityContext |
| 1:25–1:35 | `SecurityConfig` | 401 for anonymous |
| 1:35–1:55 | `AuthService` + `AuthController` | 3 endpoints |
| 1:55–2:10 | **Backend verification** | all status codes correct |
| 2:10–2:15 | Break | |
| 2:15–2:35 | axios + AuthContext + routes | token persists |
| 2:35–2:55 | Login/Register/AppLayout | browser flow |
| 2:55–3:00 | E2E check + commit | done |

Checkpoints:
- **1:55** — if `/api/auth/me` doesn't work, stop. Do not start the frontend.
- **2:35** — if the frontend isn't wired, ship backend only today.

---

## 1. The `User` entity — the clear picture

### Why these fields

| Field | Java type | DB column | Constraint | Purpose |
|---|---|---|---|---|
| `id` | `Long` | `id` | PK, identity | Stable identifier; used in friend requests, posts, messages |
| `username` | `String` | `username` | unique, not null, 30 | Login handle, search handle, `@mention`-style display. Never changes |
| `email` | `String` | `email` | unique, not null, 254 | Account identity; normalised to lowercase |
| `passwordHash` | `String` | `password_hash` | not null, 100 | BCrypt output (60 chars). **Never** the raw password, never in JSON |
| `displayName` | `String` | `display_name` | not null, 60 | What friends see; editable |
| `bio` | `String` | `bio` | 300, nullable | Short description |
| `avatarUrl` | `String` | `avatar_url` | 500, nullable | Profile picture URL (`/api/files/...`) |
| `coverUrl` | `String` | `cover_url` | 500, nullable | Background image URL |
| `themeColor` | `String` | `theme_color` | 7, not null | `#RRGGBB` accent for the profile |
| `fontFamily` | `String` | `font_family` | 40, not null | Profile font, from an allow-list |
| `createdAt` | `Instant` | `created_at` | not null, not updatable | UTC timestamp, set once on insert |

Keep `updatedAt` for Tuesday, when profile editing starts. Adding a nullable column later is free with `ddl-auto=update`.

### Java

```java
package com.webelong.backend.user;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String username;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @JsonIgnore
    @Column(nullable = false, length = 100)
    private String passwordHash;

    @Column(nullable = false, length = 60)
    private String displayName;

    @Column(length = 300)
    private String bio;

    @Column(length = 500)
    private String avatarUrl;

    @Column(length = 500)
    private String coverUrl;

    @Column(nullable = false, length = 7)
    @Builder.Default
    private String themeColor = "#1677ff";

    @Column(nullable = false, length = 40)
    @Builder.Default
    private String fontFamily = "system-ui";

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
```

### Five decisions that matter

1. **Table is `users`, not `user`.** `user` is a reserved word in PostgreSQL; `create table user` fails.
2. **Email and username are stored lowercase.** PostgreSQL `unique` is case-sensitive, so `Ilinca` and `ilinca` would both be allowed otherwise. Normalise with `toLowerCase(Locale.ROOT)` in the service.
3. **The entity is never returned from a controller.** Return `UserResponse`; `passwordHash` must not be serialisable. `@JsonIgnore` is belt-and-braces in case an entity leaks accidentally.
4. **Passwords are BCrypt hashes, 60 chars.** Column length 100 leaves room for algorithm changes. Cap input at 72 chars because BCrypt silently truncates beyond that.
5. **`Instant` in UTC**, mapped to `timestamptz`. Never `LocalDateTime` for stored times — it has no timezone.

### DDL you should see

```sql
create table users (
    id            bigint generated by default as identity,
    avatar_url    varchar(500),
    bio           varchar(300),
    cover_url     varchar(500),
    created_at    timestamp(6) with time zone not null,
    display_name  varchar(60) not null,
    email         varchar(254) not null,
    font_family   varchar(40) not null,
    password_hash varchar(100) not null,
    theme_color   varchar(7) not null,
    username      varchar(30) not null,
    primary key (id),
    unique (email),
    unique (username)
);
```

Check it with:

```powershell
$env:PGPASSWORD='ilinca123'
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d webelong -c "\d users"
```

### Repository and DTOs

```java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
```

```java
// auth/dto/RegisterRequest.java
public record RegisterRequest(
    @NotBlank @Pattern(regexp = "^[A-Za-z0-9_]{3,30}$",
        message = "3-30 letters, digits or underscores") String username,
    @NotBlank @Email @Size(max = 254) String email,
    @NotBlank @Size(min = 8, max = 72) String password,
    @NotBlank @Size(max = 60) String displayName
) {}
```

```java
public record LoginRequest(
    @NotBlank String username,
    @NotBlank String password
) {}
```

```java
// auth/dto/AuthResponse.java
public record AuthResponse(String token, UserResponse user) {}
```

```java
// user/UserResponse.java
public record UserResponse(
    Long id, String username, String email, String displayName, String bio,
    String avatarUrl, String coverUrl, String themeColor, String fontFamily,
    Instant createdAt
) {
    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getUsername(), u.getEmail(),
            u.getDisplayName(), u.getBio(), u.getAvatarUrl(), u.getCoverUrl(),
            u.getThemeColor(), u.getFontFamily(), u.getCreatedAt());
    }
}
```

> `UserResponse` includes email — fine for `/me`. On Tuesday add a separate `PublicUserResponse` without email for other people's profiles. Do not reuse this one.

---

## 2. Auth architecture

```
REGISTER
POST /api/auth/register
  → @Valid DTO (400 with field errors)
  → normalise username/email lowercase
  → exists checks (409)
  → BCrypt encode
  → save user
  → JWT (sub=username, uid, iat, exp)
  → 201 { token, user }

LOGIN
POST /api/auth/login
  → find user by username (401 generic if missing)
  → BCrypt matches (401 generic if wrong)
  → JWT
  → 200 { token, user }

AUTHENTICATED REQUEST
Authorization: Bearer <jwt>
  → JwtAuthFilter: verify signature + expiry
  → load User by username
  → SecurityContext principal = User, authority ROLE_USER
  → controller @AuthenticationPrincipal User user
  → missing/invalid/expired → 401 { "message": "Authentication required" }
```

| Class | Package | Responsibility |
|---|---|---|
| `JwtService` | `security` | Build and verify tokens; one place that knows the secret |
| `JwtAuthFilter` | `security` | Per-request: header → SecurityContext |
| `SecurityConfig` | `config` | Stateless chain, public auth routes, 401 entry point, CORS, BCrypt bean |
| `AuthService` | `auth` | Register/login rules and hashing |
| `AuthController` | `auth` | HTTP surface: `POST /register`, `POST /login`, `GET /me` |
| `ApiException` + `GlobalExceptionHandler` | `common` | Stable `{ "message": ... }` error contract |
| `User`, `UserRepository` | `user` | Persistence |
| `UserResponse`, DTOs | `user` / `auth/dto` | Boundary types; never expose entities |

**Token contents:** `sub` = username, `uid` = id, `iat`, `exp` (24 h). No roles claim — a single role is hard-coded in the filter. No refresh token this week.

---

## 3. Step by step

### 3.1 Pre-flight (5 min)

```powershell
cd C:\Users\Ilinca\Desktop\Webelong
git status                     # should be clean
Get-Service postgresql-x64-18  # Running
cd backend
.\mvnw.cmd spring-boot:run     # Ctrl+C after "Started BackendApplication"
```

### 3.2 Dependencies + secret (10 min)

Add to `pom.xml`:

```xml
<properties>
    <java.version>21</java.version>
    <jjwt.version>0.13.0</jjwt.version>
</properties>
```

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>${jjwt.version}</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>${jjwt.version}</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>${jjwt.version}</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security-test</artifactId>
    <scope>test</scope>
</dependency>
```

Generate a secret (32 random bytes, base64):

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Append to `backend/src/main/resources/application.properties`:

```properties
app.jwt.secret=${JWT_SECRET:<paste-the-generated-value>}
app.jwt.expiration-ms=86400000
spring.jpa.open-in-view=false
```

Maven update, then `.\mvnw.cmd -q compile` before writing more code.

### 3.3 Entity + repository + DTOs (20 min)

Files:

```
src/main/java/com/webelong/backend/
├── user/User.java
├── user/UserRepository.java
├── user/UserResponse.java
└── auth/dto/RegisterRequest.java
    auth/dto/LoginRequest.java
    auth/dto/AuthResponse.java
```

Run the app, then `\d users` in psql. **Milestone 1. Commit.**

> With security on the classpath and no config yet, every route returns 401 and Spring prints a generated password. That is expected — do not "fix" it by removing the dependency.

### 3.4 Error contract (15 min)

```java
// common/ApiException.java
@Getter
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }
}
```

```java
// common/GlobalExceptionHandler.java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    ResponseEntity<Map<String, String>> handleApi(ApiException ex) {
        return ResponseEntity.status(ex.getStatus()).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
            .forEach(e -> errors.putIfAbsent(e.getField(), e.getDefaultMessage()));
        return ResponseEntity.badRequest()
            .body(Map.of("message", "Validation failed", "errors", errors));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String, String>> handleMalformed(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", "Malformed request body"));
    }
}
```

Frontend only ever reads `message`, so this contract is stable for the whole week.

### 3.5 `JwtService` (15 min)

```java
@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.expirationMs = expirationMs;
    }

    public String generate(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(user.getUsername())
            .claim("uid", user.getId())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusMillis(expirationMs)))
            .signWith(key)
            .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload()
            .getSubject();
    }
}
```

Pitfalls: HS256 needs ≥ 32 decoded bytes; use `signWith(key)` (no algorithm overload); never log the secret or full tokens.

### 3.6 `JwtAuthFilter` (20 min)

```java
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (header != null && header.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                String username = jwtService.extractUsername(header.substring(7));
                userRepository.findByUsername(username).ifPresent(user -> {
                    var auth = new UsernamePasswordAuthenticationToken(
                        user, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
            } catch (JwtException | IllegalArgumentException ignored) {
                SecurityContextHolder.clearContext();
            }
        }

        chain.doFilter(request, response);
    }
}
```

Do **not** annotate the filter with `@Component`: Spring Boot auto-registers every `Filter` bean with the servlet container, and you also add it to the security chain, so it would run twice. Constructing it inside `SecurityConfig` (as above) keeps it in exactly one place.

`@AuthenticationPrincipal User user` in controllers only works because the **principal is the entity**, not a username string.

### 3.7 `SecurityConfig` (10 min)

```java
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        JwtAuthFilter jwtAuthFilter = new JwtAuthFilter(jwtService, userRepository);

        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                .anyRequest().authenticated())
            .exceptionHandling(ex -> ex.authenticationEntryPoint((req, res, e) -> {
                res.setStatus(HttpStatus.UNAUTHORIZED.value());
                res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                objectMapper.writeValue(res.getWriter(), Map.of("message", "Authentication required"));
            }))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

Without the custom entry point, anonymous requests come back as **403**, not 401 — which breaks the frontend interceptor. This is the single most common bug in this setup.

### 3.8 `AuthService` + `AuthController` (20 min)

```java
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String username = req.username().trim().toLowerCase(Locale.ROOT);
        String email = req.email().trim().toLowerCase(Locale.ROOT);

        if (users.existsByUsername(username))
            throw new ApiException(HttpStatus.CONFLICT, "Username already taken");
        if (users.existsByEmail(email))
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered");

        User user = User.builder()
            .username(username)
            .email(email)
            .passwordHash(encoder.encode(req.password()))
            .displayName(req.displayName().trim())
            .build();

        users.save(user);
        return new AuthResponse(jwt.generate(user), UserResponse.from(user));
    }

    public AuthResponse login(LoginRequest req) {
        User user = users.findByUsername(req.username().trim().toLowerCase(Locale.ROOT))
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));

        if (!encoder.matches(req.password(), user.getPasswordHash()))
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username or password");

        return new AuthResponse(jwt.generate(user), UserResponse.from(user));
    }
}
```

```java
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return authService.register(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal User user) {
        return UserResponse.from(user);
    }
}
```

Same message for unknown user and wrong password — don't tell attackers which usernames exist.

### 3.9 Verification (15 min)

Create `backend/requests/auth.http` for IntelliJ:

```http
### register
POST http://localhost:8080/api/auth/register
Content-Type: application/json

{ "username": "ilinca", "email": "ilinca@test.com", "password": "password123", "displayName": "Ilinca" }

### login
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{ "username": "ilinca", "password": "password123" }

### me (paste token)
GET http://localhost:8080/api/auth/me
Authorization: Bearer PASTE_TOKEN_HERE
```

PowerShell round trip:

```powershell
$base = "http://localhost:8080/api"
$reg  = @{ username="ilinca"; email="ilinca@test.com"; password="password123"; displayName="Ilinca" } | ConvertTo-Json
$r    = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType "application/json" -Body $reg
$l    = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" `
          -Body (@{ username="ilinca"; password="password123" } | ConvertTo-Json)
$me   = Invoke-RestMethod -Uri "$base/auth/me" -Headers @{ Authorization = "Bearer $($l.token)" }
"token chars: $($l.token.Length)"; "me: $($me.displayName) / $($me.email)"

try { Invoke-RestMethod -Uri "$base/auth/me" } catch { "anonymous -> $([int]$_.Exception.Response.StatusCode)" }
try { Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType "application/json" -Body $reg } catch { "duplicate -> $([int]$_.Exception.Response.StatusCode)" }
```

| Call | Expected |
|---|---|
| register new | 201, `token` + user, no `passwordHash` in JSON |
| register same username | 409 `Username already taken` |
| register invalid password (short) | 400 + `errors.password` |
| login correct | 200 + token |
| login wrong password | 401 `Invalid username or password` |
| GET /me with token | 200 user |
| GET /me without token | 401 |
| GET /me with garbage token | 401 |
| `/api/posts` (any secured path) without token | 401, not 403 |

Reset between runs:

```powershell
$env:PGPASSWORD='ilinca123'
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d webelong -c "TRUNCATE users RESTART IDENTITY CASCADE;"
```

**Milestone 2. Commit: `feat: JWT auth backend`.**

---

## 4. Frontend auth (45 min)

Only start if Milestone 2 is green.

```powershell
cd ..\frontend
npm i axios react-router-dom
```

Files:

```
src/
├── api/client.ts          axios instance + interceptors
├── api/auth.ts            typed auth calls + User type
├── auth/AuthContext.tsx   token + user + login/register/logout
├── auth/ProtectedRoute.tsx
├── pages/LoginPage.tsx
├── pages/RegisterPage.tsx
├── layouts/AppLayout.tsx
├── App.tsx                routes
└── index.css              replace Vite demo styles
```

### 4.1 axios client

```ts
import axios from 'axios';

export const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url ?? '';
    const skip = url.includes('/auth/login') || url.includes('/auth/me');
    if (error.response?.status === 401 && !skip) {
      localStorage.removeItem('token');
      if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) return e.response?.data?.message ?? 'Something went wrong';
  return 'Something went wrong';
}
```

`/auth/me` is excluded so a stale token during bootstrap is cleared by `AuthContext` instead of forcing a page reload loop.

### 4.2 AuthContext

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loginRequest, meRequest, registerRequest,
         type RegisterData, type User } from '../api/auth';

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('token')) { setLoading(false); return; }
    meRequest()
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const res = await loginRequest({ username, password });
    localStorage.setItem('token', res.token);
    setUser(res.user);
  }

  async function register(data: RegisterData) {
    const res = await registerRequest(data);
    localStorage.setItem('token', res.token);
    setUser(res.user);
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

### 4.3 Routes and layout

```tsx
// App.tsx
<BrowserRouter>
  <AuthProvider>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<div>Feed arrives Wednesday</div>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

`ProtectedRoute`: `loading` → `<Spin fullscreen />`; no user → `<Navigate to="/login" replace />`; else `<Outlet />`.

Pages use AntD `Form`, with an `Alert` for server errors and a `submitting` flag to disable the button. On success, `navigate('/', { replace: true })`.

`AppLayout`: AntD `Layout` + `Header` with "Webelong", the user's display name, and a Logout button. `Sider` menu comes Tuesday.

### 4.4 Kill the Vite demo styles

`src/index.css` currently sets `#root { width: 1126px; display:flex; border-inline: 1px solid }` and a 18px root font — it will make AntD's layout look broken. Replace it entirely:

```css
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body { background: #f5f6f8; }
```

Remove the `./App.css` import and the demo markup in `App.tsx`. `main.tsx` is already correct (ConfigProvider + AntApp + antd reset).

### 4.5 Browser test

1. `/register` → create a user → lands on `/`
2. Refresh → still logged in (bootstrap via `/auth/me`)
3. Logout → `/login`
4. Wrong password → red alert, no crash
5. DevTools → Application → token present; Network → `Authorization: Bearer ...` on `/me`
6. A second registration with the same username → 409 message shown

**Milestone 3. Commit: `feat: auth UI`.**

---

## 5. Pitfalls checklist

- [ ] Table is `users`, not `user` (reserved word)
- [ ] `app.jwt.secret` decodes to ≥ 32 bytes
- [ ] 401 entry point configured (default is 403)
- [ ] `JwtAuthFilter` is **not** a `@Component` (avoids double filter registration)
- [ ] `/api/auth/register` and `/login` are `permitAll`
- [ ] No password hash in any response
- [ ] Username/email normalised to lowercase before uniqueness checks
- [ ] BCrypt max input 72 chars
- [ ] Frontend `baseURL: '/api'` — never `/api/api/...`
- [ ] No manual `Content-Type` on future `FormData` uploads
- [ ] Vite demo CSS removed
- [ ] `spring.jpa.open-in-view=false` (avoids the warning and lazy-loading surprises)

If Spring Security config resists for more than 20 minutes, stop and either ask me or downgrade to Boot 3.5.x. Do not lose the day to framework archaeology.

---

## 6. Definition of done

- [ ] `users` table exists with unique username/email
- [ ] `POST /api/auth/register` → 201 + token
- [ ] `POST /api/auth/login` → 200 + token
- [ ] `GET /api/auth/me` → 200 with token, 401 without
- [ ] Duplicate username → 409, bad password → 401, invalid body → 400 with field errors
- [ ] Browser: register, refresh, logout, failed login
- [ ] Three commits: entity, backend auth, frontend auth

## 7. Explicitly not Monday

Refresh tokens · email verification · password reset · roles/permissions · profile editing · tests beyond manual verification · Docker · WebSockets · React Query.
