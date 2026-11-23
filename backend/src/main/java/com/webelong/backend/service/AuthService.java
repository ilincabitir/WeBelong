package com.webelong.backend.service;

import com.webelong.backend.dto.AuthResponse;
import com.webelong.backend.dto.LoginRequest;
import com.webelong.backend.dto.RegisterRequest;
import com.webelong.backend.dto.UserResponse;
import com.webelong.backend.model.User;
import com.webelong.backend.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.webelong.backend.exception.ApiException;

import java.util.Locale;

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
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNAUTHORIZED, "Invalid username or password"));

        if (!encoder.matches(req.password(), user.getPasswordHash()))
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username or password");

        return new AuthResponse(jwt.generate(user), UserResponse.from(user));
    }
}